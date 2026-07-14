-- =====================================================================
-- FASE 1 (Honorarios) - SPs de pago de honorarios medicos + analisis/catalogo.
-- SQL Server 2012. Patron idempotente IF OBJECT_ID DROP / GO / CREATE.
--
-- PAGO (conta, transaccional):
--   sp_PagoHonorario_Insert  (anti-doble-pago DUAL; upsert entidad MEDICO; prorrateo
--                             por consultorio con ajuste de residuo; 1 egreso PAGADO por
--                             consultorio via INSERT..EXEC sp_Egreso_Insert)
--   sp_PagoHonorario_Anular  (cascada: anula egresos + libera servicios)
--   sp_PagoHonorario_List    (OFFSET/FETCH, RS1 total + RS2 pagina)
--   sp_PagoHonorario_Get     (RS1 cabecera + RS2 consultorios + RS3 servicios)
--
-- ANALISIS / CATALOGO (lectura cross-DB a SigesoftDesarrollo_2 = SOLO SELECT):
--   sp_Honorarios_Analisis        PORT FIEL de la def VIVA de
--                                 SigesoftDesarrollo_2.dbo.PagoMedicoPorConsultorio_SP
--                                 (three-part names invertidos, COLLATE DATABASE_DEFAULT,
--                                  esPagado DUAL legacy+conta). Conserva sus filtros propios.
--   sp_Honorarios_Consultorios    catalogo 403.
--   sp_Honorarios_Medicos         PORT de GetMedicosByConsultorio_SP (vivo).
--   sp_Honorarios_BuscarProfesional PORT de sp_BuscarProfesionales (vivo).
--
-- INVARIANTE: nadie puede hacer INSERT..EXEC sobre sp_PagoHonorario_Insert/_Anular
-- (ya anidan un INSERT..EXEC sobre sp_Egreso_*). Cross-DB texto con COLLATE DATABASE_DEFAULT.
-- =====================================================================

-- =====================================================================
-- 1) sp_PagoHonorario_Insert
-- =====================================================================
IF OBJECT_ID('conta.sp_PagoHonorario_Insert','P') IS NOT NULL DROP PROCEDURE conta.sp_PagoHonorario_Insert;
GO
CREATE PROCEDURE conta.sp_PagoHonorario_Insert
    @MedicoId          INT,
    @MedicoNombre      NVARCHAR(200),
    @Desde             DATE,
    @Hasta             DATE,
    @PorcMedico        DECIMAL(5,2) = NULL,
    @FechaPago         DATE,
    @IdFormaPago       INT = NULL,
    @IdCuentaBancaria  INT = NULL,
    @Glosa             NVARCHAR(300) = NULL,
    @TotalServicios    DECIMAL(18,2),
    @TotalPago         DECIMAL(18,2),
    @Servicios         conta.tvp_pago_honorario_servicio READONLY,
    @IdUsuario         INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1) Validaciones de entrada.
    IF NOT EXISTS (SELECT 1 FROM @Servicios)
    BEGIN RAISERROR('Debe indicar al menos un servicio para pagar.', 16, 1); RETURN; END
    IF @TotalPago IS NULL OR @TotalPago <= 0
    BEGIN RAISERROR('El total a pagar debe ser mayor que cero.', 16, 1); RETURN; END
    IF @Desde IS NULL OR @Hasta IS NULL OR @Desde > @Hasta
    BEGIN RAISERROR('El periodo (desde/hasta) es invalido.', 16, 1); RETURN; END
    IF @FechaPago IS NULL
    BEGIN RAISERROR('La fecha de pago es requerida.', 16, 1); RETURN; END
    IF EXISTS (SELECT 1 FROM @Servicios WHERE i_IdConsultorio IS NULL)
    BEGIN RAISERROR('Todos los servicios deben indicar consultorio.', 16, 1); RETURN; END

    DECLARE @IdTipoGastoHon INT = (SELECT i_IdTipoGasto FROM conta.tipo_gasto WHERE v_Codigo = 'MED-HON');
    IF @IdTipoGastoHon IS NULL
    BEGIN RAISERROR('No existe el tipo de gasto MED-HON (siembra ddl/10).', 16, 1); RETURN; END

    -- 2) Anti-doble-pago DUAL: conta.pago_honorario_servicio activo + legacy servicespaid(details) activo.
    DECLARE @ofensores NVARCHAR(MAX) =
    (
        SELECT STUFF((
            SELECT ', ' + x.v_ServiceId
            FROM (
                SELECT DISTINCT s.v_ServiceId
                FROM @Servicios s
                WHERE EXISTS (SELECT 1 FROM conta.pago_honorario_servicio phs
                              WHERE phs.v_ServiceId = s.v_ServiceId AND phs.b_Anulado = 0)
                   OR EXISTS (SELECT 1
                              FROM SigesoftDesarrollo_2.dbo.servicespaiddetails d
                              JOIN SigesoftDesarrollo_2.dbo.servicespaid pp ON pp.i_PaidId = d.i_PaidId
                              WHERE d.v_ServiceId = s.v_ServiceId COLLATE DATABASE_DEFAULT
                                AND ISNULL(d.i_IsDeleted,0) = 0 AND ISNULL(pp.i_IsDeleted,0) = 0)
            ) x
            ORDER BY x.v_ServiceId
            FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '')
    );
    IF @ofensores IS NOT NULL AND LEN(@ofensores) > 0
    BEGIN
        DECLARE @msg NVARCHAR(2048) = LEFT('Servicios ya pagados (no se pueden re-pagar): ' + @ofensores, 2000);
        RAISERROR(@msg, 16, 1); RETURN;
    END

    -- 2b) Un mismo servicio no puede llegar bajo DOS consultorios distintos: el indice unico
    --     UX_pago_hon_serv_activo es SOLO sobre v_ServiceId (sin consultorio), asi que tras la
    --     deduplicacion por (v_ServiceId,i_IdConsultorio) del paso 7 seguirian siendo 2 filas activas
    --     y colisionarian igual. Defensivo: el analisis asigna UN solo consultorio por servicio
    --     (protocol.i_Consultorio), por lo que esto NO deberia dispararse en operacion normal; atrapa
    --     TVPs malformadas y las convierte en el RAISERROR amistoso (front: /ya pagad/i) en lugar del
    --     error crudo del indice.
    DECLARE @multiCons NVARCHAR(MAX) =
    (
        SELECT STUFF((
            SELECT ', ' + x.v_ServiceId
            FROM (
                SELECT s.v_ServiceId
                FROM @Servicios s
                GROUP BY s.v_ServiceId
                HAVING COUNT(DISTINCT s.i_IdConsultorio) > 1
            ) x
            ORDER BY x.v_ServiceId
            FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '')
    );
    IF @multiCons IS NOT NULL AND LEN(@multiCons) > 0
    BEGIN
        DECLARE @msg2 NVARCHAR(2048) = LEFT('Servicios ya pagados o duplicados en mas de un consultorio (no se pueden pagar dos veces): ' + @multiCons, 2000);
        RAISERROR(@msg2, 16, 1); RETURN;
    END

    BEGIN TRY
        BEGIN TRAN;

        -- 3) Upsert entidad del medico (v_Tipo='MEDICO'; reactivar si estaba inactiva).
        DECLARE @IdEntidad INT = (SELECT TOP 1 i_IdEntidad FROM conta.entidad
                                  WHERE v_Nombre = @MedicoNombre AND v_Tipo = 'MEDICO' ORDER BY i_IdEntidad);
        IF @IdEntidad IS NULL
        BEGIN
            INSERT INTO conta.entidad (v_Nombre, v_Tipo, b_Activo, i_InsertaIdUsuario)
            VALUES (@MedicoNombre, 'MEDICO', 1, @IdUsuario);
            SET @IdEntidad = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE conta.entidad SET b_Activo = 1, i_ActualizaIdUsuario = @IdUsuario, t_ActualizaFecha = GETDATE()
            WHERE i_IdEntidad = @IdEntidad AND b_Activo = 0;
        END

        -- 4) Cabecera del pago (PAGADO).
        DECLARE @IdPago INT;
        INSERT INTO conta.pago_honorario
            (i_MedicoId, v_MedicoNombre, i_IdEntidad, t_PeriodoDesde, t_PeriodoHasta, d_PorcMedico,
             d_TotalServicios, d_TotalPago, v_Estado, t_FechaPago, i_IdFormaPago, i_IdCuentaBancaria,
             v_Glosa, i_InsertaIdUsuario)
        VALUES
            (@MedicoId, @MedicoNombre, @IdEntidad, @Desde, @Hasta, @PorcMedico,
             @TotalServicios, @TotalPago, 'PAGADO', @FechaPago, @IdFormaPago, @IdCuentaBancaria,
             @Glosa, @IdUsuario);
        SET @IdPago = SCOPE_IDENTITY();
        DECLARE @serie NVARCHAR(50) = 'PH-' + CAST(@IdPago AS VARCHAR(20));

        -- 5) Agrupar la TVP por consultorio + prorratear @TotalPago (residuo al de mayor peso).
        DECLARE @cons TABLE (
            seq                 INT IDENTITY(1,1),
            i_IdConsultorio     INT,
            v_ConsultorioNombre NVARCHAR(100),
            d_MontoServicios    DECIMAL(18,2),
            w                   DECIMAL(18,4),
            d_MontoPago         DECIMAL(18,2),
            i_IdEgreso          INT NULL
        );
        INSERT INTO @cons (i_IdConsultorio, v_ConsultorioNombre, d_MontoServicios)
        SELECT s.i_IdConsultorio,
               ISNULL(MAX(sp.v_Value1) COLLATE DATABASE_DEFAULT,
                      'CONSULTORIO ' + CAST(s.i_IdConsultorio AS VARCHAR(10))),
               CAST(SUM(ISNULL(s.d_Precio,0)) AS DECIMAL(18,2))
        FROM @Servicios s
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp
               ON sp.i_GroupId = 403 AND sp.i_ParameterId = s.i_IdConsultorio
        GROUP BY s.i_IdConsultorio;

        UPDATE @cons SET w = d_MontoServicios;
        IF (SELECT ISNULL(SUM(w),0) FROM @cons) = 0 UPDATE @cons SET w = 1;   -- todos sin precio: reparto parejo
        DECLARE @W DECIMAL(18,4) = (SELECT SUM(w) FROM @cons);
        UPDATE @cons SET d_MontoPago = CAST(ROUND(@TotalPago * w / @W, 2) AS DECIMAL(18,2));
        DECLARE @residuo DECIMAL(18,2) = @TotalPago - (SELECT ISNULL(SUM(d_MontoPago),0) FROM @cons);
        UPDATE @cons SET d_MontoPago = d_MontoPago + @residuo
        WHERE seq = (SELECT TOP 1 seq FROM @cons ORDER BY w DESC, seq ASC);

        -- 6) Un egreso PAGADO por consultorio (INSERT..EXEC, igual que sp_Compra_Clasificar).
        DECLARE @i INT = 1, @maxseq INT = (SELECT ISNULL(MAX(seq),0) FROM @cons);
        DECLARE @cId INT, @cMonto DECIMAL(18,2), @cNombre NVARCHAR(100), @egr INT, @glosaEgr NVARCHAR(300);
        DECLARE @out TABLE (i_IdEgreso INT);
        WHILE @i <= @maxseq
        BEGIN
            SELECT @cId = i_IdConsultorio, @cMonto = d_MontoPago, @cNombre = v_ConsultorioNombre
            FROM @cons WHERE seq = @i;

            SET @glosaEgr = LEFT('Honorarios ' + @MedicoNombre + ' ' +
                                 CONVERT(VARCHAR(10), @Desde, 103) + ' a ' + CONVERT(VARCHAR(10), @Hasta, 103) +
                                 ' - ' + @cNombre, 300);
            DELETE FROM @out;
            INSERT INTO @out
            EXEC conta.sp_Egreso_Insert
                 @IdEntidad = @IdEntidad, @FechaDocumento = @FechaPago, @TipoDocumento = 'HONORARIO',
                 @SerieNumero = @serie, @IdCentroCosto = 2, @IdTipoGasto = @IdTipoGastoHon,
                 @Condicion = 'CONTADO', @Moneda = 'PEN', @TipoCambio = 1,
                 @MontoBruto = @cMonto, @IGV = 0, @Glosa = @glosaEgr, @IdUsuario = @IdUsuario,
                 @Estado = 'PAGADO', @FechaPago = @FechaPago, @IdFormaPago = @IdFormaPago,
                 @IdCuentaBancaria = @IdCuentaBancaria, @IdConsultorio = @cId;
            SET @egr = (SELECT TOP 1 i_IdEgreso FROM @out);
            IF @egr IS NULL
            BEGIN RAISERROR('No se pudo generar el egreso del consultorio %d.', 16, 1, @cId); RETURN; END

            INSERT INTO conta.pago_honorario_consultorio
                (i_IdPago, i_IdConsultorio, v_ConsultorioNombre, d_MontoServicios, d_MontoPago, i_IdEgreso)
            SELECT @IdPago, i_IdConsultorio, v_ConsultorioNombre, d_MontoServicios, d_MontoPago, @egr
            FROM @cons WHERE seq = @i;

            SET @i = @i + 1;
        END

        -- 7) Servicios pagados desde la TVP, DEDUPLICADOS por (v_ServiceId, i_IdConsultorio).
        --    El analisis emite el mismo servicio en varias filas (fan-out por ventadetalle: N items
        --    de la MISMA atencion). Se colapsa a 1 fila por servicio SUMANDO d_Precio y d_Pagado (los
        --    items suman el valor real del servicio, consistente con @TotalServicios/@TotalPago del
        --    front y con d_MontoServicios por consultorio del paso 5) -> respeta el UNIQUE filtrado
        --    UX_pago_hon_serv_activo (v_ServiceId, WHERE b_Anulado=0). d_Porc es constante por
        --    (servicio,consultorio) -> MAX (SUM ignora NULLs; 1 sola linea conserva su valor/NULL).
        INSERT INTO conta.pago_honorario_servicio
            (i_IdPago, v_ServiceId, i_IdConsultorio, d_Precio, d_Porc, d_Pagado, b_Anulado)
        SELECT @IdPago, s.v_ServiceId, s.i_IdConsultorio,
               SUM(s.d_Precio), MAX(s.d_Porc), SUM(s.d_Pagado), 0
        FROM @Servicios s
        GROUP BY s.v_ServiceId, s.i_IdConsultorio;

        EXEC conta.sp_Auditoria_Insert 'conta.pago_honorario', @IdPago, 'INSERT', @serie, @IdUsuario;

        COMMIT TRAN;

        -- 8) Salidas: RS1 id del pago; RS2 consultorios con su egreso.
        SELECT @IdPago AS i_IdPago;
        SELECT c.i_IdConsultorio, c.v_ConsultorioNombre, c.d_MontoServicios, c.d_MontoPago, c.i_IdEgreso
        FROM conta.pago_honorario_consultorio c
        WHERE c.i_IdPago = @IdPago
        ORDER BY c.i_Id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @em NVARCHAR(2048) = ERROR_MESSAGE(), @es INT = ERROR_SEVERITY(), @est INT = ERROR_STATE();
        RAISERROR(@em, @es, @est);
    END CATCH
END
GO

-- =====================================================================
-- 2) sp_PagoHonorario_Anular
-- =====================================================================
IF OBJECT_ID('conta.sp_PagoHonorario_Anular','P') IS NOT NULL DROP PROCEDURE conta.sp_PagoHonorario_Anular;
GO
CREATE PROCEDURE conta.sp_PagoHonorario_Anular
    @IdPago    INT,
    @Motivo    NVARCHAR(300),
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM conta.pago_honorario WHERE i_IdPago = @IdPago)
    BEGIN RAISERROR('El pago de honorarios no existe.', 16, 1); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM conta.pago_honorario WHERE i_IdPago = @IdPago AND v_Estado = 'PAGADO')
    BEGIN RAISERROR('Solo se pueden anular pagos en estado PAGADO.', 16, 1); RETURN; END

    BEGIN TRY
        BEGIN TRAN;

        -- Anular cada egreso espejo (INSERT..EXEC para tragar su resultset de 1 columna).
        DECLARE @egrs TABLE (seq INT IDENTITY(1,1), i_IdEgreso INT);
        INSERT INTO @egrs (i_IdEgreso)
        SELECT i_IdEgreso FROM conta.pago_honorario_consultorio
        WHERE i_IdPago = @IdPago AND i_IdEgreso IS NOT NULL;

        DECLARE @j INT = 1, @jm INT = (SELECT ISNULL(MAX(seq),0) FROM @egrs), @egr INT;
        DECLARE @sink TABLE (i_IdEgreso INT);
        WHILE @j <= @jm
        BEGIN
            SET @egr = (SELECT i_IdEgreso FROM @egrs WHERE seq = @j);
            DELETE FROM @sink;
            INSERT INTO @sink EXEC conta.sp_Egreso_Anular @IdEgreso = @egr, @Motivo = @Motivo, @IdUsuario = @IdUsuario;
            SET @j = @j + 1;
        END

        -- Liberar servicios (libera el UNIQUE filtrado -> re-pago posible).
        UPDATE conta.pago_honorario_servicio SET b_Anulado = 1 WHERE i_IdPago = @IdPago;

        -- Cabecera -> ANULADO.
        UPDATE conta.pago_honorario
        SET v_Estado = 'ANULADO', v_MotivoAnulacion = @Motivo,
            i_ActualizaIdUsuario = @IdUsuario, t_ActualizaFecha = GETDATE()
        WHERE i_IdPago = @IdPago;

        EXEC conta.sp_Auditoria_Insert 'conta.pago_honorario', @IdPago, 'ANULAR', @Motivo, @IdUsuario;

        COMMIT TRAN;
        SELECT @IdPago AS i_IdPago;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @em NVARCHAR(2048) = ERROR_MESSAGE(), @es INT = ERROR_SEVERITY(), @est INT = ERROR_STATE();
        RAISERROR(@em, @es, @est);
    END CATCH
END
GO

-- =====================================================================
-- 3) sp_PagoHonorario_List
-- =====================================================================
IF OBJECT_ID('conta.sp_PagoHonorario_List','P') IS NOT NULL DROP PROCEDURE conta.sp_PagoHonorario_List;
GO
CREATE PROCEDURE conta.sp_PagoHonorario_List
    @Desde           DATE = NULL,
    @Hasta           DATE = NULL,
    @MedicoId        INT = NULL,
    @IncluirAnulados BIT = 0,
    @Page            INT = 1,
    @PageSize        INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @off INT = (@Page - 1) * @PageSize;

    -- RS1: total (mismos filtros).
    SELECT COUNT(*) AS Total
    FROM conta.pago_honorario ph
    WHERE (@Desde IS NULL OR ph.t_FechaPago >= @Desde)
      AND (@Hasta IS NULL OR ph.t_FechaPago <= @Hasta)
      AND (@MedicoId IS NULL OR ph.i_MedicoId = @MedicoId)
      AND (@IncluirAnulados = 1 OR ph.v_Estado = 'PAGADO');

    -- RS2: pagina.
    SELECT ph.i_IdPago, ph.t_FechaPago, ph.v_MedicoNombre, ph.i_MedicoId,
           ph.t_PeriodoDesde, ph.t_PeriodoHasta, ph.d_TotalPago, ph.d_TotalServicios,
           (SELECT COUNT(*) FROM conta.pago_honorario_consultorio c WHERE c.i_IdPago = ph.i_IdPago) AS NroConsultorios,
           (SELECT COUNT(*) FROM conta.pago_honorario_servicio s WHERE s.i_IdPago = ph.i_IdPago) AS NroServicios,
           ph.v_Estado
    FROM conta.pago_honorario ph
    WHERE (@Desde IS NULL OR ph.t_FechaPago >= @Desde)
      AND (@Hasta IS NULL OR ph.t_FechaPago <= @Hasta)
      AND (@MedicoId IS NULL OR ph.i_MedicoId = @MedicoId)
      AND (@IncluirAnulados = 1 OR ph.v_Estado = 'PAGADO')
    ORDER BY ph.t_FechaPago DESC, ph.i_IdPago DESC
    OFFSET @off ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- =====================================================================
-- 4) sp_PagoHonorario_Get
-- =====================================================================
IF OBJECT_ID('conta.sp_PagoHonorario_Get','P') IS NOT NULL DROP PROCEDURE conta.sp_PagoHonorario_Get;
GO
CREATE PROCEDURE conta.sp_PagoHonorario_Get @IdPago INT
AS
BEGIN
    SET NOCOUNT ON;
    -- RS1 cabecera.
    SELECT ph.i_IdPago, ph.i_MedicoId, ph.v_MedicoNombre, ph.i_IdEntidad, ent.v_Nombre AS EntidadNombre,
           ph.t_PeriodoDesde, ph.t_PeriodoHasta, ph.d_PorcMedico, ph.d_TotalServicios, ph.d_TotalPago,
           ph.v_Estado, ph.t_FechaPago, ph.i_IdFormaPago, ph.i_IdCuentaBancaria, ph.v_Glosa,
           ph.v_MotivoAnulacion, ph.i_InsertaIdUsuario, ph.t_InsertaFecha,
           ph.i_ActualizaIdUsuario, ph.t_ActualizaFecha
    FROM conta.pago_honorario ph
    LEFT JOIN conta.entidad ent ON ent.i_IdEntidad = ph.i_IdEntidad
    WHERE ph.i_IdPago = @IdPago;

    -- RS2 consultorios (+ egreso + estado del egreso).
    SELECT c.i_Id, c.i_IdPago, c.i_IdConsultorio, c.v_ConsultorioNombre,
           c.d_MontoServicios, c.d_MontoPago, c.i_IdEgreso, e.v_Estado AS EgresoEstado
    FROM conta.pago_honorario_consultorio c
    LEFT JOIN conta.egreso e ON e.i_IdEgreso = c.i_IdEgreso
    WHERE c.i_IdPago = @IdPago
    ORDER BY c.i_Id;

    -- RS3 servicios.
    SELECT s.i_Id, s.i_IdPago, s.v_ServiceId, s.i_IdConsultorio, s.d_Precio, s.d_Porc, s.d_Pagado, s.b_Anulado
    FROM conta.pago_honorario_servicio s
    WHERE s.i_IdPago = @IdPago
    ORDER BY s.i_Id;
END
GO

-- =====================================================================
-- 5) sp_Honorarios_Analisis  (PORT FIEL de SigesoftDesarrollo_2.dbo.PagoMedicoPorConsultorio_SP,
--    def VIVA de sys.sql_modules). Three-part names invertidos: la venta vive en dbo (BD actual
--    20505310072) y el servicio/paciente en SigesoftDesarrollo_2. COLLATE DATABASE_DEFAULT en los
--    dos unicos cruces de texto cross-DB (CHARINDEX comprobante y esPagado conta). esPagado DUAL.
-- =====================================================================
IF OBJECT_ID('conta.sp_Honorarios_Analisis','P') IS NOT NULL DROP PROCEDURE conta.sp_Honorarios_Analisis;
GO
CREATE PROCEDURE conta.sp_Honorarios_Analisis
    @ConsultorioId INT = NULL,   -- NULL (o -1) = todos los consultorios
    @Desde         DATE,
    @Hasta         DATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FechaInicio DATETIME = CAST(@Desde AS DATETIME);
    DECLARE @FechaFin     DATETIME = DATEADD(MILLISECOND, -3, DATEADD(DAY, 1, CAST(@Hasta AS DATETIME)));
    DECLARE @FechaInicioRetrasada DATETIME = DATEADD(DAY, -10, @FechaInicio);
    DECLARE @FechaFinAlargada     DATETIME = DATEADD(DAY, 10, @FechaFin);
    DECLARE @ConsultorioVal INT = CASE WHEN @ConsultorioId = -1 THEN NULL ELSE @ConsultorioId END;

    ;WITH VentasData AS (
        SELECT
            v.v_IdVenta as 'idexterno',
            CASE WHEN v.v_IdCliente = 'N002-CL000000000' then 'DNI'
                 else spc.v_Value1 end as 'extdocumento_c',
            CASE WHEN v.v_IdCliente = 'N002-CL000000000' then '00000000'
                 else c.v_NroDocIdentificacion end as 'nrodocumento_c',
            CASE WHEN v.v_IdCliente = 'N002-CL000000000' then 'PUBLICO GENERAL'
                 WHEN c.i_IdTipoIdentificacion = 6 and c.i_IdTipoPersona = 2 THEN c.v_RazonSocial
                 ELSE c.v_ApePaterno + ' ' + c.v_ApeMaterno + ', ' + c.v_PrimerNombre + ' ' + c.v_SegundoNombre
            END AS 'nombres_c',
            ISNULL(spd.v_Value1 +'-'+spd.v_Value1 +'-'+spd.v_Value1,'CAJAMARCA-CAJAMARCA-CAJAMARCA') as 'idubigeo_c',
            ISNULL(c.v_DirecPrincipal,'S/D') as 'dedireccion_c',
            CASE WHEN v.d_Total = 0.00 THEN 'SIN PAGO'
                 WHEN v.i_IdCondicionPago = 5 THEN N'DEPÓSITO'
                 WHEN cd.i_IdTipoDocumentoRef IS NULL THEN 'CREDITO'
                 WHEN v.v_SerieDocumento = 'ECS' THEN 'EGRESO'
                 WHEN CAST(cd.i_IdFormaPago AS VARCHAR(14)) = '9' AND CAST(cd.i_IdTipoDocumentoRef AS NVARCHAR(14)) = '-1' THEN 'DEPOSITO'
                 WHEN CAST(cd.i_IdFormaPago AS VARCHAR(14)) = '1' AND CAST(cd.i_IdTipoDocumentoRef AS NVARCHAR(14)) = '-1' THEN 'EFECTIVO SOLES'
                 WHEN CAST(cd.i_IdFormaPago AS VARCHAR(14)) = '2' AND CAST(cd.i_IdTipoDocumentoRef AS NVARCHAR(14)) = '421' THEN 'VISA'
                 ELSE '- - -'
            END AS 'extformapago_t',
            v.v_SerieDocumento as 'extserie_t',
            v.v_CorrelativoDocumento as 'numero_t',
            CONVERT(VARCHAR,(CONVERT(varchar,v.t_InsertaFecha,103) + ' ' + CONVERT(varchar,v.t_InsertaFecha,8))) as 'emision_t',
            CAST(v.d_Total AS decimal(14,2)) AS 'monto_t',
            sy.v_UserName as 'usuario_t',
            CAST(vd.d_Precio AS decimal(14,2)) as 'preciounitario_td',
            CAST(vd.d_Cantidad AS decimal(14,2)) as 'cantidad_td',
            CAST(vd.d_PrecioVenta AS decimal(14,2)) as 'total_td',
            '' as 'codigo_td',
            vd.v_DescripcionProducto as 'nombreservicio_td',
            1 as 'tieneatencion',
            v.v_SerieDocumento + '-' + v.v_CorrelativoDocumento as 'Comprobante',
            v.t_InsertaFecha as 'fecharegistro_t',
            CAST(vd.d_PrecioVenta AS decimal(14,2)) as 'total_tdD',
            1 AS 'estado_t',
            v.v_MotivoEliminacion AS 'motivo_t',
            vd.v_IdVentaDetalle as 'v_IdVentaDetalle',
            '' as 'TipCaj'
        FROM dbo.venta as v
        JOIN dbo.cliente as c on v.v_IdCliente = c.v_IdCliente
        LEFT JOIN dbo.systemparameter spc on c.i_IdTipoIdentificacion = spc.i_ParameterId and spc.i_GroupId = 150
        LEFT JOIN dbo.systemparameter spd on c.i_IdDepartamento = spd.i_ParameterId and spd.i_GroupId = 112
        LEFT JOIN dbo.ventadetalle as vd on v.v_IdVenta = vd.v_IdVenta and vd.i_Eliminado = 0
        LEFT JOIN dbo.cobranzadetalle as cd on v.v_IdVenta = cd.v_IdVenta AND cd.i_Eliminado = 0
        JOIN dbo.systemuser as sy on v.i_InsertaIdUsuario = sy.i_SystemUserId
        WHERE (@FechaInicio <= v.t_InsertaFecha AND v.t_InsertaFecha <= @FechaFin)
            AND v.i_Eliminado = 0
            AND v.i_IdTipoDocumento != 513
            AND v.i_IdTipoDocumento != 500
            AND v.i_IdTipoDocumento != 502
            AND v.i_ClienteEsAgente != 3
            AND v.v_IdVenta NOT IN (
                'N001-ZQ000117673', 'N001-ZQ000117944', 'N001-ZQ000117950',
                'N001-ZQ000118577', 'N001-ZQ000118948', 'N001-ZQ000119229',
                'N001-ZQ000119274', 'N001-ZQ000119499', 'N001-ZQ000119735',
                'N001-ZQ000120228', 'N001-ZQ000120308', 'N001-ZQ000120409',
                'N001-ZQ000120450', 'N001-ZQ000120522', 'N001-ZQ000120960',
                'N001-ZQ000120968', 'N001-ZQ000121051', 'N001-ZQ000121100',
                'N001-ZQ000113070'
            )
    ),
    ServiciosData AS (
        SELECT
            s.v_ServiceId as 'Servicio_p',
            s.v_ComprobantePago AS 'ComprobanteAt',
            dhd.v_Value1 as 'extdocumento_p',
            p.v_DocNumber as 'nrodocumento_p',
            p.v_FirstLastName as 'paterno_p',
            p.v_SecondLastName as 'materno_p',
            p.v_FirstName as 'nombres_p',
            FORMAT(p.d_Birthdate, 'dd/MM/yyyy') as 'nacimiento_p',
            spg.v_Value1 as 'extsexo_p',
            dhdep.v_Value1 + '-' + dhpro.v_Value1 + '-'+ dhdis.v_Value1 as 'idubigeo_p',
            p.v_AdressLocation AS 'dedireccion_p',
            p.v_TelephoneNumber AS 'detelefono_p',
            p.v_Mail AS 'decorreo_p',
            sps.v_Value1 as 'deseguro_p',
            spec.v_Value1 as 'extestadocivil_p',
            p.v_ContactName as 'apoderadonombre_p',
            p.v_EmergencyPhone as 'apoderadocontacto_p',
            FORMAT(s.d_ServiceDate, 'dd/MM/yyyy hh:mm:ss') as 'FechaServicio',
            su.v_UserName AS 'Usuario2',
            ISNULL(A.MEDICO,'DE LA SOLIDARIDAD, HOSPITAL') AS 'Medico',
            pr.v_Name AS 'PROTOCOLO',
            ISNULL(A.ESP,'- - -') AS 'ESPECIALIDAD_MEDICA',
            ISNULL(spp.v_Value1,'SIN CONSULTORIO') AS 'CONSULTORIO',
            spp.v_Value2 as 'PorcRefRaw',
            case
                when Q.v_Value1 ='CHEQUEO' then 'CONSULTA MEDICA'
                when Q.v_Value1 =N'REUBICACIÓN' then N'HOSPITALIZACIÓN'
                else Q.v_Value1
            end AS 'TipoServicio',
            floor(
                (cast(convert(varchar(8),s.d_ServiceDate,112) as int)-
                cast(convert(varchar(8),p.d_Birthdate,112) as int)) / 10000
            ) AS EDAD,
            B.IdMedicoSolicita AS IdMedicoSolicita,
            ISNULL(B.vMedicoSolicita,'- - -') as vMedicoSolicita,
            ISNULL(B.espMedicoSolicita, '- - -') as espMedicoSolicita,
            ISNULL(mkt.v_Value1,'- - -') as medioMkt,
            ISNULL(p.v_MarketingOtros,'- - -') as v_MarketingOtros,
            A.NroDocMed as v_NroDocMed,
            ISNULL(Dx.DxName, '-') as 'DxNombre',
            ISNULL(Dx.DxCie10, '-') as 'DxCie10',
            CASE WHEN Dx.DxName IS NULL THEN 'Sin_Dx' ELSE 'Con_Dx' END as 'DxEst',
            ISNULL(Q2.v_Value1, '-') as 'TipoProtocolo',
            (select COUNT(ae.v_AdditionalExamId)
                from SigesoftDesarrollo_2.dbo.additionalexam ae
                where ae.i_IsDeleted = 0 and ae.v_ServiceId = s.v_ServiceId) as 'ExamenesRec',
            (select COUNT(re.v_ReceipId)
                from SigesoftDesarrollo_2.dbo.receipHeader re
                where re.i_IsDeleted = 0 and re.v_ServiceId = s.v_ServiceId) as 'FarmRec',
            p.v_PersonId as 'PersonId',
            A.UseriD as UseriD,
            pr.i_Consultorio AS 'ConsultorioId',
            pr.i_mktWork as 'TipoProtocoloId',
            CASE
                WHEN pr.v_Procedencia = 'O' THEN 'OCUPACIONAL'
                WHEN pr.v_Procedencia = 'S' THEN 'SEGUROS'
                WHEN pr.v_Procedencia = 'H' THEN N'HOSPITALIZACIÓN'
                WHEN pr.v_Procedencia = 'E' THEN 'EMERGENCIA'
                WHEN pr.v_Procedencia = 'A' THEN 'AMBULATORIO'
                WHEN pr.v_Procedencia = 'M' THEN 'MTC'
                ELSE '- - -'
            END as 'Value1',
            pr.v_Procedencia as 'Value2',
            A.ServiceComponentId as ServiceComponentId
        FROM SigesoftDesarrollo_2.dbo.service s
        INNER JOIN SigesoftDesarrollo_2.dbo.protocol pr on s.v_ProtocolId = pr.v_ProtocolId
        INNER JOIN SigesoftDesarrollo_2.dbo.person as p on s.v_PersonId = p.v_PersonId
        LEFT JOIN SigesoftDesarrollo_2.dbo.datahierarchy as dhd on p.i_DocTypeId = dhd.i_ItemId and dhd.i_GroupId = 106
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter as spg on p.i_SexTypeId = spg.i_ParameterId and spg.i_GroupId = 100
        LEFT JOIN SigesoftDesarrollo_2.dbo.datahierarchy as dhdep on p.i_DepartmentId = dhdep.i_ItemId and dhdep.i_GroupId = 113
        LEFT JOIN SigesoftDesarrollo_2.dbo.datahierarchy as dhpro on p.i_ProvinceId = dhpro.i_ItemId and dhpro.i_GroupId = 113
        LEFT JOIN SigesoftDesarrollo_2.dbo.datahierarchy as dhdis on p.i_DistrictId = dhdis.i_ItemId and dhdis.i_GroupId = 113
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter as sps on p.i_TypeOfInsuranceId = sps.i_ParameterId and sps.i_GroupId = 188
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter as spec on p.i_MaritalStatusId = spec.i_ParameterId and spec.i_GroupId = 101
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter spp on spp.i_GroupId = 403 and pr.i_Consultorio = spp.i_ParameterId
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter Q on Q.i_GroupId = 118 and pr.i_EsoTypeId = Q.i_ParameterId
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter mkt on mkt.i_GroupId = 422 and p.i_Marketing = mkt.i_ParameterId
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter Q2 on Q2.i_GroupId = 423 and pr.i_mktWork = Q2.i_ParameterId
        LEFT JOIN SigesoftDesarrollo_2.dbo.calendar as cl on s.v_ServiceId = cl.v_ServiceId
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemuser as su on cl.i_InsertUserId = su.i_SystemUserId
        OUTER APPLY
        (
            SELECT TOP 1
                pru.v_FirstLastName + ' ' + pru.v_SecondLastName + ', ' + pru.v_FirstName AS MEDICO,
                pru.v_DocNumber as NroDocMed,
                syu.i_SystemUserId as UseriD,
                dh.v_Value1 as ESP,
                E.v_ServiceComponentId as ServiceComponentId
            FROM SigesoftDesarrollo_2.dbo.servicecomponent E
            LEFT JOIN SigesoftDesarrollo_2.dbo.systemuser syu on E.i_MedicoTratanteId = syu.i_SystemUserId
            LEFT JOIN SigesoftDesarrollo_2.dbo.person pru on syu.v_PersonId = pru.v_PersonId
            LEFT JOIN SigesoftDesarrollo_2.dbo.professional as prMed on pru.v_PersonId = prMed.v_PersonId
            LEFT JOIN SigesoftDesarrollo_2.dbo.datahierarchy dh on dh.i_ItemId = prMed.i_Profesion and dh.i_GroupId = 126
            WHERE E.v_ServiceId = s.v_ServiceId
        ) A
        OUTER APPLY
        (
            SELECT TOP 1
                sc.i_ApplicantMedic as IdMedicoSolicita,
                pSol.v_FirstLastName + ' ' + pSol.v_SecondLastName + ', ' + pSol.v_FirstName as vMedicoSolicita,
                suu.v_Value1 as espMedicoSolicita
            FROM SigesoftDesarrollo_2.dbo.servicecomponent sc
            LEFT JOIN SigesoftDesarrollo_2.dbo.systemuser suSol on sc.i_ApplicantMedic = suSol.i_SystemUserId
            LEFT JOIN SigesoftDesarrollo_2.dbo.person pSol on suSol.v_PersonId = pSol.v_PersonId
            LEFT JOIN SigesoftDesarrollo_2.dbo.professional prSol on pSol.v_PersonId = prSol.v_PersonId
            LEFT JOIN SigesoftDesarrollo_2.dbo.datahierarchy suu on prSol.i_Profesion = suu.i_ItemId and suu.i_GroupId = 126
            WHERE sc.v_ServiceId = s.v_ServiceId
                AND sc.v_ComponentId != 'N001-ME000000003'
                AND sc.v_ComponentId != 'N009-ME000001226'
        ) B
        OUTER APPLY
        (
            SELECT TOP 1
                ds.v_Name as DxName,
                c10.v_CIE10Description2 as DxCie10
            FROM SigesoftDesarrollo_2.dbo.diagnosticrepository dre
            LEFT JOIN SigesoftDesarrollo_2.dbo.diseases ds on dre.v_DiseasesId = ds.v_DiseasesId
            LEFT JOIN SigesoftDesarrollo_2.dbo.cie10 c10 on ds.v_CIE10Id = c10.v_CIE10Id
            WHERE dre.v_ServiceId = s.v_ServiceId
                AND (dre.v_ComponentId != 'N002-ME000000002' and dre.v_ComponentId != 'N002-ME000000001')
                AND dre.i_FinalQualificationId != 4
        ) Dx
        WHERE (pr.i_MasterServiceTypeId = 9 or pr.i_MasterServiceTypeId = 42)
            AND s.v_ComprobantePago IS NOT NULL
            AND (@FechaInicioRetrasada <= s.d_ServiceDate AND s.d_ServiceDate <= @FechaFinAlargada)
            AND cl.i_CalendarStatusId != 3
            AND cl.i_IsDeleted = 0
            AND (@ConsultorioVal IS NULL OR pr.i_Consultorio = @ConsultorioVal)
    )
    SELECT
        V.idexterno as idVenta,
        V.extdocumento_c as docTypeCliente,
        V.nrodocumento_c as docNumberCliente,
        V.nombres_c as cliente,
        V.idubigeo_c as ubigeoCliente,
        V.dedireccion_c as direccionCliente,
        V.extformapago_t as formaPagoName,
        V.extserie_t as serie,
        V.numero_t as numero,
        V.emision_t as fechaPago,
        V.monto_t as monto,
        V.usuario_t as usuarioVenta,
        V.preciounitario_td as precioServicio,
        V.cantidad_td as cantidad,
        V.total_td as montoPagadoReal,
        V.codigo_td,
        V.nombreservicio_td nombreServicio,
        V.tieneatencion,
        V.Comprobante as v_ComprobantePago,
        V.fecharegistro_t as d_ServiceDate,
        V.total_tdD as total,
        V.estado_t as estado,
        V.motivo_t as motivo,
        V.v_IdVentaDetalle as idVentaDetalle,
        V.TipCaj,
        V.v_IdVentaDetalle as idVentaDetalle,
        S.Servicio_p as v_ServiceId,
        S.extdocumento_p as docTypePaciente,
        S.nrodocumento_p as docNumberPaciente,
        S.paterno_p as apPaternoPaciente,
        S.materno_p as apMaternoPaciente,
        S.nombres_p as nombresPaciente,
        S.nacimiento_p as fechaNacimientoPaciente,
        S.extsexo_p as generoPaciente,
        S.idubigeo_p as ubigeoPaciente,
        S.dedireccion_p as direccionPaciente,
        S.detelefono_p as telefonoPaciente,
        S.decorreo_p as correoPaciente,
        S.deseguro_p as seguroPaciente,
        S.extestadocivil_p as estadoCivilPaciente,
        S.apoderadonombre_p as nombreApoderado,
        S.apoderadocontacto_p as contactoApoderado,
        S.FechaServicio as fechaServicioFormateada,
        S.ComprobanteAt,
        S.Usuario2 as usuarioVenta2,
        S.userId as medicoId,
        S.Medico as nombreMedico,
        S.ServiceComponentId as v_ServiceComponentId,
        S.PROTOCOLO as nombreProtocolo,
        S.ESPECIALIDAD_MEDICA as especialidadMedico,
        S.CONSULTORIO as consultorio,
        S.TipoServicio as tipoServicio,
        S.EDAD as edadPaciente,
        S.IdMedicoSolicita as idMedicoSolicita,
        S.vMedicoSolicita as nombreMedicoSolicita,
        S.espMedicoSolicita as especialidadSolicita,
        S.medioMkt as marketing,
        S.v_MarketingOtros as marketingOtros,
        S.v_NroDocMed,
        S.dxNombre,
        S.dxCie10,
        S.dxEst,
        S.tipoProtocolo,
        S.examenesRec,
        S.farmRec,
        S.personId,
        S.consultorioId,
        S.tipoProtocoloId,
        S.Value1 as tipoProtocoloName,
        S.Value2 as tipoProtocoloCode,
        TRY_CONVERT(DECIMAL(5,2), S.PorcRefRaw) as PorcRef,
        -- esPagado DUAL: 1 si el servicio ya se pago en el legacy (servicespaid activo) O en conta.
        CASE
            WHEN S.Servicio_p IS NULL THEN 0
            WHEN EXISTS (SELECT 1 FROM SigesoftDesarrollo_2.dbo.servicespaiddetails spd
                         WHERE spd.v_ServiceId = S.Servicio_p AND spd.i_IsDeleted = 0) THEN 1
            WHEN EXISTS (SELECT 1 FROM conta.pago_honorario_servicio phs
                         WHERE phs.v_ServiceId = S.Servicio_p COLLATE DATABASE_DEFAULT AND phs.b_Anulado = 0) THEN 1
            ELSE 0
        END as esPagado
    FROM VentasData V
    LEFT JOIN ServiciosData S ON CHARINDEX(V.Comprobante, S.ComprobanteAt COLLATE DATABASE_DEFAULT) > 0
    WHERE
        (@ConsultorioVal IS NULL OR S.Servicio_p IS NOT NULL)
    ORDER BY V.idexterno, V.extserie_t, V.numero_t;
END
GO

-- =====================================================================
-- 6) sp_Honorarios_Consultorios  (catalogo 403).
-- =====================================================================
IF OBJECT_ID('conta.sp_Honorarios_Consultorios','P') IS NOT NULL DROP PROCEDURE conta.sp_Honorarios_Consultorios;
GO
CREATE PROCEDURE conta.sp_Honorarios_Consultorios
AS
BEGIN
    SET NOCOUNT ON;
    SELECT sp.i_ParameterId AS Id,
           sp.v_Value1 COLLATE DATABASE_DEFAULT AS Nombre,
           TRY_CONVERT(DECIMAL(5,2), sp.v_Value2) AS PorcMedico
    FROM SigesoftDesarrollo_2.dbo.systemparameter sp
    WHERE sp.i_GroupId = 403 AND ISNULL(sp.i_IsDeleted,0) = 0
    ORDER BY sp.v_Value1;
END
GO

-- =====================================================================
-- 7) sp_Honorarios_Medicos  (PORT de GetMedicosByConsultorio_SP vivo, todo SigesoftDesarrollo_2).
-- =====================================================================
IF OBJECT_ID('conta.sp_Honorarios_Medicos','P') IS NOT NULL DROP PROCEDURE conta.sp_Honorarios_Medicos;
GO
CREATE PROCEDURE conta.sp_Honorarios_Medicos
    @ConsultorioId INT = NULL   -- NULL = (el legacy no devuelve medicos sin consultorio; se conserva)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ConsultorioName VARCHAR(205) = '';
    DECLARE @ProfesionId INT;
    IF @ConsultorioId IS NOT NULL
    BEGIN
        SELECT @ConsultorioName = sp.v_Value1
        FROM SigesoftDesarrollo_2.dbo.systemparameter sp
        WHERE sp.i_ParameterId = @ConsultorioId AND sp.i_GroupId = 403 AND sp.i_IsDeleted = 0;

        SELECT @ProfesionId = i_ItemId
        FROM SigesoftDesarrollo_2.dbo.datahierarchy
        WHERE i_GroupId = 126 AND i_IsDeleted = 0 AND v_Value1 = @ConsultorioName;
    END

    SELECT DISTINCT
        su.i_SystemUserId as MedicoTratanteId,
        su.v_UserName as userName,
        pp.v_FirstLastName + ' ' + pp.v_SecondLastName + ' ' + pp.v_FirstName as name,
        @ConsultorioId as consultorioId,
        @ConsultorioName as consultorio,
        sur.i_RoleId
    FROM SigesoftDesarrollo_2.dbo.systemuser su
    INNER JOIN SigesoftDesarrollo_2.dbo.systemuserrolenode sur ON su.i_SystemUserId = sur.i_SystemUserId
    INNER JOIN SigesoftDesarrollo_2.dbo.professional pr ON su.v_PersonId = pr.v_PersonId
    INNER JOIN SigesoftDesarrollo_2.dbo.person pp ON pr.v_PersonId = pp.v_PersonId
    WHERE pr.i_Profesion = @ProfesionId
        AND sur.i_RoleId > 30
        AND su.i_IsDeleted = 0
        AND pr.i_IsDeleted = 0
        AND pp.i_IsDeleted = 0;
END
GO

-- =====================================================================
-- 8) sp_Honorarios_BuscarProfesional  (PORT de sp_BuscarProfesionales vivo).
-- =====================================================================
IF OBJECT_ID('conta.sp_Honorarios_BuscarProfesional','P') IS NOT NULL DROP PROCEDURE conta.sp_Honorarios_BuscarProfesional;
GO
CREATE PROCEDURE conta.sp_Honorarios_BuscarProfesional
    @Texto NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        su.i_SystemUserId as systemUserId,
        su.v_PersonId as personId,
        su.v_UserName as userName,
        per.v_FirstName + ', ' + per.v_FirstLastName + ' ' + per.v_SecondLastName AS Name
    FROM SigesoftDesarrollo_2.dbo.systemuser su
    INNER JOIN SigesoftDesarrollo_2.dbo.professional pp ON pp.v_PersonId = su.v_PersonId
    INNER JOIN SigesoftDesarrollo_2.dbo.person per ON pp.v_PersonId = per.v_PersonId
    WHERE su.i_SystemUserTypeId = 1
        AND su.i_IsDeleted = 0
        AND pp.i_IsDeleted = 0
        AND pp.i_Profesion > 0
        AND (
            @Texto IS NULL OR
            su.v_UserName LIKE '%' + @Texto + '%' OR
            per.v_FirstName LIKE '%' + @Texto + '%' OR
            per.v_FirstLastName LIKE '%' + @Texto + '%' OR
            per.v_SecondLastName LIKE '%' + @Texto + '%'
        )
    ORDER BY per.v_FirstName, per.v_FirstLastName;
END
GO

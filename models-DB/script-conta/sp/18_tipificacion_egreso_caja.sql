-- =====================================================================
-- FASE 1 (Tipificacion ADITIVA de egresos de caja SAMBHS) - SPs.
-- Plan: models-DB/docs/PLAN_TIPIFICACION_EGRESOS_SAMBHS.md (seccion 2.2).
-- SQL Server 2012. Idempotente IF OBJECT_ID DROP / GO / CREATE.
--
--   sp_EgresoCaja_ResolverComprobante  (lectura; puente comprobante->service, 1 fila/servicio)
--   sp_EgresoCaja_Tipificar            (escritura transaccional; GASTO overlay | HONORARIO pago CAJA)
--   sp_EgresoCaja_Destipificar         (rollback quirurgico: overlay/pago -> ANULADO)
--   sp_EgresoCaja_Consistencia         (lectura; clasificaciones ACTIVO cuya venta EC esta eliminada)
--
-- REGLAS: cross-DB SigesoftDesarrollo_2 = SOLO SELECT (jamas v_Password). El honorario-caja JAMAS
-- crea conta.egreso (no llama sp_Egreso_Insert): pago con i_IdEgreso NULL en consultorio + overlay
-- MED-HON. Centros por v_Codigo/join (nunca ids hardcode). v_IdVenta SIEMPRE LTRIM(RTRIM(...)).
-- =====================================================================

-- =====================================================================
-- 1) sp_EgresoCaja_ResolverComprobante  (lectura, para el modal)
--    Puente A acotado a UNA boleta: mismo tokenizador de sp_Honorarios_Analisis (tally sys.all_objects,
--    LTRIM/RTRIM por token, CHARINDEX '|' anti-"Invalid length"). RS1 = 1 fila por servicio con
--    medico/consultorio/tipo/pagado (coincide con el analisis). NO muta nada.
-- =====================================================================
IF OBJECT_ID('conta.sp_EgresoCaja_ResolverComprobante','P') IS NOT NULL DROP PROCEDURE conta.sp_EgresoCaja_ResolverComprobante;
GO
CREATE PROCEDURE conta.sp_EgresoCaja_ResolverComprobante
    @Comprobante NVARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;

    -- Normalizacion: UPPER, trim, split por el ULTIMO '-', correlativo padStart(8).
    DECLARE @in NVARCHAR(40) = LTRIM(RTRIM(UPPER(ISNULL(@Comprobante, ''))));
    IF @in = '' BEGIN RAISERROR('Debe indicar el numero de comprobante.', 16, 1); RETURN; END
    IF CHARINDEX('-', @in) = 0 BEGIN RAISERROR('Formato de comprobante invalido (use SERIE-NUMERO).', 16, 1); RETURN; END

    DECLARE @posLast INT = LEN(@in) - CHARINDEX('-', REVERSE(@in)) + 1;   -- posicion del ULTIMO '-'
    DECLARE @serie NVARCHAR(20) = LTRIM(RTRIM(LEFT(@in, @posLast - 1)));
    DECLARE @corr  NVARCHAR(20) = LTRIM(RTRIM(SUBSTRING(@in, @posLast + 1, 20)));
    IF @serie = '' OR @corr = '' OR @corr LIKE '%[^0-9]%'
    BEGIN RAISERROR('Formato de comprobante invalido (use SERIE-NUMERO).', 16, 1); RETURN; END
    SET @corr = RIGHT(REPLICATE('0', 8) + @corr, 8);
    DECLARE @comp NVARCHAR(40) = @serie + '-' + @corr;

    -- Venta de la ATENCION (boleta). Preferir la NO eliminada.
    DECLARE @IdVentaAt NCHAR(16), @Elim INT, @FVenta DATETIME;
    SELECT TOP 1 @IdVentaAt = v.v_IdVenta, @Elim = ISNULL(v.i_Eliminado, 0), @FVenta = v.t_InsertaFecha
    FROM dbo.venta v
    WHERE LTRIM(RTRIM(v.v_SerieDocumento)) = @serie COLLATE DATABASE_DEFAULT
      AND LTRIM(RTRIM(v.v_CorrelativoDocumento)) = @corr COLLATE DATABASE_DEFAULT
    ORDER BY ISNULL(v.i_Eliminado, 0) ASC, v.t_InsertaFecha DESC;

    IF @IdVentaAt IS NULL BEGIN RAISERROR('Comprobante no encontrado.', 16, 1); RETURN; END
    IF @Elim = 1 BEGIN RAISERROR('La venta del comprobante esta anulada.', 16, 1); RETURN; END

    -- Base del honorario = bruto de la boleta (ventadetalle) repartido en partes iguales por servicio.
    DECLARE @boletaTotal DECIMAL(18,2) =
        ISNULL((SELECT SUM(vd.d_PrecioVenta) FROM dbo.ventadetalle vd
                WHERE vd.v_IdVenta = @IdVentaAt AND ISNULL(vd.i_Eliminado, 0) = 0), 0);

    -- Servicios candidatos (masterType 9/42, calendario valido) pre-filtrados por ventana +-10d y
    -- por contener el comprobante; luego se confirma con equi-join por token exacto.
    IF OBJECT_ID('tempdb..#S') IS NOT NULL DROP TABLE #S;
    IF OBJECT_ID('tempdb..#T') IS NOT NULL DROP TABLE #T;

    SELECT
        s.v_ServiceId                                   AS v_ServiceId,
        s.v_ComprobantePago                             AS ComprobanteAt,
        ISNULL(pr.v_Name, 'SERVICIO')                   AS NombreServicio,
        s.d_ServiceDate                                 AS FechaAtencion,
        pr.i_Consultorio                                AS ConsultorioId,
        ISNULL(spp.v_Value1, 'SIN CONSULTORIO')         AS ConsultorioNombre,
        pr.i_MasterServiceTypeId                        AS MasterTypeId,
        A.MedicoId                                      AS MedicoId,
        A.MedicoNombre                                  AS MedicoNombre,
        ROW_NUMBER() OVER (ORDER BY (SELECT NULL))      AS rid
    INTO #S
    FROM SigesoftDesarrollo_2.dbo.service s
    INNER JOIN SigesoftDesarrollo_2.dbo.protocol pr ON s.v_ProtocolId = pr.v_ProtocolId
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter spp ON spp.i_GroupId = 403 AND pr.i_Consultorio = spp.i_ParameterId
    LEFT JOIN SigesoftDesarrollo_2.dbo.calendar cl ON s.v_ServiceId = cl.v_ServiceId
    OUTER APPLY (
        SELECT TOP 1
            syu.i_SystemUserId AS MedicoId,
            ISNULL(pru.v_FirstLastName,'') + ' ' + ISNULL(pru.v_SecondLastName,'') + ', ' + ISNULL(pru.v_FirstName,'') AS MedicoNombre
        FROM SigesoftDesarrollo_2.dbo.servicecomponent E
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemuser syu ON E.i_MedicoTratanteId = syu.i_SystemUserId
        LEFT JOIN SigesoftDesarrollo_2.dbo.person pru ON syu.v_PersonId = pru.v_PersonId
        WHERE E.v_ServiceId = s.v_ServiceId
    ) A
    WHERE (pr.i_MasterServiceTypeId = 9 OR pr.i_MasterServiceTypeId = 42)
      AND s.v_ComprobantePago IS NOT NULL
      AND s.d_ServiceDate >= DATEADD(DAY, -10, @FVenta)
      AND s.d_ServiceDate <= DATEADD(DAY,  10, @FVenta)
      AND cl.i_CalendarStatusId <> 3
      AND cl.i_IsDeleted = 0
      AND s.v_ComprobantePago LIKE '%' + @comp + '%';

    -- Tokenizar #S.ComprobanteAt (lista '|') -> #T (rid, tok) con tally table (SQL2012, sin STRING_SPLIT).
    ;WITH Nums AS (SELECT ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n FROM sys.all_objects)
    SELECT DISTINCT
        s.rid,
        LTRIM(RTRIM(SUBSTRING(s.ComprobanteAt, n.n,
              CHARINDEX('|', s.ComprobanteAt + '|', n.n) - n.n))) AS tok
    INTO #T
    FROM #S s
    JOIN Nums n ON n.n <= LEN(s.ComprobanteAt)
               AND SUBSTRING('|' + s.ComprobanteAt, n.n, 1) = '|'
    WHERE LTRIM(RTRIM(SUBSTRING(s.ComprobanteAt, n.n,
              CHARINDEX('|', s.ComprobanteAt + '|', n.n) - n.n))) <> '';

    -- Numero de servicios distintos que matchean la boleta (para el reparto de la base).
    DECLARE @nsvc INT = (SELECT COUNT(DISTINCT s.v_ServiceId)
                         FROM #S s JOIN #T t ON t.rid = s.rid
                         WHERE t.tok = @comp COLLATE DATABASE_DEFAULT);
    IF @nsvc = 0 BEGIN RAISERROR('El comprobante no tiene servicios (atenciones) vinculados.', 16, 1); RETURN; END

    -- RS1: 1 fila por servicio. EsPagado (DUAL) se calcula FUERA del agregado (subquery no va en MAX).
    SELECT
        g.v_ServiceId,
        g.NombreServicio,
        g.FechaAtencion,
        g.Precio,
        g.MedicoId,
        g.MedicoNombre,
        g.ConsultorioId,
        g.ConsultorioNombre,
        g.TipoProduccion,
        CASE
            WHEN EXISTS (SELECT 1 FROM SigesoftDesarrollo_2.dbo.servicespaiddetails spd
                         WHERE spd.v_ServiceId = g.v_ServiceId AND spd.i_IsDeleted = 0) THEN 1
            WHEN EXISTS (SELECT 1 FROM conta.pago_honorario_servicio phs
                         WHERE phs.v_ServiceId = g.v_ServiceId COLLATE DATABASE_DEFAULT AND phs.b_Anulado = 0) THEN 1
            ELSE 0
        END AS EsPagado
    FROM (
        SELECT
            s.v_ServiceId                                           AS v_ServiceId,
            MAX(s.NombreServicio)                                   AS NombreServicio,
            MAX(s.FechaAtencion)                                    AS FechaAtencion,
            CAST(@boletaTotal / @nsvc AS DECIMAL(18,2))             AS Precio,
            MAX(s.MedicoId)                                         AS MedicoId,
            MAX(s.MedicoNombre)                                     AS MedicoNombre,
            MAX(s.ConsultorioId)                                    AS ConsultorioId,
            MAX(s.ConsultorioNombre COLLATE DATABASE_DEFAULT)       AS ConsultorioNombre,
            MAX(CASE s.MasterTypeId WHEN 9 THEN 'CLINICA' WHEN 42 THEN 'SISOL' END) AS TipoProduccion
        FROM #S s
        JOIN #T t ON t.rid = s.rid AND t.tok = @comp COLLATE DATABASE_DEFAULT
        GROUP BY s.v_ServiceId
    ) g
    ORDER BY g.v_ServiceId;

    IF OBJECT_ID('tempdb..#S') IS NOT NULL DROP TABLE #S;
    IF OBJECT_ID('tempdb..#T') IS NOT NULL DROP TABLE #T;
END
GO

-- =====================================================================
-- 2) sp_EgresoCaja_Tipificar  (escritura, UNA transaccion XACT_ABORT ON)
-- =====================================================================
IF OBJECT_ID('conta.sp_EgresoCaja_Tipificar','P') IS NOT NULL DROP PROCEDURE conta.sp_EgresoCaja_Tipificar;
GO
CREATE PROCEDURE conta.sp_EgresoCaja_Tipificar
    @IdVenta      NCHAR(16),               -- egreso EC (doc 502/504)
    @Tipo         NVARCHAR(10),            -- 'GASTO' | 'HONORARIO'
    @IdUsuario    INT,
    @IdTipoGasto  INT = NULL,              -- GASTO: hoja tipo_gasto visible en caja
    @IdProveedor  INT = NULL,              -- GASTO: receptor RUC (ref logica dbo.proveedores)
    @IdEntidad    INT = NULL,              -- GASTO: receptor nombre (conta.entidad)
    @Comprobantes NVARCHAR(500) = NULL     -- HONORARIO: CSV de boletas de atencion (re-resueltas server-side)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @IdVenta = LTRIM(RTRIM(@IdVenta));
    SET @Tipo    = LTRIM(RTRIM(UPPER(ISNULL(@Tipo, ''))));
    IF @Tipo NOT IN ('GASTO','HONORARIO')
    BEGIN RAISERROR('Tipo invalido (GASTO u HONORARIO).', 16, 1); RETURN; END

    -- Guardian unico del egreso (SAMBHS entra como sa): la venta existe, es EC (502/504), viva, total>0.
    DECLARE @DocEC INT, @Elim INT, @TotalEC DECIMAL(18,2), @FVentaEC DATETIME, @GlosaEC NVARCHAR(600);
    SELECT @DocEC = v.i_IdTipoDocumento, @Elim = ISNULL(v.i_Eliminado,0),
           @TotalEC = v.d_Total, @FVentaEC = v.t_InsertaFecha
    FROM dbo.venta v WHERE LTRIM(RTRIM(v.v_IdVenta)) = @IdVenta COLLATE DATABASE_DEFAULT;
    IF @DocEC IS NULL BEGIN RAISERROR('El egreso (venta) no existe.', 16, 1); RETURN; END
    IF @DocEC NOT IN (502, 504) BEGIN RAISERROR('La venta no es un egreso de caja (documento 502/504).', 16, 1); RETURN; END
    IF @Elim = 1 BEGIN RAISERROR('El egreso esta anulado.', 16, 1); RETURN; END
    IF @TotalEC IS NULL OR @TotalEC <= 0 BEGIN RAISERROR('El egreso tiene monto invalido.', 16, 1); RETURN; END
    SET @GlosaEC = (SELECT TOP 1 LEFT(LTRIM(RTRIM(vd.v_DescripcionProducto)), 600) FROM dbo.ventadetalle vd
                    WHERE vd.v_IdVenta = @IdVenta COLLATE DATABASE_DEFAULT AND ISNULL(vd.i_Eliminado,0)=0
                    ORDER BY vd.v_IdVentaDetalle);

    -- Idempotencia: si ya hay clasificacion ACTIVO para esta venta, devolver sus ids y salir (retry con ACK perdido).
    IF EXISTS (SELECT 1 FROM conta.egreso_caja_clasificacion WHERE v_IdVenta = @IdVenta AND v_Estado = 'ACTIVO')
    BEGIN
        SELECT ov.i_IdClasificacion, ov.i_IdPago,
               CASE WHEN ov.i_IdPago IS NOT NULL THEN 'PH-' + CAST(ov.i_IdPago AS VARCHAR(20)) END AS PagoRef
        FROM conta.egreso_caja_clasificacion ov
        WHERE ov.v_IdVenta = @IdVenta AND ov.v_Estado = 'ACTIVO';
        RETURN;
    END

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @IdClasificacion INT, @IdPago INT = NULL, @IdCentro INT;

        -- =============================== GASTO ===============================
        IF @Tipo = 'GASTO'
        BEGIN
            IF @IdTipoGasto IS NULL BEGIN RAISERROR('Debe indicar el tipo de gasto.', 16, 1); RETURN; END
            -- hoja (sin hijos) + visible en caja + activa + raiz distinta de OTROS_INGRESOS.
            IF NOT EXISTS (SELECT 1 FROM conta.tipo_gasto g
                           WHERE g.i_IdTipoGasto = @IdTipoGasto AND g.b_Activo = 1 AND g.b_VisibleCaja = 1
                             AND NOT EXISTS (SELECT 1 FROM conta.tipo_gasto c WHERE c.i_IdPadre = g.i_IdTipoGasto))
            BEGIN RAISERROR('Tipo de gasto invalido para caja (debe ser hoja, activa y visible en caja).', 16, 1); RETURN; END
            -- raiz != OTROS_INGRESOS (regla EN el SP, no CHECK).
            IF EXISTS (
                SELECT 1 FROM conta.tipo_gasto g
                JOIN conta.tipo_gasto p1 ON p1.i_IdTipoGasto = g.i_IdPadre
                LEFT JOIN conta.tipo_gasto p2 ON p2.i_IdTipoGasto = p1.i_IdPadre
                WHERE g.i_IdTipoGasto = @IdTipoGasto
                  AND COALESCE(p2.v_SeccionFlujo, p1.v_SeccionFlujo) = 'OTROS_INGRESOS')
            BEGIN RAISERROR('El tipo de gasto pertenece a OTROS INGRESOS (no permitido).', 16, 1); RETURN; END

            -- Centro por la unidad del egreso (ECA=502->CC-ASIS/tc1, ECF=504->CC-FARM/tc6), resuelto por join.
            SET @IdCentro = (SELECT cc.i_IdCentroCosto FROM conta.centro_costo cc
                             WHERE cc.b_Activo = 1
                               AND cc.i_IdTipoCaja = CASE @DocEC WHEN 502 THEN 1 WHEN 504 THEN 6 END);
            IF @IdCentro IS NULL BEGIN RAISERROR('No se pudo resolver el centro de costo del egreso.', 16, 1); RETURN; END

            -- Receptor: validar (si vienen) proveedor (ref logica dbo) / entidad (conta).
            IF @IdProveedor IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.proveedores WHERE id_proveedor = @IdProveedor)
            BEGIN RAISERROR('Proveedor inexistente.', 16, 1); RETURN; END
            IF @IdEntidad IS NOT NULL AND NOT EXISTS (SELECT 1 FROM conta.entidad WHERE i_IdEntidad = @IdEntidad)
            BEGIN RAISERROR('Entidad inexistente.', 16, 1); RETURN; END

            -- Caso 2 (DN1): si NO vino receptor explicito, AUTO-DERIVAR del beneficiario de la venta
            -- EC (el personal que recibio el efectivo). Fuente = dbo.cliente por dbo.venta.v_IdCliente.
            -- La derivacion es puramente aditiva: si vino proveedor/entidad se respeta intacto.
            IF @IdProveedor IS NULL AND @IdEntidad IS NULL
            BEGIN
                DECLARE @BenefDoc NVARCHAR(20), @BenefTipoPersona INT, @BenefNombre NVARCHAR(400);
                SELECT TOP 1
                    @BenefTipoPersona = c.i_IdTipoPersona,
                    @BenefDoc         = LTRIM(RTRIM(ISNULL(c.v_NroDocIdentificacion, ''))),
                    @BenefNombre      = CASE
                        WHEN c.i_IdTipoPersona = 2 THEN LTRIM(RTRIM(ISNULL(c.v_RazonSocial, '')))
                        ELSE LTRIM(RTRIM(ISNULL(c.v_ApePaterno, '') + ' ' + ISNULL(c.v_ApeMaterno, '')))
                             + ', ' + LTRIM(RTRIM(ISNULL(c.v_PrimerNombre, '')))
                    END
                FROM dbo.venta v
                JOIN dbo.cliente c ON c.v_IdCliente = v.v_IdCliente
                WHERE LTRIM(RTRIM(v.v_IdVenta)) = @IdVenta COLLATE DATABASE_DEFAULT;

                -- Derivar SOLO persona natural, con documento y nombre validos, que no sea la propia
                -- clinica (RUC 20495666973). Juridica / doc vacio / nombre vacio -> @IdEntidad queda
                -- NULL (no se deriva; el flujo continua sin receptor, como antes).
                IF ISNULL(@BenefTipoPersona, 1) <> 2
                   AND @BenefDoc <> '' AND @BenefDoc <> '20495666973'
                   AND LTRIM(RTRIM(REPLACE(@BenefNombre, ',', ''))) <> ''
                BEGIN
                    -- Upsert entidad PERSONAL por (v_Documento, v_Tipo) = patron del upsert MEDICO, por documento.
                    SELECT TOP 1 @IdEntidad = i_IdEntidad FROM conta.entidad
                        WHERE v_Documento = @BenefDoc AND v_Tipo = 'PERSONAL' ORDER BY i_IdEntidad;
                    IF @IdEntidad IS NULL
                    BEGIN
                        INSERT INTO conta.entidad (v_Nombre, v_Tipo, v_Documento, b_Activo, i_InsertaIdUsuario)
                        VALUES (@BenefNombre, 'PERSONAL', @BenefDoc, 1, @IdUsuario);
                        SET @IdEntidad = SCOPE_IDENTITY();
                    END
                    ELSE
                        UPDATE conta.entidad SET b_Activo = 1, i_ActualizaIdUsuario = @IdUsuario, t_ActualizaFecha = GETDATE()
                        WHERE i_IdEntidad = @IdEntidad AND b_Activo = 0;
                END
            END

            INSERT INTO conta.egreso_caja_clasificacion
                (v_IdVenta, v_TipoEgreso, i_IdTipoGasto, i_IdCentroCosto, i_IdProveedor, i_IdEntidad,
                 v_Estado, v_Glosa, i_InsertaIdUsuario)
            VALUES
                (@IdVenta, 'GASTO', @IdTipoGasto, @IdCentro, @IdProveedor, @IdEntidad,
                 'ACTIVO', @GlosaEC, @IdUsuario);
            SET @IdClasificacion = SCOPE_IDENTITY();

            EXEC conta.sp_Auditoria_Insert 'conta.egreso_caja_clasificacion', @IdClasificacion, 'TIPIFICAR_GASTO',
                 @IdVenta, @IdUsuario;
        END
        -- ============================= HONORARIO =============================
        ELSE
        BEGIN
            IF @Comprobantes IS NULL OR LTRIM(RTRIM(@Comprobantes)) = ''
            BEGIN RAISERROR('Debe indicar al menos un comprobante de la atencion.', 16, 1); RETURN; END

            -- 1) CSV de comprobantes -> filas normalizadas (mismo Resolver server-side).
            DECLARE @Comps TABLE (compRaw NVARCHAR(60));
            ;WITH Nums AS (SELECT ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n FROM sys.all_objects)
            INSERT INTO @Comps (compRaw)
            SELECT DISTINCT LTRIM(RTRIM(SUBSTRING(@Comprobantes, n.n,
                        CHARINDEX(',', @Comprobantes + ',', n.n) - n.n)))
            FROM Nums n
            WHERE n.n <= LEN(@Comprobantes)
              AND SUBSTRING(',' + @Comprobantes, n.n, 1) = ','
              AND LTRIM(RTRIM(SUBSTRING(@Comprobantes, n.n,
                        CHARINDEX(',', @Comprobantes + ',', n.n) - n.n))) <> '';

            -- 2) Resolver cada comprobante (INSERT..EXEC del Resolver: 1 sola fuente de verdad del puente).
            DECLARE @svc TABLE (
                v_ServiceId NVARCHAR(100), NombreServicio NVARCHAR(400), FechaAtencion DATETIME,
                Precio DECIMAL(18,2), MedicoId INT, MedicoNombre NVARCHAR(400),
                ConsultorioId INT, ConsultorioNombre NVARCHAR(200), TipoProduccion NVARCHAR(10), EsPagado INT
            );
            DECLARE @c NVARCHAR(60);
            DECLARE cComp CURSOR LOCAL FAST_FORWARD FOR SELECT compRaw FROM @Comps;
            OPEN cComp; FETCH NEXT FROM cComp INTO @c;
            WHILE @@FETCH_STATUS = 0
            BEGIN
                INSERT INTO @svc (v_ServiceId, NombreServicio, FechaAtencion, Precio, MedicoId, MedicoNombre,
                                  ConsultorioId, ConsultorioNombre, TipoProduccion, EsPagado)
                EXEC conta.sp_EgresoCaja_ResolverComprobante @c;
                FETCH NEXT FROM cComp INTO @c;
            END
            CLOSE cComp; DEALLOCATE cComp;

            IF NOT EXISTS (SELECT 1 FROM @svc) BEGIN RAISERROR('Los comprobantes no resolvieron ningun servicio.', 16, 1); RETURN; END

            -- 3) Validaciones de negocio (agregar por servicio para no inflar por reparto entre boletas).
            DECLARE @svcAgg TABLE (
                v_ServiceId NVARCHAR(100) PRIMARY KEY, Precio DECIMAL(18,2), MedicoId INT,
                MedicoNombre NVARCHAR(400), ConsultorioId INT, ConsultorioNombre NVARCHAR(200),
                TipoProduccion NVARCHAR(10), EsPagado INT, FechaAtencion DATETIME
            );
            INSERT INTO @svcAgg
            SELECT v_ServiceId, SUM(Precio), MAX(MedicoId), MAX(MedicoNombre), MAX(ConsultorioId),
                   MAX(ConsultorioNombre), MAX(TipoProduccion), MAX(EsPagado), MAX(FechaAtencion)
            FROM @svc GROUP BY v_ServiceId;

            IF EXISTS (SELECT 1 FROM @svcAgg WHERE MedicoId IS NULL)
            BEGIN RAISERROR('Hay servicios sin medico tratante asignado.', 16, 1); RETURN; END

            -- anti-mixto (todos misma produccion) -> mono-medico (todos mismo medico) -> ninguno pagado.
            IF (SELECT COUNT(DISTINCT TipoProduccion) FROM @svcAgg) > 1
            BEGIN RAISERROR('Los comprobantes mezclan CLINICA y SISOL (deben ser del mismo tipo de produccion).', 16, 1); RETURN; END
            IF (SELECT COUNT(DISTINCT MedicoId) FROM @svcAgg) > 1
            BEGIN RAISERROR('Los comprobantes corresponden a mas de un medico (deben ser del mismo medico).', 16, 1); RETURN; END

            DECLARE @pagados NVARCHAR(MAX) = (SELECT STUFF((SELECT ', ' + v_ServiceId FROM @svcAgg WHERE EsPagado = 1
                                              ORDER BY v_ServiceId FOR XML PATH(''), TYPE).value('.','NVARCHAR(MAX)'),1,2,''));
            IF @pagados IS NOT NULL AND LEN(@pagados) > 0
            BEGIN RAISERROR('Servicios ya pagados (no se pueden pagar por caja): %s', 16, 1, @pagados); RETURN; END

            DECLARE @MedicoId INT      = (SELECT TOP 1 MedicoId FROM @svcAgg);
            DECLARE @MedicoNom NVARCHAR(400) = (SELECT TOP 1 MedicoNombre FROM @svcAgg ORDER BY v_ServiceId);
            DECLARE @TipoProd NVARCHAR(10) = (SELECT TOP 1 TipoProduccion FROM @svcAgg);
            DECLARE @Desde DATE = (SELECT CAST(MIN(FechaAtencion) AS DATE) FROM @svcAgg);
            DECLARE @Hasta DATE = (SELECT CAST(MAX(FechaAtencion) AS DATE) FROM @svcAgg);
            DECLARE @TotalServicios DECIMAL(18,2) = (SELECT SUM(Precio) FROM @svcAgg);

            -- Centro por tipo de produccion (CLINICA->CC-ASIS, SISOL->CC-SISOL), por v_Codigo (patron sp_Sisol_Pagar).
            SET @IdCentro = (SELECT i_IdCentroCosto FROM conta.centro_costo
                             WHERE v_Codigo = CASE @TipoProd WHEN 'SISOL' THEN 'CC-SISOL' ELSE 'CC-ASIS' END AND b_Activo = 1);
            IF @IdCentro IS NULL BEGIN RAISERROR('Centro de costo no encontrado para la produccion.', 16, 1); RETURN; END
            DECLARE @IdTipoGastoHon INT = (SELECT i_IdTipoGasto FROM conta.tipo_gasto WHERE v_Codigo = 'MED-HON');

            -- 4) Upsert entidad MEDICO por nombre (patron sp_PagoHonorario_Insert).
            DECLARE @IdEnt INT = (SELECT TOP 1 i_IdEntidad FROM conta.entidad
                                  WHERE v_Nombre = @MedicoNom AND v_Tipo = 'MEDICO' ORDER BY i_IdEntidad);
            IF @IdEnt IS NULL
            BEGIN
                INSERT INTO conta.entidad (v_Nombre, v_Tipo, b_Activo, i_InsertaIdUsuario)
                VALUES (@MedicoNom, 'MEDICO', 1, @IdUsuario);
                SET @IdEnt = SCOPE_IDENTITY();
            END
            ELSE
                UPDATE conta.entidad SET b_Activo = 1, i_ActualizaIdUsuario = @IdUsuario, t_ActualizaFecha = GETDATE()
                WHERE i_IdEntidad = @IdEnt AND b_Activo = 0;

            -- 5) Cabecera del pago (Origen=CAJA, egreso NUNCA en conta.egreso). d_TotalPago = lo que salio de caja.
            INSERT INTO conta.pago_honorario
                (i_MedicoId, v_MedicoNombre, i_IdEntidad, t_PeriodoDesde, t_PeriodoHasta, d_PorcMedico,
                 d_TotalServicios, d_TotalPago, v_Estado, t_FechaPago, v_Glosa, i_InsertaIdUsuario,
                 v_TipoProduccion, v_Origen, v_IdVentaCaja)
            VALUES
                (@MedicoId, @MedicoNom, @IdEnt, @Desde, @Hasta, NULL,
                 @TotalServicios, @TotalEC, 'PAGADO', CAST(@FVentaEC AS DATE), @GlosaEC, @IdUsuario,
                 @TipoProd, 'CAJA', @IdVenta);
            SET @IdPago = SCOPE_IDENTITY();

            -- 6) Consultorios agrupados con i_IdEgreso = NULL + prorrateo de d_TotalPago (residuo al de mayor peso).
            DECLARE @cons TABLE (seq INT IDENTITY(1,1), i_IdConsultorio INT, v_Nombre NVARCHAR(200),
                                 d_MontoServicios DECIMAL(18,2), w DECIMAL(18,4), d_MontoPago DECIMAL(18,2));
            INSERT INTO @cons (i_IdConsultorio, v_Nombre, d_MontoServicios)
            SELECT ISNULL(ConsultorioId, -1),
                   MAX(ISNULL(ConsultorioNombre, 'SIN CONSULTORIO')),
                   CAST(SUM(Precio) AS DECIMAL(18,2))
            FROM @svcAgg GROUP BY ISNULL(ConsultorioId, -1);

            UPDATE @cons SET w = d_MontoServicios;
            IF (SELECT ISNULL(SUM(w),0) FROM @cons) = 0 UPDATE @cons SET w = 1;
            DECLARE @W DECIMAL(18,4) = (SELECT SUM(w) FROM @cons);
            UPDATE @cons SET d_MontoPago = CAST(ROUND(@TotalEC * w / @W, 2) AS DECIMAL(18,2));
            DECLARE @residuo DECIMAL(18,2) = @TotalEC - (SELECT ISNULL(SUM(d_MontoPago),0) FROM @cons);
            UPDATE @cons SET d_MontoPago = d_MontoPago + @residuo
            WHERE seq = (SELECT TOP 1 seq FROM @cons ORDER BY w DESC, seq ASC);

            INSERT INTO conta.pago_honorario_consultorio
                (i_IdPago, i_IdConsultorio, v_ConsultorioNombre, d_MontoServicios, d_MontoPago, i_IdEgreso)
            SELECT @IdPago, i_IdConsultorio, v_Nombre, d_MontoServicios, d_MontoPago, NULL
            FROM @cons;

            -- 7) Servicios (heredan el candado UX_pago_hon_serv_activo). d_Pagado = Precio (referencia).
            INSERT INTO conta.pago_honorario_servicio
                (i_IdPago, v_ServiceId, i_IdConsultorio, d_Precio, d_Porc, d_Pagado, b_Anulado)
            SELECT @IdPago, v_ServiceId, ISNULL(ConsultorioId, -1), Precio, NULL, Precio, 0
            FROM @svcAgg;

            -- 8) Overlay: MED-HON + centro por produccion; consultorio si es unico; vinculo al pago + medico.
            DECLARE @IdConsUnico INT = CASE WHEN (SELECT COUNT(*) FROM @cons) = 1
                                            THEN (SELECT TOP 1 NULLIF(i_IdConsultorio, -1) FROM @cons) END;
            INSERT INTO conta.egreso_caja_clasificacion
                (v_IdVenta, v_TipoEgreso, i_IdTipoGasto, i_IdCentroCosto, i_IdEntidad, i_IdConsultorio,
                 i_IdPago, v_Estado, v_Glosa, i_InsertaIdUsuario)
            VALUES
                (@IdVenta, 'HONORARIO', @IdTipoGastoHon, @IdCentro, @IdEnt, @IdConsUnico,
                 @IdPago, 'ACTIVO', @GlosaEC, @IdUsuario);
            SET @IdClasificacion = SCOPE_IDENTITY();

            EXEC conta.sp_Auditoria_Insert 'conta.pago_honorario', @IdPago, 'INSERT_CAJA', @IdVenta, @IdUsuario;
            EXEC conta.sp_Auditoria_Insert 'conta.egreso_caja_clasificacion', @IdClasificacion, 'TIPIFICAR_HONORARIO', @IdVenta, @IdUsuario;
        END

        COMMIT TRAN;

        SELECT @IdClasificacion AS i_IdClasificacion, @IdPago AS i_IdPago,
               CASE WHEN @IdPago IS NOT NULL THEN 'PH-' + CAST(@IdPago AS VARCHAR(20)) END AS PagoRef;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        -- Carrera de idempotencia: 2601/2627 sobre UX_ecc_venta_activo -> devolver el existente.
        IF ERROR_NUMBER() IN (2601, 2627)
           AND EXISTS (SELECT 1 FROM conta.egreso_caja_clasificacion WHERE v_IdVenta = @IdVenta AND v_Estado = 'ACTIVO')
        BEGIN
            SELECT ov.i_IdClasificacion, ov.i_IdPago,
                   CASE WHEN ov.i_IdPago IS NOT NULL THEN 'PH-' + CAST(ov.i_IdPago AS VARCHAR(20)) END AS PagoRef
            FROM conta.egreso_caja_clasificacion ov WHERE ov.v_IdVenta = @IdVenta AND ov.v_Estado = 'ACTIVO';
            RETURN;
        END
        DECLARE @em NVARCHAR(2048) = ERROR_MESSAGE(), @es INT = ERROR_SEVERITY(), @est INT = ERROR_STATE();
        RAISERROR(@em, @es, @est);
    END CATCH
END
GO

-- =====================================================================
-- 3) sp_EgresoCaja_Destipificar  (rollback quirurgico; idempotente)
-- =====================================================================
IF OBJECT_ID('conta.sp_EgresoCaja_Destipificar','P') IS NOT NULL DROP PROCEDURE conta.sp_EgresoCaja_Destipificar;
GO
CREATE PROCEDURE conta.sp_EgresoCaja_Destipificar
    @IdVenta   NCHAR(16),
    @IdUsuario INT,
    @Motivo    NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @IdVenta = LTRIM(RTRIM(@IdVenta));

    DECLARE @IdClasificacion INT, @IdPago INT;
    SELECT @IdClasificacion = i_IdClasificacion, @IdPago = i_IdPago
    FROM conta.egreso_caja_clasificacion WHERE v_IdVenta = @IdVenta AND v_Estado = 'ACTIVO';

    IF @IdClasificacion IS NULL   -- idempotente: nada ACTIVO que revertir.
    BEGIN SELECT CAST(0 AS INT) AS Anulado; RETURN; END

    BEGIN TRY
        BEGIN TRAN;

        -- Pago origen CAJA (si HONORARIO): cabecera ANULADO + servicios liberados (b_Anulado=1). SIN egreso conta.
        IF @IdPago IS NOT NULL
        BEGIN
            UPDATE conta.pago_honorario_servicio SET b_Anulado = 1 WHERE i_IdPago = @IdPago;
            UPDATE conta.pago_honorario
            SET v_Estado = 'ANULADO', v_MotivoAnulacion = ISNULL(@Motivo, 'Des-tipificacion de egreso de caja'),
                i_ActualizaIdUsuario = @IdUsuario, t_ActualizaFecha = GETDATE()
            WHERE i_IdPago = @IdPago AND v_Estado = 'PAGADO';
            EXEC conta.sp_Auditoria_Insert 'conta.pago_honorario', @IdPago, 'ANULAR_CAJA', @Motivo, @IdUsuario;
        END

        UPDATE conta.egreso_caja_clasificacion
        SET v_Estado = 'ANULADO', v_MotivoAnulacion = @Motivo,
            i_ActualizaIdUsuario = @IdUsuario, t_ActualizaFecha = GETDATE()
        WHERE i_IdClasificacion = @IdClasificacion;

        EXEC conta.sp_Auditoria_Insert 'conta.egreso_caja_clasificacion', @IdClasificacion, 'DESTIPIFICAR', @Motivo, @IdUsuario;

        COMMIT TRAN;
        SELECT CAST(1 AS INT) AS Anulado, @IdClasificacion AS i_IdClasificacion, @IdPago AS i_IdPago;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @em NVARCHAR(2048) = ERROR_MESSAGE(), @es INT = ERROR_SEVERITY(), @est INT = ERROR_STATE();
        RAISERROR(@em, @es, @est);
    END CATCH
END
GO

-- =====================================================================
-- 4) sp_EgresoCaja_Consistencia  (lectura: clasificaciones ACTIVO cuya venta EC quedo eliminada)
-- =====================================================================
IF OBJECT_ID('conta.sp_EgresoCaja_Consistencia','P') IS NOT NULL DROP PROCEDURE conta.sp_EgresoCaja_Consistencia;
GO
CREATE PROCEDURE conta.sp_EgresoCaja_Consistencia
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ov.i_IdClasificacion, ov.v_IdVenta, ov.v_TipoEgreso, ov.i_IdPago,
           ov.i_InsertaIdUsuario, ov.t_InsertaFecha
    FROM conta.egreso_caja_clasificacion ov
    JOIN dbo.venta v ON LTRIM(RTRIM(v.v_IdVenta)) = ov.v_IdVenta COLLATE DATABASE_DEFAULT
    WHERE ov.v_Estado = 'ACTIVO' AND ISNULL(v.i_Eliminado, 0) = 1
    ORDER BY ov.t_InsertaFecha;
END
GO

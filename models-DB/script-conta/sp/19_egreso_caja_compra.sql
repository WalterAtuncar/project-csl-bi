-- =====================================================================
-- FASE 1 (Cierre de ciclo del egreso de caja SAMBHS) - SPs.
-- Plan: models-DB/docs/PLAN_CIERRE_CICLO_EGRESO_CAJA.md (seccion 2.2).
-- Continua sp/18 (Tipificar/Resolver/Destipificar/Consistencia). SQL Server 2012.
-- Idempotente IF OBJECT_ID DROP / GO / CREATE.
--
--   sp_EgresoCaja_GetClasificacion       (lectura; prellena el modal editar: fila ACTIVO + nombres + compra)
--   sp_EgresoCaja_ActualizarTipificacion (escritura GASTO; edita tipo_gasto/receptor; RECHAZA HONORARIO)
--   sp_EgresoCaja_RegistrarCompra        (escritura GASTO; enriquece overlay con el comprobante)
--   sp_EgresoCaja_Bandeja                (lectura; grid de egresos EC con flags de clasificacion/compra)
--
-- PRINCIPIO RECTOR: RegistrarCompra ENRIQUECE el overlay, JAMAS crea conta.egreso (el egreso EC ya se
-- suma como cm.d_Total en las 6 superficies; crear egreso = doble conteo). El monto de caja MANDA (DD1):
-- las columnas de compra son documentales; la diferencia se CALCULA, nunca se sobrescribe el monto de
-- caja. IGV informativo (DD2): no toca dbo.registro_compras. Proveedor = dbo.proveedores (ref logica INT,
-- DD3), alta on-demand con conta.sp_Proveedor_Insert. CERO DDL/escritura sobre dbo (solo LECTURA cross-DB).
-- =====================================================================

-- =====================================================================
-- 1) sp_EgresoCaja_GetClasificacion  (lectura; para prellenar el modal editar)
--    Devuelve la fila ACTIVO del overlay + nombres (tipo_gasto, centro, proveedor dbo, entidad,
--    consultorio 403) + campos de compra + MontoCaja (cm.d_Total, lo que suman las superficies) +
--    DiferenciaMonto. Vacio si no hay clasificacion ACTIVO (el form entra en modo INSERT).
-- =====================================================================
IF OBJECT_ID('conta.sp_EgresoCaja_GetClasificacion','P') IS NOT NULL DROP PROCEDURE conta.sp_EgresoCaja_GetClasificacion;
GO
CREATE PROCEDURE conta.sp_EgresoCaja_GetClasificacion
    @IdVenta NCHAR(16)
AS
BEGIN
    SET NOCOUNT ON;
    SET @IdVenta = LTRIM(RTRIM(@IdVenta));

    -- Monto de caja de referencia = lo que suman las 6 superficies (SUM de cajamayor 'E'), fallback venta.
    DECLARE @MontoCaja DECIMAL(18,2) =
        ISNULL((SELECT SUM(cm.d_Total) FROM dbo.cajamayor_movimiento cm
                WHERE LTRIM(RTRIM(cm.v_IdVenta)) = @IdVenta COLLATE DATABASE_DEFAULT AND cm.v_TipoMovimiento = 'E'),
               (SELECT TOP 1 v.d_Total FROM dbo.venta v
                WHERE LTRIM(RTRIM(v.v_IdVenta)) = @IdVenta COLLATE DATABASE_DEFAULT));

    SELECT
        ov.i_IdClasificacion,
        LTRIM(RTRIM(ov.v_IdVenta))                    AS v_IdVenta,
        ov.v_TipoEgreso,
        ov.v_Estado,
        ov.i_IdTipoGasto,
        tg.v_Codigo                                   AS TipoGastoCodigo,
        tg.v_Nombre                                   AS TipoGastoNombre,
        ov.i_IdCentroCosto,
        cc.v_Codigo                                   AS CentroCostoCodigo,
        cc.v_Nombre                                   AS CentroCostoNombre,
        ov.i_IdProveedor,
        prov.ruc                                      AS ProveedorRuc,
        prov.razon_social                             AS ProveedorRazonSocial,
        ov.i_IdEntidad,
        ent.v_Nombre                                  AS EntidadNombre,
        ov.i_IdConsultorio,
        spp.v_Value1 COLLATE DATABASE_DEFAULT         AS ConsultorioNombre,
        ov.i_IdPago,
        ov.v_Glosa,
        ov.v_TipoDocCompra,
        ov.v_SerieNumeroCompra,
        ov.t_FechaDocCompra,
        ov.d_MontoBrutoCompra,
        ov.d_IGVCompra,
        ov.v_EstadoCompra,
        CAST(CASE WHEN ov.v_EstadoCompra = 'COMPLETO' THEN 1 ELSE 0 END AS BIT) AS CompraRegistrada,
        @MontoCaja                                    AS MontoCaja,
        CASE WHEN ov.v_EstadoCompra = 'COMPLETO' AND ov.d_MontoBrutoCompra IS NOT NULL
             THEN ov.d_MontoBrutoCompra - @MontoCaja END AS DiferenciaMonto
    FROM conta.egreso_caja_clasificacion ov
    LEFT JOIN conta.tipo_gasto   tg   ON tg.i_IdTipoGasto   = ov.i_IdTipoGasto
    LEFT JOIN conta.centro_costo cc   ON cc.i_IdCentroCosto = ov.i_IdCentroCosto
    LEFT JOIN dbo.proveedores    prov ON prov.id_proveedor  = ov.i_IdProveedor
    LEFT JOIN conta.entidad      ent  ON ent.i_IdEntidad    = ov.i_IdEntidad
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter spp ON spp.i_GroupId = 403 AND spp.i_ParameterId = ov.i_IdConsultorio
    WHERE ov.v_IdVenta = @IdVenta AND ov.v_Estado = 'ACTIVO';
END
GO

-- =====================================================================
-- 2) sp_EgresoCaja_ActualizarTipificacion  (escritura GASTO; DD4 editar tipo de gasto/receptor)
--    Solo rama GASTO. Re-valida hoja + b_VisibleCaja=1 + raiz != OTROS_INGRESOS + receptor presente
--    (proveedor XOR entidad). RECHAZA sobre HONORARIO (esa edicion se hace por _Destipificar + _Tipificar).
-- =====================================================================
IF OBJECT_ID('conta.sp_EgresoCaja_ActualizarTipificacion','P') IS NOT NULL DROP PROCEDURE conta.sp_EgresoCaja_ActualizarTipificacion;
GO
CREATE PROCEDURE conta.sp_EgresoCaja_ActualizarTipificacion
    @IdVenta     NCHAR(16),
    @IdTipoGasto INT,
    @IdProveedor INT = NULL,
    @IdEntidad   INT = NULL,
    @IdUsuario   INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @IdVenta = LTRIM(RTRIM(@IdVenta));

    DECLARE @IdClasificacion INT, @TipoEgreso NVARCHAR(20);
    SELECT @IdClasificacion = i_IdClasificacion, @TipoEgreso = v_TipoEgreso
    FROM conta.egreso_caja_clasificacion WHERE v_IdVenta = @IdVenta AND v_Estado = 'ACTIVO';

    IF @IdClasificacion IS NULL
    BEGIN RAISERROR('No hay clasificacion activa para este egreso.', 16, 1); RETURN; END
    IF @TipoEgreso <> 'GASTO'
    BEGIN RAISERROR('La edicion de un HONORARIO se hace des-tipificando y re-tipificando (no por esta via).', 16, 1); RETURN; END

    -- tipo de gasto: hoja + visible en caja + activa.
    IF @IdTipoGasto IS NULL BEGIN RAISERROR('Debe indicar el tipo de gasto.', 16, 1); RETURN; END
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

    -- receptor presente y unico (proveedor XOR entidad).
    IF @IdProveedor IS NULL AND @IdEntidad IS NULL
    BEGIN RAISERROR('Debe indicar el receptor (proveedor o entidad).', 16, 1); RETURN; END
    IF @IdProveedor IS NOT NULL AND @IdEntidad IS NOT NULL
    BEGIN RAISERROR('El receptor debe ser proveedor O entidad, no ambos.', 16, 1); RETURN; END
    IF @IdProveedor IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.proveedores WHERE id_proveedor = @IdProveedor)
    BEGIN RAISERROR('Proveedor inexistente.', 16, 1); RETURN; END
    IF @IdEntidad IS NOT NULL AND NOT EXISTS (SELECT 1 FROM conta.entidad WHERE i_IdEntidad = @IdEntidad)
    BEGIN RAISERROR('Entidad inexistente.', 16, 1); RETURN; END

    BEGIN TRY
        BEGIN TRAN;
        UPDATE conta.egreso_caja_clasificacion
        SET i_IdTipoGasto        = @IdTipoGasto,
            i_IdProveedor         = @IdProveedor,
            i_IdEntidad           = @IdEntidad,
            i_ActualizaIdUsuario  = @IdUsuario,
            t_ActualizaFecha      = GETDATE()
        WHERE i_IdClasificacion = @IdClasificacion;

        EXEC conta.sp_Auditoria_Insert 'conta.egreso_caja_clasificacion', @IdClasificacion, 'EDITAR_GASTO', @IdVenta, @IdUsuario;
        COMMIT TRAN;

        EXEC conta.sp_EgresoCaja_GetClasificacion @IdVenta;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @em NVARCHAR(2048) = ERROR_MESSAGE(), @es INT = ERROR_SEVERITY(), @est INT = ERROR_STATE();
        RAISERROR(@em, @es, @est);
    END CATCH
END
GO

-- =====================================================================
-- 3) sp_EgresoCaja_RegistrarCompra  (escritura GASTO; enriquece el overlay con el comprobante)
--    Valida overlay ACTIVO de tipo GASTO (no HONORARIO), receptor (proveedor XOR entidad), tipo doc,
--    serie-numero, fecha <= hoy, bruto>0, IGV en [0, bruto]. UPDATE de las columnas de compra +
--    v_EstadoCompra='COMPLETO' + confirma el receptor. JAMAS toca conta.egreso ni el monto de caja
--    (DD1). Idempotente/re-editable (permite corregir el comprobante).
-- =====================================================================
IF OBJECT_ID('conta.sp_EgresoCaja_RegistrarCompra','P') IS NOT NULL DROP PROCEDURE conta.sp_EgresoCaja_RegistrarCompra;
GO
CREATE PROCEDURE conta.sp_EgresoCaja_RegistrarCompra
    @IdVenta     NCHAR(16),
    @IdProveedor INT = NULL,
    @IdEntidad   INT = NULL,
    @TipoDoc     NVARCHAR(30),
    @SerieNumero NVARCHAR(100),
    @FechaDoc    DATE,
    @MontoBruto  DECIMAL(18,2),
    @IGV         DECIMAL(18,2) = 0,
    @IdUsuario   INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET @IdVenta     = LTRIM(RTRIM(@IdVenta));
    SET @TipoDoc     = LTRIM(RTRIM(UPPER(ISNULL(@TipoDoc, ''))));
    SET @SerieNumero = LTRIM(RTRIM(ISNULL(@SerieNumero, '')));
    SET @IGV         = ISNULL(@IGV, 0);

    -- overlay ACTIVO de tipo GASTO.
    DECLARE @IdClasificacion INT, @TipoEgreso NVARCHAR(20);
    SELECT @IdClasificacion = i_IdClasificacion, @TipoEgreso = v_TipoEgreso
    FROM conta.egreso_caja_clasificacion WHERE v_IdVenta = @IdVenta AND v_Estado = 'ACTIVO';

    IF @IdClasificacion IS NULL
    BEGIN RAISERROR('No hay clasificacion activa para este egreso; tipifiquelo primero.', 16, 1); RETURN; END
    IF @TipoEgreso <> 'GASTO'
    BEGIN RAISERROR('Solo se puede registrar compra sobre un egreso tipificado como GASTO.', 16, 1); RETURN; END

    -- receptor presente y unico (proveedor XOR entidad).
    IF @IdProveedor IS NULL AND @IdEntidad IS NULL
    BEGIN RAISERROR('Debe indicar el receptor (proveedor o entidad).', 16, 1); RETURN; END
    IF @IdProveedor IS NOT NULL AND @IdEntidad IS NOT NULL
    BEGIN RAISERROR('El receptor debe ser proveedor O entidad, no ambos.', 16, 1); RETURN; END
    IF @IdProveedor IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.proveedores WHERE id_proveedor = @IdProveedor)
    BEGIN RAISERROR('Proveedor inexistente.', 16, 1); RETURN; END
    IF @IdEntidad IS NOT NULL AND NOT EXISTS (SELECT 1 FROM conta.entidad WHERE i_IdEntidad = @IdEntidad)
    BEGIN RAISERROR('Entidad inexistente.', 16, 1); RETURN; END

    -- comprobante.
    IF @TipoDoc NOT IN ('FACTURA','BOLETA','RECIBO','OTRO')
    BEGIN RAISERROR('Tipo de documento invalido (FACTURA/BOLETA/RECIBO/OTRO).', 16, 1); RETURN; END
    IF @SerieNumero = ''
    BEGIN RAISERROR('Debe indicar la serie-numero del comprobante.', 16, 1); RETURN; END
    IF @FechaDoc IS NULL
    BEGIN RAISERROR('Debe indicar la fecha del comprobante.', 16, 1); RETURN; END
    IF @FechaDoc > CAST(GETDATE() AS DATE)
    BEGIN RAISERROR('La fecha del comprobante no puede ser futura.', 16, 1); RETURN; END
    IF @MontoBruto IS NULL OR @MontoBruto <= 0
    BEGIN RAISERROR('El monto bruto del comprobante debe ser mayor a 0.', 16, 1); RETURN; END
    IF @IGV < 0 OR @IGV > @MontoBruto
    BEGIN RAISERROR('El IGV debe estar entre 0 y el monto bruto.', 16, 1); RETURN; END

    BEGIN TRY
        BEGIN TRAN;
        -- ENRIQUECE el overlay. NO crea conta.egreso. NO toca el monto de caja (DD1).
        UPDATE conta.egreso_caja_clasificacion
        SET i_IdProveedor         = @IdProveedor,
            i_IdEntidad           = @IdEntidad,
            v_TipoDocCompra       = @TipoDoc,
            v_SerieNumeroCompra   = @SerieNumero,
            t_FechaDocCompra      = @FechaDoc,
            d_MontoBrutoCompra    = @MontoBruto,
            d_IGVCompra           = @IGV,
            v_EstadoCompra        = 'COMPLETO',
            i_ActualizaIdUsuario  = @IdUsuario,
            t_ActualizaFecha      = GETDATE()
        WHERE i_IdClasificacion = @IdClasificacion;

        EXEC conta.sp_Auditoria_Insert 'conta.egreso_caja_clasificacion', @IdClasificacion, 'REGISTRAR_COMPRA',
             @IdVenta, @IdUsuario;
        COMMIT TRAN;

        EXEC conta.sp_EgresoCaja_GetClasificacion @IdVenta;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @em NVARCHAR(2048) = ERROR_MESSAGE(), @es INT = ERROR_SEVERITY(), @est INT = ERROR_STATE();
        RAISERROR(@em, @es, @est);
    END CATCH
END
GO

-- =====================================================================
-- 4) sp_EgresoCaja_Bandeja  (lectura; grid de egresos EC con flags de clasificacion/compra)
--    Fuente = dbo.cajamayor_movimiento 'E' (misma que suman las 6 superficies) por t_FechaMovimiento.
--    Una fila por egreso (v_IdVenta), MontoCaja = SUM(cm.d_Total). LEFT JOIN overlay ACTIVO -> flags:
--    Clasificado, TipoEgreso, TipoGasto/Receptor (nombres), CompraRegistrada, DiferenciaMonto
--    (d_MontoBrutoCompra - MontoCaja, NULL si sin compra). Filtros opcionales @IdTipoCaja / @Estado.
--    @Estado: NULL=todos | 'SIN_CLASIFICAR' | 'CLASIFICADO' | 'CON_COMPRA' | 'SIN_COMPRA'.
-- =====================================================================
IF OBJECT_ID('conta.sp_EgresoCaja_Bandeja','P') IS NOT NULL DROP PROCEDURE conta.sp_EgresoCaja_Bandeja;
GO
CREATE PROCEDURE conta.sp_EgresoCaja_Bandeja
    @Desde      DATE,
    @Hasta      DATE,
    @IdTipoCaja INT = NULL,
    @Estado     NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @Estado = NULLIF(LTRIM(RTRIM(UPPER(ISNULL(@Estado, '')))), '');
    DECLARE @fin DATE = DATEADD(DAY, 1, @Hasta);

    ;WITH ec AS (
        SELECT LTRIM(RTRIM(cm.v_IdVenta))                        AS v_IdVenta,
               SUM(cm.d_Total)                                   AS MontoCaja,
               MAX(cm.i_IdTipoCaja)                              AS i_IdTipoCaja,
               MAX(CAST(cm.t_FechaMovimiento AS DATE))           AS Fecha,
               MAX(LTRIM(RTRIM(cm.v_NumeroDocumento)))           AS Documento,
               MAX(LTRIM(RTRIM(cm.v_ConceptoMovimiento)))        AS Glosa
        FROM dbo.cajamayor_movimiento cm
        WHERE cm.v_TipoMovimiento = 'E'
          AND cm.t_FechaMovimiento >= @Desde AND cm.t_FechaMovimiento < @fin
          AND (@IdTipoCaja IS NULL OR cm.i_IdTipoCaja = @IdTipoCaja)
        GROUP BY LTRIM(RTRIM(cm.v_IdVenta))
    )
    SELECT
        ec.v_IdVenta,
        ec.Fecha,
        ec.Documento,
        ec.Glosa,
        ec.MontoCaja,
        COALESCE(ccov.i_IdTipoCaja, ec.i_IdTipoCaja)             AS i_IdTipoCaja,
        ISNULL(tc.v_NombreTipoCaja, 'SIN UNIDAD')               AS Unidad,
        ISNULL(su.v_UserName, 'SIN CAJERO')                     AS UsuarioCajero,
        CAST(CASE WHEN ov.i_IdClasificacion IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS Clasificado,
        ov.v_TipoEgreso                                         AS TipoEgreso,
        tg.v_Nombre                                             AS TipoGasto,
        COALESCE(ent.v_Nombre, prov.razon_social)               AS Receptor,
        CAST(CASE WHEN ov.v_EstadoCompra = 'COMPLETO' THEN 1 ELSE 0 END AS BIT) AS CompraRegistrada,
        ov.v_TipoDocCompra,
        ov.v_SerieNumeroCompra,
        ov.t_FechaDocCompra,
        ov.d_MontoBrutoCompra,
        ov.d_IGVCompra,
        CASE WHEN ov.v_EstadoCompra = 'COMPLETO' AND ov.d_MontoBrutoCompra IS NOT NULL
             THEN ov.d_MontoBrutoCompra - ec.MontoCaja END      AS DiferenciaMonto
    FROM ec
    LEFT JOIN conta.egreso_caja_clasificacion ov ON ov.v_IdVenta = ec.v_IdVenta AND ov.v_Estado = 'ACTIVO'
    LEFT JOIN conta.tipo_gasto   tg   ON tg.i_IdTipoGasto   = ov.i_IdTipoGasto
    LEFT JOIN conta.entidad      ent  ON ent.i_IdEntidad    = ov.i_IdEntidad
    LEFT JOIN dbo.proveedores    prov ON prov.id_proveedor  = ov.i_IdProveedor
    LEFT JOIN conta.centro_costo ccov ON ccov.i_IdCentroCosto = ov.i_IdCentroCosto
    LEFT JOIN dbo.tipocaja       tc   ON tc.i_IdTipoCaja     = COALESCE(ccov.i_IdTipoCaja, ec.i_IdTipoCaja)
    LEFT JOIN dbo.venta          v    ON LTRIM(RTRIM(v.v_IdVenta)) = ec.v_IdVenta COLLATE DATABASE_DEFAULT
    LEFT JOIN dbo.systemuser     su   ON su.i_SystemUserId  = v.i_InsertaIdUsuario
    WHERE (@Estado IS NULL
        OR (@Estado = 'SIN_CLASIFICAR' AND ov.i_IdClasificacion IS NULL)
        OR (@Estado = 'CLASIFICADO'    AND ov.i_IdClasificacion IS NOT NULL)
        OR (@Estado = 'CON_COMPRA'     AND ov.v_EstadoCompra = 'COMPLETO')
        OR (@Estado = 'SIN_COMPRA'     AND ov.i_IdClasificacion IS NOT NULL
                                       AND (ov.v_EstadoCompra IS NULL OR ov.v_EstadoCompra <> 'COMPLETO')))
    ORDER BY ec.Fecha, ec.Documento;
END
GO

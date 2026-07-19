-- =============================================================================
-- 17_rentabilidad_empresa.sql
-- Rentabilidad OCUPACIONAL por EMPRESA CLIENTE. Nace 2026-07-19 al reformar sp/10
--   (la vista ocupacional por consultorio se descartó: ocupacional se analiza por
--    empresa juridica, no por consultorio). SQL Server 2012.
-- Objeto: conta.sp_Rentabilidad_OcupacionalPorEmpresa (SP, 2 resultsets).
--
-- Universo: conta.fn_Rentabilidad_IngresosDetalleEx(@Anio,@Mes,@IncluirCredito)
--   WHERE i_IdTipoCaja = 2 (OCUPACIONAL), agregado por venta. INTOCABLE la iTVF.
-- Empresa cliente (intra-BD principal): dbo.venta.v_IdCliente -> dbo.cliente.
--   Agrupacion SIEMPRE por RUC (cliente.v_NroDocIdentificacion) cuando la persona es
--   JURIDICA (i_IdTipoPersona=2); si no, bucket 'PARTICULARES / SIN EMPRESA'.
--   (Hay 46 RUCs con multiples filas en dbo.cliente -> agrupar por RUC, no por
--    v_IdCliente. Razon social a mostrar = MAX(v_RazonSocial), determinista.)
-- Cobrado/Saldo (tuberia CAJA, BRUTO con IGV, acumulado A HOY, sin filtro de fecha):
--   Cobrado = SUM(dbo.cobranzadetalle.d_ImporteSoles) por v_IdVenta, cd.i_Eliminado=0
--             (mismos filtros de validez que el motor de caja vivo).
--   Saldo   = SUM(dbo.cobranzapendiente.d_Saldo) por v_IdVenta, i_Eliminado=0 (0 si no hay fila).
-- Ingresos en NETO sin IGV (devengado del mes); Cobrado/Saldo en BRUTO -> nunca se
--   suman ni ratean contra IngresosNeto. PorcCobrado = 100*Cobrado/(Cobrado+Saldo).
-- NumServicios (SOLO conteo; el dinero JAMAS sale de aqui): Puentes A U B, la MISMA
--   maquinaria del sp/10 pre-reforma (tokenizador multi-token + pares boleta/EDP):
--   A (boletas): venta.v_CorrelativoDocumentoFin = ALGUN token de
--       service.v_ComprobantePago (split por '|', ventana +-15d). Multi-token sin dedup.
--   B (liquidacion/EDP): serie-correlativo = liquidacion.v_NroFactura ->
--       v_NroLiquidacion -> service.v_NroLiquidacion (ventana hasta 12 meses atras).
--   NumServicios por empresa = COUNT(DISTINCT service) de la union A U B de sus ventas;
--   0 en lineas EDP/sin flujo EMO (LUMINA COPPER: factura recurrente sin liquidacion).
-- SQL Server 2012 estricto; cross-DB (SigesoftDesarrollo_2 = SOLO SELECT) con
--   COLLATE DATABASE_DEFAULT en joins de texto. Tokenizador blindado (CASE anti
--   "Invalid length"). Invariante: SUM(IngresosNeto)=OcupacionalNeto de RS3 del sp/10.
-- =============================================================================

IF OBJECT_ID('conta.sp_Rentabilidad_OcupacionalPorEmpresa','P') IS NOT NULL
    DROP PROCEDURE conta.sp_Rentabilidad_OcupacionalPorEmpresa;
GO
CREATE PROCEDURE conta.sp_Rentabilidad_OcupacionalPorEmpresa
    @Anio           SMALLINT,
    @Mes            TINYINT,
    @IncluirCredito BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ini   DATE = DATEFROMPARTS(@Anio,@Mes,1);
    DECLARE @finEx DATE = DATEADD(MONTH,1,DATEFROMPARTS(@Anio,@Mes,1));

    -- ---------------------------------------------------------------------
    -- 1) Universo OCUPACIONAL por VENTA (tipocaja=2) + empresa cliente.
    --    EmpKey = RUC si juridica; '##PART##' (surrogate) si particular/sin RUC.
    --    NetoVenta = SUM(vd.d_Valor) por venta (2 decimales exactos).
    -- ---------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#venta') IS NOT NULL DROP TABLE #venta;
    SELECT
        d.v_IdVenta COLLATE DATABASE_DEFAULT AS v_IdVenta,
        LTRIM(RTRIM(d.v_CorrelativoDocumentoFin)) COLLATE DATABASE_DEFAULT AS corrFin,
        (LTRIM(RTRIM(d.v_SerieDocumento)) + '-' + LTRIM(RTRIM(d.v_CorrelativoDocumento)))
            COLLATE DATABASE_DEFAULT AS factura,
        MAX(LTRIM(RTRIM(d.v_DescripcionProducto))) COLLATE DATABASE_DEFAULT AS refDesc,
        MAX(CASE WHEN cl.i_IdTipoPersona = 2
                  AND cl.v_NroDocIdentificacion IS NOT NULL
                  AND LTRIM(RTRIM(cl.v_NroDocIdentificacion)) <> ''
                 THEN LTRIM(RTRIM(cl.v_NroDocIdentificacion)) END) COLLATE DATABASE_DEFAULT AS Ruc,
        MAX(cl.v_RazonSocial) COLLATE DATABASE_DEFAULT AS RazonSocial,
        ISNULL(MAX(CASE WHEN cl.i_IdTipoPersona = 2
                         AND cl.v_NroDocIdentificacion IS NOT NULL
                         AND LTRIM(RTRIM(cl.v_NroDocIdentificacion)) <> ''
                        THEN LTRIM(RTRIM(cl.v_NroDocIdentificacion)) END), '##PART##')
            COLLATE DATABASE_DEFAULT AS EmpKey,
        CAST(SUM(d.Neto) AS DECIMAL(18,2)) AS NetoVenta
    INTO #venta
    FROM conta.fn_Rentabilidad_IngresosDetalleEx(@Anio,@Mes,@IncluirCredito) d
    LEFT JOIN dbo.venta v   ON v.v_IdVenta = d.v_IdVenta
    LEFT JOIN dbo.cliente cl ON cl.v_IdCliente = v.v_IdCliente
    WHERE d.i_IdTipoCaja = 2
    GROUP BY d.v_IdVenta, d.v_CorrelativoDocumentoFin,
             d.v_SerieDocumento, d.v_CorrelativoDocumento;

    -- ---------------------------------------------------------------------
    -- 2) Cobrado / Saldo por venta (BRUTO, acumulado a hoy). Mismos filtros de
    --    validez que el motor de caja vivo (cd.i_Eliminado=0). Saldo desde
    --    cobranzapendiente (0 si no hay fila).
    -- ---------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#cob') IS NOT NULL DROP TABLE #cob;
    SELECT cd.v_IdVenta COLLATE DATABASE_DEFAULT AS v_IdVenta,
           CAST(SUM(cd.d_ImporteSoles) AS DECIMAL(18,2)) AS Cobrado
    INTO #cob
    FROM dbo.cobranzadetalle cd
    WHERE ISNULL(cd.i_Eliminado,0) = 0
    GROUP BY cd.v_IdVenta;

    IF OBJECT_ID('tempdb..#sal') IS NOT NULL DROP TABLE #sal;
    SELECT cp.v_IdVenta COLLATE DATABASE_DEFAULT AS v_IdVenta,
           CAST(SUM(cp.d_Saldo) AS DECIMAL(18,2)) AS Saldo
    INTO #sal
    FROM dbo.cobranzapendiente cp
    WHERE ISNULL(cp.i_Eliminado,0) = 0
    GROUP BY cp.v_IdVenta;

    -- ---------------------------------------------------------------------
    -- 3) TOKENIZADOR MULTI-TOKEN (bloque 2 del sp/10). Services en ventana +-15d,
    --    materializados en local (#svcbase) y partidos por '|' en #tok. El CASE de
    --    blindaje en CHARINDEX evita "Invalid length parameter".
    -- ---------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#svcbase') IS NOT NULL DROP TABLE #svcbase;
    SELECT
        s.v_ServiceId  COLLATE DATABASE_DEFAULT AS v_ServiceId,
        s.v_ProtocolId COLLATE DATABASE_DEFAULT AS v_ProtocolId,
        s.d_ServiceDate,
        LTRIM(RTRIM(s.v_ComprobantePago)) COLLATE DATABASE_DEFAULT AS cp
    INTO #svcbase
    FROM SigesoftDesarrollo_2.dbo.service s
    WHERE s.d_ServiceDate >= DATEADD(DAY,-15,@ini)
      AND s.d_ServiceDate <  DATEADD(DAY,15,@finEx)
      AND ISNULL(s.i_IsDeleted,0) = 0
      AND s.v_ComprobantePago IS NOT NULL
      AND LTRIM(RTRIM(s.v_ComprobantePago)) <> '';

    IF OBJECT_ID('tempdb..#tok') IS NOT NULL DROP TABLE #tok;
    SELECT
        b.v_ServiceId,
        b.v_ProtocolId,
        b.d_ServiceDate,
        LTRIM(RTRIM(SUBSTRING(b.cp, n.number,
            CASE WHEN CHARINDEX('|', b.cp + '|', CASE WHEN n.number < 1 THEN 1 ELSE n.number END) >= n.number
                 THEN CHARINDEX('|', b.cp + '|', CASE WHEN n.number < 1 THEN 1 ELSE n.number END) - n.number
                 ELSE 0 END)))
            COLLATE DATABASE_DEFAULT AS token
    INTO #tok
    FROM #svcbase b
    JOIN master.dbo.spt_values n
        ON n.type = 'P' AND n.number >= 1 AND n.number <= LEN(b.cp)
       AND (n.number = 1 OR SUBSTRING(b.cp, CASE WHEN n.number < 2 THEN 1 ELSE n.number-1 END, 1) = '|');

    -- ---------------------------------------------------------------------
    -- 4) PARES venta-service (Puente A boletas U Puente B EDP) -- bloque 4 del sp/10.
    --    SOLO para NumServicios; el dinero JAMAS sale de aqui.
    -- ---------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#pair') IS NOT NULL DROP TABLE #pair;
    -- Puente A: TODOS los services cuyo token = corrFin (sin dedup: se abre el paquete).
    SELECT DISTINCT o.v_IdVenta, sv.v_ServiceId
    INTO #pair
    FROM #venta o
    JOIN #tok sv ON sv.token = o.corrFin AND sv.token <> '';

    -- Puente B: factura -> liquidacion.v_NroFactura -> v_NroLiquidacion ->
    -- service.v_NroLiquidacion. Hasta 12 meses atras (los EDP se liquidan despues).
    INSERT INTO #pair (v_IdVenta, v_ServiceId)
    SELECT DISTINCT o.v_IdVenta, s.v_ServiceId COLLATE DATABASE_DEFAULT
    FROM #venta o
    JOIN SigesoftDesarrollo_2.dbo.liquidacion lq
        ON LTRIM(RTRIM(lq.v_NroFactura)) COLLATE DATABASE_DEFAULT = o.factura
    JOIN SigesoftDesarrollo_2.dbo.service s
        ON LTRIM(RTRIM(s.v_NroLiquidacion)) COLLATE DATABASE_DEFAULT
             = LTRIM(RTRIM(lq.v_NroLiquidacion))
       AND ISNULL(s.i_IsDeleted,0) = 0
       AND s.v_NroLiquidacion IS NOT NULL
       AND LTRIM(RTRIM(s.v_NroLiquidacion)) <> ''
       AND s.d_ServiceDate >= DATEADD(MONTH,-12,@ini)
    WHERE NOT EXISTS (SELECT 1 FROM #pair p
                      WHERE p.v_IdVenta = o.v_IdVenta
                        AND p.v_ServiceId = s.v_ServiceId COLLATE DATABASE_DEFAULT);

    -- NumServicios por empresa (EmpKey) = COUNT(DISTINCT service) de la union A U B.
    IF OBJECT_ID('tempdb..#num') IS NOT NULL DROP TABLE #num;
    SELECT o.EmpKey, COUNT(DISTINCT p.v_ServiceId) AS NumServicios
    INTO #num
    FROM #pair p
    JOIN #venta o ON o.v_IdVenta = p.v_IdVenta
    GROUP BY o.EmpKey;

    -- ---------------------------------------------------------------------
    -- 5) Agregado por EMPRESA (EmpKey). Cobrado/Saldo por venta (0..1 fila -> sin
    --    fan-out). Ruc/RazonSocial deterministas via MAX.
    -- ---------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#emp') IS NOT NULL DROP TABLE #emp;
    SELECT
        o.EmpKey,
        MAX(o.Ruc) AS Ruc,
        MAX(o.RazonSocial) AS RazonSocial,
        COUNT(DISTINCT o.v_IdVenta) AS NumFacturas,
        CAST(SUM(o.NetoVenta) AS DECIMAL(18,2)) AS IngresosNeto,
        CAST(SUM(ISNULL(c.Cobrado,0)) AS DECIMAL(18,2)) AS CobradoBruto,
        CAST(SUM(ISNULL(s.Saldo,0)) AS DECIMAL(18,2)) AS SaldoBruto
    INTO #emp
    FROM #venta o
    LEFT JOIN #cob c ON c.v_IdVenta = o.v_IdVenta
    LEFT JOIN #sal s ON s.v_IdVenta = o.v_IdVenta
    GROUP BY o.EmpKey;

    -- ---------------------------------------------------------------------
    -- RS1: empresas + fila PARTICULARES + fila TOTAL.
    -- Orden: EsTotal, EsSinEmpresa, IngresosNeto DESC (empresas -> PARTICULARES -> TOTAL).
    -- ---------------------------------------------------------------------
    ;WITH tot AS (
        SELECT SUM(NumFacturas) AS TF, SUM(IngresosNeto) AS TI,
               SUM(CobradoBruto) AS TC, SUM(SaldoBruto) AS TS
        FROM #emp
    ),
    totnum AS (
        SELECT COUNT(DISTINCT p.v_ServiceId) AS TN FROM #pair p
    ),
    body AS (
        SELECT
            CAST(e.Ruc AS VARCHAR(20)) AS Ruc,
            CASE WHEN e.EmpKey = '##PART##' THEN N'PARTICULARES / SIN EMPRESA'
                 ELSE CAST(ISNULL(e.RazonSocial, e.Ruc) AS NVARCHAR(200)) END AS Empresa,
            e.NumFacturas,
            ISNULL(n.NumServicios,0) AS NumServicios,
            e.IngresosNeto,
            e.CobradoBruto,
            e.SaldoBruto,
            CAST(CASE WHEN (e.CobradoBruto + e.SaldoBruto) = 0 THEN NULL
                      ELSE 100.0 * e.CobradoBruto / (e.CobradoBruto + e.SaldoBruto) END AS DECIMAL(9,2)) AS PorcCobrado,
            CAST(CASE WHEN ISNULL(n.NumServicios,0) = 0 AND e.IngresosNeto > 0 THEN 1 ELSE 0 END AS BIT) AS EsOtrosServicios,
            CAST(CASE WHEN e.EmpKey = '##PART##' THEN 1 ELSE 0 END AS BIT) AS EsSinEmpresa,
            CAST(0 AS BIT) AS EsTotal
        FROM #emp e
        LEFT JOIN #num n ON n.EmpKey = e.EmpKey
    )
    SELECT Ruc, Empresa, NumFacturas, NumServicios, IngresosNeto, CobradoBruto,
           SaldoBruto, PorcCobrado, EsOtrosServicios, EsSinEmpresa, EsTotal
    FROM body
    UNION ALL
    SELECT
        NULL, N'TOTAL', t.TF, tn.TN, t.TI, t.TC, t.TS,
        CAST(CASE WHEN (t.TC + t.TS) = 0 THEN NULL
                  ELSE 100.0 * t.TC / (t.TC + t.TS) END AS DECIMAL(9,2)),
        CAST(0 AS BIT), CAST(0 AS BIT), CAST(1 AS BIT)
    FROM tot t CROSS JOIN totnum tn
    ORDER BY EsTotal, EsSinEmpresa, IngresosNeto DESC;

    -- ---------------------------------------------------------------------
    -- RS2: diagnostico/auditoria (TOP 50 por monto).
    --   SIN_SERVICIOS_EMO: ventas juridicas sin par de servicio (LUMINA EDP + gaps
    --                      de digitacion del comprobante).
    --   SIN_EMPRESA: ventas particulares (sin RUC juridico).
    -- ---------------------------------------------------------------------
    SELECT TOP 50 g.Motivo, g.Ruc, g.Empresa, g.Referencia, g.MontoNeto
    FROM (
        SELECT 'SIN_SERVICIOS_EMO' AS Motivo,
               CAST(o.Ruc AS VARCHAR(20)) AS Ruc,
               CAST(o.RazonSocial AS NVARCHAR(200)) AS Empresa,
               (o.factura + ' | ' + ISNULL(o.refDesc,'')) AS Referencia,
               o.NetoVenta AS MontoNeto
        FROM #venta o
        WHERE o.Ruc IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM #pair p WHERE p.v_IdVenta = o.v_IdVenta)
        UNION ALL
        SELECT 'SIN_EMPRESA',
               NULL,
               N'PARTICULARES / SIN EMPRESA',
               (o.factura + ' | ' + ISNULL(o.refDesc,'')),
               o.NetoVenta
        FROM #venta o
        WHERE o.Ruc IS NULL
    ) g
    ORDER BY g.MontoNeto DESC;
END
GO

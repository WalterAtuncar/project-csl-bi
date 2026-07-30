-- =============================================================================
-- 10_rentabilidad_consultorio.sql
-- Rentabilidad por Consultorio (ASISTENCIAL vs SISOL vs SEGUROS).
--   REFORMADO 2026-07-19: la rama OCUPACIONAL sale de este SP -> se analiza por
--     EMPRESA CLIENTE en conta.sp_Rentabilidad_OcupacionalPorEmpresa (sp/17).
--   v3 2026-07-29: se agrega la unidad SEGUROS (tipocaja 5) como TERCERA card.
--     Universo pasa de tipocaja IN (1,3) a IN (1,3,5). Ramas ASISTENCIAL (3.1) y
--     SISOL (3.2) INTACTAS (regresion 0 diffs). Plan:
--     models-DB/docs/PLAN_RENTABILIDAD_CONSULTORIO_SEGUROS.md (hechos S1-S10, D1-D7).
-- Objetos del schema conta:
--   * conta.fn_Rentabilidad_IngresosDetalleEx  (iTVF, universo canonico a nivel linea) -- INTOCABLE
--   * conta.sp_Rentabilidad_PorConsultorio     (SP, 3 resultsets: RS1 detalle, RS2 diag, RS3 cuadre)
--
-- Universo IDENTICO a conta.fn_Rentabilidad_IngresosEx (4 filtros canonicos +
-- vd.i_Eliminado=0 + dh41 credito + fecha v.t_InsertaFecha + unidad via
-- tipocaja_clientetipo/tipocaja). Aqui SOLO tipocaja 1 (ASISTENCIAL), 3 (SISOL) y
-- 5 (SEGUROS). El dinero SIEMPRE sale de ventadetalle.d_Valor; Sigesoft solo aporta
-- dimension (consultorio 403).
--
-- Puentes venta <-> Sigesoft (SigesoftDesarrollo_2 = SOLO SELECT):
--   A (cabecera/boletas): venta.v_CorrelativoDocumentoFin = ALGUN token de
--       service.v_ComprobantePago (split multi-token por '|'), ventana +-15d.
--       Dedup rn=1 prefiriendo el token primario (posicion 1).
--   B (liquidacion, SOLO SEGUROS -- las F007 no registran comprobante en el service):
--       serie+'-'+correlativo (= #venta.factura) = liquidacion.v_NroFactura
--       (COLLATE DATABASE_DEFAULT, ISNULL(i_IsDeleted,0)=0). Dedup rn=1 por menor
--       v_LiquidacionId. Luego C2 lq.v_ServiceId directo -> service; C3 fallback
--       lq.v_NroLiquidacion -> service.v_NroLiquidacion. service -> protocol.i_Consultorio.
--
-- ASISTENCIAL (tipocaja=1): protocol.i_Consultorio -> grupo 403, con CUATRO capas
--   de rescate (determinista -> heuristica) sobre lo que va quedando '(SIN CLASIFICAR)':
--   Capa 1 Multi-token: Puente A contra TODOS los tokens (rescata comprobantes en
--          posicion 2+, p.ej. garantia bundleada en la liquidacion).
--   Capa 2 SIN_CONSULTORIO por protocolo: i_Consultorio NULL y (v_Procedencia='H'
--          o pr.v_Name LIKE 'SALA DE OPERACIONES%') -> HOSPITALIZACION.
--   Capa 3 Puente C por PACIENTE (solo -> HOSPITALIZACION): ventas aun SIN_SERVICE
--          cuyo MISMO paciente (venta.v_IdCliente -> cliente.v_NroDocIdentificacion
--          -> person.v_DocNumber -> service.v_PersonId) tiene service Procedencia='H'
--          en +-15d de la venta.
--   Capa 4 Heuristica por descripcion (ultima red): refDesc LIKE '%GARANT%' /
--          '%PAQUETE%' / '%HOSPITALIZA%' / '%HOSPITALAR%' -> HOSPITALIZACION.
--   Fuga rotulada 'NO SE ATENDIERON CON EL SISTEMA' (EsNoClasificado=1).
-- SISOL (tipocaja=3): NETO PLENO (no el 30% clinica). Mismo Puente A + dedup rn=1 +
--   catalogo 403, SIN las capas de rescate de hospitalizacion (para SISOL basta el
--   Puente A + dedup). Fuga rotulada 'SIN ATENCION ASOCIADA' (EsNoClasificado=1).
-- SEGUROS (tipocaja=5): NETO PLENO (D1, PorcClinica=100 -- sin participacion tipo
--   SISOL). Cascada de atribucion (D2/D7), SIN capas heuristicas H (rescatan 0.00):
--     C1 Puente A (comprobante -> service, dedup rn=1) clasifica las B004 (copagos).
--     C2 Puente B directo (para lo NO clasificado por A): liquidacion.v_ServiceId.
--     C3 Puente B hop (si lq.v_ServiceId NULL): lq.v_NroLiquidacion -> service.v_NroLiquidacion.
--   Buckets (D3): service con consultorio -> nombre 403 ; service (por A o B) SIN
--   i_Consultorio -> 'CONVENIO (SIN CONSULTORIO)' (EsNoClasificado=0, atribucion a
--   nivel unidad) ; sin service/liq -> 'SIN ATENCION ASOCIADA' (EsNoClasificado=1).
--
-- Egresos (v2, fix D5 + v3 CC-SEG): particionados por centro de costo resuelto por
--   v_Codigo (CC-ASIS -> ASISTENCIAL ; CC-SISOL -> SISOL ; CC-SEG -> SEGUROS).
--   Cualquier otro centro (o egreso manual con consultorio) queda EXCLUIDO, por diseno.
--   Estado HOY: conta.egreso = 0 filas -> #egr vacio (Egresos=0); CC-SEG es future-proof.
-- RS3 (cuadre): reconcilia con Rentabilidad General leyendo % SISOL y otras unidades
--   EN VIVO desde fn_Rentabilidad_IngresosEx. SegurosNeto = SUM #det SEGUROS;
--   OtrasUnidadesNeto = i_IdTipoCaja NOT IN (1,2,3,5) (queda ~ FARMACIA; MTC=0);
--   Ocupacional = SUM iTVF Detalle tipocaja=2. TotalGeneral invariante al centavo
--   (SegurosNeto solo se separa de Otras; la suma total no cambia).
-- SQL Server 2012 estricto (LTRIM/RTRIM, CHARINDEX, ROW_NUMBER, SUM() OVER; sin
-- STRING_SPLIT/TRIM/CREATE OR ALTER). Cross-DB texto con COLLATE DATABASE_DEFAULT.
-- Tokenizador blindado (CASE anti "Invalid length"); materializado UNA vez en #tok.
-- =============================================================================

IF OBJECT_ID('conta.sp_Rentabilidad_PorConsultorio','P') IS NOT NULL
    DROP PROCEDURE conta.sp_Rentabilidad_PorConsultorio;
GO
IF OBJECT_ID('conta.fn_Rentabilidad_IngresosDetalleEx','IF') IS NOT NULL
    DROP FUNCTION conta.fn_Rentabilidad_IngresosDetalleEx;
GO
-- -----------------------------------------------------------------------------
-- iTVF: universo canonico a nivel LINEA (misma logica que fn_Rentabilidad_IngresosEx,
-- pero devolviendo la linea con claves de venta para los puentes).
-- SUM(Neto) por i_IdTipoCaja reproduce al centavo NetoSinIGV de la fn agregada.
-- INTOCABLE: devuelve TODAS las tipocajas (el SP filtra). Consumidores: este SP y
-- conta.sp_Rentabilidad_OcupacionalPorEmpresa (sp/17).
-- -----------------------------------------------------------------------------
CREATE FUNCTION conta.fn_Rentabilidad_IngresosDetalleEx
    (@Anio SMALLINT, @Mes TINYINT, @IncluirCredito BIT)
RETURNS TABLE
AS
RETURN (
    SELECT
        v.v_IdVenta,
        tcct.i_IdTipoCaja,
        ISNULL(tc.v_NombreTipoCaja,'SIN UNIDAD') AS Unidad,
        v.v_SerieDocumento,
        v.v_CorrelativoDocumento,
        v.v_CorrelativoDocumentoFin,
        vd.v_IdVentaDetalle,
        vd.v_DescripcionProducto,
        vd.d_Valor AS Neto
    FROM dbo.venta v
    JOIN dbo.ventadetalle vd
        ON vd.v_IdVenta = v.v_IdVenta AND ISNULL(vd.i_Eliminado,0) = 0
    LEFT JOIN dbo.tipocaja_clientetipo tcct
        ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
    LEFT JOIN dbo.tipocaja tc
        ON tc.i_IdTipoCaja = tcct.i_IdTipoCaja
    LEFT JOIN dbo.datahierarchy dh41
        ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago
    WHERE ISNULL(v.i_Eliminado,0) = 0
      AND v.t_InsertaFecha >= DATEFROMPARTS(@Anio,@Mes,1)
      AND v.t_InsertaFecha <  DATEADD(MONTH,1,DATEFROMPARTS(@Anio,@Mes,1))
      AND v.i_ClienteEsAgente IS NOT NULL
      AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3,4))
      AND ISNULL(v.v_SerieDocumento,'') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')
      AND (@IncluirCredito = 1 OR ISNULL(dh41.v_Value1,'') <> 'CREDITO')
);
GO
-- -----------------------------------------------------------------------------
-- SP: Rentabilidad por Consultorio (ASISTENCIAL vs SISOL vs SEGUROS). 3 resultsets.
-- -----------------------------------------------------------------------------
CREATE PROCEDURE conta.sp_Rentabilidad_PorConsultorio
    @Anio           SMALLINT,
    @Mes            TINYINT,
    @IncluirCredito BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ini   DATE = DATEFROMPARTS(@Anio,@Mes,1);
    DECLARE @finEx DATE = DATEADD(MONTH,1,DATEFROMPARTS(@Anio,@Mes,1));

    -- Centros de costo resueltos por v_Codigo (NUNCA ids hardcodeados).
    DECLARE @ccAsis  INT = (SELECT i_IdCentroCosto FROM conta.centro_costo WHERE v_Codigo = 'CC-ASIS');
    DECLARE @ccSisol INT = (SELECT i_IdCentroCosto FROM conta.centro_costo WHERE v_Codigo = 'CC-SISOL');
    DECLARE @ccSeg   INT = (SELECT i_IdCentroCosto FROM conta.centro_costo WHERE v_Codigo = 'CC-SEG');

    -- PERF (2026-07-29): las iTVF INTOCABLES fn_Rentabilidad_IngresosEx (agregada) y
    -- fn_Rentabilidad_IngresosDetalleEx (linea) se evaluaban 5 veces en total (1 en el
    -- build de #venta + 1 en @ocupNeto para IngresosDetalleEx; 3 en RS3 para IngresosEx)
    -- => 5 escaneos de dbo.venta. Se MATERIALIZA la salida de cada iTVF UNA sola vez (las
    -- funciones NO se alteran) y todos los consumidores derivan de los #temp. Resultado
    -- identico (misma salida, mismos casts); 2 escaneos en vez de 5.
    IF OBJECT_ID('tempdb..#ingEx')  IS NOT NULL DROP TABLE #ingEx;
    SELECT * INTO #ingEx  FROM conta.fn_Rentabilidad_IngresosEx(@Anio,@Mes,@IncluirCredito);
    IF OBJECT_ID('tempdb..#detAll') IS NOT NULL DROP TABLE #detAll;
    SELECT * INTO #detAll FROM conta.fn_Rentabilidad_IngresosDetalleEx(@Anio,@Mes,@IncluirCredito);

    -- ---------------------------------------------------------------------
    -- 1) Universo por VENTA (ASISTENCIAL=1, SISOL=3 y SEGUROS=5) desde la iTVF.
    --    NetoVenta = SUM(vd.d_Valor). Claves de puente por venta. v_IdCliente y
    --    FechaVenta (t_InsertaFecha) se traen de dbo.venta para el Puente C (Capa 3).
    -- ---------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#venta') IS NOT NULL DROP TABLE #venta;
    SELECT
        d.v_IdVenta COLLATE DATABASE_DEFAULT AS v_IdVenta,
        d.i_IdTipoCaja,
        LTRIM(RTRIM(d.v_CorrelativoDocumentoFin)) COLLATE DATABASE_DEFAULT AS corrFin,
        (LTRIM(RTRIM(d.v_SerieDocumento)) + '-' + LTRIM(RTRIM(d.v_CorrelativoDocumento)))
            COLLATE DATABASE_DEFAULT AS factura,
        MAX(LTRIM(RTRIM(d.v_DescripcionProducto))) COLLATE DATABASE_DEFAULT AS refDesc,
        MAX(v2.v_IdCliente COLLATE DATABASE_DEFAULT) AS v_IdCliente,
        MAX(v2.t_InsertaFecha) AS FechaVenta,
        CAST(SUM(d.Neto) AS DECIMAL(18,2)) AS NetoVenta
    INTO #venta
    FROM #detAll d
    LEFT JOIN dbo.venta v2 ON v2.v_IdVenta = d.v_IdVenta
    WHERE d.i_IdTipoCaja IN (1,3,5)
    GROUP BY d.v_IdVenta, d.i_IdTipoCaja, d.v_CorrelativoDocumentoFin,
             d.v_SerieDocumento, d.v_CorrelativoDocumento;

    -- ---------------------------------------------------------------------
    -- 2) TOKENIZADOR MULTI-TOKEN (Capa 1). Services en ventana +-15d.
    --    Paso 2a: fetch remoto UNA vez a un temp LOCAL (#svcbase) -> evita que el
    --    cross join con spt_values arrastre un plan remoto inestable (medido:
    --    tokenizar directo contra Sigesoft oscilaba 1.8-3.6s; con #svcbase es ~0.1s).
    --    Paso 2b: se parte v_ComprobantePago por '|' y se materializa en #tok.
    --    El CASE de blindaje en CHARINDEX es OBLIGATORIO: sin el, SUBSTRING recibe
    --    longitud negativa y explota con "Invalid length parameter" segun el plan.
    --    TokPrimario=1 marca el token en posicion 1 (arranque) -> se prefiere en dedup.
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
        CAST(CASE WHEN n.number = 1 THEN 1 ELSE 0 END AS TINYINT) AS TokPrimario,
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
    -- 3) CLASIFICACION POR CONSULTORIO (Puente A multi-token con dedup rn=1).
    --    Se prefiere el token primario (TokPrimario DESC) para NO mover a los ya
    --    clasificados. EsSalaOps: protocolo de sala de operaciones (Capa 2 ASIST).
    -- ---------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#svcA') IS NOT NULL DROP TABLE #svcA;
    SELECT token, i_Consultorio, v_Procedencia, EsSalaOps
    INTO #svcA
    FROM (
        SELECT tk.token,
               pr.i_Consultorio,
               LTRIM(RTRIM(pr.v_Procedencia)) COLLATE DATABASE_DEFAULT AS v_Procedencia,
               CAST(CASE WHEN pr.v_Name LIKE 'SALA DE OPERACIONES%' THEN 1 ELSE 0 END AS TINYINT) AS EsSalaOps,
               ROW_NUMBER() OVER (PARTITION BY tk.token
                                  ORDER BY tk.TokPrimario DESC, tk.d_ServiceDate DESC, tk.v_ServiceId DESC) AS rn
        FROM #tok tk
        JOIN SigesoftDesarrollo_2.dbo.protocol pr
             ON pr.v_ProtocolId = tk.v_ProtocolId
        WHERE tk.token <> ''
    ) z
    WHERE z.rn = 1;

    -- 3.1) RAMA ASISTENCIAL (tipocaja=1): clasificacion base (Capa 1 + rescate H
    --      existente + Capa 2 Sala de Operaciones), luego Capa 3 y Capa 4.
    IF OBJECT_ID('tempdb..#asis') IS NOT NULL DROP TABLE #asis;
    SELECT
        v.v_IdVenta,
        v.NetoVenta,
        v.factura,
        v.refDesc,
        v.v_IdCliente,
        v.FechaVenta,
        CASE WHEN sv.token IS NULL THEN '(SIN CLASIFICAR)'
             WHEN sv.i_Consultorio IS NULL AND (sv.v_Procedencia = 'H' OR sv.EsSalaOps = 1) THEN 'HOSPITALIZACION'
             WHEN sv.i_Consultorio IS NULL THEN '(SIN CLASIFICAR)'
             ELSE ISNULL(sp.v_Value1,'(SIN CLASIFICAR)')
        END COLLATE DATABASE_DEFAULT AS Consultorio,
        CASE WHEN sv.token IS NULL THEN 'SIN_SERVICE' ELSE 'SIN_CONSULTORIO' END AS MotivoRaw
    INTO #asis
    FROM #venta v
    LEFT JOIN #svcA sv
        ON sv.token = v.corrFin AND v.corrFin <> ''
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp
        ON sp.i_GroupId = 403 AND sp.i_ParameterId = sv.i_Consultorio
    WHERE v.i_IdTipoCaja = 1;

    -- Capa 3 (Puente C por PACIENTE, SOLO -> HOSPITALIZACION): ventas aun SIN_SERVICE
    -- cuyo mismo paciente (DNI via cliente->person) tiene un service Procedencia='H'
    -- en +-15d de la venta. Como el unico destino es HOSPITALIZACION, EXISTS equivale
    -- al dedup 'service H mas cercano' del plan. NO se toca la fuga SIN_CONSULTORIO
    -- (proc 'E', inmaterial) ni MotivoRaw (RS2 conserva su dominio).
    UPDATE a
       SET a.Consultorio = 'HOSPITALIZACION'
    FROM #asis a
    WHERE a.Consultorio = '(SIN CLASIFICAR)'
      AND a.MotivoRaw   = 'SIN_SERVICE'
      AND a.v_IdCliente IS NOT NULL
      AND EXISTS (
          SELECT 1
          FROM dbo.cliente cl
          JOIN SigesoftDesarrollo_2.dbo.person p
               ON p.v_DocNumber = cl.v_NroDocIdentificacion COLLATE DATABASE_DEFAULT
          JOIN SigesoftDesarrollo_2.dbo.service s
               ON s.v_PersonId = p.v_PersonId
              AND ISNULL(s.i_IsDeleted,0) = 0
          JOIN SigesoftDesarrollo_2.dbo.protocol pr
               ON pr.v_ProtocolId = s.v_ProtocolId
              AND LTRIM(RTRIM(pr.v_Procedencia)) = 'H'
          WHERE cl.v_IdCliente = a.v_IdCliente
            AND cl.v_NroDocIdentificacion IS NOT NULL
            AND LTRIM(RTRIM(cl.v_NroDocIdentificacion)) <> ''
            AND s.d_ServiceDate >= DATEADD(DAY,-15,a.FechaVenta)
            AND s.d_ServiceDate <  DATEADD(DAY, 16,a.FechaVenta)
      );

    -- Capa 4 (heuristica por descripcion, ultima red) -> HOSPITALIZACION.
    UPDATE a
       SET a.Consultorio = 'HOSPITALIZACION'
    FROM #asis a
    WHERE a.Consultorio = '(SIN CLASIFICAR)'
      AND ( UPPER(a.refDesc) LIKE '%GARANT%'
         OR UPPER(a.refDesc) LIKE '%PAQUETE%'
         OR UPPER(a.refDesc) LIKE '%HOSPITALIZA%'
         OR UPPER(a.refDesc) LIKE '%HOSPITALAR%' );

    -- 3.2) RAMA SISOL (tipocaja=3): mismo Puente A + dedup rn=1 + catalogo 403,
    --      SIN capas de rescate de hospitalizacion (para SISOL basta Puente A).
    --      Toda fuga (sin token o sin consultorio) cae a '(SIN CLASIFICAR)'.
    IF OBJECT_ID('tempdb..#sis') IS NOT NULL DROP TABLE #sis;
    SELECT
        v.v_IdVenta,
        v.NetoVenta,
        v.factura,
        v.refDesc,
        CASE WHEN sv.token IS NULL THEN '(SIN CLASIFICAR)'
             WHEN sv.i_Consultorio IS NULL THEN '(SIN CLASIFICAR)'
             ELSE ISNULL(sp.v_Value1,'(SIN CLASIFICAR)')
        END COLLATE DATABASE_DEFAULT AS Consultorio,
        CASE WHEN sv.token IS NULL THEN 'SIN_SERVICE' ELSE 'SIN_CONSULTORIO' END AS MotivoRaw
    INTO #sis
    FROM #venta v
    LEFT JOIN #svcA sv
        ON sv.token = v.corrFin AND v.corrFin <> ''
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp
        ON sp.i_GroupId = 403 AND sp.i_ParameterId = sv.i_Consultorio
    WHERE v.i_IdTipoCaja = 3;

    -- 3.3) RAMA SEGUROS (tipocaja=5): NETO PLENO (D1). Cascada C1->C2->C3 (D2/D7),
    --      SIN capas heuristicas H (rescatan 0.00). Estado por venta: i_Consultorio
    --      resuelto (int, NULL si convenio sin consultorio) + TieneServicio (A o B).
    IF OBJECT_ID('tempdb..#seg') IS NOT NULL DROP TABLE #seg;
    SELECT
        v.v_IdVenta,
        v.NetoVenta,
        v.corrFin,
        v.factura,
        v.refDesc,
        CAST(NULL AS INT) AS i_Consultorio,
        CAST(0 AS BIT)    AS TieneServicio
    INTO #seg
    FROM #venta v
    WHERE v.i_IdTipoCaja = 5;

    -- C1 Puente A: comprobante (corrFin) -> service (dedup rn=1 ya en #svcA).
    -- Clasifica las boletas B004 (copagos). i_Consultorio puede quedar NULL (convenio).
    UPDATE s
       SET s.i_Consultorio = sv.i_Consultorio,
           s.TieneServicio = 1
    FROM #seg s
    JOIN #svcA sv ON sv.token = s.corrFin AND s.corrFin <> '';

    -- C2/C3 Puente B (liquidacion), SOLO para lo NO clasificado por A. Dedup rn=1
    -- por menor v_LiquidacionId si una factura tiene >1 liquidacion viva (determinista).
    IF OBJECT_ID('tempdb..#segLq') IS NOT NULL DROP TABLE #segLq;
    SELECT z.v_IdVenta, z.v_ServiceId, z.v_NroLiquidacion
    INTO #segLq
    FROM (
        SELECT s.v_IdVenta,
               lq.v_ServiceId      COLLATE DATABASE_DEFAULT AS v_ServiceId,
               lq.v_NroLiquidacion COLLATE DATABASE_DEFAULT AS v_NroLiquidacion,
               ROW_NUMBER() OVER (PARTITION BY s.v_IdVenta
                                  ORDER BY lq.v_LiquidacionId ASC) AS rn
        FROM #seg s
        JOIN SigesoftDesarrollo_2.dbo.liquidacion lq
            ON LTRIM(RTRIM(lq.v_NroFactura)) COLLATE DATABASE_DEFAULT = s.factura
           AND ISNULL(lq.i_IsDeleted,0) = 0
        WHERE s.TieneServicio = 0
    ) z
    WHERE z.rn = 1;

    -- Resolver service -> protocol.i_Consultorio: C2 (lq.v_ServiceId directo)
    -- preferente ; C3 (lq.v_NroLiquidacion -> service.v_NroLiquidacion) como
    -- fallback si lq.v_ServiceId NULL. dedup rn=1 (menor v_ServiceId).
    IF OBJECT_ID('tempdb..#segB') IS NOT NULL DROP TABLE #segB;
    SELECT z.v_IdVenta, z.i_Consultorio
    INTO #segB
    FROM (
        SELECT lq.v_IdVenta,
               pr.i_Consultorio,
               ROW_NUMBER() OVER (PARTITION BY lq.v_IdVenta
                                  ORDER BY CASE WHEN lq.v_ServiceId IS NOT NULL THEN 0 ELSE 1 END,
                                           s.v_ServiceId) AS rn
        FROM #segLq lq
        JOIN SigesoftDesarrollo_2.dbo.service s
            ON ISNULL(s.i_IsDeleted,0) = 0
           AND (
                (lq.v_ServiceId IS NOT NULL
                 AND s.v_ServiceId COLLATE DATABASE_DEFAULT = lq.v_ServiceId)
             OR (lq.v_ServiceId IS NULL
                 AND lq.v_NroLiquidacion IS NOT NULL
                 AND LTRIM(RTRIM(lq.v_NroLiquidacion)) <> ''
                 AND s.v_NroLiquidacion COLLATE DATABASE_DEFAULT = lq.v_NroLiquidacion)
               )
        LEFT JOIN SigesoftDesarrollo_2.dbo.protocol pr
            ON pr.v_ProtocolId = s.v_ProtocolId
    ) z
    WHERE z.rn = 1;

    -- Adosar la resolucion B a #seg (solo lo que A no clasifico).
    UPDATE s
       SET s.i_Consultorio = b.i_Consultorio,
           s.TieneServicio = 1
    FROM #seg s
    JOIN #segB b ON b.v_IdVenta = s.v_IdVenta
    WHERE s.TieneServicio = 0;

    -- ---------------------------------------------------------------------
    -- 4) Ensamblado RS1: detalle (Grupo, Consultorio, Ingresos, EsNoClasificado).
    --    ASISTENCIAL, SISOL y SEGUROS sin prorrateo (sumas exactas de 2 decimales).
    -- ---------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#det') IS NOT NULL DROP TABLE #det;
    CREATE TABLE #det (
        Grupo           NVARCHAR(20)  NOT NULL,
        Consultorio     NVARCHAR(100) NOT NULL,
        Ingresos        DECIMAL(18,2) NOT NULL,
        EsNoClasificado BIT           NOT NULL,
        Egresos         DECIMAL(18,2) NOT NULL DEFAULT (0)
    );

    -- ASISTENCIAL (NETO pleno del grupo asistencial).
    INSERT INTO #det (Grupo, Consultorio, Ingresos, EsNoClasificado)
    SELECT 'ASISTENCIAL', a.Consultorio, CAST(SUM(a.NetoVenta) AS DECIMAL(18,2)),
           CASE WHEN a.Consultorio = '(SIN CLASIFICAR)' THEN 1 ELSE 0 END
    FROM #asis a
    GROUP BY a.Consultorio;

    -- SISOL (NETO PLENO -- D1: no el 30% clinica; la participacion va en RS3).
    INSERT INTO #det (Grupo, Consultorio, Ingresos, EsNoClasificado)
    SELECT 'SISOL', s.Consultorio, CAST(SUM(s.NetoVenta) AS DECIMAL(18,2)),
           CASE WHEN s.Consultorio = '(SIN CLASIFICAR)' THEN 1 ELSE 0 END
    FROM #sis s
    GROUP BY s.Consultorio;

    -- SEGUROS (NETO PLENO -- D1). Buckets D3 desde #seg: service con consultorio ->
    -- nombre 403 ; service sin consultorio -> 'CONVENIO (SIN CONSULTORIO)'
    -- (EsNoClasificado=0) ; sin service/liq -> 'SIN ATENCION ASOCIADA' (EsNoClasificado=1).
    INSERT INTO #det (Grupo, Consultorio, Ingresos, EsNoClasificado)
    SELECT 'SEGUROS', q.Consultorio, CAST(SUM(q.NetoVenta) AS DECIMAL(18,2)), q.EsNoClasificado
    FROM (
        SELECT
            s.NetoVenta,
            CASE WHEN s.TieneServicio = 1 AND s.i_Consultorio IS NOT NULL
                   THEN ISNULL(sp.v_Value1 COLLATE DATABASE_DEFAULT,
                               N'CONSULTORIO ' + CAST(s.i_Consultorio AS NVARCHAR(10)))
                 WHEN s.TieneServicio = 1
                   THEN N'CONVENIO (SIN CONSULTORIO)'
                 ELSE N'SIN ATENCIÓN ASOCIADA'
            END COLLATE DATABASE_DEFAULT AS Consultorio,
            CAST(CASE WHEN s.TieneServicio = 0 THEN 1 ELSE 0 END AS BIT) AS EsNoClasificado
        FROM #seg s
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp
            ON sp.i_GroupId = 403 AND sp.i_ParameterId = s.i_Consultorio
    ) q
    GROUP BY q.Consultorio, q.EsNoClasificado;

    -- ---------------------------------------------------------------------
    -- 4b) EGRESOS por consultorio, PARTICIONADOS por centro de costo (fix D5 + CC-SEG).
    --     Devengado (t_FechaDocumento), <> ANULADO, con consultorio. Nombre = 403
    --     (COLLATE DATABASE_DEFAULT, fallback 'CONSULTORIO '+id). Se filtra a los
    --     centros CC-ASIS/CC-SISOL/CC-SEG: filas CC-ASIS alimentan ASISTENCIAL,
    --     CC-SISOL alimentan SISOL, CC-SEG alimentan SEGUROS. Cualquier otro centro
    --     queda EXCLUIDO. Estado HOY: 0 egresos con i_IdConsultorio -> #egr vacio.
    -- ---------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#egr') IS NOT NULL DROP TABLE #egr;
    SELECT
        e.i_IdCentroCosto,
        ISNULL(sp403.v_Value1 COLLATE DATABASE_DEFAULT,
               'CONSULTORIO ' + CAST(e.i_IdConsultorio AS VARCHAR(10))) AS Consultorio,
        CAST(SUM(e.d_MontoNeto) AS DECIMAL(18,2)) AS Egresos
    INTO #egr
    FROM conta.egreso e
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp403
        ON sp403.i_GroupId = 403 AND sp403.i_ParameterId = e.i_IdConsultorio
    WHERE e.i_IdConsultorio IS NOT NULL
      AND e.v_Estado <> 'ANULADO'
      AND e.t_FechaDocumento >= @ini
      AND e.t_FechaDocumento <  @finEx
      AND e.i_IdCentroCosto IN (@ccAsis, @ccSisol, @ccSeg)
    GROUP BY e.i_IdCentroCosto,
             ISNULL(sp403.v_Value1 COLLATE DATABASE_DEFAULT,
                    'CONSULTORIO ' + CAST(e.i_IdConsultorio AS VARCHAR(10)));

    -- Adosar egresos CC-ASIS a los consultorios ASISTENCIALES existentes.
    UPDATE d
       SET d.Egresos = g.Egresos
    FROM #det d
    JOIN #egr g ON g.Consultorio = d.Consultorio AND g.i_IdCentroCosto = @ccAsis
    WHERE d.Grupo = 'ASISTENCIAL';

    -- Adosar egresos CC-SISOL a los consultorios SISOL existentes.
    UPDATE d
       SET d.Egresos = g.Egresos
    FROM #det d
    JOIN #egr g ON g.Consultorio = d.Consultorio AND g.i_IdCentroCosto = @ccSisol
    WHERE d.Grupo = 'SISOL';

    -- Adosar egresos CC-SEG a los consultorios SEGUROS existentes.
    UPDATE d
       SET d.Egresos = g.Egresos
    FROM #det d
    JOIN #egr g ON g.Consultorio = d.Consultorio AND g.i_IdCentroCosto = @ccSeg
    WHERE d.Grupo = 'SEGUROS';

    -- Consultorios SOLO-EGRESO ASISTENCIAL (egreso sin ingreso en el mes).
    INSERT INTO #det (Grupo, Consultorio, Ingresos, EsNoClasificado, Egresos)
    SELECT 'ASISTENCIAL', g.Consultorio, 0, 0, g.Egresos
    FROM #egr g
    WHERE g.i_IdCentroCosto = @ccAsis
      AND NOT EXISTS (SELECT 1 FROM #det d WHERE d.Grupo = 'ASISTENCIAL' AND d.Consultorio = g.Consultorio);

    -- Consultorios SOLO-EGRESO SISOL (egreso sin ingreso en el mes).
    INSERT INTO #det (Grupo, Consultorio, Ingresos, EsNoClasificado, Egresos)
    SELECT 'SISOL', g.Consultorio, 0, 0, g.Egresos
    FROM #egr g
    WHERE g.i_IdCentroCosto = @ccSisol
      AND NOT EXISTS (SELECT 1 FROM #det d WHERE d.Grupo = 'SISOL' AND d.Consultorio = g.Consultorio);

    -- Consultorios SOLO-EGRESO SEGUROS (egreso sin ingreso en el mes).
    INSERT INTO #det (Grupo, Consultorio, Ingresos, EsNoClasificado, Egresos)
    SELECT 'SEGUROS', g.Consultorio, 0, 0, g.Egresos
    FROM #egr g
    WHERE g.i_IdCentroCosto = @ccSeg
      AND NOT EXISTS (SELECT 1 FROM #det d WHERE d.Grupo = 'SEGUROS' AND d.Consultorio = g.Consultorio);

    -- ---------------------------------------------------------------------
    -- RS1 con % del grupo y filas TOTAL por grupo.
    -- ROTULO especifico por grupo SOLO para la fila fugada (EsNoClasificado=1):
    --   ASISTENCIAL -> 'NO SE ATENDIERON CON EL SISTEMA'
    --   SISOL       -> 'SIN ATENCION ASOCIADA' (con tilde en la O)
    --   SEGUROS     -> 'SIN ATENCION ASOCIADA' (ya rotulada en #det -> ELSE)
    -- Solo cambia la ETIQUETA mostrada; monto, %, EsNoClasificado=1 (ambar en el
    -- front), shape y ORDEN quedan identicos -> se ordena por ConsultorioOrd (rotulo
    -- interno crudo '(SIN CLASIFICAR)'), no por la etiqueta mostrada.
    -- RS1 lleva Egresos y Resultado (=Ingresos-Egresos) AL FINAL. PorcDelGrupo (sobre
    -- Ingresos) NO cambia; los TOTALes suman Ingresos y Egresos. Filtro relajado a
    -- (Ingresos<>0 OR Egresos<>0) para no perder consultorios solo-egreso.
    -- ---------------------------------------------------------------------
    ;WITH tot AS (
        SELECT Grupo, SUM(Ingresos) AS GT, SUM(Egresos) AS GE FROM #det GROUP BY Grupo
    ),
    rs1 AS (
        SELECT
            d.Grupo,
            CASE WHEN d.EsNoClasificado = 1 AND d.Grupo = 'ASISTENCIAL' THEN N'NO SE ATENDIERON CON EL SISTEMA'
                 WHEN d.EsNoClasificado = 1 AND d.Grupo = 'SISOL'       THEN N'SIN ATENCIÓN ASOCIADA'
                 ELSE d.Consultorio
            END AS Consultorio,
            d.Consultorio AS ConsultorioOrd,
            d.Ingresos,
            CAST(CASE WHEN t.GT = 0 THEN 0 ELSE 100.0 * d.Ingresos / t.GT END AS DECIMAL(9,2)) AS PorcDelGrupo,
            d.EsNoClasificado,
            CAST(0 AS BIT) AS EsTotal,
            d.Egresos,
            CAST(d.Ingresos - d.Egresos AS DECIMAL(18,2)) AS Resultado
        FROM #det d
        JOIN tot t ON t.Grupo = d.Grupo
        WHERE d.Ingresos <> 0 OR d.Egresos <> 0
        UNION ALL
        SELECT
            t.Grupo,
            'TOTAL',
            'TOTAL',
            t.GT,
            CAST(100.00 AS DECIMAL(9,2)),
            CAST(0 AS BIT),
            CAST(1 AS BIT),
            t.GE,
            CAST(t.GT - t.GE AS DECIMAL(18,2))
        FROM tot t
    )
    SELECT Grupo, Consultorio, Ingresos, PorcDelGrupo, EsNoClasificado, EsTotal, Egresos, Resultado
    FROM rs1
    ORDER BY Grupo, EsTotal, Ingresos DESC, ConsultorioOrd;

    -- ---------------------------------------------------------------------
    -- RS2: diagnostico de la fuga (TOP 50 por monto).
    --   ASISTENCIAL -> SIN_SERVICE / SIN_CONSULTORIO ; SISOL -> SIN_SERVICE (/ SIN_CONSULTORIO).
    --   SEGUROS -> SIN_SERVICE (ventas sin service ni liquidacion; p.ej. F004 residual).
    -- ---------------------------------------------------------------------
    SELECT TOP 50 g.Grupo, g.Motivo, g.Referencia, g.Monto
    FROM (
        SELECT 'ASISTENCIAL' AS Grupo,
               a.MotivoRaw AS Motivo,
               (a.factura + ' | ' + ISNULL(a.refDesc,'')) AS Referencia,
               a.NetoVenta AS Monto
        FROM #asis a
        WHERE a.Consultorio = '(SIN CLASIFICAR)'
        UNION ALL
        SELECT 'SISOL',
               s.MotivoRaw,
               (s.factura + ' | ' + ISNULL(s.refDesc,'')),
               s.NetoVenta
        FROM #sis s
        WHERE s.Consultorio = '(SIN CLASIFICAR)'
        UNION ALL
        SELECT 'SEGUROS',
               'SIN_SERVICE',
               (s.factura + ' | ' + ISNULL(s.refDesc,'')),
               s.NetoVenta
        FROM #seg s
        WHERE s.TieneServicio = 0
    ) g
    ORDER BY g.Monto DESC;

    -- ---------------------------------------------------------------------
    -- RS3: CUADRE con Rentabilidad General (una fila). Todo EN VIVO:
    --   Asistencial/SisolNetoPleno = totales de RS1 (#det). SisolPorcClinica,
    --   SisolParticipacionClinica y OtrasUnidadesNeto desde fn_Rentabilidad_IngresosEx
    --   (para reconciliar al centavo con General, sin recalcular el % a mano).
    --   SegurosNeto = SUM #det SEGUROS (neto pleno, PorcClinica=100 -> = fn tipocaja 5).
    --   OtrasUnidadesNeto = fn NOT IN (1,2,3,5) (queda ~ FARMACIA; MTC=0).
    --   OcupacionalNeto = SUM iTVF Detalle tipocaja=2 (mismo calculo que sp/17).
    --   TotalGeneral invariante: SegurosNeto solo se separa de Otras, la suma no cambia.
    -- ---------------------------------------------------------------------
    DECLARE @asisNeto DECIMAL(18,2) =
        ISNULL((SELECT SUM(Ingresos) FROM #det WHERE Grupo = 'ASISTENCIAL'),0);
    DECLARE @sisolPleno DECIMAL(18,2) =
        ISNULL((SELECT SUM(Ingresos) FROM #det WHERE Grupo = 'SISOL'),0);
    DECLARE @segNeto DECIMAL(18,2) =
        ISNULL((SELECT SUM(Ingresos) FROM #det WHERE Grupo = 'SEGUROS'),0);
    DECLARE @sisolPart DECIMAL(18,2) =
        ISNULL((SELECT SUM(NetoRentabilidad) FROM #ingEx WHERE i_IdTipoCaja = 3),0);
    DECLARE @sisolPorc DECIMAL(5,2) =
        ISNULL((SELECT TOP 1 PorcClinica FROM #ingEx WHERE i_IdTipoCaja = 3),
               ISNULL((SELECT TOP 1 d_PorcClinica FROM conta.sisol_participacion
                       WHERE t_VigenciaDesde <= @ini AND (t_VigenciaHasta IS NULL OR t_VigenciaHasta >= @ini)
                       ORDER BY t_VigenciaDesde DESC), 100));
    DECLARE @otrasNeto DECIMAL(18,2) =
        ISNULL((SELECT SUM(NetoRentabilidad) FROM #ingEx WHERE i_IdTipoCaja NOT IN (1,2,3,5)),0);
    DECLARE @ocupNeto DECIMAL(18,2) =
        ISNULL((SELECT SUM(x.NetoVenta) FROM (
                    SELECT CAST(SUM(d.Neto) AS DECIMAL(18,2)) AS NetoVenta
                    FROM #detAll d
                    WHERE d.i_IdTipoCaja = 2
                    GROUP BY d.v_IdVenta) x),0);

    SELECT
        @asisNeto AS AsistencialNeto,
        @sisolPleno AS SisolNetoPleno,
        @sisolPorc AS SisolPorcClinica,
        @sisolPart AS SisolParticipacionClinica,
        @ocupNeto AS OcupacionalNeto,
        @segNeto AS SegurosNeto,
        @otrasNeto AS OtrasUnidadesNeto,
        CAST(@asisNeto + @sisolPart + @ocupNeto + @segNeto + @otrasNeto AS DECIMAL(18,2)) AS TotalGeneral;
END
GO

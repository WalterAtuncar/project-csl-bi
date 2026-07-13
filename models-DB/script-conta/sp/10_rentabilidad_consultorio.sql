-- =============================================================================
-- 10_rentabilidad_consultorio.sql
-- Rentabilidad por Consultorio (ASISTENCIAL / OCUPACIONAL) + OTRAS_UNIDADES.
-- Objetos del schema conta:
--   * conta.fn_Rentabilidad_IngresosDetalleEx  (iTVF, universo canonico a nivel linea) -- INTOCABLE
--   * conta.sp_Rentabilidad_PorConsultorio     (SP, 2 resultsets)
--
-- Universo IDENTICO a conta.fn_Rentabilidad_IngresosEx (4 filtros canonicos +
-- vd.i_Eliminado=0 + dh41 credito + fecha v.t_InsertaFecha + unidad via
-- tipocaja_clientetipo/tipocaja + % SISOL vigente para OTRAS).
--
-- Puentes venta <-> Sigesoft (SigesoftDesarrollo_2 = SOLO SELECT):
--   A (cabecera/boletas): venta.v_CorrelativoDocumentoFin = ALGUN token de
--       service.v_ComprobantePago (split multi-token por '|'), ventana +-15d.
--       ASISTENCIAL dedup rn=1 prefiriendo el token primario (posicion 1).
--   B (liquidacion/EDP):  serie-correlativo = liquidacion.v_NroFactura ->
--       v_NroLiquidacion -> service.v_NroLiquidacion.
--
-- ASISTENCIAL: protocol.i_Consultorio -> grupo 403, con CUATRO capas de rescate
--   (determinista -> heuristica) sobre lo que va quedando '(SIN CLASIFICAR)':
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
--   Toda capa REDISTRIBUYE (nunca crea/pierde ingreso); el residuo sigue en
--   '(SIN CLASIFICAR)' con motivo del dominio (SIN_SERVICE / SIN_CONSULTORIO).
-- OCUPACIONAL: A U B -> servicecomponent -> component.i_CategoryId -> grupo 116,
--   con PRORRATEO anti-fan-out: IngresoComp = NetoVenta * Peso / SUM(Peso) OVER(venta),
--   Peso = ISNULL(NULLIF(sc.r_Price,0), c.r_BasePrice). Sin puente -> '(SIN CLASIFICAR)'.
--   (NO se le aplican las capas de rescate asistenciales; su Puente A tambien es multi-token.)
-- El dinero SIEMPRE sale de ventadetalle.d_Valor; Sigesoft solo aporta dimension/peso.
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
-- SP: Rentabilidad por Consultorio (2 resultsets).
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

    -- ---------------------------------------------------------------------
    -- 1) Universo por VENTA (solo ASISTENCIAL=1 y OCUPACIONAL=2) desde la iTVF.
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
    FROM conta.fn_Rentabilidad_IngresosDetalleEx(@Anio,@Mes,@IncluirCredito) d
    LEFT JOIN dbo.venta v2 ON v2.v_IdVenta = d.v_IdVenta
    WHERE d.i_IdTipoCaja IN (1,2)
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
    -- 3) RAMA ASISTENCIAL: Puente A multi-token con dedup rn=1 (1 consultorio por
    --    token). Se prefiere el token primario (TokPrimario DESC) para NO mover a
    --    los ya clasificados: los tokens en posicion 1 conservan su service dueno;
    --    solo los tokens que unicamente existen en posicion 2+ rescatan la venta.
    --    EsSalaOps: protocolo de sala de operaciones (Capa 2).
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

    -- Clasificacion base (Capa 1 + rescate H existente + Capa 2 Sala de Operaciones).
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

    -- ---------------------------------------------------------------------
    -- 4) RAMA OCUPACIONAL: pares venta-service (Puente A boletas U Puente B EDP).
    --    Puente A tambien es multi-token (drop-in de #tok): rescata comprobantes
    --    en posicion 2+ sin dedup (se abre el paquete). NO se le aplican capas.
    -- ---------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#pair') IS NOT NULL DROP TABLE #pair;
    -- Puente A: TODOS los services cuyo token = corrFin (sin dedup: se abre el paquete).
    SELECT DISTINCT o.v_IdVenta, sv.v_ServiceId
    INTO #pair
    FROM #venta o
    JOIN #tok sv ON sv.token = o.corrFin AND sv.token <> ''
    WHERE o.i_IdTipoCaja = 2;

    -- Puente B: factura -> liquidacion.v_NroFactura -> v_NroLiquidacion ->
    -- service.v_NroLiquidacion. NO se limita a la ventana +-15d: los EDP se
    -- liquidan semanas/meses despues; se alcanza hasta 12 meses atras (piso que
    -- ademas aprovecha el clustered de servicecomponent en el paso siguiente).
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
    WHERE o.i_IdTipoCaja = 2
      AND NOT EXISTS (SELECT 1 FROM #pair p
                      WHERE p.v_IdVenta = o.v_IdVenta
                        AND p.v_ServiceId = s.v_ServiceId COLLATE DATABASE_DEFAULT);

    -- Componentes del paquete con peso (r_Price pactado; r_BasePrice solo fallback).
    IF OBJECT_ID('tempdb..#comp') IS NOT NULL DROP TABLE #comp;
    SELECT
        p.v_IdVenta,
        ISNULL(sp116.v_Value1,'(SIN CATEGORIA)') COLLATE DATABASE_DEFAULT AS Categoria,
        CAST(ISNULL(NULLIF(sc.r_Price,0), c.r_BasePrice) AS FLOAT) AS Peso
    INTO #comp
    FROM #pair p
    JOIN SigesoftDesarrollo_2.dbo.service s2
        ON s2.v_ServiceId = p.v_ServiceId COLLATE DATABASE_DEFAULT
       AND s2.d_ServiceDate >= DATEADD(MONTH,-12,@ini)
    JOIN SigesoftDesarrollo_2.dbo.servicecomponent sc
        ON sc.v_ServiceId = p.v_ServiceId COLLATE DATABASE_DEFAULT
       AND ISNULL(sc.i_IsDeleted,0) = 0
    JOIN SigesoftDesarrollo_2.dbo.component c
        ON c.v_ComponentId = sc.v_ComponentId
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp116
        ON sp116.i_GroupId = 116 AND sp116.i_ParameterId = c.i_CategoryId;

    -- Prorrateo anti-fan-out: SUM por (venta) == NetoVenta exacto.
    IF OBJECT_ID('tempdb..#ocupCat') IS NOT NULL DROP TABLE #ocupCat;
    SELECT x.v_IdVenta, x.Categoria,
           SUM(o.NetoVenta * x.PesoCalc / x.TotPeso) AS Ingreso
    INTO #ocupCat
    FROM (
        SELECT cmp.v_IdVenta, cmp.Categoria,
               ISNULL(cmp.Peso,0) AS PesoCalc,
               SUM(ISNULL(cmp.Peso,0)) OVER (PARTITION BY cmp.v_IdVenta) AS TotPeso
        FROM #comp cmp
    ) x
    JOIN #venta o ON o.v_IdVenta = x.v_IdVenta
    WHERE x.TotPeso > 0
    GROUP BY x.v_IdVenta, x.Categoria;

    -- ---------------------------------------------------------------------
    -- 5) Ensamblado RS1: detalle (Grupo, Consultorio, Ingresos, EsNoClasificado).
    -- ---------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#det') IS NOT NULL DROP TABLE #det;
    CREATE TABLE #det (
        Grupo           NVARCHAR(20)  NOT NULL,
        Consultorio     NVARCHAR(100) NOT NULL,
        Ingresos        DECIMAL(18,2) NOT NULL,
        EsNoClasificado BIT           NOT NULL
    );

    -- ASISTENCIAL (sin prorrateo: sumas exactas de 2 decimales).
    INSERT INTO #det (Grupo, Consultorio, Ingresos, EsNoClasificado)
    SELECT 'ASISTENCIAL', a.Consultorio, CAST(SUM(a.NetoVenta) AS DECIMAL(18,2)),
           CASE WHEN a.Consultorio = '(SIN CLASIFICAR)' THEN 1 ELSE 0 END
    FROM #asis a
    GROUP BY a.Consultorio;

    -- OCUPACIONAL clasificado (prorrateado, redondeado a 2 decimales).
    INSERT INTO #det (Grupo, Consultorio, Ingresos, EsNoClasificado)
    SELECT 'OCUPACIONAL', oc.Categoria, CAST(SUM(oc.Ingreso) AS DECIMAL(18,2)), 0
    FROM #ocupCat oc
    GROUP BY oc.Categoria;

    -- OCUPACIONAL sin clasificar = total del grupo - clasificado (reconciliacion exacta;
    -- absorbe el residuo sub-centimo del prorrateo + las ventas EDP sin liquidacion aun).
    INSERT INTO #det (Grupo, Consultorio, Ingresos, EsNoClasificado)
    SELECT 'OCUPACIONAL', '(SIN CLASIFICAR)',
           ISNULL((SELECT SUM(v.NetoVenta) FROM #venta v WHERE v.i_IdTipoCaja = 2),0)
           - ISNULL((SELECT SUM(d.Ingresos) FROM #det d WHERE d.Grupo = 'OCUPACIONAL'),0),
           1;

    -- OTRAS_UNIDADES: directo de la fn canonica (SISOL a % clinica, FARMACIA, SEGUROS,
    -- MTC) -> garantiza que el gran total reconcilie con Rentabilidad General.
    INSERT INTO #det (Grupo, Consultorio, Ingresos, EsNoClasificado)
    SELECT 'OTRAS_UNIDADES', f.Unidad, f.NetoRentabilidad, 0
    FROM conta.fn_Rentabilidad_IngresosEx(@Anio,@Mes,@IncluirCredito) f
    WHERE f.i_IdTipoCaja NOT IN (1,2);

    -- RS1 con % del grupo y filas TOTAL por grupo.
    -- ROTULO especifico por grupo SOLO para la fila fugada (EsNoClasificado=1):
    --   ASISTENCIAL -> 'NO SE ATENDIERON CON EL SISTEMA'
    --   OCUPACIONAL -> 'SIN LIQUIDACION' (con tilde en la O)
    --   cualquier otro grupo (OTRAS_UNIDADES, hoy nunca fugada) -> '(SIN CLASIFICAR)' generico.
    -- Solo cambia la ETIQUETA mostrada: monto, %, EsNoClasificado=1 (ambar en el front),
    -- shape de columnas y ORDEN quedan identicos -> se ordena por ConsultorioOrd (rotulo
    -- interno crudo '(SIN CLASIFICAR)'), no por la etiqueta mostrada.
    ;WITH tot AS (
        SELECT Grupo, SUM(Ingresos) AS GT FROM #det GROUP BY Grupo
    ),
    rs1 AS (
        SELECT
            d.Grupo,
            CASE WHEN d.EsNoClasificado = 1 AND d.Grupo = 'ASISTENCIAL' THEN N'NO SE ATENDIERON CON EL SISTEMA'
                 WHEN d.EsNoClasificado = 1 AND d.Grupo = 'OCUPACIONAL' THEN N'SIN LIQUIDACIÓN'
                 ELSE d.Consultorio
            END AS Consultorio,
            d.Consultorio AS ConsultorioOrd,
            d.Ingresos,
            CAST(CASE WHEN t.GT = 0 THEN 0 ELSE 100.0 * d.Ingresos / t.GT END AS DECIMAL(9,2)) AS PorcDelGrupo,
            d.EsNoClasificado,
            CAST(0 AS BIT) AS EsTotal
        FROM #det d
        JOIN tot t ON t.Grupo = d.Grupo
        WHERE d.Ingresos <> 0
        UNION ALL
        SELECT
            t.Grupo,
            'TOTAL',
            'TOTAL',
            t.GT,
            CAST(100.00 AS DECIMAL(9,2)),
            CAST(0 AS BIT),
            CAST(1 AS BIT)
        FROM tot t
    )
    SELECT Grupo, Consultorio, Ingresos, PorcDelGrupo, EsNoClasificado, EsTotal
    FROM rs1
    ORDER BY Grupo, EsTotal, Ingresos DESC, ConsultorioOrd;

    -- ---------------------------------------------------------------------
    -- 6) RS2: diagnostico de la fuga (TOP 50 por monto).
    --    ASISTENCIAL -> SIN_SERVICE / SIN_CONSULTORIO ; OCUPACIONAL -> SIN_LIQUIDACION.
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
        SELECT 'OCUPACIONAL',
               'SIN_LIQUIDACION',
               (o.factura + ' | ' + ISNULL(o.refDesc,'')),
               o.NetoVenta
        FROM #venta o
        WHERE o.i_IdTipoCaja = 2
          AND o.v_IdVenta NOT IN (SELECT oc.v_IdVenta FROM #ocupCat oc)
    ) g
    ORDER BY g.Monto DESC;
END
GO

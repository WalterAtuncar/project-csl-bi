-- =============================================================================
-- 16_dashboard.sql  -  SPs del DASHBOARD GERENCIAL / CONTABLE (FASE 1)
-- Plan: models-DB/docs/PLAN_DASHBOARD_GERENCIAL_CONTABLE.md  (secciones 5.3/5.4/5.5)
--
--   conta.sp_Dashboard_TiposCaja  - catalogo de checkboxes (1 RS)
--   conta.sp_Dashboard_Gerencial  - TAB 1, multi-RS RS0..RS9
--   conta.sp_Dashboard_Contable   - TAB 2, multi-RS RS0..RS11
--
-- Solo lectura (SET NOCOUNT ON, sin escritura, sin residuo, sin RESEED).
-- Materializan la base UNA vez en #temp desde las iTVF de fn/14 y derivan.
-- JAMAS consumir con INSERT..EXEC (concatena los RS). Dapper QueryMultiple.
-- SQL Server 2012: sin CREATE OR ALTER / STRING_SPLIT / DROP IF EXISTS.
-- Rango medio-abierto. Filtro multi-tipocaja CSV+LIKE (bucket 0 solo con NULL).
-- dbo: SOLO SELECT.
-- =============================================================================

-- =============================================================================
-- sp_Dashboard_TiposCaja  -  catalogo de las unidades de negocio (checkboxes)
-- =============================================================================
IF OBJECT_ID(N'conta.sp_Dashboard_TiposCaja', N'P') IS NOT NULL
    DROP PROCEDURE conta.sp_Dashboard_TiposCaja;
GO
CREATE PROCEDURE conta.sp_Dashboard_TiposCaja
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i_IdTipoCaja, v_NombreTipoCaja
    FROM dbo.tipocaja
    WHERE i_Estado = 1
    ORDER BY i_IdTipoCaja;
END
GO

-- =============================================================================
-- sp_Dashboard_Gerencial  -  TAB 1 (multi-RS RS0..RS9)
-- =============================================================================
IF OBJECT_ID(N'conta.sp_Dashboard_Gerencial', N'P') IS NOT NULL
    DROP PROCEDURE conta.sp_Dashboard_Gerencial;
GO
CREATE PROCEDURE conta.sp_Dashboard_Gerencial
    @Desde DATE,
    @Hasta DATE,
    @TiposCaja NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @TiposCaja = '' SET @TiposCaja = NULL;
    IF @Desde IS NULL OR @Hasta IS NULL
    BEGIN RAISERROR('Debe indicar @Desde y @Hasta.', 16, 1); RETURN; END
    IF @Desde > @Hasta
    BEGIN RAISERROR('Rango invalido: @Desde no puede ser mayor que @Hasta.', 16, 1); RETURN; END
    IF DATEDIFF(DAY, @Desde, @Hasta) > 730
    BEGIN RAISERROR('El rango no puede exceder 730 dias.', 16, 1); RETURN; END

    DECLARE @Fin        DATE = DATEADD(DAY, 1, @Hasta);
    DECLARE @LenDays    INT  = DATEDIFF(DAY, @Desde, @Fin);
    DECLARE @PrevHasta  DATE = DATEADD(DAY, -1, @Desde);
    DECLARE @PrevDesde  DATE = DATEADD(DAY, -@LenDays, @Desde);
    DECLARE @MesCtxDesde DATE = DATEADD(MONTH, -12, DATEFROMPARTS(YEAR(@Hasta), MONTH(@Hasta), 1));
    DECLARE @MesCtxHasta DATE = EOMONTH(@Hasta);
    DECLARE @Corte      DATE = @Fin;   -- corte CxC = < DATEADD(DAY,1,@Hasta)
    DECLARE @BaseMonday DATE = DATEADD(DAY, -((DATEDIFF(DAY, '19000101', @Desde)) % 7), @Desde);

    -- --- Materializacion de la base (rango) ---
    SELECT * INTO #v  FROM conta.fn_Dash_VentaBase(@Desde, @Hasta, @TiposCaja);
    SELECT * INTO #c  FROM conta.fn_Dash_CobranzaBase(@Desde, @Hasta, @TiposCaja);
    SELECT * INTO #eC FROM conta.fn_Dash_EgresoBase(@Desde, @Hasta, @TiposCaja, 'C');
    SELECT * INTO #eD FROM conta.fn_Dash_EgresoBase(@Desde, @Hasta, @TiposCaja, 'D');
    -- --- Materializacion de la ventana de contexto (13 meses) ---
    SELECT * INTO #vc  FROM conta.fn_Dash_VentaBase(@MesCtxDesde, @MesCtxHasta, @TiposCaja);
    SELECT * INTO #cc  FROM conta.fn_Dash_CobranzaBase(@MesCtxDesde, @MesCtxHasta, @TiposCaja);
    SELECT * INTO #ecc FROM conta.fn_Dash_EgresoBase(@MesCtxDesde, @MesCtxHasta, @TiposCaja, 'C');
    SELECT * INTO #edc FROM conta.fn_Dash_EgresoBase(@MesCtxDesde, @MesCtxHasta, @TiposCaja, 'D');
    -- --- Periodo anterior (para el ajuste SISOL prev) ---
    SELECT * INTO #vp FROM conta.fn_Dash_VentaBase(@PrevDesde, @PrevHasta, @TiposCaja);

    -- --- Spine de meses (13) y de dias del rango ---
    ;WITH m AS (
        SELECT @MesCtxDesde AS MesIni
        UNION ALL
        SELECT DATEADD(MONTH, 1, MesIni) FROM m
        WHERE MesIni < DATEFROMPARTS(YEAR(@MesCtxHasta), MONTH(@MesCtxHasta), 1)
    )
    SELECT YEAR(MesIni) AS Anio, MONTH(MesIni) AS Mes, MesIni INTO #meses FROM m OPTION (MAXRECURSION 0);

    ;WITH d AS (
        SELECT @Desde AS Dia
        UNION ALL
        SELECT DATEADD(DAY, 1, Dia) FROM d WHERE Dia < @Hasta
    )
    SELECT Dia INTO #dias FROM d OPTION (MAXRECURSION 0);

    -- --- Agregados mensuales de contexto ---
    SELECT YEAR(Fecha) AS Anio, MONTH(Fecha) AS Mes, SUM(ValorNeto) AS VentaNeta INTO #venMes FROM #vc GROUP BY YEAR(Fecha), MONTH(Fecha);
    SELECT YEAR(Fecha) AS Anio, MONTH(Fecha) AS Mes, SUM(Importe)  AS Cobrado   INTO #cobMes FROM #cc GROUP BY YEAR(Fecha), MONTH(Fecha);
    SELECT YEAR(Fecha) AS Anio, MONTH(Fecha) AS Mes, SUM(Monto)    AS EgC       INTO #egCMes FROM #ecc GROUP BY YEAR(Fecha), MONTH(Fecha);
    SELECT YEAR(Fecha) AS Anio, MONTH(Fecha) AS Mes, SUM(Monto)    AS EgD       INTO #egDMes FROM #edc GROUP BY YEAR(Fecha), MONTH(Fecha);

    -- Ingresos devengados AJUSTADOS SISOL por mes (D5): unidad SISOL al % clinica
    -- vigente al dia 1 del mes; el resto al 100%.
    SELECT
        x.Anio, x.Mes, x.VentaNeta, x.SisolNeto,
        CAST(x.SisolNeto * pc.Porc / 100.0 AS DECIMAL(18,2)) AS SisolAjust,
        CAST(x.VentaNeta - x.SisolNeto + CAST(x.SisolNeto * pc.Porc / 100.0 AS DECIMAL(18,2)) AS DECIMAL(18,2)) AS IngAjust
    INTO #ingMes
    FROM (
        SELECT YEAR(Fecha) AS Anio, MONTH(Fecha) AS Mes,
               SUM(ValorNeto) AS VentaNeta,
               SUM(CASE WHEN IdTipoCaja = 3 THEN ValorNeto ELSE 0 END) AS SisolNeto
        FROM #vc GROUP BY YEAR(Fecha), MONTH(Fecha)
    ) x
    CROSS APPLY (
        SELECT ISNULL((SELECT TOP 1 d_PorcClinica FROM conta.sisol_participacion
                       WHERE t_VigenciaDesde <= DATEFROMPARTS(x.Anio, x.Mes, 1)
                         AND (t_VigenciaHasta IS NULL OR t_VigenciaHasta >= DATEFROMPARTS(x.Anio, x.Mes, 1))
                       ORDER BY t_VigenciaDesde DESC), 100) AS Porc
    ) pc;

    -- --- CxC por unidad, historico, corte < @Corte (replica asimetria sp_Caja_Indicadores) ---
    ;WITH fact AS (
        SELECT ISNULL(tcct.i_IdTipoCaja, 0) AS Id, SUM(vd.d_PrecioVenta) AS CredFact
        FROM dbo.venta v
        JOIN dbo.ventadetalle vd ON vd.v_IdVenta = v.v_IdVenta AND ISNULL(vd.i_Eliminado, 0) = 0
        JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago AND dh41.v_Value1 = 'CREDITO'
        LEFT JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
        WHERE ISNULL(v.i_Eliminado, 0) = 0 AND v.t_InsertaFecha < @Corte
          AND v.i_ClienteEsAgente IS NOT NULL
          AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3, 4))
          AND ISNULL(v.v_SerieDocumento, '') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')
        GROUP BY ISNULL(tcct.i_IdTipoCaja, 0)
    ),
    cob AS (
        SELECT ISNULL(tcct.i_IdTipoCaja, 0) AS Id, SUM(cd.d_ImporteSoles) AS CredCob
        FROM dbo.cobranzadetalle cd
        JOIN dbo.venta v ON v.v_IdVenta = cd.v_IdVenta AND ISNULL(v.i_Eliminado, 0) = 0
        JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago AND dh41.v_Value1 = 'CREDITO'
        LEFT JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
        WHERE ISNULL(cd.i_Eliminado, 0) = 0 AND cd.t_InsertaFecha < @Corte
        GROUP BY ISNULL(tcct.i_IdTipoCaja, 0)
    )
    SELECT
        ISNULL(f.Id, c.Id) AS IdTipoCaja,
        CASE WHEN ISNULL(f.Id, c.Id) = 0 THEN 'SIN_UNIDAD' ELSE ISNULL(tc.v_NombreTipoCaja, 'SIN_UNIDAD') END AS Unidad,
        CAST(ISNULL(f.CredFact, 0) AS DECIMAL(18,2)) AS CreditoFacturado,
        CAST(ISNULL(c.CredCob, 0) AS DECIMAL(18,2)) AS CreditoCobrado,
        CAST(ISNULL(f.CredFact, 0) - ISNULL(c.CredCob, 0) AS DECIMAL(18,2)) AS PorCobrar
    INTO #cxc
    FROM fact f
    FULL OUTER JOIN cob c ON c.Id = f.Id
    LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = ISNULL(f.Id, c.Id)
    WHERE (@TiposCaja IS NULL
           OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(VARCHAR(10), ISNULL(f.Id, c.Id)) + ',%');

    -- --- Escalares del rango ---
    DECLARE @VentaNeta   DECIMAL(18,2) = ISNULL((SELECT SUM(ValorNeto) FROM #v), 0);
    DECLARE @NumVentas   INT           = ISNULL((SELECT COUNT(DISTINCT IdVenta) FROM #v), 0);
    DECLARE @SisolNeto   DECIMAL(18,2) = ISNULL((SELECT SUM(ValorNeto) FROM #v WHERE IdTipoCaja = 3), 0);
    -- Ajuste SISOL del rango: SISOL neto por mes x % clinica vigente al dia 1 del mes
    -- (directo desde #v -> correcto tambien para rangos de mes parcial).
    DECLARE @SisolAjuste DECIMAL(18,2) = ISNULL((
        SELECT SUM(CAST(sm.Neto * pc.Porc / 100.0 AS DECIMAL(18,2)))
        FROM (SELECT YEAR(Fecha) Y, MONTH(Fecha) M, SUM(ValorNeto) Neto FROM #v WHERE IdTipoCaja = 3 GROUP BY YEAR(Fecha), MONTH(Fecha)) sm
        CROSS APPLY (SELECT ISNULL((SELECT TOP 1 d_PorcClinica FROM conta.sisol_participacion
                                    WHERE t_VigenciaDesde <= DATEFROMPARTS(sm.Y, sm.M, 1)
                                      AND (t_VigenciaHasta IS NULL OR t_VigenciaHasta >= DATEFROMPARTS(sm.Y, sm.M, 1))
                                    ORDER BY t_VigenciaDesde DESC), 100) AS Porc) pc), 0);
    DECLARE @IngresosDevAjust DECIMAL(18,2) = @VentaNeta - @SisolNeto + @SisolAjuste;
    DECLARE @Cobrado   DECIMAL(18,2) = ISNULL((SELECT SUM(Importe) FROM #c), 0);
    DECLARE @EgresosC  DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM #eC), 0);
    DECLARE @EgresosD  DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM #eD), 0);
    DECLARE @EgLegacy  DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM #eC WHERE Fuente = 'LEGACY'), 0);
    DECLARE @EgConta   DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM #eC WHERE Fuente = 'CONTA'), 0);
    DECLARE @EgPlanilla DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM #eC WHERE Fuente = 'PLANILLA'), 0);

    -- --- Escalares del periodo anterior ---
    DECLARE @VentaNetaPrev DECIMAL(18,2) = ISNULL((SELECT SUM(ValorNeto) FROM #vp), 0);
    DECLARE @NumVentasPrev INT           = ISNULL((SELECT COUNT(DISTINCT IdVenta) FROM #vp), 0);
    DECLARE @SisolNetoPrev DECIMAL(18,2) = ISNULL((SELECT SUM(ValorNeto) FROM #vp WHERE IdTipoCaja = 3), 0);
    DECLARE @SisolAjustePrev DECIMAL(18,2) = ISNULL((
        SELECT SUM(CAST(sm.Neto * pc.Porc / 100.0 AS DECIMAL(18,2)))
        FROM (SELECT YEAR(Fecha) Y, MONTH(Fecha) M, SUM(ValorNeto) Neto FROM #vp WHERE IdTipoCaja = 3 GROUP BY YEAR(Fecha), MONTH(Fecha)) sm
        CROSS APPLY (SELECT ISNULL((SELECT TOP 1 d_PorcClinica FROM conta.sisol_participacion
                                    WHERE t_VigenciaDesde <= DATEFROMPARTS(sm.Y, sm.M, 1)
                                      AND (t_VigenciaHasta IS NULL OR t_VigenciaHasta >= DATEFROMPARTS(sm.Y, sm.M, 1))
                                    ORDER BY t_VigenciaDesde DESC), 100) AS Porc) pc), 0);
    DECLARE @IngresosDevAjustPrev DECIMAL(18,2) = @VentaNetaPrev - @SisolNetoPrev + @SisolAjustePrev;
    DECLARE @CobradoPrev  DECIMAL(18,2) = ISNULL((SELECT SUM(Importe) FROM conta.fn_Dash_CobranzaBase(@PrevDesde, @PrevHasta, @TiposCaja)), 0);
    DECLARE @EgresosCPrev DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM conta.fn_Dash_EgresoBase(@PrevDesde, @PrevHasta, @TiposCaja, 'C')), 0);
    DECLARE @EgresosDPrev DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM conta.fn_Dash_EgresoBase(@PrevDesde, @PrevHasta, @TiposCaja, 'D')), 0);
    DECLARE @PorCobrar    DECIMAL(18,2) = ISNULL((SELECT SUM(PorCobrar) FROM #cxc), 0);

    -- ===================== RS0 : KPIs =====================
    SELECT
        @VentaNeta                                                                      AS VentaNeta,
        @VentaNetaPrev                                                                  AS VentaNetaPrev,
        @NumVentas                                                                      AS NumVentas,
        CAST(@VentaNeta     / NULLIF(@NumVentas, 0)     AS DECIMAL(18,2))                AS TicketPromedio,
        CAST(@VentaNetaPrev / NULLIF(@NumVentasPrev, 0) AS DECIMAL(18,2))                AS TicketPromedioPrev,
        @Cobrado                                                                        AS Cobrado,
        @CobradoPrev                                                                    AS CobradoPrev,
        @EgresosC                                                                       AS Egresos,
        @EgresosCPrev                                                                   AS EgresosPrev,
        CAST(@Cobrado - @EgresosC AS DECIMAL(18,2))                                     AS FlujoNeto,
        @IngresosDevAjust                                                               AS IngresosDevAjust,
        CAST((@IngresosDevAjust - @EgresosD) * 100.0 / NULLIF(@IngresosDevAjust, 0) AS DECIMAL(9,2)) AS MargenOperativoPct,
        CAST((@IngresosDevAjustPrev - @EgresosDPrev) * 100.0 / NULLIF(@IngresosDevAjustPrev, 0) AS DECIMAL(9,2)) AS MargenOperativoPctPrev,
        @PorCobrar                                                                      AS PorCobrar,
        CAST(@Cobrado * 100.0 / NULLIF(@VentaNeta, 0) AS DECIMAL(9,2))                   AS RatioCobranzaPct;

    -- ===================== RS1 : Tendencia mensual 13m =====================
    SELECT
        m.Anio, m.Mes,
        CAST(ISNULL(vn.VentaNeta, 0) AS DECIMAL(18,2)) AS VentaNeta,
        CAST(ISNULL(cb.Cobrado, 0)   AS DECIMAL(18,2)) AS Cobrado,
        CAST(ISNULL(ec.EgC, 0)       AS DECIMAL(18,2)) AS Egresos,
        CAST(ISNULL(im.IngAjust, 0) - ISNULL(ed.EgD, 0) AS DECIMAL(18,2)) AS ResultadoDev,
        CAST(CASE WHEN ISNULL(im.IngAjust, 0) = 0 THEN 0
                  ELSE (ISNULL(im.IngAjust, 0) - ISNULL(ed.EgD, 0)) * 100.0 / im.IngAjust END AS DECIMAL(9,2)) AS MargenPct
    FROM #meses m
    LEFT JOIN #venMes vn ON vn.Anio = m.Anio AND vn.Mes = m.Mes
    LEFT JOIN #cobMes cb ON cb.Anio = m.Anio AND cb.Mes = m.Mes
    LEFT JOIN #egCMes ec ON ec.Anio = m.Anio AND ec.Mes = m.Mes
    LEFT JOIN #egDMes ed ON ed.Anio = m.Anio AND ed.Mes = m.Mes
    LEFT JOIN #ingMes im ON im.Anio = m.Anio AND im.Mes = m.Mes
    ORDER BY m.Anio, m.Mes;

    -- ===================== RS2 : Serie diaria del rango =====================
    SELECT
        d.Dia AS Fecha,
        CAST(ISNULL(vn.VentaNeta, 0) AS DECIMAL(18,2)) AS VentaNeta,
        CAST(ISNULL(cb.Cobrado, 0)   AS DECIMAL(18,2)) AS Cobrado,
        CAST(ISNULL(eg.Egresos, 0)   AS DECIMAL(18,2)) AS Egresos
    FROM #dias d
    LEFT JOIN (SELECT CAST(Fecha AS DATE) Dia, SUM(ValorNeto) VentaNeta FROM #v GROUP BY CAST(Fecha AS DATE)) vn ON vn.Dia = d.Dia
    LEFT JOIN (SELECT CAST(Fecha AS DATE) Dia, SUM(Importe)   Cobrado   FROM #c GROUP BY CAST(Fecha AS DATE)) cb ON cb.Dia = d.Dia
    LEFT JOIN (SELECT Fecha Dia, SUM(Monto) Egresos FROM #eC WHERE EsMensual = 0 GROUP BY Fecha) eg ON eg.Dia = d.Dia
    ORDER BY d.Dia;

    -- ===================== RS3 : Mix por unidad (rango) =====================
    SELECT
        u.IdTipoCaja,
        u.Unidad,
        CAST(ISNULL(vn.VentaNeta, 0) AS DECIMAL(18,2)) AS VentaNeta,
        CAST(ISNULL(cb.Cobrado, 0)   AS DECIMAL(18,2)) AS Cobrado,
        CAST(ISNULL(ec.EgC, 0)       AS DECIMAL(18,2)) AS Egresos,
        CAST((CASE WHEN u.IdTipoCaja = 3 THEN @SisolAjuste ELSE ISNULL(vn.VentaNeta, 0) END) - ISNULL(ed.EgD, 0) AS DECIMAL(18,2)) AS Resultado,
        CAST(ISNULL(vn.VentaNeta, 0) * 100.0 / NULLIF(@VentaNeta, 0) AS DECIMAL(9,2)) AS PctVenta
    FROM (
        SELECT IdTipoCaja, MAX(Unidad) AS Unidad FROM (
            SELECT IdTipoCaja, Unidad FROM #v
            UNION ALL SELECT IdTipoCaja, Unidad FROM #c
            UNION ALL SELECT IdTipoCaja, Unidad FROM #eC
        ) z GROUP BY IdTipoCaja
    ) u
    LEFT JOIN (SELECT IdTipoCaja, SUM(ValorNeto) VentaNeta FROM #v  GROUP BY IdTipoCaja) vn ON vn.IdTipoCaja = u.IdTipoCaja
    LEFT JOIN (SELECT IdTipoCaja, SUM(Importe)   Cobrado   FROM #c  GROUP BY IdTipoCaja) cb ON cb.IdTipoCaja = u.IdTipoCaja
    LEFT JOIN (SELECT IdTipoCaja, SUM(Monto)     EgC       FROM #eC GROUP BY IdTipoCaja) ec ON ec.IdTipoCaja = u.IdTipoCaja
    LEFT JOIN (SELECT IdTipoCaja, SUM(Monto)     EgD       FROM #eD GROUP BY IdTipoCaja) ed ON ed.IdTipoCaja = u.IdTipoCaja
    ORDER BY VentaNeta DESC;

    -- ===================== RS4 : Mix mensual x unidad 13m =====================
    SELECT
        YEAR(Fecha) AS Anio, MONTH(Fecha) AS Mes, IdTipoCaja,
        MAX(Unidad) AS Unidad,
        CAST(SUM(ValorNeto) AS DECIMAL(18,2)) AS VentaNeta
    FROM #vc
    GROUP BY YEAR(Fecha), MONTH(Fecha), IdTipoCaja
    ORDER BY Anio, Mes, IdTipoCaja;

    -- ===================== RS5 : Medios de pago (rango) =====================
    SELECT
        IdFormaPago,
        ISNULL(MAX(FormaPago), '(SIN FORMA)') AS FormaPago,
        CAST(SUM(Importe) AS DECIMAL(18,2)) AS Monto,
        CAST(SUM(Importe) * 100.0 / NULLIF(@Cobrado, 0) AS DECIMAL(9,2)) AS Pct
    FROM #c
    GROUP BY IdFormaPago
    ORDER BY Monto DESC;

    -- ===================== RS6 : Waterfall del rango =====================
    SELECT 1 AS Orden, 'Cobranzas'             AS Concepto, @Cobrado    AS Monto, 'ENTRADA' AS Tipo
    UNION ALL SELECT 2, 'Egresos caja legacy',              @EgLegacy,            'SALIDA'
    UNION ALL SELECT 3, 'Egresos conta pagados',            @EgConta,             'SALIDA'
    UNION ALL SELECT 4, 'Planilla',                         @EgPlanilla,          'SALIDA'
    UNION ALL SELECT 5, 'Flujo neto', CAST(@Cobrado - @EgresosC AS DECIMAL(18,2)), 'NETO'
    ORDER BY Orden;

    -- ===================== RS7 : Top categorias de egreso (rango, base C) =====================
    SELECT TOP 10
        Categoria, Fuente,
        CAST(SUM(Monto) AS DECIMAL(18,2)) AS Monto,
        CAST(SUM(Monto) * 100.0 / NULLIF(@EgresosC, 0) AS DECIMAL(9,2)) AS Pct
    FROM #eC
    GROUP BY Categoria, Fuente
    ORDER BY SUM(Monto) DESC;

    -- ===================== RS8 : CxC por unidad =====================
    SELECT IdTipoCaja, Unidad, CreditoFacturado, CreditoCobrado, PorCobrar
    FROM #cxc
    ORDER BY PorCobrar DESC;

    -- ===================== RS9 : Heatmap de cobranza (dia x semana) =====================
    SELECT
        (DATEDIFF(DAY, '19000101', d.Dia) % 7) + 1 AS DiaSemana,
        CASE (DATEDIFF(DAY, '19000101', d.Dia) % 7) + 1
             WHEN 1 THEN 'LUN' WHEN 2 THEN 'MAR' WHEN 3 THEN 'MIE' WHEN 4 THEN 'JUE'
             WHEN 5 THEN 'VIE' WHEN 6 THEN 'SAB' ELSE 'DOM' END AS Etiqueta,
        (DATEDIFF(DAY, @BaseMonday, DATEADD(DAY, -((DATEDIFF(DAY, '19000101', d.Dia)) % 7), d.Dia)) / 7) + 1 AS NumSemana,
        DATEADD(DAY, -((DATEDIFF(DAY, '19000101', d.Dia)) % 7), d.Dia) AS FechaInicioSemana,
        CAST(ISNULL(cb.Cobrado, 0) AS DECIMAL(18,2)) AS Cobrado
    FROM #dias d
    LEFT JOIN (SELECT CAST(Fecha AS DATE) Dia, SUM(Importe) Cobrado FROM #c GROUP BY CAST(Fecha AS DATE)) cb ON cb.Dia = d.Dia
    ORDER BY d.Dia;
END
GO

-- =============================================================================
-- sp_Dashboard_Contable  -  TAB 2 (multi-RS RS0..RS11)
-- =============================================================================
IF OBJECT_ID(N'conta.sp_Dashboard_Contable', N'P') IS NOT NULL
    DROP PROCEDURE conta.sp_Dashboard_Contable;
GO
CREATE PROCEDURE conta.sp_Dashboard_Contable
    @Desde DATE,
    @Hasta DATE,
    @TiposCaja NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @TiposCaja = '' SET @TiposCaja = NULL;
    IF @Desde IS NULL OR @Hasta IS NULL
    BEGIN RAISERROR('Debe indicar @Desde y @Hasta.', 16, 1); RETURN; END
    IF @Desde > @Hasta
    BEGIN RAISERROR('Rango invalido: @Desde no puede ser mayor que @Hasta.', 16, 1); RETURN; END
    IF DATEDIFF(DAY, @Desde, @Hasta) > 730
    BEGIN RAISERROR('El rango no puede exceder 730 dias.', 16, 1); RETURN; END

    DECLARE @Fin        DATE = DATEADD(DAY, 1, @Hasta);
    DECLARE @LenDays    INT  = DATEDIFF(DAY, @Desde, @Fin);
    DECLARE @PrevHasta  DATE = DATEADD(DAY, -1, @Desde);
    DECLARE @PrevDesde  DATE = DATEADD(DAY, -@LenDays, @Desde);
    DECLARE @MesCtxDesde DATE = DATEADD(MONTH, -12, DATEFROMPARTS(YEAR(@Hasta), MONTH(@Hasta), 1));
    DECLARE @MesCtxHasta DATE = EOMONTH(@Hasta);
    DECLARE @FinCtx     DATE = DATEADD(DAY, 1, @MesCtxHasta);
    DECLARE @Corte      DATE = @Fin;

    -- --- Materializacion base (rango + contexto) ---
    SELECT * INTO #v  FROM conta.fn_Dash_VentaBase(@Desde, @Hasta, @TiposCaja);
    SELECT * INTO #c  FROM conta.fn_Dash_CobranzaBase(@Desde, @Hasta, @TiposCaja);
    SELECT * INTO #eC FROM conta.fn_Dash_EgresoBase(@Desde, @Hasta, @TiposCaja, 'C');
    SELECT * INTO #vc  FROM conta.fn_Dash_VentaBase(@MesCtxDesde, @MesCtxHasta, @TiposCaja);
    SELECT * INTO #cc  FROM conta.fn_Dash_CobranzaBase(@MesCtxDesde, @MesCtxHasta, @TiposCaja);
    SELECT * INTO #ecc FROM conta.fn_Dash_EgresoBase(@MesCtxDesde, @MesCtxHasta, @TiposCaja, 'C');

    -- --- Spine de meses (13) ---
    ;WITH m AS (
        SELECT @MesCtxDesde AS MesIni
        UNION ALL
        SELECT DATEADD(MONTH, 1, MesIni) FROM m
        WHERE MesIni < DATEFROMPARTS(YEAR(@MesCtxHasta), MONTH(@MesCtxHasta), 1)
    )
    SELECT YEAR(MesIni) AS Anio, MONTH(MesIni) AS Mes, MesIni INTO #meses FROM m OPTION (MAXRECURSION 0);

    -- --- Mapa centro_costo -> tipocaja (walk recursivo) y raiz de tipo_gasto ---
    ;WITH walk AS (
        SELECT c.i_IdCentroCosto AS origen, c.i_IdPadre, c.i_IdTipoCaja FROM conta.centro_costo c
        UNION ALL
        SELECT w.origen, p.i_IdPadre, p.i_IdTipoCaja
        FROM walk w JOIN conta.centro_costo p ON p.i_IdCentroCosto = w.i_IdPadre
        WHERE w.i_IdTipoCaja IS NULL
    )
    SELECT origen AS i_IdCentroCosto, MAX(i_IdTipoCaja) AS i_IdTipoCaja INTO #mapc FROM walk GROUP BY origen;

    ;WITH tg AS (
        SELECT i_IdTipoGasto, v_Nombre AS RootNombre FROM conta.tipo_gasto WHERE i_IdPadre IS NULL
        UNION ALL
        SELECT c.i_IdTipoGasto, r.RootNombre FROM conta.tipo_gasto c JOIN tg r ON c.i_IdPadre = r.i_IdTipoGasto
    )
    SELECT i_IdTipoGasto, RootNombre INTO #tgroot FROM tg;

    -- --- Agregados mensuales de contexto ---
    SELECT YEAR(Fecha) AS Anio, MONTH(Fecha) AS Mes, SUM(Importe) AS Cobrado INTO #cobMes FROM #cc GROUP BY YEAR(Fecha), MONTH(Fecha);
    SELECT YEAR(Fecha) AS Anio, MONTH(Fecha) AS Mes, SUM(Monto)   AS EgC     INTO #egCMes FROM #ecc GROUP BY YEAR(Fecha), MONTH(Fecha);

    -- --- CxC por unidad, historico, corte < @Corte (= RS5) + apertura CxC para RS4 ---
    -- Un solo escaneo por fuente (WHERE < @Corte) calcula el total al corte Y la apertura
    -- (historico < @MesCtxDesde) via suma condicional -> evita 2 escaneos historicos extra.
    ;WITH fact AS (
        SELECT ISNULL(tcct.i_IdTipoCaja, 0) AS Id,
               SUM(vd.d_PrecioVenta) AS CredFact,
               SUM(CASE WHEN v.t_InsertaFecha < @MesCtxDesde THEN vd.d_PrecioVenta ELSE 0 END) AS CredFactOpen
        FROM dbo.venta v
        JOIN dbo.ventadetalle vd ON vd.v_IdVenta = v.v_IdVenta AND ISNULL(vd.i_Eliminado, 0) = 0
        JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago AND dh41.v_Value1 = 'CREDITO'
        LEFT JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
        WHERE ISNULL(v.i_Eliminado, 0) = 0 AND v.t_InsertaFecha < @Corte
          AND v.i_ClienteEsAgente IS NOT NULL
          AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3, 4))
          AND ISNULL(v.v_SerieDocumento, '') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')
        GROUP BY ISNULL(tcct.i_IdTipoCaja, 0)
    ),
    cob AS (
        SELECT ISNULL(tcct.i_IdTipoCaja, 0) AS Id,
               SUM(cd.d_ImporteSoles) AS CredCob,
               SUM(CASE WHEN cd.t_InsertaFecha < @MesCtxDesde THEN cd.d_ImporteSoles ELSE 0 END) AS CredCobOpen
        FROM dbo.cobranzadetalle cd
        JOIN dbo.venta v ON v.v_IdVenta = cd.v_IdVenta AND ISNULL(v.i_Eliminado, 0) = 0
        JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago AND dh41.v_Value1 = 'CREDITO'
        LEFT JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
        WHERE ISNULL(cd.i_Eliminado, 0) = 0 AND cd.t_InsertaFecha < @Corte
        GROUP BY ISNULL(tcct.i_IdTipoCaja, 0)
    )
    SELECT
        ISNULL(f.Id, c.Id) AS IdTipoCaja,
        CASE WHEN ISNULL(f.Id, c.Id) = 0 THEN 'SIN_UNIDAD' ELSE ISNULL(tc.v_NombreTipoCaja, 'SIN_UNIDAD') END AS Unidad,
        CAST(ISNULL(f.CredFact, 0) AS DECIMAL(18,2)) AS CreditoFacturado,
        CAST(ISNULL(c.CredCob, 0) AS DECIMAL(18,2)) AS CreditoCobrado,
        CAST(ISNULL(f.CredFact, 0) - ISNULL(c.CredCob, 0) AS DECIMAL(18,2)) AS PorCobrar,
        CAST(ISNULL(f.CredFactOpen, 0) - ISNULL(c.CredCobOpen, 0) AS DECIMAL(18,2)) AS PorCobrarOpen
    INTO #cxc
    FROM fact f
    FULL OUTER JOIN cob c ON c.Id = f.Id
    LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = ISNULL(f.Id, c.Id)
    WHERE (@TiposCaja IS NULL
           OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(VARCHAR(10), ISNULL(f.Id, c.Id)) + ',%');

    -- --- Escalares ---
    DECLARE @Cobrado    DECIMAL(18,2) = ISNULL((SELECT SUM(Importe) FROM #c), 0);
    DECLARE @EgresosC   DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM #eC), 0);
    DECLARE @EgLegacy   DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM #eC WHERE Fuente = 'LEGACY'), 0);
    DECLARE @EgConta    DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM #eC WHERE Fuente = 'CONTA'), 0);
    DECLARE @EgPlanilla DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM #eC WHERE Fuente = 'PLANILLA'), 0);
    DECLARE @CobradoPrev  DECIMAL(18,2) = ISNULL((SELECT SUM(Importe) FROM conta.fn_Dash_CobranzaBase(@PrevDesde, @PrevHasta, @TiposCaja)), 0);
    DECLARE @EgresosCPrev DECIMAL(18,2) = ISNULL((SELECT SUM(Monto) FROM conta.fn_Dash_EgresoBase(@PrevDesde, @PrevHasta, @TiposCaja, 'C')), 0);
    DECLARE @PorCobrar  DECIMAL(18,2) = ISNULL((SELECT SUM(PorCobrar) FROM #cxc), 0);
    DECLARE @IGVDebito  DECIMAL(18,2) = ISNULL((SELECT SUM(PrecioBruto - ValorNeto) FROM #v), 0);
    DECLARE @IGVCredito DECIMAL(18,2) = ISNULL((SELECT SUM(rc.igv) FROM dbo.registro_compras rc
                                                WHERE rc.fecha_emision >= @Desde AND rc.fecha_emision < @Fin), 0);
    -- PorPagar (patron sp_Caja_Indicadores): egresos POR_PAGAR con fecha de documento <= @Hasta
    DECLARE @PorPagar DECIMAL(18,2) = ISNULL((
        SELECT SUM(e.d_MontoBruto * e.d_TipoCambio)
        FROM conta.egreso e
        LEFT JOIN #mapc mc ON mc.i_IdCentroCosto = e.i_IdCentroCosto
        WHERE e.v_Estado = 'POR_PAGAR' AND e.t_FechaDocumento < @Fin
          AND (@TiposCaja IS NULL
               OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(VARCHAR(10), ISNULL(mc.i_IdTipoCaja, 0)) + ',%')), 0);

    -- --- Apertura CxC (historico antes de la ventana) para el saldo acumulado (RS4) ---
    -- Derivada del mismo #cxc (columna PorCobrarOpen), sin escaneo historico adicional.
    DECLARE @OpenCxC DECIMAL(18,2) = ISNULL((SELECT SUM(PorCobrarOpen) FROM #cxc), 0);

    -- ===================== RS0 : KPIs =====================
    SELECT
        @Cobrado                                                            AS Cobrado,
        @CobradoPrev                                                        AS CobradoPrev,
        @EgresosC                                                           AS Egresos,
        @EgresosCPrev                                                       AS EgresosPrev,
        @EgLegacy                                                           AS EgresosLegacy,
        @EgConta                                                            AS EgresosConta,
        @EgPlanilla                                                         AS Planilla,
        CAST(@Cobrado - @EgresosC AS DECIMAL(18,2))                         AS FlujoNeto,
        CAST(@CobradoPrev - @EgresosCPrev AS DECIMAL(18,2))                 AS FlujoNetoPrev,
        CAST(@EgresosC / NULLIF(@LenDays, 0) AS DECIMAL(18,2))              AS EgresoPromedioDiario,
        @PorCobrar                                                          AS PorCobrar,
        @PorPagar                                                           AS PorPagar,
        @IGVDebito                                                          AS IGVDebitoEstimado,
        @IGVCredito                                                         AS IGVCreditoFiscal,
        CAST(@IGVDebito - @IGVCredito AS DECIMAL(18,2))                     AS IGVResultanteEstimado;

    -- ===================== RS1 : Ingresos vs egresos mensual 13m =====================
    SELECT
        m.Anio, m.Mes,
        CAST(ISNULL(cb.Cobrado, 0) AS DECIMAL(18,2)) AS Cobrado,
        CAST(ISNULL(ec.EgC, 0)     AS DECIMAL(18,2)) AS Egresos,
        CAST(ISNULL(cb.Cobrado, 0) - ISNULL(ec.EgC, 0) AS DECIMAL(18,2)) AS FlujoNeto
    FROM #meses m
    LEFT JOIN #cobMes cb ON cb.Anio = m.Anio AND cb.Mes = m.Mes
    LEFT JOIN #egCMes ec ON ec.Anio = m.Anio AND ec.Mes = m.Mes
    ORDER BY m.Anio, m.Mes;

    -- ===================== RS2 : Cobranzas x medio x mes 13m =====================
    SELECT
        YEAR(Fecha) AS Anio, MONTH(Fecha) AS Mes, IdFormaPago,
        ISNULL(MAX(FormaPago), '(SIN FORMA)') AS FormaPago,
        CAST(SUM(Importe) AS DECIMAL(18,2)) AS Monto
    FROM #cc
    GROUP BY YEAR(Fecha), MONTH(Fecha), IdFormaPago
    ORDER BY Anio, Mes, Monto DESC;

    -- ===================== RS3 : Composicion de gastos (rango, base C) =====================
    SELECT
        Fuente, Categoria,
        CAST(SUM(Monto) AS DECIMAL(18,2)) AS Monto,
        CAST(SUM(Monto) * 100.0 / NULLIF(@EgresosC, 0) AS DECIMAL(9,2)) AS Pct
    FROM #eC
    GROUP BY Fuente, Categoria
    ORDER BY Monto DESC;

    -- ===================== RS4 : Evolucion CxC mensual 13m =====================
    ;WITH factM AS (
        SELECT YEAR(v.t_InsertaFecha) AS Y, MONTH(v.t_InsertaFecha) AS M, SUM(vd.d_PrecioVenta) AS CredFact
        FROM dbo.venta v
        JOIN dbo.ventadetalle vd ON vd.v_IdVenta = v.v_IdVenta AND ISNULL(vd.i_Eliminado, 0) = 0
        JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago AND dh41.v_Value1 = 'CREDITO'
        LEFT JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
        WHERE ISNULL(v.i_Eliminado, 0) = 0 AND v.t_InsertaFecha >= @MesCtxDesde AND v.t_InsertaFecha < @FinCtx
          AND v.i_ClienteEsAgente IS NOT NULL
          AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3, 4))
          AND ISNULL(v.v_SerieDocumento, '') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')
          AND (@TiposCaja IS NULL OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(VARCHAR(10), ISNULL(tcct.i_IdTipoCaja, 0)) + ',%')
        GROUP BY YEAR(v.t_InsertaFecha), MONTH(v.t_InsertaFecha)
    ),
    cobM AS (
        SELECT YEAR(cd.t_InsertaFecha) AS Y, MONTH(cd.t_InsertaFecha) AS M, SUM(cd.d_ImporteSoles) AS CredCob
        FROM dbo.cobranzadetalle cd
        JOIN dbo.venta v ON v.v_IdVenta = cd.v_IdVenta AND ISNULL(v.i_Eliminado, 0) = 0
        JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago AND dh41.v_Value1 = 'CREDITO'
        LEFT JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
        WHERE ISNULL(cd.i_Eliminado, 0) = 0 AND cd.t_InsertaFecha >= @MesCtxDesde AND cd.t_InsertaFecha < @FinCtx
          AND (@TiposCaja IS NULL OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(VARCHAR(10), ISNULL(tcct.i_IdTipoCaja, 0)) + ',%')
        GROUP BY YEAR(cd.t_InsertaFecha), MONTH(cd.t_InsertaFecha)
    ),
    combo AS (
        SELECT m.Anio, m.Mes, m.MesIni,
               ISNULL(f.CredFact, 0) AS CredFact, ISNULL(c.CredCob, 0) AS CredCob
        FROM #meses m
        LEFT JOIN factM f ON f.Y = m.Anio AND f.M = m.Mes
        LEFT JOIN cobM  c ON c.Y = m.Anio AND c.M = m.Mes
    )
    SELECT
        Anio, Mes,
        CAST(CredFact AS DECIMAL(18,2)) AS CreditoFacturadoMes,
        CAST(CredCob  AS DECIMAL(18,2)) AS CreditoCobradoMes,
        CAST(@OpenCxC + SUM(CredFact - CredCob) OVER (ORDER BY MesIni ROWS UNBOUNDED PRECEDING) AS DECIMAL(18,2)) AS SaldoAcumulado
    FROM combo
    ORDER BY MesIni;

    -- ===================== RS5 : CxC por unidad (= gerencial RS8) =====================
    SELECT IdTipoCaja, Unidad, CreditoFacturado, CreditoCobrado, PorCobrar
    FROM #cxc
    ORDER BY PorCobrar DESC;

    -- ===================== RS6 : CxP aging (al corte @Hasta) - nace vacio (D7) =====================
    SELECT
        ISNULL(tg.RootNombre, 'OTROS EGRESOS') AS Categoria,
        CASE WHEN DATEDIFF(DAY, e.t_FechaDocumento, @Hasta) <= 30 THEN '0-30'
             WHEN DATEDIFF(DAY, e.t_FechaDocumento, @Hasta) <= 60 THEN '31-60'
             WHEN DATEDIFF(DAY, e.t_FechaDocumento, @Hasta) <= 90 THEN '61-90'
             ELSE '90+' END AS Bucket,
        CAST(SUM(e.d_MontoBruto * e.d_TipoCambio) AS DECIMAL(18,2)) AS Monto,
        COUNT(*) AS NumDocs
    FROM conta.egreso e
    LEFT JOIN #mapc mc ON mc.i_IdCentroCosto = e.i_IdCentroCosto
    LEFT JOIN #tgroot tg ON tg.i_IdTipoGasto = e.i_IdTipoGasto
    WHERE e.v_Estado = 'POR_PAGAR' AND e.t_FechaDocumento <= @Hasta
      AND (@TiposCaja IS NULL OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(VARCHAR(10), ISNULL(mc.i_IdTipoCaja, 0)) + ',%')
    GROUP BY ISNULL(tg.RootNombre, 'OTROS EGRESOS'),
        CASE WHEN DATEDIFF(DAY, e.t_FechaDocumento, @Hasta) <= 30 THEN '0-30'
             WHEN DATEDIFF(DAY, e.t_FechaDocumento, @Hasta) <= 60 THEN '31-60'
             WHEN DATEDIFF(DAY, e.t_FechaDocumento, @Hasta) <= 90 THEN '61-90'
             ELSE '90+' END;

    -- ===================== RS7 : IGV mensual 13m =====================
    SELECT
        m.Anio, m.Mes,
        CAST(ISNULL(db.Debito, 0)  AS DECIMAL(18,2)) AS IGVDebitoEstimado,
        CAST(ISNULL(cr.Credito, 0) AS DECIMAL(18,2)) AS IGVCreditoFiscal,
        CAST(ISNULL(db.Debito, 0) - ISNULL(cr.Credito, 0) AS DECIMAL(18,2)) AS IGVResultante
    FROM #meses m
    LEFT JOIN (SELECT YEAR(Fecha) Y, MONTH(Fecha) M, SUM(PrecioBruto - ValorNeto) Debito FROM #vc GROUP BY YEAR(Fecha), MONTH(Fecha)) db
        ON db.Y = m.Anio AND db.M = m.Mes
    LEFT JOIN (SELECT YEAR(fecha_emision) Y, MONTH(fecha_emision) M, SUM(igv) Credito
               FROM dbo.registro_compras WHERE fecha_emision >= @MesCtxDesde AND fecha_emision < @FinCtx
               GROUP BY YEAR(fecha_emision), MONTH(fecha_emision)) cr
        ON cr.Y = m.Anio AND cr.M = m.Mes
    ORDER BY m.Anio, m.Mes;

    -- ===================== RS8 : Planilla x concepto x mes 13m - nace vacio (D7) =====================
    SELECT
        cpm.n_Anio AS Anio, cpm.n_Mes AS Mes, cpm.v_Concepto AS Concepto,
        CAST(SUM(cpm.d_Monto) AS DECIMAL(18,2)) AS Monto
    FROM conta.costo_personal_mensual cpm
    LEFT JOIN #mapc mc ON mc.i_IdCentroCosto = cpm.i_IdCentroCosto
    WHERE DATEFROMPARTS(cpm.n_Anio, cpm.n_Mes, 1) >= @MesCtxDesde
      AND DATEFROMPARTS(cpm.n_Anio, cpm.n_Mes, 1) <= @MesCtxHasta
      AND (@TiposCaja IS NULL OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(VARCHAR(10), ISNULL(mc.i_IdTipoCaja, 0)) + ',%')
    GROUP BY cpm.n_Anio, cpm.n_Mes, cpm.v_Concepto
    ORDER BY Anio, Mes;

    -- ===================== RS9 : Saldos bancarios (6 cuentas de dbo.documento) =====================
    SELECT
        d.i_CodigoDocumento AS IdCuenta,
        LTRIM(RTRIM(d.v_Nombre)) AS Banco,
        LTRIM(RTRIM(ISNULL(d.v_Siglas, ''))) AS Cuenta,
        CASE WHEN d.v_Siglas LIKE '%$%' THEN 'USD' ELSE 'PEN' END AS Moneda,
        CAST(CASE WHEN LTRIM(RTRIM(ISNULL(d.v_Siglas, ''))) = 'BNN' OR d.v_Nombre LIKE '%NACI%' THEN 1 ELSE 0 END AS BIT) AS EsDetraccion,
        CAST(CASE WHEN d.v_Siglas LIKE '%$%' THEN sb.d_SaldoDolares ELSE sb.d_SaldoSoles END AS DECIMAL(18,2)) AS Saldo,
        CASE WHEN sb.n_Anio IS NULL THEN NULL ELSE sb.n_Anio * 100 + sb.n_Mes END AS AnioMesRef
    FROM dbo.documento d
    OUTER APPLY (
        SELECT TOP 1 s.n_Anio, s.n_Mes, s.d_SaldoSoles, s.d_SaldoDolares
        FROM conta.saldo_banco_mensual s
        WHERE s.i_IdCuentaBancaria = d.i_CodigoDocumento
          AND (s.n_Anio * 100 + s.n_Mes) <= (YEAR(@Hasta) * 100 + MONTH(@Hasta))
        ORDER BY s.n_Anio DESC, s.n_Mes DESC
    ) sb
    WHERE d.i_UsadoTesoreria = 1 AND ISNULL(d.i_Eliminado, 0) = 0 AND d.i_Naturaleza = 3
    ORDER BY d.v_Nombre;

    -- ===================== RS10 : Honorarios x consultorio (rango) - nace vacio hasta PH-1 =====================
    SELECT
        phc.v_ConsultorioNombre AS Consultorio,
        CAST(SUM(phc.d_MontoPago) AS DECIMAL(18,2)) AS Monto,
        COUNT(DISTINCT phc.i_IdPago) AS NumPagos
    FROM conta.pago_honorario_consultorio phc
    JOIN conta.pago_honorario ph ON ph.i_IdPago = phc.i_IdPago
    LEFT JOIN conta.egreso e ON e.i_IdEgreso = phc.i_IdEgreso
    LEFT JOIN #mapc mc ON mc.i_IdCentroCosto = e.i_IdCentroCosto
    WHERE ph.v_Estado <> 'ANULADO'
      AND ph.t_FechaPago >= @Desde AND ph.t_FechaPago < @Fin
      AND (@TiposCaja IS NULL OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(VARCHAR(10), ISNULL(mc.i_IdTipoCaja, 0)) + ',%')
    GROUP BY phc.v_ConsultorioNombre
    ORDER BY Monto DESC;

    -- ===================== RS11 : SISOL liquidaciones (meses del rango) =====================
    -- Solo se muestra si la tipocaja 3 (SISOL) esta marcada (o TODOS = NULL).
    SELECT
        sl.n_Anio AS Anio, sl.n_Mes AS Mes,
        sl.d_VentaNeta AS VentaNeta,
        sl.d_PorcClinica AS PctClinica,
        sl.d_ParticipacionClinica AS MontoClinica,
        sl.d_ParticipacionHospital AS MontoHospital,
        sl.v_Estado AS Estado
    FROM conta.sisol_liquidacion sl
    WHERE DATEFROMPARTS(sl.n_Anio, sl.n_Mes, 1) >= DATEFROMPARTS(YEAR(@Desde), MONTH(@Desde), 1)
      AND DATEFROMPARTS(sl.n_Anio, sl.n_Mes, 1) <= DATEFROMPARTS(YEAR(@Hasta), MONTH(@Hasta), 1)
      AND (@TiposCaja IS NULL OR ',' + @TiposCaja + ',' LIKE '%,3,%')
    ORDER BY sl.n_Anio, sl.n_Mes;
END
GO

-- =====================================================================
-- FASE 3 - Motor de caja (liquidez). Calculos al vuelo sobre las fuentes;
-- conta.saldo_caja solo materializa al cerrar mes. SQL Server 2012.
--   Ingresos: cobranzas reales (dbo.cobranzadetalle.d_ImporteSoles).
--   Egresos:  conta.egreso PAGADO (por t_FechaPago) + costos de personal PAGADOS
--             + egresos de la caja mayor legacy (dbo.cajamayor_movimiento, v_TipoMovimiento='E',
--               efectivo consumado ECA/ECF por t_FechaMovimiento, bruto d_Total, seccion MEDICO).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Ingresos de caja por cobranza (unidad, forma de pago, credito, dia)
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Caja_Ingresos','P') IS NOT NULL DROP PROCEDURE conta.sp_Caja_Ingresos;
GO
CREATE PROCEDURE conta.sp_Caja_Ingresos @Desde DATE, @Hasta DATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @fin DATE = DATEADD(DAY, 1, @Hasta);
    SELECT
        tcct.i_IdTipoCaja,
        tc.v_NombreTipoCaja AS Unidad,
        cd.i_IdFormaPago,
        dh46.v_Value1 AS FormaPago,
        CAST(CASE WHEN dh41.v_Value1 = 'CREDITO' THEN 1 ELSE 0 END AS BIT) AS EsCobranzaCredito,
        CAST(cd.t_InsertaFecha AS DATE) AS Dia,
        SUM(cd.d_ImporteSoles) AS Monto
    FROM dbo.cobranzadetalle cd
    INNER JOIN dbo.venta v ON v.v_IdVenta = cd.v_IdVenta AND ISNULL(v.i_Eliminado,0) = 0
    LEFT JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
    LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = tcct.i_IdTipoCaja
    LEFT JOIN dbo.datahierarchy dh46 ON dh46.i_GroupId = 46 AND dh46.i_ItemId = cd.i_IdFormaPago
    LEFT JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago
    WHERE ISNULL(cd.i_Eliminado,0) = 0
      AND cd.t_InsertaFecha >= @Desde AND cd.t_InsertaFecha < @fin
    GROUP BY tcct.i_IdTipoCaja, tc.v_NombreTipoCaja, cd.i_IdFormaPago, dh46.v_Value1,
             CASE WHEN dh41.v_Value1 = 'CREDITO' THEN 1 ELSE 0 END, CAST(cd.t_InsertaFecha AS DATE);
END
GO

-- ---------------------------------------------------------------------
-- 2) Egresos de caja (egreso PAGADO + costos de personal PAGADOS)
--    Seccion = v_SeccionFlujo de la raiz del arbol de tipo_gasto.
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Caja_Egresos','P') IS NOT NULL DROP PROCEDURE conta.sp_Caja_Egresos;
GO
CREATE PROCEDURE conta.sp_Caja_Egresos @Desde DATE, @Hasta DATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @fin DATE = DATEADD(DAY, 1, @Hasta);
    ;WITH tg_root AS (
        SELECT i_IdTipoGasto, i_IdPadre, v_SeccionFlujo
        FROM conta.tipo_gasto WHERE i_IdPadre IS NULL
        UNION ALL
        SELECT c.i_IdTipoGasto, c.i_IdPadre, r.v_SeccionFlujo
        FROM conta.tipo_gasto c JOIN tg_root r ON c.i_IdPadre = r.i_IdTipoGasto
    )
    SELECT
        ISNULL(r.v_SeccionFlujo, 'OTROS_EGRESOS') AS Seccion,
        e.i_IdCentroCosto,
        cc.v_Nombre AS CentroCosto,
        CAST(e.t_FechaPago AS DATE) AS Dia,
        CAST(CASE WHEN r.v_SeccionFlujo = 'OTROS_INGRESOS' THEN 1 ELSE 0 END AS BIT) AS EsIngreso,
        SUM(e.d_MontoBruto * e.d_TipoCambio) AS Monto
    FROM conta.egreso e
    JOIN tg_root r ON r.i_IdTipoGasto = e.i_IdTipoGasto
    LEFT JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = e.i_IdCentroCosto
    WHERE e.v_Estado = 'PAGADO' AND e.t_FechaPago >= @Desde AND e.t_FechaPago < @fin
    GROUP BY ISNULL(r.v_SeccionFlujo,'OTROS_EGRESOS'), e.i_IdCentroCosto, cc.v_Nombre,
             CAST(e.t_FechaPago AS DATE), CASE WHEN r.v_SeccionFlujo = 'OTROS_INGRESOS' THEN 1 ELSE 0 END

    UNION ALL

    SELECT 'PERSONAL' AS Seccion, cpm.i_IdCentroCosto, cc.v_Nombre AS CentroCosto,
           CAST(cpm.t_FechaPago AS DATE) AS Dia, CAST(0 AS BIT) AS EsIngreso,
           SUM(cpm.d_Monto) AS Monto
    FROM conta.costo_personal_mensual cpm
    LEFT JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = cpm.i_IdCentroCosto
    WHERE cpm.v_Estado = 'PAGADO' AND cpm.t_FechaPago >= @Desde AND cpm.t_FechaPago < @fin
    GROUP BY cpm.i_IdCentroCosto, cc.v_Nombre, CAST(cpm.t_FechaPago AS DATE)

    UNION ALL

    -- Egresos de la caja mayor legacy (dbo.cajamayor_movimiento, v_TipoMovimiento='E'):
    -- efectivo ya consumado (ECA asistencial / ECF farmacia; ~98% pagos a medicos) -> seccion MEDICO.
    -- Monto = d_Total (bruto). Centro por i_IdTipoCaja del movimiento (fallback ADMINISTRACION).
    -- No se filtra por estado: la caja mayor no tiene POR_PAGAR (ya es efectivo).
    SELECT 'MEDICO' AS Seccion,
           ISNULL(cc.i_IdCentroCosto, 1) AS i_IdCentroCosto,
           ISNULL(cc.v_Nombre, 'ADMINISTRACION') AS CentroCosto,
           CAST(cm.t_FechaMovimiento AS DATE) AS Dia,
           CAST(0 AS BIT) AS EsIngreso,
           SUM(cm.d_Total) AS Monto
    FROM dbo.cajamayor_movimiento cm
    LEFT JOIN conta.centro_costo cc ON cc.i_IdTipoCaja = cm.i_IdTipoCaja AND cc.b_Activo = 1
    WHERE cm.v_TipoMovimiento = 'E'
      AND cm.t_FechaMovimiento >= @Desde AND cm.t_FechaMovimiento < @fin
    GROUP BY ISNULL(cc.i_IdCentroCosto,1), ISNULL(cc.v_Nombre,'ADMINISTRACION'), CAST(cm.t_FechaMovimiento AS DATE);
END
GO

-- ---------------------------------------------------------------------
-- 2b) Catalogo dinamico de formas de pago (para el card de filtro del front).
--     Sin parametros. Devuelve solo los medios con uso real en los ultimos 24 meses.
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Caja_FormasPago','P') IS NOT NULL DROP PROCEDURE conta.sp_Caja_FormasPago;
GO
CREATE PROCEDURE conta.sp_Caja_FormasPago
AS
BEGIN
    SET NOCOUNT ON;
    SELECT dh.i_ItemId  AS i_IdFormaPago,
           dh.v_Value1  AS FormaPago
    FROM dbo.datahierarchy dh
    WHERE dh.i_GroupId = 46
      AND EXISTS (SELECT 1 FROM dbo.cobranzadetalle cd
                  WHERE cd.i_IdFormaPago = dh.i_ItemId
                    AND ISNULL(cd.i_Eliminado,0) = 0
                    AND cd.t_InsertaFecha >= DATEADD(MONTH,-24,GETDATE()))
    ORDER BY dh.i_ItemId;
END
GO

-- ---------------------------------------------------------------------
-- 2c) Cuadre de caja diario (detalle de UN dia, estilo reporte SAMBHS).
--     Mismo universo que sp_Caja_Ingresos/sp_Caja_Egresos (tuberia CAJA):
--       RS1 = ingresos del dia a nivel documento (cobranza).
--       RS2 = egresos del dia a nivel registro, 3 fuentes:
--             conta.egreso PAGADO (t_FechaPago) + costo_personal_mensual PAGADO
--             + dbo.cajamayor_movimiento 'E' (efectivo consumado ECA/ECF, bruto d_Total).
--     GATE: SUM(RS1) = Ingresos del dia en sp_Caja_Diaria (mismos filtros);
--           SUM(RS2) = Egresos del dia en sp_Caja_Diaria.
--     @FormasPago (CSV grupo 46; NULL/'' = todos) y @IncluirCredito filtran SOLO
--     los ingresos (RS1) con semantica IDENTICA a sp_Caja_Diaria (D2/D5).
--     Los egresos (RS2) NUNCA se filtran. SQL 2012: patron CSV+LIKE, sin STRING_SPLIT.
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Caja_CuadreDia','P') IS NOT NULL DROP PROCEDURE conta.sp_Caja_CuadreDia;
GO
CREATE PROCEDURE conta.sp_Caja_CuadreDia
    @Fecha          DATE,
    @FormasPago     NVARCHAR(200) = NULL,
    @IncluirCredito BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @fin DATE = DATEADD(DAY, 1, @Fecha);

    -- formas de pago seleccionadas (CSV -> filas contra el catalogo grupo 46).
    -- IDENTICO a sp_Caja_Diaria para garantizar Delta=0 en el filtro (GATE G2).
    DECLARE @fp TABLE (i_IdFormaPago INT PRIMARY KEY);
    IF @FormasPago IS NOT NULL AND LTRIM(RTRIM(@FormasPago)) <> ''
        INSERT INTO @fp
        SELECT dh.i_ItemId FROM dbo.datahierarchy dh
        WHERE dh.i_GroupId = 46
          AND ',' + @FormasPago + ',' LIKE '%,' + CAST(dh.i_ItemId AS VARCHAR(10)) + ',%';

    -- RS1: INGRESOS del dia a nivel documento (cobranza)
    SELECT
        doc.v_Siglas + ' ' + LTRIM(RTRIM(v.v_SerieDocumento)) + '-' + LTRIM(RTRIM(v.v_CorrelativoDocumento)) AS Documento,
        ISNULL(tc.v_NombreTipoCaja, 'SIN UNIDAD')  AS Unidad,
        cd.i_IdFormaPago,
        ISNULL(dh46.v_Value1, 'SIN FORMA DE PAGO') AS FormaPago,
        CAST(CASE WHEN dh41.v_Value1 = 'CREDITO' THEN 1 ELSE 0 END AS BIT) AS EsCobranzaCredito,
        SUM(cd.d_ImporteSoles) AS Monto,
        ISNULL(su.v_UserName, 'SIN CAJERO') AS UsuarioCajero
    FROM dbo.cobranzadetalle cd
    INNER JOIN dbo.venta v        ON v.v_IdVenta = cd.v_IdVenta AND ISNULL(v.i_Eliminado,0) = 0
    LEFT  JOIN dbo.documento doc  ON doc.i_CodigoDocumento = v.i_IdTipoDocumento AND ISNULL(doc.i_Eliminado,0) = 0
    LEFT  JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
    LEFT  JOIN dbo.tipocaja tc    ON tc.i_IdTipoCaja = tcct.i_IdTipoCaja
    LEFT  JOIN dbo.datahierarchy dh46 ON dh46.i_GroupId = 46 AND dh46.i_ItemId = cd.i_IdFormaPago
    LEFT  JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago
    -- usuario que inserto la VENTA (cajero), replicando SAMBHS. dbo.systemuser MISMA BD, PK i_SystemUserId.
    -- SOLO LECTURA sobre dbo; jamas leer v_Password; nunca cross-DB a SigesoftDesarrollo_2 (id-space distinto).
    LEFT  JOIN dbo.systemuser su  ON su.i_SystemUserId = v.i_InsertaIdUsuario
    WHERE ISNULL(cd.i_Eliminado,0) = 0
      AND cd.t_InsertaFecha >= @Fecha AND cd.t_InsertaFecha < @fin
      AND ( @FormasPago IS NULL OR LTRIM(RTRIM(@FormasPago)) = ''
            OR cd.i_IdFormaPago IN (SELECT i_IdFormaPago FROM @fp) )
      AND ( @IncluirCredito = 1 OR ISNULL(dh41.v_Value1,'') <> 'CREDITO' )
    GROUP BY doc.v_Siglas, v.v_SerieDocumento, v.v_CorrelativoDocumento,
             tc.v_NombreTipoCaja, cd.i_IdFormaPago, dh46.v_Value1,
             CASE WHEN dh41.v_Value1 = 'CREDITO' THEN 1 ELSE 0 END,
             v.i_InsertaIdUsuario, su.v_UserName
    ORDER BY FormaPago, Documento;

    -- RS2: EGRESOS del dia a nivel registro (3 fuentes, NUNCA filtrados)
    SELECT * FROM (
        -- 1) egreso conta PAGADO (bruto = d_MontoBruto * d_TipoCambio, igual que sp_Caja_Egresos)
        SELECT 'EGRESO CONTA' AS Origen,
               e.v_SerieNumero AS Documento,
               ISNULL(cc.v_Nombre,'ADMINISTRACION') AS CentroCosto,
               e.v_Glosa AS Concepto,
               e.d_MontoBruto * e.d_TipoCambio AS Monto,
               cc.i_IdTipoCaja,
               ISNULL(tc.v_NombreTipoCaja,'SIN UNIDAD') AS Unidad
        FROM conta.egreso e
        LEFT JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = e.i_IdCentroCosto
        LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = cc.i_IdTipoCaja
        WHERE e.v_Estado = 'PAGADO' AND e.t_FechaPago >= @Fecha AND e.t_FechaPago < @fin

        UNION ALL
        -- 2) costos de personal PAGADOS
        SELECT 'PERSONAL', NULL, ISNULL(cc.v_Nombre,'ADMINISTRACION'),
               cpm.v_Concepto, cpm.d_Monto,
               cc.i_IdTipoCaja,
               ISNULL(tc.v_NombreTipoCaja,'SIN UNIDAD')
        FROM conta.costo_personal_mensual cpm
        LEFT JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = cpm.i_IdCentroCosto
        LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = cc.i_IdTipoCaja
        WHERE cpm.v_Estado = 'PAGADO' AND cpm.t_FechaPago >= @Fecha AND cpm.t_FechaPago < @fin

        UNION ALL
        -- 3) egresos de la caja mayor legacy (efectivo consumado, ECA/ECF; ~98% pagos a medicos).
        --    Documento/Concepto de las columnas PROPIAS del movimiento (mas legibles que el
        --    join a venta: v_NumeroDocumento='ECA-00027737', v_ConceptoMovimiento=glosa real).
        --    Monto = d_Total (bruto), igual que sp_Caja_Egresos/sp_Caja_Diaria. Centro por i_IdTipoCaja.
        SELECT 'CAJA LEGACY',
               LTRIM(RTRIM(cm.v_NumeroDocumento)),
               ISNULL(cc.v_Nombre,'ADMINISTRACION'),
               LTRIM(RTRIM(cm.v_ConceptoMovimiento)),
               cm.d_Total,
               cm.i_IdTipoCaja,
               ISNULL(tc.v_NombreTipoCaja,'SIN UNIDAD')
        FROM dbo.cajamayor_movimiento cm
        LEFT JOIN conta.centro_costo cc ON cc.i_IdTipoCaja = cm.i_IdTipoCaja AND cc.b_Activo = 1
        LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = cm.i_IdTipoCaja
        WHERE cm.v_TipoMovimiento = 'E'
          AND cm.t_FechaMovimiento >= @Fecha AND cm.t_FechaMovimiento < @fin
    ) x ORDER BY x.Origen, x.Documento;
END
GO

-- ---------------------------------------------------------------------
-- 3) Caja diaria del mes (serie diaria + saldo acumulado encadenado)
--    @FormasPago (CSV de ItemIds grupo 46; NULL/'' = todos) y @IncluirCredito
--    filtran SOLO los ingresos (los egresos y el saldo se mantienen totales; D2/D5).
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Caja_Diaria','P') IS NOT NULL DROP PROCEDURE conta.sp_Caja_Diaria;
GO
CREATE PROCEDURE conta.sp_Caja_Diaria @Anio SMALLINT, @Mes TINYINT,
    @FormasPago NVARCHAR(200) = NULL, @IncluirCredito BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ini DATE = DATEFROMPARTS(@Anio, @Mes, 1);
    DECLARE @fin DATE = DATEADD(MONTH, 1, @ini);
    DECLARE @saldoIni DECIMAL(18,2) =
        ISNULL((SELECT d_SaldoInicial + d_MontoInicialNeto FROM conta.saldo_caja WHERE n_Anio=@Anio AND n_Mes=@Mes), 0);

    -- formas de pago seleccionadas (CSV -> filas, contra el catalogo grupo 46, no la tabla de hechos)
    DECLARE @fp TABLE (i_IdFormaPago INT PRIMARY KEY);
    IF @FormasPago IS NOT NULL AND LTRIM(RTRIM(@FormasPago)) <> ''
        INSERT INTO @fp
        SELECT dh.i_ItemId FROM dbo.datahierarchy dh
        WHERE dh.i_GroupId = 46
          AND ',' + @FormasPago + ',' LIKE '%,' + CAST(dh.i_ItemId AS VARCHAR(10)) + ',%';

    -- ingresos por dia (cobranzas) -- filtrados por forma de pago y/o credito
    DECLARE @ing TABLE (Dia DATE PRIMARY KEY, Monto DECIMAL(18,2));
    INSERT INTO @ing
    SELECT CAST(cd.t_InsertaFecha AS DATE), SUM(cd.d_ImporteSoles)
    FROM dbo.cobranzadetalle cd
    INNER JOIN dbo.venta v ON v.v_IdVenta = cd.v_IdVenta AND ISNULL(v.i_Eliminado,0)=0
    LEFT JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago
    WHERE ISNULL(cd.i_Eliminado,0)=0 AND cd.t_InsertaFecha >= @ini AND cd.t_InsertaFecha < @fin
      AND ( @FormasPago IS NULL OR LTRIM(RTRIM(@FormasPago)) = ''
            OR cd.i_IdFormaPago IN (SELECT i_IdFormaPago FROM @fp) )
      AND ( @IncluirCredito = 1 OR ISNULL(dh41.v_Value1,'') <> 'CREDITO' )
    GROUP BY CAST(cd.t_InsertaFecha AS DATE);

    -- egresos por dia (egreso pagado + personal pagado), neto de otros ingresos
    DECLARE @egr TABLE (Dia DATE PRIMARY KEY, Egreso DECIMAL(18,2), OtroIng DECIMAL(18,2));
    ;WITH tg_root AS (
        SELECT i_IdTipoGasto, i_IdPadre, v_SeccionFlujo FROM conta.tipo_gasto WHERE i_IdPadre IS NULL
        UNION ALL
        SELECT c.i_IdTipoGasto, c.i_IdPadre, r.v_SeccionFlujo FROM conta.tipo_gasto c JOIN tg_root r ON c.i_IdPadre=r.i_IdTipoGasto
    ),
    dia_e AS (
        SELECT CAST(e.t_FechaPago AS DATE) AS Dia,
               SUM(CASE WHEN r.v_SeccionFlujo='OTROS_INGRESOS' THEN 0 ELSE e.d_MontoBruto*e.d_TipoCambio END) AS Egreso,
               SUM(CASE WHEN r.v_SeccionFlujo='OTROS_INGRESOS' THEN e.d_MontoBruto*e.d_TipoCambio ELSE 0 END) AS OtroIng
        FROM conta.egreso e JOIN tg_root r ON r.i_IdTipoGasto=e.i_IdTipoGasto
        WHERE e.v_Estado='PAGADO' AND e.t_FechaPago >= @ini AND e.t_FechaPago < @fin
        GROUP BY CAST(e.t_FechaPago AS DATE)
        UNION ALL
        SELECT CAST(cpm.t_FechaPago AS DATE), SUM(cpm.d_Monto), 0
        FROM conta.costo_personal_mensual cpm
        WHERE cpm.v_Estado='PAGADO' AND cpm.t_FechaPago >= @ini AND cpm.t_FechaPago < @fin
        GROUP BY CAST(cpm.t_FechaPago AS DATE)
        UNION ALL
        -- egresos de la caja mayor legacy (efectivo consumado, ECA/ECF) = Egreso; OtroIng 0
        SELECT CAST(cm.t_FechaMovimiento AS DATE), SUM(cm.d_Total), 0
        FROM dbo.cajamayor_movimiento cm
        WHERE cm.v_TipoMovimiento='E' AND cm.t_FechaMovimiento >= @ini AND cm.t_FechaMovimiento < @fin
        GROUP BY CAST(cm.t_FechaMovimiento AS DATE)
    )
    INSERT INTO @egr SELECT Dia, SUM(Egreso), SUM(OtroIng) FROM dia_e GROUP BY Dia;

    -- serie de dias del mes con saldo acumulado
    ;WITH dias AS (
        SELECT @ini AS Dia
        UNION ALL SELECT DATEADD(DAY,1,Dia) FROM dias WHERE DATEADD(DAY,1,Dia) < @fin
    )
    SELECT
        d.Dia,
        ISNULL(i.Monto,0) AS Ingresos,
        ISNULL(e.Egreso,0) AS Egresos,
        ISNULL(e.OtroIng,0) AS OtrosIngresos,
        ISNULL(i.Monto,0) - ISNULL(e.Egreso,0) + ISNULL(e.OtroIng,0) AS FlujoDia,
        @saldoIni + SUM(ISNULL(i.Monto,0) - ISNULL(e.Egreso,0) + ISNULL(e.OtroIng,0))
                    OVER (ORDER BY d.Dia ROWS UNBOUNDED PRECEDING) AS SaldoAcumulado
    FROM dias d
    LEFT JOIN @ing i ON i.Dia = d.Dia
    LEFT JOIN @egr e ON e.Dia = d.Dia
    ORDER BY d.Dia
    OPTION (MAXRECURSION 366);
END
GO

-- ---------------------------------------------------------------------
-- 4) Flujo de caja consolidado anual (mockup 01)
--    Resultset 1: resumen mensual ancho (para totales + cadena de saldos).
--    Resultset 2: ingresos por unidad y mes.  Resultset 3: egresos por seccion y mes.
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Caja_FlujoConsolidado','P') IS NOT NULL DROP PROCEDURE conta.sp_Caja_FlujoConsolidado;
GO
CREATE PROCEDURE conta.sp_Caja_FlujoConsolidado @Anio SMALLINT,
    @FormasPago NVARCHAR(200) = NULL, @IncluirCredito BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @iniAnio DATE = DATEFROMPARTS(@Anio,1,1), @finAnio DATE = DATEFROMPARTS(@Anio+1,1,1);
    DECLARE @apertura DECIMAL(18,2) =
        ISNULL((SELECT d_SaldoInicial + d_MontoInicialNeto FROM conta.saldo_caja WHERE n_Anio=@Anio AND n_Mes=1),0);

    -- formas de pago seleccionadas (CSV -> filas, contra el catalogo grupo 46, no la tabla de hechos)
    DECLARE @fp TABLE (i_IdFormaPago INT PRIMARY KEY);
    IF @FormasPago IS NOT NULL AND LTRIM(RTRIM(@FormasPago)) <> ''
        INSERT INTO @fp
        SELECT dh.i_ItemId FROM dbo.datahierarchy dh
        WHERE dh.i_GroupId = 46
          AND ',' + @FormasPago + ',' LIKE '%,' + CAST(dh.i_ItemId AS VARCHAR(10)) + ',%';

    -- ingresos por mes y unidad -- filtrados por forma de pago y/o credito (solo ingresos; D2)
    DECLARE @ingMes TABLE (Mes TINYINT, i_IdTipoCaja INT, Unidad NVARCHAR(60), EsCredito BIT, Monto DECIMAL(18,2));
    INSERT INTO @ingMes
    SELECT MONTH(cd.t_InsertaFecha), tcct.i_IdTipoCaja, tc.v_NombreTipoCaja,
           CASE WHEN dh41.v_Value1='CREDITO' THEN 1 ELSE 0 END, SUM(cd.d_ImporteSoles)
    FROM dbo.cobranzadetalle cd
    INNER JOIN dbo.venta v ON v.v_IdVenta=cd.v_IdVenta AND ISNULL(v.i_Eliminado,0)=0
    LEFT JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente=v.i_ClienteEsAgente AND tcct.b_Activo=1
    LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja=tcct.i_IdTipoCaja
    LEFT JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId=41 AND dh41.i_ItemId=v.i_IdCondicionPago
    WHERE ISNULL(cd.i_Eliminado,0)=0 AND cd.t_InsertaFecha >= @iniAnio AND cd.t_InsertaFecha < @finAnio
      AND ( @FormasPago IS NULL OR LTRIM(RTRIM(@FormasPago)) = ''
            OR cd.i_IdFormaPago IN (SELECT i_IdFormaPago FROM @fp) )
      AND ( @IncluirCredito = 1 OR dh41.v_Value1 IS NULL OR dh41.v_Value1 <> 'CREDITO' )
    GROUP BY MONTH(cd.t_InsertaFecha), tcct.i_IdTipoCaja, tc.v_NombreTipoCaja, CASE WHEN dh41.v_Value1='CREDITO' THEN 1 ELSE 0 END;

    -- egresos por mes y seccion
    DECLARE @egrMes TABLE (Mes TINYINT, Seccion NVARCHAR(20), Monto DECIMAL(18,2));
    ;WITH tg_root AS (
        SELECT i_IdTipoGasto, i_IdPadre, v_SeccionFlujo FROM conta.tipo_gasto WHERE i_IdPadre IS NULL
        UNION ALL
        SELECT c.i_IdTipoGasto, c.i_IdPadre, r.v_SeccionFlujo FROM conta.tipo_gasto c JOIN tg_root r ON c.i_IdPadre=r.i_IdTipoGasto
    )
    INSERT INTO @egrMes
    SELECT MONTH(e.t_FechaPago), ISNULL(r.v_SeccionFlujo,'OTROS_EGRESOS'), SUM(e.d_MontoBruto*e.d_TipoCambio)
    FROM conta.egreso e JOIN tg_root r ON r.i_IdTipoGasto=e.i_IdTipoGasto
    WHERE e.v_Estado='PAGADO' AND e.t_FechaPago >= @iniAnio AND e.t_FechaPago < @finAnio
    GROUP BY MONTH(e.t_FechaPago), ISNULL(r.v_SeccionFlujo,'OTROS_EGRESOS');
    INSERT INTO @egrMes
    SELECT MONTH(cpm.t_FechaPago), 'PERSONAL', SUM(cpm.d_Monto)
    FROM conta.costo_personal_mensual cpm
    WHERE cpm.v_Estado='PAGADO' AND cpm.t_FechaPago >= @iniAnio AND cpm.t_FechaPago < @finAnio
    GROUP BY MONTH(cpm.t_FechaPago);
    -- egresos de la caja mayor legacy (efectivo consumado; ~98% pagos a medicos ECA) -> seccion MEDICO
    INSERT INTO @egrMes
    SELECT MONTH(cm.t_FechaMovimiento), 'MEDICO', SUM(cm.d_Total)
    FROM dbo.cajamayor_movimiento cm
    WHERE cm.v_TipoMovimiento='E' AND cm.t_FechaMovimiento >= @iniAnio AND cm.t_FechaMovimiento < @finAnio
    GROUP BY MONTH(cm.t_FechaMovimiento);

    -- resumen mensual ancho con cadena de saldos
    ;WITH meses AS (
        SELECT 1 AS Mes UNION ALL SELECT Mes+1 FROM meses WHERE Mes < 12
    ),
    agg AS (
        SELECT m.Mes,
            ISNULL((SELECT SUM(Monto) FROM @ingMes WHERE Mes=m.Mes),0) AS IngresosOp,
            ISNULL((SELECT SUM(Monto) FROM @egrMes WHERE Mes=m.Mes AND Seccion='PERSONAL'),0) AS EgrPersonal,
            ISNULL((SELECT SUM(Monto) FROM @egrMes WHERE Mes=m.Mes AND Seccion='ADMIN'),0) AS EgrAdmin,
            ISNULL((SELECT SUM(Monto) FROM @egrMes WHERE Mes=m.Mes AND Seccion='MEDICO'),0) AS EgrMedico,
            ISNULL((SELECT SUM(Monto) FROM @egrMes WHERE Mes=m.Mes AND Seccion='TRIBUTOS'),0) AS EgrTributos,
            ISNULL((SELECT SUM(Monto) FROM @egrMes WHERE Mes=m.Mes AND Seccion='RENTA'),0) AS EgrRenta,
            ISNULL((SELECT SUM(Monto) FROM @egrMes WHERE Mes=m.Mes AND Seccion='INVERSION'),0) AS Inversion,
            ISNULL((SELECT SUM(Monto) FROM @egrMes WHERE Mes=m.Mes AND Seccion='FINANCIAMIENTO'),0) AS Financiamiento,
            ISNULL((SELECT SUM(Monto) FROM @egrMes WHERE Mes=m.Mes AND Seccion='OTROS_EGRESOS'),0) AS OtrosEgresos,
            ISNULL((SELECT SUM(Monto) FROM @egrMes WHERE Mes=m.Mes AND Seccion='OTROS_INGRESOS'),0) AS OtrosIngresos
        FROM meses m
    ),
    calc AS (
        SELECT *,
            (EgrPersonal+EgrAdmin+EgrMedico+EgrTributos+EgrRenta) AS TotalEgresosOp,
            (IngresosOp - (EgrPersonal+EgrAdmin+EgrMedico+EgrTributos+EgrRenta)) AS FlujoOperativo,
            (IngresosOp - (EgrPersonal+EgrAdmin+EgrMedico+EgrTributos+EgrRenta) - Inversion - Financiamiento - OtrosEgresos + OtrosIngresos) AS SaldoDeCaja
        FROM agg
    )
    SELECT
        c.Mes, c.IngresosOp, c.EgrPersonal, c.EgrAdmin, c.EgrMedico, c.EgrTributos, c.EgrRenta,
        c.TotalEgresosOp, c.FlujoOperativo, c.Inversion,
        (c.FlujoOperativo - c.Inversion) AS CajaOpInversion,
        c.Financiamiento,
        (c.FlujoOperativo - c.Inversion - c.Financiamiento) AS CajaOpFinanciamiento,
        c.OtrosEgresos, c.OtrosIngresos, c.SaldoDeCaja,
        @apertura + ISNULL(SUM(c.SaldoDeCaja) OVER (ORDER BY c.Mes ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS SaldoInicial,
        @apertura + SUM(c.SaldoDeCaja) OVER (ORDER BY c.Mes ROWS UNBOUNDED PRECEDING) AS SaldoFinal
    FROM calc c
    ORDER BY c.Mes
    OPTION (MAXRECURSION 20);

    -- resultset 2: ingresos por unidad y mes
    SELECT Mes, i_IdTipoCaja, ISNULL(Unidad,'SIN UNIDAD') AS Unidad, EsCredito, SUM(Monto) AS Monto
    FROM @ingMes GROUP BY Mes, i_IdTipoCaja, Unidad, EsCredito ORDER BY Mes, Unidad;

    -- resultset 3: egresos por seccion y mes
    SELECT Mes, Seccion, SUM(Monto) AS Monto FROM @egrMes GROUP BY Mes, Seccion ORDER BY Mes, Seccion;
END
GO

-- ---------------------------------------------------------------------
-- 4b) Flujo de caja DETALLADO anual (mockups 02/03).
--     SOLO detalle: la cola (flujo operativo/cajas/saldos) la aporta
--     sp_Caja_FlujoConsolidado (D1). Mismo universo/filtros que el consolidado:
--     GATE = cada bloque suma su linea del consolidado (Delta=0).
--       RS1 ingresos  mes x unidad x forma de pago (+EsCredito)  -- @FormasPago/@IncluirCredito SOLO aqui
--       RS2 personal  mes x unidad x concepto (walk mapc)        -- NUNCA se filtra
--       RS3 egresos   mes x seccion x hoja (+entidad D7) + MED-LEG legacy -- NUNCA se filtra
--       RS4 catalogo  todas las hojas de conta.tipo_gasto (para pintar 0)
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Caja_FlujoDetallado','P') IS NOT NULL DROP PROCEDURE conta.sp_Caja_FlujoDetallado;
GO
CREATE PROCEDURE conta.sp_Caja_FlujoDetallado @Anio SMALLINT,
    @FormasPago NVARCHAR(200) = NULL, @IncluirCredito BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @iniAnio DATE = DATEFROMPARTS(@Anio,1,1), @finAnio DATE = DATEFROMPARTS(@Anio+1,1,1);

    -- formas de pago seleccionadas (CSV -> filas, contra el catalogo grupo 46, no la tabla de hechos).
    -- IDENTICO a sp_Caja_FlujoConsolidado para garantizar Delta=0 en el filtro (GATE G4).
    DECLARE @fp TABLE (i_IdFormaPago INT PRIMARY KEY);
    IF @FormasPago IS NOT NULL AND LTRIM(RTRIM(@FormasPago)) <> ''
        INSERT INTO @fp
        SELECT dh.i_ItemId FROM dbo.datahierarchy dh
        WHERE dh.i_GroupId = 46
          AND ',' + @FormasPago + ',' LIKE '%,' + CAST(dh.i_ItemId AS VARCHAR(10)) + ',%';

    -- RS1: INGRESOS mes x unidad x forma de pago (+EsCredito).
    -- Mismo FROM/WHERE que @ingMes del consolidado AGREGANDO dh46 (forma de pago, grupo 46).
    -- @FormasPago/@IncluirCredito filtran SOLO este RS, con semantica IDENTICA al consolidado.
    SELECT MONTH(cd.t_InsertaFecha) AS Mes,
           tcct.i_IdTipoCaja,
           ISNULL(tc.v_NombreTipoCaja,'SIN UNIDAD') AS Unidad,
           cd.i_IdFormaPago,
           ISNULL(dh46.v_Value1,'SIN FORMA DE PAGO') AS FormaPago,
           CAST(CASE WHEN dh41.v_Value1='CREDITO' THEN 1 ELSE 0 END AS BIT) AS EsCredito,
           SUM(cd.d_ImporteSoles) AS Monto
    FROM dbo.cobranzadetalle cd
    INNER JOIN dbo.venta v ON v.v_IdVenta=cd.v_IdVenta AND ISNULL(v.i_Eliminado,0)=0
    LEFT JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente=v.i_ClienteEsAgente AND tcct.b_Activo=1
    LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja=tcct.i_IdTipoCaja
    LEFT JOIN dbo.datahierarchy dh46 ON dh46.i_GroupId=46 AND dh46.i_ItemId=cd.i_IdFormaPago
    LEFT JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId=41 AND dh41.i_ItemId=v.i_IdCondicionPago
    WHERE ISNULL(cd.i_Eliminado,0)=0 AND cd.t_InsertaFecha >= @iniAnio AND cd.t_InsertaFecha < @finAnio
      AND ( @FormasPago IS NULL OR LTRIM(RTRIM(@FormasPago)) = ''
            OR cd.i_IdFormaPago IN (SELECT i_IdFormaPago FROM @fp) )
      AND ( @IncluirCredito = 1 OR dh41.v_Value1 IS NULL OR dh41.v_Value1 <> 'CREDITO' )
    GROUP BY MONTH(cd.t_InsertaFecha), tcct.i_IdTipoCaja, tc.v_NombreTipoCaja,
             cd.i_IdFormaPago, dh46.v_Value1, CASE WHEN dh41.v_Value1='CREDITO' THEN 1 ELSE 0 END
    ORDER BY Mes, Unidad, FormaPago, EsCredito;

    -- RS2: PERSONAL mes x unidad x concepto (PAGADO por t_FechaPago). NO se filtra por formas/credito.
    -- Unidad = tipocaja del centro via walk mapc (identico a 05_rentabilidad fn_Rentabilidad_Gastos);
    -- centro sin unidad -> 'ADMINISTRACION' (D6).
    ;WITH walk AS (
        SELECT c.i_IdCentroCosto AS origen, c.i_IdPadre, c.i_IdTipoCaja
        FROM conta.centro_costo c
        UNION ALL
        SELECT w.origen, p.i_IdPadre, p.i_IdTipoCaja
        FROM walk w JOIN conta.centro_costo p ON p.i_IdCentroCosto = w.i_IdPadre
        WHERE w.i_IdTipoCaja IS NULL
    ),
    mapc AS (
        SELECT origen AS i_IdCentroCosto, MAX(i_IdTipoCaja) AS i_IdTipoCaja
        FROM walk GROUP BY origen
    )
    SELECT MONTH(cpm.t_FechaPago) AS Mes,
           ISNULL(tc.v_NombreTipoCaja,'ADMINISTRACION') AS Unidad,
           cpm.v_Concepto AS Concepto,
           SUM(cpm.d_Monto) AS Monto
    FROM conta.costo_personal_mensual cpm
    LEFT JOIN mapc m ON m.i_IdCentroCosto = cpm.i_IdCentroCosto
    LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = m.i_IdTipoCaja
    WHERE cpm.v_Estado='PAGADO' AND cpm.t_FechaPago >= @iniAnio AND cpm.t_FechaPago < @finAnio
    GROUP BY MONTH(cpm.t_FechaPago), tc.v_NombreTipoCaja, cpm.v_Concepto
    ORDER BY Mes, Unidad, Concepto
    OPTION (MAXRECURSION 100);

    -- RS3: EGRESOS mes x seccion x hoja (+entidad D7). NO se filtra por formas/credito.
    -- Base = MISMO universo de egresos del consolidado (conta.egreso por seccion via tg_root) PERO
    -- conservando el nodo hoja (e.i_IdTipoGasto -> v_Codigo/v_Nombre); si el egreso apunta a un nodo
    -- raiz -> hoja '(SIN RUBRO)'. + linea legacy MED-LEG (cajamayor 'E', mismo universo/bruto d_Total).
    ;WITH tg_root AS (
        SELECT i_IdTipoGasto, i_IdPadre, v_SeccionFlujo FROM conta.tipo_gasto WHERE i_IdPadre IS NULL
        UNION ALL
        SELECT c.i_IdTipoGasto, c.i_IdPadre, r.v_SeccionFlujo FROM conta.tipo_gasto c JOIN tg_root r ON c.i_IdPadre=r.i_IdTipoGasto
    )
    SELECT MONTH(e.t_FechaPago) AS Mes,
           ISNULL(r.v_SeccionFlujo,'OTROS_EGRESOS') AS Seccion,
           CASE WHEN tg.i_IdPadre IS NULL THEN '(SIN RUBRO)' ELSE tg.v_Codigo END AS CodigoHoja,
           CASE WHEN tg.i_IdPadre IS NULL THEN '(SIN RUBRO)' ELSE tg.v_Nombre END AS Hoja,
           e.i_IdEntidad,
           ent.v_Nombre AS Entidad,
           SUM(e.d_MontoBruto * e.d_TipoCambio) AS Monto
    FROM conta.egreso e
    JOIN tg_root r ON r.i_IdTipoGasto = e.i_IdTipoGasto
    JOIN conta.tipo_gasto tg ON tg.i_IdTipoGasto = e.i_IdTipoGasto
    LEFT JOIN conta.entidad ent ON ent.i_IdEntidad = e.i_IdEntidad
    WHERE e.v_Estado='PAGADO' AND e.t_FechaPago >= @iniAnio AND e.t_FechaPago < @finAnio
    GROUP BY MONTH(e.t_FechaPago), ISNULL(r.v_SeccionFlujo,'OTROS_EGRESOS'),
             CASE WHEN tg.i_IdPadre IS NULL THEN '(SIN RUBRO)' ELSE tg.v_Codigo END,
             CASE WHEN tg.i_IdPadre IS NULL THEN '(SIN RUBRO)' ELSE tg.v_Nombre END,
             e.i_IdEntidad, ent.v_Nombre

    UNION ALL

    SELECT MONTH(cm.t_FechaMovimiento) AS Mes,
           'MEDICO' AS Seccion,
           'MED-LEG' AS CodigoHoja,
           'PAGOS MEDICOS (CAJA LEGACY)' AS Hoja,
           CAST(NULL AS INT) AS i_IdEntidad,
           CAST(NULL AS NVARCHAR(400)) AS Entidad,
           SUM(cm.d_Total) AS Monto
    FROM dbo.cajamayor_movimiento cm
    WHERE cm.v_TipoMovimiento='E' AND cm.t_FechaMovimiento >= @iniAnio AND cm.t_FechaMovimiento < @finAnio
    GROUP BY MONTH(cm.t_FechaMovimiento)
    ORDER BY Mes, Seccion, CodigoHoja
    OPTION (MAXRECURSION 100);

    -- RS4: CATALOGO de hojas (esqueleto para el front, D2). Todas las hojas aunque valgan 0.
    SELECT r.v_SeccionFlujo AS Seccion, h.v_Codigo AS CodigoHoja, h.v_Nombre AS Hoja,
           h.i_IdTipoGasto AS Orden
    FROM conta.tipo_gasto h JOIN conta.tipo_gasto r ON r.i_IdTipoGasto = h.i_IdPadre
    ORDER BY r.i_IdTipoGasto, h.i_IdTipoGasto;
END
GO

-- ---------------------------------------------------------------------
-- 5) Apertura (solo primer periodo de la cadena)
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_SaldoCaja_SetApertura','P') IS NOT NULL DROP PROCEDURE conta.sp_SaldoCaja_SetApertura;
GO
CREATE PROCEDURE conta.sp_SaldoCaja_SetApertura
    @Anio SMALLINT, @Mes TINYINT, @SaldoInicial DECIMAL(18,2), @MontoInicialNeto DECIMAL(18,2), @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM conta.saldo_caja WHERE n_Anio=@Anio AND n_Mes=@Mes)
        UPDATE conta.saldo_caja SET d_SaldoInicial=@SaldoInicial, d_MontoInicialNeto=@MontoInicialNeto,
               i_ActualizaIdUsuario=@IdUsuario, t_ActualizaFecha=GETDATE()
        WHERE n_Anio=@Anio AND n_Mes=@Mes;
    ELSE
        INSERT INTO conta.saldo_caja (n_Anio, n_Mes, d_SaldoInicial, d_MontoInicialNeto, i_ActualizaIdUsuario, t_ActualizaFecha)
        VALUES (@Anio, @Mes, @SaldoInicial, @MontoInicialNeto, @IdUsuario, GETDATE());
    SELECT 1 AS ok;
END
GO

-- ---------------------------------------------------------------------
-- 6) Cerrar mes: materializa y encadena el saldo inicial del mes siguiente
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Caja_CerrarMes','P') IS NOT NULL DROP PROCEDURE conta.sp_Caja_CerrarMes;
GO
CREATE PROCEDURE conta.sp_Caja_CerrarMes @Anio SMALLINT, @Mes TINYINT, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @ini DATE = DATEFROMPARTS(@Anio,@Mes,1), @fin DATE = DATEADD(MONTH,1,DATEFROMPARTS(@Anio,@Mes,1));

    DECLARE @ingresos DECIMAL(18,2) =
        ISNULL((SELECT SUM(cd.d_ImporteSoles)
                FROM dbo.cobranzadetalle cd
                INNER JOIN dbo.venta v ON v.v_IdVenta=cd.v_IdVenta AND ISNULL(v.i_Eliminado,0)=0
                WHERE ISNULL(cd.i_Eliminado,0)=0 AND cd.t_InsertaFecha >= @ini AND cd.t_InsertaFecha < @fin),0);

    DECLARE @egresos DECIMAL(18,2) = 0, @otrosIng DECIMAL(18,2) = 0;
    ;WITH tg_root AS (
        SELECT i_IdTipoGasto, i_IdPadre, v_SeccionFlujo FROM conta.tipo_gasto WHERE i_IdPadre IS NULL
        UNION ALL
        SELECT c.i_IdTipoGasto, c.i_IdPadre, r.v_SeccionFlujo FROM conta.tipo_gasto c JOIN tg_root r ON c.i_IdPadre=r.i_IdTipoGasto
    )
    SELECT
        @egresos = ISNULL(SUM(CASE WHEN r.v_SeccionFlujo='OTROS_INGRESOS' THEN 0 ELSE e.d_MontoBruto*e.d_TipoCambio END),0),
        @otrosIng = ISNULL(SUM(CASE WHEN r.v_SeccionFlujo='OTROS_INGRESOS' THEN e.d_MontoBruto*e.d_TipoCambio ELSE 0 END),0)
    FROM conta.egreso e JOIN tg_root r ON r.i_IdTipoGasto=e.i_IdTipoGasto
    WHERE e.v_Estado='PAGADO' AND e.t_FechaPago >= @ini AND e.t_FechaPago < @fin;

    DECLARE @egrPers DECIMAL(18,2) =
        ISNULL((SELECT SUM(d_Monto) FROM conta.costo_personal_mensual
                WHERE v_Estado='PAGADO' AND t_FechaPago >= @ini AND t_FechaPago < @fin),0);
    -- egresos de la caja mayor legacy (efectivo consumado, ECA/ECF) por t_FechaMovimiento (bruto d_Total)
    DECLARE @egrLegacy DECIMAL(18,2) =
        ISNULL((SELECT SUM(cm.d_Total) FROM dbo.cajamayor_movimiento cm
                WHERE cm.v_TipoMovimiento='E' AND cm.t_FechaMovimiento >= @ini AND cm.t_FechaMovimiento < @fin),0);
    SET @egresos = @egresos + @egrPers + @egrLegacy;

    BEGIN TRAN;
        -- asegurar fila del mes
        IF NOT EXISTS (SELECT 1 FROM conta.saldo_caja WHERE n_Anio=@Anio AND n_Mes=@Mes)
            INSERT INTO conta.saldo_caja (n_Anio, n_Mes) VALUES (@Anio, @Mes);

        DECLARE @saldoIni DECIMAL(18,2), @montoNeto DECIMAL(18,2);
        SELECT @saldoIni = d_SaldoInicial, @montoNeto = d_MontoInicialNeto
        FROM conta.saldo_caja WHERE n_Anio=@Anio AND n_Mes=@Mes;

        DECLARE @saldoFin DECIMAL(18,2) = @saldoIni + @montoNeto + @ingresos - @egresos + @otrosIng;

        UPDATE conta.saldo_caja
        SET d_IngresosCaja=@ingresos, d_EgresosCaja=@egresos, d_OtrosIngresos=@otrosIng,
            d_SaldoFinal=@saldoFin, b_Cerrado=1, i_ActualizaIdUsuario=@IdUsuario, t_ActualizaFecha=GETDATE()
        WHERE n_Anio=@Anio AND n_Mes=@Mes;

        -- Encadenar hacia adelante: fija el saldo inicial de los meses siguientes.
        -- Si un mes siguiente ya esta cerrado, recomputa su saldo final con sus flujos
        -- materializados y sigue la cadena (respuesta 3: recalcula hacia adelante).
        DECLARE @cAnio SMALLINT = CASE WHEN @Mes=12 THEN @Anio+1 ELSE @Anio END;
        DECLARE @cMes  TINYINT  = CASE WHEN @Mes=12 THEN 1 ELSE @Mes+1 END;
        DECLARE @prevFinal DECIMAL(18,2) = @saldoFin;
        DECLARE @loop INT = 0;
        WHILE @loop < 240
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM conta.saldo_caja WHERE n_Anio=@cAnio AND n_Mes=@cMes)
            BEGIN
                INSERT INTO conta.saldo_caja (n_Anio, n_Mes, d_SaldoInicial) VALUES (@cAnio, @cMes, @prevFinal);
                BREAK;
            END
            UPDATE conta.saldo_caja SET d_SaldoInicial=@prevFinal, i_ActualizaIdUsuario=@IdUsuario, t_ActualizaFecha=GETDATE()
            WHERE n_Anio=@cAnio AND n_Mes=@cMes;
            IF EXISTS (SELECT 1 FROM conta.saldo_caja WHERE n_Anio=@cAnio AND n_Mes=@cMes AND b_Cerrado=1)
            BEGIN
                UPDATE conta.saldo_caja
                SET d_SaldoFinal = @prevFinal + d_MontoInicialNeto + d_IngresosCaja - d_EgresosCaja + d_OtrosIngresos
                WHERE n_Anio=@cAnio AND n_Mes=@cMes;
                SELECT @prevFinal = d_SaldoFinal FROM conta.saldo_caja WHERE n_Anio=@cAnio AND n_Mes=@cMes;
                SET @cAnio = CASE WHEN @cMes=12 THEN @cAnio+1 ELSE @cAnio END;
                SET @cMes  = CASE WHEN @cMes=12 THEN 1 ELSE @cMes+1 END;
                SET @loop = @loop + 1;
            END
            ELSE BREAK;
        END
    COMMIT TRAN;

    EXEC conta.sp_Auditoria_Insert 'conta.saldo_caja', @Mes, 'CERRAR_MES', 'Cierre de caja', @IdUsuario;
    SELECT @ingresos AS ingresos, @egresos AS egresos, @otrosIng AS otrosIngresos, @saldoFin AS saldoFinal;
END
GO

-- ---------------------------------------------------------------------
-- 7) Reabrir mes (solo SA a nivel API)
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Caja_ReabrirMes','P') IS NOT NULL DROP PROCEDURE conta.sp_Caja_ReabrirMes;
GO
CREATE PROCEDURE conta.sp_Caja_ReabrirMes @Anio SMALLINT, @Mes TINYINT, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.saldo_caja SET b_Cerrado=0, i_ActualizaIdUsuario=@IdUsuario, t_ActualizaFecha=GETDATE()
    WHERE n_Anio=@Anio AND n_Mes=@Mes;
    EXEC conta.sp_Auditoria_Insert 'conta.saldo_caja', @Mes, 'REABRIR_MES', 'Reapertura', @IdUsuario;
    SELECT @@ROWCOUNT AS ok;
END
GO

-- ---------------------------------------------------------------------
-- 8) Saldos bancarios mensuales (CRUD basico)
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_SaldoBanco_List','P') IS NOT NULL DROP PROCEDURE conta.sp_SaldoBanco_List;
GO
-- DEPRECADO conta.cuenta_bancaria (ver ddl/09_deprecate_cuenta_bancaria.sql): las cuentas
-- se leen del catalogo legacy dbo.documento (solo bancos, i_Naturaleza=3). Contrato de
-- columnas identico; i_IdCuentaBancaria = dbo.documento.i_CodigoDocumento. saldo_banco_mensual
-- conserva su columna i_IdCuentaBancaria (ya sin FK). SELECT a dbo = lectura permitida.
CREATE PROCEDURE conta.sp_SaldoBanco_List @Anio SMALLINT, @Mes TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT sb.i_Id, sb.n_Anio, sb.n_Mes,
           d.i_CodigoDocumento                                      AS i_IdCuentaBancaria,
           LTRIM(RTRIM(d.v_Nombre))                                 AS v_Banco,
           LTRIM(RTRIM(ISNULL(d.v_Siglas,'')))                      AS v_NroCuenta,
           CASE WHEN d.v_Siglas LIKE '%$%' THEN 'USD' ELSE 'PEN' END AS v_Moneda,
           sb.d_SaldoSoles, sb.d_SaldoDolares
    FROM dbo.documento d
    LEFT JOIN conta.saldo_banco_mensual sb
      ON sb.i_IdCuentaBancaria = d.i_CodigoDocumento AND sb.n_Anio = @Anio AND sb.n_Mes = @Mes
    WHERE d.i_UsadoTesoreria = 1
      AND ISNULL(d.i_Eliminado,0) = 0
      AND d.i_Naturaleza = 3
    ORDER BY d.v_Nombre;
END
GO

IF OBJECT_ID('conta.sp_SaldoBanco_Upsert','P') IS NOT NULL DROP PROCEDURE conta.sp_SaldoBanco_Upsert;
GO
CREATE PROCEDURE conta.sp_SaldoBanco_Upsert
    @Anio SMALLINT, @Mes TINYINT, @IdCuentaBancaria INT, @SaldoSoles DECIMAL(18,2), @SaldoDolares DECIMAL(18,2), @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM conta.saldo_banco_mensual WHERE n_Anio=@Anio AND n_Mes=@Mes AND i_IdCuentaBancaria=@IdCuentaBancaria)
        UPDATE conta.saldo_banco_mensual SET d_SaldoSoles=@SaldoSoles, d_SaldoDolares=@SaldoDolares,
               i_ActualizaIdUsuario=@IdUsuario, t_ActualizaFecha=GETDATE()
        WHERE n_Anio=@Anio AND n_Mes=@Mes AND i_IdCuentaBancaria=@IdCuentaBancaria;
    ELSE
        INSERT INTO conta.saldo_banco_mensual (n_Anio, n_Mes, i_IdCuentaBancaria, d_SaldoSoles, d_SaldoDolares, i_ActualizaIdUsuario, t_ActualizaFecha)
        VALUES (@Anio, @Mes, @IdCuentaBancaria, @SaldoSoles, @SaldoDolares, @IdUsuario, GETDATE());
    SELECT 1 AS ok;
END
GO

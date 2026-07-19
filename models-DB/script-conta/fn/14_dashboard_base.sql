-- =============================================================================
-- 14_dashboard_base.sql  -  Capa BD del DASHBOARD GERENCIAL / CONTABLE (FASE 1)
-- Plan: models-DB/docs/PLAN_DASHBOARD_GERENCIAL_CONTABLE.md  (secciones 5.2)
--
-- 3 iTVF keystone (solo lectura, sin efectos):
--   conta.fn_Dash_VentaBase     - facturado (universo RENTABILIDAD, 4 filtros)
--   conta.fn_Dash_CobranzaBase  - cobrado   (universo CAJA, port sp_Caja_Ingresos)
--   conta.fn_Dash_EgresoBase    - egresos 3 fuentes (LEGACY / CONTA / PLANILLA)
--
-- SQL Server 2012: sin CREATE OR ALTER / STRING_SPLIT / DROP IF EXISTS.
-- Rango medio-abierto SIEMPRE: fecha >= @Desde AND fecha < DATEADD(DAY,1,@Hasta).
-- Filtro multi-tipocaja = CSV+LIKE sobre el IdTipoCaja resuelto (bucket 0 solo con NULL).
-- Logica portada desde sys.sql_modules (VIVO), no del repo (hecho de oro #3).
-- dbo: SOLO SELECT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- fn_Dash_VentaBase : 1 fila por linea de ventadetalle. Universo RENTABILIDAD:
-- los 4 filtros canonicos de ventas + vd.i_Eliminado=0 + rango sobre v.t_InsertaFecha.
-- (port de fn_Rentabilidad_IngresosDetalleEx / fn_Rentabilidad_IngresosEx VIVAS)
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'conta.fn_Dash_VentaBase', N'IF') IS NOT NULL
    DROP FUNCTION conta.fn_Dash_VentaBase;
GO
CREATE FUNCTION conta.fn_Dash_VentaBase
    (@Desde DATE, @Hasta DATE, @TiposCaja NVARCHAR(50))
RETURNS TABLE
AS
RETURN (
    SELECT
        v.t_InsertaFecha                                    AS Fecha,
        v.v_IdVenta                                         AS IdVenta,
        ISNULL(tcct.i_IdTipoCaja, 0)                        AS IdTipoCaja,
        ISNULL(tc.v_NombreTipoCaja, '(SIN UNIDAD)')         AS Unidad,
        vd.d_Valor                                          AS ValorNeto,
        vd.d_PrecioVenta                                    AS PrecioBruto,
        CAST(CASE WHEN v.i_IdCondicionPago = 2 THEN 1 ELSE 0 END AS BIT) AS EsCredito
    FROM dbo.venta v
    JOIN dbo.ventadetalle vd
        ON vd.v_IdVenta = v.v_IdVenta AND ISNULL(vd.i_Eliminado, 0) = 0
    LEFT JOIN dbo.tipocaja_clientetipo tcct
        ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
    LEFT JOIN dbo.tipocaja tc
        ON tc.i_IdTipoCaja = tcct.i_IdTipoCaja
    WHERE ISNULL(v.i_Eliminado, 0) = 0
      AND v.t_InsertaFecha >= @Desde
      AND v.t_InsertaFecha <  DATEADD(DAY, 1, @Hasta)
      AND v.i_ClienteEsAgente IS NOT NULL
      AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3, 4))
      AND ISNULL(v.v_SerieDocumento, '') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')
      AND (@TiposCaja IS NULL
           OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(VARCHAR(10), ISNULL(tcct.i_IdTipoCaja, 0)) + ',%')
);
GO

-- -----------------------------------------------------------------------------
-- fn_Dash_CobranzaBase : 1 fila por cobranzadetalle. Universo CAJA (port de
-- sp_Caja_Ingresos VIVO): cd.i_Eliminado=0 + INNER JOIN venta (v.i_Eliminado=0),
-- SIN los 4 filtros, rango sobre cd.t_InsertaFecha. Atribucion tipocaja via venta.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'conta.fn_Dash_CobranzaBase', N'IF') IS NOT NULL
    DROP FUNCTION conta.fn_Dash_CobranzaBase;
GO
CREATE FUNCTION conta.fn_Dash_CobranzaBase
    (@Desde DATE, @Hasta DATE, @TiposCaja NVARCHAR(50))
RETURNS TABLE
AS
RETURN (
    SELECT
        cd.t_InsertaFecha                                   AS Fecha,
        ISNULL(tcct.i_IdTipoCaja, 0)                        AS IdTipoCaja,
        ISNULL(tc.v_NombreTipoCaja, '(SIN UNIDAD)')         AS Unidad,
        cd.d_ImporteSoles                                   AS Importe,
        cd.i_IdFormaPago                                    AS IdFormaPago,
        dh46.v_Value1                                       AS FormaPago,
        CAST(CASE WHEN v.i_IdCondicionPago = 2 THEN 1 ELSE 0 END AS BIT) AS EsCobranzaCredito
    FROM dbo.cobranzadetalle cd
    INNER JOIN dbo.venta v
        ON v.v_IdVenta = cd.v_IdVenta AND ISNULL(v.i_Eliminado, 0) = 0
    LEFT JOIN dbo.tipocaja_clientetipo tcct
        ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
    LEFT JOIN dbo.tipocaja tc
        ON tc.i_IdTipoCaja = tcct.i_IdTipoCaja
    LEFT JOIN dbo.datahierarchy dh46
        ON dh46.i_GroupId = 46 AND dh46.i_ItemId = cd.i_IdFormaPago
    WHERE ISNULL(cd.i_Eliminado, 0) = 0
      AND cd.t_InsertaFecha >= @Desde
      AND cd.t_InsertaFecha <  DATEADD(DAY, 1, @Hasta)
      AND (@TiposCaja IS NULL
           OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(VARCHAR(10), ISNULL(tcct.i_IdTipoCaja, 0)) + ',%')
);
GO

-- -----------------------------------------------------------------------------
-- fn_Dash_EgresoBase : UNION ALL de 3 fuentes de egreso (port de fn_Rentabilidad_Gastos
-- y sp_Caja_Egresos VIVOS). @Base = 'C' (caja, fecha de pago) | 'D' (devengado, fecha doc).
--   LEGACY   : dbo.cajamayor_movimiento (E), t_FechaMovimiento en AMBAS bases,
--              monto NETO = COALESCE(NULLIF(d_Subtotal,0), d_Total), IdTipoCaja propio.
--   CONTA    : conta.egreso. Base C: PAGADO / t_FechaPago / d_MontoBruto*d_TipoCambio.
--              Base D: <>ANULADO / t_FechaDocumento / d_MontoNeto, excluyendo egreso
--              Hospital SISOL (anti doble-conteo, regla vigente rentabilidad).
--   PLANILLA : conta.costo_personal_mensual. Grano MES -> dia 1 del mes (EsMensual=1).
-- IdTipoCaja de CONTA/PLANILLA = walk recursivo de centro_costo -> MAX(i_IdTipoCaja)
-- (patron 'mapc'); NULL -> 0 (bucket ADMINISTRACION).
-- Categoria de CONTA = seccion RAIZ de tipo_gasto (v_Nombre del padre nivel 0).
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'conta.fn_Dash_EgresoBase', N'IF') IS NOT NULL
    DROP FUNCTION conta.fn_Dash_EgresoBase;
GO
CREATE FUNCTION conta.fn_Dash_EgresoBase
    (@Desde DATE, @Hasta DATE, @TiposCaja NVARCHAR(50), @Base CHAR(1))
RETURNS TABLE
AS
RETURN (
    WITH walk AS (
        SELECT c.i_IdCentroCosto AS origen, c.i_IdPadre, c.i_IdTipoCaja
        FROM conta.centro_costo c
        UNION ALL
        SELECT w.origen, p.i_IdPadre, p.i_IdTipoCaja
        FROM walk w
        JOIN conta.centro_costo p ON p.i_IdCentroCosto = w.i_IdPadre
        WHERE w.i_IdTipoCaja IS NULL
    ),
    mapc AS (
        SELECT origen AS i_IdCentroCosto, MAX(i_IdTipoCaja) AS i_IdTipoCaja
        FROM walk GROUP BY origen
    ),
    tg_root AS (
        SELECT i_IdTipoGasto, v_Nombre AS RootNombre
        FROM conta.tipo_gasto WHERE i_IdPadre IS NULL
        UNION ALL
        SELECT c.i_IdTipoGasto, r.RootNombre
        FROM conta.tipo_gasto c
        JOIN tg_root r ON c.i_IdPadre = r.i_IdTipoGasto
    ),
    base AS (
        -- 1) LEGACY (caja mayor legacy, salidas 'E')
        SELECT
            CAST(cm.t_FechaMovimiento AS DATE)                              AS Fecha,
            cm.i_IdTipoCaja                                                 AS IdTipoCaja,
            ISNULL(tc.v_NombreTipoCaja, 'ADMINISTRACION')                   AS Unidad,
            CAST(COALESCE(NULLIF(cm.d_Subtotal, 0), cm.d_Total) AS DECIMAL(18,2)) AS Monto,
            CAST('LEGACY' AS VARCHAR(10))                                   AS Fuente,
            CAST('EGRESO CAJA ' + ISNULL(tc.v_NombreTipoCaja, 'ADMINISTRACION') AS NVARCHAR(420)) AS Categoria,
            CAST(0 AS BIT)                                                  AS EsMensual
        FROM dbo.cajamayor_movimiento cm
        LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = cm.i_IdTipoCaja
        WHERE cm.v_TipoMovimiento = 'E'
          AND cm.t_FechaMovimiento >= @Desde
          AND cm.t_FechaMovimiento <  DATEADD(DAY, 1, @Hasta)

        UNION ALL

        -- 2) CONTA (conta.egreso)
        SELECT
            CAST(CASE WHEN @Base = 'C' THEN e.t_FechaPago ELSE e.t_FechaDocumento END AS DATE) AS Fecha,
            ISNULL(mc.i_IdTipoCaja, 0)                                      AS IdTipoCaja,
            ISNULL(tc.v_NombreTipoCaja, 'ADMINISTRACION')                   AS Unidad,
            CAST(CASE WHEN @Base = 'C' THEN e.d_MontoBruto * e.d_TipoCambio
                      ELSE e.d_MontoNeto END AS DECIMAL(18,2))              AS Monto,
            CAST('CONTA' AS VARCHAR(10))                                    AS Fuente,
            CAST(ISNULL(tg.RootNombre, 'OTROS EGRESOS') AS NVARCHAR(420))   AS Categoria,
            CAST(0 AS BIT)                                                  AS EsMensual
        FROM conta.egreso e
        LEFT JOIN mapc mc ON mc.i_IdCentroCosto = e.i_IdCentroCosto
        LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = mc.i_IdTipoCaja
        LEFT JOIN tg_root tg ON tg.i_IdTipoGasto = e.i_IdTipoGasto
        WHERE ( (@Base = 'C'
                     AND e.v_Estado = 'PAGADO'
                     AND e.t_FechaPago >= @Desde
                     AND e.t_FechaPago <  DATEADD(DAY, 1, @Hasta))
             OR (@Base = 'D'
                     AND e.v_Estado <> 'ANULADO'
                     AND e.t_FechaDocumento >= @Desde
                     AND e.t_FechaDocumento <  DATEADD(DAY, 1, @Hasta)
                     AND NOT EXISTS (SELECT 1 FROM conta.sisol_liquidacion sl
                                     WHERE sl.i_IdEgresoHospital = e.i_IdEgreso)) )

        UNION ALL

        -- 3) PLANILLA (conta.costo_personal_mensual) - grano MES anclado al dia 1
        SELECT
            DATEFROMPARTS(cpm.n_Anio, cpm.n_Mes, 1)                         AS Fecha,
            ISNULL(mc.i_IdTipoCaja, 0)                                      AS IdTipoCaja,
            ISNULL(tc.v_NombreTipoCaja, 'ADMINISTRACION')                   AS Unidad,
            CAST(cpm.d_Monto AS DECIMAL(18,2))                              AS Monto,
            CAST('PLANILLA' AS VARCHAR(10))                                 AS Fuente,
            CAST('PLANILLA - ' + cpm.v_Concepto AS NVARCHAR(420))          AS Categoria,
            CAST(1 AS BIT)                                                  AS EsMensual
        FROM conta.costo_personal_mensual cpm
        LEFT JOIN mapc mc ON mc.i_IdCentroCosto = cpm.i_IdCentroCosto
        LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = mc.i_IdTipoCaja
        WHERE DATEFROMPARTS(cpm.n_Anio, cpm.n_Mes, 1) >= @Desde
          AND DATEFROMPARTS(cpm.n_Anio, cpm.n_Mes, 1) <  DATEADD(DAY, 1, @Hasta)
    )
    SELECT Fecha, IdTipoCaja, Unidad, Monto, Fuente, Categoria, EsMensual
    FROM base
    WHERE (@TiposCaja IS NULL
           OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(VARCHAR(10), IdTipoCaja) + ',%')
);
GO

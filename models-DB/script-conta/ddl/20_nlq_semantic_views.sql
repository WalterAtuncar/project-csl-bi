-- =====================================================================
-- ddl/20 - NLQ capa semantica (F2). Vistas curadas conta.v_nlq_* que YA
-- aplican las reglas de negocio (los filtros sagrados van adentro) + seed
-- del catalogo (nlq_tabla / nlq_columna / nlq_regla_negocio).
-- Plan: models-DB/docs/PLAN_NLQ_CONTA.md (2.2). Fecha: 2026-07-28. Fase F2.
--
-- ADITIVO schema conta, CERO dbo, REVERSIBLE (DROP VIEW + DELETE del seed).
-- SQL Server 2012. Idempotente: IF OBJECT_ID('conta.v_nlq_x','V') IS NOT NULL
-- DROP VIEW / GO / CREATE VIEW; el seed con NOT EXISTS. UTF-8 SIN BOM (ASCII).
--
-- REGLA CRITICA: la logica NO se inventa, se PORTA de los objetos cuadrados
-- de produccion (sys.sql_modules, verificados 2026-07-28):
--   * v_nlq_ventas        <- conta.fn_Rentabilidad_IngresosDetalleEx /
--                            conta.fn_Dash_VentaBase (4 filtros sagrados,
--                            ISNULL(i_Eliminado,0)=0, unidad v_NombreTipoCaja).
--   * v_nlq_caja          <- conta.fn_Dash_CobranzaBase (== conta.sp_Caja_Ingresos):
--                            cobranzadetalle, ISNULL(i_Eliminado,0)=0, SIN los 4
--                            filtros, importe BRUTO cobrado (NO venta.d_Total).
--   * v_nlq_rentabilidad  <- conta.fn_Rentabilidad_IngresosEx (@IncluirCredito=1 =
--                            fn_Rentabilidad_Ingresos) + conta.fn_Rentabilidad_Gastos,
--                            reconciliados como conta.sp_Rentabilidad_PorUnidad
--                            (FULL OUTER JOIN por i_IdTipoCaja; ADMINISTRACION =
--                            gastos con tipocaja NULL). Neto, SISOL solo % clinica.
--
-- Nota COLLATE (R4): NO se necesita en estas 3 vistas. Los unicos joins de texto
-- son v_IdVenta = v_IdVenta (todos NCHAR(16), misma collation, misma BD) y el
-- overlay LTRIM(RTRIM(cm.v_IdVenta))=ov.v_IdVenta (identico a fn_Rentabilidad_Gastos,
-- sin conflicto). El filtro de series es un IN de literales sobre varchar (sin join).
-- Se porta tal cual las funciones cuadradas (no se agrega COLLATE cosmetico).
-- =====================================================================


-- #####################################################################
-- VISTA 1 - conta.v_nlq_ventas (dominio VENTAS: facturado / devengado)
-- Grano: 1 fila por venta (detalle agregado). Los 4 filtros sagrados adentro.
-- #####################################################################
IF OBJECT_ID('conta.v_nlq_ventas','V') IS NOT NULL DROP VIEW conta.v_nlq_ventas;
GO
CREATE VIEW conta.v_nlq_ventas
AS
    SELECT
        YEAR(v.t_InsertaFecha)                        AS Anio,
        MONTH(v.t_InsertaFecha)                       AS Mes,
        CONVERT(DATE, v.t_InsertaFecha)               AS Fecha,
        v.v_IdVenta                                   AS IdVenta,
        v.v_SerieDocumento                            AS Serie,
        v.v_CorrelativoDocumento                      AS Documento,
        ISNULL(tcct.i_IdTipoCaja, 0)                  AS IdUnidad,
        ISNULL(tc.v_NombreTipoCaja, 'SIN UNIDAD')     AS Unidad,
        v.v_IdCliente                                 AS IdCliente,
        SUM(vd.d_Valor)                               AS TotalNeto,     -- sin IGV (devengado)
        SUM(vd.d_Igv)                                 AS TotalIgv,
        SUM(vd.d_PrecioVenta)                         AS TotalBruto     -- con IGV
    FROM dbo.venta v
    JOIN dbo.ventadetalle vd
        ON vd.v_IdVenta = v.v_IdVenta AND ISNULL(vd.i_Eliminado, 0) = 0
    LEFT JOIN dbo.tipocaja_clientetipo tcct
        ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
    LEFT JOIN dbo.tipocaja tc
        ON tc.i_IdTipoCaja = tcct.i_IdTipoCaja
    WHERE ISNULL(v.i_Eliminado, 0) = 0
      AND v.i_ClienteEsAgente IS NOT NULL
      AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3, 4))
      AND ISNULL(v.v_SerieDocumento, '') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')
    GROUP BY
        v.t_InsertaFecha, v.v_IdVenta, v.v_SerieDocumento, v.v_CorrelativoDocumento,
        tcct.i_IdTipoCaja, tc.v_NombreTipoCaja, v.v_IdCliente;
GO


-- #####################################################################
-- VISTA 2 - conta.v_nlq_caja (dominio CAJA: cobrado / liquidez)
-- Grano: 1 fila por cobranzadetalle. SIN los 4 filtros (universo caja).
-- Importe = BRUTO cobrado (cobranzadetalle.d_ImporteSoles).
-- #####################################################################
IF OBJECT_ID('conta.v_nlq_caja','V') IS NOT NULL DROP VIEW conta.v_nlq_caja;
GO
CREATE VIEW conta.v_nlq_caja
AS
    SELECT
        YEAR(cd.t_InsertaFecha)                       AS Anio,
        MONTH(cd.t_InsertaFecha)                      AS Mes,
        CONVERT(DATE, cd.t_InsertaFecha)              AS Fecha,
        cd.v_IdVenta                                  AS IdVenta,
        v.v_SerieDocumento                            AS Serie,
        ISNULL(tcct.i_IdTipoCaja, 0)                  AS IdUnidad,
        ISNULL(tc.v_NombreTipoCaja, 'SIN UNIDAD')     AS Unidad,
        cd.d_ImporteSoles                             AS Importe,       -- BRUTO cobrado (con IGV)
        cd.i_IdFormaPago                              AS IdFormaPago,
        dh46.v_Value1                                 AS FormaPago,
        CAST(CASE WHEN v.i_IdCondicionPago = 2 THEN 1 ELSE 0 END AS BIT) AS EsCredito
    FROM dbo.cobranzadetalle cd
    INNER JOIN dbo.venta v
        ON v.v_IdVenta = cd.v_IdVenta AND ISNULL(v.i_Eliminado, 0) = 0
    LEFT JOIN dbo.tipocaja_clientetipo tcct
        ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
    LEFT JOIN dbo.tipocaja tc
        ON tc.i_IdTipoCaja = tcct.i_IdTipoCaja
    LEFT JOIN dbo.datahierarchy dh46
        ON dh46.i_GroupId = 46 AND dh46.i_ItemId = cd.i_IdFormaPago
    WHERE ISNULL(cd.i_Eliminado, 0) = 0;
GO


-- #####################################################################
-- VISTA 3 - conta.v_nlq_rentabilidad (dominio RENTABILIDAD: resultado)
-- Grano: (Anio, Mes, Unidad). Ingresos NETO devengado (SISOL solo % clinica),
-- Gastos (egresos conta + personal + caja mayor legacy), Resultado, Margen.
-- Porte fiel de fn_Rentabilidad_IngresosEx(@IncluirCredito=1) + fn_Rentabilidad_Gastos,
-- reconciliados como sp_Rentabilidad_PorUnidad (FULL OUTER JOIN por i_IdTipoCaja).
-- #####################################################################
IF OBJECT_ID('conta.v_nlq_rentabilidad','V') IS NOT NULL DROP VIEW conta.v_nlq_rentabilidad;
GO
CREATE VIEW conta.v_nlq_rentabilidad
AS
    WITH walk AS (
        -- centro_costo -> tipocaja subiendo por el padre (identico a fn_Rentabilidad_Gastos)
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
    ),
    ventas AS (
        -- universo canonico de ventas (4 filtros sagrados). @IncluirCredito=1 -> sin filtro de credito.
        SELECT
            YEAR(v.t_InsertaFecha)                       AS Anio,
            MONTH(v.t_InsertaFecha)                      AS Mes,
            tcct.i_IdTipoCaja                            AS IdUnidad,
            ISNULL(tc.v_NombreTipoCaja, 'SIN UNIDAD')    AS Unidad,
            vd.d_Valor                                   AS Neto
        FROM dbo.venta v
        JOIN dbo.ventadetalle vd
            ON vd.v_IdVenta = v.v_IdVenta AND ISNULL(vd.i_Eliminado, 0) = 0
        LEFT JOIN dbo.tipocaja_clientetipo tcct
            ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
        LEFT JOIN dbo.tipocaja tc
            ON tc.i_IdTipoCaja = tcct.i_IdTipoCaja
        WHERE ISNULL(v.i_Eliminado, 0) = 0
          AND v.i_ClienteEsAgente IS NOT NULL
          AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3, 4))
          AND ISNULL(v.v_SerieDocumento, '') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')
    ),
    ingresos AS (
        SELECT
            ve.Anio, ve.Mes, ve.IdUnidad, ve.Unidad,
            CASE WHEN ve.Unidad = 'SISOL'
                 THEN CAST(SUM(ve.Neto) * pc.PorcClinica / 100 AS DECIMAL(18,2))
                 ELSE SUM(ve.Neto) END                    AS Ingresos
        FROM ventas ve
        OUTER APPLY (
            -- % clinica SISOL VIGENTE por mes (VIVO), default 100 (identico a fn_Rentabilidad_IngresosEx)
            SELECT ISNULL((
                SELECT TOP 1 sp.d_PorcClinica
                FROM conta.sisol_participacion sp
                WHERE sp.t_VigenciaDesde <= DATEFROMPARTS(ve.Anio, ve.Mes, 1)
                  AND (sp.t_VigenciaHasta IS NULL OR sp.t_VigenciaHasta >= DATEFROMPARTS(ve.Anio, ve.Mes, 1))
                ORDER BY sp.t_VigenciaDesde DESC), 100) AS PorcClinica
        ) pc
        GROUP BY ve.Anio, ve.Mes, ve.IdUnidad, ve.Unidad, pc.PorcClinica
    ),
    gastos_raw AS (
        -- (a) egresos conta por t_FechaDocumento, excluye participacion Hospital SISOL
        SELECT YEAR(e.t_FechaDocumento) AS Anio, MONTH(e.t_FechaDocumento) AS Mes,
               e.i_IdCentroCosto, e.d_MontoNeto AS Monto
        FROM conta.egreso e
        WHERE e.v_Estado <> 'ANULADO'
          AND NOT EXISTS (SELECT 1 FROM conta.sisol_liquidacion sl WHERE sl.i_IdEgresoHospital = e.i_IdEgreso)
        UNION ALL
        -- (b) costos de personal (ya trae anio/mes propios)
        SELECT cpm.n_Anio, cpm.n_Mes, cpm.i_IdCentroCosto, cpm.d_Monto
        FROM conta.costo_personal_mensual cpm
        UNION ALL
        -- (c) egresos de la caja mayor legacy; centro por overlay ACTIVO, fallback tipocaja, fallback 1
        SELECT YEAR(cm.t_FechaMovimiento), MONTH(cm.t_FechaMovimiento),
               COALESCE(ov.i_IdCentroCosto, cc.i_IdCentroCosto, 1),
               COALESCE(NULLIF(cm.d_Subtotal, 0), cm.d_Total)
        FROM dbo.cajamayor_movimiento cm
        LEFT JOIN conta.centro_costo cc ON cc.i_IdTipoCaja = cm.i_IdTipoCaja AND cc.b_Activo = 1
        LEFT JOIN conta.egreso_caja_clasificacion ov
               ON LTRIM(RTRIM(cm.v_IdVenta)) = ov.v_IdVenta AND ov.v_Estado = 'ACTIVO'
        WHERE cm.v_TipoMovimiento = 'E'
    ),
    gastos AS (
        SELECT
            g.Anio, g.Mes,
            m.i_IdTipoCaja                                AS IdUnidad,   -- NULL = ADMINISTRACION
            ISNULL(tc.v_NombreTipoCaja, 'ADMINISTRACION') AS Unidad,
            SUM(g.Monto)                                  AS Gastos
        FROM gastos_raw g
        LEFT JOIN mapc m ON m.i_IdCentroCosto = g.i_IdCentroCosto
        LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = m.i_IdTipoCaja
        GROUP BY g.Anio, g.Mes, m.i_IdTipoCaja, tc.v_NombreTipoCaja
    )
    SELECT
        COALESCE(i.Anio, g.Anio)          AS Anio,
        COALESCE(i.Mes, g.Mes)            AS Mes,
        COALESCE(i.IdUnidad, g.IdUnidad)  AS IdUnidad,   -- NULL = SIN UNIDAD / ADMINISTRACION
        COALESCE(i.Unidad, g.Unidad)      AS Unidad,
        ISNULL(i.Ingresos, 0)             AS Ingresos,
        ISNULL(g.Gastos, 0)               AS Gastos,
        ISNULL(i.Ingresos, 0) - ISNULL(g.Gastos, 0) AS Resultado,
        CASE WHEN ISNULL(i.Ingresos, 0) <> 0
             THEN CAST((ISNULL(i.Ingresos,0) - ISNULL(g.Gastos,0)) * 100.0 / i.Ingresos AS DECIMAL(9,2))
             ELSE 0 END                   AS MargenPorc
    FROM ingresos i
    FULL OUTER JOIN gastos g
        ON g.Anio = i.Anio AND g.Mes = i.Mes AND g.IdUnidad = i.IdUnidad;
GO


-- #####################################################################
-- SEED del catalogo (TAREA B): registra SOLO las 3 vistas curadas (b_Activa=1).
-- Las tablas dbo crudas de estos dominios NO se registran -> quedan fuera del
-- allowlist (el validador del ejecutor rechaza cualquier SQL que las toque).
-- systemuser NO se registra en v1 (lo cubre el DENY v_Password del login F3).
-- Idempotente: NOT EXISTS por objeto / (tabla,columna) / (dominio,regla).
-- #####################################################################

-- 1) nlq_tabla: las 3 vistas.
INSERT INTO conta.nlq_tabla (v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, b_Activa, v_Descripcion)
SELECT x.v_Base, x.v_Schema, x.v_Objeto, x.v_TipoObjeto, x.v_Dominio, 1, x.v_Descripcion
FROM (VALUES
    ('20505310072','conta','v_nlq_ventas','V','ventas',
     'Ventas facturadas (devengado) con los 4 filtros sagrados ya aplicados. 1 fila por venta. TotalNeto sin IGV; unidad de negocio en Unidad.'),
    ('20505310072','conta','v_nlq_caja','V','caja',
     'Cobranzas (liquidez / caja). 1 fila por cobro. Importe = BRUTO cobrado (con IGV). NO aplica los 4 filtros de ventas. Medio de pago en FormaPago.'),
    ('20505310072','conta','v_nlq_rentabilidad','V','rentabilidad',
     'Rentabilidad mensual por unidad: Ingresos NETO devengado (SISOL solo % clinica), Gastos (egresos+personal+caja mayor legacy), Resultado, MargenPorc.')
) x(v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, v_Descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_tabla t
    WHERE t.v_Base = x.v_Base AND t.v_Schema = x.v_Schema AND t.v_Objeto = x.v_Objeto);
GO

-- 2) nlq_columna: columnas de v_nlq_ventas.
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='20505310072' AND v_Schema='conta' AND v_Objeto='v_nlq_ventas') t
CROSS JOIN (VALUES
    ('Anio','int','Anio de la venta (de t_InsertaFecha)'),
    ('Mes','int','Mes 1..12 de la venta'),
    ('Fecha','date','Fecha de emision de la venta'),
    ('IdVenta','nchar(16)','Id de la venta (dbo.venta.v_IdVenta)'),
    ('Serie','varchar(20)','Serie del documento (v_SerieDocumento)'),
    ('Documento','nvarchar(16)','Correlativo del documento'),
    ('IdUnidad','int','Id de unidad de negocio (tipocaja 1..6; 0 = sin unidad)'),
    ('Unidad','nvarchar(200)','Unidad: ATENCION_ASISTENCIAL, ATENCION_OCUPACIONAL, SISOL, MTC, SEGUROS, FARMACIA'),
    ('IdCliente','varchar(16)','Id del cliente de la venta'),
    ('TotalNeto','decimal','Total facturado NETO sin IGV (base devengada). Usar para cuanto se facturo'),
    ('TotalIgv','decimal','IGV total de la venta'),
    ('TotalBruto','decimal','Total con IGV')
) x(v_Columna, v_TipoDato, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 3) nlq_columna: columnas de v_nlq_caja.
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='20505310072' AND v_Schema='conta' AND v_Objeto='v_nlq_caja') t
CROSS JOIN (VALUES
    ('Anio','int','Anio del cobro'),
    ('Mes','int','Mes 1..12 del cobro'),
    ('Fecha','date','Fecha del cobro (cobranzadetalle.t_InsertaFecha)'),
    ('IdVenta','nchar(16)','Venta cobrada'),
    ('Serie','varchar(20)','Serie del documento de la venta cobrada'),
    ('IdUnidad','int','Id de unidad de negocio (tipocaja 1..6; 0 = sin unidad)'),
    ('Unidad','nvarchar(200)','Unidad de negocio de la venta cobrada'),
    ('Importe','decimal','Monto COBRADO en soles, BRUTO con IGV (base caja/liquidez)'),
    ('IdFormaPago','int','Id de la forma de pago (datahierarchy grupo 46)'),
    ('FormaPago','nvarchar','Forma de pago: EFECTIVO, VISA, DEPOSITO, YAPE, PLIN...'),
    ('EsCredito','bit','1 = la venta cobrada era a credito (condicion de pago 2)')
) x(v_Columna, v_TipoDato, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 4) nlq_columna: columnas de v_nlq_rentabilidad.
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='20505310072' AND v_Schema='conta' AND v_Objeto='v_nlq_rentabilidad') t
CROSS JOIN (VALUES
    ('Anio','int','Anio'),
    ('Mes','int','Mes 1..12'),
    ('IdUnidad','int','Id de unidad (tipocaja 1..6; NULL para SIN UNIDAD / ADMINISTRACION)'),
    ('Unidad','nvarchar(200)','Unidad de negocio, o ADMINISTRACION (gastos no atribuibles a una unidad)'),
    ('Ingresos','decimal','Ingresos NETO devengado; SISOL solo al % participacion clinica vigente'),
    ('Gastos','decimal','Gastos del mes/unidad (egresos conta + costos de personal + egreso caja mayor legacy)'),
    ('Resultado','decimal','Ingresos - Gastos'),
    ('MargenPorc','decimal','Margen porcentual = Resultado*100/Ingresos')
) x(v_Columna, v_TipoDato, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 5) nlq_regla_negocio: reglas de dominio (texto inyectado al prompt). Portadas de modelo-negocio.
INSERT INTO conta.nlq_regla_negocio (v_Dominio, v_Objeto, v_Regla, b_Activa, i_Orden)
SELECT x.v_Dominio, x.v_Objeto, x.v_Regla, 1, x.i_Orden
FROM (VALUES
    ('ventas','conta.v_nlq_ventas',
     'Ventas facturadas (devengado). Usa SIEMPRE conta.v_nlq_ventas: ya trae los 4 filtros sagrados (i_Eliminado no borrado; i_ClienteEsAgente no nulo; usuario 2036 solo agentes 3,4; exclusion de series EC*/TFM/THM). NUNCA consultes dbo.venta directamente.', 1),
    ('ventas','conta.v_nlq_ventas',
     'TotalNeto = valor SIN IGV (base devengada); TotalBruto = con IGV. Para cuanto se facturo usa TotalNeto. La unidad de negocio esta en la columna Unidad; agrupa/filtra por Unidad, no por codigos.', 2),
    ('caja','conta.v_nlq_caja',
     'Caja = liquidez (lo COBRADO). Usa conta.v_nlq_caja (cobranzas). Importe = monto BRUTO cobrado con IGV; NO uses venta.d_Total ni el neto de ventas. La caja NO aplica los 4 filtros de ventas.', 1),
    ('caja','conta.v_nlq_caja',
     'Cobrado mayor que Facturado en un rango es CORRECTO (neto vs bruto + credito de meses anteriores + universo de filtros distinto), no es un error. Medio de pago = columna FormaPago/IdFormaPago; EsCredito=1 marca cobro de una venta a credito.', 2),
    ('rentabilidad','conta.v_nlq_rentabilidad',
     'Rentabilidad = resultado (devengado) por Anio, Mes, Unidad. Usa conta.v_nlq_rentabilidad. Ingresos = neto SIN IGV; para SISOL solo el % participacion clinica vigente (el resto es del Hospital). Resultado = Ingresos - Gastos.', 1),
    ('rentabilidad','conta.v_nlq_rentabilidad',
     'La fila Unidad=ADMINISTRACION son gastos no atribuibles a una unidad de ingreso. Rentabilidad incluye ventas a credito (devengado). Caja y Rentabilidad dan cifras distintas para el mismo mes por diseno (efectivo vs devengado, timing, ajuste SISOL); no es un error.', 2)
) x(v_Dominio, v_Objeto, v_Regla, i_Orden)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_regla_negocio r
    WHERE r.v_Dominio = x.v_Dominio AND r.v_Regla = x.v_Regla);
GO

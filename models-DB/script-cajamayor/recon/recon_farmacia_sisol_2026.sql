-- =====================================================================
-- Reconciliacion: inserta los movimientos de FARMACIA (area 3 -> caja 6) y
-- SISOL (area 10 -> caja 3) que quedaron fuera de los cierres mensuales de
-- 2026 (ids 22,23,24,25,32,33) cuando los SP replicaron la query cadenaSA
-- del cierre diario legacy (que excluye areas 3/10 y el usuario 2036).
--
-- INSERT quirurgico: NO borra ni regenera los movimientos existentes de las
-- cajas 1/2/5 (ya validados por el usuario final). Solo agrega cajas 3 y 6 y
-- recalcula resumen por tipo y totales de cabecera.
--
-- Ejecutar UNA VEZ POR CIERRE. La linea DECLARE @IdCierre se sustituye por el
-- id correspondiente (22,23,24,25,32,33) antes de cada corrida.
-- Idempotente: aborta si el cierre ya tiene movimientos de cajas 3/6.
-- =====================================================================
DECLARE @IdCierre INT = 0; -- CIERRE_ID_PLACEHOLDER
DECLARE @Usuario  INT = 1; -- usuario de auditoria para i_InsertaIdUsuario

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRAN;

DECLARE @FechaInicio DATETIME, @FechaFin DATETIME;
SELECT @FechaInicio = t_FechaInicio, @FechaFin = t_FechaFin
  FROM dbo.cajamayor_cierre WHERE i_IdCajaMayorCierre = @IdCierre;
IF @FechaInicio IS NULL RAISERROR('Cierre inexistente', 16, 1);

-- Guarda de idempotencia
IF EXISTS (SELECT 1 FROM dbo.cajamayor_movimiento
            WHERE i_IdCajaMayorCierre = @IdCierre AND i_IdTipoCaja IN (3,6))
    RAISERROR('El cierre ya tiene movimientos de FARMACIA/SISOL. Abortando.', 16, 1);

-- ==== INGRESOS areas 3 (farmacia) y 10 (SISOL) ====
;WITH VentasIngreso AS (
    SELECT V.v_IdVenta, V.v_SerieDocumento, V.v_CorrelativoDocumento, V.t_InsertaFecha,
           V.i_ClienteEsAgente, VD.d_PrecioVenta AS d_Total, VD.d_Valor AS d_Subtotal,
           VD.d_Igv AS d_IGV, VD.v_DescripcionProducto,
           DH.v_Value1 AS CONDICION, DH2.v_Value1 AS TIPO, CD.i_IdFormaPago
    FROM [dbo].[venta] V
    INNER JOIN [dbo].[ventadetalle] VD
        ON V.v_IdVenta = VD.v_IdVenta AND ISNULL(VD.i_Eliminado, 0) = 0
    LEFT JOIN [dbo].[cobranzadetalle] CD ON CD.v_IdVenta = V.v_IdVenta
    LEFT JOIN [dbo].[datahierarchy] DH  ON DH.i_GroupId = 41 AND DH.i_ItemId = V.i_IdCondicionPago
    LEFT JOIN [dbo].[datahierarchy] DH2 ON DH2.i_GroupId = 46 AND DH2.i_ItemId = CD.i_IdFormaPago
    WHERE V.i_Eliminado = 0
      AND V.t_InsertaFecha >= CAST(@FechaInicio AS DATE)
      AND V.t_InsertaFecha < DATEADD(DAY, 1, CAST(@FechaFin AS DATE))
      AND V.i_ClienteEsAgente IN (3, 10)          -- SOLO las areas faltantes
      AND ISNULL(V.v_SerieDocumento, '') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR')
      AND ISNULL(V.v_SerieDocumento, '') NOT IN ('TFM','THM')
)
INSERT INTO dbo.cajamayor_movimiento (
    i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, v_ConceptoMovimiento,
    d_Subtotal, d_IGV, d_Total, i_IdFormaPago, t_FechaMovimiento, v_Observaciones,
    v_Origen, v_CodigoDocumento, v_SerieDocumento, v_NumeroDocumento, v_IdVenta,
    i_InsertaIdUsuario, t_InsertaFecha)
SELECT @IdCierre,
       COALESCE(tcct.i_IdTipoCaja, NULL),
       'I',
       LEFT(ISNULL(vi.v_DescripcionProducto, 'Ingreso venta'), 350),
       ISNULL(vi.d_Subtotal, 0), ISNULL(vi.d_IGV, 0), ISNULL(vi.d_Total, 0),
       vi.i_IdFormaPago, vi.t_InsertaFecha,
       CASE WHEN vi.CONDICION = 'CONTADO' AND vi.TIPO = 'EFECTIVO SOLES' THEN 'Contado Efectivo'
            WHEN vi.CONDICION = 'CREDITO' THEN 'Credito'
            WHEN (vi.CONDICION = 'CONTADO' AND ISNULL(vi.TIPO,'') <> 'EFECTIVO SOLES')
              OR vi.CONDICION IN ('CHEQUE','DEPOSITO') THEN 'No Efectivo - ' + ISNULL(vi.TIPO, vi.CONDICION)
            ELSE 'Otro - ' + ISNULL(vi.CONDICION, 'Sin condicion') END,
       'cobranzas',
       ISNULL(vi.v_SerieDocumento,''), ISNULL(vi.v_SerieDocumento,''),
       ISNULL(vi.v_SerieDocumento,'') + '-' + ISNULL(vi.v_CorrelativoDocumento,''),
       ISNULL(vi.v_IdVenta,''), @Usuario, GETDATE()
FROM VentasIngreso vi
LEFT JOIN dbo.tipocaja_clientetipo tcct
    ON tcct.i_ClienteEsAgente = vi.i_ClienteEsAgente AND tcct.b_Activo = 1
WHERE ( (vi.CONDICION = 'CONTADO' AND vi.TIPO = 'EFECTIVO SOLES')
     OR (vi.CONDICION = 'CREDITO')
     OR (vi.CONDICION = 'CONTADO' AND ISNULL(vi.TIPO,'') <> 'EFECTIVO SOLES')
     OR (vi.CONDICION IN ('CHEQUE','DEPOSITO')) );

-- ==== EGRESOS areas 3 y 10 (en la practica: serie ECF de farmacia) ====
;WITH VentasEgreso AS (
    SELECT v.v_IdVenta, v.v_SerieDocumento, v.v_CorrelativoDocumento, v.t_InsertaFecha,
           v.i_ClienteEsAgente, SUM(ISNULL(vd.d_PrecioVenta, 0)) AS d_TotalEgreso,
           STUFF(( SELECT ' | ' + ISNULL(REPLACE(d2.v_DescripcionProducto, CHAR(31), ''), '')
                     FROM [dbo].[ventadetalle] d2
                    WHERE d2.v_IdVenta = v.v_IdVenta AND ISNULL(d2.i_Eliminado, 0) = 0
                    ORDER BY d2.t_InsertaFecha FOR XML PATH(''), TYPE
                 ).value('.', 'NVARCHAR(MAX)'), 1, 3, '') AS v_ConceptosDetalle
    FROM [dbo].[venta] v
    INNER JOIN [dbo].[ventadetalle] vd
        ON v.v_IdVenta = vd.v_IdVenta AND ISNULL(vd.i_Eliminado, 0) = 0
    WHERE v.i_Eliminado = 0
      AND v.t_InsertaFecha >= CAST(@FechaInicio AS DATE)
      AND v.t_InsertaFecha < DATEADD(DAY, 1, CAST(@FechaFin AS DATE))
      AND v.v_SerieDocumento IN ('ECO','ECA','ECF','ECT','ECG','ECR')
      AND v.i_ClienteEsAgente IN (3, 10)          -- SOLO las areas faltantes
    GROUP BY v.v_IdVenta, v.v_SerieDocumento, v.v_CorrelativoDocumento, v.t_InsertaFecha, v.i_ClienteEsAgente
)
INSERT INTO dbo.cajamayor_movimiento (
    i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, v_ConceptoMovimiento,
    d_Subtotal, d_IGV, d_Total, t_FechaMovimiento, v_Observaciones, v_Origen,
    v_CodigoDocumento, v_SerieDocumento, v_NumeroDocumento, v_IdVenta,
    i_InsertaIdUsuario, t_InsertaFecha)
SELECT @IdCierre, COALESCE(tcct.i_IdTipoCaja, NULL), 'E',
       LEFT(COALESCE(ve.v_ConceptosDetalle, 'Egreso ' + ISNULL(ve.v_SerieDocumento,'')), 350),
       0, 0, ISNULL(ve.d_TotalEgreso, 0), ve.t_InsertaFecha,
       'Egreso serie ' + ISNULL(ve.v_SerieDocumento, ''), 'ventas-egreso',
       ISNULL(ve.v_SerieDocumento,''), ISNULL(ve.v_SerieDocumento,''),
       ISNULL(ve.v_SerieDocumento,'') + '-' + ISNULL(ve.v_CorrelativoDocumento,''),
       ISNULL(ve.v_IdVenta,''), @Usuario, GETDATE()
FROM VentasEgreso ve
LEFT JOIN dbo.tipocaja_clientetipo tcct
    ON tcct.i_ClienteEsAgente = ve.i_ClienteEsAgente AND tcct.b_Activo = 1;

-- ==== Recalcular resumen por tipo y totales de cabecera ====
DECLARE @ResumenTipos TABLE (IdCajaMayorCierre INT, IdTipoCaja INT, SaldoInicial DECIMAL(18,4),
                             TotalIngresos DECIMAL(18,4), TotalEgresos DECIMAL(18,4), SaldoFinal DECIMAL(18,4));
INSERT INTO @ResumenTipos
EXEC dbo.sp_CajaMayor_ResumenTipos @IdCajaMayorCierre = @IdCierre, @ActualizaIdUsuario = @Usuario;

EXEC dbo.sp_CajaMayor_RecalcularTotales @IdCajaMayorCierre = @IdCierre, @ActualizaIdUsuario = @Usuario;

COMMIT TRAN;

-- Salida de control
SELECT i_IdTipoCaja,
       CAST(SUM(CASE WHEN v_TipoMovimiento='I' THEN d_Total ELSE 0 END) AS DECIMAL(18,2)) AS ingresos,
       CAST(SUM(CASE WHEN v_TipoMovimiento='E' THEN d_Total ELSE 0 END) AS DECIMAL(18,2)) AS egresos,
       COUNT(*) AS movs
  FROM dbo.cajamayor_movimiento
 WHERE i_IdCajaMayorCierre = @IdCierre
 GROUP BY i_IdTipoCaja ORDER BY i_IdTipoCaja;

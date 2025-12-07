## Objetivo
Un endpoint único que, al hacer click en “Recalcular ahora”, ejecute **ambas** tareas incrementales (ingresos por cobranzas y egresos por ventas), insertando solo faltantes y recalculando totales del cierre al finalizar.

## Endpoint Único
- `POST /api/Caja/caja-mayor-cierre/{id}/recalcular-incremental`
- Parámetros:
  - `preview?: boolean` (opcional, default false)
- Rango de fechas (sin selector en UI):
  - `FechaDesde`: primer día del mes del periodo del cierre (YYYY-MM-01)
  - `FechaHasta`: fecha concurrente (hoy)
- Comportamiento:
  1. Ejecuta SP incremental de cobranzas con filtro `NOT EXISTS`.
  2. Ejecuta SP incremental de ventas con filtro `NOT EXISTS`.
  3. Ejecuta `sp_CajaMayor_RecalcularTotales`.
  4. Retorna métricas: `insertadosCobranzas`, `omitidosCobranzas`, `insertadosVentas`, `omitidosVentas`, `totales`.
  - Si `preview=true`: solo retorno de métricas, sin inserción ni recalculo.

## SPs Incrementales (sin rango en UI)
- `sp_CajaMayor_GenerarIngresos_incremental(@IdCajaMayorCierre, @DefaultIdTipoCaja, @FechaDesde, @FechaHasta, @Preview BIT=0)`
- `sp_CajaMayor_GenerarEgresos_incremental(@IdCajaMayorCierre, @DefaultIdTipoCaja, @FechaDesde, @FechaHasta, @Preview BIT=0)`
- Filtro `NOT EXISTS` contra `cajamayor_movimiento` del cierre (clave lógica dedupe con normalización TRIM/UPPER/ZEROFILL).
- Retornar conteos para `preview` y ejecución.

## UI
- Botón único “Recalcular ahora” en la vista del cierre concurrente.
- Modal de confirmación sencillo:
  - Mensaje: “Se recalcularán ingresos (cobranzas) y egresos (ventas) del periodo [YYYY-MM] hasta hoy. ¿Desea continuar?”
  - Opción “Vista previa” (checkbox) para ver conteos antes de ejecutar.
  - Botón “Recalcular” → llama al endpoint único.
  - Toasts con resumen de resultados (insertados/omitidos por fuente, tiempo, totales actualizados).

## Idempotencia y Dedupe
- Clave lógica sugerida por movimiento:
  - `(i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, v_Origen, v_CodigoDocumento, v_SerieDocumento, v_NumeroDocumento, t_FechaMovimiento)`
- Alternativa: tabla `movimiento_origen_map(i_IdMovimiento, source_type, source_id|document_key)`.
- Notas:
  - Documentos sin serie/número: usar ID de cobranza/venta como clave secundaria.
  - Actualización posterior del comprobante: actualizar movimiento y preservar dedupe.

## Validación
- Abrir cierre concurrente y registrar compras manuales.
- Ejecutar “Recalcular ahora” varias veces: sin duplicados, totales se actualizan.
- Vista previa concuerda con ejecución real.

## Entregables
- Endpoint único con preview.
- SPs incrementales y recalculo final.
- UI botón + modal sin selector de fecha (rango definido automáticamente).

## Notas Técnicas
- Transacciones en SPs, `SET XACT_ABORT ON`.
- Índices en `cajamayor_movimiento` para las columnas de dedupe.
- Auditoría de ejecuciones (quién/cuándo/rango/conteos).
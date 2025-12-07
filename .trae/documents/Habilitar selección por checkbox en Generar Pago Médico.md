## Objetivo
Permitir que el usuario incluya o excluya cada registro de la grid mediante un checkbox, y que los cálculos (totales y monto a pagar) usen solo los registros seleccionados. Mantener la validación por Excel como ayuda inicial, pero que la selección pueda ajustarse manualmente.

## Cambios en el componente padre (GenerarPagoModal.tsx)
1. Calcular el subconjunto seleccionado:
   - Crear `selectedDetalles = detallesFiltrados.filter(d => selectedServicios.has(d.v_ServiceComponentId || String(d.numeroLinea)))`.
   - Referencia: `react-project/src/components/UI/GenerarPagoModal.tsx` alrededor de la sección de memo `detallesFiltrados` (≈307–315).
2. Recalcular totales solo con seleccionados:
   - `totalVisa`, `totalEfectivo`, `descuentoVisa`, `totalGeneral`, `totalSinIgv`, `manualFactor` y `appliedTotalMedicoCurrent` deben reducir sobre `selectedDetalles` en lugar de `detallesFiltrados`.
   - Referencia: inicio de la zona de cálculos (≈316 en adelante), reemplazar `detallesFiltrados` por `selectedDetalles`.
3. Pasar los totales al grid por props:
   - `DetallesGrid` recibirá: `totalVisa`, `totalEfectivo`, `descuentoVisa`, `totalGeneral`, `totalSinIgv`, `manualFactor`, `appliedTotalMedicoCurrent` y los setters de porcentajes.
   - Referencia: render del grid (≈1248–1260).
4. Mantener request y PDF con seleccionados:
   - `construirPagoRequest(...)` ya usa `nuevasSelecciones`; mantener.
   - PDF ya filtra por `selectedServicios`; sin cambios.

## Cambios en el grid (DetallesGrid)
1. Habilitar los checkboxes siempre (sin bloquear por análisis/validación):
   - Eliminar/ignorar `areCheckboxesDisabled = isAnalysisLoaded || isValidationActive` y toda lógica de `disabled`/`pointerEvents` en los checkboxes.
   - Dejar deshabilitado únicamente si `esPagado === 1` para evitar doble pago.
   - Referencias: definición `areCheckboxesDisabled` (≈1658), uso en `<input type="checkbox" ...>` de filas (≈1795–1808) y master checkbox del header (≈1950–1961).
2. Selección individual y masiva:
   - `handleSelectServicio(serviceId, checked)` mantiene `selectedServicios` y llama `onSelectionChange`.
   - `handleSelectAll(checked)` selecciona/deselecciona todos los visibles no pagados.
3. Resumen y filas de totales:
   - Usar los totales recibidos por props (calculados en el padre) en las filas: TOTAL VISA, DESCUENTO VISA, TOTAL EFECTIVO, TOTAL, TOTAL SIN IGV.
   - Referencias: bloques de totales (≈1847–1900).
4. Contadores y resultado:
   - “Servicios seleccionados” y “Total comprobantes” mostrarán `selectedDetalles.length` y `totalSinIgv` (props).
   - “Pago médico total” usa `appliedTotalMedicoCurrent` (props).

## Flujo de validación por Excel
- Tras cargar Excel, continuar auto-seleccionando los válidos; luego permitir al usuario ajustar manualmente la selección (sin bloquear los checkboxes).

## Verificación
- Ejecutar `npm.cmd run build` para validar el frontend.
- Probar flujo: Analizar → Cargar Excel → Ajustar selección (checks) → Aplicar porcentajes → Generar PDF → Generar Pago.

## Notas
- No se modifica el endpoint ni el SP: el request ya se construye con los servicios seleccionados, y el total (`r_PagadoTotal`) se ordena desde el padre con el monto aplicado.
- Se evita doble contabilización deshabilitando el checkbox solo en `esPagado === 1`. 
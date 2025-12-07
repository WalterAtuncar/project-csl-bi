## Objetivo
Al hacer “Generar Pago”, pedir periodo (año/mes), validar existencia de cierre de Caja Mayor y, si existe, (1) registrar pagos por toda la grid; (2) abrir el Registro de Compras con datos precargados.

## UI: Selección de Periodo
1. Nuevo mini modal en `GenerarPagoModal.tsx` con dos selects:
   - `Año`: últimos 5 años incluyendo el actual, default año actual.
   - `Mes`: 01–12, default mes actual.
   - Botón “Seleccionar” que ejecuta validación.
2. UX: bloquear confirmación si no hay selección; mostrar ayuda y ejemplos.

## Validación de Cierre
1. Llamar al servicio `cajaService.checkCierreExists({ anio, mes })`.
2. Si `Exists === false`: alertar “No hay caja creada para ese periodo” y cerrar el mini modal.
3. Si `Exists === true`: guardar `cierreId = IdCajaMayorCierre` en estado local para el flujo siguiente.

## Registrar Pagos (cambio leve)
1. En lugar de usar únicamente `selectedServicios`, construir `servicesDetails` con TODA la grid de servicios visibles por médicos seleccionados (omitiendo `esPagado === 1`).
2. Mantener payload actual del POST (PDF incluido y `r_PagadoTotal` con el monto aplicado).

## Abrir Registro de Compras
1. Incrustar el `RegistroComprasModal` desde `GenerarPagoModal.tsx` y abrirlo tras el éxito del POST.
2. Pasar props:
   - `isOpen`, `onClose`, `onSaved` (refrescar si se requiere).
   - `idCajaMayorCierre: cierreId` y `idTipoCaja: 1`.
   - `initialData` con:
     - `fechaEmision`: fecha concurrente (hoy).
     - `importeTotal`: monto final aplicado.
     - `codigoMoneda`: `PEN`.
     - `idFamiliaEgreso`: `8`.
     - `idTipoEgreso`: `48`.
     - `observaciones`: "Pago de médicos periodo AAAA-MM".
     - `origen`: `pago_de_medicos`.
3. En `RegistroComprasModal`: usar `initialData.origen` (si existe) para `egresoBody.origen` en el `handleSubmit`.

## Integración y Estados
1. Estados nuevos en `GenerarPagoModal.tsx`:
   - `isPeriodoModalOpen`, `periodoAnio`, `periodoMes`, `cierreId`.
2. Secuencia del botón “Generar Pago”:
   - Si no hay periodo validado → abre mini modal.
   - Tras validación con cierre existente → ejecutar POST (toda grid) → abrir `RegistroComprasModal` con prefill.

## Verificación
1. `npm.cmd run build` para validar el bundle.
2. Prueba de flujo: seleccionar periodo → validar → generar pagos (toda grid) → abrir modal de compras con datos precargados.

## Alcance
- Solo UI y orquestación; no se modifican endpoints ni SP.
- Añadir campo opcional `origen` en el seteo del modal (sin cambiar backend: se respeta contrato actual).
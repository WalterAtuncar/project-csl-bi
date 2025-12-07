## Objetivo
Reordenar el flujo: "Generar Pago" construye objeto y abre Registro de Compras; tras registrar devuelve `idProveedor`, se genera PDF silencioso, se envía el pago con `i_MedicoTratanteId = idProveedor`, `r_PagadoTotal` igual al "Pago médico total" (monto aplicado luego de porcentajes), y `ServicesDetails` con todos los registros de la grilla pero con `r_Price`, `r_Porcentaje` y `r_Pagado` en `NULL`. Al finalizar, se muestra el PDF en visor.

## Ajustes clave
- `r_PagadoTotal`: usar exactamente el "Pago médico total" calculado después de aplicar porcentajes (valor `appliedTotalMedicoCurrent`).
- `ServicesDetails`: enviar **todos** los ítems de la grilla sin excepción (ignorar selección por checkbox) y establecer `r_Price`, `r_Porcentaje`, `r_Pagado` como `NULL` en el TVP, manteniendo `v_ServiceComponentId`.

## Frontend
### GenerarPagoModal.tsx
1) Botón "Generar Pago":
- Construir `servicesDetailsAll` con todos los `detallesFiltrados` (omitir `esPagado === 1` si es regla de negocio; si no, incluir también) y setear `r_Price=null`, `r_Porcentaje=null`, `r_Pagado=null`.
- Guardar `appliedTotalMedicoCurrent` como `r_PagadoTotal`.
- Abrir `RegistroComprasModal` con `initialData`.
2) Callback `onCompraRegistrada({ idProveedor, idMovimientoEgreso })`:
- Guardar `idProveedor` y ejecutar `handleImprimirPDF()` para capturar `pdfBase64` sin mostrar otro modal.
- Construir payload `GenerarPagoMedicoRequest` con:
  - `i_MedicoTratanteId = idProveedor`
  - Fechas `d_FechaInicio/d_FechaFin` del análisis ajustadas
  - `r_PagadoTotal = appliedTotalMedicoCurrent`
  - `v_Comprobante = pdfBase64`
  - `ServicesDetails = servicesDetailsAll` (con `r_* = null`)
- Enviar `POST api/PagoMedicos` y al éxito abrir visor PDF (`iframe` con `data:application/pdf;base64,...`).

### RegistroComprasModal.tsx
- Tras el insert correcto, invocar `onCompraRegistrada({ idProveedor, idMovimientoEgreso })`. Ya retornamos la fila completa; asegurar leer esos dos campos.

## Backend
- Controller `POST api/PagoMedicos` (PagoMedicosController) sin cambios.
- Repositorio `PagoMedicosRepository.GenerarPagoMedicoCompleto`: ya arma TVP `ServicesPaidDetailsType` con columnas `v_ServiceComponentId`, `r_Price`, `r_Porcentaje`, `r_Pagado`; debe aceptar `NULL` para los campos `r_*` (confirmar que el TYPE permita `NULL`; si no, ajustar TYPE a `NULL` para esos tres).
- SP `[dbo].[sp_GenerarPagoMedicoCompleto]`:
  - Debe tratar `r_Price`, `r_Porcentaje`, `r_Pagado` `NULL` y basarse en `r_PagadoTotal` como monto principal, ignorando los `r_*` si llegan `NULL`.

## SPs
- Validar que `ServicesPaidDetailsType` y el procedimiento `sp_GenerarPagoMedicoCompleto` soporten `NULL` en las columnas `r_Price`, `r_Porcentaje`, `r_Pagado`. Si actualmente están `NOT NULL`, cambiar a `NULL` en el TYPE y en las inserciones.

## UX
- "Generar Pago" → Registro de Compras → PDF silencioso → Pago → visor PDF.
- Toasts y manejo de errores en cada paso.

## Validación
- Verificar que se envía `r_PagadoTotal` del cálculo aplicado.
- Confirmar que el TVP se arma con `NULL` y que el SP acepta `NULL`.
- End-to-end: registro compra devuelve `idProveedor` → pago inserta y responde `paidId` → visor muestra PDF.

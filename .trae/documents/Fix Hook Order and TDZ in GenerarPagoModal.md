## Problema
- Al hacer “Generar análisis” explota con “Cannot access 'manualPercents' before initialization” y antes con “Invalid hook call”. Esto ocurre porque:
  - `manualPercents`/`manualInput` están declarados después de usar `manualPercents` en `useMemo(appliedTotalMedicoCurrent)`, activando la zona muerta temporal (TDZ).
  - Hay múltiples declaraciones y referencias mezcladas (`appliedTotalMedico` vs `appliedTotalMedicoCurrent`).

## Objetivo
- Reordenar y consolidar estados y cálculos para cumplir las reglas de Hooks y evitar TDZ.
- Unificar el cálculo del total aplicado y su uso en UI y payload.

## Cambios Propuestos (solo GenerarPagoModal.tsx)
1. **Mover estados arriba**
   - Declarar `manualPercents` y `manualInput` junto al resto de estados, antes de cualquier `useMemo` que los referencie.
   - Asegurar que solo existan UNA vez (eliminar duplicados después de `export default`).

2. **Unificar cálculo del pago aplicado**
   - Mantener una sola fuente de verdad: `appliedTotalMedicoCurrent` en `useMemo`, calculado como:
     - Sumar VISA y EFECTIVO
     - `descuentoVisa = visa * 0.95`
     - `totalGeneral = efectivo + descuentoVisa`
     - `totalSinIgv = totalGeneral * 0.82`
     - `factor = manualPercents.reduce(acc * (p/100), 1)`
     - `appliedTotalMedicoCurrent = totalSinIgv * factor` (si no hay porcentajes, usa 1)

3. **Actualizar referencias**
   - Reemplazar todo uso de `appliedTotalMedico` por `appliedTotalMedicoCurrent` en:
     - Tarjeta “Resultado aplicado”
     - Tarjeta “Pago médico total (aplicando % al total)”
     - Etiqueta del botón “Generar Pago”
     - Payload (`r_PagadoTotal`) y mensaje de éxito.

4. **Eliminar hooks fuera del componente**
   - Verificar que no existan `useState`/`useMemo`/`useEffect` después de `export default` o en lugares inválidos.

5. **Validación**
   - Ejecutar `npm run build` (cuando habilites PowerShell scripts).
   - Probar flujo: cargar Excel, generar análisis, aplicar porcentajes, generar pago.
   - (Opcional) Instalar React Developer Tools para inspeccionar props/state y confirmar orden de hooks.

## Resultado Esperado
- Sin errores de TDZ ni “Invalid hook call”.
- Botón y payload usan el monto correcto tras porcentajes.
- UI estable en todo el flujo (carga de Excel, análisis, porcentajes, generar pago).
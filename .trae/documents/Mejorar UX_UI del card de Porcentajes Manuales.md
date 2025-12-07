## Objetivo
Refactorizar el card "Aplicar porcentaje manual al pago del médico" para mejorar claridad, jerarquía visual y accesibilidad, sin modificar la lógica ni los cálculos existentes.

## Estructura y Layout
1. Convertir el card a un layout de 12 columnas:
   - Columna izquierda (8/12): Controles y ayudas.
   - Columna derecha (4/12): Resultado aplicado en un panel destacado.
2. Encabezado del card con título y la "Base" alineada a la derecha en tipografía secundaria.
3. Separadores sutiles entre bloques (controles básicos, porcentajes manuales, chips aplicados).

## Controles Básicos (fila superior)
1. Toggle "Restar IGV (18%)": estilo switch con estado claro y ayuda corta bajo el control.
2. Input "Descuento VISA %": campo compacto con step 0.01, min 0, max 100; etiqueta arriba, placeholder y helper de rango; mostrar badge del porcentaje aplicado al lado.
3. Tooltips en ambos controles con explicación breve del impacto.

## Porcentajes Manuales
1. Bloque "Nuevo porcentaje": input con placeholder, botón primario "Aplicar" y botón secundario "Reset".
2. Fila de presets rápidos (chips): 100%, 90%, 80%, 70% — clic agrega el porcentaje.
3. Listado de "Porcentajes aplicados": chips compactos con color y botón de eliminación (×), ordenados por aplicación.
4. Texto de ayuda: "Se aplican en cadena…" con ejemplo en tipografía menor.

## Panel de Resultado
1. Tarjeta destacada con borde y fondo suave:
   - Línea "Factor" en tipografía monoespaciada.
   - Línea "Pago médico" en tipografía grande, color positivo.
2. Mini resumen debajo opcional: "Total", "Total sin IGV" (si el IGV está activado), y "Descuento VISA" con valores condensados.

## Accesibilidad y Microcopias
1. Etiquetas asociadas a inputs y switches (`htmlFor`, `aria-checked`, `aria-describedby`).
2. Mensajes de error in-line cuando el input esté fuera de rango; deshabilitar "Aplicar" si inválido.
3. Foco visible y orden de tabulación lógico.

## Estilo y Consistencia
1. Usar tamaños de botón e input consistentes (altura 36–40px), espaciados `gap-4` y `space-y-4`.
2. Paleta acorde al tema: primario para acciones, gris para secundarios, verde para resultados.
3. Iconografía ligera (ej. info para tooltips) sin saturar.

## Implementación Técnica
1. Crear subcomponentes UI:
   - ToggleSwitch (control IGV)
   - PercentageChip (chip aplicado con botón de eliminar)
   - PresetChip (chip de preset rápido)
   - ResultCard (panel de resultado)
2. Reorganizar el JSX del card en `GenerarPagoModal.tsx` dentro del bloque existente, únicamente cambiando clases y estructura.
3. Reusar estados actuales: `includeIgv`, `visaDiscountPercent`, `manualPercents`, `manualInput`, y funciones `add/remove/reset` sin cambios.
4. No tocar cálculos ni requests.

## Verificación
1. Construir el frontend con `npm.cmd run build`.
2. Validar visualmente: legibilidad, foco, tooltips y que la interacción no cambie resultados.

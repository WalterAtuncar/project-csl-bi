# PLAN — Honorarios: validación por plantilla Excel como GATE del pago (boleta + fecha + monto)

> **Documento de implementación para ejecutor IA.** Autocontenido: contexto, cómo lo resuelve el
> legacy (investigado en vivo 2026-07-19), estado actual del modal conta con líneas exactas, las
> 3 deltas a construir, algoritmo de matching definitivo, fases con GATEs y casos de prueba con
> datos reales. Si algo contradice lo que ves en el código vivo, DETENTE y repórtalo al orquestador.
>
> Elaborado: 2026-07-19. Estado del repo: `main` @ `29f3f2a` == `origin/main`.
> **Cambio 100% FRONTEND** — cero backend, cero BD, cero endpoints nuevos.

---

## 0. Resumen ejecutivo

Flujo de negocio (PO): la clínica entrega una **plantilla Excel** al médico; el médico lleva su
propia cuenta de qué **boletas** atendió y la llena; al generar el pago, el usuario de contabilidad
analiza (consultorio + rango de fechas), selecciona médicos y las atenciones se precargan **con el
check DESHABILITADO**; recién al **cargar la plantilla del médico** el sistema valida **por
similitud de boleta + fecha + monto**, habilita el check SOLO en los registros que coinciden y
marca los que no. Después el flujo sigue exactamente como hoy.

**HALLAZGO CENTRAL (dimensiona el trabajo):** la mecánica de plantilla **YA EXISTE** en el modal
conta (port fiel del legacy): descarga de plantilla, carga, cruce por boleta+fecha, marcado de no
coincidentes, modal de errores y autoselección. Hoy es **OPCIONAL y no gatea los checks**. El
trabajo real son **3 DELTAS**:

| # | Delta | Precedente legacy |
|---|---|---|
| D-A | **Checks nacen deshabilitados**; solo se habilitan los validados por la plantilla | NO existe (legacy: checks siempre libres, `areCheckboxesDisabled=false` hardcodeado; su gate era a nivel de BOTÓN: "Generar Pago" solo con validación activa) |
| D-B | **Monto entra al cruce** (hoy solo boleta+fecha; la plantilla NI TIENE columna de monto) | NO existe |
| D-C | **"Similitud"**: normalización robusta del comprobante + tolerancia de monto + errores explícitos (hoy es igualdad exacta y las filas incompletas se descartan EN SILENCIO) | Parcial (normalizador de fechas sí existe y es bueno; se reutiliza) |

`puedeRegistrar` además debe exigir la validación activa (restituye el gate que el legacy tenía a
nivel de botón).

### 0.1 Decisiones de diseño APLICADAS (respaldadas por evidencia — ver §2.3; el PO puede vetar)

| # | Decisión | Por qué |
|---|---|---|
| DD1 | El monto de la plantilla se compara contra **`monto`** (= `venta.d_Total`, **TOTAL de la boleta, BRUTO con IGV**) — NO contra `precioServicio` (línea) | Es el número IMPRESO en el comprobante que el médico ve y anota. Evidencia: boleta B008-00107106 total 296.00 con líneas de cardio que suman 136.50 — el médico anota 296.00. Todas las filas fan-out de una boleta comparten `monto` → 1 fila de plantilla valida todas (consistente con el comportamiento actual) |
| DD2 | Tolerancia de monto: **±0.01** (centavo, por redondeo). Comprobante: normalizado (trim + UPPER + correlativo con pad a 8 dígitos). Fecha: **igualdad exacta de DÍA** contra la fecha de la boleta | "Similitud" acotada y determinista. El correlativo real SIEMPRE es 8 dígitos zero-padded (verificado en las 10 series de jun-2026) — el pad salva "B008-107041" |
| DD3 | La fecha se compara contra **`fechaPago`** (= `venta.t_InsertaFecha`, fecha de EMISIÓN de la boleta) y se **corrigen las INSTRUCCIONES de la plantilla** para pedir "fecha de emisión de la boleta" (hoy piden "fecha de la atención" — contradicción heredada del legacy: en ~5% de los casos, 222/4,481 en jun, la venta se emite otro día que la atención) | La fecha de atención NO viene en el response del análisis conta; corregir la instrucción resuelve la contradicción sin tocar el SP |

### 0.2 Fuera de alcance

- Backend/BD: ningún cambio (el matching es y sigue siendo 100% client-side, como en el legacy).
- Persistir la evidencia de la validación (qué plantilla se cargó) — posible mejora futura.
- La página legacy `/honorarios-medicos` y su `GenerarPagoModal.tsx`: NO se tocan (huérfana,
  se mantiene por decisión del PO 2026-07-19 hasta cerrar las pruebas de /conta).
- Tolerancia de fecha ±N días para el ~5% fecha-venta≠fecha-atención: NO en este sprint
  (la instrucción corregida lo mitiga; si en la práctica genera fricción, se decide después).

---

## 1. Cómo lo resuelve el legacy (investigado — referencia, NO se modifica)

- **Todo frontend**: plantilla generada client-side (`xlsx`/SheetJS), carga y matching en el
  navegador. El API 8183 **no tiene ni un byte** de lógica de plantilla/Excel/upload (verificado
  por grep en `SanLorenzoMicroservices/SanLorenzo.Core.Services`); solo provee el análisis
  (`POST /Caja/PagoMedicoPorConsultorio` → `dbo.PagoMedicoPorConsultorio_SP` en SigesoftDesarrollo_2).
- **Matching legacy** (`components/UI/GenerarPagoModal.tsx:1069-1221`): igualdad EXACTA de
  comprobante (sin trim siquiera) + igualdad de DÍA con normalizador de fechas robusto
  (`formatDateToDDMMYYYY`, maneja serial Excel con bug 1900, DD/MM/YYYY, ISO, puntos, 8 dígitos).
  **Sin monto. Sin tolerancias. Checks nunca deshabilitados** (`:2283`). Gate a nivel de botón:
  "Generar Pago" solo se renderiza con `isValidationActive===true` (`:1692-1695`).
- **Plantilla legacy** (`pages/HonorariosMedicos/HonorariosMedicos.tsx:391-496`): 2 hojas
  (Instrucciones + "Plantilla Atenciones"), columnas `Fecha Servicio | Paciente | Comprobante`,
  ejemplos en filas 2-3. Ya portada a conta en `excelHonorarios.ts`.
- **Identidad de la boleta** (verificada con el SP vivo + datos jun-2026): `v_ComprobantePago` del
  análisis = `venta.v_SerieDocumento + '-' + v_CorrelativoDocumento` (UNA boleta, la impresa
  SUNAT que paga el paciente; correlativo SIEMPRE 8 dígitos). ⚠️ NO confundir con la lista pipe
  `service.v_ComprobantePago` de Sigesoft (esa es otra columna del universo, con espacios/padding).
  La fecha del análisis (`fechaPago`) = `venta.t_InsertaFecha` (emisión), pese al nombre.

## 2. Estado ACTUAL del modal conta (lo que se toca — con líneas verificadas 2026-07-19)

Archivos (los ÚNICOS del sprint):
- `react-project/src/pages/Contabilidad/components/honorarios/GenerarPagoHonorarioModal.tsx` (1003 líneas)
- `react-project/src/pages/Contabilidad/components/honorarios/excelHonorarios.ts`

### 2.1 Mecánica existente que SE CONSERVA (no reinventar)

- Estados de validación YA existentes: `validacionActiva` (L96), `validKeys: Set<string>` (L97),
  `erroresExcel` (L98), `showErroresExcel` (L99), `fileRef` (L100).
- Botones "Descargar plantilla" / "Cargar Excel" (L584-590; el segundo `disabled={!analizado}`),
  input file oculto (L590).
- `onExcelFile` (L361-421): `XLSX.read` (L364-365), lee hoja **'Plantilla Atenciones'** por nombre,
  filas desde la 2, col A=fecha / col C=comprobante **por índice posicional** (L370-375, trimea);
  cruce contra `rowsTipo`: `getFirstComprobante(row.v_ComprobantePago)` === comprobante Excel &&
  `formatDateToDDMMYYYY(excel) === formatDateToDDMMYYYY(soloFechaPago(row.fechaPago))` (L378-396);
  puebla `validKeys` + `erroresExcel` ('No coincide la fecha' / 'No se encuentra en el sistema');
  **autoselecciona** médicos+servicios válidos pendientes (L403-408).
- Columna "Válido" en el grid solo si `validacionActiva` (L716; Check emerald / XCircle rose
  L737-741). Modal de errores (L945-967). `limpiarValidacion` (L422).
- Resets que ya juegan a favor del gate: `analizar()` resetea selección+filtros+validación
  (L172-175) y `cambiarTipoProduccion` también (L426-433) → con el gate puesto, los checks
  "renacen" deshabilitados gratis en cada análisis o cambio de radio.
- Checks hoy: fila L734 `disabled={r.esPagado === 1}` (único disable); check "todos" L714 sobre
  `seleccionablesVisibles` (L332); `toggleServicio` (L325-331); `toggleMedico` purga keys (L309-324).
- Gate de submit `puedeRegistrar` (L436): 1 médico + ≥1 servicio + fechaPago + total>0 +
  comprobante válido — **la validación Excel HOY NO participa**.
- Cruce acotado a `rowsTipo` (radio CLINICA/SISOL, L193) y excluye `medicoId===11` (SIN MÉDICO
  TRATANTE). Se conserva.

### 2.2 Contrato del análisis (campos del cruce — `contaTypes.ts` L590-619, nombres EXACTOS)

| Campo | Uso en el matching |
|---|---|
| `v_ComprobantePago` (string) | boleta `SERIE-NNNNNNNN`; usar `getFirstComprobante` (primer token de `\|`) como hoy |
| `serie` / `numero` | equivalente descompuesto (no hace falta usarlos si se usa el anterior) |
| `fechaPago` (string) | ⚠️ `dd/MM/yyyy HH:mm:ss`, NO ISO — SIEMPRE `soloFechaPago()`/slice, JAMÁS `new Date()` (trampa timezone: date-only parsea UTC y resta un día en Lima) |
| `monto` (number) | **total de la boleta, BRUTO c/IGV** (`venta.d_Total`), repetido en cada fila fan-out → base del cruce de monto (DD1) |
| `precioServicio` (number) | monto por línea — NO se usa en el cruce (sí sigue en KPIs/cálculo/payload como hoy) |
| `esPagado` (0\|1) | 1 = nunca habilitable |
| `_key` | `v_ServiceId\|consultorioId\|idVenta\|índice` (L178) — la clave de `validKeys`/`selectedKeys` |

### 2.3 Evidencia que sustenta las decisiones (jun-2026, verificada en BD viva)

- Correlativos: LEN=8 exacto en las 10 series del universo jun (B008: 2,151; B004: 2,119; F00x; RSL).
- Fan-out: 1 fila por línea de `ventadetalle`; 91 boletas de jun (2%) cubren >1 service (1 cruza
  consultorios) → una fila de plantilla puede validar/autoseleccionar varios servicios. Aceptado.
- 8 services de jun con 2+ boletas en la lista pipe → el análisis genera una fila por boleta; el
  médico anota una. Aceptado (validará la que anotó).
- 119 ventas anuladas en jun (`i_Eliminado=1`) desaparecen del análisis → boleta del médico cae en
  "No se encuentra en el sistema" (correcto; el usuario lo resuelve viendo el motivo).
- 222/4,481 ventas (~5%) con emisión en día distinto a la atención → DD3 (instrucción corregida).

---

## 3. Diseño definitivo

### 3.1 Plantilla v2 (`excelHonorarios.ts`)

1. **Nueva columna D "Monto (S/)"** en la hoja 'Plantilla Atenciones' — **APPEND al final**
   (el parser es posicional: A=fecha, C=comprobante; insertar en medio rompería plantillas). Cabecera
   fila 1: `Fecha Servicio | Paciente | Comprobante | Monto (S/)` (wch 15/35/20/12). Ejemplos filas
   2-3 actualizados con monto (`296.00`).
2. **Instrucciones (hoja 1) corregidas/ampliadas**:
   - Fecha: "fecha de EMISIÓN de la boleta — la impresa en el comprobante (dd/mm/aaaa)". (DD3 —
     reemplaza "fecha en que se realizó la atención".)
   - Comprobante: "tal como está impreso: SERIE-NÚMERO, ej. B008-00074950".
   - Monto: "TOTAL de la boleta tal como está impreso, con decimales (ej. 296.00). Si la boleta
     incluye servicios de otras áreas, igual anote el TOTAL impreso."
   - Advertir: no borrar la fila de cabeceras; una fila por boleta; no dejar filas a medias.
3. `descargarPlantillaAtenciones()` (L7-69) es el único punto a tocar aquí; `formatDateToDDMMYYYY`
   (L73) y `getFirstComprobante` (L132) NO se tocan (se reutilizan).

### 3.2 Parser + matching (en `onExcelFile`, L361-421)

**Lectura** (extiende L370-375):
- Fila válida = tiene col A (fecha) Y col C (comprobante) Y col D (monto). Fila con ALGUNO pero no
  todos → **ya NO se descarta en silencio**: entra a `erroresExcel` con motivo
  `'Fila incompleta en la plantilla (fila N)'`.
- **Detección de plantilla vieja**: si la celda D1 de cabecera no empieza con 'Monto' → abortar la
  carga con toast + entrada en errores: `'Plantilla desactualizada: descargue la plantilla nueva
  (incluye la columna Monto)'`. No validar nada con plantilla de 3 columnas.
- Parseo del monto: aceptar número o texto; normalizar texto: quitar `S/`, espacios y separador de
  miles; aceptar coma decimal (`"296,00"` → 296.00). No parseable → motivo
  `'Monto inválido (fila N)'`.

**Normalización del comprobante** (nueva función local, aplicada al valor del Excel):
```
normComprobante(c):
  c = String(c).trim().toUpperCase()
  si matchea /^([A-Z0-9]+)-(\d{1,8})$/  → SERIE + '-' + correlativo con padStart(8,'0')
  si no matchea (sin guión, caracteres raros) → se usa tal cual trim+upper (fallará el match
    y caerá en 'No se encuentra en el sistema' — no inventar heurísticas de reconstrucción)
```
El lado sistema NO necesita normalización (ya viene canónico `SERIE-NNNNNNNN` de
`getFirstComprobante`).

**Duplicados en la plantilla**: si el mismo comprobante normalizado aparece 2+ veces, se usa la
PRIMERA fila y las siguientes se reportan con motivo `'Comprobante duplicado en la plantilla
(fila N)'` (no invalidan la primera).

**Matching** (reemplaza el cruce L378-396) — por cada fila del SISTEMA (`rowsTipo`), buscar su
fila de plantilla por comprobante normalizado:

```
match(filaSistema, filaExcel):
  boleta:  getFirstComprobante(filaSistema.v_ComprobantePago) === filaExcel.comprobanteNorm   // exacto
  fecha:   formatDateToDDMMYYYY(filaExcel.fecha) === formatDateToDDMMYYYY(soloFechaPago(filaSistema.fechaPago))  // día exacto (DD3)
  monto:   |filaExcel.monto − filaSistema.monto| <= 0.01                                       // DD1 + DD2 (monto = total boleta bruto c/IGV)
```
- Las 3 condiciones → `validKeys.add(_key)`.
- Boleta+fecha OK, monto NO → motivo `'No coincide el monto (plantilla: X / sistema: Y)'`.
- Boleta OK, fecha NO → motivo `'No coincide la fecha'` (como hoy).
- Fila de plantilla sin ninguna fila de sistema → `'No se encuentra en el sistema'` (como hoy).
- Fila de sistema sin match → queda deshabilitada y marcada (XCircle en columna "Válido", como hoy).
- La **autoselección** de médicos+servicios válidos pendientes (L403-408) SE CONSERVA tal cual
  (válido → check habilitado Y marcado; el usuario puede desmarcar).

### 3.3 Gate de los checks (delta D-A)

1. Check de fila (L734): `disabled={r.esPagado === 1 || !validacionActiva || !validKeys.has(r._key)}`.
2. `seleccionablesVisibles` (L332): mismo predicado (alimenta el check "todos" del thead L714 —
   con validación inactiva no hay nada seleccionable y el "todos" queda inerte).
3. `toggleServicio` (L325-331): early-return defensivo si `!validacionActiva || !validKeys.has(key)`
   (protege contra cualquier ruta de UI no prevista).
4. `puedeRegistrar` (L436): añadir `&& validacionActiva`. (No hace falta exigir
   `selectedKeys ⊆ validKeys`: con 1-3 es imposible marcar un no-válido, y los resets de
   `analizar`/`cambiarTipoProduccion` ya limpian selección y validación juntos.)
5. `limpiarValidacion` (L422): SE CONSERVA el botón (útil para recargar otra plantilla), pero debe
   **además vaciar `selectedKeys`** (al des-validar, los checks vuelven a nacer deshabilitados y no
   pueden quedar keys marcadas huérfanas).
6. **UX**: cuando `analizado && !validacionActiva`, banner ámbar sobre el grid de atenciones:
   *"Cargue la plantilla llena del médico para habilitar la selección de atenciones (botón
   'Cargar Excel')."* Reusar el estilo de banners/notas existente del modal.
7. El botón "Cargar Excel" queda habilitado tras Analizar aunque no haya médicos seleccionados
   (comportamiento actual): la autoselección puede marcar al médico correcto sola. Sin cambio.

### 3.4 Lo que NO cambia (regresión cero)

Análisis (`honorariosAnalisis`, timeout 120s), radio CLINICA/SISOL y anti-mixto, KPIs y cálculo
(VISA −4% / IGV / % manuales — siguen sobre `precioServicio`), payload de `registrar()` y
`POST /honorarios/pagos`, comprobante anidado, anti-doble-pago, recibo PDF, `esPagado===1`,
exclusión `medicoId===11`, modal de errores y columna "Válido" (solo ganan motivos nuevos).

---

## 4. Fases de ejecución (todo bi-frontend; verificación SOLO con `npx vite build`)

### FASE 1 — Plantilla v2 (`excelHonorarios.ts`)
Según §3.1. **GATE 1**: `vite build` verde; descarga manual de la plantilla → 2 hojas, cabecera
`Fecha Servicio | Paciente | Comprobante | Monto (S/)`, ejemplos con monto, instrucciones
corregidas (dice "fecha de EMISIÓN de la boleta" y explica el TOTAL impreso).

### FASE 2 — Parser + matching (`GenerarPagoHonorarioModal.tsx`, `onExcelFile`)
Según §3.2 (normalización, monto, plantilla vieja, filas incompletas, duplicados, motivos nuevos).
**GATE 2** (manual con el stack arriba, casos de la §5): cada caso produce exactamente el
resultado esperado (válido / motivo correcto en el modal de errores).

### FASE 3 — Gate de checks + submit (§3.3)
**GATE 3**: tras Analizar, TODOS los checks deshabilitados (salvo nada — ni los pendientes) y el
check "todos" inerte; banner visible; tras cargar plantilla válida, SOLO los matcheados se
habilitan (y quedan auto-marcados); "Registrar" bloqueado sin validación activa;
`limpiarValidacion` vuelve todo a deshabilitado sin keys huérfanas; cambiar el radio
CLINICA/SISOL o re-Analizar resetea validación+selección.

### FASE 4 — QA de integración (qa-tester o orquestador)
- `vite build` verde final.
- E2E con el stack arriba (API 5090/Vite 5173, login `sa`/`Sa#2026Demo`): flujo completo con una
  plantilla real construida desde datos del análisis (consultorio CARDIOLOGIA, jun-2026) hasta
  DEJAR EL PAGO SIN REGISTRAR (no sembrar pagos en este sprint; el ciclo de registro ya quedó
  probado E2E el 2026-07-19).
- Regresión: exportes de honorarios, lista/detalle/recibo, radio SISOL, anti-doble-pago intactos.

**Cierre**: commits del orquestador (`feat(conta): honorarios — plantilla Excel como gate del
pago (boleta+fecha+monto)`) previa aprobación del usuario + digest a continual-learning.

---

## 5. Casos de prueba (GATE 2/3 — construir la plantilla con datos REALES del análisis)

Preparación: Analizar CARDIOLOGIA (consultorioId de catálogo) jun-2026, radio Clínica. Tomar de la
grilla 3 filas reales (boleta/fecha/monto visibles). Construir un .xlsx con la plantilla v2:

| # | Fila de plantilla | Resultado esperado |
|---|---|---|
| 1 | Boleta+fecha+monto exactos de una fila del sistema | ✅ válida; check habilitado y auto-marcado; médico auto-seleccionado |
| 2 | Misma boleta, monto con diferencia 0.01 | ✅ válida (tolerancia DD2) |
| 3 | Misma boleta, monto −10.00 | ❌ 'No coincide el monto (plantilla: X / sistema: Y)'; check deshabilitado |
| 4 | Boleta válida, fecha del día siguiente | ❌ 'No coincide la fecha' |
| 5 | Boleta `B008-107041` (sin zero-pad) correcta | ✅ válida (normalización pad a 8) |
| 6 | Boleta en minúsculas con espacios `' b008-00107041 '` | ✅ válida (trim+upper) |
| 7 | Boleta inexistente `B999-00000001` | ❌ 'No se encuentra en el sistema' |
| 8 | Fila solo con fecha (sin comprobante ni monto) | ❌ 'Fila incompleta en la plantilla (fila N)' — NO descartada en silencio |
| 9 | Monto como texto `"S/ 296,00"` | ✅ parsea a 296.00 |
| 10 | La misma boleta repetida 2 veces | 1ª cuenta; 2ª → 'Comprobante duplicado en la plantilla (fila N)' |
| 11 | Plantilla VIEJA de 3 columnas | ❌ carga abortada: 'Plantilla desactualizada...' |
| 12 | Boleta multi-servicio (fan-out) con el TOTAL impreso | ✅ valida TODAS las filas de esa boleta (monto compartido) |
| 13 | (Gate) Sin cargar plantilla: ningún check operable, "todos" inerte, Registrar bloqueado | ✅ |
| 14 | (Gate) 'Quitar validación' tras marcar filas | checks vuelven a deshabilitado, selección vacía |
| 15 | (Gate) Cambiar radio a SISOL tras validar | validación+selección reseteadas, checks deshabilitados |

## 6. Riesgos y trampas (checklist del ejecutor)

1. ❑ JAMÁS `new Date()` sobre fechas del análisis ni date-only del Excel (timezone Lima) — solo
   `formatDateToDDMMYYYY`/`soloFechaPago` (ya existen, reutilizar).
2. ❑ `fechaPago` es `dd/MM/yyyy HH:mm:ss` (NO ISO). `monto` = TOTAL boleta bruto c/IGV (no confundir
   con `precioServicio`, que sigue siendo la base de KPIs/cálculo/payload).
3. ❑ Parser posicional: Monto SOLO como columna D (append); detectar plantilla vieja por cabecera D1.
4. ❑ No tocar: `formatDateToDDMMYYYY`, `getFirstComprobante`, cálculo, submit, backend, página
   legacy, `contaTypes.ts`, `ContabilidadService.ts`.
5. ❑ Los resets existentes (`analizar` L172-175, `cambiarTipoProduccion` L426-433) ya limpian
   validación+selección — no duplicar esa lógica, solo apoyarse en ella.
6. ❑ `limpiarValidacion` debe vaciar también `selectedKeys` (nueva línea) — si no, quedan keys
   marcadas con checks deshabilitados.
7. ❑ Motivos de error: strings NUEVOS solo en `erroresExcel`/modal — la columna "Válido" sigue
   binaria (Check/X).
8. ❑ Una boleta puede validar filas de OTRO médico (fan-out multi-servicio, 91 casos en jun) —
   aceptado: el pago sigue siendo de exactamente 1 médico y el usuario resuelve al registrar.
9. ❑ Verificar SOLO con `npx vite build` (nunca tsc). No levantar/matar el stack (lo hace el
   orquestador).
10. ❑ No sembrar pagos en la BD durante las pruebas de este sprint (el ciclo de registro ya está
    probado); el E2E llega hasta el botón Registrar habilitado.

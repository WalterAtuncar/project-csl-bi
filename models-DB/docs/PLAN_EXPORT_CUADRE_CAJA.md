# PLAN — Export Excel + PDF del "Cuadre de caja diario" (`/conta/caja`)

> **Para el ejecutor (IA):** este plan es autocontenido — toda la investigación ya está hecha y las
> decisiones cerradas por el usuario. NO re-investigues el legacy ni la BD. Implementa exactamente lo
> especificado, verifica con los GATEs de §8 y reporta. **100% frontend** — prohibido tocar
> service HTTP, API .NET, SPs o BD.

Fecha del plan: 2026-07-18 · Autor: orquestador (sesión 07-18) · Estado: **APROBADO para ejecutar**

---

## 1. Objetivo

En la card **"Cuadre de caja diario"** de `react-project/src/pages/Contabilidad/CajaDiaria.tsx`,
agregar dos exportaciones del cuadre del día seleccionado:

1. **Excel (.xlsx)** — toda la sección de comprobantes (ingresos + egresos) + un consolidado al final.
2. **PDF** — modelo *parecido* al reporte "Cuadre de Caja" del SAMBHS (layout descrito en §6).

## 2. Decisiones cerradas (del usuario — NO reabrir)

| # | Decisión | Valor |
|---|---|---|
| 1 | Alcance de datos | **WYSIWYG**: se exporta exactamente lo que está en pantalla, respetando los filtros activos (tipos de caja y medios de pago). El encabezado del export declara los filtros. |
| 2 | Campos manuales del SAMBHS (Dinero en caja / Depósito día ant. / Nº operación) | **OMITIR**. No agregar inputs. En el PDF pueden ir como líneas en blanco para llenar a mano (parte del bloque de firmas), pero NO se piden en la UI. |
| 3 | Columnas de comprobantes | **Las actuales del front** (front-only). NO extender SP/API para traer Cliente/Cantidad/Precio. |
| 4 | Entrega | PDF se abre en **pestaña nueva** (patrón ReciboPDF); Excel se **descarga**. Nombres: `cuadre-caja-YYYY-MM-DD.xlsx` / `cuadre-caja-YYYY-MM-DD.pdf`. |
| 5 | Ubicación de los botones | **Dentro de la card del cuadre, inmediatamente DESPUÉS del bloque "Cuadre por tipo de caja"** (y antes de la línea placeholder "Dinero en caja: — · …"). |

## 3. Estado actual del código (anclajes verificados 2026-07-18)

Archivo principal: `react-project/src/pages/Contabilidad/CajaDiaria.tsx`. Todo lo necesario **ya está
en memoria** en el componente (no hay que fetchear nada):

| Dato | Anclaje (línea aprox.) | Qué es |
|---|---|---|
| `diaSeleccionado: string \| null` | estado | Día del cuadre, formato `YYYY-MM-DD` |
| `cuadre: CuadreDiaResponse \| null` | estado | Respuesta cruda del API |
| `unidadesDisponibles: string[]` | memo `:96` | Distinct unidades del día (ingresos ∪ egresos) |
| `unidadesSel: string[]` | estado | Unidades marcadas en los chips |
| `ingresosVisibles: CuadreDiaIngresoRow[]` | memo `:109` | Ingresos filtrados por unidad — **fuente del export** |
| `egresosVisibles: CuadreDiaEgresoRow[]` | memo `:114` | Egresos filtrados por unidad — **fuente del export** |
| `filtroTipoCajaActivo: boolean` | `:125` | Hay filtro de unidades activo |
| `filtroActivo: boolean` | `:41` | Hay filtro de MEDIOS DE PAGO activo (server-side) |
| `medios`, `seleccion`, `incluirCredito` | estados | Estado del filtro de medios |
| `totalesPorFormaPago: [string, number][]` | memo `:140` | `*****TOTAL*****` por forma de pago (desc) |
| `totalesPorTipoCaja: [string, number][]` | memo `:150` | Ingresos por unidad (desc) |
| `totalIngresosCuadre`, `totalEgresosCuadre`, `netoDia` | `:161-163` | Totales ya filtrados |
| `cuadreVacio` | `:164` | Día sin movimientos (sobre el cuadre CRUDO) |
| `labelOrigen(o)` | helper top-of-file | `'CAJA LEGACY'` → `'CAJA MAYOR'` (ver §7.R2) |

Tipos (en `react-project/src/services/contabilidad/contaTypes.ts`):

```ts
interface CuadreDiaIngresoRow { Documento: string|null; Unidad: string; i_IdFormaPago: number|null;
                                FormaPago: string; EsCobranzaCredito: boolean; Monto: number; }
interface CuadreDiaEgresoRow  { Origen: string; Documento: string|null; CentroCosto: string;
                                Concepto: string|null; Monto: number;
                                i_IdTipoCaja: number|null; Unidad: string; }
```

Helpers reutilizables:
- `unidadCorto(u)` / `unidadColor(u)` — `react-project/src/pages/Contabilidad/components/dashboard/dashHelpers.ts` ("ATENCION_ASISTENCIAL" → "ASISTENCIAL").
- Patrón Excel: `react-project/src/pages/Contabilidad/components/honorarios/excelHonorarios.ts` (SheetJS: `book_new` + `aoa_to_sheet` + `!cols` + `writeFile`).
- Patrón PDF: `react-project/src/pages/Contabilidad/components/honorarios/ReciboPDF.tsx` (`@react-pdf/renderer`: `<Document><Page>` + `StyleSheet` + `pdf(<Doc/>).toBlob()` + `window.open`). Contiene las constantes `CLINICA` (nombre/RUC/dirección/teléfono/email) y `LOGO_URL = '/assets/images/logo-csl.png'`.

Dependencias ya instaladas: `xlsx@0.18.5`, `@react-pdf/renderer@4.3.0`. **No instalar nada.**

## 4. Arquitectura de archivos

| Acción | Archivo |
|---|---|
| **CREAR** | `react-project/src/pages/Contabilidad/components/caja/excelCuadreCaja.ts` |
| **CREAR** | `react-project/src/pages/Contabilidad/components/caja/CierreCajaPDF.tsx` |
| **EDITAR** | `react-project/src/pages/Contabilidad/CajaDiaria.tsx` (armar payload + 2 botones) |
| **EDITAR (mínimo)** | `ReciboPDF.tsx`: agregar `export` a las constantes `CLINICA` y `LOGO_URL` (una sola fuente de datos de la clínica). NO tocar nada más de ese archivo. |

La carpeta `components/caja/` no existe aún — créala (convención hermana de `components/honorarios/`, `components/dashboard/`, `components/epidemiologia/`).

## 5. Contrato compartido de datos (definirlo en `excelCuadreCaja.ts` y que el PDF lo importe)

Ambos exports reciben el MISMO payload, que `CajaDiaria.tsx` arma una sola vez:

```ts
export interface CuadreExportData {
  fecha: string;                                  // diaSeleccionado (YYYY-MM-DD)
  generadoPor: string;                            // Username de la sesión conta (ver §7.R4)
  // WYSIWYG: filas YA filtradas, con Origen ya pasado por labelOrigen() (ver §7.R2)
  ingresos: { Documento: string; Unidad: string; FormaPago: string; Condicion: 'CONTADO'|'CRÉDITO'; Monto: number }[];
  egresos:  { Origen: string; Documento: string; Unidad: string; Concepto: string; Monto: number }[];
  totalesPorFormaPago: [string, number][];        // desc, del memo existente
  totalesPorTipoCaja: [string, number][];         // desc, del memo existente (solo ingresos)
  totalIngresos: number; totalEgresos: number; neto: number;
  // Estado de filtros para el encabezado:
  filtroUnidades: string[] | null;                // null = todas; si no, unidadCorto() de las seleccionadas
  filtroMedios: string | null;                    // null = sin filtro; si no, "N de M medios" (+ " · crédito excluido")
}
```

Notas de mapeo (las hace `CajaDiaria.tsx` al armar el payload):
- `Condicion` = `r.EsCobranzaCredito ? 'CRÉDITO' : 'CONTADO'`.
- `Documento`/`Concepto` null → `'—'`.
- `egresos[].Origen` = `labelOrigen(r.Origen)` (obligatorio, §7.R2). `Unidad` = cruda (el export aplica `unidadCorto` al render).
- `filtroUnidades` = `filtroTipoCajaActivo ? unidadesSel.map(unidadCorto) : null`.
- `filtroMedios` = `filtroActivo ? \`${seleccion.length} de ${medios.length} medios${!incluirCredito ? ' · crédito excluido' : ''}\` : null`.

## 6. Especificación de cada export

### 6.1 Excel — `exportarCuadreCajaExcel(data: CuadreExportData): void`

Un solo workbook, **una hoja** llamada `Cuadre YYYY-MM-DD`, construida con `aoa_to_sheet` (array de
arrays). Estructura vertical (bloques separados por fila vacía):

```
CLÍNICA SAN LORENZO                                  ← CLINICA.nombre
CUADRE DE CAJA DIARIO — {fecha dd/mm/yyyy}
Tipos de caja: {TODAS | lista unidadCorto separada por ", "}
Medios de pago: {Todos | filtroMedios}               ← solo si filtroMedios != null mostrar el texto
Generado por: {generadoPor} · {fecha y hora local es-PE}

INGRESOS
#  Documento  Unidad  Forma de pago  Condición  Monto
1  BV01-...   ASISTENCIAL  EFECTIVO SOLES  CONTADO  120.50    ← Monto = NÚMERO (no string)
...
TOTAL INGRESOS                                       {suma}   ← número

EGRESOS                                              ← omitir bloque si egresos.length === 0
#  Origen  Documento  Unidad  Concepto  Monto
1  CAJA MAYOR  ECA-00028236  ASISTENCIAL  PAGO POR...  108.00
...
TOTAL EGRESOS                                        {suma}

CONSOLIDADO
Totales por forma de pago
{FormaPago}   {monto}   {pct% sobre totalIngresos, 1 decimal}
...
Total ingresos            {totalIngresos}
Total egresos             {totalEgresos}
NETO DEL DÍA              {neto}

Resumen por tipo de caja (unidad)
Unidad        Ingresos   Egresos   Neto
ASISTENCIAL   {…}        {…}       {…}       ← ver regla abajo
...
```

Reglas del Excel:
- **Montos como `number`** en las celdas (jamás strings con "S/"), para que Excel pueda sumar/filtrar.
  Los rótulos/encabezados sí son strings. Unidades renderizadas con `unidadCorto`.
- **Resumen por unidad**: `totalesPorTipoCaja` solo trae ingresos. Calcula los egresos por unidad
  agrupando `data.egresos` por `Unidad` (client-side, igual patrón que los memos). Neto = ingresos − egresos
  por unidad. Incluye filas de unidades que solo tienen egresos (ingresos 0).
- `ws['!cols']` con anchos razonables (p.ej. `[{wch:4},{wch:18},{wch:16},{wch:18},{wch:11},{wch:12}]`).
- Descarga: `XLSX.writeFile(wb, \`cuadre-caja-${data.fecha}.xlsx\`)`.
- La fecha legible se deriva del string `fecha` por split (`YYYY-MM-DD` → `dd/mm/yyyy`) — **NO** usar
  `new Date('YYYY-MM-DD')` (parse UTC corre el día en Lima; gotcha conocido).

### 6.2 PDF — `CierreCajaPDF.tsx` (estilo SAMBHS)

`@react-pdf/renderer`, página **A4 vertical**, Helvetica (como `ReciboPDF`). Exportar una función
`abrirCierreCajaPDF(data: CuadreExportData): Promise<void>` que hace `pdf(<Doc/>).toBlob()` +
`window.open(URL.createObjectURL(blob))` + `revokeObjectURL` diferido (patrón exacto de
`abrirReciboHonorarioPDF`).

Layout (imita el "Cuadre de Caja" del SAMBHS con nuestros campos — referencia visual: cabecera con
logo + título central + datos a la derecha; secciones con banda gris de título; totales de pie por
sección; resumen final por unidad):

```
┌───────────────────────────────────────────────────────────────┐
│ [LOGO]   CUADRE DE CAJA                    Generado por: {u}  │  ← cabecera 3 zonas, borde
│          CLÍNICA SAN LORENZO               Cuadre de la fecha:│    inferior verde (patrón
│          RUC ...                           {dd - mm - yyyy}   │    ReciboPDF)
│                                            Impresión: {ahora} │
├───────────────────────────────────────────────────────────────┤
│ Tipos de caja: TODAS | {lista} · Medios: Todos | {texto}      │  ← línea de filtros (WYSIWYG)
│                                                               │
│ ▓ INGRESOS ▓                                (banda gris)      │
│ Itm │ Documento │ Unidad │ Forma de pago │ Cond. │ Monto      │
│ ...                                                           │
│                       TOTAL INGRESOS:           S/ {…}        │
│                                                               │
│ ▓ EGRESOS ▓                                 (banda gris)      │  ← omitir si no hay
│ Itm │ Origen │ Documento │ Unidad │ Concepto │ Monto          │
│ ...                                                           │
│                       TOTAL EGRESOS:            S/ {…}        │
│                                                               │
│ ▓ RESUMEN POR FORMA DE PAGO ▓               (banda gris)      │
│ *****TOTAL***** EFECTIVO SOLES      62.5%       S/ {…}        │  ← estilo SAMBHS/pantalla
│ *****TOTAL***** VISA                ...                       │
│ ──────────────────────────────────────────────────            │
│ Total ingresos                                  S/ {…}        │
│ Total egresos                                  −S/ {…}        │
│ NETO DEL DÍA                                    S/ {…}        │  ← negrita, verde/rojo
│                                                               │
│ ▓ RESUMEN DE CAJA POR UNIDAD ▓              (banda gris)      │
│ Unidad       │ Ingresos │ Egresos │ Neto                      │
│ ASISTENCIAL  │ …        │ …       │ …                         │
│ FARMACIA     │ …        │ …       │ …                         │
│                                                               │
│ Dinero en caja: ________  Depósito: ________  N° op: ________ │  ← líneas EN BLANCO para
│                                                               │    llenar a mano (decisión 2)
│    _______________              _______________               │
│     Cajero                       Contabilidad                 │  ← firmas (patrón ReciboPDF)
│ pie: Documento generado por el módulo de Contabilidad — CSL   │
└───────────────────────────────────────────────────────────────┘
```

Reglas del PDF:
- Importar `CLINICA` y `LOGO_URL` desde `ReciboPDF.tsx` (tras exportarlas ahí). Colores/StyleSheet:
  copiar la paleta de `ReciboPDF` (slate/emerald) — bandas de sección `#f1f5f9` con texto bold.
- Filas de detalle a **fontSize 7–8** (los días pueden traer 100+ ingresos); usar `wrap` de
  react-pdf para paginación automática y repetir nada (los totales van una vez al final, como el SAMBHS).
- Montos `money()` local (formato `es-PE`, 2 decimales). Unidades con `unidadCorto`.
- El "Resumen de caja por unidad" usa la MISMA matriz calculada para el Excel — extrae ese cálculo
  a una función compartida `resumenPorUnidad(data)` en `excelCuadreCaja.ts` (o un `cuadreExportUtils.ts`
  si prefieres separar), para no duplicar lógica.
- Fecha legible por split del string (mismo gotcha que Excel).

### 6.3 Wiring en `CajaDiaria.tsx`

- Armar `const exportData: CuadreExportData` con `useMemo` (deps: `ingresosVisibles`,
  `egresosVisibles`, memos de totales, filtros) **o** construirlo on-click dentro de los handlers
  (más simple, no hay coste — elegir on-click).
- **Botones**: bloque nuevo **inmediatamente después** del cierre del bloque
  `{totalesPorTipoCaja.length > 0 && ( ... )}` ("Cuadre por tipo de caja", anclaje `:389-421`) y
  **antes** de la línea placeholder `Dinero en caja: — · …` (`:423`). Dos botones pequeños alineados
  a la derecha: `[Excel]` (icono `FileSpreadsheet` de lucide) y `[PDF]` (icono `FileText`), estilo
  de botón secundario ya usado en la página (borde slate, texto sm).
- Renderizarlos **solo** cuando hay cuadre con movimientos: mismo contexto JSX donde ya se renderizan
  los totales (dentro del `<>` que se muestra cuando hay cuadre no vacío) — si se colocan tras el
  bloque de tipo de caja quedan automáticamente bajo ese guard. Añadir guard propio
  `(ingresosVisibles.length > 0 || egresosVisibles.length > 0)`.
- Import dinámico opcional NO requerido: la página ya carga recharts/framer; importar los helpers
  estáticamente (el PDF renderer ya está en el bundle por Honorarios).

## 7. Reglas obligatorias del proyecto (violarlas = rechazo)

- **R1 — Solo front.** Prohibido tocar `ContabilidadService.ts`, el API .NET, SPs o BD. Todo sale de
  los memos ya existentes.
- **R2 — La palabra "legacy" JAMÁS visible.** Los exports son material de usuario final: todo
  `Origen` de egreso pasa por `labelOrigen()` (`'CAJA LEGacy'` → `'CAJA MAYOR'`). Verificar que ni el
  Excel ni el PDF contengan la cadena "LEGACY".
- **R3 — Verificar con `npx vite build`, NUNCA con `tsc`/`check-types`** (código muerto
  `CobranzaDashboard.tsx` rompe tsc pero no el bundle — gotcha documentado en `frontend-react.md`).
  Warning de chunks >600 kB = normal.
- **R4 — Usuario de la sesión**: `generadoPor` sale de `localStorage.getItem('conta_user')` →
  `JSON.parse(...).Username` (con fallback `'—'` si no parsea). No inventar otra fuente.
- **R5 — No tocar el dev server** (Vite 5173 corre gestionado por el orquestador; HMR aplica los
  cambios solo). No levantar/matar procesos.
- **R6 — Sin commits.** El orquestador integra y commitea.
- **R7 — Fechas por split de string**, nunca `new Date('YYYY-MM-DD')` (shift UTC→Lima).

## 8. GATEs de verificación (todos obligatorios antes de reportar)

| GATE | Verificación |
|---|---|
| G1 | `npx vite build` termina **0 errores** (solo warning chunks). |
| G2 | Estático: en `excelCuadreCaja.ts` los montos se escriben como `number`; buscar que no haya `toLocaleString`/`'S/'` dentro de celdas de monto del Excel. |
| G3 | Estático: `CierreCajaPDF.tsx` y `excelCuadreCaja.ts` no contienen la cadena `LEGACY` en ningún literal de salida, y el payload aplica `labelOrigen`. |
| G4 | Estático: los botones quedan DESPUÉS del bloque "Cuadre por tipo de caja" y ANTES del placeholder "Dinero en caja: —", bajo guard de cuadre con movimientos. |
| G5 | Los totales del export provienen de los MISMOS memos de pantalla (`totalIngresosCuadre`, `totalEgresosCuadre`, `netoDia`, `totalesPorFormaPago`, `totalesPorTipoCaja`) — no re-sumar desde `cuadre.Ingresos` crudo (rompería WYSIWYG). Única suma nueva permitida: egresos por unidad (§6.1). |
| G6 | Runtime (si el ejecutor puede): con el stack vivo (5173/5090), en `/conta/caja` elegir el **2026-07-16** (día con egreso ECF FARMACIA + varios ECA): exportar ambos, comprobar al centavo contra pantalla, y repetir con un filtro activo (desmarcar FARMACIA) verificando que el export refleja el filtro y lo declara en el encabezado. Si el ejecutor no puede operar navegador, declarar G6 como "pendiente de verificación visual del orquestador/usuario" — NO marcarlo verde sin evidencia. |

## 9. Fuera de alcance (NO hacer)

- Inputs para dinero en caja / depósito / nº operación (decisión 2: omitidos; en PDF solo líneas en blanco).
- Columnas ricas del SAMBHS (Cliente/Cantidad/Precio Unitario) — requeriría SP; descartado (decisión 3).
- Export del mes completo, series diarias o indicadores (solo la sección del cuadre del día).
- Cambios de diseño en el resto de la página; instalación de dependencias; commits.

## 10. Reporte esperado del ejecutor

1. Lista exacta de archivos creados/editados con un resumen por archivo.
2. Resultado literal del `npx vite build`.
3. Estado de cada GATE (G1–G6) con evidencia.
4. Cualquier desviación del plan con su justificación (si un anclaje de línea se movió, usar los
   anclajes de texto de §3 — los nombres de memos/estados son estables).

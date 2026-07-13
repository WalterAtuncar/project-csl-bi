# PLAN — Cuadre de caja diario en /conta/caja (estilo SAMBHS)

> **Para el ejecutor.** Este plan se ejecuta en cadena: `db-experto` (SP + GATEs) →
> `backend-api` (endpoint) → `bi-frontend` (UI). El orquestador verifica los GATEs.
> Leer antes: `.claude/memory/00-INDICE.md`, `modelo-negocio.md` (§tuberías, §filtros UI),
> `reglas-sql2012.md`.

---

## 1. Objetivo (pedido del usuario, 2026-07-12)

En la página **/conta/caja** (`CajaDiaria.tsx`):

1. La sección **"Cobranzas del día por forma de pago"** pasa a llamarse **"Cuadre de caja diario"**.
2. Al hacer **click en un día** — ya sea en el **gráfico** (área "Saldo de caja acumulado") o en la
   **grid derecha** (serie diaria) — la sección muestra el cuadre de ESE día con **la misma
   estructura y estilo del resumen del reporte "Cuadre de Caja" del SAMBHS** (WinForms).
3. El click es la única forma de cambiar de día; al cargar la página se preselecciona el día
   objetivo actual (hoy si es el mes en curso; si no, el último día con movimiento — misma regla
   que ya existe en `load()`).

**NO se toca**: cierres de mes, indicadores, sp_Caja_Diaria/FlujoConsolidado, el filtro de medios
de pago existente (se respeta, ver §6.4).

---

## 2. Referencia SAMBHS (ya investigada — no re-abrir el WinForms salvo duda)

Fuente: `Facturacion_New/Node/WinClient/SAMBHS.Windows.WinClient.UI/Reportes/Ventas/frmCuadredeCaja.cs`
(L48–168) y `Facturacion_New/Components/Venta/SAMBHS.Venta.BL/VentaBL2.cs`
(`ReporteCuadreCaja` L8575, `ReporteCuadreCajaModeloUno` L8692, DTOs L8794 y BE `ReporteCuadredeCaja`).

### 2.1 Estructura del resumen SAMBHS que hay que replicar visualmente

```
CUADRE DE CAJA                      (cabecera: empresa, rango de fecha, fecha-hora impresión)

Item | Tipo    | Documento              | Descripción / Forma de pago | Monto
  1  | EGRESO  | EG 001-0001234         | <concepto>                  |   -150.00
  ...                                     (bloque EGRESOS numerado 1..n)
  1  | INGRESO | BOL B004-00086340      | EFECTIVO SOLES              |    120.00
  ...                                     (bloque INGRESOS numerado 1..n)
──────────
*****TOTAL*****   EFECTIVO SOLES        Σ S/.        (una línea por forma de pago,
*****TOTAL*****   VISA                  Σ S/.         GroupBy forma de pago)
*****TOTAL*****   NO PAGADO             Σ S/.
──────────
Pie: Dinero en caja (manual) · Depósito día anterior (manual) · Nro. operación (manual) · TOTAL = Σ
```

Detalles de fidelidad: separadores `──────────`, literal `*****TOTAL*****`, "NO PAGADO" cuando la
venta no tiene cobranza, documento = `SIGLAS SERIE-CORRELATIVO` (`documento.v_Siglas + ' ' +
v_SerieDocumento + '-' + v_CorrelativoDocumento`), egresos con signo negativo.

### 2.2 Lo que NO replicamos (y por qué)

- **Lógica de rol 16 / usuario cajero** (`rolId==16` ve todo; otro rol solo `i_InsertaIdUsuario == systemUserId`):
  el BI es gerencial — SIEMPRE vista global. No hay parámetro de usuario.
- **Universo SAMBHS** (ventas por `venta.t_FechaRegistro`, sin filtros canónicos): NO. Ver decisión D1.
- **Columna dólares (TotalD)**: la caja conta es 100% `d_ImporteSoles` — se omite.
- **Campos manuales del pie** (Dinero en caja, Depósito día ant., Nro. operación): fuera del v1
  (el BI es de lectura; serían inputs sin persistencia). Se deja el hueco visual con "—" y se
  registra como ampliación futura. Si el usuario los pide, son inputs client-side sin backend.
- **Bug legacy** (Modelo 1: `!= 500 || != 502` siempre true → egresos duplicados como ingresos):
  NO se arrastra.

---

## 3. Decisiones de diseño (con su porqué)

| # | Decisión | Porqué |
|---|---|---|
| **D1** | **Universo = tubería CAJA conta**, no el universo SAMBHS. Ingresos = `dbo.cobranzadetalle` por `cd.t_InsertaFecha` del día; egresos = las 3 fuentes de `sp_Caja_Egresos` por fecha de pago. | El cuadre vive dentro de /caja y **debe cuadrar Δ=0 con la fila del día** del gráfico/serie (`sp_Caja_Diaria`). El universo SAMBHS usa otra fecha base (`venta.t_FechaRegistro`) y no aplica los mismos filtros → jamás cuadraría con la pantalla que lo contiene. Se replica el ESTILO, no el universo. |
| **D2** | Detalle de ingresos a nivel **documento** (una fila por cobranza-documento), no por línea. | Es la granularidad del reporte SAMBHS y la que el cajero reconoce. |
| **D3** | Nuevo SP dedicado `conta.sp_Caja_CuadreDia` (2 resultsets) en `10_...` NO: va en **`04_caja_motor.sql`** (es motor de caja). No se toca `sp_Caja_Ingresos` (lo usa el default de la página y potencialmente otros). | Cambiar el SP existente arriesga regresión; el cuadre necesita columnas nuevas (Documento, Concepto). |
| **D4** | El filtro de medios de pago + toggle crédito de la página **aplican al cuadre** (server-side, mismos params CSV+LIKE que `sp_Caja_Diaria`). Egresos NUNCA se filtran — se rotulan "(totales)" igual que hoy. | Coherencia con la regla vigente de la pantalla (memoria §Filtros de UI, D2/D5). |
| **D5** | La sección actual "por forma de pago" **desaparece como tabla propia**: su información sobrevive dentro del cuadre como las líneas `*****TOTAL*****` por forma de pago. | Es exactamente el rol de ese bloque en SAMBHS; evita dos tablas redundantes. |
| **D6** | Click en el gráfico via `onClick` del `<AreaChart>` usando `state.activeLabel` (día "DD"); click en la grid via `onClick` de la `<tr>`. Ambos convergen en un único estado `diaSeleccionado: 'YYYY-MM-DD'`. | Recharts expone `activeLabel` en el evento del contenedor — un solo camino de datos para ambos orígenes de click. |
| **D7** | Los tipos de documento inversos (500/502/504/509/510/511) que aparezcan en `cobranzadetalle` se muestran **tal cual salen hoy en la serie** (sin re-signar en v1). | La serie/gráfico ya los cuenta así; re-signarlos rompería el Δ=0 con la fila del día. Ver §8 Observación O1 para la investigación aparte. |

---

## 4. FASE BD — `db-experto`

### 4.1 Nuevo SP: `conta.sp_Caja_CuadreDia`

Archivo: `models-DB/script-conta/sp/04_caja_motor.sql` (añadir bloque 2c, después de
`sp_Caja_FormasPago`). **Antes de editar: verificar `modify_date` en la BD** (los SPs se cambian
directo en producción; la BD manda sobre git).

```sql
-- ---------------------------------------------------------------------
-- 2c) Cuadre de caja diario (detalle a nivel documento de UN dia).
--     Mismo universo que sp_Caja_Ingresos/sp_Caja_Egresos (tuberia CAJA):
--     GATE: SUM(RS1) = Ingresos del dia en sp_Caja_Diaria (mismos filtros)
--           SUM(RS2) = Egresos del dia en sp_Caja_Diaria.
--     @FormasPago CSV grupo 46 (NULL/'' = todos) y @IncluirCredito
--     filtran SOLO ingresos (D2/D5). SQL 2012: patron CSV+LIKE, sin STRING_SPLIT.
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Caja_CuadreDia','P') IS NOT NULL DROP PROCEDURE conta.sp_Caja_CuadreDia;
GO
CREATE PROCEDURE conta.sp_Caja_CuadreDia
    @Fecha          DATE,
    @FormasPago     NVARCHAR(200) = NULL,
    @IncluirCredito BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @fin DATE = DATEADD(DAY, 1, @Fecha);
    DECLARE @csv NVARCHAR(220) = CASE WHEN NULLIF(LTRIM(RTRIM(@FormasPago)),'') IS NULL
                                      THEN NULL ELSE ',' + @FormasPago + ',' END;

    -- RS1: INGRESOS del dia a nivel documento
    SELECT
        doc.v_Siglas + ' ' + LTRIM(RTRIM(v.v_SerieDocumento)) + '-' + LTRIM(RTRIM(v.v_CorrelativoDocumento)) AS Documento,
        ISNULL(tc.v_NombreTipoCaja, 'SIN UNIDAD')  AS Unidad,
        cd.i_IdFormaPago,
        ISNULL(dh46.v_Value1, 'SIN FORMA DE PAGO') AS FormaPago,
        CAST(CASE WHEN dh41.v_Value1 = 'CREDITO' THEN 1 ELSE 0 END AS BIT) AS EsCobranzaCredito,
        SUM(cd.d_ImporteSoles) AS Monto
    FROM dbo.cobranzadetalle cd
    INNER JOIN dbo.venta v        ON v.v_IdVenta = cd.v_IdVenta AND ISNULL(v.i_Eliminado,0) = 0
    LEFT  JOIN dbo.documento doc  ON doc.i_CodigoDocumento = v.i_IdTipoDocumento AND ISNULL(doc.i_Eliminado,0) = 0
    LEFT  JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
    LEFT  JOIN dbo.tipocaja tc    ON tc.i_IdTipoCaja = tcct.i_IdTipoCaja
    LEFT  JOIN dbo.datahierarchy dh46 ON dh46.i_GroupId = 46 AND dh46.i_ItemId = cd.i_IdFormaPago
    LEFT  JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago
    WHERE ISNULL(cd.i_Eliminado,0) = 0
      AND cd.t_InsertaFecha >= @Fecha AND cd.t_InsertaFecha < @fin
      AND (@csv IS NULL OR @csv LIKE '%,' + CAST(cd.i_IdFormaPago AS NVARCHAR(10)) + ',%')
      AND (@IncluirCredito = 1 OR ISNULL(dh41.v_Value1,'') <> 'CREDITO')
    GROUP BY doc.v_Siglas, v.v_SerieDocumento, v.v_CorrelativoDocumento,
             tc.v_NombreTipoCaja, cd.i_IdFormaPago, dh46.v_Value1,
             CASE WHEN dh41.v_Value1 = 'CREDITO' THEN 1 ELSE 0 END
    ORDER BY FormaPago, Documento;

    -- RS2: EGRESOS del dia a nivel registro (3 fuentes, espejo de sp_Caja_Egresos sin GROUP BY dia)
    SELECT * FROM (
        SELECT 'EGRESO CONTA' AS Origen,
               e.v_SerieNumero AS Documento,
               ISNULL(cc.v_Nombre,'ADMINISTRACION') AS CentroCosto,
               e.v_Descripcion AS Concepto,
               e.d_MontoBruto * e.d_TipoCambio AS Monto
        FROM conta.egreso e
        LEFT JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = e.i_IdCentroCosto
        WHERE e.v_Estado = 'PAGADO' AND e.t_FechaPago >= @Fecha AND e.t_FechaPago < @fin
        UNION ALL
        SELECT 'PERSONAL', NULL, ISNULL(cc.v_Nombre,'ADMINISTRACION'),
               cpm.v_Concepto, cpm.d_Monto
        FROM conta.costo_personal_mensual cpm
        LEFT JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = cpm.i_IdCentroCosto
        WHERE cpm.v_Estado = 'PAGADO' AND cpm.t_FechaPago >= @Fecha AND cpm.t_FechaPago < @fin
        UNION ALL
        SELECT 'CAJA LEGACY',
               /* Documento/Concepto: el ejecutor confirma columnas reales de cajamayor_movimiento
                  (candidatos: join a dbo.venta por v_IdVenta -> serie-correlativo + v_Concepto;
                  o campos propios del movimiento). Ajustar aqui. */
               NULL, ISNULL(cc.v_Nombre,'ADMINISTRACION'), NULL, cm.d_Total
        FROM dbo.cajamayor_movimiento cm
        LEFT JOIN conta.centro_costo cc ON cc.i_IdTipoCaja = cm.i_IdTipoCaja AND cc.b_Activo = 1
        WHERE cm.v_TipoMovimiento = 'E'
          AND cm.t_FechaMovimiento >= @Fecha AND cm.t_FechaMovimiento < @fin
    ) x ORDER BY x.Origen, x.Documento;
END
GO
```

**Notas obligatorias para el ejecutor:**

- ⚠️ El esqueleto de arriba es **orientativo**: los nombres de columnas de `conta.egreso`
  (`v_SerieNumero`, `v_Descripcion`), `costo_personal_mensual` (`v_Concepto`) y sobre todo
  **`dbo.cajamayor_movimiento`** deben confirmarse contra la BD real (db-console,
  `sys.columns`) ANTES de aplicar. Para el bloque legacy: intentar join a `dbo.venta`
  (ECA/ECF) para obtener serie-correlativo y concepto; ~98% son pagos a médicos.
- El bloque legacy usa **`d_Total` (bruto)** — igual que `sp_Caja_Egresos` L94 — NO el neto de
  rentabilidad. La consistencia es con la serie de caja, no con rentabilidad.
- El patrón CSV+LIKE y el toggle crédito deben ser **byte-idénticos en semántica** a los de
  `sp_Caja_Diaria` (leerlo antes; L132+ del mismo archivo). Si `sp_Caja_Diaria` trata el filtro
  de forma distinta (p.ej. NULLs de forma de pago), copiar SU comportamiento — el GATE 2 lo detecta.
- SQL 2012: nada de `STRING_SPLIT`, `IIF` anidado innecesario, ni `FORMAT`. `ORDER BY` con alias ok.
- Aplicar via **db-console** y dejar el script en `04_caja_motor.sql` (git) en el mismo commit.

### 4.2 GATEs de BD (el orquestador los re-verifica; anclar cifras reales al ejecutar)

Elegir 2 días de prueba de jun-2026: uno con egresos legacy y crédito (día A) y uno normal (día B).

| GATE | Verificación | Criterio |
|---|---|---|
| **G1** | `SUM(RS1.Monto)` sin filtros vs `Ingresos` de la fila del día en `sp_Caja_Diaria @Anio,@Mes` (sin filtros) | Δ = 0.00 en día A y día B |
| **G2** | `SUM(RS1.Monto)` con `@FormasPago='1'` y con `@IncluirCredito=0` vs la misma fila de `sp_Caja_Diaria` con los mismos params | Δ = 0.00 en ambos casos |
| **G3** | `SUM(RS2.Monto)` vs `Egresos` de la fila del día | Δ = 0.00 en día A (incluye legacy) |
| **G4** | Σ de las líneas TOTAL por forma de pago == `SUM(RS1.Monto)` (sanidad de agrupación en front, se re-verifica en E2E) | Δ = 0.00 |
| **G5** | Día sin movimiento (p.ej. un domingo sin cobranzas): ambos RS vacíos, sin error | 0 filas, no NULL-crash |

Registrar los números en el LOG de ejecución (patrón de los planes anteriores).

---

## 5. FASE API — `backend-api`

Proyecto: `SanLorenzoMicroservices/SanLorenzo.Contabilidad.Services`.
⚠️ Antes de compilar: liberar el puerto 5090 (`Stop-Process` del `dotnet run` que bloquea la DLL).

1. **DTOs** en `Models/Dtos.cs`:
   ```csharp
   public class CuadreDiaIngresoDto { public string Documento; public string Unidad;
       public int? i_IdFormaPago; public string FormaPago; public bool EsCobranzaCredito;
       public decimal Monto; }
   public class CuadreDiaEgresoDto { public string Origen; public string Documento;
       public string CentroCosto; public string Concepto; public decimal Monto; }
   public class CuadreDiaDto { public List<CuadreDiaIngresoDto> Ingresos;
       public List<CuadreDiaEgresoDto> Egresos; }
   ```
   (propiedades con `{ get; set; }`, estilo del archivo).
2. **Repositorio** `CajaRepository.cs`: método `CuadreDia(DateTime fecha, string formasPago,
   bool incluirCredito)` con **`QueryMultiple`** (mismo patrón que `RentabilidadRepository`
   por-consultorio) → mapea RS1/RS2 al `CuadreDiaDto`.
3. **Controller** `CajaController.cs`:
   ```csharp
   [HttpGet("cuadre-dia")]
   public IActionResult CuadreDia([FromQuery] DateTime fecha,
       [FromQuery] string formasPago = null, [FromQuery] bool incluirCredito = true)
   ```
   Mismos atributos de autorización que `[HttpGet("ingresos")]` (copiar tal cual — LECTURA).
4. **Verificación**: `dotnet build` verde + curl con token demo LOCAL (`sa`/`Sa#2026Demo`):
   `GET /api/conta/caja/cuadre-dia?fecha=2026-06-<diaA>` → 200, JSON con `ingresos[]`/`egresos[]`,
   sumas == GATEs G1/G3.

---

## 6. FASE FRONT — `bi-frontend`

Archivo único de pantalla: `react-project/src/pages/Contabilidad/CajaDiaria.tsx`.
Service/tipos: `ContabilidadService.ts` + `contaTypes.ts`.

### 6.1 Service + tipos

- `contaTypes.ts`: `CuadreDiaIngresoRow`, `CuadreDiaEgresoRow`, `CuadreDiaResponse`
  (espejo de los DTOs §5.1).
- `ContabilidadService.ts`: `cajaCuadreDia(fecha: string, formasPago?: string,
  incluirCredito?: boolean)` — **misma convención de eficiencia §5.2**: solo enviar `formasPago`
  si hay subset, solo enviar `incluirCredito` cuando es `false` (la URL default queda mínima).

### 6.2 Estado y clicks (los dos orígenes convergen)

- Nuevo estado: `const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);`
  y `const [cuadre, setCuadre] = useState<CuadreDiaResponse | null>(null);`
- En `load()` (L48-56): sustituir la lógica de `hoyIngresos` → tras cargar la serie, fijar
  `setDiaSeleccionado(diaObjetivo)` (misma regla actual: hoy si mes actual, si no el último día
  con movimiento). Un `useEffect([diaSeleccionado, seleccion, incluirCredito])` fetch-ea el cuadre
  (re-fetch al cambiar el filtro: es 1 día, barato).
- **Click en gráfico** (L154): `<AreaChart ... onClick={(st) => { const d = st?.activeLabel;
  if (d) setDiaSeleccionado(`${anio}-${pad(mes)}-${d}`); }}>` — `activeLabel` es el `dataKey`
  del eje X (día "DD"). Añadir `cursor: 'pointer'` en el contenedor y un hint visual
  ("click en un día para ver su cuadre").
- **Click en fila de la serie** (L210-217): `<tr onClick={() => setDiaSeleccionado(d.Dia.slice(0,10))}
  className="... cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40">` + resaltar la fila
  seleccionada (`bg-emerald-50 dark:bg-emerald-900/20`).
- Eliminar el estado `hoyIngresos`/`hoyIngresosFiltrados`/`porFormaPago` (L18, L77-95) — quedan
  absorbidos por el cuadre. La llamada `cajaIngresos` **desaparece de esta página** (el endpoint
  y el SP NO se tocan: quedan para otros consumidores).

### 6.3 Render del cuadre (fidelidad SAMBHS — §2.1)

Reemplaza el card de L172-193. Título: **"Cuadre de caja diario — {fecha seleccionada}"**.
Estética de reporte: tipografía tabular (`font-mono text-xs` o `tabular-nums`), separadores como
filas `──────────`, literal `*****TOTAL*****`.

```
[Card: Cuadre de caja diario — 2026-06-15]        [badge filtro si filtroActivo]

 INGRESOS
 #  Documento            Unidad       Forma de pago     Monto
 1  BOL B004-00086340    ASISTENCIAL  EFECTIVO SOLES    120.00
 2  FAC F004-00010368    OCUPACIONAL  NO PAGADO           0.00     ← crédito sin cobrar ese día
 ...
 EGRESOS (totales — no reflejan el filtro)                        ← rotulado si filtroActivo
 1  CAJA LEGACY  <doc>   <centro>     <concepto>       -150.00    ← monto en rojo, signo −
 ...
 ──────────────────────────────────────────────────────────
 *****TOTAL*****  EFECTIVO SOLES                     Σ 450.00
 *****TOTAL*****  VISA                               Σ 200.00
 *****TOTAL*****  NO PAGADO                          Σ   0.00
 ──────────────────────────────────────────────────────────
 Total ingresos          S/  650.00
 Total egresos           S/ −150.00
 NETO DEL DÍA            S/  500.00
 Dinero en caja: — · Depósito día ant.: — · Nro. operación: —     ← placeholders v1 (§2.2)
```

- Las líneas `*****TOTAL*****` se calculan client-side agrupando RS1 por `FormaPago`
  (equivale al GroupBy CondicionPago de SAMBHS L77-87).
- Egresos SIEMPRE totales + rotulados cuando `filtroActivo` (regla D2/D5 vigente en la página).
- Día sin datos: "Sin movimientos ese día" centrado (mantener el empty-state actual).
- Detalle largo: contenedor con `max-h` + `overflow-y-auto` (un día puede tener cientos de docs);
  los bloques TOTAL/pie quedan fijos fuera del scroll.

### 6.4 Interacción con el filtro de medios de pago

Sin cambios en `MediosPagoFilterCard`. Al aplicar filtro: se re-fetch-ea el cuadre con
`formasPago`/`incluirCredito` (server-side, D4) y el banner ámbar existente ya avisa la vista
filtrada. Egresos del cuadre: totales rotulados (nunca filtrados).

### 6.5 Verificación front

`npx tsc --noEmit` (0 errores) + `npx vite build` (verde). No tocar otras páginas.

---

## 7. E2E (orquestador)

1. Login demo (`sa`/`Sa#2026Demo`, token LOCAL — no toca legacy).
2. `/conta/caja` jun-2026: click en día A del **gráfico** → cuadre carga; click en día A de la
   **grid** → mismo resultado (G-UI1).
3. Sumas del cuadre vs fila del día en la grid: ingresos Δ=0, egresos Δ=0 (G1/G3 en UI).
4. Filtro "solo EFECTIVO SOLES" + crédito OFF → cuadre re-carga, Δ=0 contra la fila filtrada (G2).
5. Click en día sin movimiento → empty-state sin crash (G5).
6. Título renombrado; la tabla vieja "por forma de pago" ya no existe; su información aparece
   como líneas `*****TOTAL*****`.

---

## 8. Observaciones fuera de alcance (registrar, no ejecutar)

- **O1**: SAMBHS niega los tipos de documento 500/502/504/509/510/511 en su cuadre; la tubería
  CAJA conta no los re-signa (D7). Investigar con `legacy-negocio` si `cobranzadetalle` contiene
  filas de esos tipos (y cuánto pesan) — si las hay, la serie de ingresos conta podría estar
  sobre-contada y sería un ajuste de `sp_Caja_Ingresos`/`sp_Caja_Diaria`, NO de este plan.
- **O2**: campos manuales del pie (conciliación del cajero) — posible v2 con inputs client-side.
- **O3**: `sp_Caja_Ingresos` deja de tener consumidores en `CajaDiaria.tsx`; verificar si
  `FlujoConsolidado.tsx` u otros lo usan antes de cualquier limpieza futura.

## 9. Rollback

- BD: `DROP PROCEDURE conta.sp_Caja_CuadreDia` (objeto nuevo, nadie más lo consume).
- API: revert del commit (endpoint nuevo, sin cambios en existentes).
- Front: revert del commit (la página vuelve a `cajaIngresos` + tabla por forma de pago).

## 10. Checklist de ejecución

- [ ] db-experto: confirmar columnas reales (`egreso`, `costo_personal_mensual`, `cajamayor_movimiento`)
- [ ] db-experto: crear SP + G1–G5 con cifras ancladas + actualizar `04_caja_motor.sql`
- [ ] backend-api: liberar 5090 → DTOs + repo QueryMultiple + endpoint + curl demo 200
- [ ] bi-frontend: tipos/service + rename + clicks (gráfico y grid) + render SAMBHS + tsc/build
- [ ] orquestador: E2E §7 + commit integrador `feat(conta): cuadre de caja diario estilo SAMBHS en /caja`
- [ ] orquestador: registrar cifras GATE en el LOG + memoria si hay hallazgos (O1)

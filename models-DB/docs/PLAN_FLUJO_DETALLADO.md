# PLAN — Flujo de Caja DETALLADO dentro de /conta/flujo-consolidado (mockups 02/03)

> **Para el ejecutor.** Cadena: `db-experto` (SP + GATEs) → `backend-api` (endpoint) →
> `bi-frontend` (sección nueva bajo el consolidado). El orquestador verifica GATEs e integra.
> Leer antes: `.claude/memory/00-INDICE.md`, `modelo-negocio.md` (§tuberías, §Egresos, §Filtros UI),
> `reglas-sql2012.md`, y este plan completo. Referencia visual: `_nuevos requerimientos/02bi.jpeg`
> y `03bi.jpeg` (el formato impreso del gerente, rotulado a mano "DETALLADO").

---

## 1. Objetivo (pedido del usuario, 2026-07-12)

En la página **/conta/flujo-consolidado** (`FlujoConsolidado.tsx`), **debajo de la tabla del
consolidado**, recrear el **FLUJO DE CAJA DETALLADO** de los mockups 02/03: la misma matriz anual
(filas concepto × columnas Ene..Dic + Total), pero con cada bloque **abierto un nivel más**:

- Ingresos operativos → **unidad × forma de pago** (+ líneas de cobranzas de crédito).
- Egresos de personal → **unidad × concepto** (Remuneraciones, Gratificaciones, CTS, Utilidades,
  Beneficios Sociales, Personal Adicional).
- Gastos administrativos / médicos / tributos / renta / inversión / financiamiento / otros →
  **por rubro hoja** del catálogo `conta.tipo_gasto`.

**Un solo header** (año + filtro de medios + toggle crédito + botones de cierre) llena las dos
secciones — patrón ya validado en /rentabilidad. NO es una página nueva ni un toggle.

## 2. Hallazgo que hace esto barato (del análisis 2026-07-12)

El modelo de datos YA se sembró para el detallado: `conta.tipo_gasto` tiene los ~43 rubros hoja
calcados de los mockups (`ddl/03_seeds.sql:69-126`), `conta.costo_personal_mensual` lleva
`v_Concepto` con los 6 conceptos del mockup (`ddl/04_egresos.sql:73`), y la dimensión
unidad×forma de pago de ingresos vive en `dbo.cobranzadetalle` (grupo 46) × `tipocaja` × flag
crédito (grupo 41). **El trabajo es solo capa de presentación** (SP de detalle + endpoint + render).

⚠️ Realidad demo: hoy solo tendrán números los **ingresos** (datos vivos) y los **pagos a médicos
legacy** (ECA/ECF → MEDICO, jun 61,958.20). Personal/admin/tributos/inversión/financiamiento/otros
saldrán en '—' hasta la carga histórica (§5 del LOG). El detallado se construye igual y cuadra igual.

## 3. Decisiones de diseño (con su porqué — NO reabrir sin causa)

| # | Decisión | Porqué |
|---|---|---|
| **D1** | El detallado **NO recalcula la cola** (FLUJO OPERATIVO, CAJA+INV, CAJA+FIN, SALDO, INICIAL, FINAL): esas filas se **reusan del `Resumen` del consolidado ya cargado** (misma llamada, mismos params ⇒ mismo universo). El SP nuevo devuelve SOLO detalle. | Una sola fuente de verdad para totales/saldos. Si hubiera dos cálculos, cualquier descuadre sería un bug fabricado por nosotros. |
| **D2** | Se muestran **TODAS las hojas del catálogo aunque valgan 0** (money() ya pinta 0 como '—'). Para eso el SP devuelve un resultset de **catálogo de hojas**. | Fidelidad al formato impreso del gerente (el mockup lista todos los conceptos); el catálogo es extensible por el usuario → jamás hardcodear rubros en el front. |
| **D3** | Cobranzas de crédito = línea **"COBRANZAS CRÉDITO <unidad>"** al cierre del bloque de su unidad. SEGUROS (solo crédito) genera bloque con esa única línea, tras OCUPACIONAL. | Regla general consistente (el mockup las coloca ad-hoc tras OCUPACIONAL); mantiene el orden de bloques fijo. Desviación menor documentada. |
| **D4** | Los egresos legacy (cajamayor ECA/ECF, sin concepto) se muestran como **línea propia "PAGOS MÉDICOS (CAJA LEGACY)"** bajo GASTOS MÉDICOS (código virtual `MED-LEG`). | Transparencia: no disfrazarlos de "SERVICIOS ESPECIALIDADES MÉDICAS" (clasificación que no consta). Suma dentro de la sección MEDICO → cuadra con el consolidado. |
| **D5** | Filtros heredados tal cual (reglas D2/D5 vigentes de la página): ingresos del detallado filtrados **server-side** con los mismos params; egresos SIEMPRE totales (rotulados si filtro activo); filas de cola atenuadas si filtro activo (igual que hoy en el consolidado). Con `incluirCredito=false` las líneas "COBRANZAS CRÉDITO ..." desaparecen (son 100% crédito). | Coherencia total con el comportamiento ya validado de la página. |
| **D6** | Personal por unidad via **walk `mapc`** (`05_rentabilidad.sql:89-92`: centro → padre → `i_IdTipoCaja`). Centro sin unidad → bloque **"ADMINISTRACION"** (solo se pinta si ≠0; el mockup no lo tiene). | Es LA atribución gasto→unidad canónica del proyecto (memoria §Unidades). |
| **D7** | Asociados/convenios **v1 a nivel hoja** (PAGO ASOCIADOS / PAGO CONVENIOS agregados). El ejecutor BD verifica si `conta.egreso` tiene FK a `conta.entidad`: si existe, RS3 añade la entidad y el front abre esas 2 hojas por entidad (fidelidad total al mockup: Biomedicine, Drimagen, Atriz, Medialfa, Rosales); si no, queda pendiente registrado. | No inventar dimensión que quizá no existe; el mockup la pide, así que se intenta, pero sin bloquear el v1. |
| **D8** | Orden de bloques de ingresos FIJO: ASISTENCIAL, OCUPACIONAL, FARMACIA, SISOL (mockup) y luego SEGUROS/MTC/SIN UNIDAD solo si tienen movimiento. Formas de pago en orden del catálogo grupo 46: EFECTIVO SOLES (1), VISA (2), DEPOSITO (9), YAPE (12), PLIN (13) — coincide con el mockup. | Formato reconocible por el gerente. |

## 4. FASE BD — `db-experto`

### 4.1 Nuevo SP: `conta.sp_Caja_FlujoDetallado`

Archivo: `models-DB/script-conta/sp/04_caja_motor.sql`, bloque **"4b"** (después de
`sp_Caja_FlujoConsolidado`). Aplicar via db-console (objeto nuevo — verificar que no exista) y
versionar el archivo en el mismo commit. **Solo el objeto nuevo**; no re-ejecutar el archivo entero.

```sql
-- ---------------------------------------------------------------------
-- 4b) Flujo de caja DETALLADO anual (mockups 02/03).
--     SOLO detalle: la cola (flujo operativo/cajas/saldos) la aporta
--     sp_Caja_FlujoConsolidado (D1). Mismos filtros y mismo universo que el
--     consolidado: GATE = cada bloque suma su linea del consolidado (Δ=0).
--     RS1 ingresos mes×unidad×forma(+credito) · RS2 personal mes×unidad×concepto
--     RS3 egresos mes×seccion×hoja (+ MED-LEG legacy) · RS4 catalogo de hojas
-- ---------------------------------------------------------------------
CREATE PROCEDURE conta.sp_Caja_FlujoDetallado @Anio SMALLINT,
    @FormasPago NVARCHAR(200) = NULL, @IncluirCredito BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @iniAnio DATE = DATEFROMPARTS(@Anio,1,1), @finAnio DATE = DATEFROMPARTS(@Anio+1,1,1);

    -- filtro de formas: COPIAR byte-a-byte el patron @fp de sp_Caja_FlujoConsolidado (L324-330)

    -- RS1: INGRESOS mes × unidad × forma de pago (+EsCredito)
    -- Mismo FROM/WHERE que @ingMes del consolidado (L332-346) AGREGANDO la dimension forma:
    SELECT MONTH(cd.t_InsertaFecha) AS Mes,
           tcct.i_IdTipoCaja, ISNULL(tc.v_NombreTipoCaja,'SIN UNIDAD') AS Unidad,
           cd.i_IdFormaPago, ISNULL(dh46.v_Value1,'SIN FORMA DE PAGO') AS FormaPago,
           CAST(CASE WHEN dh41.v_Value1='CREDITO' THEN 1 ELSE 0 END AS BIT) AS EsCredito,
           SUM(cd.d_ImporteSoles) AS Monto
    FROM dbo.cobranzadetalle cd
    INNER JOIN dbo.venta v ON v.v_IdVenta=cd.v_IdVenta AND ISNULL(v.i_Eliminado,0)=0
    LEFT JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente=v.i_ClienteEsAgente AND tcct.b_Activo=1
    LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja=tcct.i_IdTipoCaja
    LEFT JOIN dbo.datahierarchy dh46 ON dh46.i_GroupId=46 AND dh46.i_ItemId=cd.i_IdFormaPago
    LEFT JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId=41 AND dh41.i_ItemId=v.i_IdCondicionPago
    WHERE ISNULL(cd.i_Eliminado,0)=0 AND cd.t_InsertaFecha >= @iniAnio AND cd.t_InsertaFecha < @finAnio
      AND ( /* filtro @fp identico al consolidado */ ... )
      AND ( @IncluirCredito = 1 OR dh41.v_Value1 IS NULL OR dh41.v_Value1 <> 'CREDITO' )
    GROUP BY MONTH(cd.t_InsertaFecha), tcct.i_IdTipoCaja, tc.v_NombreTipoCaja,
             cd.i_IdFormaPago, dh46.v_Value1, CASE WHEN dh41.v_Value1='CREDITO' THEN 1 ELSE 0 END;

    -- RS2: PERSONAL mes × unidad × concepto (PAGADO por t_FechaPago; walk mapc de 05_rentabilidad L87-92)
    -- unidad = tipocaja del centro (walk hacia el padre); sin unidad -> 'ADMINISTRACION' (D6)
    SELECT MONTH(cpm.t_FechaPago) AS Mes,
           ISNULL(tc.v_NombreTipoCaja,'ADMINISTRACION') AS Unidad,
           cpm.v_Concepto AS Concepto, SUM(cpm.d_Monto) AS Monto
    FROM conta.costo_personal_mensual cpm  /* + walk mapc + tipocaja */
    WHERE cpm.v_Estado='PAGADO' AND cpm.t_FechaPago >= @iniAnio AND cpm.t_FechaPago < @finAnio
    GROUP BY ...;

    -- RS3: EGRESOS mes × seccion × hoja. Base = tg_root del consolidado (L350-354) pero
    -- conservando ADEMAS el nodo hoja (e.i_IdTipoGasto -> v_Codigo/v_Nombre).
    -- Si un egreso apunta al nodo raiz, hoja = '(SIN RUBRO)'.
    -- + linea legacy: Seccion='MEDICO', CodigoHoja='MED-LEG', Hoja='PAGOS MEDICOS (CAJA LEGACY)'
    --   desde dbo.cajamayor_movimiento 'E' por mes (mismo universo que el consolidado L366-370).
    -- (D7: si conta.egreso tiene FK a conta.entidad, agregar columnas i_IdEntidad/Entidad)

    -- RS4: CATALOGO de hojas para el esqueleto del front (D2):
    SELECT r.v_SeccionFlujo AS Seccion, h.v_Codigo AS CodigoHoja, h.v_Nombre AS Hoja,
           h.i_IdTipoGasto AS Orden
    FROM conta.tipo_gasto h JOIN conta.tipo_gasto r ON r.i_IdTipoGasto = h.i_IdPadre
    ORDER BY r.i_IdTipoGasto, h.i_IdTipoGasto;
END
```

**Notas obligatorias:**
- SQL Server **2012**: sin STRING_SPLIT/FORMAT/IIF anidados; CTE recursivo con walk acotado
  (copiar el patrón exacto de `05_rentabilidad.sql:80-92`); `MAXRECURSION` donde aplique.
- El WHERE de RS1 y el universo de RS3-legacy deben ser **semánticamente idénticos** a los del
  consolidado (`04_caja_motor.sql:332-346` y `366-370`) — el GATE G4 lo detecta si divergen.
- Egresos (RS2/RS3) **NUNCA** reciben @FormasPago/@IncluirCredito (regla D2 de la página).
- Confirmar contra la BD real (sys.columns) los nombres asumidos: `costo_personal_mensual`
  (`v_Concepto`,`d_Monto`,`t_FechaPago`,`v_Estado`,`i_IdCentroCosto`) y si `conta.egreso` tiene
  columna de entidad (D7). Reportar hallazgos.

### 4.2 GATEs de BD (anclar cifras reales al ejecutar; jun-2026 como mes patrón)

| GATE | Verificación | Criterio |
|---|---|---|
| **G1** | Σ RS1 (sin filtros) por mes == `IngresosOp` de `sp_Caja_FlujoConsolidado` (sin filtros), los 12 meses (FULL JOIN, MAX ABS Δ) | Δ=0.00 · ancla esperada jun ≈ 828,700.50 |
| **G2** | Σ RS3 por (mes, sección) == columna de la sección en el consolidado, los 12 meses × todas las secciones | Δ=0.00 · ancla MEDICO jun = 61,958.20 (todo legacy MED-LEG) |
| **G3** | Σ RS2 por mes == `EgrPersonal` del consolidado | Δ=0.00 (hoy 0 == 0; el GATE queda para cuando haya data) |
| **G4** | G1 repetido con `@FormasPago='1'` y con `@IncluirCredito=0` (vs consolidado con mismos params). Con crédito OFF: RS1 no contiene filas EsCredito=1 | Δ=0.00 |
| **G5** | RS4 devuelve las ~43 hojas en el orden del seed; ninguna sección vacía | conteo por sección == seed (`03_seeds.sql:69-126`) |
| **G6** | Año sin datos (p.ej. 2024): RS1-RS3 vacíos, RS4 completo, sin error | OK |

## 5. FASE API — `backend-api`

Proyecto `SanLorenzoMicroservices/SanLorenzo.Contabilidad.Services`.
⚠️ Liberar puerto 5090 antes de compilar (Stop-Process del `dotnet run`).

1. **DTOs** (`Models/Dtos.cs`, estilo del archivo):
   - `FlujoDetalleIngresoDto`: Mes byte/int, i_IdTipoCaja int?, Unidad string, i_IdFormaPago int?,
     FormaPago string, EsCredito bool, Monto decimal.
   - `FlujoDetallePersonalDto`: Mes, Unidad, Concepto, Monto.
   - `FlujoDetalleEgresoDto`: Mes, Seccion, CodigoHoja, Hoja, Monto (+ Entidad string? si D7 aplica).
   - `FlujoDetalleCatalogoDto`: Seccion, CodigoHoja, Hoja, Orden.
   - `FlujoDetalladoDto`: `Ingresos`, `Personal`, `Egresos`, `Catalogo` (Lists).
2. **Repositorio** `CajaRepository.cs`: `FlujoDetallado(short anio, string formasPago, bool incluirCredito)`
   con `QueryMultiple` (4 reads — mismo patrón que `CuadreDia`). `formasPago` → null si vacío.
3. **Controller** `CajaController.cs`:
   `[HttpGet("flujo-detallado")] public IActionResult FlujoDetallado([FromQuery] short anio,
   [FromQuery] string formasPago = null, [FromQuery] bool incluirCredito = true)` — mismos
   atributos de autorización que `[HttpGet("flujo-consolidado")]` (lectura).
4. **Verificación**: build verde + curl con token demo LOCAL (`sa`/`Sa#2026Demo`):
   `GET /api/conta/caja/flujo-detallado?anio=2026` → 200; Σ Ingresos mes 6 == G1; Σ Egresos
   MEDICO mes 6 == 61,958.20; `Catalogo.Count` ≈ 43. Repetir con `formasPago=1` (== G4).

## 6. FASE FRONT — `bi-frontend`

Pantalla: `react-project/src/pages/Contabilidad/FlujoConsolidado.tsx` (+ 1 componente nuevo).
Service/tipos: `ContabilidadService.ts` (patrón de `flujoConsolidado`, L173-179) + `contaTypes.ts`.

### 6.1 Service + tipos

- Tipos espejo de los DTOs §5.1: `FlujoDetalleIngresoRow`, `FlujoDetallePersonalRow`,
  `FlujoDetalleEgresoRow`, `FlujoDetalleCatalogoRow`, `FlujoDetallado`.
- `flujoDetallado(anio, formasPago?, incluirCredito?)` con la **misma convención de eficiencia**
  (solo enviar params no-default; URL default = `?anio=YYYY`).

### 6.2 Carga (un header, dos secciones)

En `load()` de `FlujoConsolidado.tsx` (L36-46): `Promise.all([flujoConsolidado(...), flujoDetallado(...)])`
con params idénticos → estados `data` (existente) y `detalle` (nuevo). El resto del header
(año/filtro/botones de cierre) NO cambia.

### 6.3 Componente nuevo: `components/FlujoDetalladoSection.tsx`

Se renderiza **debajo del card de la tabla consolidada** (después de L209), en su propio card con
título **"Flujo de Caja Detallado"**. Props: `{ detalle, resumen: data.Resumen, filtroActivo }`.
Extraer `Row`/`rowClass`/`cellBg` de `FlujoConsolidado.tsx` a un módulo compartido
(`components/flujoShared.ts`) para reusar el mismo lenguaje visual (misma matriz Ene..Dic + Total,
primera columna sticky, tabular-nums).

**Blueprint de filas (orden exacto; `H`=header, `d`=detalle indentado, `T`=total, `S`=saldo):**

```
H INGRESOS OPERATIVOS
H  ASISTENCIAL                       ← sub-header por unidad (D8)
d   EFECTIVO SOLES / VISA / DEPOSITO / YAPE / PLIN     (todas las formas del catálogo de la página)
d   COBRANZAS CRÉDITO ASISTENCIAL    ← solo si ≠0 (D3)
H  OCUPACIONAL   → mismas formas + COBRANZAS CRÉDITO OCUPACIONAL
H  SEGUROS       → COBRANZAS CRÉDITO SEGUROS (bloque solo-crédito, D3)
H  FARMACIA / SISOL → mismas formas   (+ SEGUROS/MTC/SIN UNIDAD contado solo si ≠0)
T TOTAL INGRESOS OPERATIVOS          ← Σ RS1 (debe == fila TOTAL INGRESOS del consolidado)
H EGRESOS OPERATIVOS
H  EGRESOS DE PERSONAL
H   ASISTENCIAL → d REMUNERACIONES/GRATIFICACIONES/CTS/UTILIDADES/BENEFICIOS SOCIALES/PERSONAL ADICIONAL
H   OCUPACIONAL / FARMACIA / SISOL → mismos 6 conceptos  (+ ADMINISTRACION solo si ≠0, D6)
     (los 6 conceptos son esqueleto UI constante; se mergean con RS2 — hoy todo '—')
H  GASTOS ADMINISTRATIVOS → d una fila por hoja ADM-* del Catalogo (RS4), orden del seed
H  GASTOS MEDICOS → d hojas MED-* + PAGOS MÉDICOS (CAJA LEGACY) [MED-LEG]
H  TRIBUTOS CORRIENTES + AFP → d IMPUESTOS, AFP
H  IMPUESTO A LA RENTA + PARTICIPACIONES → d IMPUESTO A LA RENTA, PARTICIPACIONES
T TOTAL EGRESOS OPERATIVOS           ← del Resumen del consolidado (D1)
T FLUJO DE CAJA OPERATIVO            ← Resumen (D1)
H EGRESOS DE INVERSIÓN → d CAPEX ACTIVO FIJO, CAPEX INFRAESTRUCTURA
T CAJA OPERATIVA + INVERSIÓN         ← Resumen
H EGRESOS DE FINANCIAMIENTO → d AMORT. INTERBANK / BCP / BBVA, GASTOS BANCARIOS/ITF
T CAJA OPERATIVA + FINANCIAMIENTO    ← Resumen
H OTROS EGRESOS → d PAGO ASOCIADOS, PAGO CONVENIOS, OTROS SISOL, TRANSFERENCIAS A CALIFORNIA
                    (por entidad si D7 aplica)
H OTROS INGRESOS → d TRANSFERENCIAS DE CALIFORNIA
T SALDO DE CAJA / S SALDO INICIAL / S SALDO FINAL   ← Resumen (D1; mismas reglas de atenuado)
```

Reglas de render:
- Hojas del catálogo SIEMPRE visibles aunque estén en 0 → '—' (D2). Ingresos: formas siempre
  visibles por unidad del mockup; unidades extra solo si ≠0 (D8).
- `filtroActivo`: mismas señales que el consolidado — egresos rotulados "totales (sin filtro)",
  filas de cola/saldos atenuadas con nota. Las líneas de crédito desaparecen con crédito OFF (D5).
- Tabla larga (~95 filas): mantenerla plana (fiel al impreso). Colapsables = v2, NO en este plan.

### 6.4 Verificación front

`npx tsc --noEmit` (0 errores) + `npx vite build` (verde). El card consolidado NO cambia
(salvo la extracción de estilos compartidos, que debe ser refactor puro sin cambio visual).

## 7. E2E (orquestador)

1. Login demo → `/conta/flujo-consolidado` 2026.
2. **G-UI1**: fila "TOTAL INGRESOS OPERATIVOS" del detallado == fila "TOTAL INGRESOS" del
   consolidado, columna por columna (jun ≈ 828,700.50 sin filtro).
3. **G-UI2**: "PAGOS MÉDICOS (CAJA LEGACY)" jun = 61,958.20 == fila "Médico" del consolidado.
4. **G-UI3**: filtro "solo EFECTIVO SOLES" → ambas secciones se mueven juntas (mismos totales
   de ingresos); egresos/saldos intactos y rotulados. Crédito OFF → líneas COBRANZAS CRÉDITO
   desaparecen en el detallado y la fila "Cobranzas crédito..." del consolidado también.
5. **G-UI4**: bloques sin datos muestran todas sus hojas en '—' (formato impreso completo).
6. Cierre/apertura/reabrir siguen funcionando (no se tocaron).

## 8. Fuera de alcance (registrar, no ejecutar)

- Carga histórica de egresos/personal (§5 LOG) — el detallado la mostrará solo cuando exista.
- Colapsar/expandir bloques, export Excel/PDF del formato impreso — v2.
- Detalle por entidad si `conta.egreso` no tiene la FK (D7) — registrar pendiente si es el caso.
- Cualquier cambio a `sp_Caja_FlujoConsolidado` — PROHIBIDO en este plan (es la referencia de los GATEs).

## 9. Rollback

- BD: `DROP PROCEDURE conta.sp_Caja_FlujoDetallado` (objeto nuevo, sin consumidores externos).
- API/Front: revert del commit (endpoint y sección nuevos; el consolidado queda como estaba).

## 10. Checklist de ejecución

- [ ] db-experto: confirmar columnas (`costo_personal_mensual`, FK entidad en `egreso`) → crear SP
      → G1–G6 con cifras ancladas → actualizar `04_caja_motor.sql`
- [ ] backend-api: liberar 5090 → DTOs + repo QueryMultiple(4) + endpoint + curl (G1/G2/G4 vía API)
- [ ] bi-frontend: tipos/service + `flujoShared.ts` (refactor puro) + `FlujoDetalladoSection.tsx`
      + Promise.all en load() + tsc/build
- [ ] orquestador: E2E §7 + commit `feat(conta): flujo de caja detallado (mockups 02/03) en /flujo-consolidado`
- [ ] orquestador: registrar cifras GATE en LOG + memoria (nueva capacidad + hallazgo D7)

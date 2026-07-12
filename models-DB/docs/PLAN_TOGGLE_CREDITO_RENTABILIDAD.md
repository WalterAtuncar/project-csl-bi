# PLAN — Toggle "Incluir ventas a crédito" en Rentabilidad y Rentabilidad por Unidad

**Fecha de diseño:** 2026-07-12 · **Estado:** APROBADO PARA EJECUCIÓN (aún no ejecutado)
**Decisión del usuario:** Opción A del análisis de medios de pago en rentabilidad — SOLO el toggle
de crédito. El filtro completo por medios de pago en rentabilidad fue **descartado** (ver §9).
**Documentos hermanos:** `PLAN_FILTRO_MEDIOS_PAGO.md` (ejecutado 2026-07-12; mismo estilo de card/rótulos),
`LOG_EJECUCION_CONTA.md` (runbooks).

---

## 0. Objetivo y decisiones cerradas (NO renegociar)

Agregar a `/conta/rentabilidad` y `/conta/rentabilidad-unidades` un **toggle único
"Incluir ventas a crédito" (default ON)**. Con OFF, los INGRESOS de rentabilidad excluyen las
ventas cuya condición es CREDITO; los GASTOS no se filtran (no tienen esa dimensión).

| # | Decisión | Valor cerrado |
|---|---|---|
| T1 | Alcance | Solo las 2 pantallas de rentabilidad. NO caja (ya tiene su propio filtro), NO SISOL, NO Egresos. |
| T2 | Qué excluye OFF | Ventas con condición **CREDITO** (grupo 41). Las condiciones **CONTADO y DEPOSITO (item 5) SIEMPRE quedan incluidas** — DEPOSITO no es crédito. |
| T3 | Gastos | **Nunca se filtran** (sin dimensión de condición). Con OFF, se rotulan "Gastos totales". |
| T4 | Resultado/Margen/Semáforo con OFF | Se muestran **atenuados (opacity-50) + rótulo** "calculado sobre ingresos sin crédito y gastos totales — vista parcial". No se ocultan. |
| T5 | Default y persistencia | Default ON = comportamiento/cifras actuales idénticos. Estado local por pantalla, sin persistencia (igual que el filtro de caja). |
| T6 | Coherencia interna de pantalla | En `/conta/rentabilidad` el toggle aplica a **General Y Comparativa** (KPI y gráfico deben contar la misma historia). En `/conta/rentabilidad-unidades` aplica a **PorUnidad**; el detalle expandible de gastos queda total (T3). |
| T7 | SISOL intocable | `sp_Sisol_Calcular` y todo `sp_Sisol_*` siguen usando la semántica actual (crédito incluido). El toggle NO llega ahí. |

---

## 1. Contexto verificado en producción (2026-07-12) — NO re-descubrir

### 1.1 La condición de venta (la dimensión del toggle)

- Vive en **`dbo.venta.i_IdCondicionPago`** → `dbo.datahierarchy` grupo **41**.
- Condiciones ACTIVAS en 2026: **CONTADO (1), CREDITO (2), DEPOSITO (5)** — tres, no dos.
  DEPOSITO tiene volumen material (jun-2026: 35,109.02 neto) y **NO es crédito** (T2).
- Es una dimensión **nativa del devengado**: está en la venta misma → sin desfase temporal,
  sin categoría "sin cobrar", sin reclasificación retroactiva. (Por eso este toggle SÍ procede
  y el filtro por medios de pago NO — ver §9.)
- La misma dimensión ya se usa en caja: el predicado de `@IncluirCredito` implementado en
  `sp_Caja_Diaria`/`sp_Caja_FlujoConsolidado` (2026-07-12) es el patrón de referencia.

### 1.2 La cadena de rentabilidad (definiciones vivas al 2026-07-12)

```
conta.fn_Rentabilidad_Ingresos(@Anio,@Mes)   ← iTVF, universo venta+ventadetalle (4 filtros),
  │   neto = SUM(vd.d_Valor); aplica % SISOL vigente (conta.sisol_participacion) a la unidad SISOL
  ├── conta.fn_Rentabilidad_TotalesMes ──► sp_Rentabilidad_General, sp_Rentabilidad_Comparativa
  ├── sp_Rentabilidad_PorUnidad  (ingresos por unidad; gastos vía fn_Rentabilidad_Gastos)
  ├── sp_Rentabilidad_Ingresos   (detalle; NO está en alcance)
  └── conta.sp_Sisol_Calcular    (¡CONSUMIDOR CRÍTICO! — no debe cambiar de comportamiento)
```

- **Restricción SQL 2012**: una iTVF NO admite parámetros con default → NO se puede agregar
  `@IncluirCredito` a `fn_Rentabilidad_Ingresos` sin romper/tocar a TODOS sus consumidores.
  De ahí el patrón de delegación de §3.
- Los SPs/fns de rentabilidad viven en `models-DB/script-conta/sp/05_rentabilidad.sql`.
  **Hecho de oro #3**: leer definición VIVA (`sys.sql_modules`) antes de modificar; si difiere
  del repo, PARAR y reportar.

### 1.3 Cifras ancla (INMUTABLES — nivel facturado, sin % SISOL)

Las ventas de meses cerrados no cambian → estos números sirven para GATEs permanentes.
Universo rentabilidad (4 filtros; el filtro de series canónico es
`ISNULL(v.v_SerieDocumento,'') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')` —
verificado: la variante por SUBSTRING del correlativo NO excluye nada):

| Mes 2026 | Facturado neto total | CONTADO | CREDITO | DEPOSITO(5) | **Total sin crédito (OFF)** |
|---|---|---|---|---|---|
| Jun | 621,180.42 | 426,523.88 | 159,547.52 | 35,109.02 | **461,632.90** |
| May | 649,951.26 | 479,404.48 | 143,050.45 | 27,496.33 | **506,900.81** |

Gastos jun-2026 (invariantes al toggle, T3): **61,958.20**.

### 1.4 ⚠️ El % SISOL es EDITABLE EN CALIENTE por el usuario — implicación para los GATEs

Desde 2026-07-12 existe `PUT /sisol/participacion` + UI (Catálogos → % SISOL). El usuario YA lo
usó (dejó 30/70 clínica/hospital ese día; el seed era 70/30). `fn_Rentabilidad_Ingresos` lee el %
en vivo → **cualquier cifra a nivel `NetoRentabilidad`/Ingresos-de-pantalla depende del % vigente
al momento de la prueba**. Por lo tanto:

- Los GATEs de regresión "default = comportamiento actual" se hacen contra **BASELINE CAPTURADO
  EN VIVO en la misma sesión de ejecución** (no contra números escritos aquí).
- Los GATEs del toggle OFF se anclan a **nivel `NetoSinIGV`** (tabla §1.3, inmutable) y a la
  **query de referencia independiente** (§3.6).
- Nota histórica para no confundirse: 588,329.24 (ingresos jun) corresponde a % 70/30;
  544,527.66 corresponde a 30/70. Ambos son "correctos" según el % vigente.

---

## 2. Arquitectura de la solución

```
UI (toggle por pantalla, default ON)
  └─ GET /rentabilidad/general?anio&mes[&incluirCredito=false]
  └─ GET /rentabilidad/comparativa?anio[&incluirCredito=false]
  └─ GET /rentabilidad/por-unidad?anio&mes[&incluirCredito=false]
       └─ RentabilidadRepository (param opcional Dapper)
            └─ sp_Rentabilidad_General / _Comparativa / _PorUnidad  (+@IncluirCredito BIT=1)
                 └─ fn_Rentabilidad_TotalesMesEx / fn_Rentabilidad_IngresosEx  (NUEVAS, con param)
                      ▲ las fns viejas quedan como delegado con @IncluirCredito=1
                        → sp_Sisol_Calcular, sp_Rentabilidad_Ingresos y Gastos: CERO impacto
```

`GET /rentabilidad/gastos` NO cambia (T3/T6).

---

## 3. FASE 1 — Base de datos (ejecutor: db-experto)

### 3.1 Patrón de delegación (obligatorio, por la restricción iTVF de §1.2)

1. **`conta.fn_Rentabilidad_IngresosEx(@Anio, @Mes, @IncluirCredito BIT)`** (NUEVA):
   copia exacta de la definición VIVA de `fn_Rentabilidad_Ingresos` con DOS agregados en el
   universo de ventas:
   - `LEFT JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago`
     (si la fn ya joinea dh41, reutilizarlo).
   - Predicado: `AND ( @IncluirCredito = 1 OR ISNULL(dh41.v_Value1,'') <> 'CREDITO' )`
     (mismo patrón aplicado en caja el 2026-07-12; excluye SOLO CREDITO — CONTADO y DEPOSITO pasan, T2).
   - Tipos de `@Anio`/`@Mes`: **espejar los de la fn viva** (no asumir).
2. **Reescribir `conta.fn_Rentabilidad_Ingresos(@Anio,@Mes)`** como delegado puro:
   `RETURN SELECT * FROM conta.fn_Rentabilidad_IngresosEx(@Anio, @Mes, 1)`
   → `sp_Sisol_Calcular`, `sp_Rentabilidad_Ingresos` y cualquier otro consumidor conservan
   comportamiento EXACTO sin tocarse (T7).
3. **`conta.fn_Rentabilidad_TotalesMesEx(@Anio, @Mes, @IncluirCredito BIT)`** (NUEVA): copia de
   `fn_Rentabilidad_TotalesMes` usando `fn_Rentabilidad_IngresosEx(...,@IncluirCredito)`
   (la parte de gastos sigue llamando a `fn_Rentabilidad_Gastos` SIN cambios — T3).
   Y `fn_Rentabilidad_TotalesMes` queda como delegado con `1`.
4. **Parametrizar 3 SPs** (agregar `@IncluirCredito BIT = 1` al final de la firma —
   retrocompatible con Dapper):
   - `sp_Rentabilidad_General` → usa `fn_Rentabilidad_TotalesMesEx(..., @IncluirCredito)`.
   - `sp_Rentabilidad_Comparativa` → ídem en su cálculo por mes (verificar en vivo cómo compone;
     mantener shape idéntico).
   - `sp_Rentabilidad_PorUnidad` → su lado de INGRESOS usa `fn_Rentabilidad_IngresosEx(...)`;
     su lado de GASTOS (fn_Rentabilidad_Gastos) NO se toca.

### 3.2 Lista negra (NO tocar)

`fn_Rentabilidad_Gastos`, `sp_Rentabilidad_Gastos`, `sp_Rentabilidad_Ingresos`, todo `sp_Sisol_*`,
todo `sp_Caja_*`, `conta.sisol_participacion` (el % lo maneja el usuario), todo `dbo`.

### 3.3 Shape

Los resultsets de los 3 SPs parametrizados quedan con **columnas y grano IDÉNTICOS**
(los DTOs `RentabilidadGeneral`/`RentabilidadUnidadRow`/`ComparativaResponse` no cambian).

### 3.4 Procedimiento

1. Backup de definiciones vivas (las 2 fns + 3 SPs) a scratchpad ANTES de alterar.
2. **Capturar BASELINE vivo** (outputs de los 3 SPs sin params, jun-2026 y año) ANTES de cambiar.
3. Aplicar solo los objetos cambiados (no re-correr el archivo entero, para no bumpear
   `modify_date` de los intocables) y dejar `models-DB/script-conta/sp/05_rentabilidad.sql`
   == producción.

### 3.5 GATE 1 (BD) — evidencia obligatoria

| # | Prueba | Esperado |
|---|---|---|
| 1.1 | `SELECT * FROM fn_Rentabilidad_Ingresos(2026,6)` post-cambio | Idéntico al baseline (delegación transparente) |
| 1.2 | Los 3 SPs SIN el param nuevo (jun-2026 / año) | Byte-idénticos al baseline capturado en §3.4.2 |
| 1.3 | `SUM(NetoSinIGV)` de `fn_Rentabilidad_IngresosEx(2026,6,0)` | **461,632.90** (ancla §1.3) |
| 1.4 | Ídem `(2026,5,0)` | **506,900.81** |
| 1.5 | `fn_Rentabilidad_IngresosEx(2026,6,0)`: verificar que ventas condición DEPOSITO siguen presentes | 35,109.02 incluido (T2; OFF ≠ "solo contado") |
| 1.6 | `sp_Rentabilidad_General @Anio=2026,@Mes=6,@IncluirCredito=0` | `Gastos` = **61,958.20** (invariante T3); `Ingresos` = mismo valor que arroje la query de referencia §3.6 con el % vigente |
| 1.7 | `sp_Rentabilidad_PorUnidad ... @IncluirCredito=0` | Suma de Ingresos por unidad == `Ingresos` de 1.6 (coherencia interna); columna Gastos idéntica a la corrida sin filtro |
| 1.8 | `sp_Sisol_Calcular` NO tocado | `modify_date` sin cambio; (opcional) recalcular un mes CALCULADO y verificar mismas cifras que antes del cambio |
| 1.9 | `sp_Rentabilidad_Comparativa ... @IncluirCredito=0` | Mes jun coherente con 1.6; sin param = baseline |

### 3.6 Query de referencia independiente (para 1.6/1.7 — nivel pantalla, % vigente)

```sql
-- Ingresos de rentabilidad sin crédito, con el % SISOL VIGENTE aplicado (calcular en vivo):
WITH u AS (
  SELECT CASE WHEN tc.v_NombreTipoCaja = 'SISOL' THEN 1 ELSE 0 END AS EsSisol,  -- ajustar al criterio real de unidad de la fn viva
         SUM(vd.d_Valor) AS Neto
  FROM dbo.venta v
  JOIN dbo.ventadetalle vd ON vd.v_IdVenta = v.v_IdVenta AND ISNULL(vd.i_Eliminado,0) = 0
  LEFT JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago
  /* + los 4 filtros sagrados y el join de unidad EXACTOS de fn_Rentabilidad_IngresosEx */
  WHERE v.t_InsertaFecha >= '20260601' AND v.t_InsertaFecha < '20260701'
    AND ISNULL(dh41.v_Value1,'') <> 'CREDITO'
  GROUP BY CASE WHEN tc.v_NombreTipoCaja = 'SISOL' THEN 1 ELSE 0 END
)
SELECT SUM(CASE WHEN EsSisol = 1
                THEN CAST(Neto * p.PorcClinica / 100.0 AS DECIMAL(18,2))
                ELSE Neto END)
FROM u CROSS APPLY (SELECT TOP 1 d_PorcClinica AS PorcClinica
                    FROM conta.sisol_participacion
                    WHERE t_VigenciaDesde <= '20260601'
                      AND (t_VigenciaHasta IS NULL OR t_VigenciaHasta >= '20260601')
                    ORDER BY t_VigenciaDesde DESC) p;
```
(El ejecutor debe calcar el universo/joins de la fn VIVA, no inventarlos; el esqueleto de arriba
solo fija la estructura. El resultado depende del % vigente — por eso se computa en vivo.)

---

## 4. FASE 2 — Backend API (ejecutor: backend-api)

> ⚠️ Liberar el puerto 5090 ANTES de compilar (`Get-NetTCPConnection -LocalPort 5090 | ...
> Stop-Process`). NO relanzar el server al terminar (lo hace el orquestador).

1. `Repositories/RentabilidadRepository.cs`: extender `General(anio, mes, bool incluirCredito)`,
   `PorUnidad(anio, mes, bool incluirCredito)` y `Comparativa(anio, bool incluirCredito)`
   agregando `IncluirCredito = incluirCredito` a los params Dapper. `Gastos(...)` NO cambia.
2. `Controllers/RentabilidadController.cs`: en `GET rentabilidad/general`,
   `GET rentabilidad/por-unidad` y `GET rentabilidad/comparativa` agregar
   `[FromQuery] bool incluirCredito = true` (al final, retrocompatible). `gastos` NO cambia.
3. DTOs existentes intactos. Sin DTOs nuevos.
4. **GATE 2**: `dotnet build` 0 errores; runtime (lo corre el orquestador tras reiniciar):
   - 2.1 `GET /rentabilidad/general?anio=2026&mes=6` sin param = baseline vivo.
   - 2.2 `...&incluirCredito=false` → `Gastos=61,958.20` y `Ingresos` == GATE 1.6.
   - 2.3 `GET /rentabilidad/por-unidad...&incluirCredito=false` → suma unidades == 2.2.
   - 2.4 `GET /rentabilidad/comparativa?anio=2026&incluirCredito=false` → jun coherente con 2.2.

---

## 5. FASE 3 — Frontend (ejecutor: bi-frontend)

1. `ContabilidadService.ts`: extender `rentabilidadGeneral(anio, mes, incluirCredito?)`,
   `rentabilidadPorUnidad(anio, mes, incluirCredito?)`, `rentabilidadComparativa(anio, incluirCredito?)`.
   **Convención**: solo enviar `incluirCredito=false` cuando esté OFF (URL default idéntica a la
   actual — T5). `rentabilidadGastos` sin cambios.
2. Control UI: **un checkbox/switch simple** "Incluir ventas a crédito" junto a los selects
   año/mes de cada pantalla (NO usar `MediosPagoFilterCard` — aquí es un solo control; aplicar
   directo al cambiar, sin botón Aplicar). Tooltip/nota: "OFF = solo facturación al contado y
   depósito; las ventas a crédito (cuentas por cobrar) se excluyen".
3. `Rentabilidad.tsx`: el toggle recarga `rentabilidadGeneral` **y** `rentabilidadComparativa`
   con el mismo valor (T6). Con OFF (`filtroActivo`):
   - Banner: "Vista sin ventas a crédito".
   - KPI **Gastos**: rótulo "Gastos totales (no filtrados)" (T3).
   - KPI **Resultado / Margen / Semáforo**: `opacity-50` + rótulo T4.
4. `RentabilidadUnidades.tsx`: toggle recarga `rentabilidadPorUnidad` (T6; `rentabilidadGastos`
   se recarga igual pero SIN el param). Con OFF: banner; columna Gastos + detalle expandible con
   rótulo T3; columnas Resultado/Margen/Estado atenuadas + rótulo T4.
5. Estado local por pantalla, default ON, sin persistencia (T5).
6. **GATE 3**: `npx tsc --noEmit` 0 errores; carga default = cifras idénticas y URL sin param;
   OFF muestra banner/rótulos/atenuados y las cifras del GATE 2.

---

## 6. Verificación E2E final (orquestador)

1. Reiniciar API (5090); front ya corre (5173).
2. Matriz GATE 2 vía curl con token demo — evidencia con cifras.
3. Navegador: ambas pantallas jun-2026 — default idéntico; OFF: ingresos bajan (el delta a nivel
   facturado debe ser exactamente **159,547.52** si el % no interfiere en las unidades no-SISOL;
   validar coherencia General==Σunidades), gastos constantes 61,958.20 rotulados, resultado
   atenuado, comparativa consistente con el KPI.
4. Regresión SISOL: pantalla `/conta/sisol` y un `Calcular` de mes CALCULADO → cifras idénticas
   a antes del cambio (T7).

## 7. Orden, responsables y commit

FASE 1 (db-experto, GATE 1) → FASES 2+3 en paralelo (contratos fijados aquí) → E2E (orquestador).
Un solo commit integrador: `feat(conta): toggle incluir ventas a credito en rentabilidad`
(05_rentabilidad.sql + API + front + este PLAN con GATEs marcados). Registrar en
`LOG_EJECUCION_CONTA.md`.

## 8. Anti-objetivos (releer antes de codear)

- NO cambiar la firma de `fn_Rentabilidad_Ingresos`/`fn_Rentabilidad_TotalesMes` (delegación, §3.1).
- NO tocar `sp_Sisol_*` ni `fn_Rentabilidad_Gastos` ni `sp_Rentabilidad_Gastos`/`_Ingresos` ni nada de caja.
- NO filtrar gastos (T3). NO ocultar resultado/margen (atenuar, T4). NO excluir la condición DEPOSITO (T2).
- NO fijar GATEs sobre cifras que dependan del % SISOL sin capturar baseline vivo (§1.4).
- NO tocar `dbo` (solo SELECT). SQL 2012 estricto (sin CREATE OR ALTER; iTVF sin defaults).
- NO agregar el filtro de medios de pago a rentabilidad (§9 — decisión explícita del usuario).

## 9. Descartado a consciencia (no reabrir sin pedido explícito del usuario)

**Filtro completo por medios de pago en rentabilidad (Opción B del análisis 2026-07-12):**
técnicamente viable (puente `cobranzadetalle.v_IdVenta` con cardinalidad 1:1 verificada, sin
pagos parciales ni multi-medio), pero descartado porque: (a) el 22.3% del facturado del mes
corriente no tiene medio atribuible (crédito sin cobrar; ~4.5% en mes maduro); (b) ~17.7% del
monto se reclasifica retroactivamente 1–2 meses tras el cierre (el reporte se reescribiría);
(c) los gastos no tienen la dimensión → el Resultado filtrado carece de semántica.
Mix de referencia jun-2026 (facturado por medio de su cobranza): Efectivo 48.7% · Sin cobrar
22.3% · Visa 20.1% · Depósito 8.8% · Yape/Plin 0.15%. Si algún día se quiere esa información,
la forma correcta es un **desglose informativo** ("¿cómo se cobró lo facturado?"), no un filtro.

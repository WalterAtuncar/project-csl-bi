# PLAN — Filtro por Medio de Pago (visión de liquidez) en Caja Diaria y Flujo Consolidado

**Fecha de diseño:** 2026-07-12 · **Estado:** APROBADO PARA EJECUCIÓN (aún no ejecutado)
**Autor del análisis:** orquestador + legacy-negocio + db-experto + bi-frontend (3 investigaciones en vivo contra producción, 2026-07-12)
**Documentos hermanos:** `LOG_EJECUCION_CONTA.md` (runbooks), `PLAN_LOGIN_UNIFICADO_BI.md` (formato de referencia)

---

## 0. Objetivo y decisiones cerradas (del usuario, NO renegociar)

Agregar a las pantallas de caja de `/conta` un **card superior con checkboxes de medios de pago**
(Efectivo, Visa, Depósito, Yape, Plin) + control "Todos", para filtrar la vista y ver la
**liquidez** (p.ej. solo efectivo, o todo menos depósitos).

| # | Decisión | Valor cerrado |
|---|---|---|
| D1 | Alcance | **Solo Caja Diaria + Flujo Consolidado** (donde el filtro aplica pleno). NO Rentabilidad, NO SISOL, NO Egresos, NO Compras, NO Personal. |
| D2 | Egresos bajo filtro | **Los egresos NO se filtran.** Se muestran siempre totales, con rótulo visible de que no reflejan el filtro. |
| D3 | Crédito | "Crédito" NO es un medio de pago. Se implementa como **checkbox separado "Incluir cobranzas de crédito" (on/off, default ON)**. |
| D4 | Persistencia | **Cada pantalla su propio filtro** (estado local). Default = **todos marcados + crédito ON** → el resultado inicial debe ser IDÉNTICO al actual. |
| D5 | Saldos con filtro activo | Se muestran **atenuados con rótulo** ("saldos totales, no reflejan el filtro"), no se ocultan. |
| D6 (derivada) | Cierres | `sp_Caja_CerrarMes`, `sp_Caja_Indicadores` y el GATE de cuadre **NO se tocan ni reciben el filtro, jamás**. El filtro es capa de visualización. |

---

## 1. Contexto verificado en producción (2026-07-12) — el ejecutor NO debe re-descubrir esto

### 1.1 Dónde vive el dato

- El medio de pago vive en **`dbo.cobranzadetalle.i_IdFormaPago` (int, NOT NULL de facto)** —
  la MISMA tabla y fila del `d_ImporteSoles` y `t_InsertaFecha` que ya suma la tubería CAJA.
  **Filtrar no requiere ningún JOIN nuevo**; el JOIN a catálogo es solo para la etiqueta.
- Catálogo = `dbo.datahierarchy` **grupo 46** (13 filas). NO confundir con
  `dbo.cobranza.i_IdMedioPago` (grupo 44 SUNAT, cabecera): está **inconsistente — IGNORAR**.
- Calidad verificada: **0 NULLs** y **0 huérfanos** en `i_IdFormaPago` sobre 345,162 filas
  históricas. Cardinalidad real **1 cobranza = 1 detalle = 1 venta = 1 forma de pago**
  (cero pagos mixtos en toda la historia) → sin prorrateos.

### 1.2 Catálogo vivo (grupo 46)

| ItemId | v_Value1 | Uso 2026 |
|---|---|---|
| 1 | EFECTIVO SOLES | VIVO |
| 2 | VISA | VIVO |
| 9 | DEPOSITO | VIVO |
| 12 | YAPE | VIVO (desde ene-2026) |
| 13 | PLIN | VIVO (desde ene-2026) |
| 3,4,5,6,7,8,10 | Mastercard, NC, Adelanto, Cheque, Visa US$, NC US$, Efectivo US$ | históricos muertos (último uso ≤2023) |
| 11 | ADELANTO | basura (`i_IsDeleted=1`) |

**En 2026 solo se usan 1, 2, 9, 12, 13.** El catálogo que se exponga al front debe ser dinámico
(medios usados recientemente), no las 13 filas.

### 1.3 Semántica CRÉDITO (D3)

- Crédito = **condición de la venta**: `dbo.venta.i_IdCondicionPago` → `datahierarchy` grupo **41**
  (`v_Value1='CREDITO'`). La venta a crédito nace SIN cobranza (CxC); al cobrarse genera
  `cobranzadetalle` con su propia forma de pago y entra a CAJA en la fecha de cobranza.
- La tubería ya computa esto: `sp_Caja_Ingresos` expone `EsCobranzaCredito` y
  `sp_Caja_FlujoConsolidado` carga `EsCredito` en `@ingMes` vía
  `CASE WHEN dh41.v_Value1='CREDITO' THEN 1 ELSE 0 END`.
- "Incluir cobranzas de crédito = OFF" significa: **excluir de los ingresos las cobranzas cuya
  venta es condición CREDITO** (EsCobranzaCredito=1). No toca egresos ni saldos.

### 1.4 Cifras de referencia (cuadre verificado al centavo contra producción)

Universo CAJA (= el de los SPs): `dbo.cobranzadetalle cd` JOIN `dbo.venta v` con
`ISNULL(cd.i_Eliminado,0)=0 AND ISNULL(v.i_Eliminado,0)=0`, fecha por `cd.t_InsertaFecha` fin-exclusivo.

| Medio | Abr-2026 | May-2026 | Jun-2026 |
|---|---|---|---|
| EFECTIVO SOLES (1) | 440,054.61 | 512,232.78 | 451,126.49 |
| DEPOSITO (9) | 258,685.31 | 300,796.65 | 229,310.71 |
| VISA (2) | 131,212.60 | 151,765.81 | 147,183.40 |
| YAPE (12) | 490.00 | 1,391.50 | 783.40 |
| PLIN (13) | 246.00 | 426.50 | 296.50 |
| **TOTAL** | **830,688.52** | **966,613.24** | **828,700.50** |

Egresos jun-2026 (NO se filtran, constantes en toda prueba): **61,958.20**
(legacy cajamayor 'E'; `conta.egreso` y `costo_personal_mensual` hoy vacías).

### 1.5 Estado actual de los SPs (modify_date 2026-07-12 14:04, repo == producción)

- `sp_Caja_Diaria` — ingresos: `@ing TABLE(Dia,Monto)` desde cobranzadetalle (SIN dh41 hoy);
  egresos: CTE con 3 UNION (conta.egreso + costo_personal + cajamayor legacy); saldo con
  `SUM() OVER (ORDER BY ... ROWS UNBOUNDED PRECEDING)` arrancando de `@saldoIni`.
- `sp_Caja_FlujoConsolidado` — `@ingMes(Mes, i_IdTipoCaja, Unidad, EsCredito, Monto)` desde
  cobranzadetalle + tipocaja + dh41; `@egrMes` con 3 orígenes; devuelve 3 resultsets.
- `sp_Caja_Ingresos` — YA expone `i_IdFormaPago` y `FormaPago` (dh46) por fila. Es el detalle
  del día en Caja Diaria.
- Fuente versionada: `models-DB/script-conta/sp/04_caja_motor.sql`. **Hecho de oro #3**: leer
  la definición VIVA (`sys.sql_modules`) antes de modificar; si difiere del repo, PARAR y reportar.

### 1.6 Restricciones duras

- SQL Server **2012**: sin `STRING_SPLIT`, sin `CREATE OR ALTER`, etc. → ver `reglas-sql2012.md`.
- **PROHIBIDO** todo DDL/índice sobre `dbo` (y no hace falta: costo medido del GROUP BY por medio
  de pago = milisegundos, sin índice).
- **NO cambiar el grano ni el shape** de ningún resultset existente (los DTOs
  `CajaDiaRow`/`FlujoMesRow`/`CajaIngresoRow` NO cambian). Filtrar con WHERE, no con GROUP BY nuevo.
- Front: axios sin `paramsSerializer` → las listas viajan como **CSV string** (`formasPago=1,9,12`),
  nunca como array (ASP.NET no bindea `medios[]=`).
- La BD es producción: probar → evidenciar → limpiar (aquí no hay datos que sembrar; los cambios
  son de definición y son permanentes).

---

## 2. Arquitectura de la solución (resumen de 30 segundos)

```
UI (card checkboxes por pantalla, default todos+crédito ON)
  └─ GET /caja/diaria?anio&mes[&formasPago=1,9][&incluirCredito=false]
  └─ GET /caja/flujo-consolidado?anio[&formasPago=...][&incluirCredito=...]
  └─ GET /caja/formas-pago            ← catálogo nuevo
       └─ CajaRepository (Dapper, params opcionales por nombre)
            └─ conta.sp_Caja_Diaria / sp_Caja_FlujoConsolidado
               (+2 params opcionales NULL/1 = comportamiento idéntico al actual)
            └─ conta.sp_Caja_FormasPago (nuevo, catálogo dinámico)
```

Parámetros nuevos en ambos SPs (retrocompatibles):
`@FormasPago NVARCHAR(200) = NULL` (CSV de ItemIds grupo 46; NULL/'' = todos) y
`@IncluirCredito BIT = 1`.

---

## 3. FASE 1 — Base de datos (ejecutor: db-experto)

### 3.1 `conta.sp_Caja_FormasPago` (NUEVO)

Catálogo dinámico para el combo del front. Sin parámetros. Devuelve los medios de pago
**con uso real reciente** (últimos 24 meses), ordenados por monto desc:

```sql
SELECT dh.i_ItemId  AS i_IdFormaPago,
       dh.v_Value1  AS FormaPago
FROM dbo.datahierarchy dh
WHERE dh.i_GroupId = 46
  AND EXISTS (SELECT 1 FROM dbo.cobranzadetalle cd
              WHERE cd.i_IdFormaPago = dh.i_ItemId
                AND ISNULL(cd.i_Eliminado,0) = 0
                AND cd.t_InsertaFecha >= DATEADD(MONTH,-24,GETDATE()))
ORDER BY dh.i_ItemId;
```

(Resultado esperado hoy: 5 filas — 1, 2, 9, 12, 13. Si mañana reviven Mastercard/cheque,
aparecen solos.) Estilo idempotente `IF OBJECT_ID ... DROP / CREATE` como los vecinos.

### 3.2 Patrón de filtro multi-valor (SQL 2012, usar EXACTAMENTE este)

CSV + LIKE **contra el catálogo (13 filas), nunca contra la tabla de hechos**:

```sql
-- una sola vez al inicio del SP:
DECLARE @fp TABLE (i_IdFormaPago INT PRIMARY KEY);
IF @FormasPago IS NOT NULL AND LTRIM(RTRIM(@FormasPago)) <> ''
    INSERT INTO @fp
    SELECT dh.i_ItemId FROM dbo.datahierarchy dh
    WHERE dh.i_GroupId = 46
      AND ',' + @FormasPago + ',' LIKE '%,' + CAST(dh.i_ItemId AS VARCHAR(10)) + ',%';

-- y en el WHERE del bloque de INGRESOS (solo ingresos — D2):
AND ( @FormasPago IS NULL OR LTRIM(RTRIM(@FormasPago)) = ''
      OR cd.i_IdFormaPago IN (SELECT i_IdFormaPago FROM @fp) )
```

### 3.3 `conta.sp_Caja_Diaria` (MODIFICAR)

1. Firma: agregar `@FormasPago NVARCHAR(200) = NULL, @IncluirCredito BIT = 1` al final.
2. En el bloque de ingresos (`INSERT INTO @ing ... FROM dbo.cobranzadetalle cd INNER JOIN dbo.venta v ...`):
   - Agregar el predicado de formas de pago (§3.2).
   - Para `@IncluirCredito = 0`: hoy este bloque NO joinea dh41 → agregar
     `LEFT JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId = 41 AND dh41.i_ItemId = v.i_IdCondicionPago`
     y el predicado
     `AND ( @IncluirCredito = 1 OR ISNULL(dh41.v_Value1,'') <> 'CREDITO' )`.
3. **NO tocar**: bloque de egresos (D2), `@saldoIni`, el `SUM() OVER`, ni el shape del resultset.
   El saldo seguirá computándose sobre ingresos filtrados + egresos totales — es la semántica
   decidida (el front lo atenúa, D5).

### 3.4 `conta.sp_Caja_FlujoConsolidado` (MODIFICAR)

1. Misma firma nueva (`@FormasPago`, `@IncluirCredito`).
2. En el `INSERT INTO @ingMes ... FROM dbo.cobranzadetalle cd ...`:
   - Agregar el predicado de formas de pago (§3.2).
   - `@ingMes` ya tiene `EsCredito` (dh41 ya está joineado): agregar al WHERE del INSERT
     `AND ( @IncluirCredito = 1 OR dh41.v_Value1 IS NULL OR dh41.v_Value1 <> 'CREDITO' )`
     (equivalente: filtrar después por la columna EsCredito; elegir lo que menos toque el SP).
3. **NO tocar**: `@egrMes` (D2), `@apertura`, los 3 resultsets ni su grano/columnas.

### 3.5 NO TOCAR (lista negra explícita)

`sp_Caja_CerrarMes`, `sp_Caja_ReabrirMes`, `sp_Caja_Apertura`, `sp_Caja_Indicadores`,
`sp_Caja_Ingresos` (ya expone la dimensión; el detalle del día se filtra en el front que ya
tiene `i_IdFormaPago` por fila), todo `sp_Rentabilidad_*`, todo `dbo`.

### 3.6 Procedimiento y GATE 1 (BD)

1. Backup de definiciones vivas de los 2 SPs a scratchpad ANTES de alterar.
2. Aplicar cambios en producción vía db-console `--write` y actualizar
   `models-DB/script-conta/sp/04_caja_motor.sql` (repo == producción al terminar).
3. **GATE 1 — evidencia obligatoria (todas deben pasar):**

| # | Prueba | Esperado |
|---|---|---|
| 1.1 | `EXEC sp_Caja_Diaria @Anio=2026,@Mes=6` (sin params nuevos) | Byte-idéntico al baseline pre-cambio (capturarlo ANTES). Total ingresos jun = 828,700.50; egresos = 61,958.20 |
| 1.2 | Ídem `sp_Caja_FlujoConsolidado @Anio=2026` | Byte-idéntico al baseline. TotalEgresosOp por mes = 97,625.30 / 81,147.00 / 100,674.10 / 66,964.40 / 64,912.90 / 61,958.20 |
| 1.3 | `sp_Caja_Diaria ... @FormasPago='1'` | Suma de ingresos jun = **451,126.49**; egresos siguen 61,958.20 |
| 1.4 | `sp_Caja_Diaria ... @FormasPago='1,2,12,13'` (sin depósito) | Ingresos jun = **599,389.79** (= 828,700.50 − 229,310.71) |
| 1.5 | `sp_Caja_FlujoConsolidado ... @FormasPago='12,13'` | Ingresos jun = **1,079.90** |
| 1.6 | `@IncluirCredito=0` en ambos | Ingresos jun = 828,700.50 − X, donde X se computa en vivo con la query de referencia (§3.7). Ambos SPs deben dar el MISMO número |
| 1.7 | `@FormasPago=''` y `@FormasPago=NULL` | Ambos = comportamiento total (1.1/1.2) |
| 1.8 | Combinado `@FormasPago='1',@IncluirCredito=0` | = query de referencia con ambos predicados |

### 3.7 Query de referencia para el GATE de crédito (computar X en vivo)

```sql
SELECT SUM(cd.d_ImporteSoles) AS CobranzasCredito
FROM dbo.cobranzadetalle cd
INNER JOIN dbo.venta v ON v.v_IdVenta = cd.v_IdVenta AND ISNULL(v.i_Eliminado,0)=0
LEFT JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId=41 AND dh41.i_ItemId=v.i_IdCondicionPago
WHERE ISNULL(cd.i_Eliminado,0)=0
  AND cd.t_InsertaFecha >= '2026-06-01' AND cd.t_InsertaFecha < '2026-07-01'
  AND dh41.v_Value1 = 'CREDITO';
```

---

## 4. FASE 2 — Backend API (ejecutor: backend-api)

> ⚠️ Si el API corre en el 5090, liberar el puerto ANTES de compilar
> (`Get-NetTCPConnection -LocalPort 5090 | ... Stop-Process`). No relanzarlo al terminar
> (lo hace el orquestador).

### 4.1 DTO nuevo (`Models/Dtos.cs`, junto a los rows de caja)

```csharp
public class FormaPagoRow
{
    public int i_IdFormaPago { get; set; }
    public string FormaPago { get; set; }
}
```

### 4.2 Repositorio (`Repositories/CajaRepository.cs`)

- `Diaria(short anio, byte mes, string formasPago, bool incluirCredito)` → agregar
  `@FormasPago = (string.IsNullOrWhiteSpace(formasPago) ? null : formasPago)` e
  `@IncluirCredito = incluirCredito` al objeto de params de Dapper. Ídem
  `FlujoConsolidado(short anio, string formasPago, bool incluirCredito)`.
- Nuevo `FormasPago()` → `Query<FormaPagoRow>("conta.sp_Caja_FormasPago", CommandType.StoredProcedure)`.
- Dapper pasa por nombre → params opcionales del SP = retrocompatible.

### 4.3 Controller (`Controllers/CajaController.cs`)

- `GET caja/diaria`: agregar `[FromQuery] string formasPago = null, [FromQuery] bool incluirCredito = true`.
- `GET caja/flujo-consolidado`: ídem.
- NUEVO `GET caja/formas-pago` (solo `[Authorize]` de clase, sin rol — es catálogo de lectura,
  como los demás GET).

### 4.4 GATE 2 (API) — con el server levantado y token demo (`sa`/`Sa#2026Demo`)

| # | Prueba | Esperado |
|---|---|---|
| 2.1 | `GET /api/conta/caja/diaria?anio=2026&mes=6` (sin params nuevos) | JSON idéntico al pre-cambio (ingresos 828,700.50) |
| 2.2 | `...&formasPago=1` | suma ingresos = 451,126.49; egresos intactos |
| 2.3 | `...&formasPago=1,2,12,13` | 599,389.79 |
| 2.4 | `...&incluirCredito=false` | = GATE 1.6 |
| 2.5 | `GET /api/conta/caja/formas-pago` | 5 filas: 1 EFECTIVO SOLES, 2 VISA, 9 DEPOSITO, 12 YAPE, 13 PLIN |
| 2.6 | `dotnet build` | 0 errores (warnings NETSDK1138 preexistentes OK) |

---

## 5. FASE 3 — Frontend (ejecutor: bi-frontend)

### 5.1 Tipos (`services/contabilidad/contaTypes.ts`)

```ts
export interface FormaPagoRow { i_IdFormaPago: number; FormaPago: string; }
```

### 5.2 Service (`services/contabilidad/ContabilidadService.ts`)

- `cajaFormasPago(): Promise<FormaPagoRow[]>` → GET `/caja/formas-pago`.
- Extender firmas (params opcionales al final, sin romper callers):
  `cajaDiaria(anio, mes, formasPago?: string, incluirCredito?: boolean)` y
  `flujoConsolidado(anio, formasPago?: string, incluirCredito?: boolean)`.
- **Convención de eficiencia:** si TODOS los medios están marcados → NO enviar `formasPago`
  (undefined). Si crédito ON → NO enviar `incluirCredito`. Así la URL default es idéntica a la
  actual (D4) y cachea igual.

### 5.3 Componente nuevo `MediosPagoFilterCard` (`pages/Contabilidad/components/`)

Referencia UX que los usuarios ya conocen: el card de filtros de `pages/FlujoCaja/FlujoCaja.tsx`
(líneas ~501-630: checkbox-group Tipos de Caja + Todos/Ninguno + guard anti-vacío + Aplicar).
Skin del módulo conta: card de filtros de `pages/Contabilidad/Egresos.tsx` (~229-252,
`rounded-xl border`, slate/emerald).

Contrato del componente:

```ts
interface Props {
  medios: FormaPagoRow[];              // del catálogo
  seleccion: number[];                  // ids marcados
  incluirCredito: boolean;
  onAplicar: (seleccion: number[], incluirCredito: boolean) => void;
}
```

Reglas de comportamiento:
- Checkbox "Todos" (marca/desmarca el grupo). **Guard anti-vacío**: no permitir aplicar con 0
  medios (patrón `next.length === 0 ? prev : next` de FlujoCaja.tsx:827).
- Checkbox separado, visualmente apartado (borde/divider): **"Incluir cobranzas de crédito"**
  con tooltip/nota: "Las cobranzas de ventas a crédito son dinero que SÍ entró a caja; apágalo
  para ver solo cobros de ventas al contado" (D3).
- Botón **"Aplicar"** explícito (NO recargar por cada clic — evita 6 requests por interacción).
- Colapsable (default colapsado mostrando resumen: "Medios: todos · Crédito: sí").
- Etiquetas amigables: mapear "EFECTIVO SOLES"→"Efectivo", resto capitalizado.

### 5.4 Integración en `CajaDiaria.tsx`

- Estado local: `seleccion` (init = todos al cargar catálogo), `incluirCredito` (init true). D4:
  sin persistencia, sin context.
- `filtroActivo = seleccion.length < medios.length || !incluirCredito`.
- Pasar filtros a `cajaDiaria(...)` según convención §5.2. El detalle del día
  (`cajaIngresos`) se filtra **client-side** por `i_IdFormaPago`/`EsCobranzaCredito`
  (las filas ya traen ambos campos) — sin cambio de endpoint.
- Con `filtroActivo`:
  - Card/columna de **saldos** ("Saldo al día", saldo acumulado): `opacity-50` + rótulo
    "Saldos de caja TOTAL — no reflejan el filtro" (D5).
  - Sección **egresos**: rótulo "Egresos totales (sin filtro por medio de pago)" (D2).
  - Banner sutil arriba de la tabla: "Vista filtrada: N de M medios · crédito excluido" (según aplique).

### 5.5 Integración en `FlujoConsolidado.tsx`

- Mismo card y estado local propio (D4). Pasar filtros a `flujoConsolidado(...)`.
- Con `filtroActivo`: fila de saldos/apertura atenuada + mismo rótulo (D5); fila
  "TOTAL EGRESOS OPERATIVOS" con rótulo D2; banner de vista filtrada.
- El select de mes existente es de la acción Cerrar Mes — NO mezclarlo con el filtro.

### 5.6 GATE 3 (front)

| # | Prueba | Esperado |
|---|---|---|
| 3.1 | `npx tsc --noEmit` | 0 errores |
| 3.2 | Carga inicial de ambas pantallas | Cifras IDÉNTICAS a antes del feature (D4); request sin params nuevos |
| 3.3 | Solo Efectivo, jun-2026, Caja Diaria | Ingresos del mes 451,126.49; egresos 61,958.20 con rótulo; saldos atenuados |
| 3.4 | Todos menos Depósito | 599,389.79 |
| 3.5 | Crédito OFF | coincide con GATE 1.6/2.4 |
| 3.6 | Guard anti-vacío | imposible aplicar 0 medios |
| 3.7 | Navegar entre pantallas | cada una arranca con default (sin persistencia, D4) |

---

## 6. Verificación E2E final (la corre el orquestador, no delegar a ciegas)

1. Levantar API (5090) + front (5173).
2. Con token demo: matriz de curls del GATE 2 → evidencia con cifras.
3. En navegador: matriz del GATE 3 en ambas pantallas (jun-2026), captura de la vista
   "solo efectivo" mostrando: ingresos filtrados + egresos rotulados + saldos atenuados.
4. Regresión: `flujo-consolidado` y `diaria` SIN filtros = cifras de siempre; `sp_Caja_CerrarMes`
   NO tocado (verificar `modify_date` sin cambio).
5. Cifra de control cruzado: suma de los 5 medios de jun = 828,700.50 exacto.

## 7. Orden de ejecución, responsables y commit

1. **FASE 1** db-experto (GATE 1) → 2. **FASE 2** backend-api (GATE 2) → 3. **FASE 3**
   bi-frontend (GATE 3) → 4. E2E (orquestador). Las fases 2 y 3 pueden arrancar en paralelo
   una vez fijados los contratos (ya lo están en este documento), pero sus GATEs requieren FASE 1 aplicada.
2. Un solo commit al integrar (orquestador): `feat(conta): filtro por medio de pago y credito en caja diaria y flujo consolidado`
   — incluye `04_caja_motor.sql` + nuevo SP + API + front + este PLAN con sus GATEs marcados.
3. Registrar la ejecución en `LOG_EJECUCION_CONTA.md` (sección nueva) al estilo de las fases previas.

## 8. Qué NO hacer (anti-objetivos, releer antes de codear)

- NO filtrar egresos ni cierres ni indicadores (D2/D6). NO tocar `sp_Caja_Ingresos` ni ningún `sp_Rentabilidad_*`.
- NO cambiar grano/columnas de ningún resultset existente; NO tocar DTOs existentes.
- NO crear índices ni DDL en `dbo`. NO usar `STRING_SPLIT`/`CREATE OR ALTER` (SQL 2012).
- NO enviar arrays en query params (CSV string). NO recargar por cada clic de checkbox (botón Aplicar).
- NO persistir el filtro entre pantallas (D4). NO ocultar saldos (D5: atenuar + rótulo).
- NO agregar "Crédito" como un checkbox más dentro del grupo de medios (D3: control separado).
- NO renegociar las decisiones D1–D6 con el usuario: ya están cerradas.

## 9. Extensiones futuras anotadas (NO implementar ahora)

- Liquidez bancaria: los DEPOSITO traen `cd.i_IdBanco` (grupo 111: BCP/BBVA) → filtro por cuenta destino.
- Convención de egresos por medio (cajamayor→EFECTIVO) si algún día se quiere neto filtrado riguroso.
- Disciplina de captura: exigir `@IdFormaPago` al pagar egresos conta (hoy opcional, SISOL paga NULL).

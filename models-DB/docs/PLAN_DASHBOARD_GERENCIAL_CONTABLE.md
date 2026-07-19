# PLAN EJECUTOR — Página "Dashboard" (Tab Gerencial + Tab Contable)

> Documento maestro para el ejecutor. **Autocontenido**: diseño cerrado tras investigación web
> (29+ fuentes sobre dashboards ejecutivos y contables, incl. contexto Perú/SUNAT) + inventario de
> data verificado contra producción el **2026-07-14** (db-console, SOLO SELECT). El ejecutor
> **no re-investiga, construye**. Si algo del contexto contradice la realidad, PARA y reporta al orquestador.

Fecha de diseño: **2026-07-14** · Investigadores: 2 corrientes web (gerencial 15 fuentes / contable 14+
fuentes) + `legacy-negocio` (inventario y coberturas contra producción, cifras al centavo).

---

## 0. OBJETIVO Y ALCANCE

Nuevo item de sidebar **"Dashboard"** (primero del nav conta) → ruta **`/conta/dashboard`**.
Una página con **2 tabs** que comparten **el mismo card de filtros**:

- **TAB 1 — Dashboard Gerencial** (pregunta: *¿cómo va el negocio?*): 8 KPI cards + 9 charts.
  Nivel CEO: ingresos, margen, mix por unidad, flujo, CxC. Regla de los 5 segundos.
- **TAB 2 — Dashboard Contable** (pregunta: *¿cuadra la plata y qué debo/me deben?*): 8 KPI cards +
  10 charts. Nivel contador: flujo de caja, medios de pago, composición de gastos, CxC/CxP, IGV,
  planilla, SISOL, honorarios, bancos.

**Filtro compartido** (los dos tabs, un solo estado):
1. **Rango de fechas** `desde`/`hasta` (default: mes actual; máx 730 días).
2. **Checkboxes de TIPOS DE CAJA** (= unidades de negocio de `dbo.tipocaja`): todos marcados por
   default; el usuario puede elegir **todos, uno o varios — nunca cero** (el front impide desmarcar el último).

**Todo se resuelve en 2 APIs, cada una con UN stored procedure multi-resultset** (patrón
`sp_Epidemiologia_Dashboard`): `GET /dashboard/gerencial` → `conta.sp_Dashboard_Gerencial` y
`GET /dashboard/contable` → `conta.sp_Dashboard_Contable` (+ un catálogo liviano
`GET /dashboard/tipos-caja`). Nada se calcula en el front salvo el render.

### Decisiones con DEFAULT (FASE 0 las confirma el orquestador con el usuario; el ejecutor construye con el default)

| # | Decisión | Default |
|---|---|---|
| D1 | ¿MTC (tipocaja 4, **0 ventas en 2026**, sin centro de costo) aparece en los checkboxes? | **Sí** (catalog-driven, saldrá en 0; ocultarla sería hardcodear) |
| D2 | Visibilidad de la página | **Todo usuario conta autenticado** (`[Authorize]` sin rol): GERENTE es el target del TAB 1 y es solo-lectura |
| D3 | Ventas a crédito en el facturado | **Siempre incluidas** (sin toggle en v1); la brecha caja/devengado la expone el KPI "% cobranza/facturación" |
| D4 | CxC (por cobrar) | **Histórico completo** (mismo universo que `sp_Caja_Indicadores`, cuadra con las tarjetas de Caja Diaria); el residuo 2018-19 "SIN UNIDAD" (−12,396.20) solo se muestra con TODOS marcado |
| D5 | Margen operativo gerencial | **Devengado con ajuste SISOL** al % clínica **vigente por mes de la venta** (coherente con la pantalla Rentabilidad) |
| D6 | Egresos sin unidad (bucket ADMINISTRACION, centro sin `i_IdTipoCaja`) | Se **incluyen solo cuando TODOS los tipos están marcados**, rotulados "ADMINISTRACION" |
| D7 | Charts cuya fuente está vacía HOY (CxP, planilla, IGV crédito, saldos banco, honorarios) | **Se construyen y se muestran con empty-state elegante** ("se poblará con la carga de X") — el contrato queda listo para cuando entre la data |

---

## 1. INVESTIGACIÓN — SÍNTESIS QUE GOBIERNA EL DISEÑO

(Informe completo con URLs en el APÉNDICE. Aquí lo que se APLICA.)

### 1.1 Principios comunes (consenso de ambas corrientes)

1. **Regla de los 5 segundos**: el usuario sabe si va bien o mal sin scroll ni leyendas. KPI row arriba,
   lo más crítico **arriba-izquierda** (patrón Z de eye-tracking).
2. **Máximo 6-8 KPI cards** en la fila superior y **8-12 widgets por pantalla**; >8 KPIs "crea dashboards
   inutilizables" (Databrain). El detalle vive en drill-down (aquí: las pantallas de módulo ya existentes).
3. **Contexto obligatorio en cada número**: delta vs período anterior equivalente (MoM). "Un número sin
   contexto es inútil" (Improvado). Sin presupuesto cargado, el período anterior ES el contexto (proxy
   oficial recomendado por la literatura cuando no hay budget).
4. **Jerarquía de 3 niveles**: KPIs arriba → tendencias al medio → composición/detalle abajo.
5. **Consistencia**: misma unidad de negocio = mismo color en TODOS los charts de ambos tabs.
6. **Timestamp visible**: "Datos al …" en la cabecera (F9 Finance: "if it's not fresh, it's not useful").
7. **Nunca solo color como señal** (daltonismo): deltas con signo + ícono, no solo rojo/verde.

### 1.2 TAB Gerencial — qué pide la literatura y qué es viable

KPIs elegidos (todos **[VIABLES]** con la data verificada en §2):

| KPI | Fórmula | Respaldo |
|---|---|---|
| Ingresos del período (facturado) + Δ | Σ `ventadetalle.d_Valor` (4 filtros) | Improvado, Klipfolio |
| Cobranza del período (caja real) + Δ | Σ `cobranzadetalle.d_ImporteSoles` | Aimoova (clínicas ES) |
| Margen operativo % + Δ | (Ingresos ajust. SISOL − Egresos devengados) / Ingresos | HFMA (fórmula oficial), FinThrive |
| Flujo neto del período | Cobrado − Egresos pagados | Databrain |
| CxC (por cobrar) | Crédito facturado − cobrado (histórico) | HFMA "AR days", Databox |
| Egresos del período + Δ | 3 fuentes (§5.2) | Improvado ("Operating Expense Ratio") |
| % cobranza/facturación | Cobrado del período ÷ Facturado × 100 | Databox (proxy Net Collection Rate; sano ≥95%) |
| Ticket promedio + Δ | Facturado ÷ nº ventas | insightsoftware ("Average Treatment Charge" adaptado) |

Adaptación healthcare clave: **Payer Mix → Mix por unidad de negocio** (las 6 tipocajas son el
equivalente exacto: cada unidad tiene margen y ciclo de cobro distinto — FinThrive). KPIs healthcare
descartados por no aplicar a clínica de pago directo: Claims Denial Rate, Cost per Discharge, ocupación
de camas (operativo, no financiero). "Posición de caja total" y "Días de caja" quedan para **fase 2**
(dependen de `saldo_caja`/`saldo_banco_mensual`, hoy vacías — §2.5).

### 1.3 TAB Contable — qué pide la literatura y qué es viable

KPIs elegidos: Cobrado, Egresos pagados (desglosado por fuente), Flujo neto, Egreso promedio diario
(proxy de burn rate), CxC, **CxP** (egresos POR_PAGAR — Databrain: "espejo estructural del AR"),
**IGV resultante estimado** (débito estimado − crédito fiscal; contexto Perú F.621 SUNAT: se marca
**ESTIMACIÓN REFERENCIAL**, no liquidación oficial), Planilla del período.

Charts respaldados: **waterfall de caja** ("el caballo de batalla del reporte financiero" — Databrain;
técnica recharts: barra apilada con segmento base transparente — Yellowfin), ingresos vs egresos 13
meses, cobranzas por medio apiladas, composición de gastos en **treemap/pareto** (NUNCA donut con >5
categorías — Eleken), evolución CxC, aging CxP, IGV débito vs crédito, **planilla apilada por concepto**
(hace visibles los picos jul/dic gratificaciones y may/nov CTS — Rextie/BBVA), saldos por banco
(la cuenta de detracciones del Banco de la Nación se rotula aparte: es dinero restringido — PCGE 1042),
mini-tabla top-N (en dashboards contables las tablas SÍ se aceptan — F9 Finance).

### 1.4 Anti-patrones que este diseño respeta

Sin gauges/velocímetros (F9) · sin pie >5-6 slices (Eleken) · sin 3D/bubbles/ejes truncados
(rib-software: baseline SIEMPRE 0 en barras) · sin tablas grandes en el TAB gerencial (Pravux: "eso es
un reporte, no un dashboard") · sin vanity metrics · sin real-time innecesario (caja diario, resto
mensual) · **sin KPI que no cuadre contra producción** (Aimoova: "un KPI mal calculado genera más ruido
que claridad" — por eso los GATEs de §9 cuadran al centavo).

---

## 2. CONTEXTO DE DATA VERIFICADO (producción, 2026-07-14 — NO re-investigar)

### 2.1 El filtro: `dbo.tipocaja` (6 filas, todas `i_Estado=1`) y su mapeo

| id | Unidad | Mapeo `tipocaja_clientetipo` (`i_ClienteEsAgente`→tipocaja, 10 filas `b_Activo=1`) |
|---|---|---|
| 1 | ATENCION_ASISTENCIAL | agentes 2, 8, 9 |
| 2 | ATENCION_OCUPACIONAL | agente 1 |
| 3 | SISOL | agente 10 |
| 4 | MTC | agente 7 — **0 ventas en 2026** (unidad viva en catálogo, muerta operativamente) |
| 5 | SEGUROS | agentes 5, 6 |
| 6 | FARMACIA | agentes 3, 4 |

JOIN canónico (el que usan `fn_Rentabilidad_IngresosDetalleEx` y `sp_Caja_Ingresos` vivas):
`LEFT JOIN dbo.tipocaja_clientetipo tcc ON tcc.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcc.b_Activo = 1`.

### 2.2 Cobertura de la dimensión = 100.00% en 2026 (cero fugas de monto)

- **Facturado 2026** (4 filtros canónicos): 41,158 ventas / S/ 4,196,882.60 — todo mapeado, 0 sin unidad.
- **Cobrado 2026** (universo caja = `cd.i_Eliminado=0 AND v.i_Eliminado=0`, SIN los 4 filtros — así lo
  hace `sp_Caja_Ingresos` productivo y así cuadra el cierre): 45,937 filas / S/ 5,737,943.75 — 100% mapeado.
- ⚠️ **Matiz de tubería**: el facturado (RENTABILIDAD) SÍ lleva los 4 filtros de ventas; el cobrado
  (CAJA) NO los lleva. Es el comportamiento productivo verificado; respetarlo o los GATEs no cuadran.

**Facturado mensual 2026 × unidad** (neto `vd.d_Valor`, con crédito; jul parcial al 14):

| mes | ASIST | OCUP | SISOL | SEGUROS | FARMACIA | TOTAL |
|---|---|---|---|---|---|---|
| ene | 378,056.55 | 114,544.39 | 146,357.20 | 532.44 | 67,160.09 | 706,650.67 |
| feb | 321,470.78 | 194,186.93 | 131,536.66 | 658.58 | 68,031.99 | 715,884.94 |
| mar | 376,109.54 | 157,691.84 | 128,896.37 | 12,360.66 | 72,554.85 | 747,613.26 |
| abr | 264,337.70 | 136,134.53 | 110,323.19 | 505.41 | 56,127.33 | 567,428.16 |
| may | 319,207.73 | 146,660.34 | 114,159.35 | 7,512.50 | 62,411.34 | 649,951.26 |
| jun | 278,397.77 | 168,065.60 | 109,503.94 | 3,478.98 | 61,734.13 | **621,180.42** |
| jul* | 104,475.76 | 11,191.84 | 46,889.79 | 164.05 | 25,452.45 | 188,173.89 |

Cuadre patrón: jun 621,180.42 − 0.70×109,503.94 = **544,527.66** = Rentabilidad jun @30% clínica ✓.

**Cobrado mensual 2026 × unidad** (`cd.d_ImporteSoles` por `cd.t_InsertaFecha`):

| mes | ASIST | OCUP | SISOL | SEGUROS | FARMACIA | TOTAL |
|---|---|---|---|---|---|---|
| jun | 385,273.07 | 207,051.83 | 129,218.50 | 205.30 | 106,951.80 | **828,700.50** ✓ (=cierre verificado) |
| jul* | 137,853.18 | 46,157.44 | 55,331.50 | 17,564.57 | 41,142.70 | 298,049.39 |

(ene–may en el informe del inventario; el GATE usa jun.)

**Forma de pago × unidad disponible con calidad perfecta** (2026: 0 NULL, 0 huérfanos). Perfil:
OCUPACIONAL cobra ~85% por DEPOSITO (empresas); ASIST/SISOL/FARMACIA son efectivo-dominantes.
Catálogo vivo grupo 46: EFECTIVO SOLES, VISA, DEPOSITO, YAPE, PLIN.

### 2.3 Egresos — HOY solo hay data legacy (tipocajas 1 y 6)

Fuente legacy = `dbo.cajamayor_movimiento` `v_TipoMovimiento='E'` (fecha `t_FechaMovimiento`, neto
`COALESCE(NULLIF(d_Subtotal,0), d_Total)`, **trae `i_IdTipoCaja` propio**): ene 97,625.30 · feb 81,147.00 ·
mar 100,674.10 · abr 66,964.40 · may 64,912.90 · **jun 61,958.20** · jul* 15,571.40 (149 ECA + 1 ECF,
vía recon). En 2026 solo existen series ECA (→tipocaja 1) y ECF (→tipocaja 6); ECO/ECT/ECG/ECR = 0 filas.
`i_IdFormaPago` NULL (efectivo por naturaleza). Uso MIXTO (médicos + gastos varios), sin anti-duplicado
con conta (decisión usuario 2026-07-13).

Atribución egreso conta→unidad: `conta.centro_costo.i_IdTipoCaja` con walk recursivo al padre
(hoy jerarquía plana, 6 centros: CC-ASIS→1, CC-OCUP→2, CC-FARM→6, CC-SEG→5, CC-SISOL→3, ADM→NULL).
⚠️ **No existe centro para MTC** — un egreso jamás podrá atribuirse a MTC hoy.

### 2.4 CxC por unidad — viable y verificado (corte < 2026-08-01, histórico completo)

| Unidad | CreditoFacturado | CreditoCobrado | **PorCobrar** |
|---|---|---|---|
| OCUPACIONAL | 10,680,085.74 | 10,463,217.97 | **216,867.77** (~82%) |
| SEGUROS | 500,413.61 | 440,485.54 | 59,928.07 |
| ASISTENCIAL | 86,403.26 | 85,568.45 | 834.81 |
| FARMACIA | 6,216.08 | 6,216.08 | 0.00 |
| SIN_UNIDAD (residuo 2018-19) | 3,748.59 | 16,144.79 | **−12,396.20** |
| **TOTAL** | 11,276,867.28 | 11,011,632.83 | **265,234.45** |

Crédito = **condición de venta `v.i_IdCondicionPago = 2`** (grupo 41; catálogo vivo: 1 CONTADO, 2 CREDITO,
5 DEPOSITO — DEPOSITO NO es crédito). Facturado crédito = `vd.d_PrecioVenta` (**bruto**, así lo hace
`sp_Caja_Indicadores`); cobrado = `cd.d_ImporteSoles` de esas ventas. El residuo negativo existe porque
`sp_Caja_Indicadores` exige `i_ClienteEsAgente IS NOT NULL` en el facturado pero no en el cobrado —
**replicar la misma asimetría** para que Σ unidades + residuo = `sp_Caja_Indicadores.PorCobrar` exacto.
1 venta = 0..1 cobranza por el total (cardinalidad 2026 verificada) → cálculo estable por unidad.

### 2.5 Tablas conta con 0 filas HOY (los charts D7 nacen vacíos, el contrato queda listo)

| Tabla | Filas | Implicancia |
|---|---|---|
| `conta.egreso` | **0** (limpieza PH-6 + reseed) | CxP, aging, composición gastos conta: vacíos hasta carga histórica |
| `conta.costo_personal_mensual` | **0** ⚠️ nombre real (NO `costo_personal`) | Planilla: vacía; granularidad (n_Anio, n_Mes, centro, concepto) = **solo MES** |
| `conta.saldo_banco_mensual` | **0** ⚠️ nombre real (NO `saldo_banco`) | Saldos por banco: vacíos; las 6 cuentas reales salen de `dbo.documento` (`sp_CuentaBancaria_List`) |
| `conta.saldo_caja` | **0** (a propósito; apertura la fija el usuario) | "Posición de caja"/"Días de caja" → fase 2 |
| `dbo.registro_compras` | **0** ⚠️ (estructura rica: `fecha_emision` date, proveedor, `base_imponible`/`igv`/`importe_total`, detracción) | IGV crédito fiscal: nace 0; fuente FUTURA |
| `conta.compra_ext` | 0 | consistente con lo anterior |
| `conta.pago_honorario*` | 0/0/0 (1er pago real será PH-1) | Honorarios por consultorio: nace vacío |
| `conta.sisol_liquidacion` | **2** (jun @70% CALCULADO ⚠️ foto vieja pendiente recalc; jul @30% CALCULADO) | RS SISOL viable ya |

⚠️ Trampa conocida: `dbo.cajamayor_cierre.n_Anio/n_Mes` son **NCHAR con padding inconsistente**
('1 ', '05', '7 ') — jamás agrupar por ellas; usar `t_FechaInicio`/`t_FechaFin` o los movimientos.

### 2.6 Granularidad temporal por fuente (campos de fecha EXACTOS)

| Fuente | Campo | Grano |
|---|---|---|
| `dbo.venta` (facturado) | `t_InsertaFecha` datetime | día |
| `dbo.cobranzadetalle` (cobrado) | `t_InsertaFecha` datetime | día |
| `dbo.cajamayor_movimiento` (egreso legacy) | `t_FechaMovimiento` datetime | día |
| `conta.egreso` | `t_FechaPago` (caja) / `t_FechaDocumento` (devengado), ambos date | día |
| `conta.costo_personal_mensual`, `saldo_banco_mensual`, `sisol_liquidacion` | `n_Anio`/`n_Mes` | **MES** (en series diarias se excluyen; en mensuales se asignan al mes) |
| `dbo.registro_compras` | `fecha_emision` date | día (tabla vacía hoy) |

---

## 3. REGLAS INVIOLABLES (todas las fases)

1. **`dbo`: SOLO SELECT** (ALTER/DROP/CREATE INDEX prohibidos). Objetos nuevos = schema `conta`.
2. **SQL Server 2012**: sin `CREATE OR ALTER`, sin `STRING_SPLIT` (usar CSV+LIKE), sin `STRING_AGG`
   (STUFF+FOR XML), sin `TRIM`, sin `DROP IF EXISTS`. SÍ existen: `EOMONTH`, `DATEFROMPARTS`, ventanas,
   `OFFSET/FETCH`, `TRY_CONVERT`. Ver `.claude/memory/reglas-sql2012.md`.
3. **Rango medio-abierto SIEMPRE**: `fecha >= @Desde AND fecha < DATEADD(DAY, 1, @Hasta)`.
4. **Filtro multi-tipocaja = patrón CSV+LIKE** (el axios del front no serializa arrays a .NET):
   `(@TiposCaja IS NULL OR ',' + @TiposCaja + ',' LIKE '%,' + CONVERT(varchar(10), <IdTipoCaja>) + ',%')`.
5. Los SPs de dashboard son **multi-resultset** (Dapper `QueryMultiple`; JAMÁS consumirlos con `INSERT..EXEC` —
   concatena los RS). Materializar la base UNA vez en `#temp` y derivar los RS de ahí (patrón `sp_Epi_Dashboard`).
6. Los dos SPs son de **solo lectura** (no escriben nada; no requieren limpieza). `SET NOCOUNT ON`.
7. Las cifras de los GATEs (§9) son de producción al 2026-07-14 con **julio parcial**: los GATEs se corren
   sobre **jun-2026** (mes cerrado estable).
8. Sin despliegue a IIS sin instrucción explícita del usuario.
9. Los SPs vivos pueden divergir del repo: **portar lógica desde `sys.sql_modules`**, no del .sql
   (hecho de oro #3). Referencias vivas a portar: `sp_Caja_Ingresos` (universo cobrado),
   `fn_Rentabilidad_IngresosDetalleEx` (JOIN tipocaja + % SISOL), `fn_Rentabilidad_Gastos` (3 fuentes de
   egreso + walk de centros), `sp_Caja_Indicadores` (CxC/CxP).

---

## 4. ARQUITECTURA OBJETIVO

```
/conta/dashboard  (página React "Dashboard")
├── FiltroDashboardCard        (estado elevado a la página, compartido por ambos tabs)
│     desde · hasta · checkboxes tipocaja (6, todos ON, mínimo 1)
├── TAB 1  Dashboard Gerencial
│     8 KPI cards + 9 charts   ← GET /api/conta/dashboard/gerencial
└── TAB 2  Dashboard Contable
      8 KPI cards + 10 charts  ← GET /api/conta/dashboard/contable

API .NET conta
├── DashboardController   (rutas api/conta/dashboard, [Authorize])
└── DashboardRepository   (Dapper QueryMultiple)

BD conta (SELECT a dbo + conta; CERO DDL de tablas — no hay tablas nuevas)
├── conta.fn_Dash_VentaBase      (iTVF: facturado línea a línea + tipocaja)      ← fn/14
├── conta.fn_Dash_CobranzaBase   (iTVF: cobrado línea a línea + tipocaja+forma)  ← fn/14
├── conta.fn_Dash_EgresoBase     (iTVF: egresos 3 fuentes + tipocaja)            ← fn/14
├── conta.sp_Dashboard_TiposCaja (catálogo checkboxes)                           ← sp/16
├── conta.sp_Dashboard_Gerencial (multi-RS, TAB 1)                               ← sp/16
└── conta.sp_Dashboard_Contable  (multi-RS, TAB 2)                               ← sp/16
```

Archivos: `models-DB/script-conta/fn/14_dashboard_base.sql` (3 iTVFs) y
`models-DB/script-conta/sp/16_dashboard.sql` (3 SPs, idempotentes DROP/GO/CREATE).

---

## 5. CAPA BD — CONTRATOS EXACTOS

### 5.1 Parámetros comunes de los 2 SPs grandes

```
@Desde date, @Hasta date,
@TiposCaja nvarchar(50) = NULL   -- CSV de ids '1,2,6'; NULL o los 6 = TODOS
```
Validar en SP: `@Desde <= @Hasta`, rango ≤ 730 días (RAISERROR si excede).
**Período anterior** (para los deltas Δ de los KPIs): mismo largo, inmediatamente anterior:
`@PrevHasta = DATEADD(DAY, -1, @Desde)` · `@PrevDesde = DATEADD(DAY, -DATEDIFF(DAY, @Desde, DATEADD(DAY, 1, @Hasta)), @Desde)`.
**Ventana de contexto mensual**: 13 meses terminando en el mes de `@Hasta`
(`@MesCtxDesde = DATEADD(MONTH, -12, DATEFROMPARTS(YEAR(@Hasta), MONTH(@Hasta), 1))`) — las series
mensuales usan esta ventana fija (contexto), NO el rango del filtro; los KPIs y charts "del período"
usan el rango. Ambos respetan `@TiposCaja`.

### 5.2 Las 3 iTVF base (keystones — fn/14_dashboard_base.sql)

**`conta.fn_Dash_VentaBase(@Desde date, @Hasta date, @TiposCaja nvarchar(50))`** — 1 fila por línea
`ventadetalle`. Universo RENTABILIDAD: los **4 filtros canónicos** de ventas + `vd.i_Eliminado = 0` +
rango medio-abierto sobre `v.t_InsertaFecha`. LEFT JOIN `tipocaja_clientetipo` (b_Activo=1) + LEFT
`tipocaja`; `IdTipoCaja = ISNULL(tcc.i_IdTipoCaja, 0)`, `Unidad = ISNULL(tc.v_NombreTipoCaja, '(SIN UNIDAD)')`.
Filtro CSV sobre `IdTipoCaja` (regla §3.4; con `@TiposCaja` no-NULL el bucket 0 queda excluido — D6).
Columnas: `Fecha (v.t_InsertaFecha), IdVenta, IdTipoCaja, Unidad, ValorNeto (vd.d_Valor),
PrecioBruto (vd.d_PrecioVenta), EsCredito (CASE v.i_IdCondicionPago WHEN 2 THEN 1 ELSE 0 END)`.

**`conta.fn_Dash_CobranzaBase(@Desde date, @Hasta date, @TiposCaja nvarchar(50))`** — 1 fila por
`cobranzadetalle`. Universo CAJA (portar de `sp_Caja_Ingresos` VIVO): `cd.i_Eliminado = 0` + INNER JOIN
`venta v` con `v.i_Eliminado = 0` (SIN los 4 filtros) + rango sobre `cd.t_InsertaFecha`. Misma atribución
tipocaja vía la venta. Columnas: `Fecha (cd.t_InsertaFecha), IdTipoCaja, Unidad,
Importe (cd.d_ImporteSoles), IdFormaPago (cd.i_IdFormaPago), FormaPago (dbo.datahierarchy grupo 46),
EsCobranzaCredito (venta condición 2)`.

**`conta.fn_Dash_EgresoBase(@Desde date, @Hasta date, @TiposCaja nvarchar(50), @Base char(1))`** —
`@Base = 'C'` (caja, fecha de pago) o `'D'` (devengado, fecha documento). UNION ALL de 3 fuentes
(mismas de `fn_Rentabilidad_Gastos`/`sp_Caja_Egresos` vivos — portar de `sys.sql_modules`):

| Fuente | Filtro | Fecha usada | IdTipoCaja | Categoria | EsMensual |
|---|---|---|---|---|---|
| `LEGACY` | `cajamayor_movimiento.v_TipoMovimiento='E'` | `t_FechaMovimiento` (ambas bases) | `m.i_IdTipoCaja` | 'EGRESO CAJA ' + unidad | 0 |
| `CONTA` | `conta.egreso` — base C: `v_Estado='PAGADO'`; base D: `v_Estado <> 'ANULADO'` | C:`t_FechaPago` / D:`t_FechaDocumento` | walk `centro_costo` → `MAX(i_IdTipoCaja)` (patrón `mapc`); NULL→0 | `tipo_gasto` (sección padre `v_Nombre`) | 0 |
| `PLANILLA` | `conta.costo_personal_mensual` — meses cuyo `DATEFROMPARTS(n_Anio,n_Mes,1)` ∈ rango | día 1 del mes | walk del centro; NULL→0 | 'PLANILLA — ' + concepto | **1** |

Monto: LEGACY neto `COALESCE(NULLIF(d_Subtotal,0), d_Total)`; CONTA `d_MontoTotal` (o la columna de
monto del egreso — verificar contra el DDL vivo); PLANILLA el monto del concepto.
Columnas: `Fecha, IdTipoCaja, Unidad, Monto, Fuente ('LEGACY'|'CONTA'|'PLANILLA'), Categoria, EsMensual`.
Anti-doble-conteo SISOL: excluir de CONTA los egresos Hospital (`NOT EXISTS` contra
`sisol_liquidacion.i_IdEgresoHospital`) **solo en base D** (regla vigente de rentabilidad).
Recordar D6: bucket 0 (ADMINISTRACION) pasa el filtro CSV solo cuando `@TiposCaja IS NULL`.
Nota series diarias: **excluir `EsMensual=1`** (un pico artificial el día 1 rompe la lectura).

### 5.3 `conta.sp_Dashboard_TiposCaja` (sin parámetros)

`SELECT i_IdTipoCaja, v_NombreTipoCaja FROM dbo.tipocaja WHERE i_Estado = 1 ORDER BY i_IdTipoCaja;`
(1 RS, 6 filas. Alimenta los checkboxes — catalog-driven, D1.)

### 5.4 `conta.sp_Dashboard_Gerencial(@Desde, @Hasta, @TiposCaja)` — TAB 1 (multi-RS)

Materializa `#venta`, `#cobranza`, `#egresoC` (base C), `#egresoD` (base D) desde las iTVF
(rango y ventana 13m según RS) y deriva. **Orden y forma EXACTOS** (el front lee por posición):

| RS | Nombre | Columnas | Nota |
|---|---|---|---|
| RS0 | KPIs | `VentaNeta, VentaNetaPrev, NumVentas, TicketPromedio, TicketPromedioPrev, Cobrado, CobradoPrev, Egresos, EgresosPrev, FlujoNeto, IngresosDevAjust, MargenOperativoPct, MargenOperativoPctPrev, PorCobrar, RatioCobranzaPct` | 1 fila. Fórmulas en §5.6. `*Prev` = período anterior (§5.1) |
| RS1 | Tendencia mensual 13m | `Anio, Mes, VentaNeta, Cobrado, Egresos, ResultadoDev, MargenPct` | ventana 13m; egresos base D para ResultadoDev y base C para `Egresos` |
| RS2 | Serie diaria del rango | `Fecha, VentaNeta, Cobrado, Egresos` | egresos base C **sin** EsMensual=1 |
| RS3 | Mix por unidad (rango) | `IdTipoCaja, Unidad, VentaNeta, Cobrado, Egresos, Resultado, PctVenta` | Resultado = ingresos dev. ajust. − egresos D de la unidad |
| RS4 | Mix mensual × unidad 13m | `Anio, Mes, IdTipoCaja, Unidad, VentaNeta` | barras apiladas |
| RS5 | Medios de pago (rango) | `IdFormaPago, FormaPago, Monto, Pct` | sobre #cobranza |
| RS6 | Waterfall del rango | `Orden, Concepto, Monto, Tipo` | filas: 1 'Cobranzas' ENTRADA · 2 'Egresos caja legacy' SALIDA · 3 'Egresos conta pagados' SALIDA · 4 'Planilla' SALIDA · 5 'Flujo neto' NETO |
| RS7 | Top categorías de egreso (rango) | `Categoria, Fuente, Monto, Pct` | top 10 por Monto, base C |
| RS8 | CxC por unidad | `IdTipoCaja, Unidad, CreditoFacturado, CreditoCobrado, PorCobrar` | corte `< DATEADD(DAY,1,@Hasta)`, histórico (D4); fila SIN_UNIDAD solo con TODOS |
| RS9 | Heatmap cobranza | `DiaSemana (1=lun..7=dom), Etiqueta, NumSemana, FechaInicioSemana, Cobrado` | rango; semanas secuenciales del rango |

### 5.5 `conta.sp_Dashboard_Contable(@Desde, @Hasta, @TiposCaja)` — TAB 2 (multi-RS)

| RS | Nombre | Columnas | Nota |
|---|---|---|---|
| RS0 | KPIs | `Cobrado, CobradoPrev, Egresos, EgresosPrev, EgresosLegacy, EgresosConta, Planilla, FlujoNeto, FlujoNetoPrev, EgresoPromedioDiario, PorCobrar, PorPagar, IGVDebitoEstimado, IGVCreditoFiscal, IGVResultanteEstimado` | 1 fila. `PorPagar` = egresos POR_PAGAR con `t_FechaDocumento <= @Hasta` (patrón `sp_Caja_Indicadores`) |
| RS1 | Ingresos vs egresos mensual 13m | `Anio, Mes, Cobrado, Egresos, FlujoNeto` | base C |
| RS2 | Cobranzas × medio × mes 13m | `Anio, Mes, IdFormaPago, FormaPago, Monto` | apiladas |
| RS3 | Composición de gastos (rango) | `Fuente, Categoria, Monto, Pct` | treemap/pareto; base C |
| RS4 | Evolución CxC mensual 13m | `Anio, Mes, CreditoFacturadoMes, CreditoCobradoMes, SaldoAcumulado` | SaldoAcumulado = PorCobrar al cierre de cada mes (histórico D4) |
| RS5 | CxC por unidad | = RS8 gerencial (mismo contrato) | |
| RS6 | CxP aging (al corte @Hasta) | `Categoria, Bucket ('0-30','31-60','61-90','90+'), Monto, NumDocs` | `DATEDIFF(DAY, t_FechaDocumento, @Hasta)`; **nace vacío** (D7) |
| RS7 | IGV mensual 13m | `Anio, Mes, IGVDebitoEstimado, IGVCreditoFiscal, IGVResultante` | débito = Σ(PrecioBruto−ValorNeto) de #venta del mes (ESTIMACIÓN); crédito = Σ `registro_compras.igv` por `fecha_emision` (**hoy 0**) |
| RS8 | Planilla × concepto × mes 13m | `Anio, Mes, Concepto, Monto` | **nace vacío**; al poblarse evidencia picos jul/dic (grati) y may/nov (CTS) |
| RS9 | Saldos bancarios | `IdCuenta, Banco, Cuenta, Moneda, EsDetraccion, Saldo, AnioMesRef` | 6 cuentas de `dbo.documento` (lógica `sp_CuentaBancaria_List`) LEFT JOIN último `saldo_banco_mensual` ≤ mes de @Hasta; **Saldo NULL hoy**. `EsDetraccion=1` para Banco de la Nación (rotular: fondo restringido) |
| RS10 | Honorarios × consultorio (rango) | `Consultorio, Monto, NumPagos` | `pago_honorario_consultorio` (b_Anulado=0) por fecha de pago; **nace vacío hasta PH-1** |
| RS11 | SISOL liquidaciones (meses del rango) | `Anio, Mes, VentaNeta, PctClinica, MontoClinica, MontoHospital, Estado` | de `sisol_liquidacion`; **mostrar solo si tipocaja 3 está marcada**; ⚠️ jun sigue @70 (foto vieja, recalc pendiente) |

⚠️ Dimensión tipocaja en el TAB contable — qué filtra y qué se rotula (patrón del filtro de medios:
lo no-filtrable se **rotula**, no se oculta): RS0-RS5 y RS10 SÍ filtran; RS7 crédito fiscal, RS8 (si el
centro no tiene unidad) y RS9 **no tienen la dimensión** → mostrar con rótulo "no filtra por tipo de caja".

### 5.6 Definiciones de cálculo (idénticas donde se repiten — una sola verdad)

- **VentaNeta** = Σ `ValorNeto` de `fn_Dash_VentaBase` del rango. **Cobrado** = Σ `Importe` de CobranzaBase.
- **Egresos (caja)** = Σ `Monto` EgresoBase base C. **FlujoNeto** = Cobrado − Egresos(C).
- **IngresosDevAjust (D5)** = VentaNeta − Σ_SISOL ValorNeto × (1 − PctClinica(mes)/100), donde
  PctClinica(mes) = `sisol_participacion` vigente al día 1 del mes de la venta (TOP 1
  `t_VigenciaDesde <= día1` ORDER BY `t_VigenciaDesde` DESC — patrón `fn_Rentabilidad_IngresosEx` viva).
  Si tipocaja 3 no está en el filtro, el término SISOL es 0 (no hay nada que ajustar).
- **MargenOperativoPct** = (IngresosDevAjust − Egresos(D)) × 100.0 / NULLIF(IngresosDevAjust, 0).
- **TicketPromedio** = VentaNeta / NULLIF(NumVentas, 0) — NumVentas = `COUNT(DISTINCT IdVenta)`.
- **RatioCobranzaPct** = Cobrado × 100.0 / NULLIF(VentaNeta, 0). (Compara tuberías distintas a
  propósito — ES el KPI que expone el gap efectivo/devengado. Puede superar 100% en meses que cobran
  crédito viejo; es correcto, documentado en tooltip.)
- **PorCobrar (D4)** = Σ(facturado crédito bruto `d_PrecioVenta`, 4 filtros, histórico hasta corte)
  − Σ(cobrado de esas ventas hasta corte), por unidad, replicando la asimetría de `sp_Caja_Indicadores`
  (§2.4). GATE: con TODOS y corte fin de mes, Σ = `sp_Caja_Indicadores(anio, mes).PorCobrar`.
- **EgresoPromedioDiario** = Egresos(C) / NULLIF(DATEDIFF(DAY, @Desde, DATEADD(DAY,1,@Hasta)), 0).
- **IGVDebitoEstimado** = Σ(PrecioBruto − ValorNeto) del rango — proxy (bruto−neto); rotular SIEMPRE
  "estimación referencial, no liquidación F.621".

---

## 6. CATÁLOGO DE CHARTS

Diseño visual: paleta del proyecto, dark-aware, cards con título+subtítulo, skeletons, empty-state
elegante (D7 con nota "se poblará con …"). **Color fijo por unidad en TODOS los charts de ambos tabs**:
ASISTENCIAL sky · OCUPACIONAL violet · SISOL amber · MTC slate · SEGUROS rose · FARMACIA emerald.
Deltas: flecha+signo+% (nunca solo color). Baseline 0 en toda barra. Timestamp "Datos al {hasta}".

### TAB 1 — Gerencial (fila de 8 KPI cards del RS0 + 9 charts)

| # | Chart | RS | Viz recharts | Pregunta que responde | Respaldo |
|---|---|---|---|---|---|
| G1 | Tendencia de ingresos y cobranza (13m) | RS1 | LineChart 2 series (VentaNeta, Cobrado) | ¿Cómo va la facturación vs lo que entra? | "line charts para revenue trend" (rib-software) |
| G2 | Ingresos vs egresos + margen % (13m) | RS1 | ComposedChart: barras (ing, egr) + línea margen (eje 2º) | ¿Somos rentables y por qué? | patrón P&L datapine |
| G3 | Actividad diaria del rango | RS2 | AreaChart (VentaNeta, Cobrado) + barras egresos | ¿Pulso diario del período? | Improvado (pulso diario de caja) |
| G4 | Mix por unidad (foto del rango) | RS3 | Donut 6 slices + tabla mini al lado (Venta/Cobrado/Resultado) | ¿Qué unidad sostiene el negocio? | Payer Mix adaptado (FinThrive) |
| G5 | Evolución del mix (13m) | RS4 | BarChart apilado por unidad | ¿El mix cambia en el tiempo? | "stacked bars = composición en el tiempo" |
| G6 | Waterfall del flujo del período | RS6 | BarChart apilado con base transparente | ¿Cómo se formó el flujo neto? | Yellowfin/Domo waterfall |
| G7 | Medios de pago (rango) | RS5 | Donut 5 slices | ¿Cómo nos pagan? | 5 slices = límite aceptable |
| G8 | CxC por unidad + top egresos | RS8 + RS7 | 2 medios: barras horizontales CxC · barras horizontales top-10 egresos | ¿Quién nos debe? ¿En qué se va la plata? | HFMA AR / Pareto de gasto |
| G9 | Heatmap de cobranza (día×semana) | RS9 | grid propio (celdas con intensidad) | ¿Qué días entran más? | Improvado heatmaps (opcional) |

### TAB 2 — Contable (fila de 8 KPI cards del RS0 + 10 charts)

| # | Chart | RS | Viz | Estado hoy | Respaldo |
|---|---|---|---|---|---|
| C1 | Ingresos vs egresos mensual + neto (13m) | RS1 | ComposedChart barras+línea | ✅ con data | Databrain "13 períodos" |
| C2 | Cobranzas por medio × mes (13m) | RS2 | BarChart apilado 5 medios | ✅ | composición en el tiempo (Eleken) |
| C3 | Composición de gastos (rango) | RS3 | **Treemap** (recharts) con fallback Pareto barras+línea% | ⚠️ solo LEGACY hoy | Eleken anti-donut |
| C4 | Evolución CxC (13m) | RS4 | ComposedChart: barras facturado/cobrado crédito + línea saldo | ✅ | Databox aging trend |
| C5 | CxC por unidad | RS5 | Barras horizontales | ✅ (82% OCUP) | HFMA |
| C6 | CxP aging | RS6 | BarChart apilado por bucket | 🕳️ nace vacío (D7) | Databrain "AP espejo del AR" |
| C7 | IGV débito vs crédito (13m) | RS7 | Barras agrupadas + línea resultante | ⚠️ crédito=0 hoy; rotular ESTIMACIÓN | SUNAT F.621 |
| C8 | Planilla por concepto (13m) | RS8 | BarChart apilado por concepto | 🕳️ nace vacío; picos jul/dic/may/nov | Rextie/BBVA CTS-grati |
| C9 | Saldos bancarios | RS9 | Tiles/barras por cuenta; detracción rotulada "fondo restringido" | 🕳️ nace vacío | Xero bank balances, PCGE 1042 |
| C10 | Honorarios × consultorio + SISOL | RS10 + RS11 | barras horizontales · mini-tabla SISOL (VentaNeta/%/Clínica/Hospital/Estado) | 🕳️ hon. vacío · ✅ SISOL 2 filas | mini-tablas top-N OK en contable (F9) |

Layout (ambos tabs): KPI row sticky arriba → tendencias (ancho completo o 2 col) → composición →
detalle. Mobile: solo KPI row + primer chart. Máx 2 col en desktop.

---

## 7. CAPA API (.NET conta)

Nuevo `DashboardController` + `DashboardRepository` (Dapper). DTOs en `Models/Dtos.cs` (PascalCase =
columnas del SP, JSON sin camelCase — convención del proyecto).

| Método | Ruta | Auth | Contrato |
|---|---|---|---|
| GET | `/api/conta/dashboard/tipos-caja` | `[Authorize]` | → `[{ i_IdTipoCaja, v_NombreTipoCaja }]` |
| GET | `/api/conta/dashboard/gerencial` | `[Authorize]` (D2) | query: `desde, hasta, tiposCaja` (CSV opcional) → `{ Kpis, TendenciaMensual[], SerieDiaria[], MixUnidad[], MixMensual[], MediosPago[], Waterfall[], TopEgresos[], CxcUnidad[], HeatmapCobranza[] }` |
| GET | `/api/conta/dashboard/contable` | `[Authorize]` (D2) | query: idem → `{ Kpis, IngresosVsEgresos[], CobranzasMedioMes[], ComposicionGastos[], EvolucionCxc[], CxcUnidad[], CxpAging[], IgvMensual[], PlanillaMes[], SaldosBancarios[], HonorariosConsultorio[], SisolLiquidaciones[] }` |

- Validación en controller: `desde <= hasta`, rango ≤ 730 días (400 con mensaje), `tiposCaja` solo
  dígitos y comas (regex `^[0-9,]+$`) o ausente.
- `QueryMultiple` mapeando los RS **por posición** (orden de §5.4/§5.5). `commandTimeout: 60`.
- Middleware global ya traduce RAISERROR → 400 `{message}` (no duplicar try/catch).

## 8. CAPA FRONT (react-project)

- **Nav + ruta**: `ContaLayout.tsx` navItems → `{ to: '/conta/dashboard', label: 'Dashboard', icon: LayoutDashboard }`
  **primero de la lista** (verificar que `LayoutDashboard` exista en lucide-react ANTES de importar —
  regla del proyecto; alternativa segura: `Gauge` NO, usar `PanelsTopLeft` o `BarChart3` verificados).
  Registrar ruta en `App.tsx` bloque `/conta`.
- **`pages/Contabilidad/Dashboard.tsx`**: tabs (patrón `Epidemiologia.tsx`) + filtro con estado elevado.
  Cada tab hace SU fetch al cambiar filtro (lazy: el tab no visible no fetchea hasta abrirse; cache por
  clave `desde|hasta|tiposCaja` para no re-pedir al alternar tabs).
- **`components/dashboard/FiltroDashboardCard.tsx`**: desde/hasta (default mes actual) + 6 checkboxes
  desde `/dashboard/tipos-caja` (catalog-driven, D1), todos ON; impedir desmarcar el último (tooltip
  "elige al menos un tipo de caja"); chips de resumen ("6/6 tipos").
- **`components/dashboard/DashboardGerencialTab.tsx`** y **`DashboardContableTab.tsx`**: KPI cards
  (patrón `Card {title, value, icon, tone}` — si se agrega un tone nuevo, agregarlo al `toneMap`) +
  charts recharts. Componentes de chart pequeños y propios (`WaterfallCaja.tsx`, `HeatmapCobranza.tsx`
  como grid CSS). Empty-state D7 reutilizable con la nota de qué carga lo poblará.
- **Servicios**: `ContabilidadService.ts` → `dashTiposCaja()`, `dashGerencial(params)`,
  `dashContable(params)`; `tiposCaja` viaja como **CSV string** (regla del proyecto: sin paramsSerializer).
  Tipos en `contaTypes.ts` calcando los DTOs.
- Moneda `es-PE` con prefijo `S/`; **verificar con `npx vite build`** (NO `check-types` — CobranzaDashboard.tsx
  es código muerto que rompe tsc); **NO montar `<Toaster>`** (hay uno global).

---

## 9. FASES Y GATEs

### FASE 0 — Confirmación (orquestador)
Confirmar D1–D7 con el usuario (o aceptar defaults). **GATE-0**: decisiones cerradas.

### FASE 1 — BD (`db-experto`) — fn/14 + sp/16
1. `fn_Dash_VentaBase` + `fn_Dash_CobranzaBase` + `fn_Dash_EgresoBase`.
   **GATE-1.1** (jun-2026, TODOS): Σ VentaBase = **621,180.42**; Σ CobranzaBase = **828,700.50**;
   Σ EgresoBase(C) = **61,958.20**. Por unidad: cuadre EXACTO con las tablas de §2.2 (p.ej. SISOL venta
   109,503.94 · ASIST cobrado 385,273.07 · OCUP venta 168,065.60).
   **GATE-1.2** (filtro CSV): `@TiposCaja='3'` jun → venta 109,503.94; `'1,6'` jun → egresos 61,958.20
   (60,038.20 + 1,920.00); `'2'` → egresos 0.00.
2. `sp_Dashboard_TiposCaja`. **GATE-1.3**: 6 filas ordenadas.
3. `sp_Dashboard_Gerencial`. **GATE-1.4** (jun-2026, TODOS): RS0 cuadra GATE-1.1 + MargenOperativoPct
   coherente con Rentabilidad jun (@30% clínica: ingresos dev ajust 544,527.66); RS5 distribución ≈
   efectivo 54.4% / depósito 27.7% / visa 17.8% (memoria verificada); RS8 Σ PorCobrar =
   `sp_Caja_Indicadores(2026, 6).PorCobrar` al corte 2026-06-30 y OCUP dominante (~82% al corte jul);
   RS6 suma algebraica = FlujoNeto de RS0. Perf < 5s.
4. `sp_Dashboard_Contable`. **GATE-1.5** (jun-2026, TODOS): RS0.Cobrado/Egresos = GATE-1.1;
   RS7 crédito fiscal = 0 (registro_compras vacía) y débito > 0; RS9 = 6 cuentas con Saldo NULL;
   RS10 = 0 filas; RS11 jun = VentaNeta 109,503.94 / %70 / Clínica 76,652.76 (⚠️ foto vieja, es lo
   esperado hasta el recalc); RS6/RS8 vacíos sin error. Perf < 5s.
> Versionar en `models-DB/script-conta/fn/14_dashboard_base.sql` y `sp/16_dashboard.sql`. Solo lectura:
> sin residuo, sin RESEED.

### FASE 2 — API (`backend-api`)
Controller + Repository + DTOs + validaciones. **GATE-2**: build OK; los 3 endpoints responden 200 con
token (cualquier rol, D2); 400 con rango inválido o CSV malformado; el JSON del gerencial trae los 10
bloques y el contable los 12, mapeados por posición.

### FASE 3 — Front (`bi-frontend`)
Nav + ruta + página + filtro + 2 tabs completos. **GATE-3**: `npx vite build` OK; checkboxes
catalog-driven con mínimo 1; los 9 + 10 charts renderizan con jun-2026; empty-states D7 visibles con
su nota; colores por unidad consistentes entre tabs; deltas con flecha+signo.

### FASE 4 — Integración y verificación visual (orquestador + usuario)
Stack arriba, revisar tab por tab, chart por chart contra las cifras de §2. **GATE-4**: visto bueno del
usuario. Commits temáticos `feat(conta): dashboard gerencial/contable …` + cierre `continual-learning`.

## 10. PROTOCOLOS DE PRUEBA (evidencia mínima)

- **T-1 (cuadre maestro)**: jun-2026 TODOS → los 4 números de GATE-1.1 al centavo.
- **T-2 (filtro)**: los 3 casos de GATE-1.2 + un combo doble (`'1,3'`) = suma de los individuales.
- **T-3 (períodos)**: rango 2026-06-01..30 vs Prev (mayo): CobradoPrev = 966,613.24.
- **T-4 (CxC)**: RS8 con corte fin de jul vs tabla §2.4 (OCUP 216,867.77; total 265,234.45 con residuo).
- **T-5 (waterfall)**: Cobranzas − (LEGACY + CONTA + PLANILLA) = FlujoNeto, algebraico exacto.
- **T-6 (D6)**: con `'1'` solo, no aparece bucket ADMINISTRACION; con TODOS sí (cuando haya egresos conta).
- **T-7 (rango largo)**: 2026-01-01..07-14 corre < 5s por SP y series mensuales completas.
- **T-8 (empty-states)**: RS6/RS8/RS9-saldo/RS10 contable vacíos → UI muestra empty-state, no error.

## 11. ROLLBACK
Los 6 objetos conta son de solo lectura y nuestros: revertir = `DROP` de 3 fn + 3 SPs. Sin tablas
nuevas, sin RESEED, sin residuo en `dbo`. Front/API se revierten por git.

## 12. RIESGOS Y NOTAS
- **R1 — Tab contable "medio vacío" hoy**: es deliberado (D7). Las fuentes vacías son pendientes ya
  registrados del proyecto (data histórica de caja, carga de egresos/planilla/saldos). El dashboard es
  el INCENTIVO para esa carga: cada empty-state dice qué lo puebla.
- **R2 — Ratio cobranza/facturación > 100%**: normal cuando se cobra crédito de meses previos; tooltip
  obligatorio explicándolo (compara tuberías distintas a propósito).
- **R3 — IGV estimado**: bruto−neto NO es liquidación F.621 (exoneraciones, notas de crédito, prorrata).
  Rotular SIEMPRE "estimación referencial".
- **R4 — SISOL jun @70**: hasta el recalc (pendiente conocido), RS11 jun mostrará la foto vieja. No
  "corregirla" en el SP: la pantalla refleja la liquidación materializada.
- **R5 — Fuentes mensuales en series diarias**: excluidas (EsMensual=1) para no pintar picos falsos el
  día 1. En series mensuales sí entran.
- **R6 — Julio parcial**: los GATEs SIEMPRE sobre jun-2026. Julio solo para smoke visual.
- **R7 — Divergencia repo/BD**: portar la lógica viva desde `sys.sql_modules` (regla §3.9).

## 13. CHECKLIST DEL EJECUTOR
- [ ] FASE 0: D1–D7 confirmadas o defaults aceptados.
- [ ] FASE 1: 3 iTVF + 3 SPs creados, GATE-1.1..1.5 verdes al centavo, versionados en fn/14 + sp/16.
- [ ] FASE 2: 3 endpoints 200 con datos reales; validaciones 400; GATE-2 verde.
- [ ] FASE 3: página+filtro+19 charts+16 KPI cards; `npx vite build` OK; GATE-3 verde.
- [ ] FASE 4: verificación visual con el usuario; commits `feat(conta): …`; cierre continual-learning.
- [ ] Reglas SQL 2012 y "dbo solo SELECT" respetadas siempre.

---

## APÉNDICE — Fuentes de la investigación

**Gerencial/ejecutivo**: rib-software (ex-datapine, 25 principios BI) · Improvado (executive dashboards)
· Klipfolio (executive) · ClearPoint Strategy · insightsoftware (25 healthcare KPIs) · FinThrive
(10 métricas CFO healthcare) · Databox (revenue cycle KPIs) · HFMA (glosario de fórmulas + benchmarks)
· Geckoboard (layout + 5 terrible designs) · Yellowfin (waterfall cash flow) · Domo (waterfall) ·
Medesk ES (KPIs clínicas) · Aimoova ES (15 KPIs clínicas) · Den Otter (regla 5s) · dataslayer (15 principios).

**Contable**: Exact (CFO dashboard metrics) · Databrain (financial dashboards ×2) · F9 Finance (design
best practices) · Klipfolio (accounting) · Oak Hill (CFO dashboard: qué mostrar/evitar) · Eleken
(12 financial dashboards) · FusionCharts (10 mistakes) · madetomeasurekpis (5 mistakes) · NetSuite
(40 CFO KPIs) · Xero (dashboard) · **Perú**: SUNAT (ayuda F.621 + detracciones SPOT) · Estudio Bonilla
(tabla detracciones) · Noticiero Contable (IGV por acreditar) · PeruContable (detracciones PCGE 1042) ·
FacturaSimple (crédito fiscal + bancarización S/3,500) · Tolmin (crédito fiscal) · Rextie/BBVA (CTS y
tesorería, picos may/nov + grati jul/dic).

**Inventario de data**: corrida `legacy-negocio` 2026-07-14 contra producción (db-console SOLO SELECT);
cifras al centavo citadas en §2. Correcciones de memoria detectadas en esa corrida: SISOL jul ya @30
(solo jun pendiente de recalc) · nombres reales `costo_personal_mensual`/`saldo_banco_mensual` ·
`registro_compras` vacía · trampa NCHAR padding en `cajamayor_cierre.n_Anio/n_Mes`.

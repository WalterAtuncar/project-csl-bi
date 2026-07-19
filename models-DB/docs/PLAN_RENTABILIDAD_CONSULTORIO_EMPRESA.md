# PLAN — Replanteo Rentabilidad: Consultorios (Asistencial vs SISOL) + Ocupacional por Empresa Cliente

> **Documento de implementación para ejecutor IA.** Autocontenido: contiene el contexto, las decisiones
> cerradas del PO, el modelo de datos VERIFICADO en producción (2026-07-19), los contratos objetivo
> exactos y las fases con GATEs de cifras al centavo. Si algo de este documento contradice lo que ves
> en la BD/código vivo, DETENTE y repórtalo al orquestador antes de continuar.
>
> Fecha de elaboración: 2026-07-19. Cifras de referencia: **jun-2026** (mes cerrado), `@IncluirCredito=1`.
> Estado del repo al elaborar: `main` @ `e64fa2d` == `origin/main`; repo == BD viva (verificado, §5.1).

---

## 0. Resumen ejecutivo

La sección "Rentabilidad por Consultorio" de `/conta/rentabilidad` compara hoy **ASISTENCIAL vs
OCUPACIONAL** por consultorio. Eso fue un error de planteo:

- **OCUPACIONAL no se analiza por consultorio** (casi siempre son los mismos). Se analiza por
  **EMPRESA CLIENTE**: qué empresa es más rentable, con nº de servicios, ingresos del mes y cuánto
  fue cobrado.
- Lo que sí se compara por consultorio es **ASISTENCIAL vs SISOL** (ambos son consultas médicas
  sobre la misma dimensión de consultorios, catálogo Sigesoft grupo 403).
- El bucket actual **"SIN LIQUIDACIÓN"** (ingresos ocupacionales sin services EMO asociados) pasa a
  llamarse **"OTROS SERVICIOS OCUPACIONALES"** — y en la vista por empresa casi desaparece como
  bucket anónimo, porque esas facturas SÍ tienen empresa (el 96% es la unidad médica in-situ de
  LUMINA COPPER facturada por EDP mensual).

**Entregables:**
1. `conta.sp_Rentabilidad_PorConsultorio` REFORMADO: grupos ASISTENCIAL + SISOL (ocupacional sale),
   egresos particionados por centro de costo (fix del bug 5b integrado), RS3 nuevo de cuadre.
2. `conta.sp_Rentabilidad_OcupacionalPorEmpresa` NUEVO (archivo `sp/17_rentabilidad_empresa.sql`).
3. API: response de `/rentabilidad/por-consultorio` ampliado + endpoint nuevo
   `/rentabilidad/ocupacional-por-empresa`.
4. Front: sección "Por Consultorio" reformulada (cards Asistencial | SISOL) + sección nueva
   "Rentabilidad Ocupacional por Empresa Cliente".

### 0.1 Decisiones del PO (CERRADAS 2026-07-19 — no re-litigar)

| # | Decisión | Valor |
|---|---|---|
| D1 | Card SISOL | Muestra **NETO PLENO** (no el 30% clínica). La liquidación SISOL se maneja en honorarios médicos, no como liquidación global — se resuelve en OTRO sprint. La participación clínica (30%) solo aparece en la línea de cuadre. |
| D2 | "Cobrado" por empresa | **Cobrado A HOY de lo facturado en el mes** (acumulativo, sin filtro de fecha en la cobranza) + **Saldo** desde `dbo.cobranzapendiente`. |
| D3 | Neto vs bruto | Opción (A): **Ingresos en NETO sin IGV** + **Cobrado/Saldo en BRUTO con IGV**, con rótulos claros en la UI. |
| D4 | "Nº servicios" | **"Servicios facturados"**: los services EMO liquidados por las facturas del mes (aunque se hayan atendido meses atrás). Las líneas EDP/sin flujo EMO muestran 0. |
| D5 | Bug 5b | **SÍ entra** en este sprint, integrado al diseño (partición de egresos por centro de costo, resuelto por `v_Codigo`, sin hardcodes). |

### 0.2 Fuera de alcance (NO tocar en este sprint)

- La decisión de **doble conteo SISOL** (honorario nuevo vs 30% clínica) y cualquier recálculo de
  `sisol_liquidacion` — sprint aparte, pendiente de PO.
- `fn_Rentabilidad_IngresosEx`, `fn_Rentabilidad_Ingresos` (delegado), `fn_Rentabilidad_TotalesMes/Ex`,
  `sp_Rentabilidad_General/PorUnidad/Comparativa/Ingresos/Gastos` — **NO SE MODIFICAN** (consumidores
  críticos: `sp_Sisol_Calcular` depende de `fn_Rentabilidad_Ingresos`).
- `fn_Rentabilidad_IngresosDetalleEx` — **NO necesita cambios** (devuelve TODAS las tipocajas con la
  columna `i_IdTipoCaja`; los SPs filtran). Único consumidor actual: `sp_Rentabilidad_PorConsultorio`.
- Páginas legacy del BI (se mantienen; decisión del PO 2026-07-19).
- Deploy a IIS.

---

## 1. Contexto de negocio (diagnóstico verificado)

1. El SP actual clasifica por **unidad de negocio** (`dbo.venta.i_ClienteEsAgente` →
   `dbo.tipocaja_clientetipo` → `i_IdTipoCaja`): 1=ASISTENCIAL (agentes 2,8,9), 2=OCUPACIONAL
   (agente 1), **3=SISOL (agente 10)**. NO usa masterServiceType (eso es de honorarios).
2. SISOL hoy queda FUERA del detalle por consultorio: cae agregado al 30% clínica en la fila
   `OTRAS_UNIDADES / SISOL` (jun: 32,851.18 = 109,503.94 × 30%).
3. La "dimensión consultorio" del grupo ocupacional actual ni siquiera son consultorios: son
   **categorías de componentes EMO** (catálogo grupo 116) con prorrateo — y el 42.5% del monto
   (71,404.92 jun) cae en el residuo "SIN LIQUIDACIÓN".
4. Ese residuo es en un 96% **UNA factura recurrente**: LUMINA COPPER S.A.C., "SERVICIOS DE UNIDAD
   MEDICA EN CAMPAMENTO EL GALENO SEGUN EDP" (~68k/mes, serie verificada feb–jun 2026). Es negocio
   legítimo **sin flujo EMO en Sigesoft** — nunca tendrá liquidación. El resto (~2.7k) son facturas
   chicas con gap de digitación del comprobante.
5. La empresa cliente está EN LA FACTURA (`venta.v_IdCliente → dbo.cliente`): el **99.81% del neto**
   ocupacional de jun se atribuye a empresa jurídica **sin tocar Sigesoft**. Sigesoft solo aporta el
   CONTEO de servicios (Puentes A∪B).
6. SISOL por consultorio es viable con la maquinaria existente: sonda ejecutada 2026-07-19 →
   **99.84% del monto clasificado** (18 consultorios; CARDIOLOGIA SISOL = 14,182.88 cuadra al centavo
   con la reconciliación conocida de honorarios).

---

## 2. Modelo de datos verificado (joins canónicos)

### 2.1 Universo de ingresos (tubería RENTABILIDAD — devengado, neto sin IGV)

Fuente única: **`conta.fn_Rentabilidad_IngresosDetalleEx(@Anio, @Mes, @IncluirCredito)`** (iTVF viva,
modify_date 2026-07-13, repo == vivo). Contrato exacto (de `sys.columns`):

| Columna | Tipo |
|---|---|
| v_IdVenta | nchar(16) |
| i_IdTipoCaja | int NULL |
| Unidad | nvarchar(100) |
| v_SerieDocumento | varchar(20) |
| v_CorrelativoDocumento | nvarchar(8) |
| v_CorrelativoDocumentoFin | nvarchar(20) |
| v_IdVentaDetalle | nchar(16) |
| v_DescripcionProducto | nvarchar(2000) |
| Neto | decimal(18,4) — `vd.d_Valor`, neto sin IGV |

Aplica internamente: los **4 filtros canónicos** de ventas (i_Eliminado=0, ClienteEsAgente NOT NULL,
usuario 2036 solo agentes 3/4, series excluidas por `v_SerieDocumento`), `vd.i_Eliminado=0`, mes por
`v.t_InsertaFecha`, toggle crédito por `dh41.v_Value1='CREDITO'`. **NO aplica % SISOL** (devuelve neto
pleno por línea — perfecto para D1). Para `v_IdCliente` y `FechaVenta`, el SP actual ya joinea de
vuelta a `dbo.venta` en su bloque 1 — replicar ese patrón.

### 2.2 Vínculo venta → empresa cliente (ruta canónica, intra-BD principal)

```
dbo.venta.v_IdCliente (varchar(16))
  → dbo.cliente.v_IdCliente
      cliente.i_IdTipoPersona = 2  (jurídica; ≠2 o natural → bucket "PARTICULARES / SIN EMPRESA")
      cliente.v_NroDocIdentificacion (varchar(20)) = RUC   ← CLAVE DE AGRUPACIÓN
      cliente.v_RazonSocial (varchar(120))                  ← nombre a mostrar
```

⚠️ **REGLA DURA: agrupar SIEMPRE por `v_NroDocIdentificacion` (RUC), JAMÁS por `v_IdCliente`** —
hay 46 RUCs con múltiples filas en `dbo.cliente`. Para la razón social a mostrar, tomar una
determinista (p.ej. la del registro de la venta más reciente del mes, o `MAX(v_RazonSocial)`).
Cobertura verificada: 99.81% del neto jun (99.2–100% ene–jun).

### 2.3 Cobrado y saldo (tubería CAJA — bruto con IGV)

```
dbo.cobranza / dbo.cobranzadetalle  → por v_IdVenta (2026: 1 venta = 0..1 cobranza por el total)
  cobranzadetalle.d_ImporteSoles = BRUTO CON IGV       ← "Cobrado" (D2: SIN filtro de fecha = a hoy)
dbo.cobranzapendiente (v_IdVenta, d_Acuenta, d_Saldo)  ← "Saldo" vivo por factura (bruto).
  Sin fila en cobranzapendiente → Saldo = 0.
```

- Aplicar a la cobranza los filtros de validez que usa la tubería de caja (i_Eliminado=0 y estado no
  anulado — verificar contra el SP/fn de caja vivo antes de asumir nombres exactos).
- Sanity check (no GATE): bruto ≈ neto × 1.18 en este universo; y CobradoBruto + SaldoBruto ≈
  facturado bruto (verificado en LUMINA, TAWA, SAMA, STRACON).
- `PorcCobrado = 100.0 * CobradoBruto / NULLIF(CobradoBruto + SaldoBruto, 0)` (comparar bruto con
  bruto — D3 prohíbe mezclar neto con bruto en un mismo ratio).

### 2.4 Conteo de servicios facturados (Puentes A∪B — SOLO para NumServicios)

El dinero JAMÁS sale de aquí; esto solo cuenta services. **Reutilizar la maquinaria del bloque 4 del
SP actual** (ya construye los pares venta↔service, validada: 83/90 ventas jun emparejadas):

- **Puente A** (comprobantes directos): `venta.v_CorrelativoDocumentoFin` = token de
  `SigesoftDesarrollo_2.dbo.service.v_ComprobantePago` (nchar, multi-token separado por `|`,
  tokenizar con `spt_values` + CASE anti-"Invalid length" — patrón del bloque 2 del SP actual).
- **Puente B** (liquidación EMO, el fuerte en monto):
  `LTRIM(RTRIM(venta.v_SerieDocumento)) + '-' + LTRIM(RTRIM(venta.v_CorrelativoDocumento))`
  = `SigesoftDesarrollo_2.dbo.liquidacion.v_NroFactura` (varchar(50), **con `COLLATE
  DATABASE_DEFAULT`**) → `liquidacion.v_NroLiquidacion` = `service.v_NroLiquidacion` → services.
  Ventana: hasta 12 meses atrás (las facturas de jun liquidan services desde oct-2025).
- `NumServicios` por empresa = `COUNT(DISTINCT service)` de la unión A∪B de sus ventas del mes.
- Todo cross-DB es **SOLO SELECT** y con `COLLATE DATABASE_DEFAULT` en los join de texto.

### 2.5 SISOL por consultorio

Ventas `i_IdTipoCaja = 3` de la MISMA iTVF → **mismo Puente A + dedup `rn=1` (prefiere TokPrimario) +
`protocol.i_Consultorio` → catálogo `systemparameter` grupo 403** que ya usa la rama asistencial
(bloques 2–3 del SP actual). Cobertura verificada jun: 99.84% (residuo "(SIN SERVICE)": 6 ventas /
173.72). Las capas de rescate 2–4 del bloque 3 (hospitalización/heurísticas) son de la rama
asistencial; para SISOL basta Puente A + dedup (no agregar heurísticas de hospitalización a SISOL).

### 2.6 Egresos por consultorio (fix 5b — D5)

- Único escritor de `conta.egreso.i_IdConsultorio`: `sp_PagoHonorario_Insert` (honorarios), que rutea
  el centro por código: CLINICA → `CC-ASIS`, SISOL → `CC-SISOL`.
- Centros reales en `conta.centro_costo`: **CC-ASIS = 2, CC-SISOL = 6** (también: ADM=1, CC-OCUP=3,
  CC-FARM=4, CC-SEG=5). **Resolver SIEMPRE por `v_Codigo`** (`SELECT @ccAsis = i_IdCentroCosto FROM
  conta.centro_costo WHERE v_Codigo='CC-ASIS'`, ídem CC-SISOL) — NO hardcodear 2/6.
- El `#egr` del SP se particiona: filas con centro CC-ASIS alimentan los egresos de las filas
  ASISTENCIAL; filas con centro CC-SISOL alimentan las filas SISOL. Cualquier otro centro (o futuro
  egreso manual con consultorio) queda EXCLUIDO de ambos, por diseño.
- Estado de datos HOY: `conta.egreso` tiene **0 filas con i_IdConsultorio** (las pruebas PH se
  limpiaron con RESEED) → el GATE de egresos se valida con Egresos=0 en todo RS1, y la partición se
  valida por lectura de código (o con un pago de prueba SOLO si el orquestador lo autoriza, con
  limpieza+RESEED posterior).

---

## 3. Reglas duras y restricciones (aplican a TODAS las fases)

1. **NUNCA** ALTER/DROP/CREATE INDEX sobre tablas `dbo`. `SigesoftDesarrollo_2`: SOLO SELECT.
   Jamás leer `systemuser.v_Password`.
2. **SQL Server 2012**: sin `CREATE OR ALTER`, sin `STRING_SPLIT`, sin `OPENJSON`, sin `TRIM`, sin
   `DROP ... IF EXISTS`. Patrón idempotente: `IF OBJECT_ID('conta.sp_X','P') IS NOT NULL DROP
   PROCEDURE conta.sp_X; GO; CREATE PROCEDURE ...`. Ver `.claude/memory/reglas-sql2012.md`.
3. **Hecho de oro #3**: antes de editar un SP, comparar `modify_date` en `sys.procedures` contra el
   .sql del repo. Si divergen, portar el texto VIVO desde `sys.sql_modules` ANTES de editar.
   (Al 2026-07-19: repo == vivo en los 12 objetos de rentabilidad, verificado.)
4. Scripts .sql: **UTF-8 sin BOM**; aplicar con
   `cd D:\Projects\PROYECT-CSL\db-console && node query.js --write --file <ruta>` (soporta GO).
   Lecturas de verificación: `node query.js "SELECT ..."` (sin --write).
5. La BD es PRODUCCIÓN: los GATEs son EXEC de lectura (los SP de rentabilidad solo usan `#temp`).
   No sembrar datos de prueba en este sprint.
6. **El contrato de BD manda**: nombres/tipos REALES de columnas de los resultsets → DTOs C# →
   tipos TS, EXACTOS (el JSON del API va en PascalCase tal cual el DTO, sin camelCase — convención
   verificada del proyecto).
7. El **gran total de la sección debe seguir reconciliando** con Rentabilidad General (vía RS3).
8. Builds: API `dotnet build -c Release` (matar antes el proceso del puerto 5090); front
   `npx vite build` (NUNCA validar con tsc/check-types). El stack estable (API 5090 detached / Vite
   5173) lo levanta el ORQUESTADOR, no los subagentes.

---

## 4. Contratos objetivo (definitivos)

### 4.1 `conta.sp_Rentabilidad_PorConsultorio` (REFORMADO — mismo nombre, mismo archivo `sp/10`)

`@Anio SMALLINT, @Mes TINYINT, @IncluirCredito BIT = 1` (sin cambios).

**RS1** — misma forma de 8 columnas (front reutiliza `ConsultorioBloque`):

| Columna | Tipo | Nota |
|---|---|---|
| Grupo | nvarchar(20) | `'ASISTENCIAL'` \| `'SISOL'` (OCUPACIONAL y OTRAS_UNIDADES YA NO van en RS1) |
| Consultorio | nvarchar(100) | catálogo 403; fila no-clasificada ASIST = `'NO SE ATENDIERON CON EL SISTEMA'`; SISOL = `'SIN ATENCIÓN ASOCIADA'`; fila `'TOTAL'` por grupo |
| Ingresos | decimal(18,2) | ASIST: como hoy. SISOL: **NETO PLENO** (D1) |
| PorcDelGrupo | decimal(9,2) | sobre Ingresos del grupo |
| EsNoClasificado | bit | |
| EsTotal | bit | |
| Egresos | decimal(18,2) | partición por centro: ASIST←CC-ASIS, SISOL←CC-SISOL (D5) |
| Resultado | decimal(18,2) | Ingresos − Egresos |

Orden: `Grupo, EsTotal, Ingresos DESC, ConsultorioOrd` (como hoy). Mantener las filas "solo-egreso"
(consultorio con egreso y sin ingreso en el mes) dentro de su grupo correcto.

**RS2** — diagnóstico (misma forma): `Grupo, Motivo, Referencia, Monto` TOP 50. Ahora solo
ASISTENCIAL (`SIN_SERVICE`/`SIN_CONSULTORio` como hoy) y SISOL (`SIN_SERVICE`). Los motivos
ocupacionales salen de este SP (migran al SP nuevo).

**RS3 (NUEVO)** — cuadre con Rentabilidad General, UNA fila:

| Columna | Tipo | jun-2026 esperado |
|---|---|---|
| AsistencialNeto | decimal(18,2) | 278,397.77 |
| SisolNetoPleno | decimal(18,2) | 109,503.94 |
| SisolPorcClinica | decimal(5,2) | 30.00 (leído EN VIVO de `conta.sisol_participacion` vía `fn_Rentabilidad_IngresosEx`, NO hardcodear) |
| SisolParticipacionClinica | decimal(18,2) | 32,851.18 |
| OcupacionalNeto | decimal(18,2) | 168,065.60 |
| OtrasUnidadesNeto | decimal(18,2) | 65,213.11 (tipocaja NOT IN (1,2,3): Farmacia+Seguros+MTC, desde `fn_Rentabilidad_IngresosEx`) |
| TotalGeneral | decimal(18,2) | 544,527.66 = Asistencial + SisolParticipacion + Ocupacional + OtrasUnidades |

⚠️ `SisolParticipacionClinica` y `OtrasUnidadesNeto` deben salir de `fn_Rentabilidad_IngresosEx`
(NetoRentabilidad por unidad) para reconciliar al centavo con General — no recalcular el % a mano.

### 4.2 `conta.sp_Rentabilidad_OcupacionalPorEmpresa` (NUEVO — archivo `sp/17_rentabilidad_empresa.sql`)

`@Anio SMALLINT, @Mes TINYINT, @IncluirCredito BIT = 1`.

Universo: iTVF Detalle `WHERE i_IdTipoCaja = 2`, agregado por venta, join a `dbo.venta` (v_IdCliente)
→ `dbo.cliente`. Agrupación por RUC (§2.2). Cobrado/Saldo por §2.3 (D2/D3). NumServicios por §2.4 (D4).

**RS1** — filas por empresa + fila "PARTICULARES / SIN EMPRESA" + fila TOTAL:

| Columna | Tipo | Nota |
|---|---|---|
| Ruc | varchar(20) NULL | NULL en PARTICULARES y TOTAL |
| Empresa | nvarchar(200) | razón social; `'PARTICULARES / SIN EMPRESA'`; `'TOTAL'` |
| NumFacturas | int | documentos de venta del mes |
| NumServicios | int | services A∪B (D4); 0 en líneas EDP/sin flujo EMO |
| IngresosNeto | decimal(18,2) | neto sin IGV (D3) |
| CobradoBruto | decimal(18,2) | a hoy, con IGV (D2/D3) |
| SaldoBruto | decimal(18,2) | `cobranzapendiente.d_Saldo` (D2/D3) |
| PorcCobrado | decimal(9,2) | `100*Cobrado/(Cobrado+Saldo)`, NULL si ambos 0 |
| EsOtrosServicios | bit | 1 si `NumServicios=0 AND IngresosNeto>0` → badge "OTROS SERVICIOS OCUPACIONALES" |
| EsSinEmpresa | bit | 1 solo en la fila PARTICULARES |
| EsTotal | bit | |

Orden: `EsTotal, EsSinEmpresa, IngresosNeto DESC` (TOTAL al final o al inicio — consistente con RS1
del otro SP; el front respeta el orden del backend).

**RS2** — diagnóstico/auditoría: `Motivo` (`'SIN_SERVICIOS_EMO'` | `'SIN_EMPRESA'`), `Ruc`, `Empresa`,
`Referencia` (factura + descripción), `MontoNeto`. TOP 50 por monto. Aquí viven las ex-"SIN
LIQUIDACIÓN" con nombre y apellido (LUMINA + gaps de digitación).

**Invariante:** `SUM(IngresosNeto)` de RS1 (fila TOTAL) = `OcupacionalNeto` de RS3 del otro SP =
168,065.60 (jun). Las dos vistas deben cuadrar entre sí SIEMPRE.

### 4.3 API (`SanLorenzo.Contabilidad.Services`)

- `GET api/conta/rentabilidad/por-consultorio?anio=&mes=[&incluirCredito=false]` — misma ruta y
  params (anio `short`, mes `byte`, incluirCredito `bool` default true; convención: crédito ON =
  param omitido). Response AMPLIADO:
  `RentabilidadConsultorioResponse { Filas: RentabilidadConsultorioRow[], SinClasificar: RentabilidadConsultorioDiagRow[], Cuadre: RentabilidadConsultorioCuadre }`
  (DTO nuevo `RentabilidadConsultorioCuadre` = RS3, propiedades EXACTAS a las columnas). Breaking
  change aceptable: consumidor único (`Rentabilidad.tsx`), API y front se despliegan juntos.
- `GET api/conta/rentabilidad/ocupacional-por-empresa?anio=&mes=[&incluirCredito=false]` — NUEVO,
  en el mismo `RentabilidadController` con los MISMOS atributos de autorización que los endpoints
  existentes del controller (leer el controller vivo y calcar). Response:
  `RentabilidadOcupacionalEmpresaResponse { Empresas: RentabilidadOcupacionalEmpresaRow[], Diagnostico: RentabilidadOcupacionalEmpresaDiagRow[] }`.
- Dapper `QueryMultiple` (patrón del repo actual de rentabilidad). CommandTimeout: el default del
  repositorio actual (los SP corren <5s; no requiere 180s).

### 4.4 Front (`react-project`)

Archivos a tocar (ÚNICOS — impacto verificado): `src/pages/Contabilidad/Rentabilidad.tsx`,
`src/services/contabilidad/contaTypes.ts`, `src/services/contabilidad/ContabilidadService.ts`.

1. **Sección 3 reformulada** (hoy líneas ~281–344): cards **"Asistencial" | "SISOL"** con el mismo
   `ConsultorioBloque` (in-file, :350–393). Nota al pie de la card SISOL: *"Montos a venta plena
   (neto sin IGV). La participación clínica (30%) se muestra en el cuadre y es la que usa el KPI
   general."* (el % desde `Cuadre.SisolPorcClinica`, no hardcodear "30").
2. **Línea de cuadre** (reemplaza la actual :303–305), desde `Cuadre`:
   *"Ocupacional: S/ {OcupacionalNeto} (ver sección Empresas) · Otras unidades (Farmacia, Seguros):
   S/ {OtrasUnidadesNeto} · Participación clínica SISOL ({SisolPorcClinica}% de {SisolNetoPleno}):
   S/ {SisolParticipacionClinica} → Total general: S/ {TotalGeneral}"*.
3. **Colapsable diagnóstico** se mantiene; `motivoLabel` (:39–43): quitar `SIN_LIQUIDACION`, dejar
   `SIN_SERVICE`/`SIN_CONSULTORIO` (aplica también a SISOL).
4. **Sección NUEVA "Rentabilidad Ocupacional por Empresa Cliente"** (después de la sección 3):
   tabla con columnas **Empresa (RUC en tooltip/subtítulo) · Facturas · Servicios · Ingresos
   (S/ sin IGV) · Cobrado (S/ c/IGV) · Saldo (S/ c/IGV) · % cobrado** (barra o semáforo). Badge
   ámbar "OTROS SERVICIOS OCUPACIONALES" cuando `EsOtrosServicios`. Fila PARTICULARES y fila TOTAL
   con los estilos de `ConsultorioBloque` (ámbar / sky bold). Nota metodológica bajo el título:
   *"Ingresos: neto sin IGV (devengado del mes). Cobrado/Saldo: bruto con IGV, acumulado a hoy."*
   Colapsable "Ver detalle sin clasificar (N)" sobre `Diagnostico`.
5. Carga: sumar la 5ª llamada al `load()` existente (:65–97) con su propio loading, mismos filtros
   globales (año/mes/toggle crédito).
6. Tipos TS: calcar los DTOs EXACTOS (PascalCase, sin camelCase). Reusar `money` de
   `components/dashboard/dashHelpers.ts`. Sin export Excel/PDF en este sprint (se puede sumar luego
   con el patrón de caja).

---

## 5. Fases de ejecución

> Cadena: db-experto (F0–F2) → backend-api (F3) → bi-frontend (F4) → qa-tester (F5).
> Cada GATE lo verifica el orquestador (o delega a qa-tester). NO avanzar de fase con un GATE rojo.

### FASE 0 — Preflight (db-experto, solo lectura)

1. `modify_date` de los 12 objetos `conta.*Rentabilidad*` vs los .sql del repo (hecho de oro #3).
   Si algo divergió desde 2026-07-19, portar el texto vivo ANTES de editar y reportar.
2. Confirmar centros: `SELECT i_IdCentroCosto, v_Codigo FROM conta.centro_costo WHERE v_Codigo IN
   ('CC-ASIS','CC-SISOL')` → esperado 2 y 6.
3. Baseline: `EXEC conta.sp_Rentabilidad_PorConsultorio 2026, 6, 1` y guardar los totales actuales
   (tabla §6.1) como referencia de regresión.

**GATE 0**: repo==vivo (o portado), centros confirmados, baseline capturado.

### FASE 1 — SP por-consultorio reformado (db-experto)

Editar `models-DB/script-conta/sp/10_rentabilidad_consultorio.sql` (la iTVF Detalle del mismo archivo
NO se toca):

1. Bloque 1: universo `i_IdTipoCaja IN (1, 3)` con Grupo = CASE 1→'ASISTENCIAL', 3→'SISOL'.
   (El 2/OCUPACIONAL sale por completo: bloques 4 y las filas ocupacionales del 5 se eliminan de
   este SP.)
2. Bloque 3 (clasificación por consultorio): la rama ASISTENCIAL queda IGUAL (Puente A + dedup +
   403 + 4 capas de rescate). Para SISOL: mismo Puente A + dedup `rn=1` + 403, SIN las capas de
   rescate de hospitalización (§2.5); su no-clasificado se rotula `'SIN ATENCIÓN ASOCIADA'` con
   `EsNoClasificado=1` y Motivo RS2 `'SIN_SERVICE'`.
3. Bloque 5b (egresos, fix D5): `#egr` gana `i_IdCentroCosto`; variables `@ccAsis`/`@ccSisol`
   resueltas por `v_Codigo`; el UPDATE/INSERT a filas ASISTENCIAL usa SOLO `@ccAsis`, y se agrega el
   equivalente para SISOL con `@ccSisol` (match por nombre de consultorio 403, como hoy).
4. RS3 nuevo (§4.1) leyendo `fn_Rentabilidad_IngresosEx` para SisolParticipacion/OtrasUnidades/
   PorcClinica; Ocupacional = SUM de la iTVF Detalle con tipocaja=2.
5. Aplicar con db-console (`--write --file`); UTF-8 sin BOM; patrón DROP+GO+CREATE.

**GATE 1** (`EXEC conta.sp_Rentabilidad_PorConsultorio 2026, 6, 1`):
- RS1 ASISTENCIAL: TOTAL = **278,397.77**; HOSPITALIZACION = **107,490.28**; fila
  `NO SE ATENDIERON CON EL SISTEMA` = **3,754.55**. (Idéntico al baseline — la rama no cambió.)
- RS1 SISOL: TOTAL = **109,503.94** (neto pleno); **18 consultorios** clasificados; CARDIOLOGIA =
  **14,182.88**; no-clasificado `SIN ATENCIÓN ASOCIADA` = **173.72** (≈0.16%); clasificado +
  no-clasificado = total AL CENTAVO.
- RS1: `Egresos = 0` en TODAS las filas (no hay egresos con consultorio hoy) y `Resultado = Ingresos`.
- RS1: NINGUNA fila con Grupo OCUPACIONAL u OTRAS_UNIDADES.
- RS3: exactamente los 7 valores de la tabla §4.1, y
  `278,397.77 + 32,851.18 + 168,065.60 + 65,213.11 = 544,527.66` = Rentabilidad General jun
  (`EXEC conta.sp_Rentabilidad_General 2026,6,1` — mismo total).
- Toggle: `EXEC ... 2026, 6, 0` corre sin error y TotalGeneral coincide con General sin crédito.
- Perf: < 10s por ejecución.

### FASE 2 — SP ocupacional por empresa (db-experto)

Crear `models-DB/script-conta/sp/17_rentabilidad_empresa.sql` (§4.2). Reutilizar del sp/10 ACTUAL
(pre-reforma, está en git) la maquinaria del bloque 2 (tokenizador) y bloque 4 (pares A∪B) SOLO para
`NumServicios`. El dinero sale de la iTVF + cliente (§2.2) y la cobranza de §2.3.

**GATE 2** (`EXEC conta.sp_Rentabilidad_OcupacionalPorEmpresa 2026, 6, 1`):
- Fila TOTAL: IngresosNeto = **168,065.60** (== RS3.OcupacionalNeto de FASE 1, al centavo).
- **52 empresas** jurídicas + fila PARTICULARES + fila TOTAL.
- Filas top (RUC agrupado, cifras exactas):
  - LUMINA COPPER: 1 factura, **0 servicios**, IngresosNeto **68,648.63**, Cobrado **0.00**,
    Saldo **81,005.38**, `EsOtrosServicios=1`.
  - MINERA YANACOCHA: 1 factura, **73 servicios**, **24,864.30**, Cobrado 0, Saldo **29,339.87**.
  - DEYFOR: 1, **99**, **14,245.76**, Saldo **16,810.00**.
  - STRACON: 1, **72**, **10,754.41**, Cobrado **12,690.20**, Saldo **0.00**, PorcCobrado 100.
  - TAWA: 2 facturas, **40**, **4,135.59**, Cobrado **4,880.00**, Saldo 0.
  - SAMA: 2, **12**, **2,641.44**, Cobrado **2,341.00**, Saldo **775.90**.
- Fila PARTICULARES: **322.03** (2 facturas, EsSinEmpresa=1).
- RS2: la factura LUMINA `F001-00004133` aparece con Motivo `SIN_SERVICIOS_EMO` y monto 68,648.63.
- Perf < 10s. Segundo mes de control: may-2026 — TOTAL empresa == ocupacional de
  `fn_Rentabilidad_IngresosEx(2026,5,1)` unidad ocupacional, y LUMINA ≈ **67,583.94** con
  EsOtrosServicios=1.

### FASE 3 — API (backend-api)

1. `Dtos.cs`: `RentabilidadConsultorioCuadre` (+ sumarlo al Response existente) y los 3 DTOs nuevos
   de empresa — propiedades EXACTAS a las columnas de los RS (§4.1/§4.2).
2. `RentabilidadRepository` (o donde viva hoy por-consultorio — leer el repo actual): QueryMultiple
   con el 3er resultset; método nuevo para empresa.
3. `RentabilidadController`: endpoint nuevo calcando atributos de autorización y estilo de los
   existentes; params anio/mes/incluirCredito con los mismos tipos y default.
4. `dotnet build -c Release` (matar proceso 5090 antes si corre). NO levantar el API en background
   (eso lo hace el orquestador).

**GATE 3** (con el stack arriba, vía curl/Invoke-RestMethod con JWT válido):
- `GET /rentabilidad/por-consultorio?anio=2026&mes=6` → JSON con `Filas`, `SinClasificar` y `Cuadre`
  (7 propiedades, valores del GATE 1, PascalCase).
- `GET /rentabilidad/ocupacional-por-empresa?anio=2026&mes=6` → `Empresas` (54 filas: 52+PART+TOTAL)
  y `Diagnostico`; spot-check LUMINA y STRACON contra GATE 2.
- Sin token → 401. Build sin errores nuevos.

### FASE 4 — Front (bi-frontend)

Según §4.4. Reusar `ConsultorioBloque` (parametrizar la nota al pie si hace falta), estilos de fila
total/ámbar existentes, `money` de dashHelpers. Verificación EXCLUSIVAMENTE con `npx vite build`.

**GATE 4**: `npx vite build` verde; en `/conta/rentabilidad` (verificación visual del orquestador/QA):
cards Asistencial|SISOL con sus totales del GATE 1, línea de cuadre con los 4 sumandos y el total
544,527.66, sección Empresas con LUMINA badge "OTROS SERVICIOS OCUPACIONALES" y STRACON 100%
cobrado, toggle crédito refresca las DOS secciones, colapsables de diagnóstico funcionan.

### FASE 5 — QA de integración (qa-tester, protocolo P0–P5)

- P0 stack vivo (API 5090 + Vite 5173).
- Contrato JSON vs API vivo (ambos endpoints, con y sin `incluirCredito=false`).
- Cifras al centavo (jun-2026): TODOS los GATEs 1 y 2 re-verificados end-to-end + el invariante
  TOTAL empresa == Cuadre.OcupacionalNeto == 168,065.60; TotalGeneral == sp_Rentabilidad_General.
- Regresión: secciones 1 y 2 de la página (General/Comparativa/PorUnidad) INTACTAS — sus SPs/fn no
  se tocaron; `sp_Sisol_Calcular` sigue funcionando (depende de `fn_Rentabilidad_Ingresos`, no tocada).
- RBAC: endpoints nuevos con la misma política que los existentes (200 con usuario conta, 401 sin token).
- Mes de borde: mes en curso (jul-2026) corre sin error (cifras parciales OK); mes sin datos
  ocupacionales devuelve TOTAL=0 sin filas fantasma.

**Cierre**: commits del orquestador (convención `feat(conta): ...`, sugerido: 1 BD, 1 API, 1 front —
o 1 integrador si el usuario prefiere) + push previa aprobación del usuario + digest a
continual-learning.

---

## 6. Tablas de referencia (jun-2026, @IncluirCredito=1 — verificadas 2026-07-19)

### 6.1 Baseline del SP ACTUAL (pre-reforma, para regresión)

| Grupo | Fila | Ingresos |
|---|---|---|
| ASISTENCIAL | TOTAL | 278,397.77 |
| ASISTENCIAL | HOSPITALIZACION | 107,490.28 |
| ASISTENCIAL | NO SE ATENDIERON CON EL SISTEMA | 3,754.55 |
| OCUPACIONAL | TOTAL | 168,065.60 |
| OCUPACIONAL | SIN LIQUIDACIÓN (desaparece) | 71,404.92 |
| OTRAS_UNIDADES | TOTAL (desaparece de RS1) | 98,064.29 |
| OTRAS_UNIDADES | SISOL al 30% | 32,851.18 |
| — | GRAN TOTAL == General | 544,527.66 |

### 6.2 SISOL neto pleno (target card SISOL)

Total **109,503.94** · 18 consultorios · CARDIOLOGIA 14,182.88 · residuo sin service 173.72 ·
% clínica vigente 30 (única vigencia abierta desde 2026-01-01) · 109,503.94 × 30% = 32,851.18.

### 6.3 Otras referencias

- % SISOL: leerlo SIEMPRE en vivo (`sisol_participacion` vía IngresosEx). No asumir 30 fijo.
- Semestre ocupacional: 577 docs / 917,283.63 neto; 52–67 empresas/mes; 90–108 facturas/mes.
- Serie EDP LUMINA (EsOtrosServicios esperado=1 cada mes): feb 70,143.76 · mar 68,220.43 ·
  abr 70,630.13 · may 67,583.94 · jun 68,648.63.
- Caso "quien factura ≠ empleador" (MANNUCCI/IMPORTACIONES, 1/47): la dimensión canónica es el
  CLIENTE FACTURADO — no "corregir" hacia organization.

## 7. Riesgos y trampas conocidas (checklist del ejecutor)

1. ❑ Agrupar por RUC, no por v_IdCliente (46 duplicados).
2. ❑ `COLLATE DATABASE_DEFAULT` en todo join de texto cross-DB (Puente B, organization).
3. ❑ Cobrado/Saldo en BRUTO — jamás sumarlos ni ratearlos contra IngresosNeto.
4. ❑ Cobranza "a hoy" = SIN filtro de fecha (D2); sí filtros de validez (no eliminada/anulada).
5. ❑ % SISOL en vivo desde IngresosEx; el RS3 debe reconciliar con General AL CENTAVO.
6. ❑ Centros por `v_Codigo` (CC-ASIS/CC-SISOL), no ids hardcodeados.
7. ❑ No tocar: iTVF Detalle, IngresosEx, delegado, TotalesMes, General/PorUnidad/Comparativa.
8. ❑ SQL 2012 (sin CREATE OR ALTER / STRING_SPLIT / TRIM / DROP IF EXISTS).
9. ❑ Tokenizador: patrón `spt_values` + CASE anti-"Invalid length" del bloque 2 actual (copiar, no
   reinventar).
10. ❑ JSON PascalCase = nombres de columnas del SP = DTOs = tipos TS, idénticos.
11. ❑ Front: validar con `vite build`, no con tsc. Toggle crédito: ON = param omitido.
12. ❑ Los subagentes NO levantan el API en background (lo hace el orquestador).
13. ❑ `NumServicios` cuenta DISTINCT services de A∪B; ventana Puente B hasta 12 meses atrás.
14. ❑ Etiqueta "OTROS SERVICIOS OCUPACIONALES" = flag `EsOtrosServicios` (NumServicios=0 e
    ingresos>0), NO un string mágico que el front parsee.

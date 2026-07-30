# PLAN — Card SEGUROS en "Rentabilidad por Consultorio" (`/conta/rentabilidad`)

> **Para el ejecutor (IA):** plan autocontenido — la investigación de datos ya está hecha y verificada
> contra producción (spike `legacy-negocio` 2026-07-29, reproduce el universo canónico al centavo:
> cuadre jun-2026 = 544,527.66 exacto). **NO re-investigues** la atribución SEGUROS ni el modelo de
> negocio: los hechos de §2 son data real. Implementa lo especificado, verifica con los GATEs de §8.
> Cadena: **db-experto (F1) → backend-api (F2) ∥ bi-frontend (F3) → qa-tester (F4)**. El contrato de
> la BD manda (alias del SP → DTO → tipos TS, letra por letra).

Fecha: 2026-07-29 · Autor: Fable 5 (planificador) · Estado: **LISTO PARA EJECUTAR (espera "go")**

---

## 1. Objetivo

La sección **"Rentabilidad por Consultorio"** de `/conta/rentabilidad` hoy compara **ASISTENCIAL vs
SISOL** (cards + cuadre). El PO pide agregar el mismo análisis para la unidad **SEGUROS**:
una **tercera card SEGUROS** con sus consultorios (Ingresos − Egresos), integrada al cuadre RS3 sin
romper el invariante `TotalGeneral`.

Tubería: **RENTABILIDAD** (facturado/devengado; `ventadetalle.d_Valor` neto sin IGV; 4 filtros
canónicos; `@IncluirCredito` respetado). Nada de caja.

## 2. Hechos verificados (data real 2026-07-29 — NO re-derivar)

| # | Hecho | Detalle |
|---|---|---|
| S1 | **Unidad SEGUROS = tipocaja 5** | `dbo.tipocaja` id 5 activo; `tipocaja_clientetipo` vivo: agentes **5,6 → 5**. Semántica: agente **5 = SegurosPaciente** (boletas **B004**, copagos chicos) · **6 = SegurosFacturacion** (facturas **F007** a la aseguradora; jun: 25 F007, todas a PACIFICO S.A. EPS). |
| S2 | **Materialidad** | Neto 2026: ene 532 · feb 659 · **mar 12,361** · abr 505 · **may 7,513** · **jun 3,478.98** · jul 2,721. ~1.3% del asistencial; volátil (pico marzo). El PO la quiere igual (D5). |
| S3 | **Puente A es CIEGO para F007** | Con la lógica EXACTA del SP (Puente A + capas H): jun atribuye solo **4.15%** (144.32 — las B004); capas HOSPITALIZACION rescatan **0.00** en todos los meses; fuga 85–96% = las F007, porque **`service.v_ComprobantePago` casi no registra F007** (2 services desde 2025). No es problema de ventana de fechas: el dato no existe. |
| S4 | **Puente B (liquidación) resuelve ~99%** | Flujo agente 6 = liquidación: `SigesoftDesarrollo_2.dbo.liquidacion.v_NroFactura` guarda la F007 (`LTRIM(RTRIM(lq.v_NroFactura)) = serie+'-'+correlativo` con `COLLATE DATABASE_DEFAULT`, `ISNULL(lq.i_IsDeleted,0)=0`). Jun: **25/25 F007 con liquidación (100%)** y **todas con `liquidacion.v_ServiceId` DIRECTO poblado** (más simple que el B ocupacional del sp/17; existe fallback hop `lq.v_NroLiquidacion → service.v_NroLiquidacion` si hiciera falta). **A∪B**: jun **99.15%** atribuido (fuga 29.66) · jul 98.75% · mar 99.81%. |
| S5 | **Distribución jun (A∪B)** | MEDICINA GENERAL 2,490.77(B)+127.37(A)=**2,618.14** · OTORRINO 300.63+16.95=**317.58** · TRAUMATOLOGIA 272.64 · OFTALMOLOGIA 240.96 · fuga 29.66 (1 B004 sin service). Mar incluye un bucket **`i_Consultorio NULL` con service, proc='S'** (protocolo 'PACIFICO UPN', 839.01) → convenios sin consultorio (D3). |
| S6 | **CC-SEG existe** | `conta.centro_costo` id 5, `v_Codigo='CC-SEG'`, `i_IdTipoCaja=5`, activo. `conta.egreso` = **0 filas totales** hoy (el `#egr` del SP está vacío también para ASIST/SISOL) → partición CC-SEG es future-proof, no cambia cifras hoy. |
| S7 | **RS3 hoy** | `OtrasUnidadesNeto = iTVF NOT IN (1,2,3)` = SEGUROS(5) + FARMACIA(6); **MTC(4) = 0 ventas 2026**. Jun: Otras 65,213.11 = 3,478.98 (SEG) + 61,734.13 (FARM). `PorcClinica` de tipocaja 5 = **100** (neto pleno, sin participación tipo SISOL). |
| S8 | **Invariante de control** | Cuadre jun-2026 (con crédito): 278,397.77 (ASIST) + 32,851.18 (SISOL 30%) + 168,065.60 (OCUP) + 65,213.11 (Otras) = **544,527.66** — debe seguir cuadrando AL CENTAVO tras el cambio. |
| S9 | **Cola residual** | 1 venta SEGUROS jul con serie **F004** (33.90), sin liquidación y sin consultorio → fuga legítima al bucket no-clasificado (vigilar, no bloquea). |
| S10 | La iTVF **`fn_Rentabilidad_IngresosDetalleEx` es INTOCABLE** (ya devuelve TODAS las tipocajas; el SP filtra). La comparte `sp/17`. |

Reglas duras: SQL Server **2012**; tubería RENTABILIDAD con los 4 filtros (ya encapsulados en la
iTVF); jamás tocar `dbo` (solo SELECT); el dinero SIEMPRE de `ventadetalle` — Sigesoft solo aporta
dimensión.

## 3. Decisiones (del planificador, con data — el PO puede vetar antes del "go")

| # | Decisión | Valor y porqué |
|---|---|---|
| D1 | **SEGUROS a NETO PLENO** | PorcClinica=100 (S7): no existe participación tipo SISOL → la card muestra el 100% del neto y NO hay campo de participación en RS3. |
| D2 | **Atribución = Puente A + Puente B (liquidación)** | A (comprobante→service, dedup rn=1) para las B004; para lo NO clasificado por A, **B**: `liquidacion.v_NroFactura = serie+'-'+corr` (COLLATE, i_IsDeleted=0) → **`lq.v_ServiceId` directo** (C2) y fallback hop `lq.v_NroLiquidacion → service.v_NroLiquidacion` (C3) → `protocol.i_Consultorio → 403`. Si una factura tiene >1 liquidación, dedup rn=1 por menor `v_LiquidacionId` (determinista). Sin B la card sería ~90% "no clasificado" (S3/S4). |
| D3 | **Convenios sin consultorio** | Venta CON service (vía A o B) pero `i_Consultorio` NULL (proc='S', ej. 'PACIFICO UPN') → fila con Consultorio = **`'CONVENIO (SIN CONSULTORIO)'`**, `EsNoClasificado=0` (atribución legítima a nivel unidad). La fuga real (sin service ni liq) → etiqueta **`'SIN ATENCIÓN ASOCIADA'`**, `EsNoClasificado=1` (mismo patrón SISOL). |
| D4 | **RS3**: campo nuevo **`SegurosNeto`**; `OtrasUnidadesNeto` pasa a **`NOT IN (1,2,3,5)`** (queda ≈ FARMACIA; MTC=0). `TotalGeneral` = misma fórmula + SegurosNeto separado de Otras → invariante S8 al centavo. |
| D5 | **Card siempre visible** aunque el mes valga ~500 (materialidad S2 la conoce el PO y la pidió igual). |
| D6 | **Egresos**: partición existente por `v_Codigo` gana la rama **CC-SEG → filas SEGUROS** (hoy 0 filas, future-proof). **NO tocar honorarios**: `v_TipoProduccion` sigue con dominio CLINICA\|SISOL (un "honorario SEGUROS" no existe como concepto hoy). |
| D7 | **No agregar capas heurísticas H a SEGUROS** (rescatan 0.00 — S3). Ramas de SEGUROS: A determinista → B directo → B hop → convenio-sin-consultorio → no clasificado. |

## 4. Capa BD — `sp/10_rentabilidad_consultorio.sql` (v3, mismo archivo)

Editar `conta.sp_Rentabilidad_PorConsultorio` (DROP+CREATE, SQL 2012). **La iTVF NO se toca** (S10).
Firma sin cambios: `@Anio SMALLINT, @Mes TINYINT, @IncluirCredito BIT = 1`.

1. **Universo**: `WHERE d.i_IdTipoCaja IN (1,3)` → **`IN (1,3,5)`** en el armado de `#v` (ventas
   agregadas por venta). Las ramas ASISTENCIAL (3.1) y SISOL (3.2) quedan INTACTAS.
2. **Nueva rama 3.3 SEGUROS (`v.i_IdTipoCaja = 5`)**:
   - **C1 (Puente A)**: mismo join/dedup rn=1 del SP (tokenizador multi-token, ventana ±15d,
     catálogo 403) — clasifica las B004.
   - **C2 (Puente B directo)**: para las ventas SEGUROS aún sin clasificar, join
     `SigesoftDesarrollo_2.dbo.liquidacion lq` por `LTRIM(RTRIM(lq.v_NroFactura)) =
     v.v_SerieDocumento + '-' + v.v_CorrelativoDocumento COLLATE DATABASE_DEFAULT` con
     `ISNULL(lq.i_IsDeleted,0)=0`, dedup rn=1 (menor `v_LiquidacionId`), luego
     `lq.v_ServiceId → service → protocol.i_Consultorio → 403`. *(Verificar al implementar el
     nombre exacto de la columna del nro de factura en `venta` que ya usa el SP para armar el
     token del Puente A — reutilizar la misma expresión serie+correlativo.)*
   - **C3 (Puente B hop)**: si `lq.v_ServiceId` viniera NULL, fallback
     `lq.v_NroLiquidacion → service.v_NroLiquidacion` (mismo dedup). En jun no hace falta
     (25/25 directo) pero cubre históricos.
   - **Buckets** (D3): service con consultorio → nombre 403; service sin consultorio →
     `'CONVENIO (SIN CONSULTORIO)'` (EsNoClasificado=0); sin service/liq →
     `'SIN ATENCIÓN ASOCIADA'` (EsNoClasificado=1).
   - Insertar a `#det` con `Grupo = 'SEGUROS'` (neto pleno — D1).
3. **RS2 (diagnóstico fuga)**: agregar la rama `'SEGUROS'` (mismo shape, TOP 50 compartido).
4. **Egresos**: `DECLARE @ccSeg INT = (SELECT ... WHERE v_Codigo='CC-SEG')`; en la partición de
   `#egr`, filas de centro CC-SEG → adosar a filas `Grupo='SEGUROS'` (+ el INSERT de "consultorio
   solo-egreso" análogo al de ASIST/SISOL). Cualquier otro centro sigue EXCLUIDO.
5. **RS3**: nuevo campo **`SegurosNeto`** = `SUM(Ingresos) FROM #det WHERE Grupo='SEGUROS'`;
   `OtrasUnidadesNeto` pasa a `i_IdTipoCaja NOT IN (1,2,3,5)`; `TotalGeneral` incluye `+ SegurosNeto`
   (misma fórmula de siempre, con Otras ya sin el 5). **Orden de campos**: mantener los existentes y
   añadir `SegurosNeto` inmediatamente antes de `OtrasUnidadesNeto` (Dapper mapea por nombre; el
   orden es solo legibilidad).
6. Actualizar el comentario de cabecera del archivo (universo 1/3/5, Puente B seguros, D1–D7).
7. Aplicar en prod vía db-console; verificar repo==prod; **probar contra las cifras ancla de §8
   ANTES de pasar a F2** (parte de F1).

## 5. Capa API

- `Dtos.cs`: al DTO del cuadre (el que mapea RS3 — buscar `RentabilidadCuadre*` con
  `AsistencialNeto/SisolNetoPleno/...`) agregar **`public decimal SegurosNeto { get; set; }`**
  (nombre EXACTO del alias). El DTO de RS1 no cambia (`Grupo` es string).
- `RentabilidadRepository.PorConsultorio` y el controller **no cambian** (QueryMultiple por nombre).
- `dotnet build -c Release` limpio. El orquestador para/reinicia el 5090 (lock del DLL).

## 6. Capa Front (`react-project`)

- `contaTypes.ts`: union del RS1 `Grupo: 'ASISTENCIAL' | 'SISOL' | string` → añadir `'SEGUROS'` al
  comentario/union; al tipo del Cuadre agregar **`SegurosNeto: number;`**.
- `Rentabilidad.tsx` (sección 3):
  - Nuevo memo `const seguros = ... filter(f => f.Grupo === 'SEGUROS')`.
  - **Tercera card "SEGUROS"** con el MISMO componente de las cards ASISTENCIAL/SISOL (grid pasa a
    3 columnas responsive; en pantallas chicas apilan). Nota de la card: *"Neto pleno (sin
    participación). Facturación a aseguradoras vía liquidación (F007) + copagos (B004). Egresos =
    centro CC-SEG."*
  - **Línea de cuadre**: donde hoy dice `Otras unidades (Farmacia, Seguros): S/ X` →
    `Seguros: S/ {money(cuadre.SegurosNeto)} · Otras unidades (Farmacia): S/ {money(cuadre.OtrasUnidadesNeto)}`
    (el resto de la línea igual; TotalGeneral no cambia de fórmula visual).
- Convenciones: `money` del helper existente de la página (ojo con la trampa del `money` LOCAL de
  `dashHelpers` que antepone "S/ " — usar el mismo que ya usan las cards actuales).
- Verificar `npx tsc --noEmit` (0 errores) + `vite build` OK.

## 7. Fases

| Fase | Agente | Entregable |
|---|---|---|
| F1 | **db-experto** | sp/10 v3 aplicado en prod + probado contra §8 (cifras ancla) |
| F2 | **backend-api** | DTO `SegurosNeto` + build limpio (∥ F3) |
| F3 | **bi-frontend** | card + cuadre + tipos; tsc/vite limpios (∥ F2) |
| F4 | **qa-tester** | GATEs §8 contra API vivo (el orquestador levanta 5090/5173) |
| F5 | **orquestador** | Commit `feat(conta): rentabilidad por consultorio + card SEGUROS` — **solo con OK explícito del usuario** |

## 8. GATEs de QA (cifras ancla del spike — jun-2026, @IncluirCredito=1)

| GATE | Verificación | PASS |
|---|---|---|
| G1 | Repo==prod del sp/10 v3 (`sys.sql_modules`, modify_date) | idéntico |
| G2 | **Invariante al centavo**: RS3 jun → `TotalGeneral = 544,527.66` EXACTO (S8); `SegurosNeto = 3,478.98`; `OtrasUnidadesNeto = 61,734.13` (= Otras vieja 65,213.11 − 3,478.98) | exacto |
| G3 | **Regresión ASIST/SISOL**: RS1 jun de ASISTENCIAL y SISOL fila a fila IDÉNTICO al SP actual (las ramas no se tocaron); `AsistencialNeto=278,397.77`, `SisolParticipacionClinica=32,851.18` | 0 diffs |
| G4 | **Atribución SEGUROS jun**: Σ Ingresos grupo SEGUROS = 3,478.98; MEDICINA GENERAL = **2,618.14** · OTORRINO 317.58 · TRAUMATOLOGIA 272.64 · OFTALMOLOGIA 240.96 · no-clasificado = **29.66** (99.15% atribuido) | exacto |
| G5 | **Marzo (mes pico + convenios)**: Σ SEGUROS = 12,360.66; existe fila `CONVENIO (SIN CONSULTORIO)` ≈ 839.01 con EsNoClasificado=0; fuga ≈ 23.05 | exacto |
| G6 | RS2 incluye filas Grupo='SEGUROS' (diagnóstico de la fuga jul: la F004 de 33.90 aparece) | correcto |
| G7 | API: JSON del cuadre trae `SegurosNeto` (nombre exacto); RS1 trae filas `Grupo:"SEGUROS"` | shape ok |
| G8 | Front: 3 cards renderizan; línea de cuadre muestra `Seguros` y `Otras unidades (Farmacia)`; suma visual del cuadre = TotalGeneral; tsc+vite limpios | correcto |
| G9 | Toggle crédito: `@IncluirCredito=0` sigue funcionando (SEGUROS es mayormente crédito F007 → con 0 la card debe caer coherentemente, no romper) | sin error |
| G10 | Read-only: sin escrituras; performance del SP sin regresión (mismo orden de magnitud actual) | ok |

## 9. Fuera de alcance / notas

- **Honorarios SEGUROS** (D6): no existe el concepto; `v_TipoProduccion` no se toca.
- **`costo_personal_mensual`**: el sp/10 NO la lee para ninguna unidad (solo `conta.egreso`); no se
  agrega aquí. ⚠️ **Corrección de memoria detectada por el spike** (pasar a `continual-learning` al
  cierre): `conta.costo_personal_mensual` **ya NO está vacía** (8 filas 2026; CC-SEG tiene 850 en
  may) — la memoria decía lo contrario. Además: dominio vivo de `protocol.v_Procedencia`
  (O/A/**S=seguros**/M/E/H), flujo agente 6 = liquidación con `v_ServiceId` directo, serie F004
  residual, enum front `TipoServicio` 5/6.
- **F004** (S9): cola residual sin liquidación → queda en no-clasificado (RS2 la muestra); si crece,
  sprint aparte.
- La card SEGUROS mostrará montos chicos en meses valle (S2) — decisión consciente del PO (D5).

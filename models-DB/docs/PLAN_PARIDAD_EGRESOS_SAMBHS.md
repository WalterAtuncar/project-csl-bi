# PLAN — Paridad de egresos SAMBHS ↔ web BI (estado y cierre)

**Fecha:** 2026-07-25 · **Autor:** Planificador (Fable 5) · **Ejecutor:** Opus (sesión con modelo Opus)
**Planes previos (base, NO duplicar):** `PLAN_TIPIFICACION_EGRESOS_SAMBHS.md` (sprint B) y
`PLAN_CIERRE_CICLO_EGRESO_CAJA.md` (sprint C). Este documento los CONTINÚA: mide el avance real
verificado en código, cierra los gaps que faltan para el requerimiento del PO y ordena la ejecución.

---

## 0. Protocolo de actores (vigente desde 2026-07-25)

- **Planificador = Fable 5**: analiza, decide diseño con el PO, documenta. NO ejecuta.
- **Ejecutor = Opus**: ejecuta/orquesta subagentes SOLO sobre un plan existente (este). Cosas menores
  fuera de plan → solo con aprobación explícita del usuario.
- Regla heredada intacta: **commits/push los hace el orquestador y SOLO con OK explícito del usuario.**
  Instrucción vigente del usuario (2026-07-25): **"aún no subas nuestros cambios"** → NADA de push de
  nuestro trabajo hasta nueva orden (F3 está GATED).

## 1. Requerimiento del PO (en sus palabras, 2026-07-25)

Los egresos del SAMBHS deben registrarse **idénticamente** a los egresos de la web BI, en 1 o 2
momentos, **aditivo**, sin tocar el flujo del SAM y **sin doble registro**:

- **CASO 1 — Honorarios médicos**: solicitar el/los nro(s) de comprobante y registrar el pago por
  comprobante, igual al pago de honorarios de la web (misma data; puede consumir las mismas APIs o SPs).
- **CASO 2 — Egreso sin comprobante**: flujo normal de egreso **asociado a una entidad o persona**,
  como la web.
- **CASO 3 — Egreso con comprobante**: 2 pasos — registrar el egreso normal ahora (p.ej. "compra de
  fluorescentes"); cuando el compañero vuelve con el comprobante, **editar** el registro agregando
  proveedor + comprobante.

### Decisiones de producto cerradas HOY con el PO (no re-litigar)

| # | Decisión | Detalle |
|---|---|---|
| **DN1** | Caso 2: receptor **AUTO-DERIVADO**, no re-capturado | El SAMBHS YA asocia el egreso EC a una persona (beneficiario `venta.v_IdCliente`, p.ej. personal de laboratorio que compra láminas/tubos). Pedirlo de nuevo = doble digitación. El receptor del overlay se deriva del beneficiario existente; el catálogo `conta.entidad` del BI soporta **personal del sistema** como entidades de egreso (tipo `PERSONAL`). |
| **DN2** | Caso 1: comprobante del MÉDICO (RxH/factura, `conta.comprobante_honorario`) **NO se captura en caja por ahora** | En la web también es opcional → la paridad ya se cumple. Sprint chico futuro si contabilidad lo pide (modelo 1:1 ya existe, ddl/12). |
| **DN3** | Caso 1: **caja SIN plantilla Excel** (asimetría deliberada) | La plantilla es gate de pagos masivos web; en ventanilla la evidencia es la boleta física y el SP re-valida server-side (médico único, no pagados, anti-mixto). Documentado como decisión de diseño. |

Decisiones previas que SIGUEN mandando: **DD1** la caja MANDA el monto (comprobante documental, Δ no
se persiste); **DD2** IGV informativo (jamás `registro_compras`/crédito fiscal); **DD3** proveedor =
`dbo.proveedores` con alta on-demand; **DD4** tipificación editable. **PRINCIPIO RECTOR: enriquecer el
overlay, JAMÁS crear `conta.egreso`** (el dinero ya salió por la venta EC → doble conteo).

## 2. Terreno EXACTO (verificado 2026-07-25, no asumir — re-verificar al arrancar)

| Repo / entorno | Estado |
|---|---|
| `D:\Projects\PROYECT-CSL\Facturacion_New` (SAMBHS nuestro) | `master` = **`1c6b46fe`** (== origin; incluye anulación electrónica NC/Baja NubeFac + detracción SUNAT del compañero, **build validado 0 errores** MSBuild VS18). Working tree LIMPIO. |
| Rama WIP nuestra (SAMBHS) | **`wip/tipificacion-cierre-20260725`** = `86d21679` (padre `1d619f71`). Contiene TODO el lado SAMBHS de sprints B/C. **NO mergeada a master, NO pusheada.** |
| Repo compañero | `D:\Documentos\GitHub\SAM-csl\Facturacion_New`, master = `1c6b46fe`; respaldo `wip/sam-csl-backup-20260725`. No tocar. |
| BI repo `Project-CSL\project-csl-bi` | `main` = **`5ea65f2`**, origin = `29f3f2a` → **5 commits ahead SIN pushear** (`647d8a4..5ea65f2` = lado BD/API/front de sprints A/B/C). |
| BD producción (schema conta) | `ddl/14`, `ddl/15`, `sp/18`, `sp/19` **APLICADOS**. Overlay `egreso_caja_clasificacion` = 0 filas. Prod limpio (RESEED). ⚠️ prod adelanta a origin. Golden #3: portar SPs desde `sys.sql_modules`, no confiar en el .sql. |
| Feature flag | `TipificacionEgresoHabilitada=false`, `TipificacionEgresoSeries=ECA` (App.config, solo en la rama WIP). Con OFF el SAMBHS es byte-idéntico. |
| Stack dev | API 5090 / Vite 5173 ABAJO. Los levanta el ORQUESTADOR (detached), no los subagentes. |

## 3. Matriz de avance por caso (evidencia = archivo:línea, verificada hoy)

### CASO 1 — Honorarios por comprobante(s) → **~95% HECHO**

| Pieza | Estado | Evidencia |
|---|---|---|
| Form pide nro(s) de comprobante, **multi-comprobante** | ✅ | `frmTipificarEgreso.cs` (rama WIP): lista `_comprobantes`, `@Comprobantes` CSV NVARCHAR(500) |
| Resolución server-side comprobante→servicios | ✅ | `conta.sp_EgresoCaja_ResolverComprobante` (sp/18:24) |
| Validaciones: médico único, anti-mixto CLINICA/SISOL, ninguno pagado, sin médico → rechazo | ✅ | sp/18:297-309 + réplica UX en form (RecalcularEstadoHonorario) |
| Registro IGUAL a la web: `pago_honorario` (cabecera PAGADO, `v_Origen='CAJA'`, `v_IdVentaCaja`) + `pago_honorario_consultorio` (prorrateo, `i_IdEgreso=NULL`) + `pago_honorario_servicio` (candado `UX_pago_hon_serv_activo`) + upsert entidad MEDICO + auditoría | ✅ | sp/18:337-388 |
| Anti-doble-pago **cross-canal** (caja bloquea web y viceversa) | ✅ | candado por servicio + `UX_pago_hon_ventacaja` (ddl/14:81-84) |
| Sin `conta.egreso` (jamás doble conteo) | ✅ | sp/18 rama HONORARIO no inserta egreso |
| Web muestra el canal: badge "PAGADO POR CAJA", Anular oculto, `v_Origen` en API | ✅ | commits `61d20c5` + `f4b692c` (BI repo) |
| Comprobante del médico (RxH) en canal caja | ⏸ diferido | **DN2** |
| Plantilla Excel en canal caja | ✖ no aplica | **DN3** (documentar en memoria) |

**Nota API vs SP (pregunta del PO "puede consumir las mismas APIs"):** el canal caja escribe vía
`conta.sp_*` directo por `ConexionSAM` (SP = único guardián, valida 502/504 + idempotencia). Es
**equivalente en datos** al API web (mismas tablas, mismos candados). NO cambiar a HTTP: el SAMBHS no
maneja JWT y el SP ya es la fuente única de verdad. Decisión de arquitectura tomada en sprint B.

### CASO 2 — Egreso sin comprobante, asociado a entidad/persona → **~70% HECHO** (único gap de código nuevo)

| Pieza | Estado | Evidencia |
|---|---|---|
| Tipificación GASTO con tipo de gasto curado (`b_VisibleCaja`, hoja, no OTROS_INGRESOS) | ✅ | ddl/14 §C + sp/18:210-223 |
| Centro de costo por unidad (ECA→CC-ASIS, ECF→CC-FARM) | ✅ | sp/18:226-229 |
| Overlay guarda receptor (`i_IdProveedor` / `i_IdEntidad`) y el SP los acepta y valida | ✅ | sp/18:166-167, 231-241 |
| **GAP-1: el form NO envía receptor al tipificar** → gasto sin comprobante queda sin persona asociada | ❌ | `frmTipificarEgreso.Tipificar()` solo envía `@Tipo`+`@IdTipoGasto` |
| **GAP-2: derivación del beneficiario (DN1)** — heredar el receptor del beneficiario de la venta EC | ❌ nuevo | Diseño §5.F1 |
| **GAP-3: entidades tipo PERSONAL en el BI** (catálogo/selección web) | ❌ nuevo | Diseño §5.F1 |

### CASO 3 — Egreso con comprobante en 2 pasos → **~95% HECHO**

| Pieza | Estado | Evidencia |
|---|---|---|
| T1: tipificar GASTO al registrar el egreso (post-commit, flag-gated, no-op si OFF) | ✅ | hook `frmRegistroVentaRapida.cs` (~:975 base), helper flag (~:1146) |
| T2: "Registrar compra" al volver con el comprobante (proveedor con alta rápida RUC-11 / entidad, tipoDoc/serie/fecha/bruto/IGV) | ✅ | `frmRegistrarCompra.cs` + `sp_EgresoCaja_RegistrarCompra` (sp/19:166-175) |
| DD1 visible: Δ comprobante vs caja informativa, "la caja manda" | ✅ | `frmRegistrarCompra.RecalcularDiferencia()` |
| Re-edición (estadoCompra COMPLETO → prellenar y corregir) | ✅ | `frmRegistrarCompra.PrellenarDesdeClasificacion()` |
| Edición de tipificación (GASTO in-place; HONORARIO recrea pago con confirmación) | ✅ | `frmTipificarEgreso.EjecutarConfirmacion()` + sp/19 `ActualizarTipificacion` |
| Botones en bandeja (Tipo de gasto / Registrar compra), defensivos, flag-gated | ✅ | región en `frmBandejaRegistroVenta.cs` (WIP ~:1229) |

### Transversal — qué falta para que TODO llegue a producción

1. **F0 — Reintegración**: el WIP vive en una rama cuyo padre es `1d619f71`; master ya es `1c6b46fe`
   (anulación electrónica tocó LOS MISMOS archivos). Merge + build. **Sin esto nada se despliega.**
2. **F1 — Cerrar Caso 2** (GAP-1/2/3, diseño DN1).
3. **F2 — QA de integración** (qa-tester P0–P5) + limpieza RESEED.
4. **F3 — Sincronizar/desplegar** (push BI + push SAMBHS + ClickOnce + flag ON) — **GATED por OK del usuario**.
5. **F4 — Diferidos** (no bloquean): ver §7.

## 4. FASE 0 — Reintegración del WIP sobre master `1c6b46fe` (ejecutor: orquestador Opus)

**Objetivo:** `master` local con AMBOS features (anulación electrónica del compañero + nuestra
tipificación/cierre) compilando 0 errores. **SIN push** (instrucción vigente).

Pasos:
1. Rama de trabajo: `git checkout -b feat/tipificacion-sobre-master master` (NO mergear a master
   directo; master queda limpio hasta F2 verde).
2. `git merge wip/tipificacion-cierre-20260725`. Pronóstico de conflictos (verificado por diffstat de
   ambos lados):

| Archivo | Lado master (anulación) | Lado WIP (nuestro) | Regla de resolución |
|---|---|---|---|
| `Procesos\frmBandejaRegistroVenta.cs` | `EjecutarAnulacionVenta`/`ProcesarAnulacionElectronica` (+267/-169, zona ~372-640 y ~1241+) | campos `_ec*` (~:41), llamada `ActualizarBotonesEgresoCaja()` en el evento de fila activa (~:627), región nueva (~:1229, +139) | **CONSERVAR AMBOS.** La anulación queda intacta; nuestra llamada se re-inserta al final del mismo evento; la región es aditiva al final de la clase. |
| `Procesos\frmRegistroVentaRapida.cs` | cambios anulación/varios (+211/-…) | hook post-cobranza dentro de `Success==1` (+29) + helper `EsTipificacionHabilitada` (+24) | **CONSERVAR AMBOS.** El hook va DESPUÉS de la cobranza al contado y ANTES del bloque `ImpresioDirectaVentaRapida`. |
| `App.config` | +28 líneas (nubefact/detracción) | +2 keys flag | Trivial: unir (añadir nuestras 2 keys). |
| `SAMBHS.Windows.WinClient.UI.csproj` | +13 items (forms nuevos del compañero) | +12 items (nuestras 4 forms) | Trivial: unir ambos ItemGroup. |
| `frmBandejaRegistroVenta.Designer.cs` | (sin cambios en master) | +30 (2 botones) | Tomar WIP. |

3. Compilar: MSBuild `SAMBHS.sln` Debug → **GATE F0-A: 0 errores**.
4. **GATE F0-B (no-regresión):** con flag OFF, grep confirmando que el hook está dentro del guard
   (`EsTipificacionHabilitada`) y que la bandeja arranca con botones `Visible=false`. La prueba
   funcional del binario (venta rápida + bandeja + anular con NC) es del usuario en su VS.
5. Interacción nueva detectada (documentar, NO implementar aquí): la anulación electrónica de master
   centraliza `EjecutarAnulacionVenta` — si se anula una venta EC tipificada, el overlay queda
   huérfano. Mitiga `sp_EgresoCaja_Consistencia` (sp/18:472). Hook opcional en F4-c.

**Rollback F0:** descartar la rama; master intacto; el WIP sigue en su rama.

## 5. FASE 1 — Cerrar CASO 2: receptor auto-derivado + entidades PERSONAL (DN1)

**Cadena:** legacy-negocio (investiga) → db-experto (DDL/SP) → backend-api + bi-frontend (web, en
paralelo tras fijar contrato) → ejecutor SAMBHS (label) → qa-tester (F2). El contrato de BD MANDA.

- **T1.1 (legacy-negocio, SOLO LECTURA, prod): COMPLETADA 2026-07-25.** Evidencia en vivo: 2440 ECA + 25
  ECF (7 meses); beneficiario `v_IdCliente`→`dbo.cliente` = **quien recibe el efectivo** (personal en
  trámites), ~99% persona natural con DNI, **0 documentos vacíos**. `v_IdCliente` FRAGMENTADO por DNI
  (158 DNIs en 217 clientes) → clave estable = **`v_NroDocIdentificacion`**. NO hay cliente genérico
  (solo la propia clínica RUC `20495666973`, 4 ventas → excluir). **Mapeo a systemuser DESCARTADO por
  evidencia**: el "id de usuario" de la venta EC (`i_InsertaIdUsuario`) es el CAJERO, no el beneficiario;
  el beneficiario nunca es systemuser (95.6% solo existen como `dbo.cliente`); la cadena
  systemuser→`TIS_INTEGRADO.dbo.person`→documento devuelve el doc del cajero (placeholders). **La fuente
  del documento del beneficiario es `dbo.cliente.v_NroDocIdentificacion`, directo.**
- **T1.2 (db-experto):** `ddl/16_entidad_personal.sql` idempotente: `conta.entidad` += **`v_Documento
  NVARCHAR(20) NULL`** (clave de dedup del receptor; NO `i_SystemUserId` — descartado por T1.1) +
  índice de apoyo `IX_entidad_doc_tipo` filtrado `WHERE v_Documento IS NOT NULL`. `v_Tipo` NO necesita
  DDL (NVARCHAR sin CHECK, ddl/01:46); se usa el valor nuevo **`'PERSONAL'`** por convención.
- **T1.3 (db-experto):** actualizar `conta.sp_EgresoCaja_Tipificar` (⚠️ portar de `sys.sql_modules`;
  snapshot previo para rollback) rama GASTO: si `@IdProveedor IS NULL AND @IdEntidad IS NULL` → derivar
  receptor del beneficiario: leer `dbo.cliente` por `v.v_IdCliente`; **EXCLUIR** (dejar `@IdEntidad`
  NULL) si `i_IdTipoPersona=2` o `v_NroDocIdentificacion='20495666973'` o nombre vacío; construir nombre
  canónico (natural: `ApePaterno+' '+ApeMaterno+', '+PrimerNombre`; jurídica: `v_RazonSocial`); **upsert
  `conta.entidad` por `v_Documento`=`v_NroDocIdentificacion` con `v_Tipo='PERSONAL'`** (patrón del upsert
  MEDICO sp/18:324-335, pero por documento) → poblar `i_IdEntidad` del overlay. NO poblar systemuser.
  Columnas REALES (verificadas): `dbo.cliente(v_IdCliente,i_IdTipoPersona,i_IdTipoIdentificacion,
  v_NroDocIdentificacion,v_PrimerNombre,v_ApePaterno,v_ApeMaterno,v_RazonSocial)`. Actualizar el .sql del
  repo DESPUÉS de aplicar en prod (prod == repo == HEAD). Probar → evidenciar → limpiar + RESEED.
- **T1.4 (backend-api):** verificación de contrato (posible NO-OP): `sp_Entidad_List` no filtra por
  tipo → los PERSONAL aparecen solos en `frmRegistrarCompra` y el cuadre RS2 ya proyecta `Receptor`.
  Confirmar que ningún endpoint web filtra `v_Tipo` de forma que oculte PERSONAL; exponer `v_Tipo` en
  el DTO de entidades si el front lo necesita para rotular.
- **T1.5 (bi-frontend):** catálogo/uso de entidades en el BI: donde se listan/eligen entidades de
  egreso, soportar y rotular tipo PERSONAL (badge "PERSONAL"). Alcance mínimo: selector de egresos web
  + detalle del cuadre. Verificar con `vite build` (no `check-types`).
- **T1.6 (ejecutor, SAMBHS):** `frmTipificarEgreso` panel GASTO: label informativo
  `"Receptor: <beneficiario> (auto)"` — SIN captura nueva (DN1: cero doble digitación). Nada más.

**GATEs F1 (los corre qa-tester o el orquestador, con siembra/limpieza vía db-experto):**
- G1: tipificar GASTO sin receptor explícito → overlay con `i_IdEntidad` poblado, entidad `PERSONAL`
  creada/reusada (upsert idempotente: 2 egresos del mismo beneficiario → 1 entidad).
- G2: cuadre del día (RS2) muestra `Receptor` con el nombre del personal.
- G3: montos INVARIANTES al centavo en las 6 superficies (re-ejecutar el patrón del test "6
  superficies == monto caja" del sprint C).
- G4: beneficiario genérico → overlay sin entidad, flujo no se rompe.
- G5: web lista la entidad PERSONAL sin romper egresos web existentes.
- Limpieza total + RESEED al MAX vivo (regla del skill db-experto). LIKE sin corchetes en guards.

## 6. FASE 2 — QA de integración (qa-tester, protocolo P0–P5)

P0 salud del stack (lo levanta el ORQUESTADOR: API 5090 detached binario Release + Vite) → P1 contrato
JSON vs API vivo (honorarios `v_Origen`, cuadre `TipoGasto`/`Receptor`) → cifras al centavo (mes
cerrado) → front (`vite build`) → casos de los 3 CASOS end-to-end con datos de prueba sembrados →
limpieza + RESEED + evidencia. Los GATEs de F1 + los GATEs aún abiertos de los planes B/C que
dependían de "prueba real" quedan listados en el reporte de QA como pendientes-de-usuario.

## 7. FASE 3 — Sincronización y despliegue (⚠️ TODA la fase GATED por OK explícito del usuario)

1. **Push BI**: los 5 commits `647d8a4..5ea65f2` + lo nuevo de F1 (commit `feat(conta): ...` del
   orquestador). ⚠️ origin está detrás de prod — prioridad alta.
2. **SAMBHS**: mergear `feat/tipificacion-sobre-master` → `master` local; push a
   `clinicasanlorenzo/Facturacion_New` SOLO con OK (impacta al compañero; coordinar).
3. **Deploy** (del USUARIO, no del ejecutor): compilar en su VS, publicar ClickOnce, **flag ON**
   (`TipificacionEgresoHabilitada=true`, serie `ECA`) en UNA caja asistencial piloto.
   **Rollback:** flag a false (sin recompilar: `TipificacionEgresoSeries` también edita en caliente) o
   restaurar backup.
4. Actualizar memorias (`estado-trabajo-csl`, `modelo-negocio` §Tipificación += DN1-DN3, `infra` mapa
   ddl/16) — puede delegarse a `continual-learning` con digest.

## 8. FASE 4 — Diferidos (documentados, NO ejecutar sin nuevo plan)

a. **Bandeja de tipificación en el BI web** (`sp_EgresoCaja_Bandeja` sp/19:259 ya existe SIN consumidor).
b. **Complemento web del cierre de ciclo**: proveedor/comprobante/Δ en el detalle del cuadre web.
c. **Hook de consistencia en anulación**: al anular venta EC (nueva `EjecutarAnulacionVenta` de master)
   → `sp_EgresoCaja_Destipificar` flag-gated; mientras tanto correr `sp_EgresoCaja_Consistencia` periódico.
d. **RxH del médico en canal caja** (DN2) — sprint chico sobre ddl/12.
e. Crédito fiscal IGV compras de caja (anti-dup `registro_compras` ↔ EC) — sprint aparte (DD2).
f. Doble conteo SISOL (decisión PO pendiente) · g. bug `ContabilidadService.ts:300` sisolList backslashes.

## 9. Reglas duras para el ejecutor (violarlas = parar y reportar)

1. NUNCA DDL/INDEX sobre tablas `dbo` legacy (overlay y catálogos conta = nuestro; referencias a dbo
   son LÓGICAS sin FK, salvo tablas creadas por el BI).
2. SQL Server **2012** (`reglas-sql2012.md`): sin CREATE OR ALTER/STRING_SPLIT/TRIM/DROP IF EXISTS.
3. SPs de prod: portar SIEMPRE desde `sys.sql_modules` (golden #3) — el .sql del repo puede estar detrás.
4. La BD es PRODUCCIÓN: probar → evidenciar → limpiar (RESEED al MAX(id) VIVO).
5. `SigesoftDesarrollo_2`: solo SELECT; jamás `systemuser.v_Password`.
6. El flujo neurálgico del SAMBHS NO se toca: todo detrás del flag, post-commit, degradación segura
   (cualquier fallo de tipificación NUNCA revierte el egreso ya registrado).
7. Montos: el overlay RE-ETIQUETA, jamás cambia cifras (6 consumidores LEFT JOIN + COALESCE;
   `Caja_Diaria` y `CerrarMes` invariantes). Verificar al centavo tras cada cambio de SP.
8. **Nada de push/deploy sin OK explícito del usuario** (F3 completa es gated).
9. Front se verifica con `vite build`; SAMBHS con MSBuild; backup `_backup_<tema>\YYYY-MM-DD\` antes de
   editar forms SAMBHS (aunque ya esté en git, la convención sigue).

## 10. Qué NO hacer

- NO crear `conta.egreso` desde el canal caja (JAMÁS — doble conteo).
- NO cambiar el canal SAMBHS→conta de SP directo a API HTTP (decidido; el SP es el guardián).
- NO exigir plantilla Excel en caja (DN3) ni capturar RxH del médico ahora (DN2).
- NO agregar captura manual de receptor en el form (DN1 = auto-derivación; solo label informativo).
- NO tocar el repo del compañero (`D:\Documentos\GitHub\SAM-csl`) — ya sincronizado hoy.
- NO borrar las ramas de respaldo (`wip/tipificacion-cierre-20260725`, `wip/sam-csl-backup-20260725`)
  hasta que F3 esté verde y verificado.

# PLAN — Tipificación ADITIVA de egresos de caja desde el SAMBHS (desktop)

> **Documento de implementación para ejecutor IA.** Autocontenido: decisiones cerradas del PO,
> arquitectura verificada del SAMBHS (2026-07-19, código + BD viva), contratos exactos, fases con
> GATEs y plan de rollback. Si algo contradice lo que ves en el código/BD vivo, DETENTE y repórtalo
> al orquestador. Elaborado: 2026-07-19. Repo web: `main` @ `647d8a4`.
>
> ⚠️ TRES ADVERTENCIAS CAPITALES:
> 1. **El SAMBHS escribe DIRECTO a producción** (como `sa`, sin API). Todo cambio a su código se
>    prueba con MUCHO cuidado (ver §7 estrategia de pruebas y rollback).
> 2. **El flujo neurálgico del SAMBHS NO SE TOCA**: ni validaciones, ni el orden de bloques de
>    `btnGuardar_Click`, ni los EDMX, ni transacciones existentes. El enganche es UNA llamada
>    aislada post-commit con try/catch total, detrás de un feature flag apagado por defecto.
> 3. **`Facturacion_New\` NO está en git.** Antes de editar CUALQUIER archivo del SAMBHS, copiar
>    los originales a `D:\Projects\PROYECT-CSL\Facturacion_New\_backup_tipificacion\2026-07-19\`
>    (mismo árbol relativo) para rollback manual. Trabajar SOLO sobre la copia RAÍZ
>    (`D:\Projects\PROYECT-CSL\Facturacion_New\`) — la de `Migration-project\` está DESACTUALIZADA
>    (perdería features ya en producción; verificado).

---

## 0. Resumen y decisiones del PO (CERRADAS 2026-07-19 — no re-litigar)

El SAMBHS registra egresos de caja (serie ECA asistencial / ECF farmacia) como venta EC en bruto:
monto + glosa + beneficiario, sin tipificación. Se agrega un **paso ADITIVO al final del guardado**:
un modal de tipificación manual que escribe en `conta` (overlay de clasificación + registro de
honorario cuando aplique). El SAMBHS sigue funcionando idéntico; nuestras superficies (caja, flujo,
dashboards, rentabilidad) pintan la clasificación; y los honorarios pagados por caja alimentan
ADITIVAMENTE el módulo de honorarios web con **anti-doble-pago cross-canal**.

| # | Decisión | Valor |
|---|---|---|
| D1 | Modal de tipificación | **OBLIGATORIO** (sin botón "omitir"). Fallback TÉCNICO único: si la llamada al SP falla (red/BD), mensaje + reintento; si el cajero cierra tras el fallo, el egreso queda "sin tipificar" (= comportamiento actual) y es re-tipificable después. |
| D2 | Honorario médico | Se pide SOLO el **número de comprobante** (boleta de la atención, `SERIE-NNNNNNNN`). El sistema resuelve TODO server-side: servicios (v_ServiceId reales), médico tratante, consultorio, tipo producción CLINICA/SISOL. No se le pide nada más al cajero. |
| D3 | Histórico/backlog | **OTRO SPRINT.** Este plan es solo going-forward. |
| D4 | Catálogo del combo "otro gasto" | **Subset curado** de hojas de `conta.tipo_gasto` (flag nuevo `b_VisibleCaja`), ajustable por BD sin tocar código. |
| D5 | Rollout | **Caja ASISTENCIAL (ECA) primero**, con rollback garantizado y SIN afectar data de producción en las pruebas (feature flag off por defecto + scripts de limpieza+RESEED + des-tipificación). ECF después (solo config). |
| D6 | Anulación web de pagos origen CAJA | **BLOQUEADA** (el dinero salió por la venta EC; anular desde la web no lo devuelve). |

### Fuera de alcance
Backlog histórico (D3); bandeja de tipificación en el BI; publicar el ClickOnce a las cajas (el
**publish/deploy lo decide y ejecuta el usuario** — regla del proyecto: nada de despliegues sin
instrucción explícita); hook en la anulación de ventas del SAMBHS (se cubre con el chequeo de
consistencia); enganche en `frmRegistroVenta` (la completa) — hoy el 100% de egresos pasa por la
Rápida (verificado); tocar ingresos/cobranza espejo.

---

## 1. Arquitectura verificada (referencia del ejecutor)

### 1.1 SAMBHS (desktop)
- WinForms .NET Framework 4.5 + Infragistics + EF4 (EDMX), 2 capas, SQL directo.
- Solución: `D:\Projects\PROYECT-CSL\Facturacion_New\SAMBHS.sln` (53 proyectos). UI:
  `Node\WinClient\SAMBHS.Windows.WinClient.UI`. Compila (build_log nov-2025; MSBuild 4.8).
- Config: `App.config` del proyecto UI (dev) y `bin\Debug\...exe.config` (PRODUCCIÓN:
  `190.116.90.35\CSL_2025 / 20505310072`). appSettings relevantes: `ConexionSAM` (SqlConnection
  cruda a la BD principal — **la vía para llamar nuestros SPs conta**), `ConexionSigesoft`.
- Deploy: ClickOnce (share `\\Win-ctkekemms3v\ti_soluciones\Actualizaciones\`, auto-update 4 min).
- **Flujo del egreso** (`Procesos\frmRegistroVentaRapida.cs`, 5,111 líneas):
  - Botón "EGRESO CLINICA" (`ultraButton8_Click` L4922-4931): doc 502, serie ECA, agente 2.
    ECF=504 (solo usuario FARMACIA). Beneficiario vía `txtRucCliente_KeyDown` (L367-434).
  - `btnGuardar_Click` (L544): validaciones → modal confirmación → `VentaBL.InsertarVenta`
    (L894; TransactionScope: venta+detalle+pendiente+correlativo+almacén; `v_IdVenta` client-side
    de `dbo.secuential`) → **commit** → `if (objOperationResult.Success == 1)` (L909) →
    `RealizaCobranzaAlContado` (L959-976, transacción APARTE — por eso todo egreso tiene cobranza
    espejo) → Nubefact/updates Sigesoft (no aplican a EC) → fin (L1117).
  - **📍 PUNTO DE ENGANCHE: después del bloque de cobranza al contado (~L976), dentro del
    `Success==1`, condicionado a doc ∈ {502,504} y al feature flag.** JAMÁS antes de L967 (se
    saltearía la cobranza y rompería el invariante "100% egresos con cobranza").
  - Datos en memoria en ese punto: `_ventaDto.v_IdVenta`, `txtSerieDoc/_Comprobante`,
    `cboDocumento.Value`, `_ventaDto.d_Total`, glosa en `grdData`, `_ventaDto.v_IdCliente` +
    `txtRazonSocial/txtRucCliente`, `Globals.ClientSession.i_SystemUserId/.v_UserName`,
    `dtpFechaRegistro.DateTime`.
- Patrones reutilizables: modal `Procesos\frmConfirmacionForm.cs` (POCO + ShowDialog), buscadores
  (`frmBuscarCliente`), combos `Utils.Windows.LoadUltraComboList`, precedente de query a médicos
  en `SAMBHS.Windows.SigesoftIntegration.UI\BLL\ServiceBL.cs`.

### 1.2 Modelo de datos (BD viva)
- Egreso EC = `dbo.venta` (doc 502/504, `i_Naturaleza=3`) + 1 línea `ventadetalle` (glosa en
  `v_DescripcionProducto`, monto bruto `d_PrecioVenta`); beneficiario = `venta.v_IdCliente` (100%).
  `dbo.cajamayor_movimiento` es DERIVADO (generador + poller recon; PK inestable — rebuild diario).
- **Ancla estable: `venta.v_IdVenta`** (⚠️ los reportes divergen en el tipo exacto — NCHAR(16) vs
  NCHAR(32); el ejecutor VERIFICA en `sys.columns` en FASE 0 y usa el real; guardar SIEMPRE
  `LTRIM(RTRIM(...))`; en `cajamayor_movimiento` es NVARCHAR(100), poblado 100%, 1:1).
- Honorarios conta: `pago_honorario` (0 filas hoy; SIN campo origen → DDL), hija
  `pago_honorario_consultorio.i_IdEgreso` **ya NULLable**; candado `UX_pago_hon_serv_activo`
  (único filtrado sobre `v_ServiceId` WHERE b_Anulado=0). `esPagado` del análisis lee DUAL
  (`pago_honorario_servicio` + `servicespaiddetails`). PH-N se deriva del identity (no es columna).
- Catálogos: `tipo_gasto` 9 raíces (v_SeccionFlujo) + 52 hojas; `centro_costo` (CC-ASIS=2→tc1,
  CC-FARM=4→tc6, CC-SISOL=6→tc3; resolver SIEMPRE por `v_Codigo`); consultorios = catálogo 403.
- Consumidores del dinero EC (8): `sp_Caja_Egresos`, `sp_Caja_CuadreDia` (RS2), `sp_Caja_Diaria`,
  `sp_Caja_FlujoConsolidado`, `sp_Caja_FlujoDetallado` (bucket MED-LEG), `sp_Caja_CerrarMes`,
  `fn_Rentabilidad_Gastos` (3ª fuente), `fn_Dash_EgresoBase`. **Todos suman también `conta.egreso`**
  → un honorario-caja JAMÁS crea `conta.egreso` (doble conteo).
- Puente comprobante→servicio (mismo del análisis web): `venta(SERIE-NNNNNNNN)` ↔ token de
  `SigesoftDesarrollo_2.dbo.service.v_ComprobantePago` (multi-token `|`, con padding — tokenizar
  con `spt_values` + CASE anti-"Invalid length"); médico = `servicecomponent.i_MedicoTratanteId`
  (acotar `sc.d_InsertDate`); consultorio = `protocol.i_Consultorio`→403; tipo =
  `protocol.i_MasterServiceTypeId` (9→CLINICA / 42→SISOL). Correlativos SIEMPRE 8 dígitos zero-pad.

### 1.3 Reglas duras (todas las fases)
SQL 2012 (sin CREATE OR ALTER/STRING_SPLIT/TRIM/DROP IF EXISTS; ver `reglas-sql2012.md`);
NUNCA DDL sobre `dbo`; `SigesoftDesarrollo_2` solo SELECT; jamás `v_Password`; hecho de oro #3
(comparar `modify_date` antes de editar un SP); db-console para aplicar (`--write --file`, UTF-8
sin BOM, DROP+GO+CREATE); el contrato de BD manda (columnas → DTOs → TS, PascalCase); front se
verifica con `vite build`; el stack 5090/5173 lo levanta el ORQUESTADOR; probar → evidenciar →
LIMPIAR (RESEED al MAX vivo; ojo corchetes en LIKE de guards — usar `%...%`).

---

## 2. Diseño definitivo — BD conta

### 2.1 DDL (`ddl/14_tipificacion_egreso_caja.sql` — un solo archivo, 3 secciones)

**A. Overlay `conta.egreso_caja_clasificacion`** (relabel del dinero legacy):
- `i_IdClasificacion INT IDENTITY PK`
- `v_IdVenta <tipo real de venta.v_IdVenta> NOT NULL` + **UNIQUE** (idempotencia; guardar trimmed)
- `v_TipoEgreso NVARCHAR(10) NOT NULL CHECK IN ('GASTO','HONORARIO')`
- `i_IdTipoGasto INT NOT NULL` FK `conta.tipo_gasto` (hoja; HONORARIO → MED-HON)
- `i_IdCentroCosto INT NOT NULL` FK `conta.centro_costo`
- `i_IdProveedor INT NULL` FK `dbo.proveedores`; `i_IdEntidad INT NULL` FK `conta.entidad`
- `i_IdConsultorio INT NULL` (ref lógica 403; poblar en HONORARIO mono-consultorio)
- `i_IdPago INT NULL` FK `conta.pago_honorario` (vínculo cuando HONORARIO)
- `v_Estado NVARCHAR(10) NOT NULL DEFAULT 'ACTIVO' CHECK IN ('ACTIVO','ANULADO')`
- Auditoría estándar (`i_InsertaIdUsuario` = systemuser del cajero, `t_InsertaFecha`, actualiza).
- La regla "raíz ≠ OTROS_INGRESOS" se valida EN EL SP (CHECK con subquery no existe en 2012).

**B. `conta.pago_honorario` (ALTER aditivo)**:
- `v_Origen NVARCHAR(10) NOT NULL DEFAULT 'WEB'` + CHECK `IN ('WEB','CAJA')`
- `v_IdVentaCaja <tipo real> NULL` (la venta EC que pagó)
- Índice **único filtrado**: `WHERE v_IdVentaCaja IS NOT NULL AND v_Estado = 'PAGADO'`.

**C. `conta.tipo_gasto` (ALTER aditivo)**: `b_VisibleCaja BIT NOT NULL DEFAULT 0` + UPDATE seed del
subset curado (resolver por `v_Codigo`, reportar ids): `ADM-TRA` (transporte/pasajes), `ADM-ATP`
(atención al personal/almuerzos), `MED-SUM`, `MED-INS`, `ADM-OTR`, más 2-3 hojas operativas que el
ejecutor proponga de las 52 (p.ej. mantenimiento/servicios básicos si existen). **MED-HON NO va en
el combo GASTO** (el honorario entra por su rama D2); se marca `b_VisibleCaja=0`. Ninguna hoja de
raíz OTROS_INGRESOS se marca jamás.

### 2.2 SPs nuevos (`sp/18_tipificacion_egreso_caja.sql`)

**`conta.sp_EgresoCaja_ResolverComprobante (@Comprobante NVARCHAR(30))`** — solo lectura, para el
modal. Normaliza (LTRIM/RTRIM/UPPER, correlativo padStart 8). Busca la venta de la ATENCIÓN
(BD principal, `i_Eliminado=0`) por serie+correlativo → Puente A (tokenizador del patrón
`sp_Honorarios_Analisis`, acotado a UNA boleta) → services. RS1 (una fila por servicio):
`v_ServiceId, NombreServicio, FechaAtencion, Precio, MedicoId, MedicoNombre, ConsultorioId,
ConsultorioNombre, TipoProduccion ('CLINICA'|'SISOL'), EsPagado (dual: pago_honorario_servicio
activo + servicespaiddetails)`. Errores claros: comprobante no encontrado / venta anulada / sin
services vinculados. NO muta nada.

**`conta.sp_EgresoCaja_Tipificar`** — la escritura, UNA transacción `SET XACT_ABORT ON`:
- Params: `@IdVenta` (egreso EC), `@Tipo ('GASTO'|'HONORARIO')`, `@IdUsuario INT`,
  GASTO: `@IdTipoGasto`, `@IdProveedor NULL`, `@IdEntidad NULL`;
  HONORARIO: `@Comprobantes NVARCHAR(500)` (CSV de boletas — re-resolver SERVER-SIDE, no confiar
  en listas del cliente).
- **Validación del egreso** (guardián único — SAMBHS entra como `sa`): la venta @IdVenta existe,
  `i_IdTipoDocumento IN (502,504)`, `i_Eliminado=0`, `d_Total > 0`. Cero SQL dinámico.
- **Idempotencia**: `IF EXISTS (overlay ACTIVO para @IdVenta)` → devolver ids existentes y RETURN
  (respuesta idéntica para el reintento con ACK perdido). Carrera → el UNIQUE revienta 2627 y el
  CATCH devuelve el existente.
- Rama **GASTO**: validar tipo_gasto hoja + `b_VisibleCaja=1` + raíz ≠ OTROS_INGRESOS. Centro =
  el `centro_costo` cuyo `i_IdTipoCaja` = tipocaja del egreso (ECA→CC-ASIS, ECF→CC-FARM), por
  `v_Codigo`/join, no hardcode. INSERT overlay + auditoría (`Detalle='CAJA:<v_IdVenta>'`).
- Rama **HONORARIO**: re-resolver los comprobantes (mismo motor del Resolver) → validar:
  ≥1 servicio; **mono-médico** (todos los services del mismo `MedicoId`, si no error listando);
  **anti-mixto** (todos mismo TipoProduccion); **ninguno EsPagado** (si no, error con lista).
  Entonces: (1) upsert `conta.entidad` MEDICO por nombre (patrón del Insert web); (2) INSERT
  `pago_honorario`: `v_Origen='CAJA'`, `v_IdVentaCaja=@IdVenta`, médico, periodo = min/max
  FechaAtencion, `d_TotalServicios = Σ Precio`, `d_TotalPago = venta.d_Total` (lo que salió de
  caja), `t_FechaPago = fecha de la venta EC`, `v_Estado='PAGADO'`, `v_TipoProduccion`,
  `v_Glosa = glosa del egreso`; (3) consultorios agrupados con **`i_IdEgreso = NULL`** y prorrateo
  del TotalPago por monto de servicios (patrón exacto del Insert web, residuo al mayor);
  (4) servicios en `pago_honorario_servicio` (heredan el candado UX); (5) overlay: MED-HON +
  centro CC-ASIS/CC-SISOL según TipoProduccion (por `v_Codigo`), `i_IdConsultorio` si es único,
  `i_IdPago`, `i_IdEntidad` del médico; (6) auditoría. **JAMÁS llama `sp_Egreso_Insert`** (el
  paso 6 del flujo web NO existe aquí — el dinero ya salió por la venta EC).
- Output: RS con `i_IdClasificacion, i_IdPago (NULL si GASTO), 'PH-'+id si aplica`.

**`conta.sp_EgresoCaja_Destipificar (@IdVenta, @IdUsuario, @Motivo)`** — rollback quirúrgico:
overlay → ANULADO; si tiene `i_IdPago` origen CAJA → pago ANULADO + servicios `b_Anulado=1` +
auditoría. Solo aplica a clasificaciones ACTIVO; idempotente.

**`conta.sp_EgresoCaja_Consistencia`** (lectura, para GATEs/ops): lista clasificaciones ACTIVO
cuya venta EC está `i_Eliminado=1` (huérfanas de dinero → candidatas a des-tipificar).

### 2.3 SPs modificados
1. **`sp_PagoHonorario_Anular`** (`sp/11`): al inicio, `IF v_Origen='CAJA' RAISERROR('Este pago se
   registró desde caja (SAMBHS). Anúlelo desde el proceso de caja (des-tipificación).')` (D6).
2. **`sp_PagoHonorario_List` y `_Get`** (`sp/11`): proyectar `v_Origen` (para el badge web).
   `_Get` ya es NULL-safe con egreso NULL (verificado).
3. **Los 6 consumidores** (relabel): `LEFT JOIN conta.egreso_caja_clasificacion ov ON
   LTRIM(RTRIM(cm.v_IdVenta)) = ov.v_IdVenta AND ov.v_Estado='ACTIVO'` y:
   - `fn_Rentabilidad_Gastos` (`sp/05`): centro = `COALESCE(ov.i_IdCentroCosto, cc.i_IdCentroCosto, 1)`.
   - `sp_Caja_Egresos` (`sp/04`): sección = raíz del `ov.i_IdTipoGasto` (CTE tg_root existente),
     fallback 'MEDICO'; centro ídem.
   - `sp_Caja_FlujoConsolidado` (`sp/04`): sección por overlay, fallback 'MEDICO'.
   - `sp_Caja_FlujoDetallado` (`sp/04`): RS3 agrupar lo clasificado por hoja real
     (`tg.v_Codigo/v_Nombre`) + receptor (entidad/proveedor); lo NO clasificado sigue en MED-LEG.
   - `sp_Caja_CuadreDia` (`sp/04`): RS2 rama 3 += TipoGasto/receptor del overlay (columnas nuevas
     al FINAL del resultset; centro/unidad por COALESCE).
   - `fn_Dash_EgresoBase` (`fn/14`): Categoria = `COALESCE(RootNombre, 'EGRESO CAJA '+unidad)`;
     unidad/IdTipoCaja vía centro overlay con fallback.
   - `sp_Caja_Diaria` y `sp_Caja_CerrarMes`: **CERO CAMBIOS** (solo totales).

---

## 3. Diseño definitivo — SAMBHS (paso aditivo)

### 3.1 Feature flag (appSettings del proyecto UI)
- `TipificacionEgresoHabilitada` = `false` (default — con false NADA cambia en el SAMBHS).
- `TipificacionEgresoSeries` = `ECA` (D5: asistencial primero; ECF después = editar config, sin código).
- Leer con `ConfigurationManager.AppSettings` + parse defensivo (ausente ⇒ false).

### 3.2 Formulario nuevo `Procesos\frmTipificarEgreso.cs` (+ .Designer.cs)
- Constructor: `(string idVenta, decimal monto, string glosa, string beneficiario, int usuarioId)`.
- Cabecera solo-lectura: comprobante del egreso, monto, glosa, beneficiario.
- **Radio "Honorario médico" | "Otro gasto"** (default según heurística visual NINGUNA — elige el cajero):
  - **Honorario**: textbox "Nro de comprobante de la atención" + botón **Buscar** →
    `sp_EgresoCaja_ResolverComprobante` → grid solo-lectura (servicio, fecha, precio, médico,
    consultorio, tipo, pagado sí/no) + posibilidad de agregar MÁS comprobantes a la lista (una
    cirugía puede abarcar varios). Si algún servicio ya está pagado o hay mezcla de médicos/tipos,
    mostrar el error del SP y no habilitar Confirmar.
  - **Otro gasto**: combo (Infragistics `LoadUltraComboList` o combo simple) cargado con
    `SELECT i_IdTipoGasto, v_Nombre FROM conta.tipo_gasto WHERE b_VisibleCaja=1 AND b_Activo=1
    ORDER BY v_Nombre` (SqlCommand vía `ConexionSAM`; cachear en static tras 1ª carga).
- Botón **Confirmar** → `sp_EgresoCaja_Tipificar` (SqlCommand, `CommandType.StoredProcedure`,
  timeout 30s, parámetros tipados; SIN transacción client-side — el SP la maneja). Éxito → cerrar.
- **Obligatorio (D1)**: sin botón "Omitir". `ControlBox=false` / cancelar deshabilitado. ÚNICA
  salida sin tipificar: fallo técnico del SP → MessageBox con el error + botones Reintentar /
  Cerrar ("El egreso quedó registrado; la tipificación queda pendiente") — el egreso NUNCA se
  revierte por esto.
- Cero dependencias nuevas: solo `System.Data.SqlClient` + Infragistics ya referenciados.

### 3.3 Enganche en `frmRegistroVentaRapida.btnGuardar_Click`
Insertar DESPUÉS del bloque de cobranza al contado (~L976), dentro del `Success==1`:
```csharp
// [ADITIVO 2026-07] Tipificacion de egresos de caja (conta). Flag apagado => no-op.
try {
    if (EsTipificacionHabilitada(txtSerieDoc.Text)   // flag + serie en TipificacionEgresoSeries
        && (idDoc == 502 || idDoc == 504)) {
        using (var f = new frmTipificarEgreso(_ventaDto.v_IdVenta, _ventaDto.d_Total,
                    /*glosa del grid*/, txtRazonSocial.Text, Globals.ClientSession.i_SystemUserId))
            f.ShowDialog(this);
    }
} catch (Exception exTip) {
    MessageBox.Show("El egreso se registró correctamente, pero la tipificación falló: "
        + exTip.Message + ". Podrá tipificarse después.", "Tipificación", ...);
}
```
- `EsTipificacionHabilitada` = helper privado nuevo en el mismo form (lee los 2 appSettings).
- **NADA MÁS se toca en el form**: ni validaciones, ni `_TempDetalle`, ni el orden de bloques, ni
  la impresión. Es UNA llamada con try/catch total (mismo patrón de los pasos best-effort vecinos).

### 3.4 Build
`MSBuild SAMBHS.sln /t:SAMBHS_Windows_WinClient_UI /p:Configuration=Debug` (o el target del
proyecto UI + sus dependencias). Warnings preexistentes son normales (build_log nov-2025). **NO
publicar ClickOnce** — el publish lo hace el usuario cuando decida el rollout.

---

## 4. Diseño — módulo web (complementos menores)

- **API** (`backend-api`): DTOs de List/Get de honorarios += `Origen` (string). Nada más (los
  endpoints no cambian de ruta ni de forma).
- **Front** (`bi-frontend`): `contaTypes.ts` += `Origen` en los tipos de pago; `Honorarios.tsx`
  badge **"PAGADO POR CAJA"** (ámbar) en lista y detalle cuando `Origen==='CAJA'`; en el detalle,
  la sección de egresos muestra "Egreso: pagado por caja (SAMBHS)" cuando no hay egresos; ocultar
  el botón Anular para pagos CAJA (el SP igual lo rechaza — defensa en profundidad); recibo PDF:
  tolerar egreso NULL (no romper; opcionalmente pie "pagado por caja").

---

## 5. Fases de ejecución

> Cadena: F0-F2 db-experto → F3 backend-api + bi-frontend (paralelo) → F4 backend-api (SAMBHS)
> → F5 qa-tester/db-experto → verificación manual WinForms por el USUARIO → cierre.
> NO avanzar con un GATE rojo. Commits solo del repo web/models-DB (el SAMBHS no está en git:
> backup manual §0-advertencia-3 + diff reportado).

### FASE 0 — Preflight (db-experto, solo lectura)
1. `modify_date` vs repo de: `sp/04` (4 SPs), `sp/05`, `sp/11`, `fn/14` (hecho de oro #3).
2. Tipo REAL de `dbo.venta.v_IdVenta` en `sys.columns` (los reportes divergen 16/32) — fija el
   tipo de las columnas nuevas.
3. Resolver por `v_Codigo` los ids del subset curado de tipo_gasto (lista §2.1-C) y confirmar
   centro_costo por tipocaja (1→CC-ASIS, 6→CC-FARM) y CC-SISOL.
4. **Baseline de cifras** (jun-2026 y jul-2026 parcial): totales de `fn_Rentabilidad_Gastos`,
   `sp_Caja_Egresos`, `sp_Caja_FlujoConsolidado` (SaldoDeCaja), `sp_Caja_CuadreDia` (un día con
   egresos), KPIs de dashboards. Se usan en el GATE 2 (invariancia).
**GATE 0**: sin divergencias (o portadas), tipos/ids confirmados, baseline capturado.

### FASE 1 — DDL + SPs nuevos + guard de anulación (db-experto)
`ddl/14` (§2.1) + `sp/18` (§2.2) + cambios de `sp/11` (§2.3-1,2). Aplicar con db-console;
repo == prod. Pruebas unitarias del SP con un egreso EC REAL de un mes cerrado:
- `ResolverComprobante` con una boleta real de cardiología jun (debe devolver médico/consultorio/
  tipo/pagado correctos — cotejar contra `sp_Honorarios_Analisis`).
- `Tipificar` GASTO sobre un egreso real → overlay creado; **re-llamada idéntica → idempotente**
  (mismos ids, sin duplicado).
- `Tipificar` HONORARIO con boleta real NO pagada → pago CAJA + servicios + overlay MED-HON;
  intento de re-pago WEB del mismo servicio → bloqueado; `esPagado=1` en el análisis.
- `sp_PagoHonorario_Anular` sobre el pago CAJA → rechazado con el mensaje (D6).
- `Destipificar` → todo ANULADO; **limpieza final + RESEED** (par maintenance
  `2026-07-XX_test_tipificacion_caja.sql` + `_limpiar.sql`; RESEED al MAX vivo; guards LIKE sin
  corchetes). Estado final == inicial.
**GATE 1**: los 6 puntos anteriores con evidencia; `conta.egreso` sigue en su estado previo;
cero filas de prueba remanentes.

### FASE 2 — Relabel de los 6 consumidores (db-experto)
§2.3-3. Aplicar y verificar:
**GATE 2**: (a) con overlay VACÍO: TODAS las cifras == baseline de FASE 0 **al centavo** (jun y
jul); (b) sembrar 1 clasificación GASTO (ADM-TRA) sobre un egreso real de jul vía el SP →
`sp_Caja_Egresos`/FlujoConsolidado mueven ese monto de MEDICO→ADMIN **sin cambiar el total**;
FlujoDetallado lo saca de MED-LEG a la hoja ADM-TRA; CuadreDia lo muestra tipificado; Dashboard
cambia la categoría; `fn_Rentabilidad_Gastos` conserva el total del mes; (c) `Destipificar` →
todo vuelve al baseline al centavo; limpieza verificada.

### FASE 3 — Módulo web (backend-api + bi-frontend, EN PARALELO tras GATE 1)
§4. Build API limpio + `vite build` verde.
**GATE 3**: List/Get exponen `Origen`; badge y ocultamiento de Anular por lectura de código;
regresión: pagos WEB idénticos (si hay 0 pagos, verificar por forma del JSON).

### FASE 4 — SAMBHS UI (backend-api como ejecutor C#; trabajar en `D:\Projects\PROYECT-CSL\Facturacion_New\`)
1. **Backup previo** (§0-advertencia-3) de `frmRegistroVentaRapida.cs` y `App.config`.
2. Crear `frmTipificarEgreso` (§3.2) + helper flag + enganche (§3.3) + appSettings (§3.1, flag
   **false**).
3. `MSBuild` del proyecto UI → **compila sin errores nuevos** (comparar contra build_log).
4. **PROHIBIDO**: ejecutar el .exe resultante contra producción, publicar ClickOnce, tocar
   cualquier otro form/BL/EDMX, o cambiar el `.exe.config` de `bin\Debug`.
**GATE 4**: build verde; diff EXACTO reportado (archivos nuevos + líneas insertadas en el form —
el enganche debe ser UNA llamada + un helper + un using); con flag=false el flujo es byte-idéntico
al actual (verificable por lectura: el único código nuevo está detrás del flag).

### FASE 5 — QA de integración (qa-tester + db-experto)
- Re-corre GATE 2(a): cifras == baseline (overlay vacío tras las limpiezas).
- E2E BD-side completo (sin WinForms): secuencia Tipificar HONORARIO real → verificar las 8
  superficies + análisis web (`esPagado`) + List/Get con badge (vía API viva) + bloqueo de
  anulación web → Destipificar → baseline. Todo con el par maintenance + RESEED.
- `sp_EgresoCaja_Consistencia` devuelve 0 filas.
- Regresión: honorarios WEB (flujo del sprint plantilla) intacto; poller de reconciliación corre
  sin cambios (`fn_CajaRecon_Huella*` no tocadas).
**GATE 5**: todo verde, cero residuo en prod.

### Verificación manual del USUARIO (post-plan, fuera del sprint del ejecutor)
El flujo WinForms real (modal, combos, resolver) se prueba con el exe compilado en UNA caja
asistencial con el flag encendido — decisión y ejecución del usuario (publish ClickOnce incluido).
El plan de rollback (§7) queda listo antes.

### Cierre
Commits del orquestador (BD `ddl/14`+`sp/18`+consumidores; web API+front; el PLAN) + push con
aprobación; el diff del SAMBHS se entrega como reporte + backup (sin git). Digest a
continual-learning.

---

## 6. Casos de prueba clave (FASES 1-2-5)

| # | Caso | Esperado |
|---|---|---|
| 1 | Tipificar GASTO (ADM-TRA) egreso ECA real | overlay ACTIVO; sección MEDICO→ADMIN en caja/flujo; totales invariantes |
| 2 | Re-llamar Tipificar mismo @IdVenta | idempotente: mismos ids, sin duplicados |
| 3 | Tipificar HONORARIO boleta válida no pagada | pago CAJA (egreso NULL) + servicios + overlay MED-HON/CC-ASIS; PH-N en List con Origen=CAJA |
| 4 | Boleta con servicios YA pagados | error con lista de ofensores; nada escrito |
| 5 | Boletas de 2 médicos distintos | error mono-médico; nada escrito |
| 6 | Boletas CLINICA+SISOL mezcladas | error anti-mixto; nada escrito |
| 7 | Re-pago WEB de un servicio pagado por CAJA | bloqueado (SP + UX índice); esPagado=1 en análisis |
| 8 | Anular pago CAJA desde la web | RAISERROR con mensaje D6; front oculta el botón |
| 9 | Tipificar venta inexistente / doc ≠ 502/504 / eliminada | rechazo limpio |
| 10 | Tipo de gasto no-hoja / no visible / raíz OTROS_INGRESOS | rechazo limpio |
| 11 | Destipificar | overlay+pago ANULADOS, servicios liberados, cifras vuelven al baseline |
| 12 | Consistencia con venta eliminada post-tipificación (simular con una anulada real histórica NO — solo verificar la query en vacío) | `sp_EgresoCaja_Consistencia` la listaría; 0 filas al cierre |
| 13 | Overlay vacío (flag off, ninguna tipificación) | TODAS las superficies == baseline al centavo |
| 14 | Comprobante sin pad / minúsculas en el Resolver | normaliza y resuelve |

## 7. Rollback (D5 — garantizado en 3 niveles)

1. **SAMBHS**: flag `TipificacionEgresoHabilitada=false` (config, sin recompilar) → comportamiento
   100% actual. Rollback total de código: restaurar desde `_backup_tipificacion\`.
2. **Datos**: `sp_EgresoCaja_Destipificar` por registro (quirúrgico); scripts maintenance de las
   pruebas con limpieza+RESEED (nada de prueba sobrevive).
3. **BD/objetos**: los consumidores con overlay vacío son equivalentes al comportamiento previo
   (GATE 2a lo prueba); revert por git (`models-DB/script-conta/`) + re-aplicar con db-console si
   hiciera falta.

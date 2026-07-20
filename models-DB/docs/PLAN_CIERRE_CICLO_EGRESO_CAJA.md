# PLAN — Cierre de ciclo del egreso de caja SAMBHS (Tipo de gasto editable + Registrar compra)

> **Documento de implementación para ejecutor IA.** Continúa `PLAN_TIPIFICACION_EGRESOS_SAMBHS.md`
> (ese sprint ya está aplicado: overlay `conta.egreso_caja_clasificacion`, SPs `sp/18`, relabel de
> los 6 consumidores, `frmTipificarEgreso` + enganche en la venta rápida). Este plan añade el
> **2º momento del egreso** (documentar la compra) y hace la tipificación **invocable a discreción
> y editable** desde la bandeja de ventas. 100% ADITIVO. Elaborado 2026-07-19. Repo web `main` @ `f4b692c`.
>
> ⚠️ Heredadas del plan predecesor (siguen vigentes, releerlas): el SAMBHS escribe DIRECTO a
> producción como `sa`; el flujo neurálgico NO se toca (enganches aislados, detrás del feature flag);
> `Facturacion_New\` NO está en git → **backup previo** a `_backup_tipificacion\2026-07-19\` (ya existe)
> antes de editar; trabajar SOLO en la copia RAÍZ (no `Migration-project\`); no ejecutar el .exe contra
> prod, no publicar ClickOnce (deploy = decisión del usuario).

---

## 0. Objetivo y decisiones del PO (CERRADAS 2026-07-19)

Convertir el egreso de caja —hoy "monto + glosa + beneficiario"— en un egreso **contablemente
completo**, con paridad funcional al egreso web (`conta.egreso`), en **dos momentos**:
- **T1 — Tipo de gasto** (ya existe `frmTipificarEgreso`; ahora también editable a discreción).
- **T2 — Registrar compra** (NUEVO): cuando el comprador vuelve con el comprobante del proveedor,
  se captura proveedor/entidad + tipo doc + serie-número + fecha + bruto/IGV.

**Principio rector (no negociable): ENRIQUECER el overlay, JAMÁS crear `conta.egreso`.** El egreso EC
ya se suma en las 8 superficies (`cm.d_Total`); crear un `conta.egreso` duplicaría. Es la simetría
inversa del flujo Compras-web (que sí crea espejo porque `registro_compras` no se suma). Este trabajo
es el **gemelo de la rama HONORARIO** (que ya cierra con pago `v_Origen=CAJA` e `i_IdEgreso=NULL`),
ahora para la rama **GASTO**.

| # | Decisión | Valor |
|---|---|---|
| DD1 | Monto del comprobante ≠ efectivo | **La caja MANDA el monto** (`cm.d_Total`, lo que suman las superficies). El comprobante guarda su propio `d_MontoBrutoCompra`/`d_IGVCompra` como dato documental. Se expone un **flag/columna de diferencia** (`bruto comprobante − monto caja`) para auditoría. NUNCA se sobrescribe ni ratea el monto de caja. |
| DD2 | IGV | **INFORMATIVO**. Se guarda `d_IGVCompra` en el overlay; NO entra a `registro_compras` ni cuenta como crédito fiscal (evita el doble conteo). El crédito fiscal real queda para un sprint aparte. |
| DD3 | Maestro de proveedor | **`dbo.proveedores`** (el del BI, `id_proveedor` INT — al que ya apunta `overlay.i_IdProveedor` y el egreso web). Alta **on-demand** (RUC 11 díg + razón social, como el alta rápida web); sin migración masiva desde `dbo.cliente`. También se admite receptor = **`conta.entidad`** (catálogo). |
| DD4 | Tipo de gasto editable | `frmTipificarEgreso` se invoca desde la bandeja: **inserta** si el egreso no está tipificado, **edita** si ya lo está. |

### Fuera de alcance
- Crédito fiscal / `dbo.registro_compras` (DD2). Migración masiva de proveedores. Backlog histórico.
- Enganche automático en la anulación de ventas del SAMBHS (se cubre con `sp_EgresoCaja_Consistencia`
  + un chequeo periódico, no un hook en el flujo neurálgico).
- Publicar el ClickOnce / encender el flag en cajas (decisión y ejecución del usuario).

---

## 1. Estado actual (base verificada — no re-investigar)

- **Overlay `conta.egreso_caja_clasificacion`** (0 filas en prod, flag OFF): tiene `v_IdVenta` **NCHAR(16)**
  (⚠️ el tipo real; verificado en el sprint previo — un reporte lo llamó 32, es 16), `UX_ecc_venta_activo`
  (único filtrado `WHERE v_Estado='ACTIVO'`), `v_TipoEgreso` (GASTO|HONORARIO), `i_IdTipoGasto`,
  `i_IdCentroCosto`, **`i_IdProveedor`** (ref lógica `dbo.proveedores`), **`i_IdEntidad`** (FK `conta.entidad`),
  `i_IdConsultorio`, `i_IdPago`, `v_Estado`, `v_Glosa`, auditoría. **NO tiene campos de comprobante.**
- **SPs `sp/18`**: `sp_EgresoCaja_Tipificar` (insert idempotente: si hay ACTIVO devuelve ids y RETURN, NO
  edita), `_ResolverComprobante` (lectura, resuelve boleta→servicios), `_Destipificar` (rollback),
  `_Consistencia` (ACTIVO con venta `i_Eliminado=1`).
- **Egreso web `conta.egreso`** (referencia de paridad, 25 col): obligatorio = receptor(prov XOR ent) +
  `t_FechaDocumento` + `v_TipoDocumento` + `i_IdCentroCosto` + `i_IdTipoGasto` + `d_MontoBruto`; CHECK
  `d_MontoBruto = d_MontoNeto + d_IGV`. `sp_Egreso_Insert`/`_Update` (repo == prod 07-13).
- **Grid host = `frmBandejaRegistroVenta.cs`** (SAMBHS): ya lista egresos EC (niega `d_Total` para docs
  500/502/504/509/510/511); carga por `VentaBL.ListarBusquedaVentas` (EF, `VentaBL2.cs:354`); tiene
  Editar (`frmRegistroVenta("Edicion")`) y Eliminar/Anular. Columnas del row incluyen `v_IdVenta`,
  `i_IdTipoDocumento`, `d_Total`, `NombreCliente`, `v_UsuarioCreacion`.
- **`frmTipificarEgreso.cs`** actual: ctor `(idVenta, monto, glosa, beneficiario, usuarioId)`, escribe vía
  `ConexionSAM` (Initial Catalog=20505310072 → `conta.sp_*` directo). Feature flag
  `TipificacionEgresoHabilitada` (App.config, hoy false) + `TipificacionEgresoSeries="ECA"`.
- **Proveedor**: `dbo.proveedores` (BI, int, 18 filas) con CRUD del BI; el SAMBHS hoy usa OTRO maestro
  (`dbo.cliente` flag 'V', 101, varchar) — **NO se usa** aquí (DD3 fija `dbo.proveedores`).
- **`dbo.registro_compras`**: NO se toca (DD2); su `id_movimiento_egreso` apunta a caja mayor (int), no
  a la venta EC — otra razón para no usarla.

---

## 2. Diseño — BD conta (aditivo; schema conta = nuestro)

### 2.1 ALTER overlay (`ddl/15_egreso_caja_compra.sql`)
Columnas nuevas en `conta.egreso_caja_clasificacion` (todas NULL, aditivas):
| Columna | Tipo | Rol |
|---|---|---|
| `v_TipoDocCompra` | NVARCHAR(30) NULL | tipo comprobante: FACTURA/BOLETA/RECIBO/OTRO |
| `v_SerieNumeroCompra` | NVARCHAR(100) NULL | serie-número del proveedor |
| `t_FechaDocCompra` | DATE NULL | fecha de emisión del comprobante |
| `d_MontoBrutoCompra` | DECIMAL(18,2) NULL | bruto documental (DD1: puede ≠ monto caja) |
| `d_IGVCompra` | DECIMAL(18,2) NULL | IGV informativo (DD2) |
| `v_EstadoCompra` | NVARCHAR(20) NOT NULL DEFAULT 'SIN_COMPROBANTE' | + CHECK IN ('SIN_COMPROBANTE','COMPLETO') — solo relevante para GASTO |

La **diferencia** (`d_MontoBrutoCompra − montoCaja`) NO se persiste: se calcula en la bandeja/consistencia
(el monto de caja vive en `dbo.venta.d_Total`/`cajamayor_movimiento.d_Total`, no en el overlay). El
receptor (`i_IdProveedor`/`i_IdEntidad`) ya existe; "Registrar compra" lo confirma/actualiza.

### 2.2 SPs nuevos (`sp/19_egreso_caja_compra.sql`)
- **`sp_EgresoCaja_GetClasificacion @IdVenta`** (lectura, para prellenar el modal editar): fila ACTIVO +
  joins de nombres (tipo_gasto, centro, proveedor `dbo.proveedores`, entidad, consultorio) + campos de
  compra. Devuelve vacío si no hay clasificación (→ el form entra en modo INSERT).
- **`sp_EgresoCaja_ActualizarTipificacion @IdVenta,@IdTipoGasto,@IdProveedor,@IdEntidad,@IdUsuario`**
  (solo rama **GASTO**): re-valida hoja + `b_VisibleCaja=1` + raíz ≠ OTROS_INGRESOS + receptor presente;
  UPDATE del overlay ACTIVO; auditoría. Para **HONORARIO**, la edición se hace con `_Destipificar` +
  `_Tipificar` (ya existen) — el SP rechaza actualizar un HONORARIO por esta vía.
- **`sp_EgresoCaja_RegistrarCompra @IdVenta,@IdProveedor,@IdEntidad,@TipoDoc,@SerieNumero,@FechaDoc,`
  `@MontoBruto,@IGV,@IdUsuario`** (XACT_ABORT): valida overlay ACTIVO **de tipo GASTO** (no HONORARIO),
  receptor presente (proveedor XOR entidad; valida `dbo.proveedores`/`conta.entidad` por subquery de
  lectura), `@IGV` entre 0 y `@MontoBruto`; UPDATE columnas de compra + `v_EstadoCompra='COMPLETO'`;
  **NO** toca `conta.egreso`; auditoría (`Detalle='COMPRA:<v_IdVenta>'`). Idempotente/re-editable (permite
  corregir el comprobante). NO valida que el bruto == monto caja (DD1).
- **`sp_EgresoCaja_Bandeja @Desde,@Hasta [,@IdTipoCaja,@Estado]`** (lectura, para la grid): fuente
  `dbo.cajamayor_movimiento 'E'` (o `dbo.venta` 502/504) por fecha; una fila por egreso con:
  `v_IdVenta` (clave), fecha, documento, glosa, **MontoCaja** (`d_Total`), unidad (por `i_IdTipoCaja` +
  fallback overlay), cajero; `LEFT JOIN` overlay ACTIVO → flags **`Clasificado`** (existe), **`TipoEgreso`**,
  `TipoGasto`/`Receptor` (nombres), **`CompraRegistrada`** (`v_EstadoCompra='COMPLETO'`), y
  **`DiferenciaMonto`** (`d_MontoBrutoCompra − d_Total`, NULL si sin compra).
- **`sp_Proveedor_BuscarCrear`** (o reutilizar el CRUD del BI): el SAMBHS necesita **buscar** en
  `dbo.proveedores` por RUC/razón y **crear** on-demand (RUC 11 díg + razón social) — DD3. Verificar en
  FASE 0 si el BI ya expone un SP reusable (`sp_Proveedor_*`/lo que use `POST /proveedores`); si sí,
  llamarlo; si no, crear uno mínimo en `conta`/`dbo` (dbo.proveedores es tabla del BI: acepta DML de filas).

### 2.3 Sin cambios en los 6 consumidores
El relabel ya se hizo (sprint previo) y **usa el receptor y el tipo_gasto del overlay** — que "Registrar
compra" puebla/actualiza. `sp_Caja_FlujoDetallado` RS3 ya muestra receptor (entidad/proveedor). No hace
falta tocar los 6; el monto sigue saliendo de `cm.d_Total` (DD1 respetado por construcción). Verificar en
GATE que las cifras siguen invariantes.

---

## 3. Diseño — SAMBHS (aditivo, detrás del mismo feature flag)

### 3.1 `frmBandejaRegistroVenta.cs` — 2 botones nuevos
- Al seleccionar un row, si `EsTipificacionHabilitada(serie)` y `i_IdTipoDocumento ∈ {502,504}`: llamar
  `sp_EgresoCaja_GetClasificacion(v_IdVenta)` (barato) para saber estado → habilitar botones:
  - **"Tipo de gasto"**: siempre habilitado para EC (inserta o edita).
  - **"Registrar compra"**: habilitado solo si `Clasificado=1 AND TipoEgreso='GASTO'`.
- Con flag OFF o row no-EC: ambos botones ocultos/deshabilitados. Cero cambios al resto de la bandeja.

### 3.2 `frmTipificarEgreso.cs` — modo editar (DD4)
- Nuevo overload / parámetro `modoEdicion`; en `Load`, si `sp_EgresoCaja_GetClasificacion` devuelve fila:
  prellenar (radio + comprobante(s) o tipo_gasto + receptor) y, al Confirmar, llamar
  `sp_EgresoCaja_ActualizarTipificacion` (GASTO) en vez de `_Tipificar`. Para HONORARIO en edición:
  `_Destipificar` + `_Tipificar` (avisar que se recalcula el pago). Si no hay fila → comportamiento actual
  (insert). Reusar el form existente; sin duplicar.

### 3.3 `frmRegistrarCompra.cs` (+ `.Designer.cs`) — NUEVO
- Ctor `(string idVenta, decimal montoCaja, string glosa, int usuarioId)`.
- Cabecera solo-lectura: egreso, **monto de caja** (referencia), glosa, y la clasificación actual
  (tipo_gasto) desde `GetClasificacion`.
- **Receptor**: toggle Proveedor | Entidad. Proveedor = búsqueda en `dbo.proveedores` (por RUC/razón) +
  **alta rápida** (RUC 11 díg + razón social → inserta en `dbo.proveedores`). Entidad = combo de
  `conta.entidad`. (DD3.)
- **Comprobante**: tipo doc (FACTURA/BOLETA/RECIBO/OTRO), serie-número, fecha (≤ hoy), **monto bruto**,
  **IGV** (0..bruto). Muestra en vivo la **diferencia vs monto de caja** (DD1): si `bruto ≠ montoCaja`,
  cartel informativo ("El comprobante difiere del efectivo entregado: Δ = X. Se registra igual."), NO
  bloquea.
- **Confirmar** → `sp_EgresoCaja_RegistrarCompra` (StoredProcedure, timeout 30s). Éxito → cierra. Rechazo
  de negocio (SqlException 50000) → mensaje, queda en pantalla. Fallo técnico → Reintentar/Cerrar (el
  egreso ya está; la compra queda pendiente). Solo `System.Data.SqlClient` + WinForms base.
- Se puede reabrir para **corregir** el comprobante (RegistrarCompra es re-editable).

### 3.4 Feature flag y build
- Reusar `TipificacionEgresoHabilitada`/`TipificacionEgresoSeries` (mismos appSettings; con OFF, los
  botones no aparecen y nada cambia). Backup previo de `frmBandejaRegistroVenta.cs`, `frmTipificarEgreso.cs`,
  `.csproj`, `App.config` a `_backup_tipificacion\2026-07-19\` (versionar la fecha si ya existe). `MSBuild`
  del proyecto UI, 0 errores. NO publicar.

---

## 4. Web (opcional, menor)
El overlay ya se refleja en caja/flujo/dashboard. Complementos si el PO los quiere (pueden diferirse):
- Mostrar en el detalle del cuadre/egresos el **proveedor + comprobante** de la compra (nuevas columnas del
  overlay) y la **diferencia** de monto. `contaTypes`/`CajaDiaria` calcan las columnas del RS2 (ya trae
  TipoGasto/Receptor; sumar SerieNumeroCompra/FechaDocCompra si se decide mostrar).
- Una bandeja web de tipificación/compra (backlog del plan previo) — fuera de este sprint.

---

## 5. Fases (cadena db-experto → backend-api[web opc.] → backend-api[SAMBHS] → qa-tester)

### FASE 0 — Preflight (db-experto, lectura)
`modify_date` de `sp/18`, overlay, `sp_Egreso_Insert`; confirmar tipo real `v_IdVenta`=NCHAR(16) y las
columnas actuales del overlay; **localizar el SP/endpoint de proveedores del BI reusable** (para
buscar/crear en `dbo.proveedores`) o decidir crear `sp_Proveedor_BuscarCrear`; baseline de cifras
(las 6 superficies con el overlay actual) para el GATE de invariancia.
**GATE 0**: tipos/objetos confirmados; vía de proveedor decidida; baseline capturado.

### FASE 1 — BD (db-experto)
`ddl/15` (ALTER overlay) + `sp/19` (Get, ActualizarTipificacion, RegistrarCompra, Bandeja) + proveedor
buscar/crear. Aplicar (repo == prod). Pruebas con egresos EC REALES:
- GetClasificacion sobre un GASTO tipificado → devuelve la fila con nombres.
- ActualizarTipificacion cambia tipo_gasto/receptor de un GASTO; rechaza sobre HONORARIO.
- RegistrarCompra con proveedor (existente y **alta on-demand**) + comprobante → overlay COMPLETO, `conta.egreso`
  **sigue en 0**; re-llamada corrige (idempotente/editable); diferencia de monto se refleja en Bandeja; rechaza
  sobre HONORARIO / sin receptor / IGV>bruto.
- Bandeja lista los EC con flags correctos (Clasificado/TipoEgreso/CompraRegistrada/DiferenciaMonto).
**GATE 1**: los puntos anteriores con evidencia; **limpieza + RESEED** (par maintenance; RESEED al MAX
vivo; guards LIKE sin corchetes); estado final == inicial; `conta.egreso` intacto.

### FASE 2 — Invariancia (db-experto/qa)
**GATE 2**: con el overlay poblado por una compra de prueba, las 6 superficies mantienen el **monto de caja
invariante al centavo** (DD1: el bruto del comprobante NO altera ninguna suma); el relabel (receptor/tipo
gasto) aparece donde corresponde; destipificar/limpiar → baseline. 

### FASE 3 — SAMBHS (backend-api como ejecutor C#, en `Facturacion_New\` RAÍZ)
Backup → `frmRegistrarCompra` (+Designer) → 2 botones en `frmBandejaRegistroVenta` → modo editar en
`frmTipificarEgreso` (GetClasificacion + Actualizar) → `.csproj` (+Compile) → MSBuild verde. Prohibiciones
del plan previo. **GATE 3**: build verde; diff mínimo y aditivo reportado; con flag OFF, la bandeja es
byte-idéntica.

### FASE 4 — QA E2E (qa-tester + db-experto para siembra/limpieza)
Siembra un GASTO + RegistrarCompra reales → verificar overlay COMPLETO + Bandeja + relabel en API vivo +
`conta.egreso`=0 (sin duplicar) + diferencia de monto + edición (ActualizarTipificacion) → limpieza+RESEED
→ estado final == inicial; `sp_EgresoCaja_Consistencia`=0. Regresión: honorarios-caja, tipificación previa,
6 consumidores, poller — intactos.
**GATE 4**: todo verde, cero residuo.

### Verificación WinForms real + deploy = del USUARIO (flag + ClickOnce), con rollback listo.
### Cierre: commits del orquestador (BD `ddl/15`+`sp/19`; SAMBHS entregado como archivos+backup, no git;
web opc.) + push con aprobación + digest a continual-learning.

---

## 6. Riesgos (además de los heredados del plan previo)
1. **Huérfanos por anulación** desde la bandeja (`frmBandejaRegistroVenta` Eliminar/Anular, y
   `frmRegistroVenta` Edición): la clasificación/compra queda ACTIVO sobre venta muerta. Mitigación:
   `sp_EgresoCaja_Consistencia` (ya detecta) + un **chequeo periódico** (o job) que des-tipifique; NO
   enganchar la anulación neurálgica.
2. **Diferencia de monto** mal entendida por el usuario: dejar claro en la UI que el comprobante NO cambia
   lo que salió de caja (DD1) — es solo respaldo documental.
3. **Dos maestros de proveedor**: DD3 fija `dbo.proveedores`; el alta on-demand lo puebla. NO mezclar con
   `dbo.cliente` 'V'. Vigilar RUCs duplicados en el alta (validación 11 díg + backend).
4. **Doble botón de anulación** (bandeja + edición) — el chequeo de consistencia cubre ambos.
5. **`registro_compras` NO se toca** (DD2): si a futuro se quiere crédito fiscal, es rediseño aparte.

## 7. Rollback
Flag `TipificacionEgresoHabilitada=false` (sin recompilar) → SAMBHS byte-idéntico. Datos:
`sp_EgresoCaja_Destipificar` (revierte tipificación y compra) + scripts maintenance con RESEED. BD:
`ddl/15` es ALTER aditivo (columnas NULL) — reversible dropeando las columnas (schema conta) si se
quisiera, aunque no es necesario (con overlay vacío/sin compra las superficies no cambian).

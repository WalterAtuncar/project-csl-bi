# LOG DE EJECUCIÓN — Plataforma de Gestión Financiera (schema `conta`)

Ejecución del plan `PLAN_PLATAFORMA_FINANCIERA_CONTA.md`, fase por fase.
BD `20505310072` (SQL Server 2012). Todo en schema **`conta`**; cero cambios a `dbo` (legacy).
Estado del proyecto: **demo — aún no implementado en la clínica** (los números de apertura los fija
el usuario, ver §Data histórica).

---

## 1. Arquitectura entregada

- **BD**: schema `conta`, 17 tablas, ~40 stored procedures + funciones inline (`fn_*`), en
  `models-DB/script-conta/` (fuente = producción).
- **API dedicada**: `SanLorenzoMicroservices/SanLorenzo.Contabilidad.Services` (.NET 6, Dapper +
  SPs), puerto dev **5090**, JWT propio (PBKDF2 SHA256 100k, roles SA/GERENTE/CONTABILIDAD),
  JSON con `PropertyNamingPolicy = null` (los nombres JSON = DTOs C#).
- **Front**: módulo `react-project/src/pages/Contabilidad/*`, rutas `/conta/*`, con su propio JWT
  (`conta_token` en localStorage), separado del `authToken` del BI legacy.

### Endpoints (por controlador)

- `auth`: bootstrap, login, me, roles, usuarios (GET/POST/PUT)
- `caja`: ingresos, egresos, diaria, **indicadores** (FASE 7), flujo-consolidado, cerrar-mes,
  reabrir-mes, apertura, saldos-banco (GET/POST)
- `catálogos`: centros-costo, tipos-gasto, entidades, cuentas-bancarias, sisol/participacion, config
- `egresos`: list, get, crear/editar, pagar, anular, carga-masiva
- `costos-personal`: upsert, pagar
- `rentabilidad`: general, por-unidad, gastos, ingresos, comparativa
- `sisol`: liquidaciones (list/get), calcular, pagar
- `compras`: {id}/clasificacion, {id}/clasificar

---

## 2. Log por fase (aplicado 2026-07-11)

| Fase | Entregable | GATE | Resultado |
|---|---|---|---|
| 0 | Schema + catálogos + identity + seeds | 0 | ✔ 17 tablas, plan de cuentas y centros de costo sembrados |
| 1 | API .NET 6 + JWT + CRUD catálogos | 1 | ✔ login roles, CRUD |
| 2 | Egresos + costos personal + carga masiva | 2 | ✔ máquina de estados y carga Excel |
| 3 | Motor de caja + saldos encadenados + flujo | 3 | ✔ junio caja ingresos = 828 700.50 |
| 4 | Rentabilidad general/unidad/comparativa | 4 | ✔ ajuste SISOL 70%, semáforo |
| 5 | Módulo SISOL | 5 | ✔ participaciones suman a venta neta |
| 6 | Registro Compras + catálogos UI + roles | 6 | ✔ egreso espejo + bloqueo duplicado |
| 7 | Indicadores, despliegue, data histórica, E2E | 7 | ver §4 |

### Decisiones técnicas clave

- **Dos tuberías por diseño**: CAJA (efectivo, `cobranzadetalle` por `t_InsertaFecha`) vs
  RENTABILIDAD (devengado, `ventadetalle` por `t_InsertaFecha` con ajuste SISOL). Dan cifras
  distintas y explicables para el mismo mes.
- **`INSERT..EXEC` no anidable (SQL 2012)** → Rentabilidad implementada con funciones inline
  `fn_Rentabilidad_*`; Comparativa las compone sin anidar procs.
- **SISOL sin doble conteo**: el egreso Hospital de participación se **excluye** de los gastos de
  rentabilidad (`NOT EXISTS` sobre `sisol_liquidacion.i_IdEgresoHospital`).
- **Duplicado compra↔egreso**: `sp_Egreso_Insert` bloquea el egreso manual con mismo proveedor +
  serie-número que una compra ya clasificada.

---

## 3. FASE 7 — Indicadores por-pagar / por-cobrar

`sp_Caja_Indicadores(@Anio,@Mes)` (archivo `sp/08_indicadores.sql`) devuelve:

- **PorPagar**: egresos en estado POR_PAGAR con `t_FechaDocumento` ≤ fin de mes (deuda a proveedores).
- **PorCobrar**: ventas al crédito facturadas − cobradas (`CreditoFacturado − CreditoCobrado`).

Expuesto en `GET /api/conta/caja/indicadores` y como dos tarjetas en **Caja Diaria**
("Egresos por pagar (deuda)" y "Ventas al crédito por cobrar").

Prueba en vivo (2026-06, vía API con token SA):
```
{"PorPagar":0.00,"PorCobrar":315766.52,"CreditoFacturado":11270554.38,"CreditoCobrado":10954787.86}
```
`PorPagar = 0` porque aún no hay egresos históricos cargados (data histórica pendiente del usuario).

---

## 4. GATE 7 (aceptación global) — verificación

| Criterio | Estado | Evidencia |
|---|---|---|
| Páginas nuevas con login y roles | ✔ | Build front OK; nav filtrado por rol (Catálogos=escritura, Usuarios=SA) |
| Caja vs Rentabilidad distintas y explicables | ✔ | Junio: Caja **828 700.50** vs Rentab. **588 329.24**; Δ = crédito + ajuste SISOL |
| Cadena de saldos ene→jun cerrada | ⏳ usuario | `conta.saldo_caja` vacía a propósito: la apertura la fija el usuario (§5) |
| Cero ALTER sobre tablas legacy `dbo` | ✔ | Ver detalle abajo |
| Todo versionado y pusheado | ✔ | Commit FASE 7 (ver git) |

### Detalle "cero ALTER legacy"

- Los scripts de `script-conta/` no contienen `ALTER TABLE dbo` / `DROP` / `ADD COLUMN` /
  `CREATE INDEX ON dbo` (verificado por grep). Los únicos `CREATE INDEX` son sobre `conta.*`.
- `sys.tables` de `dbo` con `modify_date` de hoy:
  - `proveedores` (21:00:21) y `tipocaja` (20:46:31): **bump por FK entrante** desde `conta.egreso`
    y `conta.centro_costo`. La creación de FK bumpea el `modify_date` de la tabla **referenciada**
    pero **no** altera su estructura (columnas intactas). Es el patrón permitido por el plan.
  - `venta` / `documento` (17:15:42, idéntico): actividad de **mantenimiento legacy/BI ajena al
    módulo** (mismo timestamp que la ventana que creó las tablas `dbo.cajamayor_*_bak_20260711`).
    Ninguna FK/índice/objeto de `conta` los toca; columnas intactas (venta=110, documento=29).

---

## 5. Data histórica (respuesta 21 del usuario) — RUNBOOK

> **El sistema NO fabrica números de apertura.** Los cierres de VENTAS (ene–jun 2026) ya existen y
> están verificados. Falta la apertura de CAJA, que la fija el usuario.

1. **Fijar apertura ene-2026** (UI: Caja → Apertura, o `POST /api/conta/caja/apertura`):
   - `SaldoInicial`: saldo de caja/bancos real al 01-ene-2026.
   - `MontoInicialNeto`: el "monto inicial neto" acumulado previo (todo lo anterior a 2026).
2. **Cargar egresos históricos** por mes (Egresos → Carga masiva Excel), ene→jun.
3. **Cerrar caja mes a mes** ene→jun (`POST /api/conta/caja/cerrar-mes`). El cierre encadena el
   saldo final de un mes como inicial del siguiente (cascada hacia adelante ya implementada en
   `sp_Caja_CerrarMes`).
4. Resultado: 6 meses comparables en Flujo Consolidado y Rentabilidad.

---

## 6. Despliegue (producción) — RUNBOOK (acción del usuario)

> Publicar en el IIS del servidor es una acción de producción; se dejan preparados los artefactos
> y los pasos. **No** se despliega automáticamente.

1. **Publicar la API**:
   ```
   dotnet publish -c Release -o <ruta_publish> \
     SanLorenzoMicroservices/SanLorenzo.Contabilidad.Services
   ```
2. **Elegir puerto libre**: los microservicios actuales usan 8182–8186. Verificar con
   `netsh http show urlacl` / `netstat -ano` y tomar el siguiente libre (p.ej. **8187**).
3. **Sitio/aplicación IIS**: crear con el mismo patrón que los demás microservicios (AppPool
   .NET, `web.config` de `dotnet publish`). Rollback = renombrar la carpeta previa, no borrar.
4. **Registrar la URL en el front**: definir `VITE_CONTA_API` en el `.env.production` del
   `react-project` (los `.env*` están fuera de git por política del repo). Contenido:
   ```
   # URL base de la API dedicada de Contabilidad publicada en IIS.
   VITE_CONTA_API=http://<host>:8187/api/conta
   ```
   Por defecto (sin env) el front usa `http://localhost:5090/api/conta`. Si el front consume vía
   gateway Ocelot, añadir la ruta en `ocelot.json`.
5. **Build del front** con las páginas nuevas: `npx vite build` (ya validado en este repo).
6. **Cadena de conexión**: `appsettings.json` apunta a `190.116.90.35\CSL_2025` / `20505310072`.

---

## 7. Validación E2E — preguntas de Ruth → pantalla

| Pregunta | Pantalla | Dato |
|---|---|---|
| ¿Tengo dinero para pagar planillas? | **Caja Diaria** | Saldo al día |
| ¿Estoy ganando o perdiendo? | **Rentabilidad** | Semáforo del mes |
| ¿Qué unidad mantiene / cuál pierde la clínica? | **Rentabilidad por Unidad** | Resultado por tipocaja |
| ¿Cuánto debo cobrar/pagar este mes? | **Caja Diaria** | Tarjetas "por pagar" y "por cobrar" (FASE 7) |
| ¿Cuál es mi liquidez real? | **Flujo Consolidado** | Saldo final + saldos bancarios |

---

## 8. Handoff — pendientes que dependen del usuario

1. **Apertura y cierre histórico de caja** (§5): requiere los números reales de saldo inicial.
2. **Despliegue a IIS** (§6): requiere acceso a producción y elección de puerto.
3. **Contraseñas de app** creadas en demo: `sa`, `gerente` (resetear en producción).

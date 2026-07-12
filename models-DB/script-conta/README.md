# script-conta — Plataforma de Gestión Financiera (schema `conta`)

Implementación del requerimiento "INDICACIONES SISTEMA BI" (Ruth Quispe, 2026-07).
Todo vive en el schema **`conta`** de la BD `20505310072`; **nunca** se altera `dbo` (legacy).
Plan maestro: `../docs/PLAN_PLATAFORMA_FINANCIERA_CONTA.md`.
Log de ejecución y GATEs: `../docs/LOG_EJECUCION_CONTA.md`.

## Estructura

- `ddl/` — DDL de tablas y seeds (un archivo por bloque, aplicados en orden numérico).
- `sp/` — stored procedures / funciones inline (un objeto por archivo, patrón `ALTER PROCEDURE`
  para re-aplicar de forma idempotente).

## Aplicar (SQL Server 2012, vía db-console)

Archivos en UTF-8 **sin BOM**, **sin `GO`** (un batch por archivo, salvo los que el splitter de
db-console separa). Orden exacto:

```
# DDL (crear/actualizar estructura)
node query.js --write --file ddl/00_schema.sql
node query.js --write --file ddl/01_catalogos.sql
node query.js --write --file ddl/02_identity_auditoria.sql
node query.js --write --file ddl/03_seeds.sql
node query.js --write --file ddl/04_egresos.sql
node query.js --write --file ddl/05_caja.sql
node query.js --write --file ddl/06_sisol.sql
node query.js --write --file ddl/07_compras.sql
node query.js --write --file ddl/08_login_unificado.sql

# Stored procedures / funciones (idempotentes, re-aplicables)
node query.js --write --file sp/00_helpers.sql
node query.js --write --file sp/01_auth.sql
node query.js --write --file sp/02_catalogos.sql
node query.js --write --file sp/03_egresos.sql
node query.js --write --file sp/04_caja_motor.sql
node query.js --write --file sp/05_rentabilidad.sql
node query.js --write --file sp/06_sisol.sql
node query.js --write --file sp/07_compras.sql
node query.js --write --file sp/08_indicadores.sql
node query.js --write --file sp/09_login_unificado.sql
```

**Login unificado del BI** (ver `../docs/PLAN_LOGIN_UNIFICADO_BI.md`): `ddl/08` extiende
`conta.usuario` (origen LOCAL/LEGACY) y `sp/09` agrega el lookup del vinculo + la busqueda y
vinculacion de usuarios del sistema legacy (`systemuser`, solo SELECT cross-DB). La autenticacion
la resuelve el API conta contra `/Auth/Login` del legacy; la autorizacion (rol) la resuelve el
vinculo. `sp/01` fue extendido (GetUsuario devuelve v_AuthOrigen; List devuelve origen/username legacy).

## Inventario (17 tablas en `conta`)

| Bloque | Tablas |
|---|---|
| Catálogos | `centro_costo`, `tipo_gasto`, `entidad`, `cuenta_bancaria`, `sisol_participacion`, `config` |
| Identity/auditoría | `usuario`, `rol`, `usuario_rol`, `auditoria` |
| Egresos | `egreso`, `costo_personal` |
| Caja | `saldo_caja`, `saldo_banco_mensual` |
| SISOL | `sisol_liquidacion`, `sisol_especialista` |
| Compras | `compra_ext` |

## Estado por fase (aplicado 2026-07-11)

- **FASE 0** — schema `conta`, catálogos, identity, seeds (roles; plan de cuentas de 9 secciones
  + rubros según maquetas; 6 centros de costo cableados a las unidades de `dbo.tipocaja`;
  SISOL 70/30; semáforo; bancos; entidades). GATE 0 ✔.
- **FASE 1** — microservicio `SanLorenzo.Contabilidad.Services` (.NET 6, Dapper + SPs),
  JWT propio (PBKDF2 SHA256 100k), roles SA/GERENTE/CONTABILIDAD, CRUD de catálogos. GATE 1 ✔.
- **FASE 2** — egresos (máquina de estados POR_PAGAR→PAGADO→ANULADO), costos de personal,
  carga masiva Excel. GATE 2 ✔.
- **FASE 3** — motor de caja (base efectivo por `cobranzadetalle`), saldos mensuales encadenados
  con cascada hacia adelante, flujo consolidado. GATE 3 ✔ (junio ingresos caja = 828 700.50).
- **FASE 4** — rentabilidad (base devengado por `ventadetalle`) general / por unidad / comparativas,
  con ajuste de participación SISOL y semáforo. GATE 4 ✔.
- **FASE 5** — módulo SISOL: liquidación mensual, participación Clínica/Hospital que suma exacto a
  la venta neta, generación del egreso Hospital al pagar. GATE 5 ✔.
- **FASE 6** — clasificación de `dbo.registro_compras` → `compra_ext` + egreso espejo, con bloqueo
  de duplicado manual; catálogos y usuarios en UI; roles verificados. GATE 6 ✔.
- **FASE 7** — indicadores por-pagar/por-cobrar, despliegue (runbook), data histórica (runbook),
  validación E2E y GATE global. Ver `../docs/LOG_EJECUCION_CONTA.md`.

## Dos tuberías (por diseño dan cifras distintas y explicables)

- **CAJA** (liquidez / base efectivo): `cobranzadetalle.d_ImporteSoles` por `cd.t_InsertaFecha`.
  Responde "¿tengo dinero?". Cuenta el 100% de lo cobrado, incluida la cobranza de crédito de meses
  anteriores.
- **RENTABILIDAD** (resultado / base devengado): `ventadetalle.d_Valor` por `v.t_InsertaFecha`,
  con ajuste de participación SISOL (solo el % de la clínica). Responde "¿gano o pierdo?".

Ejemplo trazado (junio 2026): Caja ingresos = **828 700.50** vs Rentabilidad ingresos = **588 329.24**.
La diferencia son ventas a crédito (timing de cobro) y el ajuste SISOL.

## Reglas invariantes

- Prohibido `ALTER`/`DROP`/`CREATE INDEX` sobre tablas de `dbo`. Se permiten FKs entrantes desde
  `conta.*` hacia tablas del BI (`dbo.tipocaja`, `dbo.proveedores`) — la creación de la FK bumpea el
  `modify_date` de la tabla referenciada pero **no** cambia su estructura (verificado en GATE 7).
- Toda escritura de negocio registra en `conta.auditoria`.
- SQL Server 2012: sin `CREATE OR ALTER` / `OPENJSON` / `STRING_SPLIT` / `DROP ... IF EXISTS` / `TRIM`;
  `INSERT..EXEC` no anidable (por eso Rentabilidad usa funciones inline `fn_*`).

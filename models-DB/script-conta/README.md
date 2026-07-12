# script-conta — Plataforma de Gestión Financiera (schema `conta`)

Implementación del requerimiento "INDICACIONES SISTEMA BI" (Ruth Quispe, 2026-07).
Todo vive en el schema **`conta`** de la BD `20505310072`; **nunca** se altera `dbo` (legacy).
Plan maestro: `../docs/PLAN_PLATAFORMA_FINANCIERA_CONTA.md`.

## Estructura

- `ddl/` — DDL de tablas y seeds (un archivo por bloque, aplicados en orden numérico).
- `sp/` — stored procedures (un SP por archivo, patrón `ALTER PROCEDURE` para re-aplicar).

## Aplicar (SQL Server 2012, vía db-console)

Archivos en UTF-8 **sin BOM**, **sin `GO`** (un batch por archivo). Orden:

```
node query.js --write --file ddl/00_schema.sql
node query.js --write --file ddl/01_catalogos.sql
node query.js --write --file ddl/02_identity_auditoria.sql
node query.js --write --file ddl/03_seeds.sql
node query.js --write --file ddl/04_egresos.sql     # Fase 2
...
```

## Estado

- **FASE 0 (aplicada 2026-07-11):** schema + 10 tablas (centro_costo, tipo_gasto, entidad,
  cuenta_bancaria, sisol_participacion, config, usuario, rol, usuario_rol, auditoria) + seeds
  (roles, plan de cuentas de 9 secciones + 50 rubros según maquetas, 6 centros de costo cableados
  a unidades, SISOL 70/30, semáforo, bancos, entidades, California como proveedor).
- Fases 1–7: ver plan maestro.

## Reglas

- Prohibido `ALTER`/`DROP` sobre tablas de `dbo`. Se permiten FKs entrantes desde `conta.*` hacia
  tablas creadas por el BI (`dbo.tipocaja`, `dbo.proveedores`) y `INSERT` de catálogo en ellas.
- Toda escritura de negocio registra en `conta.auditoria`.

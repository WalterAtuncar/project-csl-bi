# Scripts — Caja Mayor (Nuevo Esquema)

Ubicación: `models-DB/script-cajamayor`

## Descripción

- `01_ddl_cajamayor_schema.sql`: crea el esquema base con cabecera global (`cajamayor_cierre`), resumen por tipo de caja (`cajamayor_cierre_tipocaja`), movimientos (`cajamayor_movimiento`) y el tipo de tabla `dbo.IdIntTableType`.
- `02_indexes.sql`: crea índices recomendados para mejorar el rendimiento.
- `03_seed_tipocaja_clientetipo.sql`: seed del mapeo `venta.i_ClienteEsAgente` → `tipocaja.i_IdTipoCaja` usando `sp_TipoCaja_ClienteTipo_Upsert`.

Todos los scripts usan `BEGIN TRAN` + `ROLLBACK TRAN` por defecto. Revise la salida y cambie a `COMMIT TRAN` manualmente cuando esté conforme.

## Ejecución con sqlcmd (solo SELECT para inspección; DDL se ejecuta manualmente por el usuario)

Ejemplo (ajuste servidor y base):

```
sqlcmd -S <SERVIDOR> -d <BASE> -i .\models-DB\script-cajamayor\01_ddl_cajamayor_schema.sql
sqlcmd -S <SERVIDOR> -d <BASE> -i .\models-DB\script-cajamayor\02_indexes.sql
```

Para aplicar definitivamente, edite el archivo y reemplace `ROLLBACK TRAN` por `COMMIT TRAN` según la política del proyecto.

## Orden recomendado

1. Ejecutar `01_ddl_cajamayor_schema.sql`.
2. Ejecutar `02_indexes.sql`.
3. Ejecutar `03_seed_tipocaja_clientetipo.sql`.

## Notas

- Las FKs referencian `dbo.tipocaja`. Se asume que existe con PK `i_IdTipoCaja`.
- La FK hacia `dbo.documento(i_CodigoDocumento)` en `tipocaja_documento` es opcional y no incluida por compatibilidad inicial.
- El seed mantiene `BEGIN TRAN` + `ROLLBACK TRAN` por defecto; aplique `COMMIT` manual tras validar que los IDs resueltos de `tipocaja` son los correctos (ATENCION_ASISTENCIAL, ATENCION_OCUPACIONAL/EMPRESARIAL, FARMACIA, SEGUROS, MTC, SISOL).
- Revise y ajuste longitudes de columnas según sus datos reales (serie/numero de documento, concepto, observaciones).
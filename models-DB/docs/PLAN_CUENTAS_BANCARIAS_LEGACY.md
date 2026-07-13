# PLAN — Cuentas bancarias desde el catálogo legacy (dbo.documento)

## Objetivo
Dejar de mantener un catálogo paralelo inventado (`conta.cuenta_bancaria`, 3 filas sembradas
INTERBANK/BCP/BBVA "POR-DEFINIR") y **leer las cuentas bancarias directamente del catálogo real de
tesorería del legacy** `dbo.documento`, con filtros — **mismo patrón que ya usa `conta.sp_Caja_FormasPago`
sobre `dbo.datahierarchy` (grupo 46)**. Se retira el CRUD de "Cuentas bancarias" de Catálogos (pasa a
solo lectura, es un espejo del legacy).

## Decisiones (confirmadas por el usuario)
1. **Fuente:** leer directo del legacy `dbo.documento`; se **deprecia** `conta.cuenta_bancaria`.
2. **Alcance:** solo bancos → `i_Naturaleza = 3` (5 cuentas reales + FONDO FIJO ADMINISTRACIÓN).
3. Implementar E2E.

## Evidencia / validación (producción, BD 20505310072)
- Catálogo real `dbo.documento` con `i_UsadoTesoreria=1 AND i_Eliminado=0 AND i_Naturaleza=3`:
  201 BANCO CREDITO MN 245-1810834-0-98 · 202 BANCO CREDITO ME 194-1436677-1-97 ·
  210 BANCO CONTINENTAL MN 0011-0277100100054539 · 211 BANCO CONTINENTAL ME ·
  207 BANCO NACIÓN - DETRACCIÓN 672807 · 426 FONDO FIJO ADMINISTRACIÓN.
- `dbo.documento` y schema `conta` en la MISMA BD → SELECT same-DB a `dbo` (lectura, permitido; NO se altera dbo).
- `conta.cuenta_bancaria`: 3 filas sembradas. Referencias reales: **0 egresos** y **0 saldos** → cambio limpio.
- FKs a retirar: `FK__egreso__i_IdCuen__286DEFE4` (egreso.i_IdCuentaBancaria),
  `FK__saldo_ban__i_IdC__4AC307E8` (saldo_banco_mensual.i_IdCuentaBancaria).

## Contrato del SP (no cambia la forma que ya consumen backend/front)
`CuentaBancariaRow` / `CuentaBancaria` = `{ i_IdCuentaBancaria:int, v_Banco:string, v_NroCuenta:string, v_Moneda:char(3), b_Activo:bit }`.

`conta.sp_CuentaBancaria_List @SoloActivos BIT = 1` (reemplazo del cuerpo; misma firma):
```sql
SELECT
  d.i_CodigoDocumento                                   AS i_IdCuentaBancaria,
  LTRIM(RTRIM(d.v_Nombre))                              AS v_Banco,
  LTRIM(RTRIM(ISNULL(d.v_Siglas,'')))                   AS v_NroCuenta,   -- código corto de tesorería (BCS/BC$/BLN…)
  CASE WHEN d.v_Siglas LIKE '%$%' THEN 'USD' ELSE 'PEN' END AS v_Moneda,   -- MN→PEN, ME/$→USD
  CAST(1 AS BIT)                                        AS b_Activo
FROM dbo.documento d
WHERE d.i_UsadoTesoreria = 1
  AND ISNULL(d.i_Eliminado,0) = 0
  AND d.i_Naturaleza = 3
ORDER BY d.v_Nombre;
```
(`@SoloActivos` se conserva por compatibilidad de firma; todas las filas devueltas son vigentes.
Regla: NO inventar datos — usar solo lo que exista en `documento`. El nro de cuenta bancaria real
está embebido en `v_Nombre`, por eso `v_Banco` se muestra completo.)

## Trabajo por dominio (cadena db-experto → backend-api → bi-frontend)

### 1) db-experto (BD)
- **DROP** de las 2 FKs a `conta.cuenta_bancaria` (por nombre; ambas tablas hijas con 0 filas).
- **REEMPLAZAR** `conta.sp_CuentaBancaria_List` por el cuerpo de arriba (fuente = `dbo.documento`).
- **DROP** `conta.sp_CuentaBancaria_Insert` y `conta.sp_CuentaBancaria_Update` (ya no hay alta/edición).
- **DROP TABLE** `conta.cuenta_bancaria` (0 filas, sin FKs tras el paso 1; catálogo ahora es el legacy).
- Actualizar los .sql fuente en `models-DB/script-conta/` (ddl de la tabla + sp de cuentas) con cabecera
  que documente la deprecación y la nueva fuente.
- **GATE:** `EXEC conta.sp_CuentaBancaria_List` devuelve 6 filas (5 bancos + fondo fijo), moneda correcta
  (PEN/USD por siglas); confirmar que las 2 FKs ya no existen, la tabla `conta.cuenta_bancaria` ya no
  existe, y que `conta.egreso` / `conta.saldo_banco_mensual` siguen intactas (0 filas, columnas iguales).

### 2) backend-api (.NET)
- GET `/cuentas-bancarias` se mantiene (ahora sirve del legacy vía el SP nuevo) — sin cambios de código.
- **Eliminar** endpoints POST y PUT `/cuentas-bancarias` (`CuentaCrear`, `CuentaActualizar`) del
  `CatalogosController`, los métodos `CuentaInsert`/`CuentaUpdate` de `CatalogoRepository`, y los DTOs
  `CuentaBancariaCreateRequest` / `CuentaBancariaUpdateRequest` (Dtos.cs). `CuentaBancariaRow` se conserva.
- Build en verde.

### 3) bi-frontend (React)
- `Catalogos.tsx` → `CuentasTab`: convertir a **solo lectura**. Quitar `onNew`, el `IconBtn` de editar,
  el `Modal` y `save`. Mantener la tabla (Banco / Nro. cuenta / Moneda). Agregar leyenda
  "Catálogo de tesorería (legacy) · solo lectura".
- `ContabilidadService.ts`: quitar `cuentaCrear` y `cuentaActualizar`. `cuentasBancarias()` se mantiene.
- `contaTypes.ts`: quitar `CuentaBancariaCreate` / `CuentaBancariaUpdate` (o marcarlos deprecados). El
  tipo `CuentaBancaria` se conserva (misma forma).
- El selector de cuenta en el pago de egresos consume `cuentasBancarias()` → sigue funcionando, ahora con
  los bancos reales. Verificar que el label use `v_Banco`.
- Build Vite en verde.

## Verificación E2E final (orquestador)
- GET `/api/conta/cuentas-bancarias` (con token) devuelve los 6 bancos reales.
- El modal de pago de egreso lista esos bancos.
- Catálogos → "Cuentas bancarias" ya no permite crear/editar (solo lista).
- Sin datos de prueba que limpiar (todo lectura).
```

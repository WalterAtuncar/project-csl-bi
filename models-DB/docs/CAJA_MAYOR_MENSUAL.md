# Plan de Implementación — Cierre de Caja Mayor Mensual

## Objetivo

- Registrar ingresos y egresos por tipo de caja, consolidando tanto ingresos manuales como provenientes de ventas/cobranzas.
- Generar cierres mensuales de Caja Mayor con balance detallado por tipo de caja.
- Permitir egresos específicos (planilla, servicios, etc.) y un resumen por categorías.
- Exponer endpoints en `Agenda.Microservice` para que el frontend React pueda crear y consultar cierres.

## Estado actual (análisis)

- Tablas existentes: `cajamayor`, `cajamayordetalle`, `ingresosmensual`, `egresosmensual`, `saldocaja`, `tipocaja`, `tipoingresomensual`, `tipoegresomensual`.
- SPs existentes:
  - Caja Mayor: crear/actualizar, listar, detalle, cerrar, eliminar, insertar detalle.
  - Ingresos/Egresos: crear, listar, actualizar, eliminación lógica.
  - Saldo de caja: actualización automática y consulta de saldo.
- Integraciones relevantes:
  - `cobranzadetalle` para ingresos por ventas.
  - `relacionformapagodocumento` para vincular formas de pago a documentos (bancos/cajas).
  - `documento` con banderas de uso en tesorería y posibles cuentas asociadas.
- Observaciones técnicas:
  - Fórmulas incrementales de `d_SaldoFinalMes` en algunos SPs actuales pueden provocar doble conteo (recomendado corregir en una fase posterior si se decide).
  - `sp_CajaMayor_GetDetalle` muestra solo `cajamayordetalle`, quedando fuera `ingresosmensual` y `egresosmensual` (detalle incompleto para cierre mensual).
  - Falta un agregador desde cobranzas/ventas hacia Caja Mayor.
  - Índices ausentes para consultas por mes/periodo y por caja.

## Decisión de estrategia

- Opción B: Crear nuevos SPs orientados a la funcionalidad, sin tocar los existentes inicialmente.
  - Separar responsabilidades entre “agregadores”, “detalle unificado”, “resumen mensual” y “cierre/confirmación”.
  - Mantener los SPs actuales para compatibilidad, y mejorar más adelante si es necesario.

## Diseño de nuevos SPs

1) Agregador de ventas/cobranzas a Caja Mayor

- Nombre sugerido: `sp_CajaMayor_GenerarDesdeCobranzas`
- Propósito: Insertar movimientos de ingreso en `cajamayordetalle` a partir de `cobranzadetalle` para un periodo y tipo de caja.
- Parámetros (propuesta):
  - `@IdTipoCaja INT`
  - `@FechaInicio DATETIME`
  - `@FechaFin DATETIME`
  - `@UsuarioId INT`
  - Opcionales: `@IdEstablecimiento INT = NULL`, `@ListaFormaPago dbo.IdIntTableType READONLY` (para filtrar formas de pago específicas)
- Lógica resumida:
  - Seleccionar cobranzas dentro del periodo (`t_InsertaFecha` o `t_FechaRegistro`).
  - Mapear `i_IdFormaPago` → `i_CodigoDocumento` usando `relacionformapagodocumento` y validar `documento.i_UsadoTesoreria = 1`.
  - Mapear documento/cuenta a `@IdTipoCaja` (vía tabla de mapeo sugerida, ver “Esquema mínimo”) o por parámetro fijo `@IdTipoCaja`.
  - Convertir montos a moneda base (si aplica) usando `i_IdMoneda`, `d_TipoCambio` y los campos `d_ImporteSoles`/`d_ImporteDolares`.
  - Insertar filas en `cajamayordetalle` (`v_TipoMovimiento = 'I'`) con trazabilidad (`v_IdVenta`, `v_CodigoDocumento`, fechas, totales, observaciones).
  - Actualizar los totales de `cajamayor` del mes y sincronizar `saldocaja`.

2) Detalle unificado de Caja Mayor por periodo y tipo de caja

- Nombre sugerido: `sp_CajaMayor_GetDetalleUnificado`
- Propósito: Devolver un conjunto homogéneo con todos los movimientos del mes por tipo de caja, combinando:
  - `cajamayordetalle` (ventas y/o manuales) → origen `Detalle`.
  - `ingresosmensual` → origen `IngresoMensual` (tipo ‘I’).
  - `egresosmensual` → origen `EgresoMensual` (tipo ‘E’).
- Parámetros:
  - `@IdCajaMayor INT` (o alternativamente `@IdTipoCaja`, `@Mes`, `@Anio`).
  - Paginación opcional.
- Columnas de salida sugeridas:
  - `Origen`, `TipoMovimiento`, `Concepto`, `Fecha`, `Subtotal`, `IGV`, `Total`, `NumeroDocumento`, `SerieDocumento`, `Observaciones`, `IdVenta` (si aplica).

3) Resumen mensual de Caja Mayor (balance y desglose)

- Nombre sugerido: `sp_CajaMayor_ResumenMensual`
- Propósito: Entregar balance por tipo de caja y un desglose por categorías (tipos de ingreso/egreso), más saldos inicial/final.
- Parámetros:
  - `@Mes NCHAR(2)`, `@Anio NCHAR(4)`.
  - Opcional: `@IdTipoCaja INT = NULL` para un solo tipo o todos.
- Salidas:
  - Por tipo de caja: `SaldoInicial`, `TotalIngresos`, `TotalEgresos`, `SaldoFinal`.
  - Desglose: sumatorias por `tipoingresomensual` y `tipoegresomensual`.

4) Confirmación de cierre (estado 2)

- Nombre sugerido: `sp_CajaMayor_Confirmar`
- Propósito: Cambiar `i_EstadoCierre` de 1 a 2, registrando observaciones y auditoría.
- Parámetros: `@IdCajaMayor INT`, `@UsuarioId INT`, `@Observaciones NVARCHAR(500) = NULL`.

5) (Opcional) Sembrado/configuración de tipos de caja y mapeos

- `sp_TipoCaja_Seed`: alta de tipos de caja base.
- Tabla sugerida: `tipocaja_documento (i_IdTipoCaja, i_CodigoDocumento)` para un mapeo explícito entre documento (banco/caja) y tipo de caja.
  - Alternativa: pasar `@IdTipoCaja` como parámetro al agregador y filtrar por conjuntos de documentos con un Table Type.

## Endpoints (Agenda.Microservice)

Rutas sugeridas (REST):

- `POST /api/caja-mayor/generar-desde-cobranzas`
  - Body: `{ idTipoCaja, fechaInicio, fechaFin, usuarioId, formasPago? }`
  - Acción: invoca `sp_CajaMayor_GenerarDesdeCobranzas`.

- `GET /api/caja-mayor/{id}/detalle-unificado`
  - Query: `{ page?, size? }`
  - Acción: invoca `sp_CajaMayor_GetDetalleUnificado`.

- `GET /api/caja-mayor/resumen?mes=MM&anio=YYYY&idTipoCaja?`
  - Acción: invoca `sp_CajaMayor_ResumenMensual`.

- `POST /api/caja-mayor/{id}/cerrar`
  - Acción: usa SP actual de cierre.

- `POST /api/caja-mayor/{id}/confirmar`
  - Acción: invoca `sp_CajaMayor_Confirmar`.

## Impacto en Frontend (React)

- Crear/ejecutar cierre mensual directamente desde la UI, disparando el endpoint de generación.
- Visualizar el detalle unificado por periodo y tipo de caja con filtros.
- Mostrar resumen/balance y desglose por categorías.
- Permitir el cierre (estado 1) y confirmación (estado 2) desde UI.

## Validación y rendimiento

- Validación técnica:
  - Backend: `dotnet build` para asegurar contratos y compilación.
  - Frontend: `npm run build` para validar tipos y servicios.
- Índices recomendados:
  - `cajamayordetalle(i_IdCajaMayor, t_FechaMovimiento)`.
  - `ingresosmensual(i_IdCajaMayor, t_FechaIngreso)`.
  - `egresosmensual(i_IdCajaMayor, t_FechaEgreso)`.
  - Único en `saldocaja(i_IdTipoCaja)`.
  - Único en `relacionformapagodocumento(i_IdFormaPago, i_CodigoDocumento)`.

## Plan de implementación (fases)

1. Definir y crear SPs nuevos:
   - `sp_CajaMayor_GenerarDesdeCobranzas`, `sp_CajaMayor_GetDetalleUnificado`, `sp_CajaMayor_ResumenMensual`, `sp_CajaMayor_Confirmar`.
   - (Opcional) `tipocaja_documento` y `sp_TipoCaja_Seed`.

2. Exponer endpoints en `Agenda.Microservice` y contratos de respuesta.

3. Integrar frontend React con los endpoints (servicios y pantallas).

4. Validar corrida técnica (`dotnet build`, `npm run build`) y pruebas funcionales manuales.

5. (Posterior) Optimizar SPs existentes si se decide: corrección de fórmula de saldo, sincronización de `saldocaja` en todos los flujos, índices adicionales.

## Notas de seguridad y operación

- Scripts de propuesta incluirán `BEGIN TRAN` + `ROLLBACK TRAN` por defecto; el `COMMIT` se aplicará cuando el usuario lo solicite.
- No se ejecutarán DDL ni operaciones destructivas automáticamente; se documentarán para revisión previa.

---

## Replanteamiento del diseño — Cabecera global y detalle por tipo

### Problema detectado

- El cierre mensual está acoplado al `IdTipoCaja` en varias partes (SPs, endpoints y UI), lo que dificulta ver el estado global del período y separa el detalle por caja en la lista principal.

### Solución propuesta

- Introducir una cabecera de cierre única por período (mes/año) y gestionar el detalle desagregado por tipo de caja debajo de esa cabecera.
- Beneficios: claridad contable, una sola fuente de verdad del estado del mes, y facilidad para listar cabeceras sin obligar a filtrar por tipo de caja.

### Modelo de datos propuesto (nuevo esquema)

- `cajamayor_cierre` (cabecera global del período)
  - Clave: `i_IdCajaMayorCierre` (IDENTITY)
  - Único: `(n_Anio, n_Mes)`
  - Campos: `t_FechaInicio`, `t_FechaFin`, totales agregados, `i_EstadoCierre` (Borrador=1, Cerrado=2, Confirmado=3), auditoría.

- `cajamayor_cierre_tipocaja` (resumen por tipo de caja)
  - Clave compuesta: `(i_IdCajaMayorCierre, i_IdTipoCaja)`
  - Campos: saldos inicial, ingresos, egresos, saldo final, auditoría.

- `cajamayor_movimiento` (detalle unificado de movimientos)
  - Clave: `i_IdMovimiento` (IDENTITY)
  - FK: `i_IdCajaMayorCierre` → `cajamayor_cierre`, `i_IdTipoCaja` → `tipocaja`
  - Campos: `v_TipoMovimiento` ('I'/'E'), `t_FechaMovimiento`, `v_ConceptoMovimiento`, `d_Subtotal`, `d_IGV`, `d_Total`, `v_NumeroDocumento`, `v_SerieDocumento`, `v_CodigoDocumento`, `v_IdVenta`, `v_Origen`, auditoría.

- (Opcional) `tipocaja_documento` (mapeo explícito documento ↔ tipo de caja)
  - Único: `(i_IdTipoCaja, i_CodigoDocumento)`

- (Opcional) `tipocaja_clientetipo` (mapeo explícito `venta.i_ClienteEsAgente` ↔ tipo de caja)
  - Único: `(i_ClienteEsAgente)`
  - Uso: clasificar ingresos/egresos por tipo de caja basado en el tipo de cliente. Sugerido según rangos: Asistencial `IN (2,8,9)`, Farmacia `IN (3,4)`, Empresarial `IN (1)`, Seguros `IN (5,6)`, MTC `IN (1)`, SISOL `IN (10)`.

### Endpoints sugeridos alineados al nuevo esquema

- `GET /api/Caja/caja-mayor-cierre?mes=MM&anio=YYYY&estado?`
  - Lista cabeceras de cierre sin obligación de `IdTipoCaja`.

- `GET /api/Caja/caja-mayor-cierre/{id}/resumen-tipos`
  - Devuelve la tabla `cajamayor_cierre_tipocaja` para el id de cabecera.

- `GET /api/Caja/caja-mayor-cierre/{id}/movimientos?idTipoCaja?&origen?`
  - Devuelve el detalle unificado en `cajamayor_movimiento`, filtrable por tipo u origen.

- `POST /api/Caja/caja-mayor-cierre` / `PUT /api/Caja/caja-mayor-cierre/{id}`
  - Crear/actualizar cabecera del período.

- `POST /api/Caja/caja-mayor-cierre/{id}/confirmar`
  - Cambiar el estado de la cabecera.

### Plan por fases (actualizado)

1) Base de datos (DDL) — crear nuevo esquema:
   - Tablas: `cajamayor_cierre`, `cajamayor_cierre_tipocaja`, `cajamayor_movimiento`, `tipocaja_documento` (opcional).
   - Tipos: `dbo.IdIntTableType` (si no existe) para filtros por listas.
   - Índices: consultas por período, estado, tipo de caja y fecha de movimiento.

2) Stored Procedures — capa funcional:
   - `sp_CajaMayor_Cierre_CreateUpdate` (cabecera), `sp_CajaMayor_GetListCabecera` (listado por período/estado).
   - `sp_CajaMayor_ResumenTipos` (relleno de `cajamayor_cierre_tipocaja`).
   - `sp_CajaMayor_GetMovimientos` (detalle desde `cajamayor_movimiento`).
   - `sp_CajaMayor_GenerarDesdeCobranzas` (poblar movimientos), `sp_CajaMayor_Confirmar` (cambio de estado).

3) Endpoints — `Agenda.Microservice`:
   - Exponer las rutas anteriores con las convenciones del documento `BACKEND_CONTROLLER_ENDPOINTS_SP.md`.

4) Frontend — `/caja-mayor`:
   - Lista principal: cabeceras de cierre por período.
   - Acción de detalle: resumen por tipo + movimientos unificados (filtros por caja/origen).

5) Validación técnica
   - Backend: `dotnet build` en `Agenda.Microservice`.
   - Frontend: `npm run build`.

### Notas de migración

- Mantener los SPs y tablas actuales por compatibilidad mientras se transiciona.
- Migración conservadora: coexistencia de ambos modelos, moviendo gradualmente la UI y los endpoints al nuevo esquema.
- Estrategia directa: crear nuevas cabeceras y usar agregadores para poblar movimientos y resúmenes; deprecated progresivo del modelo acoplado por tipo.
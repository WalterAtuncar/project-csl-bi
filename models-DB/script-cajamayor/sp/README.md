# Scripts de Stored Procedures - Caja Mayor

Este directorio contiene los Stored Procedures para la gestión de Caja Mayor mensual, regenerados para registrar tanto **ingresos** (desde cobranzas) como **egresos** (desde ventas con devoluciones/NC/EC*), además de operaciones auxiliares.

## Lista de SPs

- `sp_CajaMayor_Cierre_CreateUpdate.sql`: crea/actualiza la cabecera del cierre (`cajamayor_cierre`).
- `sp_CajaMayor_GetListCabecera.sql`: lista cabeceras con filtros y paginación.
- `sp_CajaMayor_GetCabecera.sql`: obtiene una cabecera específica.
- `sp_CajaMayor_GetMovimientos.sql`: lista movimientos con filtros y paginación.
- `sp_CajaMayor_GenerarDesdeCobranzas.sql`: genera **ingresos** desde `venta`/`ventadetalle` replicando el cierre de caja diario de Facturacion_New (query `cadenaSA` de `frmCierreCajaDiario.cs`): suma `ventadetalle.d_PrecioVenta`, filtra por `venta.t_InsertaFecha`, clasifica por `datahierarchy` grupos 41/46 y excluye series de egreso, `TFM`/`THM`, áreas 3 y 10 y usuario 2036. *(Versión en producción desde 2026-05-31.)*
- `sp_CajaMayor_GenerarEgresosDesdeVentas.sql`: genera **egresos** desde `venta` con las series exactas `ECO/ECA/ECF/ECT/ECG/ECR` (igual que el .NET), sumando `ventadetalle.d_PrecioVenta` por venta y filtrando por `venta.t_InsertaFecha`. *(Versión en producción desde 2026-05-31.)*
- `sp_CajaMayor_ResumenTipos.sql`: recalcula resumen por tipo de caja y actualiza totales de cabecera.
- `sp_CajaMayor_RecalcularTotales.sql`: recalcula totales globales de cabecera desde el resumen.
- `sp_CajaMayor_InsertMovimientoManual.sql`: inserta un movimiento manual (I/E) y recalcula.
- `sp_CajaMayor_DeleteMovimiento.sql`: elimina un movimiento y recalcula.
- `sp_CajaMayor_UpdateSaldoInicialTipoCaja.sql`: actualiza saldos iniciales por tipo de caja y recalcula.
- `sp_TipoCaja_Documento_Upsert.sql`: upsert del mapeo `tipocaja_documento`.
- `sp_TipoCaja_ClienteTipo_Upsert.sql`: upsert del mapeo `tipocaja_clientetipo` (venta.i_ClienteEsAgente → tipo caja).

## Orden sugerido de uso

1. Crear/actualizar cabecera: `sp_CajaMayor_Cierre_CreateUpdate`.
2. Generar ingresos: `sp_CajaMayor_GenerarDesdeCobranzas`.
3. Generar egresos: `sp_CajaMayor_GenerarEgresosDesdeVentas`.
4. Recalcular resumen/totales: `sp_CajaMayor_ResumenTipos` y/o `sp_CajaMayor_RecalcularTotales`.
5. Cerrar período: `sp_CajaMayor_Cerrar` (estado = 2).
6. Confirmar período: `sp_CajaMayor_Confirmar` (estado = 3).

Operaciones auxiliares:
- Ajustar saldo inicial por tipo de caja: `sp_CajaMayor_UpdateSaldoInicialTipoCaja`.
- Insertar movimiento manual: `sp_CajaMayor_InsertMovimientoManual`.
- Eliminar movimiento: `sp_CajaMayor_DeleteMovimiento`.
- Mantener mapeos documento → tipo caja: `sp_TipoCaja_Documento_Upsert`.

## Políticas de ejecución

- Por política de validación del workspace, los scripts incluyen `BEGIN TRAN` + `ROLLBACK TRAN` por defecto.
  - Para aplicar cambios, reemplace explícitamente `ROLLBACK TRAN` por `COMMIT TRAN` en el script correspondiente.
  - Las pruebas funcionales de ejecución serán manuales por el usuario.
  - En todas las consultas que referencian tablas del modelo `[20505310072]`, se filtra la eliminación lógica (`i_Eliminado = 0`) tanto en origen como en los `JOIN`.
  - Compatibilidad SQL Server 2012: cada SP se declara con el patrón `IF OBJECT_ID('dbo.sp_X','P') IS NOT NULL DROP PROCEDURE dbo.sp_X; GO; CREATE PROCEDURE dbo.sp_X ...` (en lugar de `CREATE OR ALTER`).

## Consideraciones de mapeo y datos fuente

- Ingresos (desde 2026-05-31 replican el cierre diario del .NET):
  - Fuente: `venta` + `ventadetalle`, con `LEFT JOIN cobranzadetalle` **sin** filtro `i_Eliminado` (el .NET tampoco lo filtra) y `datahierarchy` grupos 41 (condición de pago) y 46 (forma de pago).
  - Importe: `ventadetalle.d_PrecioVenta` por línea (lo facturado, no lo cobrado); subtotal/IGV desde `d_Valor`/`d_Igv`.
  - Solo se incluyen filas que el .NET clasifica como ingreso: Contado Efectivo, Crédito o No Efectivo (contado no-efectivo, cheque, depósito); la categoría se guarda en `v_Observaciones`.

- Egresos desde ventas (desde 2026-05-31):
  - Fuente: `venta` + `ventadetalle`, agrupado por venta.
  - Criterio: series exactas `ECO/ECA/ECF/ECT/ECG/ECR` (las notas de crédito `NC-`/`NCR` ya no se tratan como egreso, igual que el cierre diario del .NET).
  - Mapeo de tipo de caja: uso explícito de `dbo.tipocaja_clientetipo` (por `i_ClienteEsAgente`). Si no existe mapeo, se cae a `@DefaultIdTipoCaja`.

## Próximos ajustes recomendados

- Completar/afinar el catálogo de `tipocaja_documento` para todas las formas de pago y bancos.
- Definir el catálogo de `tipocaja_clientetipo` conforme a los rangos de `i_ClienteEsAgente` (Asistencial IN (2,8,9), Farmacia IN (3,4), Empresarial IN (1), Seguros IN (5,6), MTC IN (1), SISOL IN (10)). Para posibles colisiones (p. ej. `1`), utilizar criterio organizacional y/o un override futuro por cliente específico si se requiere.
- Homologar criterios de serie para egresos (NC/Devolución) conforme a `DOCUMENTACION_SISTEMA_CLINICA.md`.
- Añadir validaciones anti-duplicidad si se requiere re-ejecución de generación.
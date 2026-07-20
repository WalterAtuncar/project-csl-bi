-- =====================================================================
-- TEST (FASE 1/2) - Cierre de ciclo del egreso de caja (Registrar compra + tipificacion editable).
-- Plan: models-DB/docs/PLAN_CIERRE_CICLO_EGRESO_CAJA.md (FASE 1 GATE1, FASE 2 GATE2).
-- Fecha: 2026-07-19. Objetos: ddl/15 + sp/19 (+ reuso sp/18 Tipificar/Destipificar, sp/02 Proveedor).
--
-- PRODUCCION: los egresos EC son REALES de junio 2026 (mes cerrado) y las boletas de atencion
-- reales (para el HONORARIO). NO se inserta nada en fuentes legacy (dbo.venta/service/cajamayor);
-- solo se SIEMBRA en conta via los SPs y UN proveedor de prueba en dbo.proveedores (alta on-demand,
-- DML permitido: tabla del BI). Limpieza+RESEED en el _limpiar.sql (par).
--
-- DATOS REALES USADOS (verificados por SELECT en FASE 0):
--   EC GASTO   (jun): N001-ZQ000345140  (ECA-00027737, doc 502, d_Total 50, tc1)  -> GASTO + RegistrarCompra + GATE2
--   EC GASTO   (jun): N001-ZQ000345148  (ECA-00027739, doc 502, d_Total 40, tc1)  -> ActualizarTipificacion (SIN_COMPRA)
--   EC HONORARIO(jun):N001-ZQ000345146  (ECA-00027738, doc 502, d_Total 50, tc1)  -> HONORARIO (rechaza compra/editar)
--   Comprobate CLINICA: B004-00084326 (service N009-SR000794302, medico 172 BRINGAS VASQUEZ YRENE, PSICOLOGIA)
--   tipo_gasto: 16=ADM-TRA, 18=ADM-ATP (ambos hoja, b_VisibleCaja=1); 17=ADM-CAP (no visible); 63=MED-HON
--   proveedor existente: id 1 (OMEGANET PERU). Alta on-demand -> id 22 (RUC 20999999999) [se limpia].
--
-- BASELINE jun-2026 (overlay VACIO, capturado en FASE 0): EC anchor 61,958.20 / dia 06-01 740.00 /
--   Egresos TOTAL 61,958.20 (MEDICO 61,958.20, ADMIN 0) / Diaria 61,958.20 / FlujoConsolidado M6
--   TotalEgresosOp 61,958.20 SaldoDeCaja 766,742.30 SaldoFinal 4,966,612.46 / FlujoDetallado RS3 M6
--   61,958.20 (1 fila MED-LEG) / CuadreDia 06-01 CAJA LEGACY 740.00 / RentGastos 65,958.20 (tc1 61,538.20)
--   / DashEgreso_C 65,958.20 / conta.egreso 0 filas ident 0.
-- =====================================================================
SET NOCOUNT ON;

-- --------------------------------------------------------------------- Seed (via sp/18 Tipificar)
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345140', @Tipo='GASTO', @IdUsuario=1, @IdTipoGasto=16;
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345148', @Tipo='GASTO', @IdUsuario=1, @IdTipoGasto=16;
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345146', @Tipo='HONORARIO', @IdUsuario=1, @Comprobantes='B004-00084326';

-- --------------------------------------------------------------------- FASE 1 GATE1
-- [G1.1] GetClasificacion sobre un GASTO tipificado -> fila con nombres, MontoCaja=50, SIN_COMPROBANTE.
EXEC conta.sp_EgresoCaja_GetClasificacion @IdVenta='N001-ZQ000345140';

-- [G1.2a] ActualizarTipificacion GASTO: cambia tipo (16->18 ADM-ATP) + receptor (proveedor 1).
EXEC conta.sp_EgresoCaja_ActualizarTipificacion @IdVenta='N001-ZQ000345148', @IdTipoGasto=18, @IdProveedor=1, @IdUsuario=1;
-- [G1.2b-f] Rechazos (todos RAISERROR, nada escrito): sobre HONORARIO / sin receptor / prov+ent ambos /
--   venta inexistente / tipo de gasto no-visible.
--   EXEC ... @IdVenta='N001-ZQ000345146' (HONORARIO) -> 'La edicion de un HONORARIO...'
--   EXEC ... @IdVenta='N001-ZQ000345148' sin @IdProveedor/@IdEntidad -> 'Debe indicar el receptor...'
--   EXEC ... @IdProveedor=1,@IdEntidad=1014 -> 'El receptor debe ser proveedor O entidad, no ambos.'
--   EXEC ... @IdVenta='N001-ZQ999999999' -> 'No hay clasificacion activa...'
--   EXEC ... @IdVenta='N001-ZQ000345140',@IdTipoGasto=17 -> 'Tipo de gasto invalido para caja...'

-- [G1.3a] RegistrarCompra proveedor EXISTENTE (id 1), FACTURA, bruto 59 != caja 50 -> COMPLETO, dif +9.
EXEC conta.sp_EgresoCaja_RegistrarCompra @IdVenta='N001-ZQ000345140', @IdProveedor=1, @TipoDoc='FACTURA',
     @SerieNumero='F001-000123', @FechaDoc='2026-06-02', @MontoBruto=59, @IGV=9, @IdUsuario=1;
-- [G1.3b] Alta on-demand de proveedor (mismo SP que POST /catalogos/proveedores) -> id 22.
EXEC conta.sp_Proveedor_Insert @Ruc='20999999999', @RazonSocial='PROVEEDOR TEST CIERRE CICLO', @IdUsuario=1;
-- [G1.3c] Re-llamada RegistrarCompra (editable/idempotente): BOLETA + proveedor 22 + bruto 55 -> dif +5,
--   1 sola fila ACTIVO, conta.egreso sigue 0.
EXEC conta.sp_EgresoCaja_RegistrarCompra @IdVenta='N001-ZQ000345140', @IdProveedor=22, @TipoDoc='BOLETA',
     @SerieNumero='B001-000055', @FechaDoc='2026-06-03', @MontoBruto=55, @IGV=8.39, @IdUsuario=1;
-- [G1.3d-k] Rechazos (RAISERROR, sin mutar): sobre HONORARIO / sin receptor / prov+ent ambos / IGV>bruto /
--   fecha futura / tipodoc invalido / bruto<=0 / sin clasificacion (venta inexistente).

-- [G1.4] Bandeja del dia -> 15 filas (SUM 740.00); 345140 CON_COMPRA (dif +5), 345148 SIN_COMPRA,
--   345146 HONORARIO; 12 sin clasificar. Filtros @Estado (SIN_CLASIFICAR 12/600, CLASIFICADO 3/140,
--   CON_COMPRA 1/50, SIN_COMPRA 2/90) y @IdTipoCaja (1 -> 15/740, 6 -> 0).
EXEC conta.sp_EgresoCaja_Bandeja @Desde='2026-06-01', @Hasta='2026-06-01';

-- --------------------------------------------------------------------- FASE 2 GATE2 (invariancia)
-- Con el overlay poblado (arriba), las 6 superficies mantienen el monto de caja INVARIANTE al centavo
-- (el bruto 55 != caja 50 NO se filtra): Egresos/Diaria/FlujoConsolidado/FlujoDetallado/CuadreDia/
-- RentGastos/Dash == baseline; solo migra 90 de MEDICO->ADMIN y aparecen TipoGasto/Receptor.
-- (La verificacion de cifras se hace por fuera comparando con el baseline de FASE 0.)

-- --------------------------------------------------------------------- Destipificar (vuelve al baseline)
EXEC conta.sp_EgresoCaja_Destipificar @IdVenta='N001-ZQ000345140', @IdUsuario=1, @Motivo='fin GATE2 - destipificar gasto';
EXEC conta.sp_EgresoCaja_Destipificar @IdVenta='N001-ZQ000345148', @IdUsuario=1, @Motivo='fin GATE2 - destipificar gasto';
EXEC conta.sp_EgresoCaja_Destipificar @IdVenta='N001-ZQ000345146', @IdUsuario=1, @Motivo='fin GATE2 - destipificar honorario';
-- Tras destipificar: overlay ANULADO -> superficies == baseline. Luego correr el _limpiar.sql (borrado
-- fisico + RESEED, incluido el proveedor de prueba id 22) para dejar estado final == inicial.

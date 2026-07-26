-- =====================================================================
-- maintenance/2026-07-25_test_remedios_auditoria.sql  (PAR: crear/probar)
-- Pruebas de los remedios de la auditoria db-experto 2026-07-25:
--   ddl/18 (CK_cpm_mes, CK_cpm_estado, UX_entidad_documento_tipo)
--   sp/03 v2 (Upsert guard PAGADO + validaciones; Pagar EOMONTH server-side + auditoria)
--   sp/04 v2 (FlujoDetallado RS2 PERSONAL por n_Anio/n_Mes)
--   sp/19 v2 (venta viva en T2; GetClasificacion VentaAnulada; sp_EgresoCaja_AnularCompra)
--   sp/20 (sp_EgresoCaja_ConsistenciaRemediar)
--
-- ESTE ARCHIVO DOCUMENTA la secuencia ejecutada (los EXEC se corrieron uno a
-- uno por db-console con evidencia capturada). Su par de limpieza:
--   2026-07-25_test_remedios_auditoria_limpiar.sql
--
-- Datos de prueba creados:
--   conta.costo_personal_mensual i_Id=9  (2025-01, centro 2, 'TEST-AUDIT-DBEXP', 123.45 -> PAGADO 2025-01-31)
--   conta.egreso_caja_clasificacion i_IdClasificacion=1 (venta real N001-ZQ000357130, GASTO ADM-OTR,
--       ciclo Tipificar -> RegistrarCompra -> AnularCompra -> Destipificar; termina ANULADO)
--   conta.entidad i_IdEntidad=1014 (PERSONAL auto-derivado 'CONTRERAS BENITES, ERNESTO', doc 42250011)
--   conta.auditoria i_IdAuditoria 10147..10152 (UPSERT/PAGAR/TIPIFICAR_GASTO/REGISTRAR_COMPRA/
--       ANULAR_COMPRA/DESTIPIFICAR, todas i_IdUsuario=1)
--   + UPDATE temporal REVERTIDO: t_FechaPago de las 6 filas PAGADO de mayo/2026 a '2026-07-15'
--     y de vuelta a '2026-05-31' (simulacion de independencia del RS2).
-- =====================================================================

-- 1) Upsert: casos de error (mes 13 / monto negativo / fila PAGADO) + alta OK.
-- EXEC conta.sp_CostoPersonal_Upsert @Anio=2025, @Mes=13, @IdCentroCosto=2, @Concepto='TEST-AUDIT-DBEXP', @Monto=100,    @IdUsuario=1;  -- RAISERROR mes
-- EXEC conta.sp_CostoPersonal_Upsert @Anio=2025, @Mes=1,  @IdCentroCosto=2, @Concepto='TEST-AUDIT-DBEXP', @Monto=-5,     @IdUsuario=1;  -- RAISERROR monto
-- EXEC conta.sp_CostoPersonal_Upsert @Anio=2026, @Mes=5,  @IdCentroCosto=1, @Concepto='REMUNERACION',     @Monto=9999,   @IdUsuario=1;  -- RAISERROR PAGADO
-- EXEC conta.sp_CostoPersonal_Upsert @Anio=2025, @Mes=1,  @IdCentroCosto=2, @Concepto='TEST-AUDIT-DBEXP', @Monto=123.45, @IdUsuario=1;  -- ok=1, aud i_Id real

-- 2) Pagar: mes invalido + fecha basura ignorada (EOMONTH server-side).
-- EXEC conta.sp_CostoPersonal_Pagar @Anio=2025, @Mes=13, @FechaPago='2026-12-01', @IdUsuario=1;  -- RAISERROR mes
-- EXEC conta.sp_CostoPersonal_Pagar @Anio=2025, @Mes=1,  @FechaPago='2026-12-01', @IdUsuario=1;  -- pagadas=1, t_FechaPago=2025-01-31

-- 3) FlujoDetallado RS2: 2026 -> mayo en Mes=5 (9850); 2025 -> TEST en Mes=1;
--    UPDATE temporal t_FechaPago mayo -> '2026-07-15' -> RS2 sigue Mes=5 -> revertir '2026-05-31'.

-- 4) Ciclo AnularCompra sobre venta EC real viva N001-ZQ000357130 (S/50):
-- EXEC conta.sp_EgresoCaja_Tipificar       @IdVenta='N001-ZQ000357130', @Tipo='GASTO', @IdUsuario=1, @IdTipoGasto=34;
-- EXEC conta.sp_EgresoCaja_RegistrarCompra @IdVenta='N001-ZQ000357130', @IdEntidad=1, @TipoDoc='FACTURA', @SerieNumero='F001-000123', @FechaDoc='2026-07-25', @MontoBruto=50.00, @IGV=7.63, @IdUsuario=1;
-- EXEC conta.sp_EgresoCaja_AnularCompra    @IdVenta='N001-ZQ000357130', @IdUsuario=1, @Motivo='Prueba de reversion T2';  -- SIN_COMPROBANTE + 5 campos NULL + receptor/beneficiario INTACTOS
-- EXEC conta.sp_EgresoCaja_AnularCompra    @IdVenta='N001-ZQ000357130', @IdUsuario=1;  -- RAISERROR: no hay compra que anular
-- EXEC conta.sp_EgresoCaja_Destipificar    @IdVenta='N001-ZQ000357130', @IdUsuario=1, @Motivo='Fin de prueba auditoria';  -- Anulado=1

-- 5) Remediador en vacio (0 huerfanos en prod): RS vacio, no-op limpio.
-- EXEC conta.sp_EgresoCaja_ConsistenciaRemediar @IdUsuario=1;

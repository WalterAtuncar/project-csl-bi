-- =====================================================================
-- TEST (FASE 1/2) - Tipificacion ADITIVA de egresos de caja SAMBHS.
-- Plan: models-DB/docs/PLAN_TIPIFICACION_EGRESOS_SAMBHS.md (FASE 1 GATE1, FASE 2 GATE2).
-- Fecha: 2026-07-19. Objetos: ddl/14 + sp/18 + sp/11 (guard/proy).
--
-- PRODUCCION: los egresos EC y las boletas de atencion son REALES de un mes CERRADO (junio 2026)
-- y de julio (para GATE2). NO se inserta nada en tablas fuente legacy (dbo.venta/service/etc.):
-- solo se SIEMBRA en conta via los SPs nuevos. Limpieza+RESEED en el _limpiar.sql (par).
--
-- DATOS REALES USADOS (verificados por SELECT en FASE 0/1):
--   EC egreso GASTO (jun)   : N001-ZQ000345140  (ECA-00027737, doc 502, d_Total 50)
--   EC egreso HONORARIO(jun): N001-ZQ000345146  (ECA-00027738, doc 502, d_Total 50)
--   EC egreso 2do (jun)     : N001-ZQ000345148  (doc 502, d_Total 40)   -> test 'pagados'
--   EC egreso eliminado     : N001-ZQ000345665  (doc 502, i_Eliminado=1)-> test borde
--   Boleta atencion (doc 3) : N001-ZQ000345064  (comprobante B004-00084326) -> test doc!=502
--   EC egreso GASTO (jul)   : N001-ZQ000351858  (ECA-00028060, doc 502, d_Total 50) -> GATE2b
--   Comprobante CLINICA A    : B004-00084326  (service N009-SR000794302, medico 172 BRINGAS VASQUEZ YRENE,
--                                              consultorio 25 PSICOLOGIA, Precio 70, NO pagado)
--   Comprobante CLINICA B    : B004-00084325  (service N009-SR000794299, medico 25963 LABORATORIO)
--   Comprobante SISOL        : B008-00107039  (service N009-SR000794296, medico 32067, consultorio 2, SISOL)
--   tipo_gasto GASTO         : 16 = ADM-TRA (hoja, b_VisibleCaja=1)
-- =====================================================================
SET NOCOUNT ON;

-- --------------------------------------------------------------------- FASE 1
-- [G1.1] Resolver una boleta real -> debe coincidir con sp_Honorarios_Analisis (medico/consultorio/tipo/pagado).
EXEC conta.sp_EgresoCaja_ResolverComprobante 'B004-00084326';

-- [G1.2] GASTO ADM-TRA + idempotencia (2da llamada = mismos ids, sin duplicado).
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345140', @Tipo='GASTO', @IdUsuario=1, @IdTipoGasto=16;
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345140', @Tipo='GASTO', @IdUsuario=1, @IdTipoGasto=16;

-- [G1 errores] (no escriben nada)
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ999999999', @Tipo='GASTO', @IdUsuario=1, @IdTipoGasto=16;      -- inexistente
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345064', @Tipo='GASTO', @IdUsuario=1, @IdTipoGasto=16;      -- doc!=502
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345665', @Tipo='GASTO', @IdUsuario=1, @IdTipoGasto=16;      -- eliminado
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345146', @Tipo='GASTO', @IdUsuario=1, @IdTipoGasto=2;       -- no-hoja (raiz ADMIN)
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345146', @Tipo='GASTO', @IdUsuario=1, @IdTipoGasto=17;      -- hoja no-visible (ADM-CAP)
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345146', @Tipo='HONORARIO', @IdUsuario=1, @Comprobantes='B004-00084326,B008-00107039'; -- anti-mixto
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345146', @Tipo='HONORARIO', @IdUsuario=1, @Comprobantes='B004-00084326,B004-00084325'; -- mono-medico

-- [G1.3] HONORARIO CLINICA (pago CAJA, egreso NULL, overlay MED-HON/CC-ASIS).
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345146', @Tipo='HONORARIO', @IdUsuario=1, @Comprobantes='B004-00084326';
-- esPagado ahora=1
EXEC conta.sp_EgresoCaja_ResolverComprobante 'B004-00084326';
-- re-pago WEB del mismo servicio -> BLOQUEADO
DECLARE @tvp conta.tvp_pago_honorario_servicio;
INSERT INTO @tvp (v_ServiceId,i_IdConsultorio,d_Precio,d_Porc,d_Pagado) VALUES ('N009-SR000794302',25,70,NULL,70);
EXEC conta.sp_PagoHonorario_Insert @MedicoId=172,@MedicoNombre='BRINGAS VASQUEZ, YRENE',@Desde='2026-06-01',@Hasta='2026-06-01',
     @FechaPago='2026-06-01',@TotalServicios=70,@TotalPago=70,@Servicios=@tvp,@IdUsuario=1,@TipoProduccion='CLINICA';
-- re-tipificar por caja el mismo servicio en otra EC -> BLOQUEADO (pagados)
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000345148', @Tipo='HONORARIO', @IdUsuario=1, @Comprobantes='B004-00084326';

-- [G1.4] Anular el pago CAJA desde la web -> RECHAZADO (D6).
EXEC conta.sp_PagoHonorario_Anular @IdPago=1, @Motivo='prueba', @IdUsuario=1;

-- [G1.5] Destipificar (cascada) + idempotente.
EXEC conta.sp_EgresoCaja_Destipificar @IdVenta='N001-ZQ000345146', @IdUsuario=1, @Motivo='QA destipificar honorario';
EXEC conta.sp_EgresoCaja_Destipificar @IdVenta='N001-ZQ000345140', @IdUsuario=1, @Motivo='QA destipificar gasto';
EXEC conta.sp_EgresoCaja_Destipificar @IdVenta='N001-ZQ000345146', @IdUsuario=1, @Motivo='again';   -- idempotente

-- [G1.6] Consistencia (0 filas en operacion normal).
EXEC conta.sp_EgresoCaja_Consistencia;

-- --------------------------------------------------------------------- FASE 2 (GATE2b)
-- Sembrar 1 GASTO ADM-TRA sobre un egreso REAL de julio -> el monto migra de MEDICO a ADMIN sin
-- cambiar totales de caja/flujo/dashboard/rentabilidad (comparar contra baseline FASE 0). Luego
-- Destipificar -> vuelve al baseline al centavo. (La verificacion de cifras se hace por fuera con
-- los JSON de baseline; aqui queda el registro de la siembra/reversa.)
EXEC conta.sp_EgresoCaja_Tipificar @IdVenta='N001-ZQ000351858', @Tipo='GASTO', @IdUsuario=1, @IdTipoGasto=16;
-- ... (verificar cifras) ...
EXEC conta.sp_EgresoCaja_Destipificar @IdVenta='N001-ZQ000351858', @IdUsuario=1, @Motivo='fin GATE2';

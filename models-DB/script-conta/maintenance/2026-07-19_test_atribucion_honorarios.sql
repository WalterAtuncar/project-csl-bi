-- =====================================================================
-- SIEMBRA de datos de PRUEBA E2E - Atribucion de honorarios por tipo de
-- produccion (CLINICA -> asistencial / SISOL -> SISOL). Schema conta.
-- Fecha: 2026-07-19   (autorizado por el usuario)
--
-- OBJETIVO: probar con DATOS REALES de produccion que el egreso espejo de un
--   pago de honorario CLINICA cae en el centro CC-ASIS (asistencial) y el de
--   un pago SISOL cae en CC-SISOL, y que ambos aparecen en la superficie
--   correcta (rentabilidad por consultorio / por unidad / general, egresos,
--   dashboards) SIN contaminacion cruzada (fix 5b).
--
-- ESTADO INICIAL (verificado por SELECT antes de correr):
--   * conta.egreso                     = 0 filas  (ident 0)
--   * conta.pago_honorario             = 0 filas  (ident 0)
--   * conta.pago_honorario_consultorio = 0 filas  (ident 0)
--   * conta.pago_honorario_servicio    = 0 filas  (ident 0)
--   * conta.entidad (global)           = 8 filas  (ident/MAX 1013)
--       MEDICO pre-existentes: id 13 (VELASQUEZ CULQUE, CESAR ALBERTO),
--                              id 1013 (SOTO GAMARRA, MICHAEL)  -> NO se tocan.
--
-- MEDICOS / SERVICIOS / CONSULTORIOS REALES (de sp_Honorarios_Analisis jun-2026,
--   verificados masterType / no-pagados en legacy ni conta):
--   * PAGO 1 CLINICA (masterServiceType 9):
--       Medico  : BUENO MANTILLA, VICKY DELIACIT  (i_MedicoId 14176)
--       Servicio: N009-SR000794454   Consultorio 22 (ODONTOLOGIA)  precio 24.00
--       -> egreso esperado en CC-ASIS (centro 2, tipocaja 1 ATENCION_ASISTENCIAL)
--   * PAGO 2 SISOL (masterServiceType 42):
--       Medico  : HORNA TONGO, LUIS ANTONIO  (i_MedicoId 94487)
--       Servicio: N009-SR000796793   Consultorio 37 (REUMATOLOGIA)  precio 35.00
--       -> egreso esperado en CC-SISOL (centro 6, tipocaja 3 SISOL)
--
-- FRONTERA dbo: sp_PagoHonorario_Insert y sp_Egreso_Insert SOLO escriben en
--   schema conta (entidad, pago_honorario, pago_honorario_consultorio,
--   pago_honorario_servicio, egreso, auditoria). Cross-DB a SigesoftDesarrollo_2
--   es SOLO SELECT (anti-doble-pago, anti-mixto, nombre de consultorio 403).
--   i_IdProveedor NULL en ambos egresos -> ni se ejercita la FK saliente a
--   dbo.proveedores. NO se escribe una sola fila en dbo.
--
-- LIMPIEZA: al terminar la evidencia ejecutar el par
--   2026-07-19_test_atribucion_honorarios_limpiar.sql (DELETE + RESEED al MAX vivo).
-- =====================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

-- ---------------------------------------------------------------------
-- PAGO 1 - CLINICA  (masterServiceType 9 -> CC-ASIS)
-- ---------------------------------------------------------------------
DECLARE @svcClinica conta.tvp_pago_honorario_servicio;
INSERT INTO @svcClinica (v_ServiceId, i_IdConsultorio, d_Precio, d_Porc, d_Pagado)
VALUES ('N009-SR000794454', 22, 24.00, 65, 24.00);

EXEC conta.sp_PagoHonorario_Insert
    @MedicoId         = 14176,
    @MedicoNombre     = N'BUENO MANTILLA, VICKY DELIACIT',
    @Desde            = '2026-06-01',
    @Hasta            = '2026-06-30',
    @PorcMedico       = 65,
    @FechaPago        = '2026-06-30',
    @IdFormaPago      = NULL,
    @IdCuentaBancaria = NULL,
    @Glosa            = N'[TEST-ATRIB] Honorario CLINICA prueba atribucion (limpiar con _limpiar.sql)',
    @TotalServicios   = 24.00,
    @TotalPago        = 24.00,
    @Servicios        = @svcClinica,
    @IdUsuario        = 1,
    @TipoProduccion   = 'CLINICA';

-- ---------------------------------------------------------------------
-- PAGO 2 - SISOL  (masterServiceType 42 -> CC-SISOL)
-- ---------------------------------------------------------------------
DECLARE @svcSisol conta.tvp_pago_honorario_servicio;
INSERT INTO @svcSisol (v_ServiceId, i_IdConsultorio, d_Precio, d_Porc, d_Pagado)
VALUES ('N009-SR000796793', 37, 35.00, 65, 35.00);

EXEC conta.sp_PagoHonorario_Insert
    @MedicoId         = 94487,
    @MedicoNombre     = N'HORNA TONGO, LUIS ANTONIO',
    @Desde            = '2026-06-01',
    @Hasta            = '2026-06-30',
    @PorcMedico       = 65,
    @FechaPago        = '2026-06-30',
    @IdFormaPago      = NULL,
    @IdCuentaBancaria = NULL,
    @Glosa            = N'[TEST-ATRIB] Honorario SISOL prueba atribucion (limpiar con _limpiar.sql)',
    @TotalServicios   = 35.00,
    @TotalPago        = 35.00,
    @Servicios        = @svcSisol,
    @IdUsuario        = 1,
    @TipoProduccion   = 'SISOL';

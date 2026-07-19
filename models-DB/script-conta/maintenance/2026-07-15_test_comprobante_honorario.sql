-- =====================================================================
-- MANTENIMIENTO (one-off) - Prueba del comprobante tributario de honorarios.
-- Ejecuta 4 pagos de prueba (A..D felices/backward) + 2 casos de error (E,F).
-- Reutiliza el medico existente SOTO GAMARRA (entidad 1013, medicoId 33163) y serviceIds
-- ficticios TEST-* para NO crear entidades ni colisionar con datos reales (PH-1 intacto).
-- Baseline a restaurar (ver _limpiar.sql): pago=1, cons=1, serv=5, egreso=1, comprobante=0.
-- NO ejecutar en un entorno sin su _limpiar.sql posterior.
-- =====================================================================

-- ------- Test A: FACTURA ('01'), 2 consultorios, TotalPago=118 (base 100 + IGV 18) + proveedor FK -------
DECLARE @a conta.tvp_pago_honorario_servicio;
INSERT INTO @a (v_ServiceId, i_IdConsultorio, d_Precio, d_Porc, d_Pagado) VALUES
    ('TEST-FAC-001', 1, 90, 65, NULL),
    ('TEST-FAC-002', 2, 30, 65, NULL);
EXEC conta.sp_PagoHonorario_Insert
    @MedicoId=33163, @MedicoNombre=N'SOTO GAMARRA, MICHAEL',
    @Desde='2026-06-01', @Hasta='2026-06-30', @PorcMedico=65,
    @FechaPago='2026-07-15', @Glosa=N'TEST A comprobante Factura',
    @TotalServicios=120, @TotalPago=118, @Servicios=@a, @IdUsuario=1,
    @TipoComprobante='01', @IdProveedor=1, @RucEmisor='10412345678',
    @RazonSocialEmisor=N'SOTO GAMARRA MICHAEL EIRL',
    @Serie='F001', @Numero='000123', @FechaEmision='2026-07-15',
    @Moneda='PEN', @TipoCambio=1, @ObservacionesComprobante=N'Factura honorarios test';

BEGIN TRAN

-- Nota: Este script inserta movimientos de egreso en cajamayor_movimiento y sus registros de compra asociados en registro_compras.
-- Por defecto termina con ROLLBACK TRAN para revisión. Reemplace por COMMIT TRAN cuando desee aplicarlo.

-- Asegurar interpretación correcta de fechas 'YYYY-MM-DD'
SET DATEFORMAT ymd;

/* Utilidad para fechas */
DECLARE @Now DATETIME = GETDATE();

/*
  Convenciones utilizadas:
  - v_TipoMovimiento = 'E' (egreso)
  - v_Origen = 'compras'
  - i_IdFormaPago: 1=Efectivo, 2=Depósito, 3=Visa, 4=Yape (referencial)
  - codigo_moneda = 'PEN'
  - tipo_comprobante: '01'=Factura, '03'=Boleta
*/

/* -----------------------------
   CIERRE 13 - TIPO CAJA 1 (3 inserts)
------------------------------ */
DECLARE @MovimientoId INT;

-- 13 / 1 / Gastos Administrativos → Marketing y Publicidad (fam=2, tipo=21)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertalUsuario, t_InsertaFecha
) VALUES (
  13, 1, 'E', '2025-09-20',
  'Servicios de marketing campaña Q3', 3500.00, 630.00, 4130.00,
  2, '00012345', 'F001', '01',
  NULL, 'compras', 'Factura marketing proveedor', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202509, '2025-09-20', '2025-09-30', '01',
  'F001', '00012345', 3, '20123456780', 'Proveedor Marketing S.A.C.',
  3500.00, 630.00, 0, 0, 0, 4130.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Campaña digital y piezas gráficas',
  2, 21, 1, 1, @Now
);

-- 13 / 1 / Gastos Médicos → Gastos de Laboratorio (fam=3, tipo=33)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertalUsuario, t_InsertaFecha
) VALUES (
  13, 1, 'E', '2025-10-05',
  'Procesamiento de pruebas laboratorio', 2200.00, 396.00, 2596.00,
  1, '00022311', 'F002', '01',
  NULL, 'compras', 'Servicios externos de laboratorio', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202510, '2025-10-05', '2025-10-15', '01',
  'F002', '00022311', 7, '20123456781', 'Servicios de Laboratorio S.A.',
  2200.00, 396.00, 0, 0, 0, 2596.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Procesamiento pruebas pacientes',
  3, 33, 1, 1, @Now
);

-- 13 / 1 / Tributos Corrientes → AFP (fam=5, tipo=41)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertalUsuario, t_InsertaFecha
) VALUES (
  13, 1, 'E', '2025-11-10',
  'Aportes AFP noviembre', 0.00, 0.00, 8600.00,
  2, '00056789', 'ND01', '00',
  NULL, 'compras', 'Pago de aportes previsionales', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202511, '2025-11-10', '2025-11-10', '00',
  'ND01', '00056789', 2, '20456789123', 'AFP Prima',
  0.00, 0.00, 0.00, 0.00, 0.00, 8600.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Pago de AFP correspondiente a planilla',
  5, 41, 1, 1, @Now
);

/* -----------------------------
   CIERRE 13 - TIPO CAJA 2 (2 inserts)
------------------------------ */
-- 13 / 2 / Pago a Terceros → Honorarios Profesionales (fam=8, tipo=48)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertalUsuario, t_InsertaFecha
) VALUES (
  13, 2, 'E', '2025-09-12',
  'Honorarios médicos apoyo campaña', 4800.00, 864.00, 5664.00,
  3, '00077881', 'F003', '01',
  NULL, 'compras', 'Servicios profesionales médicos', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202509, '2025-09-12', '2025-09-25', '01',
  'F003', '00077881', 6, '20567891234', 'Médicos Asociados SAC',
  4800.00, 864.00, 0, 0, 0, 5664.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Honorarios profesionales',
  8, 48, 1, 1, @Now
);

-- 13 / 2 / Gastos Administrativos → Servicios Públicos (fam=2, tipo=20)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertalUsuario, t_InsertaFecha
) VALUES (
  13, 2, 'E', '2025-10-08',
  'Pago recibos de luz y agua octubre', 1500.00, 270.00, 1770.00,
  2, '00088022', 'F004', '01',
  NULL, 'compras', 'Servicios públicos octubre', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202510, '2025-10-08', '2025-10-20', '01',
  'F004', '00088022', 4, '20678912345', 'Servicios Públicos S.A.',
  1500.00, 270.00, 0, 0, 0, 1770.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Luz y agua octubre',
  2, 20, 1, 1, @Now
);

/* -----------------------------
   CIERRE 13 - TIPO CAJA 6 (1 insert)
------------------------------ */
-- 13 / 6 / Financiamientos → Gastos Bancario / ITF (fam=7, tipo=47)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertalUsuario, t_InsertaFecha
) VALUES (
  13, 6, 'E', '2025-09-28',
  'Comisiones bancarias e ITF setiembre', 0.00, 0.00, 520.00,
  2, '00099010', 'ND02', '00',
  NULL, 'compras', 'Cargos bancarios mensuales', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202509, '2025-09-28', '2025-09-28', '00',
  'ND02', '00099010', 8, '20789123456', 'Banco Interbank',
  0.00, 0.00, 0.00, 0.00, 0.00, 520.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Comisiones bancarias ITF',
  7, 47, 1, 1, @Now
);

/* -----------------------------
   CIERRE 14 - TIPO CAJA 1 (3 inserts)
------------------------------ */
-- 14 / 1 / Egresos de Personal → Remuneraciones (fam=1, tipo=10)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertalUsuario, t_InsertaFecha
) VALUES (
  14, 1, 'E', '2025-10-30',
  'Pago de remuneraciones octubre', 0.00, 0.00, 56000.00,
  2, '00040001', 'ND03', '00',
  NULL, 'compras', 'Planilla octubre', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202510, '2025-10-30', '2025-10-30', '00',
  'ND03', '00040001', 9, '20111222334', 'Planilla Interna',
  0.00, 0.00, 0.00, 0.00, 0.00, 56000.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Pago remuneraciones mes',
  1, 10, 1, 1, @Now
);

-- 14 / 1 / Gastos Administrativos → Mantenimiento (fam=2, tipo=19)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertalUsuario, t_InsertaFecha
) VALUES (
  14, 1, 'E', '2025-11-12',
  'Mantenimiento equipos biomédicos', 7800.00, 1404.00, 9204.00,
  2, '00041002', 'F005', '01',
  NULL, 'compras', 'Servicio técnico de mantenimiento', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202511, '2025-11-12', '2025-11-25', '01',
  'F005', '00041002', 5, '20890123456', 'Mantenimiento Biomédico SAC',
  7800.00, 1404.00, 0, 0, 0, 9204.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Correctivo y preventivo',
  2, 19, 1, 1, @Now
);

-- 14 / 1 / Gastos Médicos → Insumos Médicos (fam=3, tipo=30)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertaIdUsuario, t_InsertaFecha
) VALUES (
  14, 1, 'E', '2025-12-03',
  'Compra de insumos médicos', 5600.00, 1008.00, 6608.00,
  3, '00042003', 'F006', '01',
  NULL, 'compras', 'Insumos para cardiología', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202512, '2025-12-03', '2025-12-20', '01',
  'F006', '00042003', 10, '20901234567', 'Insumos Médicos del Perú',
  5600.00, 1008.00, 0, 0, 0, 6608.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Insumos médicos diversos',
  3, 30, 1, 1, @Now
);

/* -----------------------------
   CIERRE 14 - TIPO CAJA 2 (2 inserts)
------------------------------ */
-- 14 / 2 / Inversiones → Software (fam=4, tipo=39)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertaIdUsuario, t_InsertaFecha
) VALUES (
  14, 2, 'E', '2025-09-18',
  'Licencias software gestión clínica', 9200.00, 1656.00, 10856.00,
  2, '00051001', 'F007', '01',
  NULL, 'compras', 'Renovación anual de licencias', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202509, '2025-09-18', '2025-09-28', '01',
  'F007', '00051001', 1, '20112233445', 'Software Perú S.A.',
  9200.00, 1656.00, 0, 0, 0, 10856.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Licencias y soporte',
  4, 39, 1, 1, @Now
);

-- 14 / 2 / Tributos Corrientes → Impuestos (fam=5, tipo=40)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertaIdUsuario, t_InsertaFecha
) VALUES (
  14, 2, 'E', '2025-11-25',
  'Pago de tributos municipales', 0.00, 0.00, 3900.00,
  2, '00052002', 'ND04', '00',
  NULL, 'compras', 'Tributos varios', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202511, '2025-11-25', '2025-11-25', '00',
  'ND04', '00052002', 2, '20456712389', 'Municipalidad CSL',
  0.00, 0.00, 0.00, 0.00, 0.00, 3900.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Pago de arbitrios y otros',
  5, 40, 1, 1, @Now
);

/* -----------------------------
   CIERRE 14 - TIPO CAJA 6 (1 insert)
------------------------------ */
-- 14 / 6 / Otros Egresos → Gastos Varios (fam=9, tipo=58)
INSERT INTO cajamayor_movimiento (
  i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, t_FechaMovimiento,
  v_ConceptoMovimiento, d_Subtotal, d_IGV, d_Total,
  i_IdFormaPago, v_NumeroDocumento, v_SerieDocumento, v_CodigoDocumento,
  v_IdVenta, v_Origen, v_Observaciones, i_InsertaIdUsuario, t_InsertaFecha
) VALUES (
  14, 6, 'E', '2025-09-07',
  'Gastos varios sala de espera', 850.00, 153.00, 1003.00,
  4, '00061001', 'F008', '01',
  NULL, 'compras', 'Enseres y útiles varios', 1, @Now
);
SET @MovimientoId = SCOPE_IDENTITY();

INSERT INTO registro_compras (
  id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento, tipo_comprobante,
  serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
  base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
  codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
  numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
  id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
) VALUES (
  @MovimientoId, 202509, '2025-09-07', '2025-09-20', '01',
  'F008', '00061001', 1, '20199887766', 'Comercial Varios S.R.L.',
  850.00, 153.00, 0, 0, 0, 1003.00,
  'PEN', 1.00, 0, NULL, NULL,
  NULL, 0, NULL, 'Enseres y útiles de limpieza',
  9, 58, 1, 1, @Now
);

-- Revisión manual antes de aplicar definitivamente
ROLLBACK TRAN;
-- COMMIT TRAN;

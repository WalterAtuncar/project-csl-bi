-- =====================================================================
-- ddl/27 - NLQ v2 (ronda diferida): historial de PAGOS a medicos.
-- CURACION por verificacion EN VIVO. Dominio 'clinico_pagos'. Fecha: 2026-07-28.
--
-- HALLAZGO CENTRAL (verificado en vivo): NO existe en Sigesoft una fuente de
-- pagos REALES a medicos con montos. Las 4 candidatas:
--   * HistorialPagoMedicos (99,858 filas): DESCARTADA. d_MontPay e i_SatusPay
--     estan 100% NULL (0 filas con monto); v_TipoServicio vacio. Es un SHELL
--     (1 fila por service, rango 2024-11 a 2026-07) que el modulo de pago legacy
--     NUNCA lleno con montos. No responde "cuanto se pago".
--   * servicespaid (1 fila): DESCARTADA. Fila de prueba (dic-2025); el modulo BI
--     legacy nunca opero -> reemplazado por conta.pago_honorario.
--   * servicespaiddetails (131 filas): DESCARTADA. Residuo legacy (su parent
--     servicespaid tiene 1 fila) -> reemplazado por conta.pago_honorario_servicio.
--     (Se usa read-only como 2a fuente del anti-doble-pago de honorarios, no como pagos.)
--   * paymentmedic (28 filas): SEMBRADA. Es CONFIGURACION de pago por medico
--     (% y cuota mensual por categoria/tipo), NO montos pagados. Viva; i_UserId
--     resuelve a medicos reales (systemuser->person). Utilidad: "% / cuota de pago
--     configurado del medico X".
--
-- ACLARACION DE NEGOCIO (pagos REALES vs CALCULADO):
--   - conta.v_nlq_honorarios = honorario CALCULADO por-pagar (neto default), NO
--     pagos reales (conta.pago_honorario esta VACIA: nada pagado aun).
--   - HistorialPagoMedicos/servicespaid* (legacy) = shell/muertas, sin montos.
--   -> NO hay pagos historicos reales con monto en ninguna fuente. paymentmedic es
--      solo la CONFIG (% / cuota), no lo pagado.
--
-- ADITIVO schema conta, CERO Sigesoft (solo se LEYO metadata). NO expone las 3
-- descartadas al catalogo. SQL 2012. Idempotente. UTF-8 SIN BOM (ASCII).
-- =====================================================================


-- #####################################################################
-- 1) nlq_tabla: SOLO paymentmedic (config de pago por medico).
-- #####################################################################
INSERT INTO conta.nlq_tabla (v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, b_Activa, v_Descripcion)
SELECT x.v_Base, x.v_Schema, x.v_Objeto, x.v_TipoObjeto, x.v_Dominio, 1, x.v_Descripcion
FROM (VALUES
    ('SigesoftDesarrollo_2','dbo','paymentmedic','T','clinico_pagos',
     'CONFIGURACION de pago por medico (28 filas). i_UserId->systemuser->person (medico); r_PayPercentage = % de pago, r_QuotaMonth = cuota mensual fija, i_TypePay = tipo (1/2/3), i_CategoryId = categoria. Varias filas por medico (una por categoria/tipo). NO son montos pagados: es como SE LE PAGA al medico. Filtra i_IsDeleted=0 para configs vigentes. USAR PARA: porcentaje o cuota de pago configurado del medico, como se le paga a cada medico.')
) x(v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, v_Descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_tabla t
    WHERE t.v_Base = x.v_Base AND t.v_Schema = x.v_Schema AND t.v_Objeto = x.v_Objeto);
GO

-- 2) nlq_columna (FK LOGICA i_UserId->systemuser)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='paymentmedic') t
CROSS JOIN (VALUES
    ('i_PaymetId','int',1,0,NULL,'PK. Id de la config de pago (typo legacy: PaymetId).'),
    ('i_UserId','int',0,1,'dbo.systemuser.i_SystemUserId','FK LOGICA al medico (systemuser->person para el nombre).'),
    ('i_CategoryId','int',0,0,NULL,'Categoria de servicio a la que aplica la config.'),
    ('i_TypePay','int',0,0,NULL,'Tipo de pago (1/2/3).'),
    ('r_PayPercentage','real',0,0,NULL,'Porcentaje de pago al medico.'),
    ('r_QuotaMonth','real',0,0,NULL,'Cuota mensual fija (cuando aplica).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = config vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 3) nlq_regla_negocio (dominio clinico_pagos)
INSERT INTO conta.nlq_regla_negocio (v_Dominio, v_Objeto, v_Regla, b_Activa, i_Orden)
SELECT x.v_Dominio, x.v_Objeto, x.v_Regla, 1, x.i_Orden
FROM (VALUES
    ('clinico_pagos','dbo.paymentmedic',
     'paymentmedic es la CONFIGURACION de pago por medico (% y cuota), NO montos pagados. El medico es i_UserId -> systemuser -> person. Un medico tiene varias filas (por categoria/tipo). Filtra i_IsDeleted=0 para vigentes. Usa DISTINCT/agrupa por medico si resumes.', 1),
    ('clinico_pagos', NULL,
     'NO hay historial de pagos REALES a medicos con monto: HistorialPagoMedicos es un shell (d_MontPay/i_SatusPay 100% NULL) y servicespaid/servicespaiddetails son residuo legacy muerto (reemplazados por conta.pago_honorario*, que esta VACIA). El honorario CALCULADO por-pagar esta en conta.v_nlq_honorarios (neto default), que NO son pagos reales. Para "cuanto se le paga" (config) usa paymentmedic; para el honorario calculado usa v_nlq_honorarios.', 2)
) x(v_Dominio, v_Objeto, v_Regla, i_Orden)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_regla_negocio r
    WHERE r.v_Dominio = x.v_Dominio AND r.v_Regla = x.v_Regla);
GO

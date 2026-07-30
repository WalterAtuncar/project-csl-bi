-- Curacion NLQ 2026-07-28 v2: ingreso de hospitalizacion.
-- Al re-generar la #5, el retriever anclo en "facturado" -> v_nlq_ventas y devolvio el TOTAL
-- de la clinica 2026 (4,535,353.80) en vez del ingreso de hospitalizacion (605,473.29).
-- Fix: (1) mejorar la descripcion de v_nlq_ingreso_consultorio para que el retriever la elija
-- en preguntas de ingreso/facturado de un consultorio o de hospitalizacion; (2) regla que
-- apunta el dinero de hospitalizacion a esa vista y prohibe el total de v_nlq_ventas.
SET NOCOUNT ON;

-- 1) Descripcion (la ve el retriever). Cabe en NVARCHAR(500).
UPDATE conta.nlq_tabla
SET v_Descripcion = N'Ingreso NETO devengado (sin IGV) por CONSULTORIO y mes; grupos ASISTENCIAL (tipocaja 1) y SISOL (tipocaja 3, NETO PLENO 100%). Consultorio resuelto por dentro; buckets HOSPITALIZACION y (SIN CLASIFICAR). Cuadra con sp_Rentabilidad_PorConsultorio. NO tiene linea de negocio ni medico. USAR PARA: ingreso o facturado por consultorio, ingreso o facturado de HOSPITALIZACION o de un area/consultorio especifico, consultorio mas rentable, asistencial vs SISOL.'
WHERE v_Schema = N'conta' AND v_Objeto = N'v_nlq_ingreso_consultorio';

-- 2) Regla de dinero de hospitalizacion (dominio clinico_hospitalizacion, que SI se selecciona).
IF NOT EXISTS (SELECT 1 FROM conta.nlq_regla_negocio
              WHERE v_Dominio = N'clinico_hospitalizacion' AND v_Objeto IS NULL AND i_Orden = 4)
    INSERT INTO conta.nlq_regla_negocio (v_Dominio, v_Objeto, v_Regla, b_Activa, i_Orden)
    VALUES (N'clinico_hospitalizacion', NULL,
        N'El INGRESO o FACTURADO de hospitalizacion se obtiene de conta.v_nlq_ingreso_consultorio filtrando Consultorio=''HOSPITALIZACION'' (da el TOTAL de hospitalizacion, grupo ASISTENCIAL). NUNCA uses un SUM de v_nlq_ventas como ingreso de hospitalizacion, porque v_nlq_ventas es TODA la clinica. Ese ingreso NO es desglosable por linea de negocio ni por medico: si lo piden por linea, devuelve el total y aclara que ese desglose no existe.',
        1, 4);

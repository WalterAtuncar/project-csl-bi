-- Curacion NLQ 2026-07-28: reglas de hospitalizacion e ingreso por consultorio.
-- Origen: revision de una consulta guardada generada por IA sobre hospitalizacion.
-- La regla 21 afirmaba un puente 1:1 que la data desmiente: en 2026 hay 827 hospitalizaciones
-- reales, pero solo 762 con service vinculado no-borrado, y 62 con mas de un service.
-- Idempotente: UPDATEs por clave logica dominio+objeto+orden; INSERT guardado por NOT EXISTS.
SET NOCOUNT ON;

-- 21: corrige el "1:1" -> grano de hospitalizacion + LEFT JOIN a service.
UPDATE conta.nlq_regla_negocio
SET v_Regla = N'hospitalizacionservice une hospitalizacion<->service por (v_HopitalizacionId, v_ServiceId), i_IsDeleted=0; typo legacy v_HopitalizacionId sin s. NO es 1:1: hay hospitalizaciones con mas de un service y otras SIN service, asi que un JOIN directo a service MULTIPLICA filas y sesga los promedios y conteos. REGLA DE ORO: dx (v_CIE10Id, v_DiseasesName), fechas y estancia son columnas de la PROPIA dbo.hospitalizacion; agrega SIEMPRE al grano de hospitalizacion, una fila por v_HopitalizacionId, SIN pasar por el join. La linea de negocio o protocol se resuelve con una subconsulta OUTER APPLY TOP 1 (con LEFT, para no perder hospitalizaciones sin service), nunca con un JOIN que multiplique. NUNCA hagas COUNT(*) ni AVG de estancia sobre el join a service.'
WHERE v_Dominio = N'clinico_hospitalizacion' AND v_Objeto = N'hospitalizacionservice' AND i_Orden = 3;

-- 19: afina estancia (DATEDIFF por dias / alta NULL).
UPDATE conta.nlq_regla_negocio
SET v_Regla = N'Soft-delete i_IsDeleted=0. La FECHA de hospitalizacion es hospitalizacion.d_FechaIngreso, nunca d_ServiceDate ni d_InsertDate; el alta es d_FechaAlta. Estancia = DATEDIFF(day, d_FechaIngreso, d_FechaAlta): cuenta fronteras de fecha, no horas. d_FechaAlta puede ser NULL cuando el paciente sigue internado: excluyela del promedio de estancia.'
WHERE v_Dominio = N'clinico_hospitalizacion' AND v_Objeto IS NULL AND i_Orden = 1;

-- 20: agrega la exclusion de dx NULL al rankear.
UPDATE conta.nlq_regla_negocio
SET v_Regla = N'Los diagnosticos de hospitalizacion NO estan en diagnosticrepository: viven DESNORMALIZADOS en hospitalizacion. Dx de INGRESO = v_CIE10Id + v_DiseasesName; dx de SALIDA o EGRESO = v_CIE10IdSalida + v_DiseasesNameSalida; une a cie10 para la descripcion del codigo. Muchas hospitalizaciones tienen dx de ingreso NULL sin registrar: al rankear el dx mas frecuente EXCLUYE los NULL.'
WHERE v_Dominio = N'clinico_hospitalizacion' AND v_Objeto = N'hospitalizacion' AND i_Orden = 2;

-- Nueva: la vista de ingreso por consultorio no tiene linea de negocio ni medico.
IF NOT EXISTS (SELECT 1 FROM conta.nlq_regla_negocio
              WHERE v_Dominio = N'ingresos_clinicos'
                AND v_Objeto = N'conta.v_nlq_ingreso_consultorio'
                AND i_Orden = 5)
    INSERT INTO conta.nlq_regla_negocio (v_Dominio, v_Objeto, v_Regla, b_Activa, i_Orden)
    VALUES (N'ingresos_clinicos', N'conta.v_nlq_ingreso_consultorio',
        N'conta.v_nlq_ingreso_consultorio SOLO tiene las dimensiones Anio, Mes, Grupo, Consultorio y IdVenta; por ejemplo Consultorio=''HOSPITALIZACION''. NO tiene linea de negocio empresarial/particular/seguros/mtc ni medico. Un SUM de Ingresos filtrado por consultorio da el TOTAL de ese consultorio; NO lo desgloses por linea de negocio ni por medico con esta vista, porque esas columnas no existen.',
        1, 5);

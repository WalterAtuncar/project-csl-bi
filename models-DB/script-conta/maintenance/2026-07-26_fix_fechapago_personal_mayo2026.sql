-- Correccion puntual de datos de PRUEBA (schema conta, aditivo, NO toca dbo).
-- Contexto: los costos de personal de MAYO 2026 se registraron PAGADO con
-- t_FechaPago = 2026-07-26 (fecha de hoy). El flujo detallado agrupa PERSONAL por
-- MONTH(cpm.t_FechaPago) (conta.sp_Caja_FlujoDetallado, RS2), por lo que aparecian en
-- julio (Mes=7) en vez de mayo (Mes=5). El front ya se corrigio para que futuros pagos
-- usen el ultimo dia del mes contabilizado; aqui se corrigen los registros ya existentes.
--
-- NO ejecutar RESEED ni limpieza: son los datos de prueba que el usuario esta validando.
-- Fix-forward: solo se ajusta t_FechaPago de las 6 filas PAGADO de mayo 2026.

SET NOCOUNT ON;

UPDATE conta.costo_personal_mensual
SET t_FechaPago = '2026-05-31'
WHERE n_Anio = 2026 AND n_Mes = 5 AND v_Estado = 'PAGADO';

SELECT @@ROWCOUNT AS FilasActualizadas;

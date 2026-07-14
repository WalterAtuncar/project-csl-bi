-- =====================================================================
-- LIMPIEZA de datos de PRUEBA - Pago de honorarios PH-6 (schema conta).
-- Fecha: 2026-07-14
-- Contexto: el usuario genero en /conta un pago de honorarios de PRUEBA
--   "PH-6 - VELASQUEZ CULQUE, CESAR ALBERTO - jun-2026 - CARDIOLOGIA" y pidio
--   eliminarlo por completo (cabecera + derivados) y reiniciar identidades (RESEED).
--
-- Evidencia previa (SELECT, verificada en produccion antes de correr esto):
--   * conta.pago_honorario:              1 fila  -> i_IdPago = 6 (UNICO pago; Min=Max=6)
--   * conta.pago_honorario_consultorio:  1 fila  -> i_Id = 6  (CARDIOLOGIA, i_IdEgreso = 6)
--   * conta.pago_honorario_servicio:   246 filas -> i_Id 72..317 (todas de PH-6, b_Anulado=0)
--   * conta.egreso:                      1 fila  -> i_IdEgreso = 6 (serie 'PH-6', MED-HON/63, PAGADO)
--   Egreso 6 NO referenciado por compra_ext (0) ni sisol_liquidacion (0): borrado seguro.
--   FUERA DE ALCANCE (no se tocan): conta.entidad id 13 (medico real, catalogo reutilizable)
--   y conta.auditoria ids 84/85 (log append-only).
--
-- TODO lo borrado esta en schema conta. dbo NO se toca (dbo.proveedores es solo padre
-- saliente de egreso; el egreso de PH-6 tiene i_IdProveedor = NULL).
--
-- Orden FK-seguro (hijos primero):
--   1) pago_honorario_consultorio (referencia egreso + pago_honorario)
--   2) pago_honorario_servicio    (referencia pago_honorario)
--   3) egreso                     (ya sin referenciadores)
--   4) pago_honorario             (cabecera, ya sin referenciadores)
--
-- RESEED (tras el borrado las 4 tablas quedan VACIAS -> arranque LIMPIO desde 1):
--   PH-6 era el UNICO pago; los ids 1..5 fueron intentos de prueba ya borrados. Como no
--   sobrevive ningun pago real, por DECISION DEL USUARIO se reinicia todo a cero para que el
--   proximo pago real sea PH-1 (no PH-6). Todas las tablas -> RESEED 0 (seed_inicial-1),
--   proximo id = 1 en cada una. El label "EGRESO CONTA PH-<n>" deriva de la SERIE
--   (PH-<idPago>), asi que el proximo pago rendera como PH-1.
-- =====================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @c1 INT = 0, @c2 INT = 0, @c3 INT = 0, @c4 INT = 0;

BEGIN TRAN;

    -- Capturar los egresos ligados a los consultorios del pago 6 (antes de borrar el puente).
    DECLARE @egresos TABLE (id INT);
    INSERT INTO @egresos (id)
        SELECT i_IdEgreso FROM conta.pago_honorario_consultorio
        WHERE i_IdPago = 6 AND i_IdEgreso IS NOT NULL;

    -- 1) Puente por consultorio (referencia egreso y pago).
    DELETE FROM conta.pago_honorario_consultorio WHERE i_IdPago = 6;
    SET @c1 = @@ROWCOUNT;

    -- 2) Servicios pagados del pago 6.
    DELETE FROM conta.pago_honorario_servicio WHERE i_IdPago = 6;
    SET @c2 = @@ROWCOUNT;

    -- 3) Egreso(s) espejo capturados, doble-guarda por serie + tipo de gasto MED-HON.
    DELETE FROM conta.egreso
    WHERE i_IdEgreso IN (SELECT id FROM @egresos)
      AND v_SerieNumero = 'PH-6'
      AND i_IdTipoGasto = 63;
    SET @c3 = @@ROWCOUNT;

    -- 4) Cabecera del pago.
    DELETE FROM conta.pago_honorario WHERE i_IdPago = 6;
    SET @c4 = @@ROWCOUNT;

COMMIT TRAN;

-- RESEED de identidades (tablas vacias tras el borrado -> arranque limpio desde 1).
DBCC CHECKIDENT ('conta.pago_honorario',             RESEED, 0) WITH NO_INFOMSGS;  -- proximo = PH-1
DBCC CHECKIDENT ('conta.egreso',                     RESEED, 0) WITH NO_INFOMSGS;  -- proximo id = 1
DBCC CHECKIDENT ('conta.pago_honorario_consultorio', RESEED, 0) WITH NO_INFOMSGS;  -- proximo id = 1
DBCC CHECKIDENT ('conta.pago_honorario_servicio',    RESEED, 0) WITH NO_INFOMSGS;  -- proximo id = 1

-- Evidencia: filas borradas por tabla.
SELECT @c1 AS del_consultorio, @c2 AS del_servicio, @c3 AS del_egreso, @c4 AS del_pago;

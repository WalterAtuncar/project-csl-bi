-- =====================================================================
-- LIMPIEZA de datos de PRUEBA - QA del feature "Tipo de Produccion" de
-- honorarios (ddl/13_honorarios_tipo_produccion.sql). Schema conta.
-- Fecha: 2026-07-18
--
-- Contexto: durante la FASE 4 del QA se registraron via API DOS pagos de
--   honorarios de prueba (medico "SOTO GAMARRA, MICHAEL", i_MedicoId 33163,
--   entidad conta 1013, consultorio 6 CARDIOLOGIA) para ejercitar el ruteo
--   del centro de costo por v_TipoProduccion:
--     * PH-1 (i_IdPago=1)  v_TipoProduccion='SISOL'   glosa 'TEST QA SISOL'
--                          servicio N009-SR000794300  TotalPago 19.50
--                          -> egreso 1  CC-SISOL (centro 6)
--     * PH-2 (i_IdPago=2)  v_TipoProduccion='CLINICA' glosa 'TEST QA CLINICA'
--                          servicio N009-SR000794377  TotalPago 52.00
--                          -> egreso 2  CC-ASIS  (centro 2)
--   Ambos son residuo de prueba: se eliminan por completo (cabecera + todos los
--   derivados + egresos espejo) y se reinician identidades (RESEED a 0) para
--   dejar el modulo de honorarios pristino -> el proximo pago REAL vuelve a ser
--   PH-1 / egreso 1. Mismo criterio que 2026-07-18_cleanup_PH-1_sisol.sql y
--   2026-07-14_cleanup_PH-6.sql.
--
-- GRAFO ENUMERADO EN PRODUCCION (verificado por SELECT antes de correr esto):
--   * conta.pago_honorario:              2 filas -> i_IdPago 1 (SISOL) y 2 (CLINICA)
--   * conta.pago_honorario_consultorio:  2 filas -> i_Id 1 (pago 1 -> egreso 1) / i_Id 2 (pago 2 -> egreso 2)
--                                          ambas consultorio 6 (CARDIOLOGIA)
--   * conta.pago_honorario_servicio:     2 filas -> i_Id 1 (pago 1, N009-SR000794300, b_Anulado=0)
--                                                    i_Id 2 (pago 2, N009-SR000794377, b_Anulado=0)
--   * conta.comprobante_honorario:       2 filas -> i_Id 1 (pago 1) / i_Id 2 (pago 2), TipoComprobante '02'
--                                          (Recibo por Honorarios), i_IdProveedor NULL (no engancha dbo)
--   * conta.egreso:                      2 filas -> i_IdEgreso 1 (E001-1, MED-HON/63, CC 6, PAGADO, 19.50)
--                                                    i_IdEgreso 2 (E001-1, MED-HON/63, CC 2, PAGADO, 52.00)
--                                          ambos i_IdProveedor NULL (recibo sin proveedor -> ni engancha
--                                          la FK saliente a dbo.proveedores), i_IdEntidad 1013.
--
--   DEPENDENCIAS / REFERENCIADORES de los egresos 1 y 2 (verificado):
--     * conta.egreso total en toda la tabla = 2 (SOLO estos dos; el modulo estaba VACIO antes del QA)
--     * conta.compra_ext.i_IdEgreso IN (1,2)              -> 0 filas
--     * conta.sisol_liquidacion.i_IdEgresoHospital IN (1,2) -> 0 filas
--     * conta.pago_honorario_consultorio.i_IdEgreso        -> filas 1 y 2 (las que se borran aqui)
--   Las 3 FKs entrantes a conta.egreso (compra_ext / pago_honorario_consultorio / sisol_liquidacion)
--   quedan cubiertas: sin egreso huerfano en caja/rentabilidad tras el borrado.
--
--   FUERA DE ALCANCE (NO se tocan; mismo criterio que los cleanups previos):
--     * conta.entidad id 1013 (SOTO GAMARRA, MICHAEL - MEDICO): catalogo reutilizable; el proximo
--       pago real lo re-usa via upsert por v_Nombre. Sin FK/impacto en caja/rentabilidad.
--     * conta.auditoria: LOG append-only. Precedente del proyecto (PH-6, PH-1): se deja intacto.
--       Sin FK; no genera huerfano.
--
-- FRONTERA dbo: TODO lo borrado es schema conta. dbo NO se toca. Los egresos y los comprobantes
--   tienen i_IdProveedor NULL -> ni siquiera se ejercitan las FKs salientes a dbo.proveedores.
--
-- Orden FK-seguro (hijos primero):
--   1) pago_honorario_consultorio (referencia egreso + pago_honorario) -> se borra ANTES de egreso y pago
--   2) pago_honorario_servicio    (referencia pago_honorario)
--   3) comprobante_honorario      (referencia pago_honorario; FK dbo.proveedores no ejercitada, prov NULL)
--   4) egreso                     (ya sin referenciadores: consultorio borrado, compra_ext/sisol_liq = 0)
--   5) pago_honorario             (cabecera, ya sin referenciadores)
--
-- RESEED (tras el borrado las 5 tablas quedan VACIAS -> arranque LIMPIO desde 1):
--   Los pagos 1/2 eran los UNICOS pagos y los egresos 1/2 los UNICOS egresos de toda conta.egreso.
--   Como no sobrevive ningun pago/egreso real, se reinician todas a 0 (RESEED,0 -> proximo id = 1).
--   La serie del egreso deriva de E001-<n>/PH-<idPago>, asi que el proximo pago rendera de nuevo como
--   PH-1. (Si existieran egresos NO-QA, NO se reiniciaria egreso a 0 sino al MAX id restante.)
-- =====================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @c1 INT = 0, @c2 INT = 0, @c3 INT = 0, @c4 INT = 0, @c5 INT = 0;

-- Guarda 0a: los dos pagos de prueba deben existir tal cual (evita correr en estado inesperado).
IF NOT EXISTS (SELECT 1 FROM conta.pago_honorario
               WHERE i_IdPago = 1 AND v_TipoProduccion = 'SISOL'
                 AND v_MedicoNombre = 'SOTO GAMARRA, MICHAEL' AND d_TotalPago = 19.50)
BEGIN
    RAISERROR('ABORTADO: PH-1 no coincide con el residuo QA esperado (id=1 / SISOL / SOTO GAMARRA, MICHAEL / 19.50).', 16, 1);
    RETURN;
END
IF NOT EXISTS (SELECT 1 FROM conta.pago_honorario
               WHERE i_IdPago = 2 AND v_TipoProduccion = 'CLINICA'
                 AND v_MedicoNombre = 'SOTO GAMARRA, MICHAEL' AND d_TotalPago = 52.00)
BEGIN
    RAISERROR('ABORTADO: PH-2 no coincide con el residuo QA esperado (id=2 / CLINICA / SOTO GAMARRA, MICHAEL / 52.00).', 16, 1);
    RETURN;
END

-- Guarda 0b: conta.egreso debe contener SOLO los 2 egresos de prueba (el modulo estaba vacio antes del QA).
IF (SELECT COUNT(*) FROM conta.egreso) <> 2
   OR EXISTS (SELECT 1 FROM conta.egreso WHERE i_IdEgreso NOT IN (1,2))
   OR EXISTS (SELECT 1 FROM conta.egreso WHERE i_IdEgreso IN (1,2) AND (i_IdTipoGasto <> 63 OR v_Estado <> 'PAGADO'))
BEGIN
    RAISERROR('ABORTADO: conta.egreso no es exactamente {1,2} MED-HON/PAGADO; hay egresos inesperados. NO se reseed a 0.', 16, 1);
    RETURN;
END

-- Guarda 0c: no debe haber referenciadores externos a los egresos 1/2 (dependencia inesperada => detener).
IF EXISTS (SELECT 1 FROM conta.compra_ext WHERE i_IdEgreso IN (1,2))
   OR EXISTS (SELECT 1 FROM conta.sisol_liquidacion WHERE i_IdEgresoHospital IN (1,2))
BEGIN
    RAISERROR('ABORTADO: los egresos 1/2 estan referenciados por compra_ext o sisol_liquidacion (dependencia inesperada).', 16, 1);
    RETURN;
END

BEGIN TRAN;

    -- Capturar los egresos ligados a los consultorios de los pagos 1 y 2 (antes de borrar el puente).
    DECLARE @egresos TABLE (id INT);
    INSERT INTO @egresos (id)
        SELECT i_IdEgreso FROM conta.pago_honorario_consultorio
        WHERE i_IdPago IN (1,2) AND i_IdEgreso IS NOT NULL;

    -- 1) Puente por consultorio (referencia egreso y pago).
    DELETE FROM conta.pago_honorario_consultorio WHERE i_IdPago IN (1,2);
    SET @c1 = @@ROWCOUNT;

    -- 2) Servicios pagados de los pagos 1 y 2.
    DELETE FROM conta.pago_honorario_servicio WHERE i_IdPago IN (1,2);
    SET @c2 = @@ROWCOUNT;

    -- 3) Comprobantes tributarios (2 filas: pagos 1 y 2).
    DELETE FROM conta.comprobante_honorario WHERE i_IdPago IN (1,2);
    SET @c3 = @@ROWCOUNT;

    -- 4) Egresos espejo capturados, doble-guarda por tipo de gasto MED-HON (63) y estado PAGADO.
    DELETE FROM conta.egreso
    WHERE i_IdEgreso IN (SELECT id FROM @egresos)
      AND i_IdTipoGasto = 63
      AND v_Estado = 'PAGADO';
    SET @c4 = @@ROWCOUNT;

    -- 5) Cabeceras de los pagos.
    DELETE FROM conta.pago_honorario WHERE i_IdPago IN (1,2);
    SET @c5 = @@ROWCOUNT;

    -- Guarda final: el grafo debe quedar vacio antes de reseed a 0.
    IF (SELECT COUNT(*) FROM conta.pago_honorario) <> 0
       OR (SELECT COUNT(*) FROM conta.pago_honorario_consultorio) <> 0
       OR (SELECT COUNT(*) FROM conta.pago_honorario_servicio) <> 0
       OR (SELECT COUNT(*) FROM conta.comprobante_honorario) <> 0
       OR (SELECT COUNT(*) FROM conta.egreso) <> 0
    BEGIN
        ROLLBACK TRAN;
        RAISERROR('ABORTADO: quedan filas inesperadas tras el borrado; no se hace RESEED.', 16, 1);
        RETURN;
    END

COMMIT TRAN;

-- RESEED de identidades (las 5 tablas quedan vacias tras el borrado -> arranque limpio desde 1).
DBCC CHECKIDENT ('conta.pago_honorario',             RESEED, 0) WITH NO_INFOMSGS;  -- proximo = PH-1
DBCC CHECKIDENT ('conta.pago_honorario_consultorio', RESEED, 0) WITH NO_INFOMSGS;  -- proximo id = 1
DBCC CHECKIDENT ('conta.pago_honorario_servicio',    RESEED, 0) WITH NO_INFOMSGS;  -- proximo id = 1
DBCC CHECKIDENT ('conta.comprobante_honorario',      RESEED, 0) WITH NO_INFOMSGS;  -- proximo id = 1
DBCC CHECKIDENT ('conta.egreso',                     RESEED, 0) WITH NO_INFOMSGS;  -- proximo id = 1 (unicos egresos eran los QA)

-- Evidencia: filas borradas por tabla.
SELECT @c1 AS del_consultorio, @c2 AS del_servicio, @c3 AS del_comprobante,
       @c4 AS del_egreso, @c5 AS del_pago;

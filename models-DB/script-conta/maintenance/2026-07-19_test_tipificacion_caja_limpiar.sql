-- =====================================================================
-- LIMPIEZA de datos de PRUEBA - Tipificacion de egresos de caja (FASE 1/2).
-- Par de: 2026-07-19_test_tipificacion_caja.sql. Schema conta.
-- Fecha: 2026-07-19.
--
-- Deja el estado EXACTAMENTE como antes del test:
--   conta.egreso_caja_clasificacion  -> 0 filas, ident RESEED a MAX vivo (0)
--   conta.pago_honorario (Origen CAJA)-> 0 filas, ident RESEED a MAX vivo (0)
--   conta.pago_honorario_consultorio -> 0 filas, RESEED a MAX vivo (0)
--   conta.pago_honorario_servicio    -> 0 filas, RESEED a MAX vivo (0)
--   conta.entidad (medico de prueba) -> se borra la entidad creada por el upsert (BRINGAS VASQUEZ, YRENE),
--                                        RESEED a MAX vivo (1013)
--   conta.egreso                     -> NO se toca (el honorario-caja JAMAS crea egreso; queda en 0)
--   conta.auditoria                  -> LOG append-only, se deja intacto (precedente del proyecto:
--                                        2026-07-18_cleanup_QA_..., PH-6, PH-1). Sin FK, no genera huerfano.
--
-- IMPORTANTE (skill): RESEED al MAX id VIVO real (dinamico via DBCC EXEC), NUNCA a un valor fijo hueco.
-- Guards LIKE con %...% (NO corchetes: en LIKE los corchetes son clase de caracteres).
-- FRONTERA dbo: TODO lo borrado es schema conta. dbo NO se toca. Ninguna venta EC/servicio legacy se altera.
-- =====================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Ventas EC usadas por el test (unicas que pudieron generar overlay/pago).
DECLARE @ventas TABLE (v NCHAR(16));
INSERT INTO @ventas(v) VALUES
    ('N001-ZQ000345140'),('N001-ZQ000345146'),('N001-ZQ000345148'),('N001-ZQ000351858');

-- Guard 0: no debe existir NINGUN pago de honorario que NO sea de origen CAJA de prueba
--          (proteccion: si apareciera un pago WEB real, abortar sin tocar nada).
IF EXISTS (SELECT 1 FROM conta.pago_honorario WHERE v_Origen <> 'CAJA')
BEGIN RAISERROR('ABORTADO: hay pagos de honorarios que NO son de origen CAJA (datos reales) - no se limpia.', 16, 1); RETURN; END

-- Guard 1: el overlay solo debe contener filas de las ventas de prueba.
IF EXISTS (SELECT 1 FROM conta.egreso_caja_clasificacion ov
           WHERE LTRIM(RTRIM(ov.v_IdVenta)) NOT IN (SELECT LTRIM(RTRIM(v)) FROM @ventas))
BEGIN RAISERROR('ABORTADO: el overlay contiene ventas ajenas al test - no se limpia.', 16, 1); RETURN; END

BEGIN TRAN;

    DECLARE @pagos TABLE (id INT);
    INSERT INTO @pagos(id)
        SELECT i_IdPago FROM conta.pago_honorario
        WHERE v_Origen = 'CAJA'
          AND LTRIM(RTRIM(v_IdVentaCaja)) IN (SELECT LTRIM(RTRIM(v)) FROM @ventas);

    -- Entidades medico creadas por el upsert del test (nombres exactos de los medicos de prueba:
    -- CLINICA=BRINGAS VASQUEZ YRENE, SISOL=PAJARES HUARIPATA EDWIN). Solo si NO quedan referenciadas.
    DECLARE @entidades TABLE (id INT);
    INSERT INTO @entidades(id)
        SELECT i_IdEntidad FROM conta.entidad
        WHERE v_Tipo = 'MEDICO'
          AND (v_Nombre LIKE '%BRINGAS VASQUEZ, YRENE%' OR v_Nombre LIKE '%PAJARES HUARIPATA, EDWIN%');

    -- 1) overlay (hijo logico; referencia pago).
    DELETE FROM conta.egreso_caja_clasificacion
    WHERE LTRIM(RTRIM(v_IdVenta)) IN (SELECT LTRIM(RTRIM(v)) FROM @ventas);
    DECLARE @dOverlay INT = @@ROWCOUNT;

    -- 2) servicios y consultorios de los pagos CAJA.
    DELETE FROM conta.pago_honorario_servicio    WHERE i_IdPago IN (SELECT id FROM @pagos);
    DECLARE @dServ INT = @@ROWCOUNT;
    DELETE FROM conta.pago_honorario_consultorio WHERE i_IdPago IN (SELECT id FROM @pagos);
    DECLARE @dCons INT = @@ROWCOUNT;

    -- 3) cabeceras de pago CAJA.
    DELETE FROM conta.pago_honorario WHERE i_IdPago IN (SELECT id FROM @pagos);
    DECLARE @dPago INT = @@ROWCOUNT;

    -- 4) entidad medico de prueba (ya sin pago que la referencie).
    DELETE FROM conta.entidad
    WHERE i_IdEntidad IN (SELECT id FROM @entidades)
      AND NOT EXISTS (SELECT 1 FROM conta.pago_honorario ph WHERE ph.i_IdEntidad = conta.entidad.i_IdEntidad)
      AND NOT EXISTS (SELECT 1 FROM conta.egreso e WHERE e.i_IdEntidad = conta.entidad.i_IdEntidad);
    DECLARE @dEnt INT = @@ROWCOUNT;

    -- Guard final: las 4 tablas de tipificacion deben quedar VACIAS antes del RESEED.
    IF (SELECT COUNT(*) FROM conta.egreso_caja_clasificacion) <> 0
       OR (SELECT COUNT(*) FROM conta.pago_honorario WHERE v_Origen = 'CAJA') <> 0
       OR (SELECT COUNT(*) FROM conta.pago_honorario_consultorio) <> 0
       OR (SELECT COUNT(*) FROM conta.pago_honorario_servicio) <> 0
    BEGIN ROLLBACK TRAN; RAISERROR('ABORTADO: quedan filas de prueba tras el borrado; no se hace RESEED.', 16, 1); RETURN; END

COMMIT TRAN;

-- RESEED al MAX id VIVO real (dinamico). Si sobrevive una fila real por encima, se respeta.
DECLARE @sql NVARCHAR(MAX) = '';
DECLARE @m INT;
SET @m = (SELECT ISNULL(MAX(i_IdClasificacion),0) FROM conta.egreso_caja_clasificacion);
SET @sql += 'DBCC CHECKIDENT(''conta.egreso_caja_clasificacion'', RESEED, ' + CAST(@m AS VARCHAR(20)) + ') WITH NO_INFOMSGS;';
SET @m = (SELECT ISNULL(MAX(i_IdPago),0) FROM conta.pago_honorario);
SET @sql += 'DBCC CHECKIDENT(''conta.pago_honorario'', RESEED, ' + CAST(@m AS VARCHAR(20)) + ') WITH NO_INFOMSGS;';
SET @m = (SELECT ISNULL(MAX(i_Id),0) FROM conta.pago_honorario_consultorio);
SET @sql += 'DBCC CHECKIDENT(''conta.pago_honorario_consultorio'', RESEED, ' + CAST(@m AS VARCHAR(20)) + ') WITH NO_INFOMSGS;';
SET @m = (SELECT ISNULL(MAX(i_Id),0) FROM conta.pago_honorario_servicio);
SET @sql += 'DBCC CHECKIDENT(''conta.pago_honorario_servicio'', RESEED, ' + CAST(@m AS VARCHAR(20)) + ') WITH NO_INFOMSGS;';
SET @m = (SELECT ISNULL(MAX(i_IdEntidad),0) FROM conta.entidad);
SET @sql += 'DBCC CHECKIDENT(''conta.entidad'', RESEED, ' + CAST(@m AS VARCHAR(20)) + ') WITH NO_INFOMSGS;';
EXEC (@sql);

SELECT @dOverlay AS del_overlay, @dServ AS del_servicio, @dCons AS del_consultorio,
       @dPago AS del_pago, @dEnt AS del_entidad;

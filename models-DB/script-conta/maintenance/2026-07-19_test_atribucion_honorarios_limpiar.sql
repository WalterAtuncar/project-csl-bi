-- =====================================================================
-- LIMPIEZA de la siembra E2E "Atribucion de honorarios por tipo de
-- produccion" (par de 2026-07-19_test_atribucion_honorarios.sql). Schema conta.
-- Fecha: 2026-07-19
--
-- Borra EXACTAMENTE los 2 pagos de prueba (glosa '[TEST-ATRIB]%') y todos sus
-- derivados (servicios, consultorios, egresos espejo) + las 2 entidades MEDICO
-- creadas por la siembra, en orden FK-seguro, y REINICIA las identidades al
-- MAX(id) VIVO real de cada tabla (calculado en runtime; 0 si queda vacia).
-- NO reseedea a un valor fijo/hueco (leccion 2026-07-19).
--
-- IDENTIFICACION del residuo (robusta, no por id fijo):
--   * pagos de prueba  : conta.pago_honorario.v_Glosa LIKE '[TEST-ATRIB]%'  (deben ser 2)
--   * egresos de prueba: conta.pago_honorario_consultorio.i_IdEgreso de esos pagos
--   * entidades prueba : conta.entidad v_Tipo='MEDICO' con los 2 nombres sembrados
--                        y i_IdEntidad > 1013 (protege las pre-existentes id 13 / 1013)
--
-- FRONTERA dbo: TODO lo borrado es schema conta. dbo NO se toca (los egresos
--   tienen i_IdProveedor NULL -> ni ejercita la FK a dbo.proveedores).
--   conta.auditoria: LOG append-only -> se deja intacto (precedente del proyecto:
--   PH-6, PH-1, QA-tipoproduccion). Sin FK, no genera huerfano.
--
-- Orden FK-seguro (hijos primero):
--   1) pago_honorario_consultorio (referencia egreso + pago_honorario)
--   2) pago_honorario_servicio    (referencia pago_honorario)
--   3) egreso                     (ya sin referenciadores: consultorio borrado)
--   4) pago_honorario             (cabecera)
--   5) entidad MEDICO de prueba   (referenciada por egreso.i_IdEntidad -> tras el egreso)
-- =====================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @nombresTest TABLE (v_Nombre NVARCHAR(200));
INSERT INTO @nombresTest (v_Nombre) VALUES (N'BUENO MANTILLA, VICKY DELIACIT'), (N'HORNA TONGO, LUIS ANTONIO');

-- Capturar pagos de prueba por marca de glosa.
-- OJO: en LIKE los corchetes son clase de caracteres -> se matchea el texto interno
-- 'TEST-ATRIB' (sin corchetes en el patron: el guion NO es especial fuera de []).
DECLARE @pagos TABLE (id INT);
INSERT INTO @pagos (id) SELECT i_IdPago FROM conta.pago_honorario WHERE v_Glosa LIKE '%TEST-ATRIB%';

-- Guarda 0a: exactamente 2 pagos de prueba (1 CLINICA BUENO 24.00 + 1 SISOL HORNA 35.00).
IF (SELECT COUNT(*) FROM @pagos) <> 2
BEGIN RAISERROR('ABORTADO: no hay exactamente 2 pagos [TEST-ATRIB] (revisar estado).', 16, 1); RETURN; END
IF NOT EXISTS (SELECT 1 FROM conta.pago_honorario WHERE i_IdPago IN (SELECT id FROM @pagos)
               AND v_TipoProduccion='CLINICA' AND v_MedicoNombre=N'BUENO MANTILLA, VICKY DELIACIT' AND d_TotalPago=24.00)
BEGIN RAISERROR('ABORTADO: el pago CLINICA de prueba no coincide (BUENO MANTILLA / 24.00).', 16, 1); RETURN; END
IF NOT EXISTS (SELECT 1 FROM conta.pago_honorario WHERE i_IdPago IN (SELECT id FROM @pagos)
               AND v_TipoProduccion='SISOL' AND v_MedicoNombre=N'HORNA TONGO, LUIS ANTONIO' AND d_TotalPago=35.00)
BEGIN RAISERROR('ABORTADO: el pago SISOL de prueba no coincide (HORNA TONGO / 35.00).', 16, 1); RETURN; END

-- Capturar egresos espejo de esos pagos.
DECLARE @egresos TABLE (id INT);
INSERT INTO @egresos (id) SELECT i_IdEgreso FROM conta.pago_honorario_consultorio
    WHERE i_IdPago IN (SELECT id FROM @pagos) AND i_IdEgreso IS NOT NULL;

-- Guarda 0b: todos los egresos de prueba son MED-HON(63)/PAGADO en centros 2 o 6.
IF EXISTS (SELECT 1 FROM conta.egreso WHERE i_IdEgreso IN (SELECT id FROM @egresos)
           AND (i_IdTipoGasto <> 63 OR v_Estado <> 'PAGADO' OR i_IdCentroCosto NOT IN (2,6)))
BEGIN RAISERROR('ABORTADO: un egreso de prueba no es MED-HON/PAGADO en centro 2/6 (dependencia inesperada).', 16, 1); RETURN; END

-- Guarda 0c: sin referenciadores externos a los egresos de prueba.
IF EXISTS (SELECT 1 FROM conta.compra_ext WHERE i_IdEgreso IN (SELECT id FROM @egresos))
   OR EXISTS (SELECT 1 FROM conta.sisol_liquidacion WHERE i_IdEgresoHospital IN (SELECT id FROM @egresos))
BEGIN RAISERROR('ABORTADO: egreso de prueba referenciado por compra_ext o sisol_liquidacion.', 16, 1); RETURN; END

-- Capturar entidades MEDICO creadas por la siembra (protege pre-existentes id 13 / 1013).
DECLARE @ents TABLE (id INT);
INSERT INTO @ents (id) SELECT i_IdEntidad FROM conta.entidad
    WHERE v_Tipo='MEDICO' AND i_IdEntidad > 1013 AND v_Nombre IN (SELECT v_Nombre FROM @nombresTest);

DECLARE @c1 INT=0, @c2 INT=0, @c3 INT=0, @c4 INT=0, @c5 INT=0;

BEGIN TRAN;

    DELETE FROM conta.pago_honorario_consultorio WHERE i_IdPago IN (SELECT id FROM @pagos);
    SET @c1 = @@ROWCOUNT;

    DELETE FROM conta.pago_honorario_servicio WHERE i_IdPago IN (SELECT id FROM @pagos);
    SET @c2 = @@ROWCOUNT;

    DELETE FROM conta.egreso
    WHERE i_IdEgreso IN (SELECT id FROM @egresos) AND i_IdTipoGasto = 63 AND v_Estado = 'PAGADO';
    SET @c3 = @@ROWCOUNT;

    DELETE FROM conta.pago_honorario WHERE i_IdPago IN (SELECT id FROM @pagos);
    SET @c4 = @@ROWCOUNT;

    DELETE FROM conta.entidad WHERE i_IdEntidad IN (SELECT id FROM @ents);
    SET @c5 = @@ROWCOUNT;

COMMIT TRAN;

-- ---------------------------------------------------------------------
-- RESEED al MAX(id) VIVO real de cada tabla (0 si queda vacia). Dinamico:
-- DBCC CHECKIDENT (t, RESEED, V) -> current=V, proximo insert=V+1.
-- ---------------------------------------------------------------------
DECLARE @m INT, @sql NVARCHAR(400);

SELECT @m = ISNULL(MAX(i_IdEgreso),0) FROM conta.egreso;
SET @sql = 'DBCC CHECKIDENT (''conta.egreso'', RESEED, ' + CAST(@m AS VARCHAR(12)) + ') WITH NO_INFOMSGS'; EXEC(@sql);

SELECT @m = ISNULL(MAX(i_IdPago),0) FROM conta.pago_honorario;
SET @sql = 'DBCC CHECKIDENT (''conta.pago_honorario'', RESEED, ' + CAST(@m AS VARCHAR(12)) + ') WITH NO_INFOMSGS'; EXEC(@sql);

SELECT @m = ISNULL(MAX(i_Id),0) FROM conta.pago_honorario_consultorio;
SET @sql = 'DBCC CHECKIDENT (''conta.pago_honorario_consultorio'', RESEED, ' + CAST(@m AS VARCHAR(12)) + ') WITH NO_INFOMSGS'; EXEC(@sql);

SELECT @m = ISNULL(MAX(i_Id),0) FROM conta.pago_honorario_servicio;
SET @sql = 'DBCC CHECKIDENT (''conta.pago_honorario_servicio'', RESEED, ' + CAST(@m AS VARCHAR(12)) + ') WITH NO_INFOMSGS'; EXEC(@sql);

SELECT @m = ISNULL(MAX(i_IdEntidad),0) FROM conta.entidad;
SET @sql = 'DBCC CHECKIDENT (''conta.entidad'', RESEED, ' + CAST(@m AS VARCHAR(12)) + ') WITH NO_INFOMSGS'; EXEC(@sql);

-- Evidencia: filas borradas por tabla.
SELECT @c1 AS del_consultorio, @c2 AS del_servicio, @c3 AS del_egreso, @c4 AS del_pago, @c5 AS del_entidad;

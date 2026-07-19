-- =====================================================================
-- LIMPIEZA de los 2 usuarios de PRUEBA de la matriz de permisos (schema conta).
-- Fecha: 2026-07-15   (pareja de 2026-07-15_test_usuarios_permisos_crear.sql)
--
-- Borra test.gerente (id 7) y test.conta (id 8) y sus filas de rol, y reinicia
-- la identidad de conta.usuario a IDENT_CURRENT = 9 -> el proximo alta sera id 10.
--
-- OJO (2026-07-19): NO se puede reutilizar el id 7 (la idea original del script).
-- Despues de crear los usuarios de prueba (7/8) se vinculo un usuario REAL de
-- legacy, `leg_193`, que ocupa el id 9 (IDENT_CURRENT paso de 6 a 9). Reseed a 6
-- provocaria que los proximos altas tomen 7,8,9 -> colision de PK con leg_193.
-- Por eso se reseedea a 9 (max id vivo): 7 y 8 quedan como huecos de identidad
-- inertes (inofensivos) y el proximo usuario real sera id 10.
--
-- FK-safe: conta.usuario_rol referencia conta.usuario -> se borran los hijos primero.
-- Nada mas referencia a estos ids (i_InsertaIdUsuario de ambos = 1; la auditoria de su
-- alta tiene i_IdUsuario = 1, el actor 'sa', no 7/8).
--
-- FUERA DE ALCANCE (no se toca): conta.auditoria (log append-only; contiene 2 filas
--   'INSERT' de su alta con actor i_IdUsuario=1). Se deja intacta, igual que en la
--   limpieza de PH-6 (2026-07-14). Si el usuario quiere purgarlas tambien, identificar
--   por: v_Tabla='conta.usuario' AND v_Detalle IN ('test.gerente','test.conta').
--
-- SOLO schema conta. dbo / SigesoftDesarrollo_2 NO se tocan. Solo se borran estos 2.
-- =====================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @rol INT = 0, @usr INT = 0;

BEGIN TRAN;

    -- Ids objetivo, resueltos por username+origen LOCAL (defensivo).
    DECLARE @ids TABLE (id INT);
    INSERT INTO @ids (id)
        SELECT i_IdUsuario FROM conta.usuario
        WHERE v_Username IN ('test.gerente','test.conta') AND v_AuthOrigen = 'LOCAL';

    -- 1) Filas de rol (hijos).
    DELETE FROM conta.usuario_rol WHERE i_IdUsuario IN (SELECT id FROM @ids);
    SET @rol = @@ROWCOUNT;

    -- 2) Usuarios de prueba.
    DELETE FROM conta.usuario WHERE i_IdUsuario IN (SELECT id FROM @ids);
    SET @usr = @@ROWCOUNT;

COMMIT TRAN;

-- RESEED al max id vivo (leg_193 ocupa id 9) -> proximo id = 10. Ver nota arriba.
DBCC CHECKIDENT ('conta.usuario', RESEED, 9) WITH NO_INFOMSGS;

-- Evidencia: filas borradas + estado de identidad restaurado + confirmacion de que no quedan.
SELECT @rol AS del_usuario_rol, @usr AS del_usuario,
       IDENT_CURRENT('conta.usuario') AS ident_current_final,
       (SELECT COUNT(*) FROM conta.usuario WHERE v_Username IN ('test.gerente','test.conta')) AS remanentes;

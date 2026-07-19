-- =====================================================================
-- DATOS DE PRUEBA (desechables) - 2 usuarios LOCAL para validar la matriz
-- de permisos por rol (GERENTE=lector, CONTABILIDAD=operador). Schema conta.
-- Fecha: 2026-07-15
--
-- Se crean con el MISMO stored procedure que usa el endpoint SA "crear usuario"
--   (AuthController.CrearUsuario -> AuthRepository.InsertUsuario -> conta.sp_Usuario_Insert),
-- para reproducir fielmente el comportamiento del API:
--   * @PasswordHash se inserta TAL CUAL (el API ya lo hasho con PasswordHasher.Hash;
--     el SP NO re-hashea). Los hashes de abajo los calculo el usuario con PBKDF2-SHA256
--     100k iter, formato iter.saltB64.hashB64, y corresponden al claro 'Prueba.2026'.
--   * v_AuthOrigen queda en su DEFAULT 'LOCAL' (constraint DF_usuario_AuthOrigen).
--   * b_Activo queda en su DEFAULT 1.
--   * Roles CSV -> filas en la tabla puente conta.usuario_rol (via el SP).
--   * @IdUsuarioAccion = 1 (usuario 'sa' LOCAL, id=1) para la auditoria conta.auditoria.
--
-- Estado previo verificado en produccion:
--   conta.usuario: 6 filas (ids 1..6), IDENT_CURRENT = 6.
--   conta.rol: SA=1, GERENTE=2, CONTABILIDAD=3.
--   test.gerente / test.conta NO existen.
-- Los nuevos tomaran ids 7 (test.gerente) y 8 (test.conta).
--
-- SOLO schema conta. dbo / SigesoftDesarrollo_2 NO se tocan. No se altera a ningun
-- otro usuario. Limpieza + RESEED en el script 2026-07-15_test_usuarios_permisos_limpiar.sql.
-- =====================================================================
SET NOCOUNT ON;

-- 1) GERENTE (lector). Hash del claro 'Prueba.2026'.
EXEC conta.sp_Usuario_Insert
    @Username        = N'test.gerente',
    @PasswordHash    = N'100000.PtFNJMQIIMGWWOKDT9h4Sw==.Aed4ITu/bTgK8GUr2a5Kt7fcidbGwg3KCKOIfAngmPY=',
    @NombreCompleto  = N'Prueba Gerente',
    @Roles           = N'GERENTE',
    @IdUsuarioAccion = 1;

-- 2) CONTABILIDAD (operador). Hash del claro 'Prueba.2026'.
EXEC conta.sp_Usuario_Insert
    @Username        = N'test.conta',
    @PasswordHash    = N'100000.C4xMaIDZYyxsNBt317U3oA==.9KwAdDunkQDsCseUyK+0cthC7HTJthip4o/TNqsi2qI=',
    @NombreCompleto  = N'Prueba Contabilidad',
    @Roles           = N'CONTABILIDAD',
    @IdUsuarioAccion = 1;

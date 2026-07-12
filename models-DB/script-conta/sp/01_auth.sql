-- =====================================================================
-- FASE 1 - Identity: autenticacion y gestion de usuarios. SQL Server 2012.
-- =====================================================================

IF OBJECT_ID('conta.sp_Auth_GetUsuario','P') IS NOT NULL DROP PROCEDURE conta.sp_Auth_GetUsuario;
GO
CREATE PROCEDURE conta.sp_Auth_GetUsuario
    @Username NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT u.i_IdUsuario, u.v_Username, u.v_PasswordHash, u.v_NombreCompleto, u.b_Activo, u.v_AuthOrigen,
           STUFF((SELECT ',' + r.v_Nombre
                    FROM conta.usuario_rol ur JOIN conta.rol r ON r.i_IdRol = ur.i_IdRol
                   WHERE ur.i_IdUsuario = u.i_IdUsuario
                   FOR XML PATH('')), 1, 1, '') AS Roles
    FROM conta.usuario u
    WHERE u.v_Username = @Username;
END
GO

IF OBJECT_ID('conta.sp_Usuario_SetPasswordHash','P') IS NOT NULL DROP PROCEDURE conta.sp_Usuario_SetPasswordHash;
GO
CREATE PROCEDURE conta.sp_Usuario_SetPasswordHash
    @Username NVARCHAR(50), @Hash NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.usuario SET v_PasswordHash = @Hash WHERE v_Username = @Username;
    SELECT @@ROWCOUNT AS afectadas;
END
GO

IF OBJECT_ID('conta.sp_Auth_RegistrarLogin','P') IS NOT NULL DROP PROCEDURE conta.sp_Auth_RegistrarLogin;
GO
CREATE PROCEDURE conta.sp_Auth_RegistrarLogin
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.usuario SET t_UltimoLogin = GETDATE() WHERE i_IdUsuario = @IdUsuario;
END
GO

IF OBJECT_ID('conta.sp_Usuario_CountActivos','P') IS NOT NULL DROP PROCEDURE conta.sp_Usuario_CountActivos;
GO
CREATE PROCEDURE conta.sp_Usuario_CountActivos
AS
BEGIN
    SET NOCOUNT ON;
    -- Cuenta usuarios con password ya establecido (distinto de PENDIENTE)
    SELECT COUNT(*) AS conConfig FROM conta.usuario WHERE v_PasswordHash <> 'PENDIENTE';
END
GO

IF OBJECT_ID('conta.sp_Usuario_List','P') IS NOT NULL DROP PROCEDURE conta.sp_Usuario_List;
GO
CREATE PROCEDURE conta.sp_Usuario_List
AS
BEGIN
    SET NOCOUNT ON;
    SELECT u.i_IdUsuario, u.v_Username, u.v_NombreCompleto, u.b_Activo, u.t_UltimoLogin,
           u.v_AuthOrigen, u.v_UsernameLegacy, u.i_SystemUserIdLegacy,
           STUFF((SELECT ',' + r.v_Nombre
                    FROM conta.usuario_rol ur JOIN conta.rol r ON r.i_IdRol = ur.i_IdRol
                   WHERE ur.i_IdUsuario = u.i_IdUsuario
                   FOR XML PATH('')), 1, 1, '') AS Roles
    FROM conta.usuario u
    ORDER BY u.v_AuthOrigen, u.v_Username;
END
GO

IF OBJECT_ID('conta.sp_Usuario_Insert','P') IS NOT NULL DROP PROCEDURE conta.sp_Usuario_Insert;
GO
CREATE PROCEDURE conta.sp_Usuario_Insert
    @Username NVARCHAR(50), @PasswordHash NVARCHAR(500), @NombreCompleto NVARCHAR(150),
    @Roles NVARCHAR(200), @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM conta.usuario WHERE v_Username = @Username)
    BEGIN
        RAISERROR('El username ya existe.', 16, 1); RETURN;
    END
    DECLARE @id INT;
    INSERT INTO conta.usuario (v_Username, v_PasswordHash, v_NombreCompleto, i_InsertaIdUsuario)
    VALUES (@Username, @PasswordHash, @NombreCompleto, @IdUsuarioAccion);
    SET @id = SCOPE_IDENTITY();
    -- Roles CSV -> filas
    INSERT INTO conta.usuario_rol (i_IdUsuario, i_IdRol)
    SELECT @id, r.i_IdRol FROM conta.rol r
    WHERE ',' + @Roles + ',' LIKE '%,' + r.v_Nombre + ',%';
    EXEC conta.sp_Auditoria_Insert 'conta.usuario', @id, 'INSERT', @Username, @IdUsuarioAccion;
    SELECT @id AS i_IdUsuario;
END
GO

IF OBJECT_ID('conta.sp_Usuario_Update','P') IS NOT NULL DROP PROCEDURE conta.sp_Usuario_Update;
GO
CREATE PROCEDURE conta.sp_Usuario_Update
    @IdUsuario INT, @NombreCompleto NVARCHAR(150), @Activo BIT,
    @Roles NVARCHAR(200), @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.usuario SET v_NombreCompleto = @NombreCompleto, b_Activo = @Activo
    WHERE i_IdUsuario = @IdUsuario;
    DELETE FROM conta.usuario_rol WHERE i_IdUsuario = @IdUsuario;
    INSERT INTO conta.usuario_rol (i_IdUsuario, i_IdRol)
    SELECT @IdUsuario, r.i_IdRol FROM conta.rol r
    WHERE ',' + @Roles + ',' LIKE '%,' + r.v_Nombre + ',%';
    EXEC conta.sp_Auditoria_Insert 'conta.usuario', @IdUsuario, 'UPDATE', @NombreCompleto, @IdUsuarioAccion;
    SELECT @IdUsuario AS i_IdUsuario;
END
GO

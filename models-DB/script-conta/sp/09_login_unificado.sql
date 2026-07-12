-- =====================================================================
-- Login unificado BI: lookup de vinculo + busqueda y vinculacion de usuarios
-- del sistema legacy (systemuser). SQL Server 2012.
-- La autenticacion legacy la hace el API conta contra /Auth/Login (server-to-server);
-- aqui solo resolvemos autorizacion (rol) y el cableado que hace el SA.
-- =====================================================================

-- Tras validar credenciales en el legacy, resuelve el usuario conta activo de origen
-- LEGACY vinculado a ese i_SystemUserId y devuelve sus roles (para emitir el JWT).
IF OBJECT_ID('conta.sp_Auth_LoginBiLookup','P') IS NOT NULL DROP PROCEDURE conta.sp_Auth_LoginBiLookup;
GO
CREATE PROCEDURE conta.sp_Auth_LoginBiLookup
    @SystemUserIdLegacy INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT u.i_IdUsuario, u.v_Username, u.v_NombreCompleto, u.b_Activo, u.v_AuthOrigen,
           STUFF((SELECT ',' + r.v_Nombre
                    FROM conta.usuario_rol ur JOIN conta.rol r ON r.i_IdRol = ur.i_IdRol
                   WHERE ur.i_IdUsuario = u.i_IdUsuario
                   FOR XML PATH('')), 1, 1, '') AS Roles
    FROM conta.usuario u
    WHERE u.i_SystemUserIdLegacy = @SystemUserIdLegacy
      AND u.v_AuthOrigen = 'LEGACY'
      AND u.b_Activo = 1;
END
GO

-- Busqueda de usuarios del sistema legacy para la pantalla de cableado (SA).
-- Solo SELECT cross-DB sobre SigesoftDesarrollo_2 (cero alteracion del legacy).
IF OBJECT_ID('conta.sp_Auth_LegacyBuscar','P') IS NOT NULL DROP PROCEDURE conta.sp_Auth_LegacyBuscar;
GO
CREATE PROCEDURE conta.sp_Auth_LegacyBuscar
    @Filtro NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @f NVARCHAR(120) = '%' + LTRIM(RTRIM(@Filtro)) + '%';
    SELECT TOP 20
        su.i_SystemUserId,
        su.v_UserName,
        LTRIM(RTRIM(ISNULL(p.v_FirstName,'') + ' ' + ISNULL(p.v_FirstLastName,'') + ' ' + ISNULL(p.v_SecondLastName,''))) AS Nombre,
        CASE WHEN EXISTS (SELECT 1 FROM conta.usuario cu
                           WHERE cu.i_SystemUserIdLegacy = su.i_SystemUserId AND cu.b_Activo = 1)
             THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS YaVinculado
    FROM SigesoftDesarrollo_2.dbo.systemuser su
    LEFT JOIN SigesoftDesarrollo_2.dbo.person p ON p.v_PersonId = su.v_PersonId
    WHERE su.i_IsDeleted = 0
      AND (su.v_UserName LIKE @f
        OR p.v_FirstName LIKE @f
        OR p.v_FirstLastName LIKE @f
        OR p.v_SecondLastName LIKE @f)
    ORDER BY su.v_UserName;
END
GO

-- Vincula un usuario del sistema legacy con rol(es) conta (accion del SA).
-- Crea (o reactiva) una fila conta.usuario de origen LEGACY. v_Username interno =
-- 'leg_<SystemUserId>' (unico, sin chocar con usuarios LOCAL); el username real va en
-- v_UsernameLegacy. Roles en CSV (SA,GERENTE,CONTABILIDAD).
IF OBJECT_ID('conta.sp_Auth_Vincular','P') IS NOT NULL DROP PROCEDURE conta.sp_Auth_Vincular;
GO
CREATE PROCEDURE conta.sp_Auth_Vincular
    @SystemUserId INT,
    @Username NVARCHAR(50),
    @Nombre NVARCHAR(150),
    @Roles NVARCHAR(200),
    @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM conta.usuario WHERE i_SystemUserIdLegacy = @SystemUserId AND b_Activo = 1)
    BEGIN
        RAISERROR('Este usuario del sistema ya esta vinculado y activo.', 16, 1); RETURN;
    END

    DECLARE @id INT;
    SELECT @id = i_IdUsuario FROM conta.usuario WHERE i_SystemUserIdLegacy = @SystemUserId;

    IF @id IS NOT NULL
    BEGIN
        -- Reactivar un vinculo previamente desactivado
        UPDATE conta.usuario
           SET b_Activo = 1, v_NombreCompleto = @Nombre, v_UsernameLegacy = @Username
         WHERE i_IdUsuario = @id;
        DELETE FROM conta.usuario_rol WHERE i_IdUsuario = @id;
    END
    ELSE
    BEGIN
        DECLARE @uname NVARCHAR(50) = LEFT('leg_' + CAST(@SystemUserId AS NVARCHAR(20)), 50);
        INSERT INTO conta.usuario
            (v_Username, v_PasswordHash, v_NombreCompleto, b_Activo,
             v_AuthOrigen, i_SystemUserIdLegacy, v_UsernameLegacy, i_InsertaIdUsuario)
        VALUES
            (@uname, 'LEGACY', @Nombre, 1,
             'LEGACY', @SystemUserId, @Username, @IdUsuarioAccion);
        SET @id = SCOPE_IDENTITY();
    END

    INSERT INTO conta.usuario_rol (i_IdUsuario, i_IdRol)
    SELECT @id, r.i_IdRol FROM conta.rol r
    WHERE ',' + @Roles + ',' LIKE '%,' + r.v_Nombre + ',%';

    EXEC conta.sp_Auditoria_Insert 'conta.usuario', @id, 'INSERT', @Username, @IdUsuarioAccion;
    SELECT @id AS i_IdUsuario;
END
GO

-- Actualiza roles / activa-desactiva un usuario vinculado (accion del SA).
IF OBJECT_ID('conta.sp_Auth_VinculoUpdate','P') IS NOT NULL DROP PROCEDURE conta.sp_Auth_VinculoUpdate;
GO
CREATE PROCEDURE conta.sp_Auth_VinculoUpdate
    @IdUsuario INT,
    @Roles NVARCHAR(200),
    @Activo BIT,
    @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM conta.usuario WHERE i_IdUsuario = @IdUsuario AND v_AuthOrigen = 'LEGACY')
    BEGIN
        RAISERROR('El usuario no existe o no es de origen legacy.', 16, 1); RETURN;
    END

    UPDATE conta.usuario SET b_Activo = @Activo WHERE i_IdUsuario = @IdUsuario;
    DELETE FROM conta.usuario_rol WHERE i_IdUsuario = @IdUsuario;
    INSERT INTO conta.usuario_rol (i_IdUsuario, i_IdRol)
    SELECT @IdUsuario, r.i_IdRol FROM conta.rol r
    WHERE ',' + @Roles + ',' LIKE '%,' + r.v_Nombre + ',%';

    EXEC conta.sp_Auditoria_Insert 'conta.usuario', @IdUsuario, 'UPDATE', @Roles, @IdUsuarioAccion;
    SELECT @IdUsuario AS i_IdUsuario;
END
GO

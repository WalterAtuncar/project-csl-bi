-- =====================================================================
-- Login unificado BI: identidad legacy + autorizacion conta. SQL Server 2012.
-- Extiende conta.usuario para soportar usuarios de origen LEGACY (systemuser
-- del sistema desktop). La autenticacion la resuelve /Auth/Login del legacy;
-- la autorizacion (rol) la resuelve esta tabla. conta es nuestro schema: el
-- ALTER esta permitido (la regla de no-ALTER es solo para dbo).
-- =====================================================================

-- Origen de autenticacion: LOCAL (PBKDF2 en conta) | LEGACY (valida en el sistema desktop)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('conta.usuario') AND name = 'v_AuthOrigen')
    ALTER TABLE conta.usuario ADD v_AuthOrigen NVARCHAR(10) NOT NULL CONSTRAINT DF_usuario_AuthOrigen DEFAULT 'LOCAL';
GO

-- i_SystemUserId del legacy (clave estable del amarre; el username legacy es editable)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('conta.usuario') AND name = 'i_SystemUserIdLegacy')
    ALTER TABLE conta.usuario ADD i_SystemUserIdLegacy INT NULL;
GO

-- username legacy, solo para mostrar
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('conta.usuario') AND name = 'v_UsernameLegacy')
    ALTER TABLE conta.usuario ADD v_UsernameLegacy NVARCHAR(50) NULL;
GO

-- Un usuario del sistema legacy solo puede estar vinculado una vez (indice unico filtrado)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_usuario_SystemUserIdLegacy' AND object_id = OBJECT_ID('conta.usuario'))
    CREATE UNIQUE INDEX UX_usuario_SystemUserIdLegacy
        ON conta.usuario(i_SystemUserIdLegacy) WHERE i_SystemUserIdLegacy IS NOT NULL;
GO

-- Coherencia de origen: LEGACY exige id del sistema legacy. Para LEGACY, v_PasswordHash
-- lleva el sentinel 'LEGACY' (nunca valida como PBKDF2, no permite login local).
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_usuario_Origen' AND parent_object_id = OBJECT_ID('conta.usuario'))
    ALTER TABLE conta.usuario ADD CONSTRAINT CK_usuario_Origen CHECK (
        v_AuthOrigen IN ('LOCAL','LEGACY')
        AND (v_AuthOrigen <> 'LEGACY' OR i_SystemUserIdLegacy IS NOT NULL));
GO

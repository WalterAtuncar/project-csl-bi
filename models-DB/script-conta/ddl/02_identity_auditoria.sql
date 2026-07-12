-- =====================================================================
-- FASE 0 - Identity propio del proyecto React y auditoria. SQL Server 2012.
-- Roles: SA | GERENTE | CONTABILIDAD. JWT emitido por la API de contabilidad.
-- =====================================================================

IF OBJECT_ID('conta.usuario','U') IS NULL
CREATE TABLE conta.usuario (
    i_IdUsuario          INT IDENTITY(1,1) PRIMARY KEY,
    v_Username           NVARCHAR(50) NOT NULL UNIQUE,
    v_PasswordHash       NVARCHAR(500) NOT NULL,   -- PBKDF2 {iter}.{salt}.{hash}, generado por el API
    v_NombreCompleto     NVARCHAR(150) NOT NULL,
    b_Activo             BIT NOT NULL DEFAULT 1,
    t_UltimoLogin        DATETIME NULL,
    i_InsertaIdUsuario   INT NULL,
    t_InsertaFecha       DATETIME NOT NULL DEFAULT GETDATE()
);

IF OBJECT_ID('conta.rol','U') IS NULL
CREATE TABLE conta.rol (
    i_IdRol  INT IDENTITY(1,1) PRIMARY KEY,
    v_Nombre NVARCHAR(30) NOT NULL UNIQUE
);

IF OBJECT_ID('conta.usuario_rol','U') IS NULL
CREATE TABLE conta.usuario_rol (
    i_IdUsuario INT NOT NULL REFERENCES conta.usuario(i_IdUsuario),
    i_IdRol     INT NOT NULL REFERENCES conta.rol(i_IdRol),
    CONSTRAINT PK_usuario_rol PRIMARY KEY (i_IdUsuario, i_IdRol)
);

IF OBJECT_ID('conta.auditoria','U') IS NULL
CREATE TABLE conta.auditoria (
    i_IdAuditoria        BIGINT IDENTITY(1,1) PRIMARY KEY,
    v_Tabla              NVARCHAR(80) NOT NULL,
    v_IdRegistro         NVARCHAR(40) NOT NULL,
    v_Accion             NVARCHAR(20) NOT NULL,   -- INSERT|UPDATE|PAGAR|ANULAR|DELETE
    v_Detalle            NVARCHAR(MAX) NULL,
    i_IdUsuario          INT NOT NULL,
    t_Fecha              DATETIME NOT NULL DEFAULT GETDATE()
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_auditoria_tabla' AND object_id = OBJECT_ID('conta.auditoria'))
    CREATE INDEX IX_auditoria_tabla ON conta.auditoria(v_Tabla, v_IdRegistro);

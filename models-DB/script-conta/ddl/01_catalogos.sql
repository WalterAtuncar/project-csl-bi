-- =====================================================================
-- FASE 0 - Catalogos del schema conta. Idempotente (IF OBJECT_ID ... IS NULL).
-- SQL Server 2012.
-- =====================================================================

-- Centros de costo jerarquicos (Regla 3 y respuesta 8).
-- El cableado opcional a una unidad de negocio se hace via i_IdTipoCaja.
IF OBJECT_ID('conta.centro_costo','U') IS NULL
CREATE TABLE conta.centro_costo (
    i_IdCentroCosto      INT IDENTITY(1,1) PRIMARY KEY,
    i_IdPadre            INT NULL REFERENCES conta.centro_costo(i_IdCentroCosto),
    v_Codigo             NVARCHAR(20) NOT NULL UNIQUE,
    v_Nombre             NVARCHAR(150) NOT NULL,
    v_Descripcion        NVARCHAR(300) NULL,
    i_IdTipoCaja         INT NULL REFERENCES dbo.tipocaja(i_IdTipoCaja),
    b_Activo             BIT NOT NULL DEFAULT 1,
    i_InsertaIdUsuario   INT NOT NULL,
    t_InsertaFecha       DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha     DATETIME NULL
);

-- Tipos de gasto jerarquicos (secciones y rubros del plan de cuentas de las maquetas).
IF OBJECT_ID('conta.tipo_gasto','U') IS NULL
CREATE TABLE conta.tipo_gasto (
    i_IdTipoGasto        INT IDENTITY(1,1) PRIMARY KEY,
    i_IdPadre            INT NULL REFERENCES conta.tipo_gasto(i_IdTipoGasto),
    v_Codigo             NVARCHAR(20) NOT NULL UNIQUE,
    v_Nombre             NVARCHAR(200) NOT NULL,
    -- Seccion del estado de flujo (solo en nodos raiz):
    -- PERSONAL | ADMIN | MEDICO | TRIBUTOS | RENTA | INVERSION |
    -- FINANCIAMIENTO | OTROS_EGRESOS | OTROS_INGRESOS
    v_SeccionFlujo       NVARCHAR(20) NULL,
    b_Activo             BIT NOT NULL DEFAULT 1,
    i_InsertaIdUsuario   INT NOT NULL,
    t_InsertaFecha       DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha     DATETIME NULL
);

-- Entidades receptoras de pago que no son proveedores formales (respuesta 7/18).
IF OBJECT_ID('conta.entidad','U') IS NULL
CREATE TABLE conta.entidad (
    i_IdEntidad          INT IDENTITY(1,1) PRIMARY KEY,
    v_Nombre             NVARCHAR(200) NOT NULL,
    v_Tipo               NVARCHAR(50) NULL,   -- ASOCIADO | CONVENIO | INTERNO | OTRO
    b_Activo             BIT NOT NULL DEFAULT 1,
    i_InsertaIdUsuario   INT NOT NULL,
    t_InsertaFecha       DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha     DATETIME NULL
);

-- Cuentas bancarias: DEPRECADO conta.cuenta_bancaria (2026-07-13).
-- El catalogo de cuentas se lee ahora del catalogo real de tesoreria del legacy
-- dbo.documento (solo bancos, i_Naturaleza=3) via conta.sp_CuentaBancaria_List.
-- Migracion de retiro: ddl/09_deprecate_cuenta_bancaria.sql (drop de 2 FKs + drop table).
-- NO recrear esta tabla; el catalogo es un espejo de solo lectura del legacy.

-- Porcentaje de participacion SISOL con vigencia por rango (respuesta 13).
IF OBJECT_ID('conta.sisol_participacion','U') IS NULL
CREATE TABLE conta.sisol_participacion (
    i_IdParticipacion    INT IDENTITY(1,1) PRIMARY KEY,
    d_PorcClinica        DECIMAL(5,2) NOT NULL,
    d_PorcHospital       DECIMAL(5,2) NOT NULL,
    t_VigenciaDesde      DATE NOT NULL,
    t_VigenciaHasta      DATE NULL,           -- NULL = vigente
    i_InsertaIdUsuario   INT NOT NULL,
    t_InsertaFecha       DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CK_sisol_100 CHECK (d_PorcClinica + d_PorcHospital = 100)
);

-- Configuracion clave-valor (semaforo y otros parametros).
IF OBJECT_ID('conta.config','U') IS NULL
CREATE TABLE conta.config (
    v_Clave              NVARCHAR(50) PRIMARY KEY,
    v_Valor              NVARCHAR(200) NOT NULL,
    v_Descripcion        NVARCHAR(300) NULL,
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha     DATETIME NULL
);

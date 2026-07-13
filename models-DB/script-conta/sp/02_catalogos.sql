-- =====================================================================
-- FASE 1 - CRUD de catalogos. SQL Server 2012. Auditoria en cada escritura.
-- =====================================================================

-- ---------------- CENTRO DE COSTO ----------------
IF OBJECT_ID('conta.sp_CentroCosto_List','P') IS NOT NULL DROP PROCEDURE conta.sp_CentroCosto_List;
GO
CREATE PROCEDURE conta.sp_CentroCosto_List
    @SoloActivos BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT cc.i_IdCentroCosto, cc.i_IdPadre, cc.v_Codigo, cc.v_Nombre, cc.v_Descripcion,
           cc.i_IdTipoCaja, tc.v_NombreTipoCaja, cc.b_Activo
    FROM conta.centro_costo cc
    LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = cc.i_IdTipoCaja
    WHERE (@SoloActivos = 0 OR cc.b_Activo = 1)
    ORDER BY ISNULL(cc.i_IdPadre, cc.i_IdCentroCosto), cc.v_Nombre;
END
GO

IF OBJECT_ID('conta.sp_CentroCosto_Insert','P') IS NOT NULL DROP PROCEDURE conta.sp_CentroCosto_Insert;
GO
CREATE PROCEDURE conta.sp_CentroCosto_Insert
    @IdPadre INT = NULL, @Codigo NVARCHAR(20), @Nombre NVARCHAR(150), @Descripcion NVARCHAR(300) = NULL,
    @IdTipoCaja INT = NULL, @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM conta.centro_costo WHERE v_Codigo = @Codigo)
    BEGIN RAISERROR('El codigo de centro de costo ya existe.', 16, 1); RETURN; END
    DECLARE @id INT;
    INSERT INTO conta.centro_costo (i_IdPadre, v_Codigo, v_Nombre, v_Descripcion, i_IdTipoCaja, i_InsertaIdUsuario)
    VALUES (@IdPadre, @Codigo, @Nombre, @Descripcion, @IdTipoCaja, @IdUsuarioAccion);
    SET @id = SCOPE_IDENTITY();
    EXEC conta.sp_Auditoria_Insert 'conta.centro_costo', @id, 'INSERT', @Nombre, @IdUsuarioAccion;
    SELECT @id AS i_IdCentroCosto;
END
GO

IF OBJECT_ID('conta.sp_CentroCosto_Update','P') IS NOT NULL DROP PROCEDURE conta.sp_CentroCosto_Update;
GO
CREATE PROCEDURE conta.sp_CentroCosto_Update
    @IdCentroCosto INT, @Nombre NVARCHAR(150), @Descripcion NVARCHAR(300) = NULL,
    @IdTipoCaja INT = NULL, @Activo BIT, @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.centro_costo
    SET v_Nombre = @Nombre, v_Descripcion = @Descripcion, i_IdTipoCaja = @IdTipoCaja,
        b_Activo = @Activo, i_ActualizaIdUsuario = @IdUsuarioAccion, t_ActualizaFecha = GETDATE()
    WHERE i_IdCentroCosto = @IdCentroCosto;
    EXEC conta.sp_Auditoria_Insert 'conta.centro_costo', @IdCentroCosto, 'UPDATE', @Nombre, @IdUsuarioAccion;
    SELECT @IdCentroCosto AS i_IdCentroCosto;
END
GO

-- ---------------- TIPO DE GASTO ----------------
IF OBJECT_ID('conta.sp_TipoGasto_List','P') IS NOT NULL DROP PROCEDURE conta.sp_TipoGasto_List;
GO
CREATE PROCEDURE conta.sp_TipoGasto_List
    @SoloActivos BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT tg.i_IdTipoGasto, tg.i_IdPadre, tg.v_Codigo, tg.v_Nombre, tg.v_SeccionFlujo,
           p.v_SeccionFlujo AS SeccionPadre, tg.b_Activo
    FROM conta.tipo_gasto tg
    LEFT JOIN conta.tipo_gasto p ON p.i_IdTipoGasto = tg.i_IdPadre
    WHERE (@SoloActivos = 0 OR tg.b_Activo = 1)
    ORDER BY ISNULL(tg.i_IdPadre, tg.i_IdTipoGasto), tg.v_Nombre;
END
GO

IF OBJECT_ID('conta.sp_TipoGasto_Insert','P') IS NOT NULL DROP PROCEDURE conta.sp_TipoGasto_Insert;
GO
CREATE PROCEDURE conta.sp_TipoGasto_Insert
    @IdPadre INT = NULL, @Codigo NVARCHAR(20), @Nombre NVARCHAR(200),
    @SeccionFlujo NVARCHAR(20) = NULL, @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM conta.tipo_gasto WHERE v_Codigo = @Codigo)
    BEGIN RAISERROR('El codigo de tipo de gasto ya existe.', 16, 1); RETURN; END
    DECLARE @id INT;
    INSERT INTO conta.tipo_gasto (i_IdPadre, v_Codigo, v_Nombre, v_SeccionFlujo, i_InsertaIdUsuario)
    VALUES (@IdPadre, @Codigo, @Nombre, @SeccionFlujo, @IdUsuarioAccion);
    SET @id = SCOPE_IDENTITY();
    EXEC conta.sp_Auditoria_Insert 'conta.tipo_gasto', @id, 'INSERT', @Nombre, @IdUsuarioAccion;
    SELECT @id AS i_IdTipoGasto;
END
GO

IF OBJECT_ID('conta.sp_TipoGasto_Update','P') IS NOT NULL DROP PROCEDURE conta.sp_TipoGasto_Update;
GO
CREATE PROCEDURE conta.sp_TipoGasto_Update
    @IdTipoGasto INT, @Nombre NVARCHAR(200), @SeccionFlujo NVARCHAR(20) = NULL,
    @Activo BIT, @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.tipo_gasto
    SET v_Nombre = @Nombre, v_SeccionFlujo = @SeccionFlujo, b_Activo = @Activo,
        i_ActualizaIdUsuario = @IdUsuarioAccion, t_ActualizaFecha = GETDATE()
    WHERE i_IdTipoGasto = @IdTipoGasto;
    EXEC conta.sp_Auditoria_Insert 'conta.tipo_gasto', @IdTipoGasto, 'UPDATE', @Nombre, @IdUsuarioAccion;
    SELECT @IdTipoGasto AS i_IdTipoGasto;
END
GO

-- ---------------- ENTIDAD ----------------
IF OBJECT_ID('conta.sp_Entidad_List','P') IS NOT NULL DROP PROCEDURE conta.sp_Entidad_List;
GO
CREATE PROCEDURE conta.sp_Entidad_List @SoloActivos BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i_IdEntidad, v_Nombre, v_Tipo, b_Activo FROM conta.entidad
    WHERE (@SoloActivos = 0 OR b_Activo = 1) ORDER BY v_Nombre;
END
GO

IF OBJECT_ID('conta.sp_Entidad_Insert','P') IS NOT NULL DROP PROCEDURE conta.sp_Entidad_Insert;
GO
CREATE PROCEDURE conta.sp_Entidad_Insert
    @Nombre NVARCHAR(200), @Tipo NVARCHAR(50) = NULL, @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id INT;
    INSERT INTO conta.entidad (v_Nombre, v_Tipo, i_InsertaIdUsuario) VALUES (@Nombre, @Tipo, @IdUsuarioAccion);
    SET @id = SCOPE_IDENTITY();
    EXEC conta.sp_Auditoria_Insert 'conta.entidad', @id, 'INSERT', @Nombre, @IdUsuarioAccion;
    SELECT @id AS i_IdEntidad;
END
GO

IF OBJECT_ID('conta.sp_Entidad_Update','P') IS NOT NULL DROP PROCEDURE conta.sp_Entidad_Update;
GO
CREATE PROCEDURE conta.sp_Entidad_Update
    @IdEntidad INT, @Nombre NVARCHAR(200), @Tipo NVARCHAR(50) = NULL, @Activo BIT, @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.entidad SET v_Nombre = @Nombre, v_Tipo = @Tipo, b_Activo = @Activo,
        i_ActualizaIdUsuario = @IdUsuarioAccion, t_ActualizaFecha = GETDATE()
    WHERE i_IdEntidad = @IdEntidad;
    EXEC conta.sp_Auditoria_Insert 'conta.entidad', @IdEntidad, 'UPDATE', @Nombre, @IdUsuarioAccion;
    SELECT @IdEntidad AS i_IdEntidad;
END
GO

-- ---------------- CUENTA BANCARIA (catalogo legacy, solo lectura) ----------------
-- DEPRECADO conta.cuenta_bancaria (ver migracion ddl/09_deprecate_cuenta_bancaria.sql).
-- Las cuentas bancarias se leen ahora del catalogo real de tesoreria del legacy
-- dbo.documento (solo bancos, i_Naturaleza=3). Mismo patron que sp_Caja_FormasPago
-- sobre dbo.datahierarchy (grupo 46). dbo.documento y conta viven en la MISMA BD:
-- el SELECT a dbo es lectura permitida; NO se altera dbo. El CRUD (Insert/Update) se
-- retira: el catalogo es un espejo de solo lectura. Contrato CuentaBancariaRow intacto.
IF OBJECT_ID('conta.sp_CuentaBancaria_List','P') IS NOT NULL DROP PROCEDURE conta.sp_CuentaBancaria_List;
GO
CREATE PROCEDURE conta.sp_CuentaBancaria_List @SoloActivos BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
      d.i_CodigoDocumento                                      AS i_IdCuentaBancaria,
      LTRIM(RTRIM(d.v_Nombre))                                 AS v_Banco,
      LTRIM(RTRIM(ISNULL(d.v_Siglas,'')))                      AS v_NroCuenta,   -- codigo corto de tesoreria (BCS/BC$/BLN...)
      CASE WHEN d.v_Siglas LIKE '%$%' THEN 'USD' ELSE 'PEN' END AS v_Moneda,     -- MN->PEN, ME/$->USD
      CAST(1 AS BIT)                                           AS b_Activo
    FROM dbo.documento d
    WHERE d.i_UsadoTesoreria = 1
      AND ISNULL(d.i_Eliminado,0) = 0
      AND d.i_Naturaleza = 3
    ORDER BY d.v_Nombre;
END
GO

-- CRUD retirado (catalogo de solo lectura). DROP idempotente por si un despliegue previo los creo.
IF OBJECT_ID('conta.sp_CuentaBancaria_Insert','P') IS NOT NULL DROP PROCEDURE conta.sp_CuentaBancaria_Insert;
GO
IF OBJECT_ID('conta.sp_CuentaBancaria_Update','P') IS NOT NULL DROP PROCEDURE conta.sp_CuentaBancaria_Update;
GO

-- ---------------- SISOL PARTICIPACION (con cierre de vigencia) ----------------
IF OBJECT_ID('conta.sp_SisolParticipacion_List','P') IS NOT NULL DROP PROCEDURE conta.sp_SisolParticipacion_List;
GO
CREATE PROCEDURE conta.sp_SisolParticipacion_List
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i_IdParticipacion, d_PorcClinica, d_PorcHospital, t_VigenciaDesde, t_VigenciaHasta
    FROM conta.sisol_participacion ORDER BY t_VigenciaDesde DESC;
END
GO

IF OBJECT_ID('conta.sp_SisolParticipacion_Insert','P') IS NOT NULL DROP PROCEDURE conta.sp_SisolParticipacion_Insert;
GO
CREATE PROCEDURE conta.sp_SisolParticipacion_Insert
    @PorcClinica DECIMAL(5,2), @PorcHospital DECIMAL(5,2), @VigenciaDesde DATE, @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;
    IF @PorcClinica + @PorcHospital <> 100
    BEGIN RAISERROR('Los porcentajes deben sumar 100.', 16, 1); RETURN; END
    IF EXISTS (SELECT 1 FROM conta.sisol_participacion WHERE t_VigenciaDesde >= @VigenciaDesde)
    BEGIN RAISERROR('Ya existe una vigencia igual o posterior a la fecha indicada.', 16, 1); RETURN; END
    -- Cerrar la vigencia abierta anterior
    UPDATE conta.sisol_participacion
    SET t_VigenciaHasta = DATEADD(DAY, -1, @VigenciaDesde)
    WHERE t_VigenciaHasta IS NULL;
    DECLARE @id INT;
    INSERT INTO conta.sisol_participacion (d_PorcClinica, d_PorcHospital, t_VigenciaDesde, t_VigenciaHasta, i_InsertaIdUsuario)
    VALUES (@PorcClinica, @PorcHospital, @VigenciaDesde, NULL, @IdUsuarioAccion);
    SET @id = SCOPE_IDENTITY();
    DECLARE @det NVARCHAR(200) = CONCAT(@PorcClinica, '/', @PorcHospital, ' desde ', CONVERT(varchar,@VigenciaDesde,23));
    EXEC conta.sp_Auditoria_Insert 'conta.sisol_participacion', @id, 'INSERT', @det, @IdUsuarioAccion;
    SELECT @id AS i_IdParticipacion;
END
GO

-- Actualizar EN SITIO una vigencia existente (corregir el % clinica/hospital).
IF OBJECT_ID('conta.sp_SisolParticipacion_Update','P') IS NOT NULL DROP PROCEDURE conta.sp_SisolParticipacion_Update;
GO
CREATE PROCEDURE conta.sp_SisolParticipacion_Update
    @IdParticipacion INT, @PorcClinica DECIMAL(5,2), @PorcHospital DECIMAL(5,2),
    @VigenciaDesde DATE = NULL, @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;
    IF @PorcClinica + @PorcHospital <> 100
    BEGIN RAISERROR('Los porcentajes deben sumar 100', 16, 1); RETURN; END
    IF NOT EXISTS (SELECT 1 FROM conta.sisol_participacion WHERE i_IdParticipacion = @IdParticipacion)
    BEGIN RAISERROR('Vigencia no encontrada', 16, 1); RETURN; END
    UPDATE conta.sisol_participacion
    SET d_PorcClinica = @PorcClinica, d_PorcHospital = @PorcHospital,
        t_VigenciaDesde = ISNULL(@VigenciaDesde, t_VigenciaDesde)
    WHERE i_IdParticipacion = @IdParticipacion;
    DECLARE @vig DATE = (SELECT t_VigenciaDesde FROM conta.sisol_participacion WHERE i_IdParticipacion = @IdParticipacion);
    DECLARE @det NVARCHAR(200) = CONCAT(@PorcClinica, '/', @PorcHospital, ' desde ', CONVERT(varchar, @vig, 23));
    EXEC conta.sp_Auditoria_Insert 'conta.sisol_participacion', @IdParticipacion, 'UPDATE', @det, @IdUsuarioAccion;
    SELECT @IdParticipacion AS i_IdParticipacion;
END
GO

-- ---------------- CONFIG ----------------
IF OBJECT_ID('conta.sp_Config_List','P') IS NOT NULL DROP PROCEDURE conta.sp_Config_List;
GO
CREATE PROCEDURE conta.sp_Config_List
AS
BEGIN
    SET NOCOUNT ON;
    SELECT v_Clave, v_Valor, v_Descripcion FROM conta.config ORDER BY v_Clave;
END
GO

IF OBJECT_ID('conta.sp_Config_Update','P') IS NOT NULL DROP PROCEDURE conta.sp_Config_Update;
GO
CREATE PROCEDURE conta.sp_Config_Update
    @Clave NVARCHAR(50), @Valor NVARCHAR(200), @IdUsuarioAccion INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.config SET v_Valor = @Valor, i_ActualizaIdUsuario = @IdUsuarioAccion, t_ActualizaFecha = GETDATE()
    WHERE v_Clave = @Clave;
    EXEC conta.sp_Auditoria_Insert 'conta.config', @Clave, 'UPDATE', @Valor, @IdUsuarioAccion;
    SELECT @Clave AS v_Clave, @Valor AS v_Valor;
END
GO

-- ---------------- PROVEEDOR (catalogo, solo lectura de dbo.proveedores) ----------------
-- PLAN_EGRESO_UNIFICADO D9: alimenta el toggle receptor PROVEEDOR del modal de egresos.
-- SOLO SELECT sobre dbo.proveedores (tabla creada por el BI). Columnas reales confirmadas
-- (sys.columns): id_proveedor, ruc, razon_social, direccion, email, activo, fecha_registro.
IF OBJECT_ID('conta.sp_Proveedor_List','P') IS NOT NULL DROP PROCEDURE conta.sp_Proveedor_List;
GO
CREATE PROCEDURE conta.sp_Proveedor_List @SoloActivos BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.id_proveedor AS i_IdProveedor, p.ruc AS Ruc, p.razon_social AS RazonSocial
    FROM dbo.proveedores p
    WHERE (@SoloActivos = 0 OR p.activo = 1)
    ORDER BY p.razon_social;
END
GO

-- Alta de proveedor nuevo desde el modulo de egresos.
-- INSERT en dbo.proveedores PERMITIDO (es DML, no ALTER; tabla creada por el BI). Ver seed 03_seeds.sql.
-- Solo escribe la fila; jamas altera estructura ni toca las otras filas. Auditoria en conta.auditoria.
-- Devuelve el contrato que el backend mapea a ProveedorDto: i_IdProveedor / Ruc / RazonSocial.
IF OBJECT_ID('conta.sp_Proveedor_Insert','P') IS NOT NULL DROP PROCEDURE conta.sp_Proveedor_Insert;
GO
CREATE PROCEDURE conta.sp_Proveedor_Insert
    @Ruc NVARCHAR(30), @RazonSocial NVARCHAR(400), @Direccion NVARCHAR(600) = NULL,
    @Email NVARCHAR(200) = NULL, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET @Ruc = LTRIM(RTRIM(@Ruc));
    SET @RazonSocial = LTRIM(RTRIM(@RazonSocial));

    IF @Ruc IS NULL OR LEN(@Ruc) = 0
    BEGIN RAISERROR('El RUC es obligatorio.', 16, 1); RETURN; END
    IF NOT (LEN(@Ruc) = 11 AND @Ruc NOT LIKE '%[^0-9]%')
    BEGIN RAISERROR('El RUC debe tener 11 digitos numericos.', 16, 1); RETURN; END
    IF @RazonSocial IS NULL OR LEN(@RazonSocial) = 0
    BEGIN RAISERROR('La razon social es obligatoria.', 16, 1); RETURN; END
    IF EXISTS (SELECT 1 FROM dbo.proveedores WHERE ruc = @Ruc)
    BEGIN RAISERROR('Ya existe un proveedor con ese RUC.', 16, 1); RETURN; END

    INSERT INTO dbo.proveedores (ruc, razon_social, direccion, email, activo, fecha_registro)
    VALUES (@Ruc, @RazonSocial, NULLIF(LTRIM(RTRIM(@Direccion)), ''), NULLIF(LTRIM(RTRIM(@Email)), ''), 1, GETDATE());
    DECLARE @id INT = SCOPE_IDENTITY();

    EXEC conta.sp_Auditoria_Insert 'dbo.proveedores', @id, 'INSERT', @RazonSocial, @IdUsuario;

    SELECT @id AS i_IdProveedor, @Ruc AS Ruc, @RazonSocial AS RazonSocial;
END
GO

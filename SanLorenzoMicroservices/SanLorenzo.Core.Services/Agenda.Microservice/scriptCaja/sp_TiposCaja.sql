USE [20505310072]
GO

-- ========================================================
-- STORED PROCEDURES PARA TIPOS DE CAJA, INGRESOS Y EGRESOS
-- ========================================================

-- ================================================
-- PROCEDIMIENTOS PARA TIPO CAJA
-- ================================================

-- Crear Tipo de Caja
IF OBJECT_ID('dbo.sp_TipoCaja_Create', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoCaja_Create
GO

CREATE PROCEDURE dbo.sp_TipoCaja_Create
    @NombreTipoCaja NVARCHAR(100),
    @Descripcion NVARCHAR(250) = NULL,
    @InsertaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IdTipoCaja INT;
    
    BEGIN TRY
        INSERT INTO tipocaja (
            v_NombreTipoCaja, v_Descripcion, i_Estado, 
            i_InsertaIdUsuario, t_InsertaFecha
        )
        VALUES (
            @NombreTipoCaja, @Descripcion, 1, 
            @InsertaIdUsuario, GETDATE()
        );
        
        SET @IdTipoCaja = SCOPE_IDENTITY();
        
        SELECT 
            @IdTipoCaja AS IdTipoCaja,
            @NombreTipoCaja AS NombreTipoCaja,
            'Tipo de caja creado exitosamente' AS Mensaje;
            
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Obtener lista de Tipos de Caja
IF OBJECT_ID('dbo.sp_TipoCaja_GetList', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoCaja_GetList
GO

CREATE PROCEDURE dbo.sp_TipoCaja_GetList
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        i_IdTipoCaja AS IdTipoCaja,
        v_NombreTipoCaja AS NombreTipoCaja,
        v_Descripcion AS Descripcion,
        i_Estado AS Estado,
        CASE i_Estado 
            WHEN 1 THEN 'Activo'
            WHEN 0 THEN 'Inactivo'
            ELSE 'Desconocido'
        END AS EstadoDescripcion,
        t_InsertaFecha AS FechaCreacion
    FROM tipocaja
    WHERE (@IncludeInactive = 1 OR i_Estado = 1)
    ORDER BY v_NombreTipoCaja;
END
GO

-- Actualizar Tipo de Caja
IF OBJECT_ID('dbo.sp_TipoCaja_Update', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoCaja_Update
GO

CREATE PROCEDURE dbo.sp_TipoCaja_Update
    @IdTipoCaja INT,
    @NombreTipoCaja NVARCHAR(100),
    @Descripcion NVARCHAR(250) = NULL,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM tipocaja WHERE i_IdTipoCaja = @IdTipoCaja)
        BEGIN
            RAISERROR('Tipo de caja no encontrado', 16, 1);
            RETURN;
        END
        
        UPDATE tipocaja 
        SET 
            v_NombreTipoCaja = @NombreTipoCaja,
            v_Descripcion = @Descripcion,
            i_ActualizaIdUsuario = @ActualizaIdUsuario,
            t_ActualizaFecha = GETDATE()
        WHERE i_IdTipoCaja = @IdTipoCaja;
        
        SELECT 
            @IdTipoCaja AS IdTipoCaja,
            'Tipo de caja actualizado exitosamente' AS Mensaje;
            
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Eliminar Tipo de Caja (lógico)
IF OBJECT_ID('dbo.sp_TipoCaja_Delete', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoCaja_Delete
GO

CREATE PROCEDURE dbo.sp_TipoCaja_Delete
    @IdTipoCaja INT,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Verificar que no existan cajas mayores activas para este tipo
        IF EXISTS(SELECT 1 FROM cajamayor WHERE i_IdTipoCaja = @IdTipoCaja AND i_EstadoCierre IN (0, 1))
        BEGIN
            RAISERROR('No se puede eliminar el tipo de caja porque tiene cajas mayores activas', 16, 1);
            RETURN;
        END
        
        UPDATE tipocaja 
        SET 
            i_Estado = 0,
            i_ActualizaIdUsuario = @ActualizaIdUsuario,
            t_ActualizaFecha = GETDATE()
        WHERE i_IdTipoCaja = @IdTipoCaja;
        
        SELECT 
            @IdTipoCaja AS IdTipoCaja,
            'Tipo de caja eliminado exitosamente' AS Mensaje;
            
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- ================================================
-- PROCEDIMIENTOS PARA TIPO INGRESO MENSUAL
-- ================================================

-- Crear Tipo de Ingreso Mensual
IF OBJECT_ID('dbo.sp_TipoIngresoMensual_Create', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoIngresoMensual_Create
GO

CREATE PROCEDURE dbo.sp_TipoIngresoMensual_Create
    @NombreTipoIngreso NVARCHAR(100),
    @Descripcion NVARCHAR(250) = NULL,
    @InsertaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IdTipoIngresoMensual INT;
    
    BEGIN TRY
        INSERT INTO tipoingresomensual (
            v_NombreTipoIngreso, v_Descripcion, i_Estado, 
            i_InsertaIdUsuario, t_InsertaFecha
        )
        VALUES (
            @NombreTipoIngreso, @Descripcion, 1, 
            @InsertaIdUsuario, GETDATE()
        );
        
        SET @IdTipoIngresoMensual = SCOPE_IDENTITY();
        
        SELECT 
            @IdTipoIngresoMensual AS IdTipoIngresoMensual,
            @NombreTipoIngreso AS NombreTipoIngreso,
            'Tipo de ingreso creado exitosamente' AS Mensaje;
            
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Obtener lista de Tipos de Ingreso Mensual
IF OBJECT_ID('dbo.sp_TipoIngresoMensual_GetList', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoIngresoMensual_GetList
GO

CREATE PROCEDURE dbo.sp_TipoIngresoMensual_GetList
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        i_IdTipoIngresoMensual AS IdTipoIngresoMensual,
        v_NombreTipoIngreso AS NombreTipoIngreso,
        v_Descripcion AS Descripcion,
        i_Estado AS Estado,
        CASE i_Estado 
            WHEN 1 THEN 'Activo'
            WHEN 0 THEN 'Inactivo'
            ELSE 'Desconocido'
        END AS EstadoDescripcion,
        t_InsertaFecha AS FechaCreacion
    FROM tipoingresomensual
    WHERE (@IncludeInactive = 1 OR i_Estado = 1)
    ORDER BY v_NombreTipoIngreso;
END
GO

-- Actualizar Tipo de Ingreso Mensual
IF OBJECT_ID('dbo.sp_TipoIngresoMensual_Update', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoIngresoMensual_Update
GO

CREATE PROCEDURE dbo.sp_TipoIngresoMensual_Update
    @IdTipoIngresoMensual INT,
    @NombreTipoIngreso NVARCHAR(100),
    @Descripcion NVARCHAR(250) = NULL,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM tipoingresomensual WHERE i_IdTipoIngresoMensual = @IdTipoIngresoMensual)
        BEGIN
            RAISERROR('Tipo de ingreso no encontrado', 16, 1);
            RETURN;
        END
        
        UPDATE tipoingresomensual 
        SET 
            v_NombreTipoIngreso = @NombreTipoIngreso,
            v_Descripcion = @Descripcion,
            i_ActualizaIdUsuario = @ActualizaIdUsuario,
            t_ActualizaFecha = GETDATE()
        WHERE i_IdTipoIngresoMensual = @IdTipoIngresoMensual;
        
        SELECT 
            @IdTipoIngresoMensual AS IdTipoIngresoMensual,
            'Tipo de ingreso actualizado exitosamente' AS Mensaje;
            
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Eliminar Tipo de Ingreso Mensual (lógico)
IF OBJECT_ID('dbo.sp_TipoIngresoMensual_Delete', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoIngresoMensual_Delete
GO

CREATE PROCEDURE dbo.sp_TipoIngresoMensual_Delete
    @IdTipoIngresoMensual INT,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Verificar que no existan ingresos activos para este tipo
        IF EXISTS(SELECT 1 FROM ingresosmensual WHERE i_IdTipoIngresoMensual = @IdTipoIngresoMensual AND i_Estado = 1)
        BEGIN
            RAISERROR('No se puede eliminar el tipo de ingreso porque tiene ingresos activos', 16, 1);
            RETURN;
        END
        
        UPDATE tipoingresomensual 
        SET 
            i_Estado = 0,
            i_ActualizaIdUsuario = @ActualizaIdUsuario,
            t_ActualizaFecha = GETDATE()
        WHERE i_IdTipoIngresoMensual = @IdTipoIngresoMensual;
        
        SELECT 
            @IdTipoIngresoMensual AS IdTipoIngresoMensual,
            'Tipo de ingreso eliminado exitosamente' AS Mensaje;
            
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- ================================================
-- PROCEDIMIENTOS PARA TIPO EGRESO MENSUAL
-- ================================================

-- Crear Tipo de Egreso Mensual
IF OBJECT_ID('dbo.sp_TipoEgresoMensual_Create', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoEgresoMensual_Create
GO

CREATE PROCEDURE dbo.sp_TipoEgresoMensual_Create
    @NombreTipoEgreso NVARCHAR(100),
    @Descripcion NVARCHAR(250) = NULL,
    @InsertaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IdTipoEgresoMensual INT;
    
    BEGIN TRY
        INSERT INTO tipoegresomensual (
            v_NombreTipoEgreso, v_Descripcion, i_Estado, 
            i_InsertaIdUsuario, t_InsertaFecha
        )
        VALUES (
            @NombreTipoEgreso, @Descripcion, 1, 
            @InsertaIdUsuario, GETDATE()
        );
        
        SET @IdTipoEgresoMensual = SCOPE_IDENTITY();
        
        SELECT 
            @IdTipoEgresoMensual AS IdTipoEgresoMensual,
            @NombreTipoEgreso AS NombreTipoEgreso,
            'Tipo de egreso creado exitosamente' AS Mensaje;
            
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Obtener lista de Tipos de Egreso Mensual
IF OBJECT_ID('dbo.sp_TipoEgresoMensual_GetList', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoEgresoMensual_GetList
GO

CREATE PROCEDURE dbo.sp_TipoEgresoMensual_GetList
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        i_IdTipoEgresoMensual AS IdTipoEgresoMensual,
        v_NombreTipoEgreso AS NombreTipoEgreso,
        v_Descripcion AS Descripcion,
        i_Estado AS Estado,
        CASE i_Estado 
            WHEN 1 THEN 'Activo'
            WHEN 0 THEN 'Inactivo'
            ELSE 'Desconocido'
        END AS EstadoDescripcion,
        t_InsertaFecha AS FechaCreacion
    FROM tipoegresomensual
    WHERE (@IncludeInactive = 1 OR i_Estado = 1)
    ORDER BY v_NombreTipoEgreso;
END
GO

-- Actualizar Tipo de Egreso Mensual
IF OBJECT_ID('dbo.sp_TipoEgresoMensual_Update', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoEgresoMensual_Update
GO

CREATE PROCEDURE dbo.sp_TipoEgresoMensual_Update
    @IdTipoEgresoMensual INT,
    @NombreTipoEgreso NVARCHAR(100),
    @Descripcion NVARCHAR(250) = NULL,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF NOT EXISTS(SELECT 1 FROM tipoegresomensual WHERE i_IdTipoEgresoMensual = @IdTipoEgresoMensual)
        BEGIN
            RAISERROR('Tipo de egreso no encontrado', 16, 1);
            RETURN;
        END
        
        UPDATE tipoegresomensual 
        SET 
            v_NombreTipoEgreso = @NombreTipoEgreso,
            v_Descripcion = @Descripcion,
            i_ActualizaIdUsuario = @ActualizaIdUsuario,
            t_ActualizaFecha = GETDATE()
        WHERE i_IdTipoEgresoMensual = @IdTipoEgresoMensual;
        
        SELECT 
            @IdTipoEgresoMensual AS IdTipoEgresoMensual,
            'Tipo de egreso actualizado exitosamente' AS Mensaje;
            
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- Eliminar Tipo de Egreso Mensual (lógico)
IF OBJECT_ID('dbo.sp_TipoEgresoMensual_Delete', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_TipoEgresoMensual_Delete
GO

CREATE PROCEDURE dbo.sp_TipoEgresoMensual_Delete
    @IdTipoEgresoMensual INT,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Verificar que no existan egresos activos para este tipo
        IF EXISTS(SELECT 1 FROM egresosmensual WHERE i_IdTipoEgresoMensual = @IdTipoEgresoMensual AND i_Estado = 1)
        BEGIN
            RAISERROR('No se puede eliminar el tipo de egreso porque tiene egresos activos', 16, 1);
            RETURN;
        END
        
        UPDATE tipoegresomensual 
        SET 
            i_Estado = 0,
            i_ActualizaIdUsuario = @ActualizaIdUsuario,
            t_ActualizaFecha = GETDATE()
        WHERE i_IdTipoEgresoMensual = @IdTipoEgresoMensual;
        
        SELECT 
            @IdTipoEgresoMensual AS IdTipoEgresoMensual,
            'Tipo de egreso eliminado exitosamente' AS Mensaje;
            
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

USE [20505310072]
GO

-- ========================================================
-- STORED PROCEDURES PARA CAJA MAYOR
-- ========================================================

-- ================================================
-- Crear User-Defined Table Type para detalles de Caja Mayor
-- ================================================
IF TYPE_ID('dbo.CajaMayorDetalleTableType') IS NOT NULL
DROP TYPE dbo.CajaMayorDetalleTableType
GO

CREATE TYPE dbo.CajaMayorDetalleTableType AS TABLE
(
    IdVenta NVARCHAR(50),
    CodigoDocumento NVARCHAR(50),
    TipoMovimiento NCHAR(1) NOT NULL, -- 'I' = Ingreso, 'E' = Egreso
    ConceptoMovimiento NVARCHAR(250) NOT NULL,
    FechaMovimiento DATETIME NOT NULL,
    Subtotal DECIMAL(18,4) DEFAULT 0,
    IGV DECIMAL(18,4) DEFAULT 0,
    Total DECIMAL(18,4) NOT NULL,
    NumeroDocumento NVARCHAR(50),
    SerieDocumento NVARCHAR(20),
    Observaciones NVARCHAR(500)
)
GO

-- ================================================
-- Procedimiento para crear/actualizar Caja Mayor con detalle
-- ================================================
IF OBJECT_ID('dbo.sp_CajaMayor_CreateUpdate', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_CajaMayor_CreateUpdate
GO

CREATE PROCEDURE dbo.sp_CajaMayor_CreateUpdate
    @IdCajaMayor INT = NULL,
    @IdTipoCaja INT,
    @Periodo NCHAR(6),
    @Mes NCHAR(2),
    @Anio NCHAR(4),
    @FechaInicio DATETIME,
    @FechaFin DATETIME,
    @SaldoInicialMes DECIMAL(18,4) = 0,
    @TotalIngresos DECIMAL(18,4) = 0,
    @TotalEgresos DECIMAL(18,4) = 0,
    @ObservacionesCierre NVARCHAR(500) = NULL,
    @InsertaIdUsuario INT,
    @DetalleItems dbo.CajaMayorDetalleTableType READONLY -- Table Type para detalles
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IdCajaMayorResult INT;
    DECLARE @SaldoFinalMes DECIMAL(18,4);
    DECLARE @IsUpdate BIT = 0;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Calcular saldo final
        SET @SaldoFinalMes = @SaldoInicialMes + @TotalIngresos - @TotalEgresos;
        
        -- Verificar si es actualización o creación
        IF @IdCajaMayor IS NOT NULL AND EXISTS(SELECT 1 FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor)
        BEGIN
            SET @IsUpdate = 1;
            
            -- Actualizar registro existente
            UPDATE cajamayor 
            SET 
                i_IdTipoCaja = @IdTipoCaja,
                v_Periodo = @Periodo,
                v_Mes = @Mes,
                v_Anio = @Anio,
                t_FechaInicio = @FechaInicio,
                t_FechaFin = @FechaFin,
                d_SaldoInicialMes = @SaldoInicialMes,
                d_TotalIngresos = @TotalIngresos,
                d_TotalEgresos = @TotalEgresos,
                d_SaldoFinalMes = @SaldoFinalMes,
                v_ObservacionesCierre = @ObservacionesCierre,
                i_ActualizaIdUsuario = @InsertaIdUsuario,
                t_ActualizaFecha = GETDATE()
            WHERE i_IdCajaMayor = @IdCajaMayor;
            
            SET @IdCajaMayorResult = @IdCajaMayor;
            
            -- Eliminar detalles existentes si se proporcionan nuevos detalles
            IF EXISTS(SELECT 1 FROM @DetalleItems)
            BEGIN
                DELETE FROM cajamayordetalle WHERE i_IdCajaMayor = @IdCajaMayor;
            END
        END
        ELSE
        BEGIN
            -- Crear nuevo registro
            INSERT INTO cajamayor (
                i_IdTipoCaja, v_Periodo, v_Mes, v_Anio, t_FechaInicio, t_FechaFin,
                d_SaldoInicialMes, d_TotalIngresos, d_TotalEgresos, d_SaldoFinalMes,
                i_EstadoCierre, v_ObservacionesCierre, i_InsertaIdUsuario, t_InsertaFecha
            )
            VALUES (
                @IdTipoCaja, @Periodo, @Mes, @Anio, @FechaInicio, @FechaFin,
                @SaldoInicialMes, @TotalIngresos, @TotalEgresos, @SaldoFinalMes,
                0, @ObservacionesCierre, @InsertaIdUsuario, GETDATE()
            );
            
            SET @IdCajaMayorResult = SCOPE_IDENTITY();
        END
        
        -- Procesar detalles usando Table Type (Compatible con SQL Server 2012)
        IF EXISTS(SELECT 1 FROM @DetalleItems)
        BEGIN
            INSERT INTO cajamayordetalle (
                i_IdCajaMayor, v_IdVenta, v_CodigoDocumento, v_TipoMovimiento,
                v_ConceptoMovimiento, t_FechaMovimiento, d_Subtotal, d_IGV, d_Total,
                v_NumeroDocumento, v_SerieDocumento, v_Observaciones,
                i_InsertaIdUsuario, t_InsertaFecha
            )
            SELECT 
                @IdCajaMayorResult,
                IdVenta, CodigoDocumento, TipoMovimiento,
                ConceptoMovimiento, FechaMovimiento, Subtotal, IGV, Total,
                NumeroDocumento, SerieDocumento, Observaciones,
                @InsertaIdUsuario, GETDATE()
            FROM @DetalleItems;
        END
        
        -- Actualizar saldo de caja automáticamente
        EXEC sp_SaldoCaja_UpdateAutomatico @IdTipoCaja, @SaldoFinalMes, @InsertaIdUsuario;
        
        COMMIT TRANSACTION;
        
        -- Retornar resultado
        SELECT 
            @IdCajaMayorResult AS IdCajaMayor,
            @IsUpdate AS IsUpdate,
            'Caja mayor procesada exitosamente' AS Mensaje,
            @SaldoFinalMes AS SaldoFinal
            
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

-- ================================================
-- Procedimiento para obtener lista de Cajas Mayor (grilla principal)
-- ================================================
IF OBJECT_ID('dbo.sp_CajaMayor_GetList', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_CajaMayor_GetList
GO

CREATE PROCEDURE dbo.sp_CajaMayor_GetList
    @IdTipoCaja INT = NULL,
    @Anio NCHAR(4) = NULL,
    @Mes NCHAR(2) = NULL,
    @EstadoCierre INT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    -- Query principal con paginación
    SELECT 
        cm.i_IdCajaMayor AS IdCajaMayor,
        cm.v_Periodo AS Periodo,
        cm.v_Mes AS Mes,
        cm.v_Anio AS Anio,
        tc.v_NombreTipoCaja AS NombreTipoCaja,
        cm.t_FechaInicio AS FechaInicio,
        cm.t_FechaFin AS FechaFin,
        cm.d_SaldoInicialMes AS SaldoInicialMes,
        cm.d_TotalIngresos AS TotalIngresos,
        cm.d_TotalEgresos AS TotalEgresos,
        cm.d_SaldoFinalMes AS SaldoFinalMes,
        cm.i_EstadoCierre AS EstadoCierre,
        CASE cm.i_EstadoCierre 
            WHEN 0 THEN 'Abierto'
            WHEN 1 THEN 'Cerrado'
            WHEN 2 THEN 'Confirmado'
            ELSE 'Desconocido'
        END AS EstadoCierreDescripcion,
        cm.t_FechaCierre AS FechaCierre,
        cm.v_ObservacionesCierre AS ObservacionesCierre,
        cm.t_InsertaFecha AS FechaCreacion,
        COUNT(*) OVER() AS TotalRecords
    FROM cajamayor cm
    INNER JOIN tipocaja tc ON cm.i_IdTipoCaja = tc.i_IdTipoCaja
    WHERE 
        (@IdTipoCaja IS NULL OR cm.i_IdTipoCaja = @IdTipoCaja)
        AND (@Anio IS NULL OR cm.v_Anio = @Anio)
        AND (@Mes IS NULL OR cm.v_Mes = @Mes)
        AND (@EstadoCierre IS NULL OR cm.i_EstadoCierre = @EstadoCierre)
    ORDER BY cm.v_Anio DESC, cm.v_Mes DESC, cm.t_InsertaFecha DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- ================================================
-- Procedimiento para obtener detalle de Caja Mayor
-- ================================================
IF OBJECT_ID('dbo.sp_CajaMayor_GetDetalle', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_CajaMayor_GetDetalle
GO

CREATE PROCEDURE dbo.sp_CajaMayor_GetDetalle
    @IdCajaMayor INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Información de la caja mayor
    SELECT 
        cm.i_IdCajaMayor AS IdCajaMayor,
        cm.i_IdTipoCaja AS IdTipoCaja,
        tc.v_NombreTipoCaja AS NombreTipoCaja,
        cm.v_Periodo AS Periodo,
        cm.v_Mes AS Mes,
        cm.v_Anio AS Anio,
        cm.t_FechaInicio AS FechaInicio,
        cm.t_FechaFin AS FechaFin,
        cm.d_SaldoInicialMes AS SaldoInicialMes,
        cm.d_TotalIngresos AS TotalIngresos,
        cm.d_TotalEgresos AS TotalEgresos,
        cm.d_SaldoFinalMes AS SaldoFinalMes,
        cm.i_EstadoCierre AS EstadoCierre,
        cm.t_FechaCierre AS FechaCierre,
        cm.v_ObservacionesCierre AS ObservacionesCierre,
        cm.t_InsertaFecha AS FechaCreacion
    FROM cajamayor cm
    INNER JOIN tipocaja tc ON cm.i_IdTipoCaja = tc.i_IdTipoCaja
    WHERE cm.i_IdCajaMayor = @IdCajaMayor;
    
    -- Detalle de movimientos
    SELECT 
        cmd.i_IdCajaMayorDetalle AS IdCajaMayorDetalle,
        cmd.v_IdVenta AS IdVenta,
        cmd.v_CodigoDocumento AS CodigoDocumento,
        cmd.v_TipoMovimiento AS TipoMovimiento,
        CASE cmd.v_TipoMovimiento 
            WHEN 'I' THEN 'Ingreso'
            WHEN 'E' THEN 'Egreso'
            ELSE 'Desconocido'
        END AS TipoMovimientoDescripcion,
        cmd.v_ConceptoMovimiento AS ConceptoMovimiento,
        cmd.t_FechaMovimiento AS FechaMovimiento,
        cmd.d_Subtotal AS Subtotal,
        cmd.d_IGV AS IGV,
        cmd.d_Total AS Total,
        cmd.v_NumeroDocumento AS NumeroDocumento,
        cmd.v_SerieDocumento AS SerieDocumento,
        cmd.v_Observaciones AS Observaciones,
        cmd.t_InsertaFecha AS FechaRegistro
    FROM cajamayordetalle cmd
    WHERE cmd.i_IdCajaMayor = @IdCajaMayor
    ORDER BY cmd.t_FechaMovimiento DESC, cmd.t_InsertaFecha DESC;
END
GO

-- ================================================
-- Procedimiento para cerrar Caja Mayor
-- ================================================
IF OBJECT_ID('dbo.sp_CajaMayor_Cerrar', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_CajaMayor_Cerrar
GO

CREATE PROCEDURE dbo.sp_CajaMayor_Cerrar
    @IdCajaMayor INT,
    @ObservacionesCierre NVARCHAR(500) = NULL,
    @UsuarioIdCierre INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Verificar que la caja mayor existe y está abierta
        IF NOT EXISTS(SELECT 1 FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor AND i_EstadoCierre = 0)
        BEGIN
            RAISERROR('La caja mayor no existe o ya está cerrada', 16, 1);
            RETURN;
        END
        
        -- Cerrar la caja mayor
        UPDATE cajamayor 
        SET 
            i_EstadoCierre = 1,
            t_FechaCierre = GETDATE(),
            v_ObservacionesCierre = @ObservacionesCierre,
            i_ActualizaIdUsuario = @UsuarioIdCierre,
            t_ActualizaFecha = GETDATE()
        WHERE i_IdCajaMayor = @IdCajaMayor;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @IdCajaMayor AS IdCajaMayor,
            'Caja mayor cerrada exitosamente' AS Mensaje,
            GETDATE() AS FechaCierre;
            
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

-- ================================================
-- Procedimiento para eliminar Caja Mayor (solo si está abierta)
-- ================================================
IF OBJECT_ID('dbo.sp_CajaMayor_Delete', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_CajaMayor_Delete
GO

CREATE PROCEDURE dbo.sp_CajaMayor_Delete
    @IdCajaMayor INT,
    @UsuarioIdEliminacion INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Verificar que la caja mayor existe y está abierta
        IF NOT EXISTS(SELECT 1 FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor AND i_EstadoCierre = 0)
        BEGIN
            RAISERROR('La caja mayor no existe o ya está cerrada y no puede eliminarse', 16, 1);
            RETURN;
        END
        
        -- Obtener datos para actualizar saldo
        DECLARE @IdTipoCaja INT, @SaldoAnterior DECIMAL(18,4);
        SELECT @IdTipoCaja = i_IdTipoCaja FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Obtener saldo anterior para revertir
        SELECT @SaldoAnterior = d_SaldoInicialMes FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Eliminar detalles primero
        DELETE FROM cajamayordetalle WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Eliminar caja mayor
        DELETE FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Revertir saldo de caja
        EXEC sp_SaldoCaja_UpdateAutomatico @IdTipoCaja, @SaldoAnterior, @UsuarioIdEliminacion;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @IdCajaMayor AS IdCajaMayor,
            'Caja mayor eliminada exitosamente' AS Mensaje;
            
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

-- ================================================
-- Procedimiento para insertar detalle individual de Caja Mayor
-- (Compatible con SQL Server 2012)
-- ================================================
IF OBJECT_ID('dbo.sp_CajaMayorDetalle_Insert', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_CajaMayorDetalle_Insert
GO

CREATE PROCEDURE dbo.sp_CajaMayorDetalle_Insert
    @IdCajaMayor INT,
    @IdVenta NVARCHAR(50) = NULL,
    @CodigoDocumento NVARCHAR(50) = NULL,
    @TipoMovimiento NCHAR(1), -- 'I' = Ingreso, 'E' = Egreso
    @ConceptoMovimiento NVARCHAR(250),
    @FechaMovimiento DATETIME,
    @Subtotal DECIMAL(18,4) = 0,
    @IGV DECIMAL(18,4) = 0,
    @Total DECIMAL(18,4),
    @NumeroDocumento NVARCHAR(50) = NULL,
    @SerieDocumento NVARCHAR(20) = NULL,
    @Observaciones NVARCHAR(500) = NULL,
    @InsertaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IdCajaMayorDetalle INT;
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Verificar que la caja mayor existe y está abierta
        IF NOT EXISTS(SELECT 1 FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor AND i_EstadoCierre = 0)
        BEGIN
            RAISERROR('La caja mayor no existe o ya está cerrada', 16, 1);
            RETURN;
        END
        
        -- Insertar detalle
        INSERT INTO cajamayordetalle (
            i_IdCajaMayor, v_IdVenta, v_CodigoDocumento, v_TipoMovimiento,
            v_ConceptoMovimiento, t_FechaMovimiento, d_Subtotal, d_IGV, d_Total,
            v_NumeroDocumento, v_SerieDocumento, v_Observaciones,
            i_InsertaIdUsuario, t_InsertaFecha
        )
        VALUES (
            @IdCajaMayor, @IdVenta, @CodigoDocumento, @TipoMovimiento,
            @ConceptoMovimiento, @FechaMovimiento, @Subtotal, @IGV, @Total,
            @NumeroDocumento, @SerieDocumento, @Observaciones,
            @InsertaIdUsuario, GETDATE()
        );
        
        SET @IdCajaMayorDetalle = SCOPE_IDENTITY();
        
        -- Actualizar totales en caja mayor según tipo de movimiento
        IF @TipoMovimiento = 'I' -- Ingreso
        BEGIN
            UPDATE cajamayor 
            SET d_TotalIngresos = d_TotalIngresos + @Total,
                d_SaldoFinalMes = d_SaldoInicialMes + (d_TotalIngresos + @Total) - d_TotalEgresos
            WHERE i_IdCajaMayor = @IdCajaMayor;
        END
        ELSE IF @TipoMovimiento = 'E' -- Egreso
        BEGIN
            UPDATE cajamayor 
            SET d_TotalEgresos = d_TotalEgresos + @Total,
                d_SaldoFinalMes = d_SaldoInicialMes + d_TotalIngresos - (d_TotalEgresos + @Total)
            WHERE i_IdCajaMayor = @IdCajaMayor;
        END
        
        COMMIT TRANSACTION;
        
        SELECT 
            @IdCajaMayorDetalle AS IdCajaMayorDetalle,
            'Detalle de caja mayor insertado exitosamente' AS Mensaje,
            @Total AS Monto,
            @TipoMovimiento AS TipoMovimiento;
            
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO

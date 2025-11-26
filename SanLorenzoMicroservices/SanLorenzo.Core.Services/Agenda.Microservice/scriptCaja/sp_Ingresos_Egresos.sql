USE [20505310072]
GO

-- ========================================================
-- STORED PROCEDURES PARA INGRESOS Y EGRESOS MENSUALES
-- ========================================================

-- ================================================
-- PROCEDIMIENTO PARA SALDO DE CAJA (INTERNO/AUTOMÁTICO)
-- ================================================
IF OBJECT_ID('dbo.sp_SaldoCaja_UpdateAutomatico', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_SaldoCaja_UpdateAutomatico
GO

CREATE PROCEDURE dbo.sp_SaldoCaja_UpdateAutomatico
    @IdTipoCaja INT,
    @NuevoSaldo DECIMAL(18,4),
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Verificar si existe registro para este tipo de caja
        IF EXISTS(SELECT 1 FROM saldocaja WHERE i_IdTipoCaja = @IdTipoCaja)
        BEGIN
            -- Actualizar saldo existente
            UPDATE saldocaja 
            SET 
                d_SaldoActual = @NuevoSaldo,
                t_UltimaActualizacion = GETDATE(),
                i_ActualizaIdUsuario = @UsuarioId
            WHERE i_IdTipoCaja = @IdTipoCaja;
        END
        ELSE
        BEGIN
            -- Crear nuevo registro de saldo
            INSERT INTO saldocaja (i_IdTipoCaja, d_SaldoActual, t_UltimaActualizacion, i_ActualizaIdUsuario)
            VALUES (@IdTipoCaja, @NuevoSaldo, GETDATE(), @UsuarioId);
        END
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

-- ================================================
-- PROCEDIMIENTOS PARA INGRESOS MENSUALES
-- ================================================

-- Crear Ingreso Mensual
IF OBJECT_ID('dbo.sp_IngresoMensual_Create', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_IngresoMensual_Create
GO

CREATE PROCEDURE dbo.sp_IngresoMensual_Create
    @IdCajaMayor INT,
    @IdTipoIngresoMensual INT,
    @ConceptoIngreso NVARCHAR(250),
    @FechaIngreso DATETIME,
    @MontoIngreso DECIMAL(18,4),
    @NumeroDocumento NVARCHAR(50) = NULL,
    @Origen NVARCHAR(150) = NULL,
    @Observaciones NVARCHAR(500) = NULL,
    @InsertaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IdIngresoMensual INT;
    DECLARE @IdTipoCaja INT;
    DECLARE @SaldoActual DECIMAL(18,4);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Obtener tipo de caja
        SELECT @IdTipoCaja = i_IdTipoCaja FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        IF @IdTipoCaja IS NULL
        BEGIN
            RAISERROR('Caja mayor no encontrada', 16, 1);
            RETURN;
        END
        
        -- Insertar ingreso mensual
        INSERT INTO ingresosmensual (
            i_IdCajaMayor, i_IdTipoIngresoMensual, v_ConceptoIngreso, t_FechaIngreso,
            d_MontoIngreso, v_NumeroDocumento, v_Origen, v_Observaciones,
            i_Estado, i_InsertaIdUsuario, t_InsertaFecha
        )
        VALUES (
            @IdCajaMayor, @IdTipoIngresoMensual, @ConceptoIngreso, @FechaIngreso,
            @MontoIngreso, @NumeroDocumento, @Origen, @Observaciones,
            1, @InsertaIdUsuario, GETDATE()
        );
        
        SET @IdIngresoMensual = SCOPE_IDENTITY();
        
        -- Actualizar total de ingresos en caja mayor
        UPDATE cajamayor 
        SET d_TotalIngresos = d_TotalIngresos + @MontoIngreso,
            d_SaldoFinalMes = d_SaldoInicialMes + (d_TotalIngresos + @MontoIngreso) - d_TotalEgresos
        WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Obtener nuevo saldo final
        SELECT @SaldoActual = d_SaldoFinalMes FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Actualizar saldo de caja automáticamente
        EXEC sp_SaldoCaja_UpdateAutomatico @IdTipoCaja, @SaldoActual, @InsertaIdUsuario;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @IdIngresoMensual AS IdIngresoMensual,
            'Ingreso registrado exitosamente' AS Mensaje,
            @MontoIngreso AS MontoIngreso,
            @SaldoActual AS NuevoSaldoCaja;
            
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

-- Obtener lista de Ingresos Mensuales
IF OBJECT_ID('dbo.sp_IngresoMensual_GetList', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_IngresoMensual_GetList
GO

CREATE PROCEDURE dbo.sp_IngresoMensual_GetList
    @IdCajaMayor INT = NULL,
    @IdTipoIngresoMensual INT = NULL,
    @FechaInicio DATETIME = NULL,
    @FechaFin DATETIME = NULL,
    @Estado INT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    SELECT 
        im.i_IdIngresoMensual AS IdIngresoMensual,
        im.i_IdCajaMayor AS IdCajaMayor,
        cm.v_Periodo AS PeriodoCajaMayor,
        im.i_IdTipoIngresoMensual AS IdTipoIngresoMensual,
        tim.v_NombreTipoIngreso AS NombreTipoIngreso,
        im.v_ConceptoIngreso AS ConceptoIngreso,
        im.t_FechaIngreso AS FechaIngreso,
        im.d_MontoIngreso AS MontoIngreso,
        im.v_NumeroDocumento AS NumeroDocumento,
        im.v_Origen AS Origen,
        im.v_Observaciones AS Observaciones,
        im.i_Estado AS Estado,
        CASE im.i_Estado 
            WHEN 1 THEN 'Activo'
            WHEN 0 THEN 'Inactivo'
            ELSE 'Desconocido'
        END AS EstadoDescripcion,
        im.t_InsertaFecha AS FechaCreacion,
        COUNT(*) OVER() AS TotalRecords
    FROM ingresosmensual im
    INNER JOIN cajamayor cm ON im.i_IdCajaMayor = cm.i_IdCajaMayor
    INNER JOIN tipoingresomensual tim ON im.i_IdTipoIngresoMensual = tim.i_IdTipoIngresoMensual
    WHERE 
        (@IdCajaMayor IS NULL OR im.i_IdCajaMayor = @IdCajaMayor)
        AND (@IdTipoIngresoMensual IS NULL OR im.i_IdTipoIngresoMensual = @IdTipoIngresoMensual)
        AND (@FechaInicio IS NULL OR im.t_FechaIngreso >= @FechaInicio)
        AND (@FechaFin IS NULL OR im.t_FechaIngreso <= @FechaFin)
        AND (@Estado IS NULL OR im.i_Estado = @Estado)
    ORDER BY im.t_FechaIngreso DESC, im.t_InsertaFecha DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- Actualizar Ingreso Mensual
IF OBJECT_ID('dbo.sp_IngresoMensual_Update', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_IngresoMensual_Update
GO

CREATE PROCEDURE dbo.sp_IngresoMensual_Update
    @IdIngresoMensual INT,
    @ConceptoIngreso NVARCHAR(250),
    @FechaIngreso DATETIME,
    @MontoIngreso DECIMAL(18,4),
    @NumeroDocumento NVARCHAR(50) = NULL,
    @Origen NVARCHAR(150) = NULL,
    @Observaciones NVARCHAR(500) = NULL,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IdCajaMayor INT;
    DECLARE @IdTipoCaja INT;
    DECLARE @MontoAnterior DECIMAL(18,4);
    DECLARE @SaldoActual DECIMAL(18,4);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Obtener datos actuales
        SELECT 
            @IdCajaMayor = i_IdCajaMayor,
            @MontoAnterior = d_MontoIngreso 
        FROM ingresosmensual 
        WHERE i_IdIngresoMensual = @IdIngresoMensual;
        
        IF @IdCajaMayor IS NULL
        BEGIN
            RAISERROR('Ingreso mensual no encontrado', 16, 1);
            RETURN;
        END
        
        -- Obtener tipo de caja
        SELECT @IdTipoCaja = i_IdTipoCaja FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Actualizar ingreso mensual
        UPDATE ingresosmensual 
        SET 
            v_ConceptoIngreso = @ConceptoIngreso,
            t_FechaIngreso = @FechaIngreso,
            d_MontoIngreso = @MontoIngreso,
            v_NumeroDocumento = @NumeroDocumento,
            v_Origen = @Origen,
            v_Observaciones = @Observaciones,
            i_ActualizaIdUsuario = @ActualizaIdUsuario,
            t_ActualizaFecha = GETDATE()
        WHERE i_IdIngresoMensual = @IdIngresoMensual;
        
        -- Actualizar total de ingresos en caja mayor
        UPDATE cajamayor 
        SET d_TotalIngresos = d_TotalIngresos - @MontoAnterior + @MontoIngreso,
            d_SaldoFinalMes = d_SaldoInicialMes + (d_TotalIngresos - @MontoAnterior + @MontoIngreso) - d_TotalEgresos
        WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Obtener nuevo saldo final
        SELECT @SaldoActual = d_SaldoFinalMes FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Actualizar saldo de caja automáticamente
        EXEC sp_SaldoCaja_UpdateAutomatico @IdTipoCaja, @SaldoActual, @ActualizaIdUsuario;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @IdIngresoMensual AS IdIngresoMensual,
            'Ingreso actualizado exitosamente' AS Mensaje,
            @MontoIngreso AS MontoIngreso,
            @SaldoActual AS NuevoSaldoCaja;
            
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

-- Eliminar Ingreso Mensual (lógico)
IF OBJECT_ID('dbo.sp_IngresoMensual_Delete', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_IngresoMensual_Delete
GO

CREATE PROCEDURE dbo.sp_IngresoMensual_Delete
    @IdIngresoMensual INT,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IdCajaMayor INT;
    DECLARE @IdTipoCaja INT;
    DECLARE @MontoIngreso DECIMAL(18,4);
    DECLARE @SaldoActual DECIMAL(18,4);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Obtener datos del ingreso
        SELECT 
            @IdCajaMayor = i_IdCajaMayor,
            @MontoIngreso = d_MontoIngreso 
        FROM ingresosmensual 
        WHERE i_IdIngresoMensual = @IdIngresoMensual AND i_Estado = 1;
        
        IF @IdCajaMayor IS NULL
        BEGIN
            RAISERROR('Ingreso mensual no encontrado o ya está inactivo', 16, 1);
            RETURN;
        END
        
        -- Obtener tipo de caja
        SELECT @IdTipoCaja = i_IdTipoCaja FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Marcar como inactivo (eliminación lógica)
        UPDATE ingresosmensual 
        SET 
            i_Estado = 0,
            i_ActualizaIdUsuario = @ActualizaIdUsuario,
            t_ActualizaFecha = GETDATE()
        WHERE i_IdIngresoMensual = @IdIngresoMensual;
        
        -- Actualizar total de ingresos en caja mayor (restar el monto eliminado)
        UPDATE cajamayor 
        SET d_TotalIngresos = d_TotalIngresos - @MontoIngreso,
            d_SaldoFinalMes = d_SaldoInicialMes + (d_TotalIngresos - @MontoIngreso) - d_TotalEgresos
        WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Obtener nuevo saldo final
        SELECT @SaldoActual = d_SaldoFinalMes FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Actualizar saldo de caja automáticamente
        EXEC sp_SaldoCaja_UpdateAutomatico @IdTipoCaja, @SaldoActual, @ActualizaIdUsuario;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @IdIngresoMensual AS IdIngresoMensual,
            'Ingreso eliminado exitosamente' AS Mensaje,
            @SaldoActual AS NuevoSaldoCaja;
            
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
-- PROCEDIMIENTOS PARA EGRESOS MENSUALES
-- ================================================

-- Crear Egreso Mensual (similar a ingresos pero restando del saldo)
IF OBJECT_ID('dbo.sp_EgresoMensual_Create', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_EgresoMensual_Create
GO

CREATE PROCEDURE dbo.sp_EgresoMensual_Create
    @IdCajaMayor INT,
    @IdTipoEgresoMensual INT,
    @ConceptoEgreso NVARCHAR(250),
    @FechaEgreso DATETIME,
    @MontoEgreso DECIMAL(18,4),
    @NumeroDocumento NVARCHAR(50) = NULL,
    @Beneficiario NVARCHAR(150) = NULL,
    @Observaciones NVARCHAR(500) = NULL,
    @InsertaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IdEgresoMensual INT;
    DECLARE @IdTipoCaja INT;
    DECLARE @SaldoActual DECIMAL(18,4);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Obtener tipo de caja
        SELECT @IdTipoCaja = i_IdTipoCaja FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        IF @IdTipoCaja IS NULL
        BEGIN
            RAISERROR('Caja mayor no encontrada', 16, 1);
            RETURN;
        END
        
        -- Insertar egreso mensual
        INSERT INTO egresosmensual (
            i_IdCajaMayor, i_IdTipoEgresoMensual, v_ConceptoEgreso, t_FechaEgreso,
            d_MontoEgreso, v_NumeroDocumento, v_Beneficiario, v_Observaciones,
            i_Estado, i_InsertaIdUsuario, t_InsertaFecha
        )
        VALUES (
            @IdCajaMayor, @IdTipoEgresoMensual, @ConceptoEgreso, @FechaEgreso,
            @MontoEgreso, @NumeroDocumento, @Beneficiario, @Observaciones,
            1, @InsertaIdUsuario, GETDATE()
        );
        
        SET @IdEgresoMensual = SCOPE_IDENTITY();
        
        -- Actualizar total de egresos en caja mayor
        UPDATE cajamayor 
        SET d_TotalEgresos = d_TotalEgresos + @MontoEgreso,
            d_SaldoFinalMes = d_SaldoInicialMes + d_TotalIngresos - (d_TotalEgresos + @MontoEgreso)
        WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Obtener nuevo saldo final
        SELECT @SaldoActual = d_SaldoFinalMes FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Actualizar saldo de caja automáticamente
        EXEC sp_SaldoCaja_UpdateAutomatico @IdTipoCaja, @SaldoActual, @InsertaIdUsuario;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @IdEgresoMensual AS IdEgresoMensual,
            'Egreso registrado exitosamente' AS Mensaje,
            @MontoEgreso AS MontoEgreso,
            @SaldoActual AS NuevoSaldoCaja;
            
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

-- Los demás stored procedures para egresos son similares a los de ingresos
-- (GetList, Update, Delete) pero trabajando con la tabla egresosmensual y restando del saldo

-- ================================================
-- OBTENER SALDO ACTUAL DE CAJA
-- ================================================
IF OBJECT_ID('dbo.sp_SaldoCaja_GetActual', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_SaldoCaja_GetActual
GO

CREATE PROCEDURE dbo.sp_SaldoCaja_GetActual
    @IdTipoCaja INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        sc.i_IdSaldoCaja AS IdSaldoCaja,
        sc.i_IdTipoCaja AS IdTipoCaja,
        tc.v_NombreTipoCaja AS NombreTipoCaja,
        sc.d_SaldoActual AS SaldoActual,
        sc.t_UltimaActualizacion AS UltimaActualizacion
    FROM saldocaja sc
    INNER JOIN tipocaja tc ON sc.i_IdTipoCaja = tc.i_IdTipoCaja
    WHERE (@IdTipoCaja IS NULL OR sc.i_IdTipoCaja = @IdTipoCaja)
    ORDER BY tc.v_NombreTipoCaja;
END
GO

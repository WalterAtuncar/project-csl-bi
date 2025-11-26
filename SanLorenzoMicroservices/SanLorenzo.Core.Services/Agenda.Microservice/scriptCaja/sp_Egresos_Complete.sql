USE [20505310072]
GO

-- ================================================
-- PROCEDIMIENTOS COMPLETOS PARA EGRESOS MENSUALES
-- ================================================

-- Obtener lista de Egresos Mensuales
IF OBJECT_ID('dbo.sp_EgresoMensual_GetList', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_EgresoMensual_GetList
GO

CREATE PROCEDURE dbo.sp_EgresoMensual_GetList
    @IdCajaMayor INT = NULL,
    @IdTipoEgresoMensual INT = NULL,
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
        em.i_IdEgresoMensual AS IdEgresoMensual,
        em.i_IdCajaMayor AS IdCajaMayor,
        cm.v_Periodo AS PeriodoCajaMayor,
        em.i_IdTipoEgresoMensual AS IdTipoEgresoMensual,
        tem.v_NombreTipoEgreso AS NombreTipoEgreso,
        em.v_ConceptoEgreso AS ConceptoEgreso,
        em.t_FechaEgreso AS FechaEgreso,
        em.d_MontoEgreso AS MontoEgreso,
        em.v_NumeroDocumento AS NumeroDocumento,
        em.v_Beneficiario AS Beneficiario,
        em.v_Observaciones AS Observaciones,
        em.i_Estado AS Estado,
        CASE em.i_Estado 
            WHEN 1 THEN 'Activo'
            WHEN 0 THEN 'Inactivo'
            ELSE 'Desconocido'
        END AS EstadoDescripcion,
        em.t_InsertaFecha AS FechaCreacion,
        COUNT(*) OVER() AS TotalRecords
    FROM egresosmensual em
    INNER JOIN cajamayor cm ON em.i_IdCajaMayor = cm.i_IdCajaMayor
    INNER JOIN tipoegresomensual tem ON em.i_IdTipoEgresoMensual = tem.i_IdTipoEgresoMensual
    WHERE 
        (@IdCajaMayor IS NULL OR em.i_IdCajaMayor = @IdCajaMayor)
        AND (@IdTipoEgresoMensual IS NULL OR em.i_IdTipoEgresoMensual = @IdTipoEgresoMensual)
        AND (@FechaInicio IS NULL OR em.t_FechaEgreso >= @FechaInicio)
        AND (@FechaFin IS NULL OR em.t_FechaEgreso <= @FechaFin)
        AND (@Estado IS NULL OR em.i_Estado = @Estado)
    ORDER BY em.t_FechaEgreso DESC, em.t_InsertaFecha DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- Actualizar Egreso Mensual
IF OBJECT_ID('dbo.sp_EgresoMensual_Update', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_EgresoMensual_Update
GO

CREATE PROCEDURE dbo.sp_EgresoMensual_Update
    @IdEgresoMensual INT,
    @ConceptoEgreso NVARCHAR(250),
    @FechaEgreso DATETIME,
    @MontoEgreso DECIMAL(18,4),
    @NumeroDocumento NVARCHAR(50) = NULL,
    @Beneficiario NVARCHAR(150) = NULL,
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
            @MontoAnterior = d_MontoEgreso 
        FROM egresosmensual 
        WHERE i_IdEgresoMensual = @IdEgresoMensual;
        
        IF @IdCajaMayor IS NULL
        BEGIN
            RAISERROR('Egreso mensual no encontrado', 16, 1);
            RETURN;
        END
        
        -- Obtener tipo de caja
        SELECT @IdTipoCaja = i_IdTipoCaja FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Actualizar egreso mensual
        UPDATE egresosmensual 
        SET 
            v_ConceptoEgreso = @ConceptoEgreso,
            t_FechaEgreso = @FechaEgreso,
            d_MontoEgreso = @MontoEgreso,
            v_NumeroDocumento = @NumeroDocumento,
            v_Beneficiario = @Beneficiario,
            v_Observaciones = @Observaciones,
            i_ActualizaIdUsuario = @ActualizaIdUsuario,
            t_ActualizaFecha = GETDATE()
        WHERE i_IdEgresoMensual = @IdEgresoMensual;
        
        -- Actualizar total de egresos en caja mayor
        UPDATE cajamayor 
        SET d_TotalEgresos = d_TotalEgresos - @MontoAnterior + @MontoEgreso,
            d_SaldoFinalMes = d_SaldoInicialMes + d_TotalIngresos - (d_TotalEgresos - @MontoAnterior + @MontoEgreso)
        WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Obtener nuevo saldo final
        SELECT @SaldoActual = d_SaldoFinalMes FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Actualizar saldo de caja automáticamente
        EXEC sp_SaldoCaja_UpdateAutomatico @IdTipoCaja, @SaldoActual, @ActualizaIdUsuario;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @IdEgresoMensual AS IdEgresoMensual,
            'Egreso actualizado exitosamente' AS Mensaje,
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

-- Eliminar Egreso Mensual (lógico)
IF OBJECT_ID('dbo.sp_EgresoMensual_Delete', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_EgresoMensual_Delete
GO

CREATE PROCEDURE dbo.sp_EgresoMensual_Delete
    @IdEgresoMensual INT,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @IdCajaMayor INT;
    DECLARE @IdTipoCaja INT;
    DECLARE @MontoEgreso DECIMAL(18,4);
    DECLARE @SaldoActual DECIMAL(18,4);
    
    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- Obtener datos del egreso
        SELECT 
            @IdCajaMayor = i_IdCajaMayor,
            @MontoEgreso = d_MontoEgreso 
        FROM egresosmensual 
        WHERE i_IdEgresoMensual = @IdEgresoMensual AND i_Estado = 1;
        
        IF @IdCajaMayor IS NULL
        BEGIN
            RAISERROR('Egreso mensual no encontrado o ya está inactivo', 16, 1);
            RETURN;
        END
        
        -- Obtener tipo de caja
        SELECT @IdTipoCaja = i_IdTipoCaja FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Marcar como inactivo (eliminación lógica)
        UPDATE egresosmensual 
        SET 
            i_Estado = 0,
            i_ActualizaIdUsuario = @ActualizaIdUsuario,
            t_ActualizaFecha = GETDATE()
        WHERE i_IdEgresoMensual = @IdEgresoMensual;
        
        -- Actualizar total de egresos en caja mayor (restar el monto eliminado)
        UPDATE cajamayor 
        SET d_TotalEgresos = d_TotalEgresos - @MontoEgreso,
            d_SaldoFinalMes = d_SaldoInicialMes + d_TotalIngresos - (d_TotalEgresos - @MontoEgreso)
        WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Obtener nuevo saldo final
        SELECT @SaldoActual = d_SaldoFinalMes FROM cajamayor WHERE i_IdCajaMayor = @IdCajaMayor;
        
        -- Actualizar saldo de caja automáticamente
        EXEC sp_SaldoCaja_UpdateAutomatico @IdTipoCaja, @SaldoActual, @ActualizaIdUsuario;
        
        COMMIT TRANSACTION;
        
        SELECT 
            @IdEgresoMensual AS IdEgresoMensual,
            'Egreso eliminado exitosamente' AS Mensaje,
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

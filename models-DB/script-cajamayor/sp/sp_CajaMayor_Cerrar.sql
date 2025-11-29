/*
  SP: sp_CajaMayor_Cerrar
  Descripción: Marca el cierre como 'Cerrado' (2) y recalcula totales.
  Política: BEGIN TRAN + ROLLBACK por defecto.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_CajaMayor_Cerrar','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_Cerrar;
GO
CREATE PROCEDURE dbo.sp_CajaMayor_Cerrar
    @IdCajaMayorCierre INT,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        -- Recalcular resumen por tipo y totales
        EXEC dbo.sp_CajaMayor_ResumenTipos @IdCajaMayorCierre = @IdCajaMayorCierre, @ActualizaIdUsuario = @ActualizaIdUsuario;

        -- Cambiar estado a Cerrado (2)
        UPDATE dbo.cajamayor_cierre
           SET i_EstadoCierre = 2,
               i_ActualizaIdUsuario = @ActualizaIdUsuario,
               t_ActualizaFecha = GETDATE()
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre;

        SELECT i_IdCajaMayorCierre AS IdCajaMayorCierre,
               n_Anio AS Anio,
               n_Mes AS Mes,
               i_EstadoCierre AS EstadoCierre,
               d_SaldoInicialTotal AS SaldoInicialTotal,
               d_TotalIngresosTotal AS TotalIngresosTotal,
               d_TotalEgresosTotal AS TotalEgresosTotal,
               d_SaldoFinalTotal AS SaldoFinalTotal
          FROM dbo.cajamayor_cierre
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre;

        ROLLBACK TRAN;
        /* COMMIT TRAN; */
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRAN;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO
/*
  SP: sp_CajaMayor_DeleteMovimiento
  Descripción: Elimina un movimiento por Id y recalcula el resumen del cierre.
  Política: BEGIN TRAN + ROLLBACK por defecto.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_CajaMayor_DeleteMovimiento','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_DeleteMovimiento;
GO
CREATE PROCEDURE dbo.sp_CajaMayor_DeleteMovimiento
    @IdCajaMayorMovimiento INT,
    @ActualizaIdUsuario    INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @IdCierre INT;
        SELECT @IdCierre = i_IdCajaMayorCierre
          FROM dbo.cajamayor_movimiento
         WHERE i_IdMovimiento = @IdCajaMayorMovimiento;

        IF @IdCierre IS NULL
        BEGIN
            RAISERROR('Movimiento no encontrado.', 16, 1);
        END

        DELETE FROM dbo.cajamayor_movimiento
         WHERE i_IdMovimiento = @IdCajaMayorMovimiento;

        EXEC dbo.sp_CajaMayor_ResumenTipos @IdCajaMayorCierre = @IdCierre, @ActualizaIdUsuario = @ActualizaIdUsuario;

        SELECT i_IdCajaMayorCierre AS IdCajaMayorCierre,
               d_SaldoInicialTotal AS SaldoInicialTotal,
               d_TotalIngresosTotal AS TotalIngresosTotal,
               d_TotalEgresosTotal AS TotalEgresosTotal,
               d_SaldoFinalTotal AS SaldoFinalTotal
          FROM dbo.cajamayor_cierre
         WHERE i_IdCajaMayorCierre = @IdCierre;

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
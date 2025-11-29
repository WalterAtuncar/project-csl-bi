/*
  SP: sp_CajaMayor_RecalcularTotales
  Descripción: Recalcula d_TotalIngresosTotal, d_TotalEgresosTotal y d_SaldoFinalTotal de la cabecera
               a partir de cajamayor_cierre_tipocaja.
  Política: BEGIN TRAN + ROLLBACK por defecto.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_CajaMayor_RecalcularTotales','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_RecalcularTotales;
GO
CREATE PROCEDURE dbo.sp_CajaMayor_RecalcularTotales
    @IdCajaMayorCierre INT,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @TotalIngresos DECIMAL(18,2) = 0,
                @TotalEgresos  DECIMAL(18,2) = 0,
                @SaldoInicial  DECIMAL(18,2) = 0;

        SELECT @TotalIngresos = SUM(d_TotalIngresos),
               @TotalEgresos  = SUM(d_TotalEgresos)
          FROM dbo.cajamayor_cierre_tipocaja
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre;

        SELECT @SaldoInicial = d_SaldoInicialTotal
          FROM dbo.cajamayor_cierre
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre;

        UPDATE dbo.cajamayor_cierre
           SET d_TotalIngresosTotal = ISNULL(@TotalIngresos,0),
               d_TotalEgresosTotal  = ISNULL(@TotalEgresos,0),
               d_SaldoFinalTotal    = ISNULL(@SaldoInicial,0) + ISNULL(@TotalIngresos,0) - ISNULL(@TotalEgresos,0),
               i_ActualizaIdUsuario = @ActualizaIdUsuario,
               t_ActualizaFecha     = GETDATE()
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre;

        SELECT i_IdCajaMayorCierre AS IdCajaMayorCierre,
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
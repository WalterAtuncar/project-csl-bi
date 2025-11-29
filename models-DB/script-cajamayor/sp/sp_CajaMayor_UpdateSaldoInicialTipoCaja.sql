/*
  SP: sp_CajaMayor_UpdateSaldoInicialTipoCaja
  Descripción: Actualiza el saldo inicial de un tipo de caja en el cierre.
  Política: BEGIN TRAN + ROLLBACK por defecto.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_CajaMayor_UpdateSaldoInicialTipoCaja','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_UpdateSaldoInicialTipoCaja;
GO
CREATE PROCEDURE dbo.sp_CajaMayor_UpdateSaldoInicialTipoCaja
    @IdCajaMayorCierre INT,
    @IdTipoCaja        INT,
    @SaldoInicial      DECIMAL(18,2),
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        IF NOT EXISTS (
            SELECT 1 FROM dbo.cajamayor_cierre_tipocaja
             WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre AND i_IdTipoCaja = @IdTipoCaja
        )
        BEGIN
            INSERT INTO dbo.cajamayor_cierre_tipocaja (
                i_IdCajaMayorCierre, i_IdTipoCaja,
                d_SaldoInicial, d_TotalIngresos, d_TotalEgresos, d_SaldoFinal,
                i_InsertaIdUsuario, t_InsertaFecha
            ) VALUES (
                @IdCajaMayorCierre, @IdTipoCaja,
                @SaldoInicial, 0, 0, @SaldoInicial,
                @ActualizaIdUsuario, GETDATE()
            );
        END
        ELSE
        BEGIN
            UPDATE dbo.cajamayor_cierre_tipocaja
               SET d_SaldoInicial = @SaldoInicial,
                   d_SaldoFinal   = @SaldoInicial + d_TotalIngresos - d_TotalEgresos,
                   i_ActualizaIdUsuario = @ActualizaIdUsuario,
                   t_ActualizaFecha = GETDATE()
             WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre
               AND i_IdTipoCaja = @IdTipoCaja;
        END

        -- Recalcular totales globales
        EXEC dbo.sp_CajaMayor_RecalcularTotales @IdCajaMayorCierre = @IdCajaMayorCierre, @ActualizaIdUsuario = @ActualizaIdUsuario;

        SELECT i_IdCajaMayorCierre AS IdCajaMayorCierre,
               i_IdTipoCaja AS IdTipoCaja,
               d_SaldoInicial AS SaldoInicial,
               d_TotalIngresos AS TotalIngresos,
               d_TotalEgresos AS TotalEgresos,
               d_SaldoFinal AS SaldoFinal
          FROM dbo.cajamayor_cierre_tipocaja
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre AND i_IdTipoCaja = @IdTipoCaja;

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
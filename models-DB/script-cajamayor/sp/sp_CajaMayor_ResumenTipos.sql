/*
  SP: sp_CajaMayor_ResumenTipos
  Descripción: Recalcula el resumen por tipo de caja para un cierre mensual.
  Política: BEGIN TRAN + ROLLBACK por defecto para revisión. Cambie a COMMIT cuando aplique.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_CajaMayor_ResumenTipos','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_ResumenTipos;
GO
CREATE PROCEDURE dbo.sp_CajaMayor_ResumenTipos
    @IdCajaMayorCierre INT,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        ;WITH Totales AS (
            SELECT cm.i_IdTipoCaja,
                   SUM(CASE WHEN cm.v_TipoMovimiento = 'I' THEN cm.d_Total ELSE 0 END) AS TotalIngresos,
                   SUM(CASE WHEN cm.v_TipoMovimiento = 'E' THEN cm.d_Total ELSE 0 END) AS TotalEgresos
              FROM dbo.cajamayor_movimiento cm
             WHERE cm.i_IdCajaMayorCierre = @IdCajaMayorCierre
             GROUP BY cm.i_IdTipoCaja
        )
        MERGE dbo.cajamayor_cierre_tipocaja AS tgt
        USING Totales AS src
           ON tgt.i_IdCajaMayorCierre = @IdCajaMayorCierre
          AND tgt.i_IdTipoCaja = src.i_IdTipoCaja
        WHEN MATCHED THEN
            UPDATE SET tgt.d_TotalIngresos = src.TotalIngresos,
                       tgt.d_TotalEgresos = src.TotalEgresos,
                       tgt.d_SaldoFinal   = tgt.d_SaldoInicial + src.TotalIngresos - src.TotalEgresos,
                       tgt.i_ActualizaIdUsuario = @ActualizaIdUsuario,
                       tgt.t_ActualizaFecha = GETDATE()
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (
                i_IdCajaMayorCierre, i_IdTipoCaja,
                d_SaldoInicial, d_TotalIngresos, d_TotalEgresos, d_SaldoFinal,
                i_InsertaIdUsuario, t_InsertaFecha
            ) VALUES (
                @IdCajaMayorCierre, src.i_IdTipoCaja,
                0, src.TotalIngresos, src.TotalEgresos, 0 + src.TotalIngresos - src.TotalEgresos,
                @ActualizaIdUsuario, GETDATE()
            );

        -- Totales globales de la cabecera
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

        -- Resultado de resumen
        SELECT i_IdCajaMayorCierre AS IdCajaMayorCierre,
               i_IdTipoCaja        AS IdTipoCaja,
               d_SaldoInicial      AS SaldoInicial,
               d_TotalIngresos     AS TotalIngresos,
               d_TotalEgresos      AS TotalEgresos,
               d_SaldoFinal        AS SaldoFinal
          FROM dbo.cajamayor_cierre_tipocaja
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre
         ORDER BY i_IdTipoCaja;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO
/*
  SP: sp_CajaMayor_Confirmar
  Descripción: Marca el cierre como 'Confirmado' (3) si está en estado 'Cerrado' (2).
  Política: BEGIN TRAN + ROLLBACK por defecto.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_CajaMayor_Confirmar','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_Confirmar;
GO
CREATE PROCEDURE dbo.sp_CajaMayor_Confirmar
    @IdCajaMayorCierre INT,
    @ActualizaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @EstadoActual TINYINT;
        SELECT @EstadoActual = i_EstadoCierre
          FROM dbo.cajamayor_cierre
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre;

        IF @EstadoActual IS NULL
        BEGIN
            RAISERROR('El cierre especificado no existe.', 16, 1);
        END
        ELSE IF @EstadoActual <> 2
        BEGIN
            RAISERROR('Solo se puede confirmar un cierre en estado Cerrado (2).', 16, 1);
        END
        ELSE
        BEGIN
            UPDATE dbo.cajamayor_cierre
               SET i_EstadoCierre = 3,
                   i_ActualizaIdUsuario = @ActualizaIdUsuario,
                   t_ActualizaFecha = GETDATE()
             WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre;
        END

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
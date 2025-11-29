/*
  SP: sp_CajaMayor_Cierre_CreateUpdate
  Descripción: Crea o actualiza la cabecera global del cierre mensual (única por período).
  Política: Este script incluye BEGIN TRAN + ROLLBACK TRAN por defecto para revisión manual.
           Cambie a COMMIT TRAN cuando desee aplicar definitivamente los cambios.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_CajaMayor_Cierre_CreateUpdate','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_Cierre_CreateUpdate;
GO
CREATE PROCEDURE dbo.sp_CajaMayor_Cierre_CreateUpdate
    @Anio            NCHAR(4),
    @Mes             NCHAR(2),
    @FechaInicio     DATETIME,
    @FechaFin        DATETIME,
    @Observaciones   NVARCHAR(500) = NULL,
    @InsertaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @Id INT;

        IF EXISTS (SELECT 1 FROM dbo.cajamayor_cierre WHERE n_Anio = @Anio AND n_Mes = @Mes)
        BEGIN
            UPDATE dbo.cajamayor_cierre
               SET t_FechaInicio = @FechaInicio,
                   t_FechaFin    = @FechaFin,
                   v_Observaciones = @Observaciones,
                   i_ActualizaIdUsuario = @InsertaIdUsuario,
                   t_ActualizaFecha = GETDATE()
             WHERE n_Anio = @Anio AND n_Mes = @Mes;

            SELECT @Id = i_IdCajaMayorCierre
              FROM dbo.cajamayor_cierre
             WHERE n_Anio = @Anio AND n_Mes = @Mes;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.cajamayor_cierre (
                n_Anio, n_Mes, t_FechaInicio, t_FechaFin,
                d_SaldoInicialTotal, d_TotalIngresosTotal, d_TotalEgresosTotal, d_SaldoFinalTotal,
                i_EstadoCierre, v_Observaciones, i_InsertaIdUsuario, t_InsertaFecha
            )
            VALUES (
                @Anio, @Mes, @FechaInicio, @FechaFin,
                0, 0, 0, 0,
                1, @Observaciones, @InsertaIdUsuario, GETDATE()
            );
            SET @Id = SCOPE_IDENTITY();
        END

        -- Resultado para verificación
        SELECT i_IdCajaMayorCierre AS IdCajaMayorCierre,
               n_Anio AS Anio,
               n_Mes AS Mes,
               t_FechaInicio AS FechaInicio,
               t_FechaFin AS FechaFin,
               i_EstadoCierre AS EstadoCierre,
               d_SaldoInicialTotal AS SaldoInicialTotal,
               d_TotalIngresosTotal AS TotalIngresosTotal,
               d_TotalEgresosTotal AS TotalEgresosTotal,
               d_SaldoFinalTotal AS SaldoFinalTotal
          FROM dbo.cajamayor_cierre
         WHERE i_IdCajaMayorCierre = @Id;

        -- Por política del workspace, mantener ROLLBACK por defecto para revisión.
        ROLLBACK TRAN;
        /*
        -- Si aprueba los cambios, reemplace ROLLBACK por COMMIT:
        COMMIT TRAN;
        */
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRAN;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO
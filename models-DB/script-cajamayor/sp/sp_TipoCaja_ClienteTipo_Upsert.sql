/*
  SP: sp_TipoCaja_ClienteTipo_Upsert
  Descripción: Upsert para tipocaja_clientetipo, vinculando el tipo de cliente
               (venta.i_ClienteEsAgente) con el IdTipoCaja.
  Política: Compatible con SQL Server 2012 (DROP + CREATE con GO).
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_TipoCaja_ClienteTipo_Upsert','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_TipoCaja_ClienteTipo_Upsert;
GO
CREATE PROCEDURE dbo.sp_TipoCaja_ClienteTipo_Upsert
    @i_ClienteEsAgente INT,
    @i_IdTipoCaja      INT,
    @b_Activo          BIT = 1,
    @i_UsuarioId       INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @StartedTran BIT = 0;
        IF @@TRANCOUNT = 0
        BEGIN
            SET @StartedTran = 1;
            BEGIN TRAN;
        END
        ELSE
        BEGIN
            SAVE TRAN SP_TipoCaja_ClienteTipo_Upsert;
        END

        MERGE dbo.tipocaja_clientetipo AS tgt
        USING (SELECT @i_ClienteEsAgente AS i_ClienteEsAgente) AS src
           ON tgt.i_ClienteEsAgente = src.i_ClienteEsAgente
        WHEN MATCHED THEN
            UPDATE SET tgt.i_IdTipoCaja = @i_IdTipoCaja,
                       tgt.b_Activo = @b_Activo
        WHEN NOT MATCHED THEN
            INSERT (i_ClienteEsAgente, i_IdTipoCaja, b_Activo, i_InsertaIdUsuario, t_InsertaFecha)
            VALUES (@i_ClienteEsAgente, @i_IdTipoCaja, @b_Activo, @i_UsuarioId, GETDATE());

        -- Resultado
        SELECT i_ClienteEsAgente, i_IdTipoCaja, b_Activo
          FROM dbo.tipocaja_clientetipo
         WHERE i_ClienteEsAgente = @i_ClienteEsAgente;

        -- Transacción: por política, si el SP la inició, ROLLBACK por defecto.
        -- Si fue invocado dentro de una transacción externa, no cerrar la transacción.
        IF @StartedTran = 1
        BEGIN
            ROLLBACK TRAN;
            /* COMMIT TRAN; */
        END
    END TRY
    BEGIN CATCH
        -- Manejo de transacciones seguro con anidamiento
        IF XACT_STATE() = -1
        BEGIN
            ROLLBACK TRAN; -- transacción irrecuperable
        END
        ELSE IF XACT_STATE() = 1
        BEGIN
            IF @@TRANCOUNT > 0
            BEGIN
                -- Si el SP no inició la transacción, revertir al savepoint
                IF (SELECT COUNT(*) FROM sys.dm_tran_active_transactions) >= 0
                BEGIN
                    ROLLBACK TRAN SP_TipoCaja_ClienteTipo_Upsert;
                END
                ELSE
                BEGIN
                    ROLLBACK TRAN;
                END
            END
        END
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO
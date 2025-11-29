/*
  SP: sp_TipoCaja_Documento_Upsert
  Descripción: Upsert para tipocaja_documento, vinculando códigos de documento con IdTipoCaja.
  Política: BEGIN TRAN + ROLLBACK por defecto.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_TipoCaja_Documento_Upsert','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_TipoCaja_Documento_Upsert;
GO
CREATE PROCEDURE dbo.sp_TipoCaja_Documento_Upsert
    @IdTipoCaja       INT,
    @CodigoDocumento  INT,
    @Activo           BIT,
    @InsertaIdUsuario INT
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
            SAVE TRAN SP_TipoCaja_Documento_Upsert;
        END

        MERGE dbo.tipocaja_documento AS tgt
        USING (SELECT @CodigoDocumento AS i_CodigoDocumento) AS src
           ON tgt.i_CodigoDocumento = src.i_CodigoDocumento
        WHEN MATCHED THEN
            UPDATE SET tgt.i_IdTipoCaja = @IdTipoCaja,
                       tgt.b_Activo    = @Activo
        WHEN NOT MATCHED THEN
            INSERT (i_CodigoDocumento, i_IdTipoCaja, b_Activo, i_InsertaIdUsuario, t_InsertaFecha)
            VALUES (@CodigoDocumento, @IdTipoCaja, @Activo, @InsertaIdUsuario, GETDATE());

        SELECT i_CodigoDocumento AS CodigoDocumento,
               i_IdTipoCaja AS IdTipoCaja,
               b_Activo AS Activo
          FROM dbo.tipocaja_documento
         WHERE i_CodigoDocumento = @CodigoDocumento;

        -- Si el SP inició la transacción, por defecto hacer ROLLBACK para revisión.
        -- Si fue invocado dentro de una transacción externa, no cerrar la transacción.
        IF @StartedTran = 1
        BEGIN
            ROLLBACK TRAN;
            /* COMMIT TRAN; */
        END
    END TRY
    BEGIN CATCH
        IF XACT_STATE() = -1
        BEGIN
            ROLLBACK TRAN;
        END
        ELSE IF XACT_STATE() = 1
        BEGIN
            IF @@TRANCOUNT > 0
            BEGIN
                ROLLBACK TRAN SP_TipoCaja_Documento_Upsert;
            END
        END
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO
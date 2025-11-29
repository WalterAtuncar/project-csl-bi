/*
  SP: sp_CajaMayor_Cierre_DeletePhysical
  Descripción: Elimina físicamente un cierre de Caja Mayor y cascadas asociadas.
  Política: BEGIN TRAN por defecto con ROLLBACK; cambie a COMMIT manualmente.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRAN;

IF OBJECT_ID('dbo.sp_CajaMayor_Cierre_DeletePhysical', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_Cierre_DeletePhysical;
GO

CREATE PROCEDURE dbo.sp_CajaMayor_Cierre_DeletePhysical
    @IdCajaMayorCierre INT,
    @EliminaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @Rows INT = 0;
        IF EXISTS (SELECT 1 FROM dbo.cajamayor_cierre WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre)
        BEGIN
            DELETE FROM dbo.cajamayor_cierre WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre;
            SET @Rows = @@ROWCOUNT;
        END

        COMMIT TRANSACTION;

        SELECT 
            @IdCajaMayorCierre AS IdCajaMayorCierre,
            @Rows AS RowsAffected,
            CASE WHEN @Rows > 0 THEN 'Cierre eliminado físicamente' ELSE 'Cierre no encontrado' END AS Mensaje;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END
GO

PRINT N'sp_CajaMayor_Cierre_DeletePhysical creado.';

/* Por política, mantener ROLLBACK por defecto. Cambiar a COMMIT manualmente si está conforme. */
ROLLBACK TRAN;
-- COMMIT TRAN;
CREATE OR ALTER PROCEDURE [dbo].[sp_RegistroCompras_Pagar]
    @IdRegistroCompra INT,
    @FechaPago DATE,
    @ActualizaIdUsuario INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE registro_compras
    SET estado = '1',
        actualiza_fecha = @FechaPago,
        i_UpdateUserId = COALESCE(@ActualizaIdUsuario, i_UpdateUserId),
        d_UpdateDate = GETDATE()
    WHERE id_registro_compra = @IdRegistroCompra;

    EXEC [dbo].[sp_RegistroCompras_GetById] @IdRegistroCompra;
END
GO


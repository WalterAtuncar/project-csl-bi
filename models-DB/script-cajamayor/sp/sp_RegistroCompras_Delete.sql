-- Eliminar registro de compras y su egreso vinculado, luego recalcular totales del cierre
-- Por defecto usa transacción y no comitea cambios (ROLLBACK). El usuario decidirá COMMIT.

CREATE OR ALTER PROCEDURE [dbo].[sp_RegistroCompras_Delete]
    @IdRegistroCompra INT,
    @EliminaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdMovimientoEgreso INT;
    DECLARE @IdCajaMayorCierre INT;

    BEGIN TRY
        BEGIN TRAN;

        SELECT @IdMovimientoEgreso = rc.id_movimiento_egreso
          FROM dbo.registro_compras rc
         WHERE rc.id_registro_compra = @IdRegistroCompra;

        -- Obtener el cierre al que pertenece el movimiento
        SELECT @IdCajaMayorCierre = m.i_IdCajaMayorCierre
          FROM dbo.cajamayor_movimiento m
         WHERE m.i_IdMovimiento = @IdMovimientoEgreso;

        -- Eliminar primero el registro de compras
        DELETE FROM dbo.registro_compras WHERE id_registro_compra = @IdRegistroCompra;

        -- Eliminar el movimiento vinculado
        IF @IdMovimientoEgreso IS NOT NULL
            DELETE FROM dbo.cajamayor_movimiento WHERE i_IdMovimiento = @IdMovimientoEgreso;

        -- Retornar datos mínimos
        SELECT @IdRegistroCompra AS IdRegistroCompra, @IdMovimientoEgreso AS IdMovimientoEgreso, @IdCajaMayorCierre AS IdCajaMayorCierre;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END

-- Recalculo sugerido (manual):
-- BEGIN TRAN
-- DECLARE @out TABLE(id INT, mov INT, cierre INT);
-- INSERT INTO @out EXEC dbo.sp_RegistroCompras_Delete @IdRegistroCompra=123, @EliminaIdUsuario=11;
-- DECLARE @IdCierre INT = (SELECT TOP 1 cierre FROM @out);
-- EXEC dbo.sp_CajaMayor_RecalcularTotales @IdCajaMayorCierre=@IdCierre, @ActualizaIdUsuario=11;
-- ROLLBACK TRAN


-- Ajuste para devolver únicamente el i_IdMovimiento usando OUTPUT INSERTED
-- No ejecuta cambios de datos por defecto; al final incluye un bloque de prueba con BEGIN TRAN / ROLLBACK TRAN

CREATE OR ALTER PROCEDURE [dbo].[sp_CajaMayor_InsertMovimientoManual]
    @IdCajaMayorCierre INT,
    @IdTipoCaja        INT,
    @TipoMovimiento    NCHAR(1), -- 'I' o 'E'
    @ConceptoMovimiento NVARCHAR(350) = NULL,
    @Subtotal          DECIMAL(18,2) = NULL,
    @IGV               DECIMAL(18,2) = NULL,
    @Total             DECIMAL(18,2),
    @FechaRegistro     DATETIME,
    @Observaciones     NVARCHAR(200) = NULL,
    @Origen            NVARCHAR(30) = N'manual',
    @CodigoDocumento   NVARCHAR(30) = NULL,
    @SerieDocumento    NVARCHAR(20) = NULL,
    @NumeroDocumento   NVARCHAR(20) = NULL,
    @IdVenta           NVARCHAR(50) = NULL,
    @InsertaIdUsuario  INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        DECLARE @NewId TABLE (i_IdMovimiento INT);

        BEGIN TRAN;

        INSERT INTO dbo.cajamayor_movimiento (
            i_IdCajaMayorCierre,
            i_IdTipoCaja,
            v_TipoMovimiento,
            v_ConceptoMovimiento,
            d_Subtotal,
            d_IGV,
            d_Total,
            t_FechaMovimiento,
            v_Observaciones,
            v_Origen,
            v_CodigoDocumento,
            v_SerieDocumento,
            v_NumeroDocumento,
            v_IdVenta,
            i_InsertaIdUsuario,
            t_InsertaFecha
        )
        OUTPUT INSERTED.i_IdMovimiento INTO @NewId(i_IdMovimiento)
        VALUES (
            @IdCajaMayorCierre,
            @IdTipoCaja,
            @TipoMovimiento,
            @ConceptoMovimiento,
            @Subtotal,
            @IGV,
            @Total,
            @FechaRegistro,
            @Observaciones,
            @Origen,
            @CodigoDocumento,
            @SerieDocumento,
            @NumeroDocumento,
            @IdVenta,
            @InsertaIdUsuario,
            GETDATE()
        );

        EXEC dbo.sp_CajaMayor_ResumenTipos @IdCajaMayorCierre = @IdCajaMayorCierre, @ActualizaIdUsuario = @InsertaIdUsuario;

        SELECT i_IdMovimiento FROM @NewId;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END

-- Bloque de prueba (opcional) - ejecutar manualmente y revisar, luego ROLLBACK
-- BEGIN TRAN
-- EXEC dbo.sp_CajaMayor_InsertMovimientoManual
--   @IdCajaMayorCierre = 14,
--   @IdTipoCaja = 1,
--   @TipoMovimiento = N'E',
--   @ConceptoMovimiento = N'Prueba UI',
--   @Subtotal = 0,
--   @IGV = 0,
--   @Total = 100,
--   @FechaRegistro = GETDATE(),
--   @Observaciones = N'',
--   @Origen = N'manual',
--   @CodigoDocumento = N'01',
--   @SerieDocumento = N'F001',
--   @NumeroDocumento = N'00000001',
--   @IdVenta = NULL,
--   @InsertaIdUsuario = 1;
-- ROLLBACK TRAN


CREATE OR ALTER PROCEDURE [dbo].[sp_CajaMayor_RecalcularIncremental]
    @IdCajaMayorCierre INT,
    @DefaultIdTipoCaja INT,
    @FechaDesde DATE,
    @FechaHasta DATE,
    @Preview BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @PendIng INT = 0, @OmitIng INT = 0, @PendEgr INT = 0, @OmitEgr INT = 0;

    BEGIN TRY
        -- Preview ingresos
        DECLARE @tIng TABLE (Pendientes INT, Omitidos INT);
        INSERT INTO @tIng EXEC dbo.sp_CajaMayor_GenerarIngresos_incremental @IdCajaMayorCierre, @DefaultIdTipoCaja, @FechaDesde, @FechaHasta, 1;
        SELECT @PendIng = Pendientes, @OmitIng = Omitidos FROM @tIng;

        -- Preview egresos
        DECLARE @tEgr TABLE (Pendientes INT, Omitidos INT);
        INSERT INTO @tEgr EXEC dbo.sp_CajaMayor_GenerarEgresos_incremental @IdCajaMayorCierre, @DefaultIdTipoCaja, @FechaDesde, @FechaHasta, 1;
        SELECT @PendEgr = Pendientes, @OmitEgr = Omitidos FROM @tEgr;

        IF (@Preview = 1)
        BEGIN
            SELECT @PendIng AS PendientesIngresos, @OmitIng AS OmitidosIngresos, @PendEgr AS PendientesEgresos, @OmitEgr AS OmitidosEgresos;
            RETURN;
        END

        -- Ejecutar inserciones reales
        EXEC dbo.sp_CajaMayor_GenerarIngresos_incremental @IdCajaMayorCierre, @DefaultIdTipoCaja, @FechaDesde, @FechaHasta, 0;
        EXEC dbo.sp_CajaMayor_GenerarEgresos_incremental @IdCajaMayorCierre, @DefaultIdTipoCaja, @FechaDesde, @FechaHasta, 0;

        -- Recalcular totales
        EXEC dbo.sp_CajaMayor_RecalcularTotales @IdCajaMayorCierre = @IdCajaMayorCierre, @ActualizaIdUsuario = 1;

        SELECT @PendIng AS PendientesIngresos, @OmitIng AS OmitidosIngresos, @PendEgr AS PendientesEgresos, @OmitEgr AS OmitidosEgresos;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END


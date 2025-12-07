CREATE OR ALTER PROCEDURE [dbo].[sp_CajaMayor_GenerarIngresos_incremental]
    @IdCajaMayorCierre INT,
    @DefaultIdTipoCaja INT,
    @FechaDesde DATE,
    @FechaHasta DATE,
    @Preview BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    /*
      Inserta ingresos por cobranzas del rango [@FechaDesde, @FechaHasta]
      evitando duplicados contra cajamayor_movimiento del cierre usando clave lógica.
      Clave dedupe (normalizada): (i_IdCajaMayorCierre, i_IdTipoCaja=@DefaultIdTipoCaja, v_TipoMovimiento='I', v_Origen='cobranzas', v_CodigoDocumento, v_SerieDocumento, v_NumeroDocumento, t_FechaMovimiento)
      Documentos sin serie/numero: dedupe por IdCobranza (ejemplo) si está disponible
    */

    BEGIN TRY
        IF (@Preview = 1)
        BEGIN
            ;WITH src AS (
                SELECT c.v_CodigoDocumento, UPPER(LTRIM(RTRIM(c.v_Serie))) AS Serie,
                       LTRIM(RTRIM(c.v_Numero)) AS Numero, CAST(c.t_FechaCobranza AS DATE) AS Fecha,
                       c.d_Monto AS Total, c.i_IdCobranza AS IdCobranza
                FROM dbo.cobranzas c
                WHERE CAST(c.t_FechaCobranza AS DATE) BETWEEN @FechaDesde AND @FechaHasta
            ),
            already AS (
                SELECT m.v_CodigoDocumento, UPPER(LTRIM(RTRIM(m.v_SerieDocumento))) AS Serie,
                       LTRIM(RTRIM(m.v_NumeroDocumento)) AS Numero, CAST(m.t_FechaMovimiento AS DATE) AS Fecha
                FROM dbo.cajamayor_movimiento m
                WHERE m.i_IdCajaMayorCierre = @IdCajaMayorCierre AND m.v_TipoMovimiento = 'I' AND m.v_Origen = 'cobranzas'
            )
            SELECT 
                (SELECT COUNT(1) FROM src s
                 WHERE NOT EXISTS (
                    SELECT 1 FROM already a
                    WHERE ISNULL(a.v_CodigoDocumento,'') = ISNULL(s.v_CodigoDocumento,'')
                      AND ISNULL(a.Serie,'') = ISNULL(s.Serie,'')
                      AND ISNULL(a.Numero,'') = ISNULL(s.Numero,'')
                      AND a.Fecha = s.Fecha
                 )) AS Pendientes,
                (SELECT COUNT(1) FROM src s
                 WHERE EXISTS (
                    SELECT 1 FROM already a
                    WHERE ISNULL(a.v_CodigoDocumento,'') = ISNULL(s.v_CodigoDocumento,'')
                      AND ISNULL(a.Serie,'') = ISNULL(s.Serie,'')
                      AND ISNULL(a.Numero,'') = ISNULL(s.Numero,'')
                      AND a.Fecha = s.Fecha
                 )) AS Omitidos;
            RETURN;
        END

        BEGIN TRAN;

        INSERT INTO dbo.cajamayor_movimiento (
            i_IdCajaMayorCierre, i_IdTipoCaja, v_TipoMovimiento, v_Origen,
            v_CodigoDocumento, v_SerieDocumento, v_NumeroDocumento,
            d_Subtotal, d_IGV, d_Total,
            t_FechaMovimiento,
            i_InsertaIdUsuario, t_InsertaFecha
        )
        SELECT @IdCajaMayorCierre, @DefaultIdTipoCaja, 'I', 'cobranzas',
               s.v_CodigoDocumento, s.Serie, s.Numero,
               NULL, NULL, s.Total,
               s.Fecha,
               1, GETDATE()
        FROM (
            SELECT c.v_CodigoDocumento,
                   UPPER(LTRIM(RTRIM(c.v_Serie))) AS Serie,
                   LTRIM(RTRIM(c.v_Numero)) AS Numero,
                   CAST(c.t_FechaCobranza AS DATE) AS Fecha,
                   c.d_Monto AS Total
            FROM dbo.cobranzas c
            WHERE CAST(c.t_FechaCobranza AS DATE) BETWEEN @FechaDesde AND @FechaHasta
        ) s
        WHERE NOT EXISTS (
            SELECT 1 FROM dbo.cajamayor_movimiento m
            WHERE m.i_IdCajaMayorCierre = @IdCajaMayorCierre
              AND m.i_IdTipoCaja = @DefaultIdTipoCaja
              AND m.v_TipoMovimiento = 'I' AND m.v_Origen = 'cobranzas'
              AND ISNULL(UPPER(LTRIM(RTRIM(m.v_SerieDocumento))),'') = ISNULL(s.Serie,'')
              AND ISNULL(LTRIM(RTRIM(m.v_NumeroDocumento)),'') = ISNULL(s.Numero,'')
              AND ISNULL(m.v_CodigoDocumento,'') = ISNULL(s.v_CodigoDocumento,'')
              AND CAST(m.t_FechaMovimiento AS DATE) = s.Fecha
        );

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRAN;
        THROW;
    END CATCH
END


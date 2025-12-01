ALTER PROCEDURE [dbo].[sp_CajaMayor_GenerarDesdeCobranzas]
    @IdCajaMayorCierre INT,
    @InsertaIdUsuario  INT,
    @DefaultIdTipoCaja INT = NULL -- opcional, se usa si no se encuentra mapeo
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @FechaInicio DATETIME, @FechaFin DATETIME;
        SELECT @FechaInicio = t_FechaInicio, @FechaFin = t_FechaFin
          FROM dbo.cajamayor_cierre
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre;

        IF @FechaInicio IS NULL OR @FechaFin IS NULL
        BEGIN
            RAISERROR('El cierre no existe o no tiene rango de fechas definido.', 16, 1);
        END

        ;WITH Cobros AS (
            SELECT cd.v_IdCobranzaDetalle,
                   cd.v_IdCobranza,
                   cd.v_IdVenta,
                   v.i_IdTipoDocumento,
                   cd.i_IdFormaPago,
                   cd.i_IdMoneda,
                   cd.d_ImporteSoles,
                   cd.d_ImporteDolares,
                   cd.t_InsertaFecha,
                   cd.v_Observacion,
                   v.v_SerieDocumento,
                   v.v_CorrelativoDocumento,
                   -- NumeroDocumento no existe en venta; se construye desde serie+correlativo
                   CAST(ISNULL(v.v_SerieDocumento,'') + '-' + ISNULL(v.v_CorrelativoDocumento,'') AS NVARCHAR(50)) AS v_NumeroDocumento,
                   v.i_ClienteEsAgente,
                   v.t_FechaRegistro AS FechaVenta,
                   -- Concepto concatenado desde ventadetalle
                   vdAgg.v_ConceptosDetalle AS v_ConceptosDetalle,
                   ISNULL(v.i_EsAfectoIgv, 0) AS i_EsAfectoIgv,
                   ISNULL(v.d_Total, 0) AS d_TotalVenta,
                   ISNULL(v.d_IGV, 0) AS d_IGVVenta
              FROM [20505310072].[dbo].[cobranzadetalle] cd
         LEFT JOIN [20505310072].[dbo].[venta] v
                ON v.v_IdVenta = cd.v_IdVenta
               AND ISNULL(v.i_Eliminado,0) = 0
         OUTER APPLY (
                SELECT STUFF(
                           (
                               SELECT ' | ' + ISNULL(d.v_DescripcionProducto, '')
                                 FROM [20505310072].[dbo].[ventadetalle] d
                                WHERE d.v_IdVenta = v.v_IdVenta
                                  AND ISNULL(d.i_Eliminado,0) = 0
                                ORDER BY d.t_InsertaFecha
                                  FOR XML PATH(''), TYPE
                           ).value('.', 'NVARCHAR(MAX)'), 1, 3, ''
                       ) AS v_ConceptosDetalle
         ) vdAgg
             WHERE cd.i_Eliminado = 0
               AND cd.t_InsertaFecha >= @FechaInicio
               AND cd.t_InsertaFecha < DATEADD(DAY, 1, @FechaFin)
                AND (v.v_SerieDocumento LIKE 'F%' OR v.v_SerieDocumento LIKE 'B%' OR v.v_SerieDocumento LIKE 'I%')
                AND (v.v_SerieDocumento NOT LIKE 'THM%' AND v.v_SerieDocumento NOT LIKE 'TFM%')
        )
        INSERT INTO dbo.cajamayor_movimiento (
            i_IdCajaMayorCierre,
            i_IdTipoCaja,
            v_TipoMovimiento,
            v_ConceptoMovimiento,
            d_Subtotal,
            d_IGV,
            d_Total,
            i_IdFormaPago,
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
        SELECT @IdCajaMayorCierre AS i_IdCajaMayorCierre,
               COALESCE(tcct.i_IdTipoCaja, @DefaultIdTipoCaja) AS i_IdTipoCaja,
               'I' AS v_TipoMovimiento,
               LEFT(COALESCE(c.v_ConceptosDetalle, CONCAT('Cobranza ', ISNULL(c.v_IdCobranza,''))), 350) AS v_ConceptoMovimiento,
               CASE 
                   WHEN c.i_EsAfectoIgv = 1 AND c.d_TotalVenta > 0 AND c.d_IGVVenta > 0 
                       THEN ROUND(ISNULL(c.d_ImporteSoles,0) - ROUND(ISNULL(c.d_ImporteSoles,0) * (c.d_IGVVenta / c.d_TotalVenta), 2), 2)
                   ELSE ISNULL(c.d_ImporteSoles,0)
               END AS d_Subtotal,
               CASE 
                   WHEN c.i_EsAfectoIgv = 1 AND c.d_TotalVenta > 0 AND c.d_IGVVenta > 0 
                       THEN ROUND(ISNULL(c.d_ImporteSoles,0) * (c.d_IGVVenta / c.d_TotalVenta), 2)
                   ELSE 0
               END AS d_IGV,
               ISNULL(c.d_ImporteSoles,0) AS d_Total,
               c.i_IdFormaPago AS i_IdFormaPago,
               c.t_InsertaFecha AS t_FechaMovimiento,
               CONCAT('Cobranza ', ISNULL(c.v_IdCobranza,'')) AS v_Observaciones,
               'cobranzas' AS v_Origen,
               CAST(COALESCE(doc.v_Siglas, c.v_SerieDocumento) AS NVARCHAR(30)) AS v_CodigoDocumento,
               ISNULL(c.v_SerieDocumento,'') AS v_SerieDocumento,
               ISNULL(c.v_NumeroDocumento,'') AS v_NumeroDocumento,
               ISNULL(c.v_IdVenta,'') AS v_IdVenta,
               @InsertaIdUsuario AS i_InsertaIdUsuario,
               GETDATE() AS t_InsertaFecha
          FROM Cobros c
     LEFT JOIN dbo.tipocaja_clientetipo tcct
            ON tcct.i_ClienteEsAgente = c.i_ClienteEsAgente AND tcct.b_Activo = 1
     LEFT JOIN [20505310072].[dbo].[documento] doc
            ON doc.i_CodigoDocumento = c.i_IdTipoDocumento;

        -- Recalcular resumen por tipo (consumir resultset para no interferir con el cliente)
        DECLARE @ResumenTipos TABLE (
            IdCajaMayorCierre INT,
            IdTipoCaja INT,
            SaldoInicial DECIMAL(18,4),
            TotalIngresos DECIMAL(18,4),
            TotalEgresos DECIMAL(18,4),
            SaldoFinal DECIMAL(18,4)
        );
        INSERT INTO @ResumenTipos
        EXEC dbo.sp_CajaMayor_ResumenTipos @IdCajaMayorCierre = @IdCajaMayorCierre, @ActualizaIdUsuario = @InsertaIdUsuario;

        -- Resultado parcial para verificación: últimos insertados
        SELECT TOP (50) *
          FROM dbo.cajamayor_movimiento
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre
           AND v_Origen = 'cobranzas'
         ORDER BY i_IdMovimiento DESC;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END

-- =====================================================================
-- Version en PRODUCCION desde 2026-05-31 (extraida del servidor el 2026-07-11).
-- Reescrito para replicar la logica del cierre de caja diario de
-- Facturacion_New (query "cadenaSA" de frmCierreCajaDiario.cs):
-- egresos identificados por las series exactas ECO/ECA/ECF/ECT/ECG/ECR,
-- suma ventadetalle.d_PrecioVenta y filtra por venta.t_InsertaFecha.
-- =====================================================================
ALTER PROCEDURE dbo.sp_CajaMayor_GenerarEgresosDesdeVentas
    @IdCajaMayorCierre INT,
    @InsertaIdUsuario  INT,
    @DefaultIdTipoCaja INT = NULL
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

        -- ============================================================
        -- EGRESOS: Replica exacta de la logica .NET (cadenaSA)
        -- .NET identifica egresos por serie: ECO, ECA, ECF, ECT, ECG, ECR
        -- .NET suma ventadetalle.d_PrecioVenta (no venta.d_Total)
        -- .NET excluye: i_ClienteEsAgente IN (3,10), i_InsertaIdUsuario = 2036
        -- .NET filtra por: venta.t_InsertaFecha (no t_FechaRegistro)
        -- ============================================================
        ;WITH VentasEgreso AS (
            SELECT
                v.v_IdVenta,
                v.v_SerieDocumento,
                v.v_CorrelativoDocumento,
                v.t_InsertaFecha,
                v.i_ClienteEsAgente,
                SUM(ISNULL(vd.d_PrecioVenta, 0)) AS d_TotalEgreso,
                -- Concepto concatenado (compatible SQL Server 2012)
                STUFF(
                    (
                        SELECT ' | ' + ISNULL(REPLACE(d2.v_DescripcionProducto, CHAR(31), ''), '')
                          FROM [dbo].[ventadetalle] d2
                         WHERE d2.v_IdVenta = v.v_IdVenta
                           AND ISNULL(d2.i_Eliminado, 0) = 0
                         ORDER BY d2.t_InsertaFecha
                           FOR XML PATH(''), TYPE
                    ).value('.', 'NVARCHAR(MAX)'), 1, 3, ''
                ) AS v_ConceptosDetalle
            FROM [dbo].[venta] v
            INNER JOIN [dbo].[ventadetalle] vd
                ON v.v_IdVenta = vd.v_IdVenta
                AND ISNULL(vd.i_Eliminado, 0) = 0
            WHERE v.i_Eliminado = 0
              -- Fecha: usar t_InsertaFecha como .NET
              -- Normalizar fechas: ignorar hora almacenada en t_FechaFin (23:59:59)
              AND v.t_InsertaFecha >= CAST(@FechaInicio AS DATE)
              AND v.t_InsertaFecha < DATEADD(DAY, 1, CAST(@FechaFin AS DATE))
              -- Series de egreso exactas (como .NET)
              AND v.v_SerieDocumento IN ('ECO', 'ECA', 'ECF', 'ECT', 'ECG', 'ECR')
              -- Exclusiones del .NET
              AND v.i_ClienteEsAgente IS NOT NULL
              AND v.i_ClienteEsAgente NOT IN (3, 10)
              AND v.i_InsertaIdUsuario != 2036
            GROUP BY
                v.v_IdVenta,
                v.v_SerieDocumento,
                v.v_CorrelativoDocumento,
                v.t_InsertaFecha,
                v.i_ClienteEsAgente
        )
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
        SELECT
            @IdCajaMayorCierre,
            COALESCE(tcct.i_IdTipoCaja, @DefaultIdTipoCaja),
            'E',  -- Egreso
            LEFT(COALESCE(ve.v_ConceptosDetalle, 'Egreso ' + ISNULL(ve.v_SerieDocumento,'')), 350),
            0,    -- d_Subtotal (no aplica en egresos .NET)
            0,    -- d_IGV (no aplica en egresos .NET)
            ISNULL(ve.d_TotalEgreso, 0),
            ve.t_InsertaFecha,
            'Egreso serie ' + ISNULL(ve.v_SerieDocumento, ''),
            'ventas-egreso',
            ISNULL(ve.v_SerieDocumento, ''),
            ISNULL(ve.v_SerieDocumento, ''),
            ISNULL(ve.v_SerieDocumento, '') + '-' + ISNULL(ve.v_CorrelativoDocumento, ''),
            ISNULL(ve.v_IdVenta, ''),
            @InsertaIdUsuario,
            GETDATE()
        FROM VentasEgreso ve
        LEFT JOIN dbo.tipocaja_clientetipo tcct
            ON tcct.i_ClienteEsAgente = ve.i_ClienteEsAgente
            AND tcct.b_Activo = 1;

        -- Recalcular resumen por tipo
        EXEC dbo.sp_CajaMayor_ResumenTipos
            @IdCajaMayorCierre = @IdCajaMayorCierre,
            @ActualizaIdUsuario = @InsertaIdUsuario;

        -- Resultado para verificacion
        SELECT TOP (50) *
          FROM dbo.cajamayor_movimiento
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre
           AND v_Origen = 'ventas-egreso'
         ORDER BY i_IdMovimiento DESC;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRAN;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END

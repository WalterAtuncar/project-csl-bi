/*
  SP: sp_CajaMayor_GenerarEgresosDesdeVentas
  Descripción: Genera movimientos de EGRESO ('E') en cajamayor_movimiento a partir de ventas
               clasificadas como egresos (por series EC*, notas de crédito/devolución),
               dentro del período de la cabecera indicada.

  Política: BEGIN TRAN + COMMIT por defecto (persistir egresos). Si desea
             revisar sin persistir, ejecute manualmente con ROLLBACK.

  Notas importantes:
  - Tabla fuente: [20505310072].[dbo].[venta]
  - Criterio egresos: series que comienzan con 'EC' (devoluciones), o documento identificado
    como Nota de Crédito / Devolución según su catálogo. Ajuste según su realidad.
  - Mapeo a tipo de caja: por defecto se usa i_ClienteEsAgente para diferenciar egresos asistenciales
    u otros; alternativamente, puede mapearse por tipocaja_documento si hay códigos disponibles.
  - Concepto: concatenado desde ventadetalle.v_DescripcionProducto con separador '|', limitado a 350 caracteres.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_CajaMayor_GenerarEgresosDesdeVentas','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_GenerarEgresosDesdeVentas;
GO
CREATE PROCEDURE dbo.sp_CajaMayor_GenerarEgresosDesdeVentas
    @IdCajaMayorCierre INT,
    @InsertaIdUsuario  INT,
    @DefaultIdTipoCaja INT = NULL -- opcional, se usa si no se infiere
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

        ;WITH VentasEgreso AS (
            SELECT v.v_IdVenta,
                   v.v_SerieDocumento,
                   v.v_CorrelativoDocumento,
                   CAST(ISNULL(v.v_SerieDocumento,'') + '-' + ISNULL(v.v_CorrelativoDocumento,'') AS NVARCHAR(50)) AS v_NumeroDocumento,
                   v.t_FechaRegistro,
                   v.d_Total,
                   v.i_ClienteEsAgente,
                   -- Concepto concatenado desde ventadetalle (SQL Server 2012)
                   veAgg.v_ConceptosDetalle
              FROM [20505310072].[dbo].[venta] v
         OUTER APPLY (
                SELECT STUFF(
                           (
                               SELECT ' | ' + ISNULL(REPLACE(d.v_DescripcionProducto, CHAR(31), ''), '')
                                 FROM [20505310072].[dbo].[ventadetalle] d
                                WHERE d.v_IdVenta = v.v_IdVenta
                                  AND ISNULL(d.i_Eliminado,0) = 0
                                ORDER BY d.t_InsertaFecha
                                  FOR XML PATH(''), TYPE
                           ).value('.', 'NVARCHAR(MAX)'), 1, 3, ''
                       ) AS v_ConceptosDetalle
         ) veAgg
             WHERE v.i_Eliminado = 0
               AND v.t_FechaRegistro >= @FechaInicio
               AND v.t_FechaRegistro < DATEADD(DAY, 1, @FechaFin)
               AND (
                     LEFT(ISNULL(v.v_SerieDocumento,''),2) = 'EC'
                     OR LEFT(ISNULL(v.v_SerieDocumento,''),3) IN ('NC-', 'NCR') -- ejemplos de posibles series de NC
                   )
        )
        INSERT INTO dbo.cajamayor_movimiento (
            i_IdCajaMayorCierre,
            i_IdTipoCaja,
            v_TipoMovimiento,
            v_ConceptoMovimiento,
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
        SELECT @IdCajaMayorCierre AS i_IdCajaMayorCierre,
               COALESCE(tcct.i_IdTipoCaja, @DefaultIdTipoCaja) AS i_IdTipoCaja,
               'E' AS v_TipoMovimiento,
               LEFT(COALESCE(ve.v_ConceptosDetalle, 'Venta egreso (NC/Devolución/EC*)'), 350) AS v_ConceptoMovimiento,
               ISNULL(ve.d_Total,0) AS d_Total,
               ve.t_FechaRegistro AS t_FechaMovimiento,
               'Venta egreso (NC/Devolución/EC*)' AS v_Observaciones,
               'ventas-egreso' AS v_Origen,
               CAST(NULL AS NVARCHAR(30)) AS v_CodigoDocumento, -- puede mapearse si se conoce catálogo
               ISNULL(ve.v_SerieDocumento,'') AS v_SerieDocumento,
               ISNULL(ve.v_NumeroDocumento,'') AS v_NumeroDocumento,
               ISNULL(ve.v_IdVenta,'') AS v_IdVenta,
               @InsertaIdUsuario AS i_InsertaIdUsuario,
               GETDATE() AS t_InsertaFecha
          FROM VentasEgreso ve
     LEFT JOIN dbo.tipocaja_clientetipo tcct
            ON tcct.i_ClienteEsAgente = ve.i_ClienteEsAgente AND tcct.b_Activo = 1;

        -- Recalcular resumen por tipo
        EXEC dbo.sp_CajaMayor_ResumenTipos @IdCajaMayorCierre = @IdCajaMayorCierre, @ActualizaIdUsuario = @InsertaIdUsuario;

        -- Resultado parcial para verificación
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
GO
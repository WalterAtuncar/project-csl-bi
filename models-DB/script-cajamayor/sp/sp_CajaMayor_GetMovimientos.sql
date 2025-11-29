/*
  SP: sp_CajaMayor_GetMovimientos
  Descripción: Lista movimientos del cierre con filtros opcionales.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_CajaMayor_GetMovimientos','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_GetMovimientos;
GO
CREATE PROCEDURE dbo.sp_CajaMayor_GetMovimientos
    @IdCajaMayorCierre INT,
    @IdTipoCaja        INT = NULL,
    @TipoMovimiento    NCHAR(1) = NULL, -- 'I' ingreso, 'E' egreso
    @Origen            NVARCHAR(30) = NULL,
    @FechaDesde        DATETIME = NULL,
    @FechaHasta        DATETIME = NULL,
    @Page              INT = 1,
    @PageSize          INT = 50,
    @SinPaginacion     BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF @SinPaginacion = 1
    BEGIN
        -- Sin paginación: devolver todas las filas del filtro
        SELECT cm.i_IdMovimiento          AS IdCajaMayorMovimiento,
               cm.i_IdCajaMayorCierre     AS IdCajaMayorCierre,
               cm.i_IdTipoCaja            AS IdTipoCaja,
               tc.v_NombreTipoCaja        AS NombreTipoCaja,
               cm.v_TipoMovimiento        AS TipoMovimiento,
               cm.d_Total                 AS Total,
               cm.t_FechaMovimiento       AS FechaRegistro,
               LEFT(LTRIM(RTRIM(cm.v_ConceptoMovimiento)), 200) AS ConceptoMovimiento,
               cm.v_Observaciones         AS Observaciones,
               cm.v_Origen                AS Origen,
               cm.v_CodigoDocumento       AS CodigoDocumento,
               cm.v_SerieDocumento        AS SerieDocumento,
               cm.v_NumeroDocumento       AS NumeroDocumento,
               cm.v_IdVenta               AS IdReferencia,
               CAST(NULL AS NVARCHAR(50)) AS Referencia
          FROM dbo.cajamayor_movimiento cm
     LEFT JOIN dbo.tipocaja tc
            ON tc.i_IdTipoCaja = cm.i_IdTipoCaja
         WHERE cm.i_IdCajaMayorCierre = @IdCajaMayorCierre
           AND (@IdTipoCaja IS NULL OR cm.i_IdTipoCaja = @IdTipoCaja)
           AND (@TipoMovimiento IS NULL OR cm.v_TipoMovimiento = @TipoMovimiento)
           AND (@Origen IS NULL OR cm.v_Origen = @Origen)
           AND (@FechaDesde IS NULL OR cm.t_FechaMovimiento >= @FechaDesde)
           AND (@FechaHasta IS NULL  OR cm.t_FechaMovimiento <= @FechaHasta)
         ORDER BY cm.t_FechaMovimiento DESC, cm.i_IdMovimiento DESC;
    END
    ELSE
    BEGIN
        IF @Page < 1 SET @Page = 1;
        IF @PageSize < 1 SET @PageSize = 50;

        DECLARE @Offset INT = (@Page - 1) * @PageSize;

        SELECT cm.i_IdMovimiento          AS IdCajaMayorMovimiento,
               cm.i_IdCajaMayorCierre     AS IdCajaMayorCierre,
               cm.i_IdTipoCaja            AS IdTipoCaja,
               tc.v_NombreTipoCaja        AS NombreTipoCaja,
               cm.v_TipoMovimiento        AS TipoMovimiento,
               cm.d_Total                 AS Total,
               cm.t_FechaMovimiento       AS FechaRegistro,
               LEFT(LTRIM(RTRIM(cm.v_ConceptoMovimiento)), 200) AS ConceptoMovimiento,
               cm.v_Observaciones         AS Observaciones,
               cm.v_Origen                AS Origen,
               cm.v_CodigoDocumento       AS CodigoDocumento,
               cm.v_SerieDocumento        AS SerieDocumento,
               cm.v_NumeroDocumento       AS NumeroDocumento,
               cm.v_IdVenta               AS IdReferencia,
               CAST(NULL AS NVARCHAR(50)) AS Referencia
          FROM dbo.cajamayor_movimiento cm
     LEFT JOIN dbo.tipocaja tc
            ON tc.i_IdTipoCaja = cm.i_IdTipoCaja
         WHERE cm.i_IdCajaMayorCierre = @IdCajaMayorCierre
           AND (@IdTipoCaja IS NULL OR cm.i_IdTipoCaja = @IdTipoCaja)
           AND (@TipoMovimiento IS NULL OR cm.v_TipoMovimiento = @TipoMovimiento)
           AND (@Origen IS NULL OR cm.v_Origen = @Origen)
           AND (@FechaDesde IS NULL OR cm.t_FechaMovimiento >= @FechaDesde)
           AND (@FechaHasta IS NULL  OR cm.t_FechaMovimiento <= @FechaHasta)
         ORDER BY cm.t_FechaMovimiento DESC, cm.i_IdMovimiento DESC
         OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
    END
END
GO
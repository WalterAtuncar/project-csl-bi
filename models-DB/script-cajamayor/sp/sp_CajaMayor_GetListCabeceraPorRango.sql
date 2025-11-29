/*
  SP: sp_CajaMayor_GetListCabeceraPorRango
  Descripción: Lista cabeceras de cierre entre un rango de periodo (YYYYMM) con filtro opcional por estado.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_CajaMayor_GetListCabeceraPorRango','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_GetListCabeceraPorRango;
GO
CREATE PROCEDURE dbo.sp_CajaMayor_GetListCabeceraPorRango
    @PeriodoDesde   INT,
    @PeriodoHasta   INT,
    @EstadoCierre   TINYINT = NULL,
    @Page           INT = 1,
    @PageSize       INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    IF @Page < 1 SET @Page = 1;
    IF @PageSize < 1 SET @PageSize = 50;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    SELECT i_IdCajaMayorCierre AS IdCajaMayorCierre,
           n_Anio AS Anio,
           n_Mes AS Mes,
           t_FechaInicio AS FechaInicio,
           t_FechaFin AS FechaFin,
           i_EstadoCierre AS EstadoCierre,
           d_SaldoInicialTotal AS SaldoInicialTotal,
           d_TotalIngresosTotal AS TotalIngresosTotal,
           d_TotalEgresosTotal AS TotalEgresosTotal,
           d_SaldoFinalTotal AS SaldoFinalTotal,
           v_Observaciones AS Observaciones
      FROM dbo.cajamayor_cierre
     WHERE ((CAST(n_Anio AS INT) * 100) + CAST(n_Mes AS INT)) BETWEEN @PeriodoDesde AND @PeriodoHasta
       AND (@EstadoCierre IS NULL OR i_EstadoCierre = @EstadoCierre)
     ORDER BY t_FechaInicio DESC, t_FechaFin DESC
     OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO
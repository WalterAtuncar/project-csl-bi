USE [20505310072]
GO

-- ================================================
-- Resumen Mensual por Tipo de Caja (rango de períodos)
-- Nombre: dbo.sp_CajaMayor_ResumenMensualPorTipo
-- Objetivo: Devuelve el resumen mensual por tipo de caja dentro de un rango
--            de períodos (YYYYMM), con soporte de filtros y paginación.
-- Parámetros:
--   @PeriodoDesde INT   -- 202401
--   @PeriodoHasta INT   -- 202412
--   @IdTipoCaja INT = NULL
--   @EstadoCierre TINYINT = NULL  -- 1=Borrador, 2=Cerrado, 3=Confirmado
--   @Page INT = 1
--   @PageSize INT = 50
-- Salida:
--   Periodo (INT, YYYYMM), Anio (INT), Mes (INT), IdTipoCaja, NombreTipoCaja,
--   SaldoInicial, TotalIngresos, TotalEgresos, SaldoFinal
-- ================================================

IF OBJECT_ID('dbo.sp_CajaMayor_ResumenMensualPorTipo', 'P') IS NOT NULL
DROP PROCEDURE dbo.sp_CajaMayor_ResumenMensualPorTipo
GO

CREATE PROCEDURE dbo.sp_CajaMayor_ResumenMensualPorTipo
    @PeriodoDesde INT,
    @PeriodoHasta INT,
    @IdTipoCaja INT = NULL,
    @EstadoCierre TINYINT = NULL,
    @Page INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    ;WITH Resumen AS (
        SELECT
            CAST(cc.n_Anio AS INT) * 100 + CAST(cc.n_Mes AS INT) AS Periodo,
            CAST(cc.n_Anio AS INT) AS Anio,
            CAST(cc.n_Mes AS INT) AS Mes,
            ct.i_IdTipoCaja AS IdTipoCaja,
            tc.v_NombreTipoCaja AS NombreTipoCaja,
            ct.d_SaldoInicial AS SaldoInicial,
            ct.d_TotalIngresos AS TotalIngresos,
            ct.d_TotalEgresos AS TotalEgresos,
            ct.d_SaldoFinal AS SaldoFinal
        FROM dbo.cajamayor_cierre cc
        INNER JOIN dbo.cajamayor_cierre_tipocaja ct
            ON ct.i_IdCajaMayorCierre = cc.i_IdCajaMayorCierre
        LEFT JOIN dbo.tipocaja tc
            ON tc.i_IdTipoCaja = ct.i_IdTipoCaja
        WHERE
            (CAST(cc.n_Anio AS INT) * 100 + CAST(cc.n_Mes AS INT)) BETWEEN @PeriodoDesde AND @PeriodoHasta
            AND (@IdTipoCaja IS NULL OR ct.i_IdTipoCaja = @IdTipoCaja)
            AND (@EstadoCierre IS NULL OR cc.i_EstadoCierre = @EstadoCierre)
    )
    SELECT
        Periodo,
        Anio,
        Mes,
        IdTipoCaja,
        NombreTipoCaja,
        SaldoInicial,
        TotalIngresos,
        TotalEgresos,
        SaldoFinal,
        COUNT(*) OVER() AS TotalRecords
    FROM Resumen
    ORDER BY Periodo DESC, NombreTipoCaja ASC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO
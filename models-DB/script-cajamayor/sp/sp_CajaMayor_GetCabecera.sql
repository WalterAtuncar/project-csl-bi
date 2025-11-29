/*
  SP: sp_CajaMayor_GetCabecera
  Descripción: Obtiene la cabecera de cierre por Id.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF OBJECT_ID('dbo.sp_CajaMayor_GetCabecera','P') IS NOT NULL
    DROP PROCEDURE dbo.sp_CajaMayor_GetCabecera;
GO
CREATE PROCEDURE dbo.sp_CajaMayor_GetCabecera
    @IdCajaMayorCierre INT
AS
BEGIN
    SET NOCOUNT ON;

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
           v_Observaciones AS Observaciones,
           i_InsertaIdUsuario AS InsertaIdUsuario,
           t_InsertaFecha AS InsertaFecha,
           i_ActualizaIdUsuario AS ActualizaIdUsuario,
           t_ActualizaFecha AS ActualizaFecha
      FROM dbo.cajamayor_cierre
     WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre;
END
GO
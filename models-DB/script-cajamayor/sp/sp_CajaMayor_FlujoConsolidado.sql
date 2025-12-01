/*
  Stored Procedure: sp_CajaMayor_FlujoConsolidado
  Propósito: Devuelve flujo de caja consolidado por unidad de negocio (tipo de caja)
            para un año dado, con montos por mes (Ene-Dic). Permite filtrar
            por uno o varios tipos de caja (CSV) y por tipo de movimiento ('I'/'E').

  Notas:
  - Fuente de datos: tabla de resumen por tipo de caja dentro del cierre
    (dbo.cajamayor_cierre_tipocaja) enlazada a la cabecera (dbo.cajamayor_cierre).
  - Siempre devuelve los 12 meses del año con 0 cuando no hay datos.
  - Compatible con SQL Server 2012.
*/

ALTER PROCEDURE [dbo].[sp_CajaMayor_FlujoConsolidado]
    @Anio INT,
    @IdsTipoCajaCsv NVARCHAR(MAX) = NULL, -- CSV opcional (ej: '2,3,5')
    @TipoMovimiento CHAR(1) = NULL        -- 'I' ingresos, 'E' egresos, NULL ambos
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        /* Resolver filtro de tipos de caja */
        DECLARE @FiltroTipoCaja TABLE (Id INT PRIMARY KEY);

        IF (@IdsTipoCajaCsv IS NOT NULL AND LEN(RTRIM(LTRIM(@IdsTipoCajaCsv))) > 0)
        BEGIN
            DECLARE @xml XML = CONVERT(XML, '<i>' + REPLACE(@IdsTipoCajaCsv, ',', '</i><i>') + '</i>');
            INSERT INTO @FiltroTipoCaja (Id)
            SELECT DISTINCT T.N.value('.', 'int')
              FROM @xml.nodes('/i') AS T(N)
             WHERE TRY_CONVERT(INT, T.N.value('.', 'nvarchar(20)')) IS NOT NULL;
        END
        ELSE
        BEGIN
            INSERT INTO @FiltroTipoCaja (Id)
            SELECT i_IdTipoCaja
              FROM dbo.tipocaja tc WITH (NOLOCK)
             WHERE ISNULL(tc.i_Estado,1) = 1;
        END;

        /* Tabla de meses 1..12 */
        DECLARE @Meses TABLE (Mes INT PRIMARY KEY);
        INSERT INTO @Meses (Mes)
        VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12);

        /* Base: cierres del año y sus totales por tipo de caja */
        ;WITH Cierres AS (
            SELECT c.i_IdCajaMayorCierre, c.n_Anio, c.n_Mes
              FROM dbo.cajamayor_cierre c WITH (NOLOCK)
             WHERE c.n_Anio = @Anio
        ), Totales AS (
            SELECT ct.i_IdTipoCaja,
                   c.n_Mes,
                   SUM(ISNULL(ct.d_TotalIngresos,0)) AS TotalIngresos,
                   SUM(ISNULL(ct.d_TotalEgresos,0)) AS TotalEgresos
              FROM dbo.cajamayor_cierre_tipocaja ct WITH (NOLOCK)
              JOIN Cierres c ON c.i_IdCajaMayorCierre = ct.i_IdCajaMayorCierre
             GROUP BY ct.i_IdTipoCaja, c.n_Mes
        )
        /* Resultado: por tipo caja y tipo movimiento con columnas mes Ene..Dic */
        SELECT tc.i_IdTipoCaja        AS IdTipoCaja,
               tc.v_NombreTipoCaja   AS NombreTipoCaja,
               X.TipoMovimiento,
               /* Meses del 1 al 12 */
               ISNULL(SUM(CASE WHEN m.Mes = 1  THEN X.Monto ELSE 0 END),0)  AS Ene,
               ISNULL(SUM(CASE WHEN m.Mes = 2  THEN X.Monto ELSE 0 END),0)  AS Feb,
               ISNULL(SUM(CASE WHEN m.Mes = 3  THEN X.Monto ELSE 0 END),0)  AS Mar,
               ISNULL(SUM(CASE WHEN m.Mes = 4  THEN X.Monto ELSE 0 END),0)  AS Abr,
               ISNULL(SUM(CASE WHEN m.Mes = 5  THEN X.Monto ELSE 0 END),0)  AS May,
               ISNULL(SUM(CASE WHEN m.Mes = 6  THEN X.Monto ELSE 0 END),0)  AS Jun,
               ISNULL(SUM(CASE WHEN m.Mes = 7  THEN X.Monto ELSE 0 END),0)  AS Jul,
               ISNULL(SUM(CASE WHEN m.Mes = 8  THEN X.Monto ELSE 0 END),0)  AS Ago,
               ISNULL(SUM(CASE WHEN m.Mes = 9  THEN X.Monto ELSE 0 END),0)  AS Set,
               ISNULL(SUM(CASE WHEN m.Mes = 10 THEN X.Monto ELSE 0 END),0)  AS Oct,
               ISNULL(SUM(CASE WHEN m.Mes = 11 THEN X.Monto ELSE 0 END),0)  AS Nov,
               ISNULL(SUM(CASE WHEN m.Mes = 12 THEN X.Monto ELSE 0 END),0)  AS Dic
          FROM dbo.tipocaja tc WITH (NOLOCK)
          INNER JOIN @FiltroTipoCaja f ON f.Id = tc.i_IdTipoCaja
          CROSS APPLY (
                /* Genera filas para 'I' y/o 'E' según filtro */
                SELECT 'I' AS TipoMovimiento, t.n_Mes AS Mes, ISNULL(t.TotalIngresos,0) AS Monto FROM Totales t WHERE t.i_IdTipoCaja = tc.i_IdTipoCaja
                UNION ALL
                SELECT 'E' AS TipoMovimiento, t.n_Mes AS Mes, ISNULL(t.TotalEgresos,0) AS Monto FROM Totales t WHERE t.i_IdTipoCaja = tc.i_IdTipoCaja
          ) X
          INNER JOIN @Meses m ON m.Mes IN (X.Mes) -- fuerza dominio de 1..12
         WHERE (@TipoMovimiento IS NULL OR X.TipoMovimiento = @TipoMovimiento)
         GROUP BY tc.i_IdTipoCaja, tc.v_NombreTipoCaja, X.TipoMovimiento
         ORDER BY tc.v_NombreTipoCaja, X.TipoMovimiento;

    END TRY
    BEGIN CATCH
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSev INT = ERROR_SEVERITY();
        DECLARE @ErrSta INT = ERROR_STATE();
        RAISERROR(@ErrMsg, @ErrSev, @ErrSta);
    END CATCH
END

GO
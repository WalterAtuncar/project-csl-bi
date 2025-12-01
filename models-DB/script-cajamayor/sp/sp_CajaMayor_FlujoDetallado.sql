/*
  Stored Procedure: sp_CajaMayor_FlujoDetallado
  Propósito: Devuelve flujo de caja DETALLADO por unidad de negocio (tipo de caja)
            para un año dado, con montos por mes (Ene-Dic) y un clasificador
            de detalle. Para ingresos se usa FORMA_PAGO (datahierarchy GroupId=46).
            Para egresos se usa ORIGEN (campo v_Origen del movimiento).

  Notas:
  - Fuente de datos: detalle unificado de movimientos (dbo.cajamayor_movimiento)
    enlazado a la cabecera de cierre (dbo.cajamayor_cierre) y tipocaja.
  - Siempre devuelve los 12 meses del año con 0 cuando no hay datos.
  - Compatible con SQL Server 2012.
*/

CREATE OR ALTER PROCEDURE [dbo].[sp_CajaMayor_FlujoDetallado]
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

        /* Base: movimientos del año por tipo de caja y clasificador de detalle */
        ;WITH Cierres AS (
            SELECT c.i_IdCajaMayorCierre, c.n_Anio, c.n_Mes
              FROM dbo.cajamayor_cierre c WITH (NOLOCK)
             WHERE c.n_Anio = @Anio
        ), MovimientosDet AS (
            SELECT 
                   cm.i_IdTipoCaja                          AS IdTipoCaja,
                   tc.v_NombreTipoCaja                      AS NombreTipoCaja,
                   cm.v_TipoMovimiento                      AS TipoMovimiento,
                   c.n_Mes                                  AS Mes,
                   CASE WHEN cm.v_TipoMovimiento = 'I' THEN 'FORMA_PAGO' ELSE 'ORIGEN' END AS DetalleTipo,
                   CASE WHEN cm.v_TipoMovimiento = 'I' THEN ISNULL(cm.i_IdFormaPago, -1)
                        ELSE ABS(CHECKSUM(ISNULL(cm.v_Origen,'DESCONOCIDO'))) END AS IdDetalle,
                   CASE WHEN cm.v_TipoMovimiento = 'I' THEN ISNULL(fp.v_Value1, 'SIN FORMA PAGO')
                        ELSE ISNULL(cm.v_Origen, 'DESCONOCIDO') END AS NombreDetalle,
                   ISNULL(cm.d_Total,0)                     AS Monto
              FROM dbo.cajamayor_movimiento cm WITH (NOLOCK)
              JOIN Cierres c ON c.i_IdCajaMayorCierre = cm.i_IdCajaMayorCierre
              JOIN dbo.tipocaja tc WITH (NOLOCK) ON tc.i_IdTipoCaja = cm.i_IdTipoCaja
         LEFT JOIN dbo.datahierarchy fp WITH (NOLOCK) ON fp.i_GroupId = 46 AND fp.i_ItemId = cm.i_IdFormaPago
             WHERE cm.v_TipoMovimiento IN ('I','E')
               AND (@TipoMovimiento IS NULL OR cm.v_TipoMovimiento = @TipoMovimiento)
               AND EXISTS (SELECT 1 FROM @FiltroTipoCaja f WHERE f.Id = cm.i_IdTipoCaja)
        )
        /* Resultado: por tipo caja, clasificador y tipo movimiento; columnas Ene..Dic y Total */
        SELECT 
               IdTipoCaja,
               NombreTipoCaja,
               TipoMovimiento,
               DetalleTipo,
               IdDetalle,
               NombreDetalle,
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 1  THEN MovimientosDet.Monto ELSE 0 END),0)  AS Ene,
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 2  THEN MovimientosDet.Monto ELSE 0 END),0)  AS Feb,
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 3  THEN MovimientosDet.Monto ELSE 0 END),0)  AS Mar,
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 4  THEN MovimientosDet.Monto ELSE 0 END),0)  AS Abr,
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 5  THEN MovimientosDet.Monto ELSE 0 END),0)  AS May,
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 6  THEN MovimientosDet.Monto ELSE 0 END),0)  AS Jun,
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 7  THEN MovimientosDet.Monto ELSE 0 END),0)  AS Jul,
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 8  THEN MovimientosDet.Monto ELSE 0 END),0)  AS Ago,
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 9  THEN MovimientosDet.Monto ELSE 0 END),0)  AS [Set],
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 10 THEN MovimientosDet.Monto ELSE 0 END),0)  AS Oct,
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 11 THEN MovimientosDet.Monto ELSE 0 END),0)  AS Nov,
               ISNULL(SUM(CASE WHEN MovimientosDet.Mes = 12 THEN MovimientosDet.Monto ELSE 0 END),0)  AS Dic,
               ISNULL(SUM(MovimientosDet.Monto),0) AS Total
          FROM MovimientosDet
         GROUP BY IdTipoCaja, NombreTipoCaja, TipoMovimiento, DetalleTipo, IdDetalle, NombreDetalle
         ORDER BY NombreTipoCaja, TipoMovimiento, DetalleTipo, NombreDetalle;

    END TRY
    BEGIN CATCH
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSev INT = ERROR_SEVERITY();
        DECLARE @ErrSta INT = ERROR_STATE();
        RAISERROR(@ErrMsg, @ErrSev, @ErrSta);
    END CATCH
END

GO
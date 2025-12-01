CREATE OR ALTER PROCEDURE [dbo].[sp_RegistroCompras_List]
    @Periodo INT = NULL,
    @FechaInicial DATE = NULL,
    @FechaFinal DATE = NULL,
    @TipoComprobante NVARCHAR(2) = NULL,
    @IdProveedor INT = NULL,
    @IdTipoCaja INT = NULL,
    @Estado NVARCHAR(1) = NULL,
    @Page INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    IF OBJECT_ID('tempdb..#filtered') IS NOT NULL DROP TABLE #filtered;

    SELECT
        rc.id_registro_compra AS IdRegistroCompra,
        CAST(rc.periodo AS INT) AS Periodo,
        rc.fecha_emision AS FechaEmision,
        rc.fecha_vencimiento AS FechaVencimiento,
        cm.i_IdTipoCaja AS IdTipoCaja,
        tc.v_NombreTipoCaja AS TipoCajaName,
        COALESCE(sp_tc.v_Value1, rc.tipo_comprobante) AS TipoComprobanteName,
        rc.serie AS Serie,
        rc.numero AS Numero,
        rc.razon_social_proveedor AS RazonSocialProveedor,
        rc.base_imponible AS BaseImponible,
        rc.igv AS IGV,
        rc.importe_total AS ImporteTotal,
        COALESCE(sp_fe.v_Value1, CAST(rc.id_familia_egreso AS NVARCHAR(50))) AS IdFamiliaEgresoName,
        rc.estado AS Estado,
        CASE WHEN rc.estado = '1' THEN 'Pagado' WHEN rc.estado = '0' THEN 'Por Pagar' ELSE rc.estado END AS EstadoName
    INTO #filtered
    FROM registro_compras rc
    INNER JOIN cajamayor_movimiento cm ON cm.i_IdMovimiento = rc.id_movimiento_egreso
    INNER JOIN tipocaja tc ON tc.i_IdTipoCaja = cm.i_IdTipoCaja
    LEFT JOIN systemparameter sp_tc ON sp_tc.i_GroupId = 153 AND sp_tc.v_Value2 =  rc.tipo_comprobante
    LEFT JOIN systemparameter sp_fe ON sp_fe.i_GroupId = 152 AND sp_fe.i_ParameterId = rc.id_familia_egreso
    WHERE (@Periodo IS NULL OR CAST(rc.periodo AS INT) = @Periodo)
      AND (@FechaInicial IS NULL OR rc.fecha_emision >= @FechaInicial)
      AND (@FechaFinal IS NULL OR rc.fecha_emision <= @FechaFinal)
      AND (@TipoComprobante IS NULL OR rc.tipo_comprobante = @TipoComprobante)
      AND (@IdProveedor IS NULL OR rc.id_proveedor = @IdProveedor)
      AND (@IdTipoCaja IS NULL OR cm.i_IdTipoCaja = @IdTipoCaja)
      AND (@Estado IS NULL OR rc.estado = @Estado);

    SELECT *
    FROM #filtered
    ORDER BY FechaEmision DESC, IdRegistroCompra DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(1) AS TotalRows FROM #filtered;
END
GO

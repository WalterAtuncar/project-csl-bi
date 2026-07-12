-- =====================================================================
-- FASE 7 - Indicadores para el checklist E2E (por pagar / por cobrar). SQL 2012.
--   PorPagar : egresos en estado POR_PAGAR devengados hasta fin de mes (deuda).
--   PorCobrar: ventas al CREDITO facturadas menos lo cobrado, hasta fin de mes.
-- =====================================================================

IF OBJECT_ID('conta.sp_Caja_Indicadores','P') IS NOT NULL DROP PROCEDURE conta.sp_Caja_Indicadores;
GO
CREATE PROCEDURE conta.sp_Caja_Indicadores @Anio SMALLINT, @Mes TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @fin DATE = DATEADD(MONTH,1,DATEFROMPARTS(@Anio,@Mes,1));

    -- Deuda: egresos por pagar cuya fecha de documento es anterior al fin de mes
    DECLARE @porPagar DECIMAL(18,2) = ISNULL((
        SELECT SUM(d_MontoBruto * d_TipoCambio) FROM conta.egreso
        WHERE v_Estado = 'POR_PAGAR' AND t_FechaDocumento < @fin), 0);

    -- Ventas al credito facturadas hasta fin de mes (bruto, mismos filtros del cierre)
    DECLARE @creditoBruto DECIMAL(18,2) = ISNULL((
        SELECT SUM(vd.d_PrecioVenta)
        FROM dbo.venta v
        JOIN dbo.ventadetalle vd ON vd.v_IdVenta=v.v_IdVenta AND ISNULL(vd.i_Eliminado,0)=0
        JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId=41 AND dh41.i_ItemId=v.i_IdCondicionPago AND dh41.v_Value1='CREDITO'
        WHERE ISNULL(v.i_Eliminado,0)=0 AND v.t_InsertaFecha < @fin
          AND v.i_ClienteEsAgente IS NOT NULL
          AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3,4))
          AND ISNULL(v.v_SerieDocumento,'') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')), 0);

    -- Cobrado de esas ventas al credito hasta fin de mes
    DECLARE @cobradoCredito DECIMAL(18,2) = ISNULL((
        SELECT SUM(cd.d_ImporteSoles)
        FROM dbo.cobranzadetalle cd
        JOIN dbo.venta v ON v.v_IdVenta=cd.v_IdVenta AND ISNULL(v.i_Eliminado,0)=0
        JOIN dbo.datahierarchy dh41 ON dh41.i_GroupId=41 AND dh41.i_ItemId=v.i_IdCondicionPago AND dh41.v_Value1='CREDITO'
        WHERE ISNULL(cd.i_Eliminado,0)=0 AND cd.t_InsertaFecha < @fin), 0);

    DECLARE @porCobrar DECIMAL(18,2) = @creditoBruto - @cobradoCredito;
    IF @porCobrar < 0 SET @porCobrar = 0;

    SELECT @porPagar AS PorPagar, @porCobrar AS PorCobrar,
           @creditoBruto AS CreditoFacturado, @cobradoCredito AS CreditoCobrado;
END
GO

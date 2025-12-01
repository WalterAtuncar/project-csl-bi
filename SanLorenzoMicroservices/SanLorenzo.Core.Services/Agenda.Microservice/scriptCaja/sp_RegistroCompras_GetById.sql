CREATE OR ALTER PROCEDURE [dbo].[sp_RegistroCompras_GetById]
    @IdRegistroCompra INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        rc.id_registro_compra AS IdRegistroCompra,
        rc.id_movimiento_egreso AS IdMovimientoEgreso,
        rc.id_proveedor AS IdProveedor,
        rc.ruc_proveedor AS RucProveedor,
        rc.razon_social_proveedor AS RazonSocialProveedor,
        rc.fecha_emision AS FechaEmision,
        rc.fecha_vencimiento AS FechaVencimiento,
        rc.tipo_comprobante AS TipoComprobante,
        rc.serie AS Serie,
        rc.numero AS Numero,
        rc.base_imponible AS BaseImponible,
        rc.igv AS IGV,
        rc.isc AS ISC,
        rc.otros_tributos AS OtrosTributos,
        rc.valor_no_gravado AS ValorNoGravado,
        rc.importe_total AS ImporteTotal,
        rc.codigo_moneda AS CodigoMoneda,
        rc.tipo_cambio AS TipoCambio,
        rc.aplica_detraccion AS AplicaDetraccion,
        rc.porcentaje_detraccion AS PorcentajeDetraccion,
        rc.monto_detraccion AS MontoDetraccion,
        rc.numero_constancia_detraccion AS NumeroConstanciaDetraccion,
        rc.aplica_retencion AS AplicaRetencion,
        rc.monto_retencion AS MontoRetencion,
        rc.observaciones AS Observaciones,
        rc.id_familia_egreso AS IdFamiliaEgreso,
        rc.id_tipo_egreso AS IdTipoEgreso,
        rc.estado AS Estado,
        rc.i_InsertalUsuario AS InsertaIdUsuario,
        rc.i_InsertDate AS InsertaFecha
    FROM registro_compras rc
    WHERE rc.id_registro_compra = @IdRegistroCompra;
END
GO


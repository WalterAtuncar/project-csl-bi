-- =============================================
-- Author:      Sistema
-- Create date: 2025
-- Description: Inserta un registro de compras SUNAT (Formato 8.1)
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_RegistroCompras_Insert]
    @IdMovimientoEgreso INT,
    @IdProveedor INT,
    @RucProveedor NVARCHAR(15),
    @RazonSocialProveedor NVARCHAR(200),
    @FechaEmision DATE,
    @FechaVencimiento DATE = NULL,
    @TipoComprobante NVARCHAR(2),
    @Serie NVARCHAR(20),
    @Numero NVARCHAR(20),
    @BaseImponible DECIMAL(12,2) = 0,
    @IGV DECIMAL(12,2) = 0,
    @ISC DECIMAL(12,2) = 0,
    @OtrosTributos DECIMAL(12,2) = 0,
    @ValorNoGravado DECIMAL(12,2) = 0,
    @ImporteTotal DECIMAL(12,2),
    @CodigoMoneda NVARCHAR(3) = 'PEN',
    @TipoCambio DECIMAL(10,3) = 1.000,
    @AplicaDetraccion BIT = 0,
    @PorcentajeDetraccion DECIMAL(5,2) = NULL,
    @MontoDetraccion DECIMAL(12,2) = NULL,
    @NumeroConstanciaDetraccion NVARCHAR(30) = NULL,
    @AplicaRetencion BIT = 0,
    @MontoRetencion DECIMAL(12,2) = NULL,
    @Observaciones NVARCHAR(500) = NULL,
    @InsertaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdRegistroCompra INT;
    DECLARE @Now DATETIME = GETDATE();
    DECLARE @Periodo NVARCHAR(8);

    -- Calcular período YYYYMM00
    SET @Periodo = CONVERT(NVARCHAR(4), YEAR(@FechaEmision)) + 
                   RIGHT('0' + CONVERT(NVARCHAR(2), MONTH(@FechaEmision)), 2) + '00';

    -- Insertar registro de compras
    INSERT INTO registro_compras (
        id_movimiento_egreso,
        periodo,
        fecha_emision,
        fecha_vencimiento,
        tipo_comprobante,
        serie,
        numero,
        id_proveedor,
        ruc_proveedor,
        razon_social_proveedor,
        base_imponible,
        igv,
        isc,
        otros_tributos,
        valor_no_gravado,
        importe_total,
        codigo_moneda,
        tipo_cambio,
        aplica_detraccion,
        porcentaje_detraccion,
        monto_detraccion,
        numero_constancia_detraccion,
        aplica_retencion,
        monto_retencion,
        observaciones,
        estado,
        inserta_id_usuario,
        inserta_fecha
    )
    VALUES (
        @IdMovimientoEgreso,
        @Periodo,
        @FechaEmision,
        @FechaVencimiento,
        @TipoComprobante,
        @Serie,
        @Numero,
        @IdProveedor,
        @RucProveedor,
        @RazonSocialProveedor,
        @BaseImponible,
        @IGV,
        @ISC,
        @OtrosTributos,
        @ValorNoGravado,
        @ImporteTotal,
        @CodigoMoneda,
        @TipoCambio,
        @AplicaDetraccion,
        @PorcentajeDetraccion,
        @MontoDetraccion,
        @NumeroConstanciaDetraccion,
        @AplicaRetencion,
        @MontoRetencion,
        @Observaciones,
        '1', -- Estado: Anotado correctamente
        @InsertaIdUsuario,
        @Now
    );

    SET @IdRegistroCompra = SCOPE_IDENTITY();

    -- Retornar el registro insertado
    SELECT
        id_registro_compra AS IdRegistroCompra,
        id_movimiento_egreso AS IdMovimientoEgreso,
        id_proveedor AS IdProveedor,
        ruc_proveedor AS RucProveedor,
        razon_social_proveedor AS RazonSocialProveedor,
        fecha_emision AS FechaEmision,
        fecha_vencimiento AS FechaVencimiento,
        tipo_comprobante AS TipoComprobante,
        serie AS Serie,
        numero AS Numero,
        base_imponible AS BaseImponible,
        igv AS IGV,
        isc AS ISC,
        otros_tributos AS OtrosTributos,
        valor_no_gravado AS ValorNoGravado,
        importe_total AS ImporteTotal,
        codigo_moneda AS CodigoMoneda,
        tipo_cambio AS TipoCambio,
        aplica_detraccion AS AplicaDetraccion,
        porcentaje_detraccion AS PorcentajeDetraccion,
        monto_detraccion AS MontoDetraccion,
        numero_constancia_detraccion AS NumeroConstanciaDetraccion,
        aplica_retencion AS AplicaRetencion,
        monto_retencion AS MontoRetencion,
        observaciones AS Observaciones,
        estado AS Estado,
        inserta_id_usuario AS InsertaIdUsuario,
        inserta_fecha AS InsertaFecha
    FROM registro_compras
    WHERE id_registro_compra = @IdRegistroCompra;
END;
GO

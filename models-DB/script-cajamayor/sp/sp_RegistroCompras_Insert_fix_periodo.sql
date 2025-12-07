-- Ajuste del período: usar formato YYYYMM (sin sufijo '00')
-- Propuesta con bloque de prueba por defecto (ROLLBACK). El usuario decidirá COMMIT.

CREATE OR ALTER PROCEDURE [dbo].[sp_RegistroCompras_Insert]
    @IdMovimientoEgreso INT,
    @IdProveedor INT,
    @RucProveedor NVARCHAR(15),
    @RazonSocialProveedor NVARCHAR(200),
    @FechaEmision DATE,
    @FechaVencimiento DATE = NULL,
    @TipoComprobante NVARCHAR(2),
    @Serie NVARCHAR(20) = NULL,
    @Numero NVARCHAR(20) = NULL,
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
    @IdFamiliaEgreso INT = NULL,
    @IdTipoEgreso INT = NULL,
    @InsertaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdRegistroCompra INT;
    DECLARE @Now DATETIME = GETDATE();
    DECLARE @Periodo NVARCHAR(8);
    DECLARE @Estado NVARCHAR(1);

    -- Período: YYYYMM
    SET @Periodo = CONVERT(NVARCHAR(4), YEAR(@FechaEmision)) + RIGHT('0' + CONVERT(NVARCHAR(2), MONTH(@FechaEmision)), 2);

    -- Estado por fecha de vencimiento
    SET @Estado = CASE WHEN @FechaVencimiento IS NULL OR @FechaVencimiento <= CAST(@Now AS DATE) THEN '1' ELSE '0' END;

    INSERT INTO registro_compras (
        id_movimiento_egreso, periodo, fecha_emision, fecha_vencimiento,
        tipo_comprobante, serie, numero, id_proveedor, ruc_proveedor, razon_social_proveedor,
        base_imponible, igv, isc, otros_tributos, valor_no_gravado, importe_total,
        codigo_moneda, tipo_cambio, aplica_detraccion, porcentaje_detraccion, monto_detraccion,
        numero_constancia_detraccion, aplica_retencion, monto_retencion, observaciones,
        id_familia_egreso, id_tipo_egreso, estado, inserta_id_usuario, inserta_fecha
    )
    VALUES (
        @IdMovimientoEgreso, @Periodo, @FechaEmision, @FechaVencimiento,
        @TipoComprobante, @Serie, @Numero, @IdProveedor, @RucProveedor, @RazonSocialProveedor,
        @BaseImponible, @IGV, @ISC, @OtrosTributos, @ValorNoGravado, @ImporteTotal,
        @CodigoMoneda, @TipoCambio, @AplicaDetraccion, @PorcentajeDetraccion, @MontoDetraccion,
        @NumeroConstanciaDetraccion, @AplicaRetencion, @MontoRetencion, @Observaciones,
        @IdFamiliaEgreso, @IdTipoEgreso, @Estado, @InsertaIdUsuario, @Now
    );

    SET @IdRegistroCompra = SCOPE_IDENTITY();

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
        id_familia_egreso AS IdFamiliaEgreso,
        id_tipo_egreso AS IdTipoEgreso,
        estado AS Estado,
        inserta_id_usuario AS InsertaIdUsuario,
        inserta_fecha AS InsertaFecha
    FROM registro_compras
    WHERE id_registro_compra = @IdRegistroCompra;
END;
GO

-- Corrección opcional de datos ya insertados con sufijo '00'
BEGIN TRAN
UPDATE rc
   SET rc.periodo = LEFT(rc.periodo, 6)
  FROM dbo.registro_compras rc
 WHERE LEN(rc.periodo) = 8 AND RIGHT(rc.periodo, 2) = '00';
-- REVISAR los registros afectados y luego decidir
SELECT TOP 20 id_registro_compra, periodo FROM dbo.registro_compras ORDER BY id_registro_compra DESC;
ROLLBACK TRAN

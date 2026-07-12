-- =====================================================================
-- FASE 6 - Clasificacion contable de compras y generacion del egreso espejo. SQL 2012.
-- =====================================================================

IF OBJECT_ID('conta.sp_Compra_Clasificar','P') IS NOT NULL DROP PROCEDURE conta.sp_Compra_Clasificar;
GO
CREATE PROCEDURE conta.sp_Compra_Clasificar
    @IdCompra INT, @IdCentroCosto INT, @IdTipoGasto INT, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.registro_compras WHERE id_registro_compra = @IdCompra)
    BEGIN RAISERROR('La compra no existe en el registro de compras.', 16, 1); RETURN; END

    IF EXISTS (SELECT 1 FROM conta.compra_ext WHERE i_IdCompra = @IdCompra AND i_IdEgreso IS NOT NULL)
    BEGIN RAISERROR('La compra ya fue clasificada (egreso espejo ya existe).', 16, 1); RETURN; END

    DECLARE @fecha DATE, @tipoDoc NVARCHAR(30), @serie NVARCHAR(50), @numero NVARCHAR(50),
            @idProv INT, @base DECIMAL(18,2), @igv DECIMAL(18,2), @total DECIMAL(18,2),
            @moneda CHAR(3), @tc DECIMAL(9,4), @venc DATE;
    SELECT @fecha=fecha_emision, @tipoDoc=LEFT(ISNULL(tipo_comprobante,'FACTURA'),30),
           @serie=serie, @numero=numero, @idProv=id_proveedor,
           @base=base_imponible, @igv=ISNULL(igv,0), @total=importe_total,
           @moneda=LEFT(ISNULL(codigo_moneda,'PEN'),3), @tc=ISNULL(tipo_cambio,1), @venc=fecha_vencimiento
    FROM dbo.registro_compras WHERE id_registro_compra = @IdCompra;

    DECLARE @serieNum NVARCHAR(50) = LEFT(LTRIM(RTRIM(ISNULL(@serie,'') + '-' + ISNULL(@numero,''))),50);
    DECLARE @condicion NVARCHAR(20) = CASE WHEN @venc IS NOT NULL AND @venc > @fecha THEN 'CREDITO' ELSE 'CONTADO' END;
    DECLARE @glosa NVARCHAR(300) = CONCAT('Compra clasificada #', @IdCompra);

    BEGIN TRAN;
        DECLARE @out TABLE (i_IdEgreso INT);
        INSERT INTO @out
        EXEC conta.sp_Egreso_Insert
             @IdProveedor=@idProv, @FechaDocumento=@fecha, @TipoDocumento=@tipoDoc, @SerieNumero=@serieNum,
             @IdCentroCosto=@IdCentroCosto, @IdTipoGasto=@IdTipoGasto, @Condicion=@condicion,
             @Moneda=@moneda, @TipoCambio=@tc, @MontoBruto=@total, @IGV=@igv, @Glosa=@glosa,
             @IdCompra=@IdCompra, @IdUsuario=@IdUsuario;
        DECLARE @idEgreso INT = (SELECT TOP 1 i_IdEgreso FROM @out);

        IF EXISTS (SELECT 1 FROM conta.compra_ext WHERE i_IdCompra = @IdCompra)
            UPDATE conta.compra_ext SET i_IdCentroCosto=@IdCentroCosto, i_IdTipoGasto=@IdTipoGasto,
                   i_IdEgreso=@idEgreso, i_ActualizaIdUsuario=@IdUsuario, t_ActualizaFecha=GETDATE()
            WHERE i_IdCompra=@IdCompra;
        ELSE
            INSERT INTO conta.compra_ext (i_IdCompra, i_IdCentroCosto, i_IdTipoGasto, i_IdEgreso, i_InsertaIdUsuario)
            VALUES (@IdCompra, @IdCentroCosto, @IdTipoGasto, @idEgreso, @IdUsuario);
    COMMIT TRAN;

    EXEC conta.sp_Auditoria_Insert 'conta.compra_ext', @IdCompra, 'CLASIFICAR', @glosa, @IdUsuario;
    SELECT @idEgreso AS i_IdEgreso;
END
GO

IF OBJECT_ID('conta.sp_Compra_List','P') IS NOT NULL DROP PROCEDURE conta.sp_Compra_List;
GO
CREATE PROCEDURE conta.sp_Compra_List
    @Periodo NVARCHAR(16) = NULL, @SoloSinClasificar BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT rc.id_registro_compra AS i_IdCompra, rc.periodo, rc.fecha_emision, rc.tipo_comprobante,
           LTRIM(RTRIM(ISNULL(rc.serie,'') + '-' + ISNULL(rc.numero,''))) AS Documento,
           rc.razon_social_proveedor AS Proveedor, rc.ruc_proveedor AS Ruc,
           rc.base_imponible, rc.igv, rc.importe_total, rc.codigo_moneda, rc.estado,
           ce.i_IdCentroCosto, cc.v_Nombre AS CentroCosto,
           ce.i_IdTipoGasto, tg.v_Nombre AS TipoGasto, ce.i_IdEgreso,
           CAST(CASE WHEN ce.i_IdEgreso IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS Clasificada
    FROM dbo.registro_compras rc
    LEFT JOIN conta.compra_ext ce ON ce.i_IdCompra = rc.id_registro_compra
    LEFT JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = ce.i_IdCentroCosto
    LEFT JOIN conta.tipo_gasto tg ON tg.i_IdTipoGasto = ce.i_IdTipoGasto
    WHERE (@Periodo IS NULL OR rc.periodo = @Periodo)
      AND (@SoloSinClasificar = 0 OR ce.i_IdEgreso IS NULL)
    ORDER BY rc.fecha_emision DESC, rc.id_registro_compra DESC;
END
GO

IF OBJECT_ID('conta.sp_Compra_GetClasificacion','P') IS NOT NULL DROP PROCEDURE conta.sp_Compra_GetClasificacion;
GO
CREATE PROCEDURE conta.sp_Compra_GetClasificacion @IdCompra INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ce.i_IdCompra, ce.i_IdCentroCosto, cc.v_Nombre AS CentroCosto,
           ce.i_IdTipoGasto, tg.v_Nombre AS TipoGasto, ce.i_IdEgreso
    FROM conta.compra_ext ce
    LEFT JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = ce.i_IdCentroCosto
    LEFT JOIN conta.tipo_gasto tg ON tg.i_IdTipoGasto = ce.i_IdTipoGasto
    WHERE ce.i_IdCompra = @IdCompra;
END
GO

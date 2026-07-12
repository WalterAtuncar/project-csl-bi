-- =====================================================================
-- FASE 2 - SPs de egresos (maquina de estados) y costos de personal. SQL 2012.
-- =====================================================================

IF OBJECT_ID('conta.sp_Egreso_Insert','P') IS NOT NULL DROP PROCEDURE conta.sp_Egreso_Insert;
GO
CREATE PROCEDURE conta.sp_Egreso_Insert
    @IdProveedor INT = NULL, @IdEntidad INT = NULL, @FechaDocumento DATE, @TipoDocumento NVARCHAR(30),
    @SerieNumero NVARCHAR(50) = NULL, @IdCentroCosto INT, @IdTipoGasto INT, @Condicion NVARCHAR(20) = 'CONTADO',
    @Moneda CHAR(3) = 'PEN', @TipoCambio DECIMAL(9,4) = 1, @MontoBruto DECIMAL(18,2), @IGV DECIMAL(18,2) = 0,
    @Glosa NVARCHAR(300) = NULL, @IdCompra INT = NULL, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    IF @IdProveedor IS NULL AND @IdEntidad IS NULL
    BEGIN RAISERROR('Debe indicar proveedor o entidad.', 16, 1); RETURN; END
    DECLARE @neto DECIMAL(18,2) = @MontoBruto - @IGV;
    DECLARE @id INT;
    INSERT INTO conta.egreso (i_IdProveedor, i_IdEntidad, t_FechaDocumento, v_TipoDocumento, v_SerieNumero,
        i_IdCentroCosto, i_IdTipoGasto, v_Condicion, v_Moneda, d_TipoCambio, d_MontoBruto, d_IGV, d_MontoNeto,
        v_Estado, v_Glosa, i_IdCompra, i_InsertaIdUsuario)
    VALUES (@IdProveedor, @IdEntidad, @FechaDocumento, @TipoDocumento, @SerieNumero,
        @IdCentroCosto, @IdTipoGasto, @Condicion, @Moneda, @TipoCambio, @MontoBruto, @IGV, @neto,
        'POR_PAGAR', @Glosa, @IdCompra, @IdUsuario);
    SET @id = SCOPE_IDENTITY();
    EXEC conta.sp_Auditoria_Insert 'conta.egreso', @id, 'INSERT', @TipoDocumento, @IdUsuario;
    SELECT @id AS i_IdEgreso;
END
GO

IF OBJECT_ID('conta.sp_Egreso_Update','P') IS NOT NULL DROP PROCEDURE conta.sp_Egreso_Update;
GO
CREATE PROCEDURE conta.sp_Egreso_Update
    @IdEgreso INT, @IdProveedor INT = NULL, @IdEntidad INT = NULL, @FechaDocumento DATE, @TipoDocumento NVARCHAR(30),
    @SerieNumero NVARCHAR(50) = NULL, @IdCentroCosto INT, @IdTipoGasto INT, @Condicion NVARCHAR(20),
    @Moneda CHAR(3), @TipoCambio DECIMAL(9,4), @MontoBruto DECIMAL(18,2), @IGV DECIMAL(18,2),
    @Glosa NVARCHAR(300) = NULL, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM conta.egreso WHERE i_IdEgreso = @IdEgreso AND v_Estado = 'POR_PAGAR')
    BEGIN RAISERROR('Solo se pueden editar egresos en estado POR_PAGAR.', 16, 1); RETURN; END
    UPDATE conta.egreso
    SET i_IdProveedor = @IdProveedor, i_IdEntidad = @IdEntidad, t_FechaDocumento = @FechaDocumento,
        v_TipoDocumento = @TipoDocumento, v_SerieNumero = @SerieNumero, i_IdCentroCosto = @IdCentroCosto,
        i_IdTipoGasto = @IdTipoGasto, v_Condicion = @Condicion, v_Moneda = @Moneda, d_TipoCambio = @TipoCambio,
        d_MontoBruto = @MontoBruto, d_IGV = @IGV, d_MontoNeto = @MontoBruto - @IGV, v_Glosa = @Glosa,
        i_ActualizaIdUsuario = @IdUsuario, t_ActualizaFecha = GETDATE()
    WHERE i_IdEgreso = @IdEgreso;
    EXEC conta.sp_Auditoria_Insert 'conta.egreso', @IdEgreso, 'UPDATE', @TipoDocumento, @IdUsuario;
    SELECT @IdEgreso AS i_IdEgreso;
END
GO

IF OBJECT_ID('conta.sp_Egreso_Pagar','P') IS NOT NULL DROP PROCEDURE conta.sp_Egreso_Pagar;
GO
CREATE PROCEDURE conta.sp_Egreso_Pagar
    @IdEgreso INT, @FechaPago DATE, @IdFormaPago INT = NULL, @IdCuentaBancaria INT = NULL, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM conta.egreso WHERE i_IdEgreso = @IdEgreso AND v_Estado = 'POR_PAGAR')
    BEGIN RAISERROR('El egreso no esta en estado POR_PAGAR.', 16, 1); RETURN; END
    UPDATE conta.egreso
    SET v_Estado = 'PAGADO', t_FechaPago = @FechaPago, i_IdFormaPago = @IdFormaPago,
        i_IdCuentaBancaria = @IdCuentaBancaria, i_ActualizaIdUsuario = @IdUsuario, t_ActualizaFecha = GETDATE()
    WHERE i_IdEgreso = @IdEgreso;
    DECLARE @det NVARCHAR(100) = CONCAT('Pagado ', CONVERT(varchar,@FechaPago,23));
    EXEC conta.sp_Auditoria_Insert 'conta.egreso', @IdEgreso, 'PAGAR', @det, @IdUsuario;
    SELECT @IdEgreso AS i_IdEgreso;
END
GO

IF OBJECT_ID('conta.sp_Egreso_Anular','P') IS NOT NULL DROP PROCEDURE conta.sp_Egreso_Anular;
GO
CREATE PROCEDURE conta.sp_Egreso_Anular
    @IdEgreso INT, @Motivo NVARCHAR(200) = NULL, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.egreso
    SET v_Estado = 'ANULADO', i_ActualizaIdUsuario = @IdUsuario, t_ActualizaFecha = GETDATE()
    WHERE i_IdEgreso = @IdEgreso AND v_Estado <> 'ANULADO';
    EXEC conta.sp_Auditoria_Insert 'conta.egreso', @IdEgreso, 'ANULAR', @Motivo, @IdUsuario;
    SELECT @IdEgreso AS i_IdEgreso;
END
GO

IF OBJECT_ID('conta.sp_Egreso_Get','P') IS NOT NULL DROP PROCEDURE conta.sp_Egreso_Get;
GO
CREATE PROCEDURE conta.sp_Egreso_Get @IdEgreso INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT e.*, COALESCE(p.razon_social, ent.v_Nombre) AS Receptor,
           cc.v_Nombre AS CentroCosto, tg.v_Nombre AS TipoGasto
    FROM conta.egreso e
    LEFT JOIN dbo.proveedores p ON p.id_proveedor = e.i_IdProveedor
    LEFT JOIN conta.entidad ent ON ent.i_IdEntidad = e.i_IdEntidad
    LEFT JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = e.i_IdCentroCosto
    LEFT JOIN conta.tipo_gasto tg ON tg.i_IdTipoGasto = e.i_IdTipoGasto
    WHERE e.i_IdEgreso = @IdEgreso;
END
GO

IF OBJECT_ID('conta.sp_Egreso_List','P') IS NOT NULL DROP PROCEDURE conta.sp_Egreso_List;
GO
CREATE PROCEDURE conta.sp_Egreso_List
    @FechaDocDesde DATE = NULL, @FechaDocHasta DATE = NULL,
    @FechaPagoDesde DATE = NULL, @FechaPagoHasta DATE = NULL,
    @Estado NVARCHAR(15) = NULL, @IdCentroCosto INT = NULL, @IdTipoGasto INT = NULL,
    @IdProveedor INT = NULL, @Page INT = 1, @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @off INT = (@Page - 1) * @PageSize;
    SELECT e.i_IdEgreso, e.t_FechaDocumento, e.v_TipoDocumento, e.v_SerieNumero,
           COALESCE(p.razon_social, ent.v_Nombre) AS Receptor,
           cc.v_Nombre AS CentroCosto, cc.i_IdTipoCaja,
           tg.v_Nombre AS TipoGasto, tgraiz.v_SeccionFlujo AS Seccion,
           e.v_Condicion, e.v_Moneda, e.d_TipoCambio, e.d_MontoBruto, e.d_IGV, e.d_MontoNeto,
           e.v_Estado, e.t_FechaPago, e.i_IdFormaPago, e.v_Glosa,
           COUNT(*) OVER() AS TotalRows
    FROM conta.egreso e
    LEFT JOIN dbo.proveedores p ON p.id_proveedor = e.i_IdProveedor
    LEFT JOIN conta.entidad ent ON ent.i_IdEntidad = e.i_IdEntidad
    LEFT JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = e.i_IdCentroCosto
    LEFT JOIN conta.tipo_gasto tg ON tg.i_IdTipoGasto = e.i_IdTipoGasto
    LEFT JOIN conta.tipo_gasto tgraiz ON tgraiz.i_IdTipoGasto = ISNULL(tg.i_IdPadre, tg.i_IdTipoGasto)
    WHERE (@FechaDocDesde IS NULL OR e.t_FechaDocumento >= @FechaDocDesde)
      AND (@FechaDocHasta IS NULL OR e.t_FechaDocumento <= @FechaDocHasta)
      AND (@FechaPagoDesde IS NULL OR e.t_FechaPago >= @FechaPagoDesde)
      AND (@FechaPagoHasta IS NULL OR e.t_FechaPago <= @FechaPagoHasta)
      AND (@Estado IS NULL OR e.v_Estado = @Estado)
      AND (@IdCentroCosto IS NULL OR e.i_IdCentroCosto = @IdCentroCosto)
      AND (@IdTipoGasto IS NULL OR e.i_IdTipoGasto = @IdTipoGasto)
      AND (@IdProveedor IS NULL OR e.i_IdProveedor = @IdProveedor)
    ORDER BY e.t_FechaDocumento DESC, e.i_IdEgreso DESC
    OFFSET @off ROWS FETCH NEXT @PageSize ROWS ONLY;
END
GO

IF OBJECT_ID('conta.sp_Egreso_CargaMasiva','P') IS NOT NULL DROP PROCEDURE conta.sp_Egreso_CargaMasiva;
GO
CREATE PROCEDURE conta.sp_Egreso_CargaMasiva
    @Filas conta.tvp_egreso READONLY, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @w TABLE (
        fila INT IDENTITY(1,1), v_RucOEntidad NVARCHAR(200), t_FechaDocumento DATE,
        v_TipoDocumento NVARCHAR(30), v_SerieNumero NVARCHAR(50),
        v_CodCentroCosto NVARCHAR(20), v_CodTipoGasto NVARCHAR(20),
        v_Condicion NVARCHAR(20), v_Moneda CHAR(3), d_TipoCambio DECIMAL(9,4),
        d_MontoBruto DECIMAL(18,2), d_IGV DECIMAL(18,2), v_Glosa NVARCHAR(300),
        i_IdProveedor INT, i_IdEntidad INT, i_IdCentroCosto INT, i_IdTipoGasto INT, v_Error NVARCHAR(300)
    );
    INSERT INTO @w (v_RucOEntidad, t_FechaDocumento, v_TipoDocumento, v_SerieNumero,
        v_CodCentroCosto, v_CodTipoGasto, v_Condicion, v_Moneda, d_TipoCambio, d_MontoBruto, d_IGV, v_Glosa)
    SELECT v_RucOEntidad, t_FechaDocumento, ISNULL(v_TipoDocumento,'FACTURA'), v_SerieNumero,
        v_CodCentroCosto, v_CodTipoGasto, ISNULL(v_Condicion,'CONTADO'), ISNULL(v_Moneda,'PEN'),
        ISNULL(d_TipoCambio,1), d_MontoBruto, ISNULL(d_IGV,0), v_Glosa
    FROM @Filas;

    UPDATE w SET i_IdProveedor = p.id_proveedor FROM @w w JOIN dbo.proveedores p ON p.ruc = w.v_RucOEntidad;
    UPDATE w SET i_IdEntidad = e.i_IdEntidad FROM @w w JOIN conta.entidad e ON e.v_Nombre = w.v_RucOEntidad WHERE w.i_IdProveedor IS NULL;
    UPDATE w SET i_IdCentroCosto = cc.i_IdCentroCosto FROM @w w JOIN conta.centro_costo cc ON cc.v_Codigo = w.v_CodCentroCosto;
    UPDATE w SET i_IdTipoGasto = tg.i_IdTipoGasto FROM @w w JOIN conta.tipo_gasto tg ON tg.v_Codigo = w.v_CodTipoGasto;

    UPDATE @w SET v_Error =
        CASE
          WHEN t_FechaDocumento IS NULL THEN 'Fecha de documento requerida'
          WHEN i_IdProveedor IS NULL AND i_IdEntidad IS NULL THEN CONCAT('Proveedor/entidad no encontrado: ', ISNULL(v_RucOEntidad,''))
          WHEN i_IdCentroCosto IS NULL THEN CONCAT('Centro de costo no existe: ', ISNULL(v_CodCentroCosto,''))
          WHEN i_IdTipoGasto IS NULL THEN CONCAT('Tipo de gasto no existe: ', ISNULL(v_CodTipoGasto,''))
          WHEN d_MontoBruto IS NULL OR d_MontoBruto <= 0 THEN 'Monto bruto invalido'
          WHEN d_IGV > d_MontoBruto THEN 'IGV mayor que el bruto'
          ELSE NULL
        END;

    INSERT INTO conta.egreso (i_IdProveedor, i_IdEntidad, t_FechaDocumento, v_TipoDocumento, v_SerieNumero,
        i_IdCentroCosto, i_IdTipoGasto, v_Condicion, v_Moneda, d_TipoCambio, d_MontoBruto, d_IGV, d_MontoNeto,
        v_Estado, v_Glosa, i_InsertaIdUsuario)
    SELECT i_IdProveedor, i_IdEntidad, t_FechaDocumento, v_TipoDocumento, v_SerieNumero,
        i_IdCentroCosto, i_IdTipoGasto, v_Condicion, v_Moneda, d_TipoCambio, d_MontoBruto, d_IGV,
        d_MontoBruto - d_IGV, 'POR_PAGAR', v_Glosa, @IdUsuario
    FROM @w WHERE v_Error IS NULL;
    DECLARE @ins INT = @@ROWCOUNT;

    SELECT @ins AS insertadas, (SELECT COUNT(*) FROM @w WHERE v_Error IS NOT NULL) AS conError;
    SELECT fila, v_RucOEntidad, v_CodCentroCosto, v_CodTipoGasto, d_MontoBruto, v_Error
    FROM @w WHERE v_Error IS NOT NULL ORDER BY fila;
END
GO

-- ---------------- COSTOS DE PERSONAL ----------------
IF OBJECT_ID('conta.sp_CostoPersonal_Upsert','P') IS NOT NULL DROP PROCEDURE conta.sp_CostoPersonal_Upsert;
GO
CREATE PROCEDURE conta.sp_CostoPersonal_Upsert
    @Anio SMALLINT, @Mes TINYINT, @IdCentroCosto INT, @Concepto NVARCHAR(30), @Monto DECIMAL(18,2), @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM conta.costo_personal_mensual
               WHERE n_Anio=@Anio AND n_Mes=@Mes AND i_IdCentroCosto=@IdCentroCosto AND v_Concepto=@Concepto)
        UPDATE conta.costo_personal_mensual SET d_Monto=@Monto, i_ActualizaIdUsuario=@IdUsuario, t_ActualizaFecha=GETDATE()
        WHERE n_Anio=@Anio AND n_Mes=@Mes AND i_IdCentroCosto=@IdCentroCosto AND v_Concepto=@Concepto;
    ELSE
        INSERT INTO conta.costo_personal_mensual (n_Anio, n_Mes, i_IdCentroCosto, v_Concepto, d_Monto, i_InsertaIdUsuario)
        VALUES (@Anio, @Mes, @IdCentroCosto, @Concepto, @Monto, @IdUsuario);
    EXEC conta.sp_Auditoria_Insert 'conta.costo_personal_mensual', @IdCentroCosto, 'UPSERT', @Concepto, @IdUsuario;
    SELECT 1 AS ok;
END
GO

IF OBJECT_ID('conta.sp_CostoPersonal_List','P') IS NOT NULL DROP PROCEDURE conta.sp_CostoPersonal_List;
GO
CREATE PROCEDURE conta.sp_CostoPersonal_List @Anio SMALLINT, @Mes TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT cpm.i_Id, cpm.n_Anio, cpm.n_Mes, cpm.i_IdCentroCosto, cc.v_Nombre AS CentroCosto,
           cpm.v_Concepto, cpm.d_Monto, cpm.v_Estado, cpm.t_FechaPago
    FROM conta.costo_personal_mensual cpm
    JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = cpm.i_IdCentroCosto
    WHERE cpm.n_Anio = @Anio AND cpm.n_Mes = @Mes
    ORDER BY cc.v_Nombre, cpm.v_Concepto;
END
GO

IF OBJECT_ID('conta.sp_CostoPersonal_Pagar','P') IS NOT NULL DROP PROCEDURE conta.sp_CostoPersonal_Pagar;
GO
CREATE PROCEDURE conta.sp_CostoPersonal_Pagar
    @Anio SMALLINT, @Mes TINYINT, @IdCentroCosto INT = NULL, @FechaPago DATE, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.costo_personal_mensual
    SET v_Estado = 'PAGADO', t_FechaPago = @FechaPago, i_ActualizaIdUsuario = @IdUsuario, t_ActualizaFecha = GETDATE()
    WHERE n_Anio = @Anio AND n_Mes = @Mes AND v_Estado = 'POR_PAGAR'
      AND (@IdCentroCosto IS NULL OR i_IdCentroCosto = @IdCentroCosto);
    SELECT @@ROWCOUNT AS pagadas;
END
GO

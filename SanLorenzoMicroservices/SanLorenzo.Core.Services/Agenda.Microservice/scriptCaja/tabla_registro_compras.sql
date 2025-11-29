-- =============================================
-- Tabla: registro_compras
-- Descripción: Registro de Compras SUNAT Formato 8.1
-- =============================================

-- Verificar si la tabla existe antes de crearla
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='registro_compras' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[registro_compras] (
        [id_registro_compra] INT IDENTITY(1,1) PRIMARY KEY,
        [id_movimiento_egreso] INT NOT NULL,
        [periodo] NVARCHAR(8) NOT NULL,
        [fecha_emision] DATE NOT NULL,
        [fecha_vencimiento] DATE NULL,
        [tipo_comprobante] NVARCHAR(2) NOT NULL,
        [serie] NVARCHAR(20) NOT NULL,
        [numero] NVARCHAR(20) NOT NULL,
        [id_proveedor] INT NOT NULL,
        [ruc_proveedor] NVARCHAR(15) NOT NULL,
        [razon_social_proveedor] NVARCHAR(200) NOT NULL,
        [base_imponible] DECIMAL(12,2) NOT NULL DEFAULT 0,
        [igv] DECIMAL(12,2) NOT NULL DEFAULT 0,
        [isc] DECIMAL(12,2) NOT NULL DEFAULT 0,
        [otros_tributos] DECIMAL(12,2) NOT NULL DEFAULT 0,
        [valor_no_gravado] DECIMAL(12,2) NOT NULL DEFAULT 0,
        [importe_total] DECIMAL(12,2) NOT NULL,
        [codigo_moneda] NVARCHAR(3) NOT NULL DEFAULT 'PEN',
        [tipo_cambio] DECIMAL(10,3) NOT NULL DEFAULT 1.000,
        [aplica_detraccion] BIT NOT NULL DEFAULT 0,
        [porcentaje_detraccion] DECIMAL(5,2) NULL,
        [monto_detraccion] DECIMAL(12,2) NULL,
        [numero_constancia_detraccion] NVARCHAR(30) NULL,
        [aplica_retencion] BIT NOT NULL DEFAULT 0,
        [monto_retencion] DECIMAL(12,2) NULL,
        [observaciones] NVARCHAR(500) NULL,
        [estado] NVARCHAR(1) NOT NULL DEFAULT '1',
        [inserta_id_usuario] INT NOT NULL,
        [inserta_fecha] DATETIME NOT NULL DEFAULT GETDATE(),
        [actualiza_id_usuario] INT NULL,
        [actualiza_fecha] DATETIME NULL,

        CONSTRAINT [FK_registro_compras_proveedor] FOREIGN KEY ([id_proveedor]) 
            REFERENCES [dbo].[proveedores]([id_proveedor])
    );

    -- Índices para búsquedas frecuentes
    CREATE INDEX [IX_registro_compras_movimiento] ON [dbo].[registro_compras] ([id_movimiento_egreso]);
    CREATE INDEX [IX_registro_compras_periodo] ON [dbo].[registro_compras] ([periodo]);
    CREATE INDEX [IX_registro_compras_fecha_emision] ON [dbo].[registro_compras] ([fecha_emision]);
    CREATE INDEX [IX_registro_compras_proveedor] ON [dbo].[registro_compras] ([id_proveedor]);
    CREATE INDEX [IX_registro_compras_ruc] ON [dbo].[registro_compras] ([ruc_proveedor]);
    CREATE INDEX [IX_registro_compras_comprobante] ON [dbo].[registro_compras] ([tipo_comprobante], [serie], [numero]);

    PRINT 'Tabla registro_compras creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La tabla registro_compras ya existe.';
END
GO

-- =============================================
-- Tabla: proveedores
-- Descripción: Almacena proveedores para registro de compras SUNAT
-- =============================================

-- Verificar si la tabla existe antes de crearla
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='proveedores' AND xtype='U')
BEGIN
    CREATE TABLE [dbo].[proveedores] (
        [id_proveedor] INT IDENTITY(1,1) PRIMARY KEY,
        [ruc] NVARCHAR(15) NOT NULL UNIQUE,
        [razon_social] NVARCHAR(200) NOT NULL,
        [direccion] NVARCHAR(300) NULL,
        [email] NVARCHAR(100) NULL,
        [activo] BIT NOT NULL DEFAULT 1,
        [fecha_registro] DATETIME NOT NULL DEFAULT GETDATE(),
        
        CONSTRAINT [UQ_proveedores_ruc] UNIQUE ([ruc])
    );

    -- Índices
    CREATE INDEX [IX_proveedores_ruc] ON [dbo].[proveedores] ([ruc]);
    CREATE INDEX [IX_proveedores_razon_social] ON [dbo].[proveedores] ([razon_social]);
    CREATE INDEX [IX_proveedores_activo] ON [dbo].[proveedores] ([activo]);

    PRINT 'Tabla proveedores creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La tabla proveedores ya existe.';
END
GO

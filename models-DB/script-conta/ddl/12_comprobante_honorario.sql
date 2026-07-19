-- =====================================================================
-- FASE 1 (Honorarios) - Comprobante tributario del medico (1:1 con el pago).
-- Idempotente. SQL Server 2012.
--   * conta.comprobante_honorario  (metadata del comprobante: Factura '01' | Recibo por
--                                    Honorarios '02'; retencion/IGV/detraccion + neto a pagar)
-- Estilo "registro de compras": 1 pago de honorario <-> 1 comprobante (UNIQUE i_IdPago).
-- El emisor (medico) se referencia a dbo.proveedores (tabla creada por el BI -> FK entrante
-- permitida; NO se crea el proveedor aqui, solo se referencia). El RUC/razon se guardan tambien
-- denormalizados (congelan el historico independiente del catalogo de proveedores).
-- Las tablas de honorarios existentes (ddl/10) NO se tocan: DDL puramente ADITIVA.
-- =====================================================================

IF OBJECT_ID('conta.comprobante_honorario','U') IS NULL
CREATE TABLE conta.comprobante_honorario (
    i_Id                   INT IDENTITY(1,1) NOT NULL,
    i_IdPago               INT NOT NULL,                 -- FK conta.pago_honorario (1:1)
    v_TipoComprobante      NVARCHAR(4) NOT NULL,         -- '01'=Factura, '02'=Recibo por Honorarios
    i_IdProveedor          INT NULL,                     -- emisor (FK dbo.proveedores, tabla del BI)
    v_RucEmisor            NVARCHAR(15) NULL,            -- denormalizado (congelado)
    v_RazonSocialEmisor    NVARCHAR(200) NULL,           -- denormalizado (congelado)
    v_Serie                NVARCHAR(20) NULL,
    v_Numero               NVARCHAR(20) NULL,
    t_FechaEmision         DATE NOT NULL,
    t_FechaVencimiento     DATE NULL,
    v_Moneda               CHAR(3) NOT NULL CONSTRAINT DF_comprobante_hon_moneda DEFAULT 'PEN',
    d_TipoCambio           DECIMAL(9,4) NOT NULL CONSTRAINT DF_comprobante_hon_tc DEFAULT 1,
    d_ImporteTotal         DECIMAL(18,2) NOT NULL,       -- = d_TotalPago del pago (bruto del documento)
    d_BaseImponible        DECIMAL(18,2) NOT NULL CONSTRAINT DF_comprobante_hon_base DEFAULT 0,
    d_IGV                  DECIMAL(18,2) NOT NULL CONSTRAINT DF_comprobante_hon_igv DEFAULT 0,
    b_AplicaRetencion      BIT NOT NULL CONSTRAINT DF_comprobante_hon_aplret DEFAULT 0,
    d_MontoRetencion       DECIMAL(18,2) NOT NULL CONSTRAINT DF_comprobante_hon_ret DEFAULT 0,
    b_AplicaDetraccion     BIT NOT NULL CONSTRAINT DF_comprobante_hon_apldet DEFAULT 0,
    d_PorcDetraccion       DECIMAL(5,2) NULL,
    d_MontoDetraccion      DECIMAL(18,2) NOT NULL CONSTRAINT DF_comprobante_hon_det DEFAULT 0,
    v_ConstanciaDetraccion NVARCHAR(30) NULL,
    d_NetoPagar            DECIMAL(18,2) NOT NULL,       -- = importe - retencion - detraccion
    v_Observaciones        NVARCHAR(300) NULL,
    i_InsertaIdUsuario     INT NOT NULL,
    t_InsertaFecha         DATETIME NOT NULL CONSTRAINT DF_comprobante_hon_fecha DEFAULT GETDATE(),
    CONSTRAINT PK_comprobante_honorario PRIMARY KEY (i_Id),
    CONSTRAINT UQ_comprobante_hon_pago UNIQUE (i_IdPago),
    CONSTRAINT CK_comprobante_hon_tipo CHECK (v_TipoComprobante IN ('01','02')),
    CONSTRAINT FK_comprobante_hon_pago FOREIGN KEY (i_IdPago) REFERENCES conta.pago_honorario(i_IdPago),
    CONSTRAINT FK_comprobante_hon_prov FOREIGN KEY (i_IdProveedor) REFERENCES dbo.proveedores(id_proveedor)
);

-- =====================================================================
-- FASE 2 - Egresos (maquina de estados) y costos de personal. SQL Server 2012.
-- =====================================================================

IF OBJECT_ID('conta.egreso','U') IS NULL
CREATE TABLE conta.egreso (
    i_IdEgreso           INT IDENTITY(1,1) PRIMARY KEY,
    i_IdProveedor        INT NULL REFERENCES dbo.proveedores(id_proveedor),
    i_IdEntidad          INT NULL REFERENCES conta.entidad(i_IdEntidad),
    t_FechaDocumento     DATE NOT NULL,                 -- devengado (rentabilidad)
    v_TipoDocumento      NVARCHAR(30) NOT NULL,         -- FACTURA|RECIBO|PLANILLA|VOUCHER|OTRO
    v_SerieNumero        NVARCHAR(50) NULL,
    i_IdCentroCosto      INT NOT NULL REFERENCES conta.centro_costo(i_IdCentroCosto), -- Regla 3
    i_IdTipoGasto        INT NOT NULL REFERENCES conta.tipo_gasto(i_IdTipoGasto),
    v_Condicion          NVARCHAR(20) NOT NULL DEFAULT 'CONTADO',  -- CONTADO|CREDITO
    v_Moneda             CHAR(3) NOT NULL DEFAULT 'PEN',
    d_TipoCambio         DECIMAL(9,4) NOT NULL DEFAULT 1,
    d_MontoBruto         DECIMAL(18,2) NOT NULL,
    d_IGV                DECIMAL(18,2) NOT NULL DEFAULT 0,
    d_MontoNeto          DECIMAL(18,2) NOT NULL,        -- sin IGV (rentabilidad)
    v_Estado             NVARCHAR(15) NOT NULL DEFAULT 'POR_PAGAR', -- POR_PAGAR|PAGADO|ANULADO
    t_FechaPago          DATE NULL,                     -- dispara caja
    i_IdFormaPago        INT NULL,                      -- datahierarchy grupo 46 (sin FK, es legacy)
    i_IdCuentaBancaria   INT NULL,                      -- dbo.documento.i_CodigoDocumento (catalogo legacy, sin FK; ver ddl/09)
    v_Glosa              NVARCHAR(300) NULL,
    i_IdCompra           INT NULL,                      -- link opcional a dbo.registro_compras
    i_InsertaIdUsuario   INT NOT NULL,
    t_InsertaFecha       DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha     DATETIME NULL,
    CONSTRAINT CK_egreso_receptor CHECK (i_IdProveedor IS NOT NULL OR i_IdEntidad IS NOT NULL),
    CONSTRAINT CK_egreso_pagado   CHECK (v_Estado <> 'PAGADO' OR t_FechaPago IS NOT NULL),
    CONSTRAINT CK_egreso_montos   CHECK (d_MontoBruto = d_MontoNeto + d_IGV)
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_egreso_fdoc' AND object_id = OBJECT_ID('conta.egreso'))
    CREATE INDEX IX_egreso_fdoc ON conta.egreso(t_FechaDocumento) INCLUDE (i_IdCentroCosto, d_MontoNeto, v_Estado);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_egreso_fpago' AND object_id = OBJECT_ID('conta.egreso'))
    CREATE INDEX IX_egreso_fpago ON conta.egreso(t_FechaPago) INCLUDE (i_IdTipoGasto, d_MontoBruto, v_Estado);

-- TVP para carga masiva de egresos
IF TYPE_ID('conta.tvp_egreso') IS NULL
CREATE TYPE conta.tvp_egreso AS TABLE (
    v_RucOEntidad    NVARCHAR(200),
    t_FechaDocumento DATE,
    v_TipoDocumento  NVARCHAR(30),
    v_SerieNumero    NVARCHAR(50),
    v_CodCentroCosto NVARCHAR(20),
    v_CodTipoGasto   NVARCHAR(20),
    v_Condicion      NVARCHAR(20),
    v_Moneda         CHAR(3),
    d_TipoCambio     DECIMAL(9,4),
    d_MontoBruto     DECIMAL(18,2),
    d_IGV            DECIMAL(18,2),
    v_Glosa          NVARCHAR(300)
);

-- Costos de personal mensuales (fase 1: monto por centro de costo x concepto)
IF OBJECT_ID('conta.costo_personal_mensual','U') IS NULL
CREATE TABLE conta.costo_personal_mensual (
    i_Id                 INT IDENTITY(1,1) PRIMARY KEY,
    n_Anio               SMALLINT NOT NULL,
    n_Mes                TINYINT NOT NULL,
    i_IdCentroCosto      INT NOT NULL REFERENCES conta.centro_costo(i_IdCentroCosto),
    v_Concepto           NVARCHAR(30) NOT NULL, -- REMUNERACION|GRATIFICACION|CTS|UTILIDADES|BENEFICIOS_SOCIALES|PERSONAL_ADICIONAL
    d_Monto              DECIMAL(18,2) NOT NULL,
    v_Estado             NVARCHAR(15) NOT NULL DEFAULT 'POR_PAGAR',
    t_FechaPago          DATE NULL,
    i_InsertaIdUsuario   INT NOT NULL,
    t_InsertaFecha       DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha     DATETIME NULL,
    CONSTRAINT UQ_costo_personal UNIQUE (n_Anio, n_Mes, i_IdCentroCosto, v_Concepto),
    CONSTRAINT CK_cpm_pagado CHECK (v_Estado <> 'PAGADO' OR t_FechaPago IS NOT NULL)
);

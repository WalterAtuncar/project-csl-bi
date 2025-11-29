/*
  Script: 01_ddl_cajamayor_schema.sql
  Descripción: Crea el nuevo esquema de Caja Mayor con cabecera global,
               resumen por tipo de caja y detalle de movimientos.
  Política: Usa BEGIN TRAN + ROLLBACK TRAN por defecto. Cambie a COMMIT TRAN
            manualmente después de revisar y aceptar.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRAN;

/* Tipo de tabla para listas de enteros (si no existe) */
IF TYPE_ID(N'dbo.IdIntTableType') IS NULL
BEGIN
    CREATE TYPE dbo.IdIntTableType AS TABLE (
        Id INT NOT NULL PRIMARY KEY
    );
END;

/* Cabecera global de cierre por período */
IF OBJECT_ID(N'dbo.cajamayor_cierre', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.cajamayor_cierre (
        i_IdCajaMayorCierre INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        n_Anio NCHAR(4) NOT NULL,
        n_Mes  NCHAR(2) NOT NULL,
        t_FechaInicio DATETIME NOT NULL,
        t_FechaFin    DATETIME NOT NULL,
        d_SaldoInicialTotal   DECIMAL(18,2) NOT NULL DEFAULT(0),
        d_TotalIngresosTotal  DECIMAL(18,2) NOT NULL DEFAULT(0),
        d_TotalEgresosTotal   DECIMAL(18,2) NOT NULL DEFAULT(0),
        d_SaldoFinalTotal     DECIMAL(18,2) NOT NULL DEFAULT(0),
        i_EstadoCierre TINYINT NOT NULL DEFAULT(1), -- 1=Borrador, 2=Cerrado, 3=Confirmado
        v_Observaciones NVARCHAR(500) NULL,
        i_InsertaIdUsuario INT NOT NULL,
        t_InsertaFecha DATETIME NOT NULL DEFAULT(GETDATE()),
        i_ActualizaIdUsuario INT NULL,
        t_ActualizaFecha DATETIME NULL,
        CONSTRAINT UX_cajamayor_cierre_Periodo UNIQUE (n_Anio, n_Mes)
    );
END;

/* Resumen por tipo de caja dentro del cierre */
IF OBJECT_ID(N'dbo.cajamayor_cierre_tipocaja', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.cajamayor_cierre_tipocaja (
        i_IdCajaMayorCierre INT NOT NULL,
        i_IdTipoCaja INT NOT NULL,
        d_SaldoInicial DECIMAL(18,2) NOT NULL DEFAULT(0),
        d_TotalIngresos DECIMAL(18,2) NOT NULL DEFAULT(0),
        d_TotalEgresos DECIMAL(18,2) NOT NULL DEFAULT(0),
        d_SaldoFinal DECIMAL(18,2) NOT NULL DEFAULT(0),
        i_InsertaIdUsuario INT NOT NULL,
        t_InsertaFecha DATETIME NOT NULL DEFAULT(GETDATE()),
        i_ActualizaIdUsuario INT NULL,
        t_ActualizaFecha DATETIME NULL,
        CONSTRAINT PK_cajamayor_cierre_tipocaja PRIMARY KEY (i_IdCajaMayorCierre, i_IdTipoCaja),
        CONSTRAINT FK_cierre_tipocaja_cierre FOREIGN KEY (i_IdCajaMayorCierre)
            REFERENCES dbo.cajamayor_cierre (i_IdCajaMayorCierre) ON DELETE CASCADE,
        CONSTRAINT FK_cierre_tipocaja_tipocaja FOREIGN KEY (i_IdTipoCaja)
            REFERENCES dbo.tipocaja (i_IdTipoCaja)
    );
END;

/* Detalle unificado de movimientos del período */
IF OBJECT_ID(N'dbo.cajamayor_movimiento', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.cajamayor_movimiento (
        i_IdMovimiento INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        i_IdCajaMayorCierre INT NOT NULL,
        i_IdTipoCaja INT NOT NULL,
        v_TipoMovimiento NCHAR(1) NOT NULL, -- 'I' ingreso, 'E' egreso
        t_FechaMovimiento DATETIME NOT NULL,
        v_ConceptoMovimiento NVARCHAR(350) NULL,
        d_Subtotal DECIMAL(18,2) NULL,
        d_IGV DECIMAL(18,2) NULL,
        d_Total DECIMAL(18,2) NOT NULL DEFAULT(0),
        v_NumeroDocumento NVARCHAR(50) NULL,
        v_SerieDocumento NVARCHAR(20) NULL,
        v_CodigoDocumento NVARCHAR(20) NULL,
        v_IdVenta NVARCHAR(50) NULL,
        v_Origen NVARCHAR(30) NULL, -- Detalle, IngresoMensual, EgresoMensual, etc.
        v_Observaciones NVARCHAR(500) NULL,
        i_InsertaIdUsuario INT NOT NULL,
        t_InsertaFecha DATETIME NOT NULL DEFAULT(GETDATE()),
        i_ActualizaIdUsuario INT NULL,
        t_ActualizaFecha DATETIME NULL,
        CONSTRAINT CK_cajamayor_movimiento_tipo CHECK (v_TipoMovimiento IN (N'I', N'E')),
        CONSTRAINT FK_movimiento_cierre FOREIGN KEY (i_IdCajaMayorCierre)
            REFERENCES dbo.cajamayor_cierre (i_IdCajaMayorCierre) ON DELETE CASCADE,
        CONSTRAINT FK_movimiento_tipocaja FOREIGN KEY (i_IdTipoCaja)
            REFERENCES dbo.tipocaja (i_IdTipoCaja)
    );
END;

/* Mapeo Documento ↔ Tipo de Caja (opcional) */
IF OBJECT_ID(N'dbo.tipocaja_documento', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tipocaja_documento (
        i_IdTipoCaja INT NOT NULL,
        i_CodigoDocumento INT NOT NULL,
        b_Activo BIT NOT NULL DEFAULT(1),
        i_InsertaIdUsuario INT NOT NULL,
        t_InsertaFecha DATETIME NOT NULL DEFAULT(GETDATE()),
        CONSTRAINT PK_tipocaja_documento PRIMARY KEY (i_IdTipoCaja, i_CodigoDocumento),
        CONSTRAINT FK_tipocaja_documento_tipocaja FOREIGN KEY (i_IdTipoCaja)
            REFERENCES dbo.tipocaja (i_IdTipoCaja)
        -- Nota: FK a dbo.documento(i_CodigoDocumento) opcional según esquema existente.
    );
END;

/* Mapeo Tipo de Cliente (venta.i_ClienteEsAgente) ↔ Tipo de Caja */
IF OBJECT_ID(N'dbo.tipocaja_clientetipo', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tipocaja_clientetipo (
        i_ClienteEsAgente INT NOT NULL,
        i_IdTipoCaja INT NOT NULL,
        b_Activo BIT NOT NULL DEFAULT(1),
        i_InsertaIdUsuario INT NOT NULL,
        t_InsertaFecha DATETIME NOT NULL DEFAULT(GETDATE()),
        CONSTRAINT PK_tipocaja_clientetipo PRIMARY KEY (i_ClienteEsAgente),
        CONSTRAINT FK_tipocaja_clientetipo_tipocaja FOREIGN KEY (i_IdTipoCaja)
            REFERENCES dbo.tipocaja (i_IdTipoCaja)
    );
END;

PRINT N'01_ddl_cajamayor_schema.sql ejecutado. Revise los objetos creados.';

/* Por política, mantener ROLLBACK por defecto. Cambiar a COMMIT manualmente si está conforme. */
ROLLBACK TRAN;

-- COMMIT TRAN; -- <- Aplique COMMIT manualmente cuando desee persistir los cambios
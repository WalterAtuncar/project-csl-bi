/*
  Script: 02_indexes.sql
  Descripción: Índices recomendados para el nuevo esquema de Caja Mayor.
  Política: Usa BEGIN TRAN + ROLLBACK TRAN por defecto.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRAN;

/* Índices para cabecera de cierre */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'IX_cajamayor_cierre_Periodo_Estado' AND object_id = OBJECT_ID(N'dbo.cajamayor_cierre')
)
BEGIN
    CREATE INDEX IX_cajamayor_cierre_Periodo_Estado
        ON dbo.cajamayor_cierre (n_Anio, n_Mes, i_EstadoCierre);
END;

/* Índices para resumen por tipo de caja */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'IX_cajamayor_cierre_tipocaja_Tipo' AND object_id = OBJECT_ID(N'dbo.cajamayor_cierre_tipocaja')
)
BEGIN
    CREATE INDEX IX_cajamayor_cierre_tipocaja_Tipo
        ON dbo.cajamayor_cierre_tipocaja (i_IdTipoCaja);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'IX_cajamayor_cierre_tipocaja_Cierre' AND object_id = OBJECT_ID(N'dbo.cajamayor_cierre_tipocaja')
)
BEGIN
    CREATE INDEX IX_cajamayor_cierre_tipocaja_Cierre
        ON dbo.cajamayor_cierre_tipocaja (i_IdCajaMayorCierre);
END;

/* Índices para movimientos */
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'IX_cajamayor_movimiento_Cierre_Fecha' AND object_id = OBJECT_ID(N'dbo.cajamayor_movimiento')
)
BEGIN
    CREATE INDEX IX_cajamayor_movimiento_Cierre_Fecha
        ON dbo.cajamayor_movimiento (i_IdCajaMayorCierre, t_FechaMovimiento);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'IX_cajamayor_movimiento_TipoCaja_Fecha' AND object_id = OBJECT_ID(N'dbo.cajamayor_movimiento')
)
BEGIN
    CREATE INDEX IX_cajamayor_movimiento_TipoCaja_Fecha
        ON dbo.cajamayor_movimiento (i_IdTipoCaja, t_FechaMovimiento);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'IX_cajamayor_movimiento_Tipo' AND object_id = OBJECT_ID(N'dbo.cajamayor_movimiento')
)
BEGIN
    CREATE INDEX IX_cajamayor_movimiento_Tipo
        ON dbo.cajamayor_movimiento (v_TipoMovimiento);
END;

/* Índices para mapeo de documento ↔ tipo de caja */
IF OBJECT_ID(N'dbo.tipocaja_documento', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes WHERE name = N'IX_tipocaja_documento_Documento' AND object_id = OBJECT_ID(N'dbo.tipocaja_documento')
    )
    BEGIN
        CREATE INDEX IX_tipocaja_documento_Documento
            ON dbo.tipocaja_documento (i_CodigoDocumento);
    END;
END;

/* Índices para mapeo de tipo de cliente ↔ tipo de caja */
IF OBJECT_ID(N'dbo.tipocaja_clientetipo', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sys.indexes WHERE name = N'IX_tipocaja_clientetipo_ClienteTipo' AND object_id = OBJECT_ID(N'dbo.tipocaja_clientetipo')
    )
    BEGIN
        CREATE INDEX IX_tipocaja_clientetipo_ClienteTipo
            ON dbo.tipocaja_clientetipo (i_ClienteEsAgente);
    END;
END;

PRINT N'02_indexes.sql ejecutado. Revise los índices creados.';

/* Por política, mantener ROLLBACK por defecto. Cambiar a COMMIT manualmente si está conforme. */
ROLLBACK TRAN;

-- COMMIT TRAN; -- <- Aplique COMMIT manualmente cuando desee persistir los cambios
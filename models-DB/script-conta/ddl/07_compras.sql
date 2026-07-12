-- =====================================================================
-- FASE 6 - Satelite de clasificacion contable del Registro de Compras. SQL 2012.
-- No altera dbo.registro_compras: solo la referencia por id.
-- =====================================================================

IF OBJECT_ID('conta.compra_ext','U') IS NULL
CREATE TABLE conta.compra_ext (
    i_IdCompra          INT NOT NULL PRIMARY KEY,   -- = dbo.registro_compras.id_registro_compra
    i_IdCentroCosto     INT NOT NULL REFERENCES conta.centro_costo(i_IdCentroCosto),
    i_IdTipoGasto       INT NOT NULL REFERENCES conta.tipo_gasto(i_IdTipoGasto),
    i_IdEgreso          INT NULL REFERENCES conta.egreso(i_IdEgreso),  -- egreso espejo generado
    i_InsertaIdUsuario  INT NOT NULL,
    t_InsertaFecha      DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha    DATETIME NULL
);

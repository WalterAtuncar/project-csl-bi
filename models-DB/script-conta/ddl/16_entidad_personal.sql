-- =====================================================================
-- ddl/16 - Entidad receptora tipo PERSONAL (Caso 2 - receptor auto-derivado).
-- Plan: models-DB/docs/PLAN_PARIDAD_EGRESOS_SAMBHS.md (Fase F1, tarea T1.2, decision DN1).
-- SQL Server 2012. IDEMPOTENTE (IF NOT EXISTS sobre sys.columns / sys.indexes).
--
-- Un egreso de caja EC tipificado como GASTO sin receptor explicito se asocia
-- automaticamente a la PERSONA beneficiaria (el personal que recibio el efectivo,
-- dbo.venta.v_IdCliente -> dbo.cliente). La entidad receptora se guarda en el
-- catalogo existente conta.entidad con v_Tipo='PERSONAL' (convencion; v_Tipo NO
-- lleva CHECK -> no requiere DDL). La clave de dedup del receptor es su DOCUMENTO
-- (v_NroDocIdentificacion), NO systemuser (descartado por evidencia T1.1: el
-- id de usuario de la venta EC es el CAJERO, no el beneficiario).
-- =====================================================================

-- 1) Columna v_Documento: clave de dedup del receptor PERSONAL (NULL para MEDICO/otros).
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('conta.entidad') AND name = 'v_Documento')
    ALTER TABLE conta.entidad ADD v_Documento NVARCHAR(20) NULL;
GO

-- 2) Indice de apoyo para el upsert/lookup por documento+tipo. FILTRADO (solo filas con
--    documento): MEDICO no lleva documento, y NO es unico (varios tipos podrian compartir doc).
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_entidad_doc_tipo' AND object_id = OBJECT_ID('conta.entidad'))
    CREATE INDEX IX_entidad_doc_tipo ON conta.entidad (v_Documento, v_Tipo)
    WHERE v_Documento IS NOT NULL;
GO

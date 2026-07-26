-- =====================================================================
-- ddl/17 - Beneficiario del efectivo persistente en el overlay de egresos de caja.
-- Plan: models-DB/docs/PLAN_BENEFICIARIO_EFECTIVO.md (Fase F1).
-- SQL Server 2012. IDEMPOTENTE (IF NOT EXISTS sobre sys.columns / sys.foreign_keys / sys.indexes).
--
-- El egreso de caja EC tiene DOS roles hoy colapsados en un unico slot de receptor
-- (i_IdProveedor XOR i_IdEntidad):
--   (1) QUIEN RECIBIO EL EFECTIVO (rendidor - personal, momento T1 = Tipificar).
--   (2) El PROVEEDOR del comprobante (momento T2 = RegistrarCompra).
-- En T2, RegistrarCompra sobrescribe el receptor (i_IdEntidad -> proveedor) y el rendidor
-- se perdia del overlay. Esta columna PERSISTENTE captura al rendidor (persona) en T1 y
-- NUNCA se toca en T2 -> los dos roles quedan preservados por separado.
--
-- La columna es DOCUMENTAL/atributiva: JAMAS entra a un SUM (el overlay re-etiqueta, nunca
-- cambia montos). Apunta a conta.entidad (persona v_Tipo='PERSONAL' derivada del beneficiario
-- de la venta EC; para HONORARIO = el medico, entidad v_Tipo='MEDICO').
-- =====================================================================

-- 1) Columna persistente del beneficiario del efectivo (rendidor). NULL para egresos no derivables.
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('conta.egreso_caja_clasificacion') AND name = 'i_IdBeneficiarioEfectivo')
    ALTER TABLE conta.egreso_caja_clasificacion ADD i_IdBeneficiarioEfectivo INT NULL;
GO

-- 2) FK al catalogo de entidades (persona/rendidor). Misma referencia que FK_ecc_entidad.
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_ecc_benefefectivo')
    ALTER TABLE conta.egreso_caja_clasificacion
        ADD CONSTRAINT FK_ecc_benefefectivo
        FOREIGN KEY (i_IdBeneficiarioEfectivo) REFERENCES conta.entidad (i_IdEntidad);
GO

-- 3) Indice de apoyo FILTRADO (solo filas con beneficiario) para el LEFT JOIN de los consumidores.
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_ecc_benefefectivo' AND object_id = OBJECT_ID('conta.egreso_caja_clasificacion'))
    CREATE INDEX IX_ecc_benefefectivo ON conta.egreso_caja_clasificacion (i_IdBeneficiarioEfectivo)
    WHERE i_IdBeneficiarioEfectivo IS NOT NULL;
GO

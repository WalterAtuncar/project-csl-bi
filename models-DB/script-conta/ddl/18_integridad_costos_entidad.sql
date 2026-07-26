-- =====================================================================
-- ddl/18 - Integridad de dominio: costo_personal_mensual + entidad.
-- Origen: auditoria db-experto 2026-07-25 (brechas MEDIA 5 y 6).
-- SQL Server 2012. IDEMPOTENTE (IF NOT EXISTS sobre sys.check_constraints /
-- sys.indexes). Pre-verificado en prod antes de aplicar: 0 filas violan
-- n_Mes 1..12, 0 filas violan estado, 0 duplicados (v_Documento, v_Tipo).
--
-- 1) CK_cpm_mes: n_Mes solo 1..12 (antes: tinyint libre; un 13 rompia las
--    agrupaciones mensuales sin aviso).
-- 2) CK_cpm_estado: dominio cerrado POR_PAGAR|PAGADO (antes: nvarchar libre;
--    solo existia CK_cpm_pagado que exige FechaPago cuando PAGADO).
-- 3) UX_entidad_documento_tipo: UNIQUE FILTRADO (v_Documento, v_Tipo) sobre
--    filas con documento -> cierra la carrera SELECT-luego-INSERT del upsert
--    PERSONAL de sp_EgresoCaja_Tipificar (ddl/16 lo dejo NO-unique a proposito;
--    la evidencia de prod muestra 0 duplicados, se endurece). MEDICO (doc NULL)
--    queda fuera del filtro y no se ve afectado.
-- CERO impacto sobre dbo.
-- =====================================================================

-- 1) CHECK de mes valido.
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints
               WHERE name = 'CK_cpm_mes' AND parent_object_id = OBJECT_ID('conta.costo_personal_mensual'))
    ALTER TABLE conta.costo_personal_mensual WITH CHECK
        ADD CONSTRAINT CK_cpm_mes CHECK (n_Mes BETWEEN 1 AND 12);
GO

-- 2) CHECK de dominio del estado.
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints
               WHERE name = 'CK_cpm_estado' AND parent_object_id = OBJECT_ID('conta.costo_personal_mensual'))
    ALTER TABLE conta.costo_personal_mensual WITH CHECK
        ADD CONSTRAINT CK_cpm_estado CHECK (v_Estado IN ('POR_PAGAR','PAGADO'));
GO

-- 3) Unico filtrado por (documento, tipo). Convive con IX_entidad_doc_tipo
--    (ddl/16, no-unique, se conserva: no se borra nada existente).
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE name = 'UX_entidad_documento_tipo' AND object_id = OBJECT_ID('conta.entidad'))
    CREATE UNIQUE INDEX UX_entidad_documento_tipo ON conta.entidad (v_Documento, v_Tipo)
        WHERE v_Documento IS NOT NULL;
GO

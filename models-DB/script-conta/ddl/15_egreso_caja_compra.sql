-- =====================================================================
-- FASE 1 (Cierre de ciclo del egreso de caja SAMBHS) - DDL.
-- Plan: models-DB/docs/PLAN_CIERRE_CICLO_EGRESO_CAJA.md (seccion 2.1).
-- Continua ddl/14 (overlay conta.egreso_caja_clasificacion). SQL Server 2012.
-- Idempotente (IF NOT EXISTS sys.columns / sys.check_constraints).
--
-- 2do momento del egreso EC (documentar la compra): ALTER 100% ADITIVO sobre el
-- overlay conta.egreso_caja_clasificacion (schema conta = nuestro). Todas las
-- columnas NULL salvo v_EstadoCompra (NOT NULL DEFAULT 'SIN_COMPROBANTE'); como
-- el overlay esta VACIO en prod (0 filas), no hay backfill.
--
-- PRINCIPIO RECTOR (DD1): estas columnas son DOCUMENTALES. El monto de caja SIGUE
-- mandando (cm.d_Total, lo que suman las 6 superficies): jamas se sobrescribe ni
-- ratea. La diferencia (d_MontoBrutoCompra - montoCaja) NO se persiste: se calcula
-- en la bandeja / GetClasificacion. IGV informativo (DD2): NO entra a
-- dbo.registro_compras ni cuenta como credito fiscal. CERO impacto sobre dbo.
-- =====================================================================

-- v_TipoDocCompra: tipo de comprobante del proveedor (FACTURA/BOLETA/RECIBO/OTRO).
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('conta.egreso_caja_clasificacion') AND name='v_TipoDocCompra')
    ALTER TABLE conta.egreso_caja_clasificacion ADD v_TipoDocCompra NVARCHAR(30) NULL;
GO

-- v_SerieNumeroCompra: serie-numero del comprobante del proveedor.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('conta.egreso_caja_clasificacion') AND name='v_SerieNumeroCompra')
    ALTER TABLE conta.egreso_caja_clasificacion ADD v_SerieNumeroCompra NVARCHAR(100) NULL;
GO

-- t_FechaDocCompra: fecha de emision del comprobante.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('conta.egreso_caja_clasificacion') AND name='t_FechaDocCompra')
    ALTER TABLE conta.egreso_caja_clasificacion ADD t_FechaDocCompra DATE NULL;
GO

-- d_MontoBrutoCompra: bruto documental (DD1: puede diferir del monto de caja).
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('conta.egreso_caja_clasificacion') AND name='d_MontoBrutoCompra')
    ALTER TABLE conta.egreso_caja_clasificacion ADD d_MontoBrutoCompra DECIMAL(18,2) NULL;
GO

-- d_IGVCompra: IGV informativo (DD2). No credito fiscal, no registro_compras.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('conta.egreso_caja_clasificacion') AND name='d_IGVCompra')
    ALTER TABLE conta.egreso_caja_clasificacion ADD d_IGVCompra DECIMAL(18,2) NULL;
GO

-- v_EstadoCompra: SIN_COMPROBANTE (default) | COMPLETO. Solo relevante para GASTO.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('conta.egreso_caja_clasificacion') AND name='v_EstadoCompra')
    ALTER TABLE conta.egreso_caja_clasificacion
        ADD v_EstadoCompra NVARCHAR(20) NOT NULL
            CONSTRAINT DF_ecc_estadocompra DEFAULT 'SIN_COMPROBANTE';
GO

-- CHECK de dominio del estado de compra (idempotente).
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_ecc_estadocompra' AND parent_object_id=OBJECT_ID('conta.egreso_caja_clasificacion'))
    ALTER TABLE conta.egreso_caja_clasificacion
        ADD CONSTRAINT CK_ecc_estadocompra CHECK (v_EstadoCompra IN ('SIN_COMPROBANTE','COMPLETO'));
GO

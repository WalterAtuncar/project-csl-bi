-- =====================================================================
-- LIMPIEZA de la prueba E2E de F1-F4 (beneficiario efectivo persistente).
-- Plan: PLAN_BENEFICIARIO_EFECTIVO.md. Venta de prueba: N001-ZQ000357130 (EC 502, 50.00).
-- Deja PROD exactamente como estaba: overlay 0 filas/ident 0, entidad MAX vivo 1013,
-- auditoria sin las 2 filas del test. RESEED al MAX(id) VIVO real (no a valor fijo).
-- SQL Server 2012. Orden respeta FKs (overlay -> entidad).
-- =====================================================================

-- 1) Overlay del egreso de prueba (rompe la FK i_IdBeneficiarioEfectivo/i_IdEntidad -> entidad 1014).
DELETE FROM conta.egreso_caja_clasificacion WHERE v_IdVenta = 'N001-ZQ000357130';

-- 2) Entidad PERSONAL auto-creada por la derivacion del beneficiario (id 1014, doc 42250011).
DELETE FROM conta.entidad
WHERE i_IdEntidad = 1014 AND v_Tipo = 'PERSONAL' AND v_Documento = '42250011';

-- 3) Auditoria del test (TIPIFICAR_GASTO + REGISTRAR_COMPRA de esa venta).
DELETE FROM conta.auditoria
WHERE LTRIM(RTRIM(v_Detalle)) = 'N001-ZQ000357130'
  AND v_Tabla = 'conta.egreso_caja_clasificacion'
  AND v_Accion IN ('TIPIFICAR_GASTO','REGISTRAR_COMPRA');

-- 4) RESEED al MAX(id) VIVO real de cada tabla (dynamic SQL; DBCC no acepta variables).
DECLARE @m INT, @sql NVARCHAR(400);

-- overlay: quedo VACIO -> siguiente id = 1 (RESEED, 0). Estado inicial: ident 0.
SET @sql = 'DBCC CHECKIDENT(''conta.egreso_caja_clasificacion'', RESEED, '
         + CAST(ISNULL((SELECT MAX(i_IdClasificacion) FROM conta.egreso_caja_clasificacion), 0) AS NVARCHAR(20)) + ');';
EXEC sp_executesql @sql;

-- entidad: MAX vivo real (1013 tras borrar 1014).
SET @sql = 'DBCC CHECKIDENT(''conta.entidad'', RESEED, '
         + CAST((SELECT MAX(i_IdEntidad) FROM conta.entidad) AS NVARCHAR(20)) + ');';
EXEC sp_executesql @sql;

-- auditoria: MAX vivo real tras borrar las 2 filas del test.
SET @sql = 'DBCC CHECKIDENT(''conta.auditoria'', RESEED, '
         + CAST((SELECT MAX(i_IdAuditoria) FROM conta.auditoria) AS NVARCHAR(20)) + ');';
EXEC sp_executesql @sql;

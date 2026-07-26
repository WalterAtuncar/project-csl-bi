-- =====================================================================
-- maintenance/2026-07-25_test_remedios_auditoria_limpiar.sql  (PAR: limpiar)
-- Limpieza de los datos de prueba de 2026-07-25_test_remedios_auditoria.sql.
-- RESEED al MAX VIVO verificado ANTES de ejecutar (regla del proyecto):
--   ecc: quedaba 1 fila de prueba (id 1) -> vacia -> RESEED 0 (estado original).
--   entidad: fila de prueba 1014 -> MAX vivo 1013 (estado original).
--   cpm: fila de prueba i_Id 9 -> MAX vivo 8 (estado original).
--   auditoria: filas de prueba 10147..10152 (verificadas una a una: usuario 1,
--     conceptos/venta de prueba; NINGUNA fila real por encima) -> RESEED 10146.
-- GUARDS: cada DELETE filtra por los identificadores EXACTOS de la prueba
-- (sin LIKE con corchetes; regla reglas-sql2012.md).
-- =====================================================================
SET NOCOUNT ON;

-- 1) Overlay de prueba (quedo ANULADO tras Destipificar).
DELETE FROM conta.egreso_caja_clasificacion
WHERE i_IdClasificacion = 1 AND v_IdVenta = 'N001-ZQ000357130';
DBCC CHECKIDENT('conta.egreso_caja_clasificacion', RESEED, 0);

-- 2) Entidad PERSONAL auto-derivada por la prueba.
DELETE FROM conta.entidad
WHERE i_IdEntidad = 1014 AND v_Tipo = 'PERSONAL' AND v_Documento = '42250011'
  AND NOT EXISTS (SELECT 1 FROM conta.egreso_caja_clasificacion
                  WHERE i_IdEntidad = 1014 OR i_IdBeneficiarioEfectivo = 1014);
DBCC CHECKIDENT('conta.entidad', RESEED, 1013);

-- 3) Costo de personal de prueba.
DELETE FROM conta.costo_personal_mensual
WHERE i_Id = 9 AND v_Concepto = 'TEST-AUDIT-DBEXP' AND n_Anio = 2025 AND n_Mes = 1;
DBCC CHECKIDENT('conta.costo_personal_mensual', RESEED, 8);

-- 4) Auditoria de la prueba (ids verificados; solo usuario 1 y objetos de prueba).
DELETE FROM conta.auditoria
WHERE i_IdAuditoria BETWEEN 10147 AND 10152 AND i_IdUsuario = 1;
DBCC CHECKIDENT('conta.auditoria', RESEED, 10146);

-- 5) Verificacion final: estado = estado inicial.
SELECT 'ecc' AS t, IDENT_CURRENT('conta.egreso_caja_clasificacion') AS ident,
       (SELECT COUNT(*) FROM conta.egreso_caja_clasificacion) AS n
UNION ALL SELECT 'entidad', IDENT_CURRENT('conta.entidad'), (SELECT COUNT(*) FROM conta.entidad)
UNION ALL SELECT 'cpm', IDENT_CURRENT('conta.costo_personal_mensual'), (SELECT COUNT(*) FROM conta.costo_personal_mensual)
UNION ALL SELECT 'aud', IDENT_CURRENT('conta.auditoria'), (SELECT COUNT(*) FROM conta.auditoria);

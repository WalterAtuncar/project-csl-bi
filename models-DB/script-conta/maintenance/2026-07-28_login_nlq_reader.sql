-- =====================================================================
-- DRAFT - Login de MINIMO PRIVILEGIO para el ejecutor NLQ (Fase F3).
-- Plan: models-DB/docs/PLAN_NLQ_CONTA.md (2.4, D4, GATE F3). Fecha: 2026-07-28.
--
-- >>> APLICADO 2026-07-28 por el orquestador (sa via db-console), con OK del PO. <<<
--   GATE F3 VERDE: reader lee las 3 vistas; DENEGADO systemuser/v_Password/INSERT/no-grant.
--   - El repo CONSERVA el placeholder <<PONER_PASSWORD>>; la password real solo vive en
--     appsettings.Local.json (gitignorado). Para reaplicar/rotar: sustituir el placeholder.
--   - NO commitear este archivo con la password real (dejarlo con el placeholder).
--   - La connstring de este login va SOLO en appsettings.Local.json (gitignorado),
--     clave ConnectionStrings:conta_nlq_reader.
--
-- OBJETIVO: la API usa este login SOLO para EJECUTAR el SQL generado por la IA.
-- Es la 2a barrera (defensa en profundidad) del validador SELECT-only + allowlist.
--
-- POSTURA: en vez de db_datareader (que abre SELECT a TODO dbo), se hacen GRANT
-- SELECT EXPLICITOS por objeto -> mas fino que el plan (D4). Solo lo que las 3
-- vistas curadas necesitan resolver + las 3 vistas (el allowlist del ejecutor).
-- Los dominios v1 (ventas/caja/rentabilidad) NO tocan SigesoftDesarrollo_2 -> NO
-- se otorga nada ahi (cuando v2 sume clinico, se ampliara acotado).
-- Ownership chaining alterno (endurecer luego): si conta y dbo comparten dueno,
-- bastaria GRANT en las 3 vistas; los GRANT base se dejan para garantizar que las
-- vistas resuelvan sin depender de la cadena de propiedad.
-- =====================================================================

-- 1) LOGIN (server-level).
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = 'conta_nlq_reader')
    CREATE LOGIN conta_nlq_reader
        WITH PASSWORD = '<<PONER_PASSWORD>>', CHECK_POLICY = ON, DEFAULT_DATABASE = [20505310072];
GO

-- 2) USER en la BD principal.
USE [20505310072];
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'conta_nlq_reader')
    CREATE USER conta_nlq_reader FOR LOGIN conta_nlq_reader;
GO

-- 3) GRANT SELECT en las 3 VISTAS curadas (= allowlist del ejecutor).
GRANT SELECT ON conta.v_nlq_ventas        TO conta_nlq_reader;
GRANT SELECT ON conta.v_nlq_caja          TO conta_nlq_reader;
GRANT SELECT ON conta.v_nlq_rentabilidad  TO conta_nlq_reader;
GO

-- 4) GRANT SELECT en las tablas BASE que las vistas necesitan resolver.
--    (dbo: venta/ventadetalle/cobranza/cobranzadetalle/tipocaja*/datahierarchy/cajamayor_movimiento;
--     conta: centro_costo/egreso/costo_personal_mensual/sisol_participacion/sisol_liquidacion/egreso_caja_clasificacion)
GRANT SELECT ON dbo.venta                     TO conta_nlq_reader;
GRANT SELECT ON dbo.ventadetalle              TO conta_nlq_reader;
GRANT SELECT ON dbo.cobranza                  TO conta_nlq_reader;
GRANT SELECT ON dbo.cobranzadetalle           TO conta_nlq_reader;
GRANT SELECT ON dbo.tipocaja                  TO conta_nlq_reader;
GRANT SELECT ON dbo.tipocaja_clientetipo      TO conta_nlq_reader;
GRANT SELECT ON dbo.datahierarchy             TO conta_nlq_reader;
GRANT SELECT ON dbo.cajamayor_movimiento      TO conta_nlq_reader;
GRANT SELECT ON conta.centro_costo            TO conta_nlq_reader;
GRANT SELECT ON conta.egreso                  TO conta_nlq_reader;
GRANT SELECT ON conta.costo_personal_mensual  TO conta_nlq_reader;
GRANT SELECT ON conta.sisol_participacion     TO conta_nlq_reader;
GRANT SELECT ON conta.sisol_liquidacion       TO conta_nlq_reader;
GRANT SELECT ON conta.egreso_caja_clasificacion TO conta_nlq_reader;
GO

-- 5) DENY de escritura y ejecucion a nivel BD (defensa en profundidad).
DENY INSERT, UPDATE, DELETE, EXECUTE TO conta_nlq_reader;
GO

-- 6) DENY explicito de la columna SENSIBLE: jamas leer la clave del legacy.
DENY SELECT ON dbo.systemuser (v_Password) TO conta_nlq_reader;
GO

-- =====================================================================
-- VERIFICACION sugerida para el GATE F3 (tras aplicar):
--   * SELECT TOP 1 * FROM conta.v_nlq_ventas;                 -> OK (200)
--   * INSERT/UPDATE/DELETE de prueba en cualquier tabla       -> FALLA por permisos
--   * SELECT v_Password FROM dbo.systemuser                   -> DENEGADO
-- Ejecutar los checks conectado COMO conta_nlq_reader (EXECUTE AS / connstring).
--
-- ROLLBACK: DROP USER conta_nlq_reader (en 20505310072) + DROP LOGIN conta_nlq_reader.
-- =====================================================================

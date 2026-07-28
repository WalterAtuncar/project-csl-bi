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


-- #####################################################################
-- EXTENSION FASE B-SLICE (NLQ v2, dominio clinico). Fecha: 2026-07-28.
--
-- >>> APLICADO 2026-07-28 por db-experto (sa via db-console --db
--     SigesoftDesarrollo_2), con OK del PO. <<<
--   GATE VERDE por impersonacion (EXECUTE AS USER='conta_nlq_reader'):
--     T1 SELECT COUNT(*) dbo.service            -> PERMITIDO
--     T2 person.v_Password / T3 systemuser.v_Password -> DENEGADO (col-DENY)
--     T4 INSERT dbo.diseases                    -> DENEGADO (DENY INSERT)
--     T5 COUNT dbo.hospitalizacion (no grant)   -> DENEGADO (sin permiso)
--     T6 person sin v_Password                  -> PERMITIDO (col-DENY no bloquea el resto)
--
-- Extiende el MISMO login server-level conta_nlq_reader a la BD clinica
-- SigesoftDesarrollo_2, con minimo privilegio: SELECT SOLO sobre las 10 tablas
-- del slice + organization (para resolver empresa/cliente). Sin password real:
-- el login ya existe (server-level); aqui solo se crea el USER + grants/denys.
--
-- Cada batch ABRE con USE [SigesoftDesarrollo_2] para ser self-contained
-- (aplicable con db-console independientemente del reuso de conexion del pool).
-- SigesoftDesarrollo_2 sigue siendo SOLO LECTURA: aqui NO se crea/altera ningun
-- objeto de esa BD; solo se otorgan/deniegan permisos a un principal (permisos
-- viven en la BD, no tocan el modify_date de las tablas).
-- #####################################################################

-- B1) USER en la BD clinica para el login server-level ya existente.
USE [SigesoftDesarrollo_2];
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'conta_nlq_reader')
    CREATE USER conta_nlq_reader FOR LOGIN conta_nlq_reader;
GO

-- B2) GRANT SELECT: SOLO las 10 tablas del slice + organization (resuelve empresa).
USE [SigesoftDesarrollo_2];
GRANT SELECT ON dbo.service               TO conta_nlq_reader;
GRANT SELECT ON dbo.servicecomponent      TO conta_nlq_reader;
GRANT SELECT ON dbo.protocol              TO conta_nlq_reader;
GRANT SELECT ON dbo.diagnosticrepository  TO conta_nlq_reader;
GRANT SELECT ON dbo.diseases              TO conta_nlq_reader;
GRANT SELECT ON dbo.cie10                 TO conta_nlq_reader;
GRANT SELECT ON dbo.person                TO conta_nlq_reader;
GRANT SELECT ON dbo.systemuser            TO conta_nlq_reader;
GRANT SELECT ON dbo.systemparameter       TO conta_nlq_reader;
GRANT SELECT ON dbo.component             TO conta_nlq_reader;
GRANT SELECT ON dbo.organization          TO conta_nlq_reader;
GO

-- B3) DENY de la columna SENSIBLE en las DOS tablas que la tienen (override del
--     GRANT de tabla: deja leer todo MENOS v_Password).
USE [SigesoftDesarrollo_2];
DENY SELECT ON dbo.person     (v_Password) TO conta_nlq_reader;
DENY SELECT ON dbo.systemuser (v_Password) TO conta_nlq_reader;
GO

-- B4) DENY de escritura y ejecucion a nivel BD (defensa en profundidad).
USE [SigesoftDesarrollo_2];
DENY INSERT, UPDATE, DELETE, EXECUTE TO conta_nlq_reader;
GO

-- =====================================================================
-- ROLLBACK FASE B: USE [SigesoftDesarrollo_2]; DROP USER conta_nlq_reader;
-- (el login server-level y el user de 20505310072 se conservan para v1).
-- =====================================================================


-- #####################################################################
-- EXTENSION FASE B-SCALE (NLQ v2, dominio clinico). Fecha: 2026-07-28.
--
-- >>> APLICADO 2026-07-28 por db-experto (sa via db-console --db
--     SigesoftDesarrollo_2), con OK del PO. <<<
--   GATE VERDE por impersonacion (nuevas tablas leidas OK; v_Password/escritura
--   siguen denegadas).
--
-- Amplia el GRANT SELECT del MISMO user conta_nlq_reader a las 19 tablas CORE
-- nuevas del catalogo (ddl/22). 'organization' YA fue otorgada en FASE B-SLICE.
-- NO se necesitan nuevos DENY: el DENY INSERT/UPDATE/DELETE/EXECUTE a nivel BD
-- (B4) ya cubre estas tablas, y v_Password solo existe en person/systemuser (ya
-- denegada, B3). Cada batch abre con USE para ser self-contained.
-- #####################################################################

-- B5) GRANT SELECT en las 19 tablas nuevas (scale).
USE [SigesoftDesarrollo_2];
GRANT SELECT ON dbo.calendar                          TO conta_nlq_reader;
GRANT SELECT ON dbo.protocolcomponent                 TO conta_nlq_reader;
GRANT SELECT ON dbo.recommendation                    TO conta_nlq_reader;
GRANT SELECT ON dbo.restriction                       TO conta_nlq_reader;
GRANT SELECT ON dbo.masterrecommendationrestricction  TO conta_nlq_reader;
GRANT SELECT ON dbo.hospitalizacion                   TO conta_nlq_reader;
GRANT SELECT ON dbo.hospitalizacionservice            TO conta_nlq_reader;
GRANT SELECT ON dbo.hospitalizacionhabitacion         TO conta_nlq_reader;
GRANT SELECT ON dbo.pacient                           TO conta_nlq_reader;
GRANT SELECT ON dbo.professional                      TO conta_nlq_reader;
GRANT SELECT ON dbo.medico                            TO conta_nlq_reader;
GRANT SELECT ON dbo.organizationperson                TO conta_nlq_reader;
GRANT SELECT ON dbo.groupoccupation                   TO conta_nlq_reader;
GRANT SELECT ON dbo.location                          TO conta_nlq_reader;
GRANT SELECT ON dbo.componentfield                    TO conta_nlq_reader;
GRANT SELECT ON dbo.componentfields                   TO conta_nlq_reader;
GRANT SELECT ON dbo.datahierarchy                     TO conta_nlq_reader;
GRANT SELECT ON dbo.receta                            TO conta_nlq_reader;
GRANT SELECT ON dbo.receipHeader                      TO conta_nlq_reader;
GO
-- ROLLBACK SCALE: los grants caen con el DROP USER del rollback FASE B.
-- =====================================================================


-- #####################################################################
-- EXTENSION RONDA "PLATA" (NLQ v2, vistas cross-DB). Fecha: 2026-07-28.
--
-- >>> APLICADO 2026-07-28 por db-experto (sa via db-console), con OK del PO. <<<
--   GATE VERDE por impersonacion EXECUTE AS LOGIN (cross-DB): el reader lee
--   conta.v_nlq_ingreso_consultorio (que alcanza SigesoftDesarrollo_2 por dentro)
--   y sigue sin poder v_Password.
--
-- La vista v_nlq_ingreso_consultorio (ddl/23) vive en conta (BD 20505310072) y
-- lee POR DENTRO dbo.venta/ventadetalle/tipocaja_clientetipo (BD principal, ya
-- concedidas en F3) + SigesoftDesarrollo_2.dbo.service/protocol/systemparameter
-- (ya concedidas en FASE B-SLICE). Solo falta conceder la VISTA en si.
-- #####################################################################

-- P1) GRANT SELECT en la vista nueva (BD principal 20505310072).
USE [20505310072];
GRANT SELECT ON conta.v_nlq_ingreso_consultorio TO conta_nlq_reader;
GO

-- P2) GRANT SELECT en la vista de honorarios (ddl/24) + sus bases NUEVAS de la BD
--     principal (dbo.cliente, dbo.systemuser). El resto de bases ya estaban: main
--     venta/ventadetalle/cobranzadetalle (F3) + Sigesoft service/protocol/person/
--     calendar/servicecomponent/systemuser/systemparameter (FASE B).
--     (La vista resuelve por ownership chaining aunque no se concedan las bases;
--      se conceden explicitas por robustez, como en F3.)
--     >>> DENY OBLIGATORIO: la dbo.systemuser de la BD PRINCIPAL tambien tiene
--         v_Password. El DENY que la seccion 6 (F3) intento aplicar NO quedo en
--         prod (F3 no concedia esa tabla -> el DENY era moot y no persistio en el
--         estado verificado). Al conceder ahora la tabla, este DENY es IMPRESCINDIBLE.
--     Aplicado 2026-07-28.
USE [20505310072];
GRANT SELECT ON conta.v_nlq_honorarios TO conta_nlq_reader;
GRANT SELECT ON dbo.cliente             TO conta_nlq_reader;
GRANT SELECT ON dbo.systemuser          TO conta_nlq_reader;
DENY  SELECT ON dbo.systemuser (v_Password) TO conta_nlq_reader;
GO
-- ROLLBACK PLATA: los grants caen con el DROP USER (rollback F3) del user de 20505310072.
-- =====================================================================

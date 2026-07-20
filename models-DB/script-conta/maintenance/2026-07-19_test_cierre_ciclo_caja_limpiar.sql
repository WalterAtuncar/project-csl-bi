-- =====================================================================
-- LIMPIEZA de datos de PRUEBA - Cierre de ciclo del egreso de caja (FASE 1/2).
-- Par de: 2026-07-19_test_cierre_ciclo_caja.sql. Schema conta + 1 proveedor de prueba en dbo.proveedores.
-- Fecha: 2026-07-19.
--
-- Deja el estado EXACTAMENTE como antes del test:
--   conta.egreso_caja_clasificacion  -> 0 filas, RESEED a MAX vivo (0)
--   conta.pago_honorario (Origen CAJA)-> 0 filas, RESEED a MAX vivo (0)
--   conta.pago_honorario_consultorio -> 0 filas, RESEED a MAX vivo (0)
--   conta.pago_honorario_servicio    -> 0 filas, RESEED a MAX vivo (0)
--   conta.entidad (medico de prueba) -> se borra BRINGAS VASQUEZ, YRENE, RESEED a MAX vivo (1013)
--   dbo.proveedores (alta on-demand) -> se borra 'PROVEEDOR TEST CIERRE CICLO' (RUC 20999999999),
--                                        RESEED al IDENT_CURRENT ORIGINAL (21) capturado en FASE 0.
--   conta.egreso                     -> NO se toca (RegistrarCompra JAMAS crea egreso; queda en 0 ident 0)
--   conta.auditoria                  -> LOG append-only, se deja intacto (precedente del proyecto).
--
-- IMPORTANTE (skill): RESEED al MAX id VIVO real (dinamico via DBCC EXEC), NUNCA a un valor fijo hueco.
--   Excepcion documentada para dbo.proveedores: su IDENT_CURRENT pre-test ya estaba ADELANTADO a 21
--   (18 filas vivas, hueco 19-21 pre-existente NO creado por este test). Para dejar estado final ==
--   inicial se reseedea al ORIGINAL 21 (nunca por debajo del MAX vivo). Reseedear a 18 reclamaria un
--   hueco ajeno a esta prueba.
-- Guards LIKE con %...% (NO corchetes: en LIKE los corchetes son clase de caracteres).
-- FRONTERA dbo: lo unico tocado en dbo es DML (borrar 1 fila de proveedores del BI + RESEED). CERO DDL.
-- =====================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Ventas EC usadas por el test (unicas que pudieron generar overlay/pago).
DECLARE @ventas TABLE (v NCHAR(16));
INSERT INTO @ventas(v) VALUES ('N001-ZQ000345140'),('N001-ZQ000345146'),('N001-ZQ000345148');

-- Guard 0: no debe existir NINGUN pago de honorario que NO sea de origen CAJA (proteger pagos WEB reales).
IF EXISTS (SELECT 1 FROM conta.pago_honorario WHERE v_Origen <> 'CAJA')
BEGIN RAISERROR('ABORTADO: hay pagos de honorarios que NO son de origen CAJA (datos reales) - no se limpia.', 16, 1); RETURN; END

-- Guard 1: el overlay solo debe contener filas de las ventas de prueba (en cualquier estado).
IF EXISTS (SELECT 1 FROM conta.egreso_caja_clasificacion ov
           WHERE LTRIM(RTRIM(ov.v_IdVenta)) NOT IN (SELECT LTRIM(RTRIM(v)) FROM @ventas))
BEGIN RAISERROR('ABORTADO: el overlay contiene ventas ajenas al test - no se limpia.', 16, 1); RETURN; END

-- Guard 2: el proveedor de prueba debe ser exactamente el del alta on-demand y no estar referenciado.
IF EXISTS (SELECT 1 FROM dbo.proveedores p
           WHERE p.ruc = '20999999999' AND p.razon_social <> 'PROVEEDOR TEST CIERRE CICLO')
BEGIN RAISERROR('ABORTADO: el RUC de prueba tiene otra razon social - no se limpia el proveedor.', 16, 1); RETURN; END

BEGIN TRAN;

    DECLARE @pagos TABLE (id INT);
    INSERT INTO @pagos(id)
        SELECT i_IdPago FROM conta.pago_honorario
        WHERE v_Origen = 'CAJA'
          AND LTRIM(RTRIM(v_IdVentaCaja)) IN (SELECT LTRIM(RTRIM(v)) FROM @ventas);

    DECLARE @entidades TABLE (id INT);
    INSERT INTO @entidades(id)
        SELECT i_IdEntidad FROM conta.entidad
        WHERE v_Tipo = 'MEDICO' AND v_Nombre LIKE '%BRINGAS VASQUEZ, YRENE%';

    DECLARE @provTest TABLE (id INT);
    INSERT INTO @provTest(id)
        SELECT id_proveedor FROM dbo.proveedores
        WHERE ruc = '20999999999' AND razon_social = 'PROVEEDOR TEST CIERRE CICLO';

    -- 1) overlay (hijo logico; referencia pago/proveedor/entidad).
    DELETE FROM conta.egreso_caja_clasificacion
    WHERE LTRIM(RTRIM(v_IdVenta)) IN (SELECT LTRIM(RTRIM(v)) FROM @ventas);
    DECLARE @dOverlay INT = @@ROWCOUNT;

    -- 2) servicios y consultorios de los pagos CAJA.
    DELETE FROM conta.pago_honorario_servicio    WHERE i_IdPago IN (SELECT id FROM @pagos);
    DECLARE @dServ INT = @@ROWCOUNT;
    DELETE FROM conta.pago_honorario_consultorio WHERE i_IdPago IN (SELECT id FROM @pagos);
    DECLARE @dCons INT = @@ROWCOUNT;

    -- 3) cabeceras de pago CAJA.
    DELETE FROM conta.pago_honorario WHERE i_IdPago IN (SELECT id FROM @pagos);
    DECLARE @dPago INT = @@ROWCOUNT;

    -- 4) entidad medico de prueba (ya sin pago que la referencie).
    DELETE FROM conta.entidad
    WHERE i_IdEntidad IN (SELECT id FROM @entidades)
      AND NOT EXISTS (SELECT 1 FROM conta.pago_honorario ph WHERE ph.i_IdEntidad = conta.entidad.i_IdEntidad)
      AND NOT EXISTS (SELECT 1 FROM conta.egreso e WHERE e.i_IdEntidad = conta.entidad.i_IdEntidad);
    DECLARE @dEnt INT = @@ROWCOUNT;

    -- 5) proveedor de prueba (alta on-demand). DML sobre dbo.proveedores (tabla del BI) permitido.
    --    Ya sin overlay ni egreso que lo referencie (borramos overlay arriba; conta.egreso vacio).
    DELETE FROM dbo.proveedores
    WHERE id_proveedor IN (SELECT id FROM @provTest);
    DECLARE @dProv INT = @@ROWCOUNT;

    -- Guard final: las 4 tablas de tipificacion vacias y el proveedor de prueba borrado antes del RESEED.
    IF (SELECT COUNT(*) FROM conta.egreso_caja_clasificacion) <> 0
       OR (SELECT COUNT(*) FROM conta.pago_honorario WHERE v_Origen = 'CAJA') <> 0
       OR (SELECT COUNT(*) FROM conta.pago_honorario_consultorio) <> 0
       OR (SELECT COUNT(*) FROM conta.pago_honorario_servicio) <> 0
       OR EXISTS (SELECT 1 FROM dbo.proveedores WHERE ruc = '20999999999')
    BEGIN ROLLBACK TRAN; RAISERROR('ABORTADO: quedan filas de prueba tras el borrado; no se hace RESEED.', 16, 1); RETURN; END

COMMIT TRAN;

-- RESEED al MAX id VIVO real (dinamico). dbo.proveedores -> al IDENT_CURRENT ORIGINAL (21) pre-test,
-- nunca por debajo del MAX vivo.
DECLARE @sql NVARCHAR(MAX) = '';
DECLARE @m INT;
SET @m = (SELECT ISNULL(MAX(i_IdClasificacion),0) FROM conta.egreso_caja_clasificacion);
SET @sql += 'DBCC CHECKIDENT(''conta.egreso_caja_clasificacion'', RESEED, ' + CAST(@m AS VARCHAR(20)) + ') WITH NO_INFOMSGS;';
SET @m = (SELECT ISNULL(MAX(i_IdPago),0) FROM conta.pago_honorario);
SET @sql += 'DBCC CHECKIDENT(''conta.pago_honorario'', RESEED, ' + CAST(@m AS VARCHAR(20)) + ') WITH NO_INFOMSGS;';
SET @m = (SELECT ISNULL(MAX(i_Id),0) FROM conta.pago_honorario_consultorio);
SET @sql += 'DBCC CHECKIDENT(''conta.pago_honorario_consultorio'', RESEED, ' + CAST(@m AS VARCHAR(20)) + ') WITH NO_INFOMSGS;';
SET @m = (SELECT ISNULL(MAX(i_Id),0) FROM conta.pago_honorario_servicio);
SET @sql += 'DBCC CHECKIDENT(''conta.pago_honorario_servicio'', RESEED, ' + CAST(@m AS VARCHAR(20)) + ') WITH NO_INFOMSGS;';
SET @m = (SELECT ISNULL(MAX(i_IdEntidad),0) FROM conta.entidad);
SET @sql += 'DBCC CHECKIDENT(''conta.entidad'', RESEED, ' + CAST(@m AS VARCHAR(20)) + ') WITH NO_INFOMSGS;';
-- proveedores: original 21, pero nunca por debajo del MAX vivo actual.
DECLARE @provReseed INT = (SELECT CASE WHEN ISNULL(MAX(id_proveedor),0) > 21 THEN MAX(id_proveedor) ELSE 21 END FROM dbo.proveedores);
SET @sql += 'DBCC CHECKIDENT(''dbo.proveedores'', RESEED, ' + CAST(@provReseed AS VARCHAR(20)) + ') WITH NO_INFOMSGS;';
EXEC (@sql);

SELECT @dOverlay AS del_overlay, @dServ AS del_servicio, @dCons AS del_consultorio,
       @dPago AS del_pago, @dEnt AS del_entidad, @dProv AS del_proveedor,
       @provReseed AS proveedores_reseed;

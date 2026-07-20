-- =====================================================================
-- FASE 1 (Tipificacion ADITIVA de egresos de caja SAMBHS) - DDL.
-- Plan: models-DB/docs/PLAN_TIPIFICACION_EGRESOS_SAMBHS.md (secciones 2.1 A/B/C).
-- SQL Server 2012. Idempotente (IF NOT EXISTS sys.columns/indexes/objects).
--
-- CERO impacto sobre dbo: el overlay es 100% schema conta; las referencias a
-- catalogos legacy (dbo.proveedores por id_proveedor; consultorio 403 de
-- SigesoftDesarrollo_2) son REFERENCIAS LOGICAS (columna INT, SIN FK fisica)
-- -> patron establecido del proyecto (formas-pago dh46, cuentas dbo.documento,
-- consultorios 403). Asi NO se toca el modify_date de ningun objeto dbo. Las
-- FKs fisicas son SOLO conta->conta (tipo_gasto, centro_costo, entidad, pago).
--
-- tipo real verificado en FASE 0: dbo.venta.v_IdVenta = NCHAR(16), collation
-- Modern_Spanish_CI_AS (= DB default = dbo.cajamayor_movimiento.v_IdVenta). Se
-- guarda SIEMPRE LTRIM(RTRIM(...)) (el nchar re-paddea a 16; el '=' de SQL Server
-- ignora espacios finales -> join limpio contra cm.v_IdVenta nvarchar(100)).
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) Overlay de clasificacion (relabel del dinero legacy EC).
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.egreso_caja_clasificacion','U') IS NULL
BEGIN
    CREATE TABLE conta.egreso_caja_clasificacion (
        i_IdClasificacion    INT IDENTITY(1,1) NOT NULL,
        v_IdVenta            NCHAR(16)     NOT NULL,   -- venta EC (doc 502/504), trimmed
        v_TipoEgreso         NVARCHAR(10)  NOT NULL,   -- 'GASTO' | 'HONORARIO'
        i_IdTipoGasto        INT           NOT NULL,   -- hoja conta.tipo_gasto (HONORARIO -> MED-HON)
        i_IdCentroCosto      INT           NOT NULL,   -- centro (ECA->CC-ASIS, ECF->CC-FARM, HON->CC-ASIS/CC-SISOL)
        i_IdProveedor        INT           NULL,       -- REF LOGICA dbo.proveedores.id_proveedor (sin FK)
        i_IdEntidad          INT           NULL,       -- FK conta.entidad (medico en HONORARIO)
        i_IdConsultorio      INT           NULL,       -- REF LOGICA systemparameter 403 (sin FK; solo HONORARIO mono-consultorio)
        i_IdPago             INT           NULL,       -- FK conta.pago_honorario (cuando HONORARIO)
        v_Estado             NVARCHAR(10)  NOT NULL CONSTRAINT DF_ecc_estado DEFAULT 'ACTIVO',  -- 'ACTIVO' | 'ANULADO'
        v_Glosa              NVARCHAR(600) NULL,        -- glosa del egreso (referencia)
        v_MotivoAnulacion    NVARCHAR(600) NULL,        -- motivo de la des-tipificacion
        i_InsertaIdUsuario   INT           NOT NULL,    -- systemuser del cajero
        t_InsertaFecha       DATETIME      NOT NULL CONSTRAINT DF_ecc_inserta DEFAULT GETDATE(),
        i_ActualizaIdUsuario INT           NULL,
        t_ActualizaFecha     DATETIME      NULL,
        CONSTRAINT PK_egreso_caja_clasificacion PRIMARY KEY (i_IdClasificacion),
        CONSTRAINT CK_ecc_tipo   CHECK (v_TipoEgreso IN ('GASTO','HONORARIO')),
        CONSTRAINT CK_ecc_estado CHECK (v_Estado IN ('ACTIVO','ANULADO')),
        CONSTRAINT FK_ecc_tipogasto FOREIGN KEY (i_IdTipoGasto)   REFERENCES conta.tipo_gasto(i_IdTipoGasto),
        CONSTRAINT FK_ecc_centro    FOREIGN KEY (i_IdCentroCosto) REFERENCES conta.centro_costo(i_IdCentroCosto),
        CONSTRAINT FK_ecc_entidad   FOREIGN KEY (i_IdEntidad)     REFERENCES conta.entidad(i_IdEntidad),
        CONSTRAINT FK_ecc_pago      FOREIGN KEY (i_IdPago)        REFERENCES conta.pago_honorario(i_IdPago)
    );
END
GO

-- Idempotencia + candado de carrera: a lo sumo UNA clasificacion ACTIVO por venta.
-- Filtrado WHERE v_Estado='ACTIVO' (permite historial ANULADO y re-tipificar tras des-tipificar,
-- patron del proyecto: UX_pago_hon_serv_activo). El 2627 en carrera lo atrapa el CATCH del SP.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_ecc_venta_activo' AND object_id=OBJECT_ID('conta.egreso_caja_clasificacion'))
    CREATE UNIQUE INDEX UX_ecc_venta_activo ON conta.egreso_caja_clasificacion(v_IdVenta)
        WHERE v_Estado = 'ACTIVO';
GO

-- Indice de apoyo para el LEFT JOIN de los 6 consumidores (v_IdVenta + estado).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ecc_venta_estado' AND object_id=OBJECT_ID('conta.egreso_caja_clasificacion'))
    CREATE INDEX IX_ecc_venta_estado ON conta.egreso_caja_clasificacion(v_IdVenta, v_Estado)
        INCLUDE (i_IdTipoGasto, i_IdCentroCosto);
GO

-- ---------------------------------------------------------------------
-- B) conta.pago_honorario: origen del pago + venta EC que lo pago (ALTER aditivo).
-- ---------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('conta.pago_honorario') AND name='v_Origen')
    ALTER TABLE conta.pago_honorario
        ADD v_Origen NVARCHAR(10) NOT NULL
            CONSTRAINT DF_pago_hon_origen DEFAULT 'WEB'
            CONSTRAINT CK_pago_hon_origen CHECK (v_Origen IN ('WEB','CAJA'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('conta.pago_honorario') AND name='v_IdVentaCaja')
    ALTER TABLE conta.pago_honorario ADD v_IdVentaCaja NCHAR(16) NULL;   -- venta EC que pago (solo Origen=CAJA)
GO

-- Un pago CAJA por venta EC pagado: unico filtrado (idempotencia cross-canal).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_pago_hon_ventacaja' AND object_id=OBJECT_ID('conta.pago_honorario'))
    CREATE UNIQUE INDEX UX_pago_hon_ventacaja ON conta.pago_honorario(v_IdVentaCaja)
        WHERE v_IdVentaCaja IS NOT NULL AND v_Estado = 'PAGADO';
GO

-- ---------------------------------------------------------------------
-- C) conta.tipo_gasto: flag de visibilidad en el combo de caja + seed del subset curado.
-- ---------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('conta.tipo_gasto') AND name='b_VisibleCaja')
    ALTER TABLE conta.tipo_gasto
        ADD b_VisibleCaja BIT NOT NULL CONSTRAINT DF_tg_visiblecaja DEFAULT 0;
GO

-- Seed idempotente del subset curado (D4). Resolver SIEMPRE por v_Codigo (ids reportados FASE 0):
--   ADM-TRA(16) transporte/pasajes, ADM-ATP(18) atenciones al personal/almuerzos,
--   ADM-OTR(34) otros administrativos, ADM-MAN(24) mantenimiento, ADM-SPU(25) servicios publicos,
--   MED-SUM(35) suministros medicos, MED-INS(36) insumos medicos.
-- MED-HON entra por su propia rama (D2) -> NUNCA en el combo GASTO. Ninguna hoja de OTROS_INGRESOS.
UPDATE conta.tipo_gasto SET b_VisibleCaja = 0 WHERE b_VisibleCaja <> 0;
UPDATE conta.tipo_gasto
   SET b_VisibleCaja = 1
 WHERE v_Codigo IN ('ADM-TRA','ADM-ATP','ADM-OTR','ADM-MAN','ADM-SPU','MED-SUM','MED-INS')
   AND b_Activo = 1
   -- blindaje: jamas una hoja cuya raiz sea OTROS_INGRESOS (no aplica al subset, se deja explicito).
   AND i_IdTipoGasto NOT IN (
        SELECT h.i_IdTipoGasto
        FROM conta.tipo_gasto h
        JOIN conta.tipo_gasto p1 ON p1.i_IdTipoGasto = h.i_IdPadre
        LEFT JOIN conta.tipo_gasto p2 ON p2.i_IdTipoGasto = p1.i_IdPadre
        WHERE COALESCE(p2.v_SeccionFlujo, p1.v_SeccionFlujo) = 'OTROS_INGRESOS'
   );
GO

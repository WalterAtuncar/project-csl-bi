-- =====================================================================
-- FASE 1 (Reconciliacion caja legacy diaria) - Modelo de estado + auditoria
-- del poller conta que mantiene dbo.cajamayor_* reconciliado por DIA.
-- Idempotente. SQL Server 2012. Piso demo = 2026-07-01 (CHECK a nivel tabla).
-- Plan: models-DB/docs/PLAN_RECONCILIACION_CIERRE_DIARIO.md (secciones 4, 6, RESULTADOS FASE 0-A).
--   * conta.caja_reconciliacion_dia  (estado por fecha + huella FUENTE al cierre + totales + version)
--   * conta.caja_reconciliacion_log  (auditoria: 1 fila por corrida/accion con deltas)
-- Todo objeto NUEVO vive en schema conta. dbo NO recibe DDL (solo FILAS de datos via los SPs).
-- La referencia a la cabecera mensual legacy (dbo.cajamayor_cierre) es LOGICA (int, sin FK fisica).
-- =====================================================================

-- (1) Estado por dia calendario.
IF OBJECT_ID('conta.caja_reconciliacion_dia','U') IS NULL
CREATE TABLE conta.caja_reconciliacion_dia (
    d_Fecha                 DATE            NOT NULL,                 -- dia calendario (>= piso)
    v_Estado                NVARCHAR(15)    NOT NULL DEFAULT 'PENDIENTE',
    n_Version               INT             NOT NULL DEFAULT 0,       -- nro de CIERRES del dia (0=aun no cerrado; 1=primero; +1 por auto-recierre)
    i_IdCajaMayorCierre     INT             NULL,                     -- referencia LOGICA a dbo.cajamayor_cierre (sin FK fisica)
    d_TotalIngresos         DECIMAL(18,2)   NOT NULL DEFAULT 0,
    d_TotalEgresos          DECIMAL(18,2)   NOT NULL DEFAULT 0,
    i_CntIngresos           INT             NOT NULL DEFAULT 0,
    i_CntEgresos            INT             NOT NULL DEFAULT 0,
    hf_Cnt                  INT             NULL,                     -- huella FUENTE (dia) al ultimo cierre: COUNT
    hf_Sum                  DECIMAL(18,2)   NULL,                     -- huella FUENTE: SUM(monto)
    hf_Chk                  INT             NULL,                     -- huella FUENTE: CHECKSUM_AGG(BINARY_CHECKSUM(...))
    t_UltimaReconciliacion  DATETIME        NULL,
    t_UltimoCierre          DATETIME        NULL,
    t_UltimaVerificacion    DATETIME        NULL,
    i_InsertaIdUsuario      INT             NULL,
    t_InsertaFecha          DATETIME        NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario    INT             NULL,
    t_ActualizaFecha        DATETIME        NULL,
    CONSTRAINT PK_caja_recon_dia PRIMARY KEY (d_Fecha),
    CONSTRAINT CK_caja_recon_dia_estado CHECK (v_Estado IN ('PENDIENTE','RECONCILIADO','CERRADO')),
    CONSTRAINT CK_caja_recon_dia_piso   CHECK (d_Fecha >= '2026-07-01')
);
GO

-- (2) Auditoria de corridas/acciones del poller.
IF OBJECT_ID('conta.caja_reconciliacion_log','U') IS NULL
CREATE TABLE conta.caja_reconciliacion_log (
    i_IdLog                 INT IDENTITY(1,1) PRIMARY KEY,
    t_Inicio                DATETIME        NOT NULL DEFAULT GETDATE(),
    t_Fin                   DATETIME        NULL,
    v_Origen                NVARCHAR(20)    NULL,     -- POLLER / MANUAL / STARTUP_CATCHUP
    v_Modo                  NVARCHAR(12)    NULL,     -- OBSERVACION / ESCRITURA
    v_Accion                NVARCHAR(30)    NOT NULL, -- TICK / RECONCILIAR_DIA / CIERRE_DIA / REAPERTURA_AUTO / BARRIDO_CORTO / BARRIDO_PROFUNDO
    d_Fecha                 DATE            NULL,     -- dia afectado (null para acciones globales)
    v_Resultado             NVARCHAR(20)    NULL,     -- OK / OK_SIN_CAMBIOS / DERIVA_DETECTADA / ERROR / SKIPPED_LOCK
    v_Detalle               NVARCHAR(MAX)   NULL,     -- deltas (texto plano JSON-like; lo parsea el API, no SQL)
    i_IdUsuario             INT             NULL,
    CONSTRAINT CK_caja_recon_log_modo   CHECK (v_Modo IS NULL OR v_Modo IN ('OBSERVACION','ESCRITURA')),
    CONSTRAINT CK_caja_recon_log_result CHECK (v_Resultado IS NULL OR v_Resultado IN ('OK','OK_SIN_CAMBIOS','DERIVA_DETECTADA','ERROR','SKIPPED_LOCK'))
);
GO
-- Indice para consultar el log por fecha/accion (endpoint estado).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_caja_recon_log_inicio' AND object_id=OBJECT_ID('conta.caja_reconciliacion_log'))
    CREATE NONCLUSTERED INDEX IX_caja_recon_log_inicio ON conta.caja_reconciliacion_log (t_Inicio DESC, v_Accion);
GO

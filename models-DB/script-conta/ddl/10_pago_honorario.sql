-- =====================================================================
-- FASE 1 (Honorarios) - Modelo de pago de honorarios medicos + egreso por
-- consultorio. Idempotente. SQL Server 2012.
--   * conta.egreso.i_IdConsultorio (columna nueva) + IX_egreso_consultorio (filtrado)
--   * conta.pago_honorario            (cabecera del pago, nace PAGADO)
--   * conta.pago_honorario_consultorio(detalle por consultorio, 1 egreso espejo c/u)
--   * conta.pago_honorario_servicio   (servicios pagados; ANTI-DOBLE-PAGO via UX filtrado)
--   * conta.tvp_pago_honorario_servicio (TVP de entrada del pago)
--   * seed tipo_gasto MED-HON bajo la seccion MEDICO (i_IdPadre real, resuelto por codigo)
-- Referencias LOGICAS (sin FK) a SigesoftDesarrollo_2 systemparameter 403 (consultorio)
-- y a los catalogos legacy (forma de pago dh46, cuenta bancaria dbo.documento).
-- =====================================================================

-- (1) Columna de consultorio en egreso (referencia LOGICA a systemparameter grupo 403).
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('conta.egreso') AND name = 'i_IdConsultorio')
    ALTER TABLE conta.egreso ADD i_IdConsultorio INT NULL;
GO
-- Indice filtrado para el join de rentabilidad por consultorio (solo egresos con consultorio).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_egreso_consultorio' AND object_id = OBJECT_ID('conta.egreso'))
    CREATE NONCLUSTERED INDEX IX_egreso_consultorio ON conta.egreso (i_IdConsultorio, t_FechaDocumento)
        INCLUDE (d_MontoNeto, v_Estado) WHERE i_IdConsultorio IS NOT NULL;
GO

-- (2) Cabecera del pago (nace PAGADO - patron sp_Sisol_Pagar).
IF OBJECT_ID('conta.pago_honorario','U') IS NULL
CREATE TABLE conta.pago_honorario (
    i_IdPago             INT IDENTITY(1,1) PRIMARY KEY,
    i_MedicoId           INT NOT NULL,                 -- logico a SigesoftDesarrollo_2 systemuser.i_SystemUserId
    v_MedicoNombre       NVARCHAR(200) NOT NULL,       -- denormalizado (congelado)
    i_IdEntidad          INT NULL,                     -- FK conta.entidad (upsert v_Tipo='MEDICO')
    t_PeriodoDesde       DATE NOT NULL,
    t_PeriodoHasta       DATE NOT NULL,
    d_PorcMedico         DECIMAL(5,2) NULL,            -- referencial (v_Value2 del 403 o el aplicado)
    d_TotalServicios     DECIMAL(18,2) NOT NULL,
    d_TotalPago          DECIMAL(18,2) NOT NULL,
    v_Estado             NVARCHAR(10) NOT NULL DEFAULT 'PAGADO',
    t_FechaPago          DATE NOT NULL,
    i_IdFormaPago        INT NULL,                     -- logico (datahierarchy grupo 46)
    i_IdCuentaBancaria   INT NULL,                     -- logico (dbo.documento, i_Naturaleza=3)
    v_Glosa              NVARCHAR(300) NULL,
    v_MotivoAnulacion    NVARCHAR(300) NULL,
    i_InsertaIdUsuario   INT NOT NULL,
    t_InsertaFecha       DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha     DATETIME NULL,
    CONSTRAINT CK_pago_hon_estado CHECK (v_Estado IN ('PAGADO','ANULADO')),
    CONSTRAINT FK_pago_hon_entidad FOREIGN KEY (i_IdEntidad) REFERENCES conta.entidad(i_IdEntidad)
);
GO

-- (3) Detalle por consultorio (1 pago -> N consultorios; cada fila enlaza su egreso espejo).
IF OBJECT_ID('conta.pago_honorario_consultorio','U') IS NULL
CREATE TABLE conta.pago_honorario_consultorio (
    i_Id                 INT IDENTITY(1,1) PRIMARY KEY,
    i_IdPago             INT NOT NULL,
    i_IdConsultorio      INT NOT NULL,                 -- logico 403
    v_ConsultorioNombre  NVARCHAR(100) NOT NULL,       -- congelado (independiza el historico del catalogo)
    d_MontoServicios     DECIMAL(18,2) NOT NULL,
    d_MontoPago          DECIMAL(18,2) NOT NULL,
    i_IdEgreso           INT NULL,
    CONSTRAINT FK_pago_hon_cons_pago FOREIGN KEY (i_IdPago) REFERENCES conta.pago_honorario(i_IdPago),
    CONSTRAINT FK_pago_hon_cons_egr  FOREIGN KEY (i_IdEgreso) REFERENCES conta.egreso(i_IdEgreso),
    CONSTRAINT UQ_pago_hon_cons UNIQUE (i_IdPago, i_IdConsultorio)
);
GO

-- (4) Servicios pagados (reemplazo conta de servicespaiddetails; ANTI-DOBLE-PAGO).
IF OBJECT_ID('conta.pago_honorario_servicio','U') IS NULL
CREATE TABLE conta.pago_honorario_servicio (
    i_Id                 INT IDENTITY(1,1) PRIMARY KEY,
    i_IdPago             INT NOT NULL,
    v_ServiceId          NVARCHAR(50) NOT NULL,        -- logico a Sigesoft service.v_ServiceId (varchar(16) real)
    i_IdConsultorio      INT NOT NULL,
    d_Precio             DECIMAL(18,2) NULL,
    d_Porc               DECIMAL(5,2) NULL,
    d_Pagado             DECIMAL(18,2) NULL,
    b_Anulado            BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_pago_hon_serv_pago FOREIGN KEY (i_IdPago) REFERENCES conta.pago_honorario(i_IdPago)
);
GO
-- Indice unico FILTRADO anti-doble-pago: un serviceId activo no puede repetirse (2012 OK).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_pago_hon_serv_activo' AND object_id = OBJECT_ID('conta.pago_honorario_servicio'))
    CREATE UNIQUE NONCLUSTERED INDEX UX_pago_hon_serv_activo
        ON conta.pago_honorario_servicio (v_ServiceId) WHERE b_Anulado = 0;
GO

-- (5) TVP de entrada del pago.
IF TYPE_ID('conta.tvp_pago_honorario_servicio') IS NULL
CREATE TYPE conta.tvp_pago_honorario_servicio AS TABLE (
    v_ServiceId          NVARCHAR(50) NOT NULL,
    i_IdConsultorio      INT NOT NULL,
    d_Precio             DECIMAL(18,2) NULL,
    d_Porc               DECIMAL(5,2) NULL,
    d_Pagado             DECIMAL(18,2) NULL
);
GO

-- (6) Seed hoja de tipo de gasto MED-HON bajo la seccion MEDICO (i_IdPadre resuelto por codigo).
--     Los honorarios se reportan en la seccion MEDICO de caja (usar ADM-HEC los moveria a ADMIN).
INSERT INTO conta.tipo_gasto (i_IdPadre, v_Codigo, v_Nombre, i_InsertaIdUsuario)
SELECT p.i_IdTipoGasto, 'MED-HON', 'HONORARIOS MEDICOS', 1
FROM conta.tipo_gasto p
WHERE p.v_Codigo = 'MEDICO'
  AND NOT EXISTS (SELECT 1 FROM conta.tipo_gasto tg WHERE tg.v_Codigo = 'MED-HON');
GO

-- =====================================================================
-- FASE 5 - Modulo SISOL: liquidacion mensual y especialistas. SQL 2012.
-- =====================================================================

IF OBJECT_ID('conta.sisol_liquidacion','U') IS NULL
CREATE TABLE conta.sisol_liquidacion (
    i_IdLiquidacion         INT IDENTITY(1,1) PRIMARY KEY,
    n_Anio                  SMALLINT NOT NULL,
    n_Mes                   TINYINT NOT NULL,
    d_VentaNeta             DECIMAL(18,2) NOT NULL,
    d_PorcClinica           DECIMAL(5,2) NOT NULL,   -- foto historica del % al calcular
    d_ParticipacionClinica  DECIMAL(18,2) NOT NULL,
    d_ParticipacionHospital DECIMAL(18,2) NOT NULL,
    v_Estado                NVARCHAR(15) NOT NULL DEFAULT 'CALCULADO', -- CALCULADO|PAGADO
    i_IdEgresoHospital      INT NULL REFERENCES conta.egreso(i_IdEgreso),
    t_FechaPago             DATE NULL,
    i_InsertaIdUsuario      INT NOT NULL,
    t_InsertaFecha          DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario    INT NULL,
    t_ActualizaFecha        DATETIME NULL,
    CONSTRAINT UQ_sisol_liq UNIQUE (n_Anio, n_Mes)
);

IF OBJECT_ID('conta.sisol_liquidacion_especialista','U') IS NULL
CREATE TABLE conta.sisol_liquidacion_especialista (
    i_Id             INT IDENTITY(1,1) PRIMARY KEY,
    i_IdLiquidacion  INT NOT NULL REFERENCES conta.sisol_liquidacion(i_IdLiquidacion),
    v_IdMedico       NVARCHAR(40) NOT NULL,
    v_NombreMedico   NVARCHAR(200) NOT NULL,
    d_BaseCalculo    DECIMAL(18,2) NOT NULL,
    d_Porcentaje     DECIMAL(5,2) NOT NULL,
    d_Monto          DECIMAL(18,2) NOT NULL,
    v_Estado         NVARCHAR(15) NOT NULL DEFAULT 'CALCULADO'
);

IF TYPE_ID('conta.tvp_sisol_especialista') IS NULL
CREATE TYPE conta.tvp_sisol_especialista AS TABLE (
    v_IdMedico     NVARCHAR(40),
    v_NombreMedico NVARCHAR(200),
    d_Porcentaje   DECIMAL(5,2)
);

-- Seeds: entidad Hospital de la Solidaridad + tipo de gasto participacion Hospital.
IF NOT EXISTS (SELECT 1 FROM conta.entidad WHERE v_Nombre = 'HOSPITAL DE LA SOLIDARIDAD')
    INSERT INTO conta.entidad (v_Nombre, v_Tipo, b_Activo, i_InsertaIdUsuario)
    VALUES ('HOSPITAL DE LA SOLIDARIDAD', 'HOSPITAL', 1, 1);

IF NOT EXISTS (SELECT 1 FROM conta.tipo_gasto WHERE v_Codigo = 'SISOL-HOSP')
    INSERT INTO conta.tipo_gasto (i_IdPadre, v_Codigo, v_Nombre, v_SeccionFlujo, b_Activo, i_InsertaIdUsuario)
    SELECT i_IdTipoGasto, 'SISOL-HOSP', 'PARTICIPACION HOSPITAL SISOL', NULL, 1, 1
    FROM conta.tipo_gasto WHERE v_Codigo = 'OTROS_EGR';

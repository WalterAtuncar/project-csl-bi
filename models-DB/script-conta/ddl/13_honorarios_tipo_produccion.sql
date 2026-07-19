-- =====================================================================
-- FASE 1 (Honorarios Clinica/SISOL) - Tipo de produccion del pago.
-- Un pago de honorario es MONO-TIPO (o Clinica o SISOL, nunca mixto): la
-- marca vive en la CABECERA. Rutea el centro de costo del egreso
-- (CLINICA -> CC-ASIS, SISOL -> CC-SISOL) y separa la liquidacion.
-- SQL Server 2012. Idempotente.
-- =====================================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns
               WHERE object_id = OBJECT_ID('conta.pago_honorario') AND name = 'v_TipoProduccion')
    ALTER TABLE conta.pago_honorario
        ADD v_TipoProduccion NVARCHAR(10) NOT NULL
            CONSTRAINT DF_pago_hon_tipoprod DEFAULT 'CLINICA'
            CONSTRAINT CK_pago_hon_tipoprod CHECK (v_TipoProduccion IN ('CLINICA','SISOL'));

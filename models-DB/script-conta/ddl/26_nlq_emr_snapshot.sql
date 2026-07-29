-- =====================================================================
-- ddl/26 - NLQ v2 (EMR snapshot): resultados de examen NUMERICOS curados.
-- El EMR crudo (servicecomponentfieldvalues, ~42.7M, indices date-first, valores
-- v_Value1 TEXTO LIBRE/MIXTO) NO es NLQ-viable como vista (un mes = 23.6s solo el
-- COUNT con el piso -> timeout bajo el reader). Solucion (decidida por el PO):
-- SNAPSHOT MATERIALIZADO en conta, refrescado por SP acotado por d_InsertDate.
-- Fecha: 2026-07-28.
--
-- 3 objetos:
--   1) conta.emr_campo      - whitelist de campos NUMERICOS (config; ajustable sin codigo)
--   2) conta.emr_resultado  - snapshot (lo llena conta.sp_Emr_RefreshResultado, sp/23)
--   3) conta.v_nlq_examen_resultado - vista trivial sobre el snapshot (rapida, agregable)
--   + seed catalogo NLQ (dominio clinico_emr).
--
-- WHITELIST (verificada en vivo, ventana jun-2026): campos cuyo v_Value1 es
-- MAYORITARIAMENTE numerico limpio y de valor clinico. Un mismo concepto viene de
-- VARIAS plantillas (v_ComponentFieldId distintos) -> se NORMALIZA a un Campo unico.
-- Se DESCARTAN homonimos que son codigos (GLUCOSA/LEUCOCITOS de urianalisis avg~1) y
-- HEMATIES (formato '5.210.000' con separador de miles -> no convierte).
--
-- ADITIVO schema conta, CERO dbo / CERO SigesoftDesarrollo_2 (el SP solo LEE).
-- NO expone las tablas legacy crudas del EMR al catalogo (solo el snapshot).
-- SQL 2012. Idempotente. UTF-8 SIN BOM (ASCII).
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) conta.emr_campo - whitelist (config). Un v_ComponentFieldId por fila;
--    varios pueden mapear al mismo v_Campo (normalizacion de plantillas).
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.emr_campo','U') IS NULL
BEGIN
    CREATE TABLE conta.emr_campo (
        i_IdEmrCampo       INT IDENTITY(1,1) NOT NULL,
        v_ComponentFieldId NVARCHAR(16)  NOT NULL,   -- referencia logica a Sigesoft componentfield
        v_Campo            NVARCHAR(80)  NOT NULL,   -- etiqueta clinica normalizada
        v_Unidad           NVARCHAR(20)  NULL,
        b_Activo           BIT           NOT NULL CONSTRAINT DF_emr_campo_activo DEFAULT 1,
        CONSTRAINT PK_emr_campo PRIMARY KEY (i_IdEmrCampo)
    );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_emr_campo_field' AND object_id=OBJECT_ID('conta.emr_campo'))
    CREATE UNIQUE INDEX UX_emr_campo_field ON conta.emr_campo (v_ComponentFieldId);
GO

-- Seed de la whitelist (31 v_ComponentFieldId -> 19 conceptos). Idempotente.
INSERT INTO conta.emr_campo (v_ComponentFieldId, v_Campo, v_Unidad)
SELECT x.v_ComponentFieldId, x.v_Campo, x.v_Unidad
FROM (VALUES
    -- Signos vitales / antropometria (serie N002-MF; limpios, universales)
    ('N002-MF000000001','PRESION SISTOLICA','mmHg'),
    ('N002-MF000000002','PRESION DIASTOLICA','mmHg'),
    ('N002-MF000000003','FRECUENCIA CARDIACA','lpm'),
    ('N002-MF000000004','TEMPERATURA','C'),
    ('N002-MF000000005','FRECUENCIA RESPIRATORIA','rpm'),
    ('N002-MF000000006','SATURACION DE OXIGENO','%'),
    ('N002-MF000000007','TALLA','m'),
    ('N002-MF000000008','PESO','kg'),
    ('N002-MF000000009','INDICE DE MASA CORPORAL','kg/m2'),
    ('N002-MF000000010','PERIMETRO ABDOMINAL','cm'),
    -- Hemograma / bioquimica (varias plantillas -> mismo Campo)
    ('N009-MF000001874','HEMOGLOBINA','g/dL'),
    ('N009-MF000005673','HEMOGLOBINA','g/dL'),
    ('N009-MF000000265','HEMOGLOBINA','g/dL'),
    ('N009-MF000001876','HEMATOCRITO','%'),
    ('N009-MF000005675','HEMATOCRITO','%'),
    ('N009-MF000000266','HEMATOCRITO','%'),
    ('N009-MF000001886','PLAQUETAS','x10^3/uL'),
    ('N009-MF000005681','PLAQUETAS','x10^3/uL'),
    ('N009-MF000001890','LEUCOCITOS','x10^3/uL'),
    ('N009-MF000005679','LEUCOCITOS','x10^3/uL'),
    ('N009-MF000000261','GLUCOSA','mg/dL'),
    ('N009-MF000005587','GLUCOSA','mg/dL'),
    ('N009-MF000000518','CREATININA','mg/dL'),
    ('N009-MF000005599','CREATININA','mg/dL'),
    ('N009-MF000001086','COLESTEROL TOTAL','mg/dL'),
    ('N009-MF000001904','COLESTEROL TOTAL','mg/dL'),
    ('N009-MF000005758','COLESTEROL TOTAL','mg/dL'),
    ('N009-MF000000254','COLESTEROL HDL','mg/dL'),
    ('N009-MF000005762','COLESTEROL HDL','mg/dL'),
    ('N009-MF000001073','COLESTEROL LDL','mg/dL'),
    ('N009-MF000005764','COLESTEROL LDL','mg/dL')
) x(v_ComponentFieldId, v_Campo, v_Unidad)
WHERE NOT EXISTS (SELECT 1 FROM conta.emr_campo e WHERE e.v_ComponentFieldId = x.v_ComponentFieldId);
GO


-- ---------------------------------------------------------------------
-- 2) conta.emr_resultado - snapshot materializado. Lo escribe la conexion
--    normal (sp/23), NO el reader. 1 fila por (valor numerico de campo whitelist).
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.emr_resultado','U') IS NULL
BEGIN
    CREATE TABLE conta.emr_resultado (
        i_IdEmr            BIGINT IDENTITY(1,1) NOT NULL,
        v_ServiceId        NVARCHAR(16)  NOT NULL,
        Anio               INT           NOT NULL,
        Mes                INT           NOT NULL,
        IdConsultorio      INT           NULL,
        Consultorio        NVARCHAR(100) NULL,
        IdMedico           INT           NULL,
        Medico             NVARCHAR(200) NULL,
        v_ComponentFieldId NVARCHAR(16)  NOT NULL,
        Campo              NVARCHAR(80)  NOT NULL,
        ValorNum           DECIMAL(18,6) NOT NULL,
        d_ServiceDate      DATE          NOT NULL,
        t_Refresh          DATETIME      NOT NULL CONSTRAINT DF_emr_res_refresh DEFAULT GETDATE(),
        CONSTRAINT PK_emr_resultado PRIMARY KEY (i_IdEmr)
    );
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_emr_res_periodo' AND object_id=OBJECT_ID('conta.emr_resultado'))
    CREATE INDEX IX_emr_res_periodo ON conta.emr_resultado (Anio, Mes, v_ComponentFieldId, IdConsultorio);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_emr_res_campo' AND object_id=OBJECT_ID('conta.emr_resultado'))
    CREATE INDEX IX_emr_res_campo ON conta.emr_resultado (Campo);
GO


-- ---------------------------------------------------------------------
-- 3) conta.v_nlq_examen_resultado - vista trivial sobre el snapshot.
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.v_nlq_examen_resultado','V') IS NOT NULL DROP VIEW conta.v_nlq_examen_resultado;
GO
CREATE VIEW conta.v_nlq_examen_resultado
AS
    SELECT
        r.Anio, r.Mes,
        r.Consultorio, r.IdConsultorio,
        r.Medico, r.IdMedico,
        r.Campo, r.v_ComponentFieldId,
        r.ValorNum,
        r.d_ServiceDate,
        r.v_ServiceId
    FROM conta.emr_resultado r;
GO


-- #####################################################################
-- SEED del catalogo NLQ (dominio clinico_emr). Idempotente.
-- #####################################################################

-- 1) nlq_tabla
INSERT INTO conta.nlq_tabla (v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, b_Activa, v_Descripcion)
SELECT x.v_Base, x.v_Schema, x.v_Objeto, x.v_TipoObjeto, x.v_Dominio, 1, x.v_Descripcion
FROM (VALUES
    ('20505310072','conta','v_nlq_examen_resultado','V','clinico_emr',
     'Resultados de examen NUMERICOS (snapshot curado del EMR). ValorNum = valor numerico limpio; Campo = etiqueta (HEMOGLOBINA, GLUCOSA, PESO, IMC, PRESION SISTOLICA, COLESTEROL...). Por consultorio/medico/mes/servicio. SOLO campos de la whitelist (signos vitales + labs numericos), NO el EMR completo. USAR PARA: resultados de examen/laboratorio, valores de hemoglobina/glucosa/colesterol/presion por consultorio/mes/medico, promedios de examenes.')
) x(v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, v_Descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_tabla t
    WHERE t.v_Base = x.v_Base AND t.v_Schema = x.v_Schema AND t.v_Objeto = x.v_Objeto);
GO

-- 2) nlq_columna
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='20505310072' AND v_Schema='conta' AND v_Objeto='v_nlq_examen_resultado') t
CROSS JOIN (VALUES
    ('Anio','int','Anio de la atencion (service.d_ServiceDate). FILTRA por este.'),
    ('Mes','int','Mes 1..12 de la atencion.'),
    ('Consultorio','nvarchar(100)','Consultorio (systemparameter g403) de la atencion, o SIN CONSULTORIO.'),
    ('IdConsultorio','int','Id del consultorio en g403 (NULL si no resuelve).'),
    ('Medico','nvarchar(200)','Medico que realizo el examen (servicecomponent.i_MedicoTratanteId -> person); NULL si no resuelve.'),
    ('IdMedico','int','Id del medico (systemuser.i_SystemUserId); NULL si no resuelve.'),
    ('Campo','nvarchar(80)','Examen/medicion normalizada: HEMOGLOBINA, HEMATOCRITO, GLUCOSA, CREATININA, COLESTEROL TOTAL/HDL/LDL, PLAQUETAS, LEUCOCITOS, PESO, TALLA, INDICE DE MASA CORPORAL, PRESION SISTOLICA/DIASTOLICA, FRECUENCIA CARDIACA/RESPIRATORIA, TEMPERATURA, SATURACION DE OXIGENO, PERIMETRO ABDOMINAL.'),
    ('v_ComponentFieldId','nvarchar(16)','Id del campo EMR de origen (una plantilla; varios mapean al mismo Campo).'),
    ('ValorNum','decimal','Valor NUMERICO del examen (limpio, TRY_CONVERT). Promedia/min/max/filtra por este.'),
    ('d_ServiceDate','date','Fecha de la atencion.'),
    ('v_ServiceId','varchar(16)','Atencion/servicio de origen. N de examenes = COUNT(*) o COUNT(DISTINCT v_ServiceId) por persona.')
) x(v_Columna, v_TipoDato, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 3) nlq_regla_negocio (dominio clinico_emr)
INSERT INTO conta.nlq_regla_negocio (v_Dominio, v_Objeto, v_Regla, b_Activa, i_Orden)
SELECT x.v_Dominio, x.v_Objeto, x.v_Regla, 1, x.i_Orden
FROM (VALUES
    ('clinico_emr','conta.v_nlq_examen_resultado',
     'Resultados de examen: usa conta.v_nlq_examen_resultado (snapshot curado). ValorNum = valor numerico limpio; agrupa/promedia por Campo (HEMOGLOBINA, GLUCOSA, PESO, IMC, PRESION SISTOLICA...) y Consultorio/Medico/Mes. Filtra por Campo cuando pregunten por un examen concreto.', 1),
    ('clinico_emr','conta.v_nlq_examen_resultado',
     'Es un SNAPSHOT materializado (conta.emr_resultado, refrescado por conta.sp_Emr_RefreshResultado) que SOLO incluye los campos NUMERICOS de alto valor de la whitelist conta.emr_campo (signos vitales + labs); NO es el EMR completo ni incluye texto libre. Un mismo Campo puede provenir de varias plantillas (ya normalizado). El valor puede tener outliers de digitacion (0 = no medido, o topes).', 2)
) x(v_Dominio, v_Objeto, v_Regla, i_Orden)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_regla_negocio r
    WHERE r.v_Dominio = x.v_Dominio AND r.v_Regla = x.v_Regla);
GO

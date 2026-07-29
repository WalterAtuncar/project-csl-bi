-- =====================================================================
-- ddl/25 - NLQ v2 (2a RONDA): sub-dominio 'clinico_antecedentes' (historial del
-- paciente: antecedentes familiares, habitos nocivos, historia medica personal,
-- examenes adicionales, vacunas, historia laboral, odontologia). Tablas CRUDAS
-- de SigesoftDesarrollo_2, CURADAS por verificacion EN VIVO. Fecha: 2026-07-28.
--
-- CURACION (verificado en vivo: row-count por sys.dm_db_partition_stats, PK por
-- INFORMATION_SCHEMA, FK por sys.foreign_keys, FK logicas por poblacion real):
--   TODAS las 8 candidatas estan VIVAS y pobladas, con PK single-column y FK
--   usable a person (y/o service/diseases). Ninguna se descarto por vacia/muerta/
--   sin-FK. Se FLAGEAN dos por baja calidad (no se descartan):
--     - HistorialOdontologico: solo 57 filas (poco poblada).
--     - AntecedenteAsistencial: datos PARAMETRICOS (i_GrupoData/i_ParametroId/
--       i_Valor son ids de catalogo, sin texto); FK a person LOGICA (v_personId).
--   Row-counts: familymedicalantecedents 581728 | noxioushabits 380387 |
--   history 59991 | additionalexam 59277 | personmedicalhistory 9336 |
--   inmunizaciones 4435 | AntecedenteAsistencial 1650 | HistorialOdontologico 57.
--
-- FK DECLARADAS (sys.foreign_keys): v_PersonId->person en family/noxious/
-- personmedical/inmunizaciones/history/HistorialOdontologico; v_DiseasesId->
-- diseases en family/personmedical. FK LOGICAS (no declaradas, columna 100%
-- poblada): additionalexam v_ServiceId->service + v_PersonId->person +
-- v_ComponentId->component; AntecedenteAsistencial v_personId->person.
--
-- Ninguna de estas tablas tiene v_Password (solo person/systemuser) -> N/A.
--
-- ADITIVO schema conta, CERO dbo / CERO SigesoftDesarrollo_2 (solo se LEYO su
-- metadata). Data de CATALOGO PRODUCTIVA -> NO hay RESEED. SQL 2012. IDEMPOTENTE
-- (NOT EXISTS por objeto / (tabla,columna) / (dominio,regla)). UTF-8 SIN BOM (ASCII).
-- =====================================================================


-- #####################################################################
-- 1) nlq_tabla: las 8 tablas de antecedentes.
-- #####################################################################
INSERT INTO conta.nlq_tabla (v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, b_Activa, v_Descripcion)
SELECT x.v_Base, x.v_Schema, x.v_Objeto, x.v_TipoObjeto, x.v_Dominio, 1, x.v_Descripcion
FROM (VALUES
    ('SigesoftDesarrollo_2','dbo','familymedicalantecedents','T','clinico_antecedentes',
     'Antecedentes FAMILIARES del paciente (~581k). v_PersonId->person, v_DiseasesId->diseases (nombre/CIE-10); i_TypeFamilyId = familiar (padre/madre/etc). Soft-delete i_IsDeleted=0. USAR PARA: antecedentes familiares del paciente, enfermedades hereditarias.'),
    ('SigesoftDesarrollo_2','dbo','noxioushabits','T','clinico_antecedentes',
     'Habitos NOCIVOS del paciente (~380k). i_TypeHabitsId = tipo (tabaco/alcohol/drogas), v_Frequency, v_DescriptionHabit. v_PersonId->person. Soft-delete i_IsDeleted=0. USAR PARA: habitos nocivos, tabaquismo, consumo de alcohol, drogas.'),
    ('SigesoftDesarrollo_2','dbo','personmedicalhistory','T','clinico_antecedentes',
     'Historia MEDICA personal / antecedentes patologicos (~9k). v_PersonId->person, v_DiseasesId->diseases; d_StartDate = inicio del antecedente; v_DiagnosticDetail, v_Tratamiento. Soft-delete i_IsDeleted=0. USAR PARA: antecedentes personales/patologicos, enfermedades previas del paciente.'),
    ('SigesoftDesarrollo_2','dbo','additionalexam','T','clinico_antecedentes',
     'Examenes ADICIONALES solicitados en una atencion (~59k). v_ServiceId->service (LOGICA; fecha por service.d_ServiceDate), v_PersonId->person, v_ComponentId->component (examen). Soft-delete i_IsDeleted=0. USAR PARA: examenes adicionales solicitados, examenes fuera de protocolo.'),
    ('SigesoftDesarrollo_2','dbo','inmunizaciones','T','clinico_antecedentes',
     'VACUNAS / inmunizaciones aplicadas (~4k). v_PersonId->person; i_TipoVacuna, i_Marca, v_Lote, d_FechaVacuna = fecha de aplicacion, i_Dosis. Soft-delete i_IsDeleted=0. USAR PARA: vacunas, inmunizaciones aplicadas, dosis y fechas de vacunacion.'),
    ('SigesoftDesarrollo_2','dbo','history','T','clinico_antecedentes',
     'Historia LABORAL / ocupacional del trabajador (~60k). v_PersonId->person; d_StartDate/d_EndDate = periodo, v_Organization = empresa, v_TypeActivity = actividad, v_workstation = puesto. Soft-delete i_IsDeleted=0. USAR PARA: historia laboral, empresas y puestos anteriores, antecedente ocupacional.'),
    ('SigesoftDesarrollo_2','dbo','HistorialOdontologico','T','clinico_antecedentes',
     'Historial ODONTOLOGICO (procedimientos dentales). SOLO ~57 filas (poco poblada). v_PersonId->person; d_Fecha, v_Procedimiento, v_Comentario. Soft-delete i_IsDeleted=0. USAR PARA: historial odontologico, procedimientos dentales.'),
    ('SigesoftDesarrollo_2','dbo','AntecedenteAsistencial','T','clinico_antecedentes',
     'Antecedente ASISTENCIAL del paciente (~1.6k). Datos PARAMETRICOS: i_GrupoData/i_ParametroId/i_Valor son ids de catalogo (no texto; resolver via systemparameter). v_personId->person (LOGICA). Soft-delete i_IsDeleted=0. USAR PARA: antecedentes asistenciales (parametrizados).')
) x(v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, v_Descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_tabla t
    WHERE t.v_Base = x.v_Base AND t.v_Schema = x.v_Schema AND t.v_Objeto = x.v_Objeto);
GO


-- #####################################################################
-- 2) nlq_columna con b_EsPk / b_EsFk / v_FkObjeto.
-- #####################################################################

-- 2.1) familymedicalantecedents
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='familymedicalantecedents') t
CROSS JOIN (VALUES
    ('v_FamilyMedicalAntecedentsId','varchar(16)',1,0,NULL,'PK. Id del antecedente familiar.'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK (DECL) al paciente.'),
    ('v_DiseasesId','varchar(16)',0,1,'dbo.diseases.v_DiseasesId','FK (DECL) a la enfermedad (nombre/CIE-10).'),
    ('i_TypeFamilyId','int',0,0,NULL,'Tipo de familiar (padre, madre, hermano, etc.).'),
    ('v_Comment','varchar(8000)',0,0,NULL,'Comentario/detalle del antecedente.'),
    ('d_InsertDate','datetime2',0,0,NULL,'Fecha de registro (no hay fecha de atencion; es per-persona).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.2) noxioushabits
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='noxioushabits') t
CROSS JOIN (VALUES
    ('v_NoxiousHabitsId','varchar(16)',1,0,NULL,'PK. Id del habito nocivo.'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK (DECL) al paciente.'),
    ('i_TypeHabitsId','int',0,0,NULL,'Tipo de habito: tabaco / alcohol / drogas / etc.'),
    ('v_Frequency','varchar(100)',0,0,NULL,'Frecuencia del habito.'),
    ('v_DescriptionHabit','varchar(200)',0,0,NULL,'Descripcion del habito.'),
    ('v_Comment','varchar(8000)',0,0,NULL,'Comentario/detalle.'),
    ('d_InsertDate','datetime2',0,0,NULL,'Fecha de registro (per-persona).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.3) personmedicalhistory
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='personmedicalhistory') t
CROSS JOIN (VALUES
    ('v_PersonMedicalHistoryId','varchar(16)',1,0,NULL,'PK. Id del antecedente personal.'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK (DECL) al paciente.'),
    ('v_DiseasesId','varchar(16)',0,1,'dbo.diseases.v_DiseasesId','FK (DECL) a la enfermedad (nombre/CIE-10).'),
    ('i_TypeDiagnosticId','int',0,0,NULL,'Tipo de diagnostico/antecedente.'),
    ('d_StartDate','date',0,0,NULL,'Fecha de inicio del antecedente.'),
    ('v_DiagnosticDetail','varchar(8000)',0,0,NULL,'Detalle del diagnostico/antecedente.'),
    ('v_Tratamiento','varchar(8000)',0,0,NULL,'Tratamiento recibido.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.4) additionalexam (FK LOGICAS)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='additionalexam') t
CROSS JOIN (VALUES
    ('v_AdditionalExamId','varchar(16)',1,0,NULL,'PK. Id del examen adicional.'),
    ('v_ServiceId','varchar(16)',0,1,'dbo.service.v_ServiceId','FK LOGICA a la atencion (100% poblado; fecha por service.d_ServiceDate).'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK LOGICA al paciente (100% poblado).'),
    ('v_ComponentId','varchar(16)',0,1,'dbo.component.v_ComponentId','FK LOGICA al examen/servicio del catalogo.'),
    ('v_Commentary','varchar(1000)',0,0,NULL,'Comentario del examen adicional.'),
    ('d_InsertDate','datetime2',0,0,NULL,'Fecha de registro (la fecha clinica sale de service.d_ServiceDate).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.5) inmunizaciones
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='inmunizaciones') t
CROSS JOIN (VALUES
    ('v_VacunacionId','varchar(16)',1,0,NULL,'PK. Id de la vacunacion.'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK (DECL) al paciente.'),
    ('i_TipoVacuna','int',0,0,NULL,'Tipo de vacuna.'),
    ('i_Marca','int',0,0,NULL,'Marca de la vacuna.'),
    ('v_Lote','varchar(50)',0,0,NULL,'Lote.'),
    ('d_FechaVacuna','date',0,0,NULL,'FECHA de aplicacion de la vacuna (usar esta).'),
    ('i_Dosis','int',0,0,NULL,'Numero de dosis.'),
    ('v_Lugar','varchar(100)',0,0,NULL,'Lugar de aplicacion.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.6) history (excluye imagenes b_RubricImage/b_FingerPrintImage/t_RubricImageText)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='history') t
CROSS JOIN (VALUES
    ('v_HistoryId','varchar(16)',1,0,NULL,'PK. Id de la historia laboral.'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK (DECL) al trabajador.'),
    ('d_StartDate','date',0,0,NULL,'Inicio del periodo laboral.'),
    ('d_EndDate','date',0,0,NULL,'Fin del periodo laboral.'),
    ('v_Organization','varchar(250)',0,0,NULL,'Empresa/organizacion donde laboro.'),
    ('v_TypeActivity','varchar(250)',0,0,NULL,'Actividad/rubro.'),
    ('v_workstation','varchar(250)',0,0,NULL,'Puesto de trabajo.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.7) HistorialOdontologico
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='HistorialOdontologico') t
CROSS JOIN (VALUES
    ('v_IdHistorialOdontologico','varchar(16)',1,0,NULL,'PK. Id del historial odontologico.'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK (DECL) al paciente.'),
    ('d_Fecha','datetime2',0,0,NULL,'Fecha del procedimiento odontologico.'),
    ('v_Procedimiento','varchar(1000)',0,0,NULL,'Procedimiento dental realizado.'),
    ('v_Comentario','varchar(max)',0,0,NULL,'Comentario.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.8) AntecedenteAsistencial (FK LOGICA v_personId; datos parametricos)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='AntecedenteAsistencial') t
CROSS JOIN (VALUES
    ('v_AntecendenteAsistencialId','varchar(16)',1,0,NULL,'PK. Id del antecedente asistencial (typo legacy: Antecendente).'),
    ('v_personId','varchar(16)',0,1,'dbo.person.v_PersonId','FK LOGICA al paciente (minuscula p; 100% poblado).'),
    ('i_GrupoData','int',0,0,NULL,'Grupo de dato (id de catalogo; parametrico).'),
    ('i_ParametroId','int',0,0,NULL,'Parametro (id de catalogo systemparameter; parametrico).'),
    ('i_Valor','int',0,0,NULL,'Valor (id de catalogo; parametrico, no texto).'),
    ('d_InsertDate','datetime2',0,0,NULL,'Fecha de registro (per-persona).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO


-- #####################################################################
-- 3) nlq_regla_negocio: reglas del dominio clinico_antecedentes.
-- #####################################################################
INSERT INTO conta.nlq_regla_negocio (v_Dominio, v_Objeto, v_Regla, b_Activa, i_Orden)
SELECT x.v_Dominio, x.v_Objeto, x.v_Regla, 1, x.i_Orden
FROM (VALUES
    ('clinico_antecedentes', NULL,
     'Soft-delete OBLIGATORIO: filtra i_IsDeleted=0 en TODAS (family/noxious/personmedical/additionalexam/inmunizaciones/history/HistorialOdontologico/AntecedenteAsistencial). Son antecedentes PER-PERSONA (v_PersonId->person): NO fuerces una fecha de atencion. La EXCEPCION es additionalexam, que cuelga de una atencion (v_ServiceId->service) -> su fecha clinica = service.d_ServiceDate.', 1),
    ('clinico_antecedentes', NULL,
     'Fecha propia por tabla cuando exista: inmunizaciones.d_FechaVacuna (vacunacion), HistorialOdontologico.d_Fecha, personmedicalhistory.d_StartDate, history.d_StartDate/d_EndDate (periodo laboral). Para el resto, d_InsertDate es la fecha de registro. Evita duplicados con DISTINCT por (v_PersonId, item).', 2),
    ('clinico_antecedentes', 'familymedicalantecedents',
     'Antecedentes familiares: une v_DiseasesId->diseases para el nombre/CIE-10 de la enfermedad; i_TypeFamilyId indica el familiar. Un paciente puede tener varios; usa DISTINCT (v_PersonId, v_DiseasesId) para no duplicar.', 3),
    ('clinico_antecedentes', 'noxioushabits',
     'Habitos nocivos: i_TypeHabitsId = tipo (tabaco/alcohol/drogas); v_Frequency/v_DescriptionHabit describen el consumo. Filtra i_IsDeleted=0.', 4),
    ('clinico_antecedentes', 'personmedicalhistory',
     'Antecedentes personales/patologicos: une v_DiseasesId->diseases (nombre/CIE-10); d_StartDate = inicio; v_Tratamiento = tratamiento. Filtra i_IsDeleted=0.', 5),
    ('clinico_antecedentes', 'additionalexam',
     'Examenes adicionales: cuelgan de una atencion via v_ServiceId->service (fecha = service.d_ServiceDate) y del examen via v_ComponentId->component. Filtra i_IsDeleted=0.', 6),
    ('clinico_antecedentes', 'AntecedenteAsistencial',
     'AntecedenteAsistencial es PARAMETRICO: i_GrupoData/i_ParametroId/i_Valor son ids de catalogo (systemparameter), no texto; requiere resolverlos para dar sentido. FK a person via v_personId (minuscula). Filtra i_IsDeleted=0.', 7)
) x(v_Dominio, v_Objeto, v_Regla, i_Orden)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_regla_negocio r
    WHERE r.v_Dominio = x.v_Dominio AND r.v_Regla = x.v_Regla);
GO

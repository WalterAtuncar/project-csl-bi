-- =====================================================================
-- ddl/21 - NLQ v2 (FASE B-SLICE): siembra la REBANADA nucleo de tablas
-- clinicas CRUDAS de SigesoftDesarrollo_2 en el catalogo conta.nlq_*.
-- Plan: NLQ v2 dominio clinico. Basado en el mapa curado de legacy-negocio
-- (2026-07-28), VERIFICADO EN VIVO (INFORMATION_SCHEMA / sys.foreign_keys)
-- antes de sembrar. Fecha: 2026-07-28.
--
-- ADITIVO schema conta, CERO dbo / CERO SigesoftDesarrollo_2 (solo se LEYO su
-- metadata). Es data de CATALOGO PRODUCTIVA (no de prueba) -> NO hay RESEED.
-- SQL Server 2012: sin CREATE OR ALTER, sin DROP IF EXISTS, sin OPENJSON /
-- STRING_SPLIT / TRIM. IDEMPOTENTE: cada INSERT con NOT EXISTS por clave logica
-- (objeto / (tabla,columna) / (dominio,regla)). UTF-8 SIN BOM (ASCII puro).
--
-- 10 tablas CORE (todas v_Base='SigesoftDesarrollo_2', v_Schema='dbo',
-- v_TipoObjeto='T', b_Activa=1). NOVEDAD FASE B: se pobla b_EsPk / b_EsFk /
-- v_FkObjeto en conta.nlq_columna (el "esqueleto relacional" del retriever).
--
-- Referencias FK cross-DB = TEXTO en v_FkObjeto ('dbo.tabla.columna'): NO hay
-- FK fisica cross-DB (imposible) -> CERO impacto en el modify_date de ninguna
-- tabla dbo/SigesoftDesarrollo_2.
--
-- v_Password (person y systemuser): DELIBERADAMENTE NO SE SIEMBRA (columna
-- SENSIBLE, seria b_Sensible=1 si existiera). Doble barrera: (1) ausente del
-- catalogo -> nunca llega al prompt/allowlist; (2) DENY a nivel motor para el
-- login conta_nlq_reader (maintenance/2026-07-28_login_nlq_reader.sql, TAREA 4).
--
-- Discrepancias mapa vs vivo (verificado 2026-07-28): (a) servicecomponent.
-- v_ComponentId->component SI es FK DECLARADA (mapa OK). (b) diagnosticrepository
-- tiene una FK compuesta EXTRA (v_ComponentId,v_ComponentFieldId)->componentfields
-- (EMR) NO listada en el mapa: fuera del slice, NO se siembra.
-- =====================================================================


-- #####################################################################
-- 1) nlq_tabla: las 10 tablas CORE del slice clinico.
-- #####################################################################
INSERT INTO conta.nlq_tabla (v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, b_Activa, v_Descripcion)
SELECT x.v_Base, x.v_Schema, x.v_Objeto, x.v_TipoObjeto, x.v_Dominio, 1, x.v_Descripcion
FROM (VALUES
    ('SigesoftDesarrollo_2','dbo','service','T','clinico_atencion',
     'Atenciones/consultas clinicas (1 fila por atencion, PK v_ServiceId). Fecha = d_ServiceDate (NUNCA d_InsertDate). Soft-delete i_IsDeleted=0. USAR PARA: atenciones, consultas, nro de atenciones, aptitud, historia clinica.'),
    ('SigesoftDesarrollo_2','dbo','servicecomponent','T','clinico_atencion',
     'Examenes/servicios realizados dentro de una atencion (N por service). El MEDICO real es i_MedicoTratanteId (cobertura ~99.7%). Tabla pesada: acotar por d_InsertDate. USAR PARA: examenes realizados, medico que atendio, servicios por atencion.'),
    ('SigesoftDesarrollo_2','dbo','protocol','T','clinico_atencion',
     'Protocolo/contexto de la atencion: consultorio (i_Consultorio->systemparameter g403), linea de negocio (i_MasterServiceTypeId->systemparameter g119) y empresa/cliente (v_CustomerOrganizationId->organization). USAR PARA: consultorio, empresa/cliente, ocupacional vs asistencial.'),
    ('SigesoftDesarrollo_2','dbo','diagnosticrepository','T','clinico_diagnostico',
     'Diagnosticos por atencion (N por service). Validos = i_FinalQualificationId IN (2,3). Une a diseases por v_DiseasesId. Soft-delete i_IsDeleted=0. USAR PARA: diagnosticos, morbilidad, CIE-10 frecuentes, definitivos/presuntivos.'),
    ('SigesoftDesarrollo_2','dbo','diseases','T','clinico_diagnostico',
     'Catalogo de enfermedades: v_Name (nombre) y v_CIE10Id->cie10 (codigo CIE-10 sin punto). USAR PARA: nombre de enfermedad, unir dx a CIE-10.'),
    ('SigesoftDesarrollo_2','dbo','cie10','T','clinico_diagnostico',
     'Catalogo CIE-10 (raiz). v_CIE10Id sin punto; v_CIE10Description1/2 = descripcion. Capitulos derivables por rango de codigo. USAR PARA: descripcion CIE-10, capitulos, morbilidad.'),
    ('SigesoftDesarrollo_2','dbo','person','T','personas',
     'Persona (paciente o medico), PK v_PersonId. N de Historia Clinica = v_DocNumber. Sexo i_SexTypeId (systemparameter g100). Edad se calcula (no se almacena). Soft-delete i_IsDeleted=0. La columna v_Password es SENSIBLE y esta PROHIBIDA. USAR PARA: paciente/medico/persona, sexo, edad, HC.'),
    ('SigesoftDesarrollo_2','dbo','systemuser','T','usuarios',
     'Usuarios del sistema, PK i_SystemUserId. Resuelve el medico tratante (i_SystemUserId <- servicecomponent.i_MedicoTratanteId) y el autor de registro; v_PersonId->person para el nombre. La columna v_Password es SENSIBLE y esta PROHIBIDA. USAR PARA: resolver medico tratante, autor de registro.'),
    ('SigesoftDesarrollo_2','dbo','systemparameter','T','clinico_catalogos',
     'Catalogo de etiquetas con PK COMPUESTA (i_GroupId,i_ParameterId); etiqueta en v_Value1. USAR PARA: resolver etiquetas -> consultorio(g403), calif dx(g138), estado servicio(g125), linea de negocio(g119), sexo(g100).'),
    ('SigesoftDesarrollo_2','dbo','component','T','clinico_catalogos',
     'Catalogo de examenes/servicios (raiz): v_Name (nombre), i_CategoryId (area/categoria), r_BasePrice. Se une desde servicecomponent.v_ComponentId. USAR PARA: nombre de examen/servicio, area/categoria.')
) x(v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, v_Descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_tabla t
    WHERE t.v_Base = x.v_Base AND t.v_Schema = x.v_Schema AND t.v_Objeto = x.v_Objeto);
GO


-- #####################################################################
-- 2) nlq_columna: columnas del slice con b_EsPk / b_EsFk / v_FkObjeto.
--    v_Password NO se siembra (SENSIBLE, ver header).
-- #####################################################################

-- 2.1) service
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='service') t
CROSS JOIN (VALUES
    ('v_ServiceId','varchar(16)',1,0,NULL,'PK. Id de la atencion (formato N009-SR########).'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK (DECL) al paciente atendido.'),
    ('v_ProtocolId','varchar(16)',0,1,'dbo.protocol.v_ProtocolId','FK (DECL) al protocolo/contexto (consultorio, linea, empresa).'),
    ('d_ServiceDate','datetime2',0,0,NULL,'FECHA de la atencion. USAR SIEMPRE esta (NUNCA d_InsertDate).'),
    ('i_ServiceStatusId','int',0,0,NULL,'Estado del servicio (systemparameter g125). Culminada = 3.'),
    ('i_AptitudeStatusId','int',0,0,NULL,'Estado de aptitud (ocupacional): apto / no apto / con restriccion.'),
    ('v_ComprobantePago','nchar(100)',0,0,NULL,'Comprobante(s) de pago asociado(s) a la atencion (enlace a facturacion).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.2) servicecomponent
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='servicecomponent') t
CROSS JOIN (VALUES
    ('v_ServiceComponentId','varchar(16)',1,0,NULL,'PK. Id del examen/servicio dentro de la atencion.'),
    ('v_ServiceId','varchar(16)',0,1,'dbo.service.v_ServiceId','FK (DECL) a la atencion.'),
    ('v_ComponentId','varchar(16)',0,1,'dbo.component.v_ComponentId','FK (DECL) al examen/servicio del catalogo component.'),
    ('i_MedicoTratanteId','int',0,1,'dbo.systemuser.i_SystemUserId','FK LOGICA al MEDICO real que atendio (cobertura ~99.7%). NUNCA usar service.i_MedicoTratanteId (MUERTA).'),
    ('i_ServiceComponentStatusId','int',0,0,NULL,'Estado del examen/servicio.'),
    ('d_InsertDate','datetime2',0,0,NULL,'Fecha de registro. ACOTAR SIEMPRE por esta al unir (tabla pesada, indices date-first).'),
    ('r_Price','real',0,0,NULL,'Precio del examen/servicio en la atencion.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.3) protocol
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='protocol') t
CROSS JOIN (VALUES
    ('v_ProtocolId','varchar(16)',1,0,NULL,'PK. Id del protocolo/contexto de la atencion.'),
    ('i_MasterServiceTypeId','int',0,1,'dbo.systemparameter.i_ParameterId','FK LOGICA a la LINEA de negocio (systemparameter g119): 1=EMPRESARIAL/ocupacional; 9/42/11/34=asistencial.'),
    ('i_Consultorio','int',0,1,'dbo.systemparameter.i_ParameterId','FK LOGICA al CONSULTORIO (systemparameter g403, 48 hojas).'),
    ('v_CustomerOrganizationId','varchar(16)',0,1,'dbo.organization.v_OrganizationId','FK LOGICA a la empresa/cliente (organization).'),
    ('v_Name','varchar(500)',0,0,NULL,'Nombre/descripcion del protocolo.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.4) diagnosticrepository
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='diagnosticrepository') t
CROSS JOIN (VALUES
    ('v_DiagnosticRepositoryId','varchar(16)',1,0,NULL,'PK. Id del registro de diagnostico.'),
    ('v_ServiceId','varchar(16)',0,1,'dbo.service.v_ServiceId','FK (DECL) a la atencion (para la fecha usar service.d_ServiceDate).'),
    ('v_DiseasesId','varchar(16)',0,1,'dbo.diseases.v_DiseasesId','FK (DECL) a la enfermedad diagnosticada.'),
    ('i_FinalQualificationId','int',0,0,NULL,'Calificacion (systemparameter g138): 2 DEFINITIVO, 3 PRESUNTIVO, 4 DESCARTADO. Dx valido = IN (2,3).'),
    ('i_AutoManualId','int',0,0,NULL,'Origen del dx (systemparameter g136): auto vs manual.'),
    ('d_InsertDate','datetime2',0,0,NULL,'Fecha de registro del dx (NO usar como fecha del dx: usar service.d_ServiceDate).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.5) diseases
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='diseases') t
CROSS JOIN (VALUES
    ('v_DiseasesId','varchar(16)',1,0,NULL,'PK. Id de la enfermedad.'),
    ('v_CIE10Id','varchar(20)',0,1,'dbo.cie10.v_CIE10Id','FK (DECL) al codigo CIE-10 (sin punto).'),
    ('v_Name','varchar(500)',0,0,NULL,'Nombre de la enfermedad.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.6) cie10 (raiz)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='cie10') t
CROSS JOIN (VALUES
    ('v_CIE10Id','varchar(20)',1,0,NULL,'PK. Codigo CIE-10 SIN punto (3-4 chars; capitulos por rango).'),
    ('v_CIE10Description1','varchar(8000)',0,0,NULL,'Descripcion CIE-10 (principal).'),
    ('v_CIE10Description2','varchar(8000)',0,0,NULL,'Descripcion CIE-10 (secundaria/detalle).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.7) person (v_Password NO se siembra: SENSIBLE)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='person') t
CROSS JOIN (VALUES
    ('v_PersonId','varchar(16)',1,0,NULL,'PK. Id de la persona (paciente o medico).'),
    ('v_FirstName','varchar(50)',0,0,NULL,'Nombres.'),
    ('v_FirstLastName','varchar(50)',0,0,NULL,'Apellido paterno.'),
    ('v_SecondLastName','varchar(50)',0,0,NULL,'Apellido materno.'),
    ('v_DocNumber','varchar(20)',0,0,NULL,'Numero de documento = N de Historia Clinica (convencion del sistema).'),
    ('i_SexTypeId','int',0,0,NULL,'Sexo (systemparameter g100).'),
    ('d_Birthdate','date',0,0,NULL,'Fecha de nacimiento. La edad se calcula a la fecha de atencion (no se almacena).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.8) systemuser (v_Password NO se siembra: SENSIBLE)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='systemuser') t
CROSS JOIN (VALUES
    ('i_SystemUserId','int',1,0,NULL,'PK. Id del usuario (medico/autor). Referido por servicecomponent.i_MedicoTratanteId.'),
    ('v_UserName','varchar(100)',0,0,NULL,'Nombre de usuario.'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK (DECL) a la persona (nombre del usuario/medico).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.9) systemparameter (PK COMPUESTA)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='systemparameter') t
CROSS JOIN (VALUES
    ('i_GroupId','int',1,0,NULL,'PK parte 1. Grupo del catalogo (403 consultorio, 119 linea, 138 calif dx, 100 sexo, 125 estado).'),
    ('i_ParameterId','int',1,0,NULL,'PK parte 2. Id del parametro dentro del grupo.'),
    ('v_Value1','varchar(8000)',0,0,NULL,'Etiqueta/valor del parametro (el texto a mostrar).')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.10) component (raiz)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='component') t
CROSS JOIN (VALUES
    ('v_ComponentId','varchar(16)',1,0,NULL,'PK. Id del examen/servicio del catalogo.'),
    ('v_Name','varchar(250)',0,0,NULL,'Nombre del examen/servicio.'),
    ('i_CategoryId','int',0,0,NULL,'Categoria/area del examen/servicio.'),
    ('r_BasePrice','real',0,0,NULL,'Precio base del examen/servicio.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO


-- #####################################################################
-- 3) nlq_regla_negocio: reglas del dominio clinico (texto inyectado al
--    prompt). El dominio DEBE coincidir con el de las tablas (sp_Nlq_
--    CatalogoDetalle RS3 filtra por dominio de las tablas emparejadas).
-- #####################################################################
INSERT INTO conta.nlq_regla_negocio (v_Dominio, v_Objeto, v_Regla, b_Activa, i_Orden)
SELECT x.v_Dominio, x.v_Objeto, x.v_Regla, 1, x.i_Orden
FROM (VALUES
    -- dominio clinico_atencion
    ('clinico_atencion', NULL,
     'Soft-delete OBLIGATORIO: en TODAS las tablas clinicas filtra i_IsDeleted=0 (service, servicecomponent, protocol, diagnosticrepository, diseases, cie10, person, systemuser, component). Nunca traigas filas con i_IsDeleted<>0.', 1),
    ('clinico_atencion', 'service',
     'Una atencion CULMINADA es service.i_ServiceStatusId=3. La FECHA de la atencion es SIEMPRE service.d_ServiceDate (NUNCA d_InsertDate). El numero de atenciones cuenta filas de service con i_IsDeleted=0.', 2),
    ('clinico_atencion', 'servicecomponent',
     'El MEDICO que atendio/realizo el examen es servicecomponent.i_MedicoTratanteId (medico real, cobertura ~99.7%; resuelve a systemuser.i_SystemUserId). NUNCA uses service.i_MedicoTratanteId (columna MUERTA). Al unir service o diagnosticrepository con servicecomponent, ACOTA SIEMPRE por servicecomponent.d_InsertDate (tabla pesada, indices date-first).', 3),
    ('clinico_atencion', 'protocol',
     'El CONSULTORIO de la atencion es protocol.i_Consultorio (etiqueta en systemparameter i_GroupId=403, 48 consultorios). La LINEA/AMBITO de negocio es protocol.i_MasterServiceTypeId (systemparameter i_GroupId=119): ocupacional=1 (EMPRESARIAL); asistencial=9,42,11,34. La empresa/cliente es protocol.v_CustomerOrganizationId -> organization.v_OrganizationId.', 4),
    -- dominio clinico_diagnostico
    ('clinico_diagnostico', NULL,
     'Soft-delete OBLIGATORIO: filtra i_IsDeleted=0 en diagnosticrepository, diseases y cie10 (y en service al unir).', 1),
    ('clinico_diagnostico', 'diagnosticrepository',
     'Un diagnostico VALIDO (definitivo/presuntivo) es diagnosticrepository.i_FinalQualificationId IN (2,3); 4=DESCARTADO se EXCLUYE por default (las plantillas EMO ocupacionales auto-generan descartados). La FECHA del dx = service.d_ServiceDate (une por v_ServiceId), NUNCA d_InsertDate.', 2),
    ('clinico_diagnostico', 'diagnosticrepository',
     'MORBILIDAD sin duplicar: usa DISTINCT sobre (v_ServiceId, v_DiseasesId); existen pares (atencion, enfermedad) DUPLICADOS. El nombre de la enfermedad esta en diseases.v_Name; el codigo/descripcion CIE-10 en cie10 (v_CIE10Id SIN punto).', 3),
    -- dominio personas
    ('personas', 'person',
     'N de Historia Clinica = person.v_DocNumber (convencion del sistema; no hay columna HC propia). La edad NO se almacena: se calcula a la fecha de atencion. El sexo es person.i_SexTypeId (systemparameter i_GroupId=100). Filtra i_IsDeleted=0.', 1),
    ('personas', 'person',
     'PROHIBIDO leer o seleccionar la columna v_Password (person y systemuser): es SENSIBLE, esta FUERA del catalogo y DENEGADA a nivel de motor. Nunca la incluyas en un SELECT.', 2),
    -- dominio usuarios
    ('usuarios', 'systemuser',
     'systemuser resuelve el medico/autor: i_SystemUserId (une con servicecomponent.i_MedicoTratanteId) y v_PersonId -> person para el nombre. PROHIBIDO seleccionar systemuser.v_Password (SENSIBLE, denegada). Filtra i_IsDeleted=0.', 1),
    -- dominio clinico_catalogos
    ('clinico_catalogos', 'systemparameter',
     'systemparameter es catalogo de etiquetas con PK COMPUESTA (i_GroupId, i_ParameterId); la etiqueta esta en v_Value1. Grupos clave: 403=consultorio, 119=linea de negocio, 138=calificacion dx (2 DEFINITIVO,3 PRESUNTIVO,4 DESCARTADO), 100=sexo, 125=estado de servicio. Filtra por i_GroupId para resolver un catalogo.', 1),
    ('clinico_catalogos', 'component',
     'component es el catalogo de examenes/servicios: v_Name (nombre), i_CategoryId (area/categoria), r_BasePrice. Se une desde servicecomponent.v_ComponentId. Filtra i_IsDeleted=0.', 2)
) x(v_Dominio, v_Objeto, v_Regla, i_Orden)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_regla_negocio r
    WHERE r.v_Dominio = x.v_Dominio AND r.v_Regla = x.v_Regla);
GO

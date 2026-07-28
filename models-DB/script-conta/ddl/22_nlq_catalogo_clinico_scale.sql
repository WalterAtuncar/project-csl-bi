-- =====================================================================
-- ddl/22 - NLQ v2 (FASE B-SCALE): siembra el RESTO de tablas CORE clinicas
-- (20 tablas) de SigesoftDesarrollo_2 en el catalogo conta.nlq_*. Continua
-- ddl/21 (slice de 10). Mismo patron: nlq_tabla + nlq_columna (PK/FK/ref) +
-- reglas. Basado en el mapa curado (2026-07-28), VERIFICADO EN VIVO
-- (INFORMATION_SCHEMA / sys.foreign_keys) antes de sembrar. Fecha: 2026-07-28.
--
-- ADITIVO schema conta, CERO dbo / CERO SigesoftDesarrollo_2 (solo se LEYO su
-- metadata). Data de CATALOGO PRODUCTIVA (no de prueba) -> NO hay RESEED.
-- SQL Server 2012. IDEMPOTENTE: cada INSERT con NOT EXISTS por clave logica.
-- UTF-8 SIN BOM (ASCII puro). Referencias FK cross-DB = TEXTO en v_FkObjeto.
-- v_Password NO aplica a ninguna de estas 20 tablas (solo person/systemuser).
--
-- DISCREPANCIAS mapa vs VIVO (corregidas al valor REAL de la BD):
--   * componentfields: PK COMPUESTA (v_ComponentId, v_ComponentFieldId); NO
--     existe la columna v_ComponentFieldsId que decia el mapa.
--   * datahierarchy: PK COMPUESTA (i_GroupId, i_ItemId); etiqueta v_Value1; NO
--     hay v_DataHierarchyId.
--   * recommendation y restriction: ADEMAS de service/diagnosticrepository,
--     tienen FK DECLARADA v_ComponentId->component. El texto maestro es
--     v_MasterRecommendationId (recommendation) y v_MasterRestrictionId
--     (restriction) -> ambos LOGICOS a masterrecommendationrestricction.
--   * hospitalizacion: sin FK fisica (todas logicas); d_FechaIngreso/d_FechaAlta
--     son datetime (no datetime2); dx desnormalizado (ingreso v_CIE10Id/
--     v_DiseasesName, salida v_CIE10IdSalida/v_DiseasesNameSalida).
--   * hospitalizacionhabitacion.v_HopitalizacionId -> hospitalizacion = LOGICA
--     (no declarada); hospitalizacionservice.v_ServiceId -> service = LOGICA.
--   * pacient/professional/componentfields: la PK es TAMBIEN FK (b_EsPk=1 y
--     b_EsFk=1 en la misma columna).
-- Se descartan columnas image: professional.b_SignatureImage, organization.b_Image.
-- =====================================================================


-- #####################################################################
-- 1) nlq_tabla: las 20 tablas CORE de escala.
-- #####################################################################
INSERT INTO conta.nlq_tabla (v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, b_Activa, v_Descripcion)
SELECT x.v_Base, x.v_Schema, x.v_Objeto, x.v_TipoObjeto, x.v_Dominio, 1, x.v_Descripcion
FROM (VALUES
    ('SigesoftDesarrollo_2','dbo','calendar','T','clinico_agenda',
     'Citas / atenciones PROGRAMADAS (agenda). Fecha de la cita = d_DateTimeCalendar. Estado i_CalendarStatusId (systemparameter g122: 1 agendado, 2 atendido, 3 vencido, 4 cancelado, 5 ingreso). Soft-delete i_IsDeleted=0. USAR PARA: citas agendadas, atenciones programadas, canceladas/vencidas.'),
    ('SigesoftDesarrollo_2','dbo','protocolcomponent','T','clinico_atencion',
     'Examenes/servicios de un protocolo/convenio con su precio (v_ProtocolId->protocol, v_ComponentId->component, r_Price). USAR PARA: examenes/precios por protocolo/convenio.'),
    ('SigesoftDesarrollo_2','dbo','recommendation','T','clinico_referencias',
     'Recomendaciones medicas al trabajador. Une a service y diagnosticrepository; texto maestro en masterrecommendationrestricction via v_MasterRecommendationId. Soft-delete i_IsDeleted=0. USAR PARA: recomendaciones medicas al trabajador.'),
    ('SigesoftDesarrollo_2','dbo','restriction','T','clinico_referencias',
     'Restricciones laborales del trabajador. Une a service y diagnosticrepository; texto maestro en masterrecommendationrestricction via v_MasterRestrictionId; vigencia d_StartDateRestriction/d_EndDateRestriction. Soft-delete i_IsDeleted=0. USAR PARA: restricciones laborales.'),
    ('SigesoftDesarrollo_2','dbo','masterrecommendationrestricction','T','clinico_referencias',
     'Catalogo de textos (raiz): v_Name (texto), i_TypifyingId (1 recomendacion, 2 restriccion). USAR PARA: catalogo de recomendaciones y restricciones.'),
    ('SigesoftDesarrollo_2','dbo','hospitalizacion','T','clinico_hospitalizacion',
     'Hospitalizaciones (PK v_HopitalizacionId, typo legacy). FECHA = d_FechaIngreso (NO d_ServiceDate); alta d_FechaAlta. Dx DESNORMALIZADOS: ingreso v_CIE10Id/v_DiseasesName, salida v_CIE10IdSalida/v_DiseasesNameSalida. Soft-delete i_IsDeleted=0. USAR PARA: hospitalizaciones, dx ingreso/egreso, estancia.'),
    ('SigesoftDesarrollo_2','dbo','hospitalizacionservice','T','clinico_hospitalizacion',
     'Puente 1:1 hospitalizacion<->atencion (v_HopitalizacionId->hospitalizacion, v_ServiceId->service). USAR PARA: relacionar hospitalizacion con su atencion/service.'),
    ('SigesoftDesarrollo_2','dbo','hospitalizacionhabitacion','T','clinico_hospitalizacion',
     'Habitacion(es) ocupada(s) en una hospitalizacion (v_HopitalizacionId; d_StartDate/d_EndDate; i_EstateRoom 1 ocupado/2 limpieza/3 libre). Soft-delete i_IsDeleted=0. USAR PARA: habitacion, ocupacion de camas, estancia por habitacion.'),
    ('SigesoftDesarrollo_2','dbo','pacient','T','personas',
     'Marcador de que una person es PACIENTE (PK/FK v_PersonId->person). Soft-delete i_IsDeleted=0. USAR PARA: distinguir pacientes.'),
    ('SigesoftDesarrollo_2','dbo','professional','T','personas',
     'Datos profesionales de una person (medico/personal). PK/FK v_PersonId->person; v_ProfessionalCode (colegiatura/CMP), i_ProfessionId, d_ContractFrom/d_ContractUntil. Soft-delete i_IsDeleted=0. USAR PARA: colegiatura, profesion del medico.'),
    ('SigesoftDesarrollo_2','dbo','medico','T','personas',
     'Configuracion del medico por servicio: i_SystemUserId->systemuser, i_MasterServiceId (linea g119), r_Clinica/r_Medico (% reparto honorario), r_Price, i_CategoryId. Soft-delete i_IsDeleted=0. USAR PARA: % honorario del medico, medicos por servicio.'),
    ('SigesoftDesarrollo_2','dbo','organization','T','organizaciones',
     'Empresas/entidades: i_OrganizationTypeId (1 cliente, 2 generica, 3 propietaria, 4 aseguradora), v_IdentificationNumber (RUC), v_Name (razon social), v_Address. Soft-delete i_IsDeleted=0. USAR PARA: empresa cliente, aseguradora, RUC.'),
    ('SigesoftDesarrollo_2','dbo','organizationperson','T','organizaciones',
     'Vinculo trabajador<->empleadora (v_PersonId->person, v_OrganizationId->organization). Soft-delete i_IsDeleted=0. USAR PARA: empresa empleadora del trabajador, trabajadores de una empresa.'),
    ('SigesoftDesarrollo_2','dbo','groupoccupation','T','organizaciones',
     'Grupo ocupacional / puesto dentro de una sede (v_LocationId->location, v_Name). Soft-delete i_IsDeleted=0. USAR PARA: grupo ocupacional, puesto de trabajo.'),
    ('SigesoftDesarrollo_2','dbo','location','T','organizaciones',
     'Sede / ubicacion de una organization (v_OrganizationId->organization, v_Name). Soft-delete i_IsDeleted=0. USAR PARA: sede, ubicacion de la empresa.'),
    ('SigesoftDesarrollo_2','dbo','componentfield','T','clinico_catalogos',
     'Definicion de un campo de examen EMR (v_TextLabel = etiqueta). Soft-delete i_IsDeleted=0. USAR PARA: campos/parametros de un examen.'),
    ('SigesoftDesarrollo_2','dbo','componentfields','T','clinico_catalogos',
     'Puente examen<->campo EMR con PK COMPUESTA (v_ComponentId->component, v_ComponentFieldId->componentfield). Soft-delete i_IsDeleted=0. USAR PARA: que campos tiene un examen.'),
    ('SigesoftDesarrollo_2','dbo','datahierarchy','T','clinico_catalogos',
     'Catalogo en ARBOL con PK COMPUESTA (i_GroupId, i_ItemId); etiqueta v_Value1, padre i_ParentItemId. Grupo 113 = UBIGEO (dpto->prov->dist). Soft-delete i_IsDeleted=0. USAR PARA: procedencia geografica del paciente, ubigeo.'),
    ('SigesoftDesarrollo_2','dbo','receta','T','clinico_receta',
     'Medicamentos recetados (PK i_IdReceta identity). Une a service (v_ServiceId), dx (v_DiagnosticRepositoryId) y cabecera receipHeader (v_ReceipId); dosis v_Posologia/v_Duracion/d_Cantidad. Soft-delete i_IsDeleted=0. USAR PARA: medicamentos recetados.'),
    ('SigesoftDesarrollo_2','dbo','receipHeader','T','clinico_receta',
     'Cabecera de receta / medico prescriptor (v_ServiceId->service, i_MedicoId->systemuser, v_MedicoName, d_Total). Soft-delete i_IsDeleted=0. USAR PARA: receta cabecera, medico prescriptor.')
) x(v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, v_Descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_tabla t
    WHERE t.v_Base = x.v_Base AND t.v_Schema = x.v_Schema AND t.v_Objeto = x.v_Objeto);
GO


-- #####################################################################
-- 2) nlq_columna (b_EsPk / b_EsFk / v_FkObjeto).
-- #####################################################################

-- 2.1) calendar
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='calendar') t
CROSS JOIN (VALUES
    ('v_CalendarId','varchar(16)',1,0,NULL,'PK. Id de la cita/programacion.'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK (DECL) al paciente citado.'),
    ('v_ServiceId','varchar(16)',0,1,'dbo.service.v_ServiceId','FK (DECL) a la atencion generada (si se atendio).'),
    ('d_DateTimeCalendar','datetime2',0,0,NULL,'Fecha/hora de la cita programada.'),
    ('i_CalendarStatusId','int',0,0,NULL,'Estado (systemparameter g122): 1 agendado, 2 atendido, 3 vencido, 4 cancelado, 5 ingreso.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.2) protocolcomponent
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='protocolcomponent') t
CROSS JOIN (VALUES
    ('v_ProtocolComponentId','varchar(16)',1,0,NULL,'PK. Id del examen dentro del protocolo.'),
    ('v_ProtocolId','varchar(16)',0,1,'dbo.protocol.v_ProtocolId','FK (DECL) al protocolo/convenio.'),
    ('v_ComponentId','varchar(16)',0,1,'dbo.component.v_ComponentId','FK (DECL) al examen/servicio.'),
    ('r_Price','real',0,0,NULL,'Precio del examen en el protocolo.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.3) recommendation
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='recommendation') t
CROSS JOIN (VALUES
    ('v_RecommendationId','varchar(16)',1,0,NULL,'PK. Id de la recomendacion.'),
    ('v_ServiceId','varchar(16)',0,1,'dbo.service.v_ServiceId','FK (DECL) a la atencion.'),
    ('v_DiagnosticRepositoryId','varchar(16)',0,1,'dbo.diagnosticrepository.v_DiagnosticRepositoryId','FK (DECL) al diagnostico asociado.'),
    ('v_ComponentId','varchar(16)',0,1,'dbo.component.v_ComponentId','FK (DECL) al examen/servicio.'),
    ('v_MasterRecommendationId','varchar(16)',0,1,'dbo.masterrecommendationrestricction.v_MasterRecommendationRestricctionId','FK LOGICA al texto maestro (i_TypifyingId=1 recomendacion).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.4) restriction
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='restriction') t
CROSS JOIN (VALUES
    ('v_RestrictionId','varchar(16)',1,0,NULL,'PK. Id de la restriccion.'),
    ('v_ServiceId','varchar(16)',0,1,'dbo.service.v_ServiceId','FK (DECL) a la atencion.'),
    ('v_DiagnosticRepositoryId','varchar(16)',0,1,'dbo.diagnosticrepository.v_DiagnosticRepositoryId','FK (DECL) al diagnostico asociado.'),
    ('v_ComponentId','varchar(16)',0,1,'dbo.component.v_ComponentId','FK (DECL) al examen/servicio.'),
    ('v_MasterRestrictionId','varchar(16)',0,1,'dbo.masterrecommendationrestricction.v_MasterRecommendationRestricctionId','FK LOGICA al texto maestro (i_TypifyingId=2 restriccion).'),
    ('d_StartDateRestriction','date',0,0,NULL,'Inicio de vigencia de la restriccion.'),
    ('d_EndDateRestriction','date',0,0,NULL,'Fin de vigencia de la restriccion.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.5) masterrecommendationrestricction (raiz)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='masterrecommendationrestricction') t
CROSS JOIN (VALUES
    ('v_MasterRecommendationRestricctionId','varchar(16)',1,0,NULL,'PK. Id del texto maestro.'),
    ('v_Name','varchar(8000)',0,0,NULL,'Texto de la recomendacion/restriccion.'),
    ('i_TypifyingId','int',0,0,NULL,'Tipo: 1 recomendacion, 2 restriccion.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.6) hospitalizacion (todas FK logicas; d_Fecha* son datetime)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='hospitalizacion') t
CROSS JOIN (VALUES
    ('v_HopitalizacionId','varchar(16)',1,0,NULL,'PK. Id de la hospitalizacion (typo legacy: Hopitalizacion).'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK LOGICA al paciente hospitalizado.'),
    ('d_FechaIngreso','datetime',0,0,NULL,'FECHA de la hospitalizacion (usar esta, NO d_ServiceDate).'),
    ('d_FechaAlta','datetime',0,0,NULL,'Fecha de alta; estancia = dias entre ingreso y alta.'),
    ('v_CIE10Id','varchar(20)',0,1,'dbo.cie10.v_CIE10Id','FK LOGICA al CIE-10 del dx de INGRESO.'),
    ('v_DiseasesName','varchar(500)',0,0,NULL,'Nombre del dx de INGRESO (desnormalizado).'),
    ('v_CIE10IdSalida','varchar(20)',0,1,'dbo.cie10.v_CIE10Id','FK LOGICA al CIE-10 del dx de SALIDA/EGRESO.'),
    ('v_DiseasesNameSalida','varchar(500)',0,0,NULL,'Nombre del dx de SALIDA/EGRESO (desnormalizado).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.7) hospitalizacionservice
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='hospitalizacionservice') t
CROSS JOIN (VALUES
    ('v_HospitalizacionServiceId','varchar(16)',1,0,NULL,'PK. Id del puente hosp-atencion.'),
    ('v_HopitalizacionId','varchar(16)',0,1,'dbo.hospitalizacion.v_HopitalizacionId','FK (DECL) a la hospitalizacion.'),
    ('v_ServiceId','varchar(16)',0,1,'dbo.service.v_ServiceId','FK LOGICA a la atencion (1:1).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.8) hospitalizacionhabitacion
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='hospitalizacionhabitacion') t
CROSS JOIN (VALUES
    ('v_HospitalizacionHabitacionId','varchar(16)',1,0,NULL,'PK. Id de la ocupacion de habitacion.'),
    ('v_HopitalizacionId','varchar(16)',0,1,'dbo.hospitalizacion.v_HopitalizacionId','FK LOGICA a la hospitalizacion.'),
    ('d_StartDate','datetime',0,0,NULL,'Inicio de ocupacion de la habitacion.'),
    ('d_EndDate','datetime',0,0,NULL,'Fin de ocupacion de la habitacion.'),
    ('i_EstateRoom','int',0,0,NULL,'Estado: 1 ocupado, 2 limpieza, 3 libre.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.9) pacient (v_PersonId es PK y FK)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='pacient') t
CROSS JOIN (VALUES
    ('v_PersonId','varchar(16)',1,1,'dbo.person.v_PersonId','PK y FK (DECL): la person que es paciente.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.10) professional (v_PersonId es PK y FK; b_SignatureImage descartada)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='professional') t
CROSS JOIN (VALUES
    ('v_PersonId','varchar(16)',1,1,'dbo.person.v_PersonId','PK y FK (DECL): la person profesional.'),
    ('i_ProfessionId','int',0,0,NULL,'Profesion del profesional.'),
    ('v_ProfessionalCode','varchar(20)',0,0,NULL,'Codigo de colegiatura (CMP para medicos).'),
    ('d_ContractFrom','datetime2',0,0,NULL,'Inicio de contrato.'),
    ('d_ContractUntil','datetime2',0,0,NULL,'Fin de contrato.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.11) medico (FK logicas)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='medico') t
CROSS JOIN (VALUES
    ('v_MedicoId','varchar(16)',1,0,NULL,'PK. Id de la configuracion medico-servicio.'),
    ('i_SystemUserId','int',0,1,'dbo.systemuser.i_SystemUserId','FK LOGICA al usuario/medico.'),
    ('i_MasterServiceId','int',0,1,'dbo.systemparameter.i_ParameterId','FK LOGICA a la linea/servicio (systemparameter g119).'),
    ('r_Clinica','decimal',0,0,NULL,'% del honorario que retiene la clinica.'),
    ('r_Medico','decimal',0,0,NULL,'% del honorario para el medico.'),
    ('r_Price','decimal',0,0,NULL,'Precio/tarifa base del servicio del medico.'),
    ('i_CategoryId','int',0,0,NULL,'Categoria del servicio.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.12) organization (raiz; b_Image descartada)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='organization') t
CROSS JOIN (VALUES
    ('v_OrganizationId','varchar(16)',1,0,NULL,'PK. Id de la organizacion/empresa.'),
    ('i_OrganizationTypeId','int',0,0,NULL,'Tipo: 1 cliente, 2 generica, 3 propietaria (clinica), 4 aseguradora.'),
    ('v_IdentificationNumber','varchar(20)',0,0,NULL,'RUC / numero de identificacion.'),
    ('v_Name','varchar(250)',0,0,NULL,'Razon social / nombre.'),
    ('v_Address','varchar(250)',0,0,NULL,'Direccion.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.13) organizationperson (FK logicas)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='organizationperson') t
CROSS JOIN (VALUES
    ('v_OrganizationPersonId','varchar(16)',1,0,NULL,'PK. Id del vinculo persona-organizacion.'),
    ('v_PersonId','varchar(16)',0,1,'dbo.person.v_PersonId','FK LOGICA al trabajador.'),
    ('v_OrganizationId','varchar(16)',0,1,'dbo.organization.v_OrganizationId','FK LOGICA a la empresa empleadora.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.14) groupoccupation
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='groupoccupation') t
CROSS JOIN (VALUES
    ('v_GroupOccupationId','varchar(16)',1,0,NULL,'PK. Id del grupo ocupacional/puesto.'),
    ('v_LocationId','varchar(16)',0,1,'dbo.location.v_LocationId','FK (DECL) a la sede/ubicacion.'),
    ('v_Name','varchar(250)',0,0,NULL,'Nombre del grupo ocupacional/puesto.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.15) location
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='location') t
CROSS JOIN (VALUES
    ('v_LocationId','varchar(16)',1,0,NULL,'PK. Id de la sede/ubicacion.'),
    ('v_OrganizationId','varchar(16)',0,1,'dbo.organization.v_OrganizationId','FK (DECL) a la organizacion/empresa.'),
    ('v_Name','varchar(250)',0,0,NULL,'Nombre de la sede.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.16) componentfield (raiz)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='componentfield') t
CROSS JOIN (VALUES
    ('v_ComponentFieldId','varchar(16)',1,0,NULL,'PK. Id de la definicion del campo EMR.'),
    ('v_TextLabel','varchar(250)',0,0,NULL,'Etiqueta/nombre del campo.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.17) componentfields (PK COMPUESTA; ambas cols son PK y FK)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='componentfields') t
CROSS JOIN (VALUES
    ('v_ComponentId','varchar(16)',1,1,'dbo.component.v_ComponentId','PK parte 1 y FK (DECL) al examen.'),
    ('v_ComponentFieldId','varchar(16)',1,1,'dbo.componentfield.v_ComponentFieldId','PK parte 2 y FK (DECL) a la definicion del campo.'),
    ('v_Group','varchar(250)',0,0,NULL,'Agrupacion del campo dentro del examen.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.18) datahierarchy (PK COMPUESTA, raiz)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='datahierarchy') t
CROSS JOIN (VALUES
    ('i_GroupId','int',1,0,NULL,'PK parte 1. Grupo del catalogo (113 = ubigeo).'),
    ('i_ItemId','int',1,0,NULL,'PK parte 2. Id del item dentro del grupo.'),
    ('v_Value1','varchar(200)',0,0,NULL,'Etiqueta/valor del item (texto a mostrar).'),
    ('i_ParentItemId','int',0,0,NULL,'Item padre (arbol: dpto->prov->dist).'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.19) receta (PK identity; FK logicas)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='receta') t
CROSS JOIN (VALUES
    ('i_IdReceta','int',1,0,NULL,'PK (identity). Id de la linea de receta.'),
    ('v_DiagnosticRepositoryId','varchar(16)',0,1,'dbo.diagnosticrepository.v_DiagnosticRepositoryId','FK LOGICA al diagnostico.'),
    ('v_ServiceId','varchar(16)',0,1,'dbo.service.v_ServiceId','FK LOGICA a la atencion.'),
    ('v_ReceipId','varchar(16)',0,1,'dbo.receipHeader.v_ReceipId','FK LOGICA a la cabecera de receta.'),
    ('d_Cantidad','decimal',0,0,NULL,'Cantidad del medicamento.'),
    ('v_Posologia','varchar(150)',0,0,NULL,'Posologia/indicaciones.'),
    ('v_Duracion','varchar(150)',0,0,NULL,'Duracion del tratamiento.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 2.20) receipHeader (FK logicas)
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.b_EsPk, x.b_EsFk, x.v_FkObjeto, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='SigesoftDesarrollo_2' AND v_Schema='dbo' AND v_Objeto='receipHeader') t
CROSS JOIN (VALUES
    ('v_ReceipId','varchar(16)',1,0,NULL,'PK. Id de la cabecera de receta.'),
    ('v_ServiceId','varchar(16)',0,1,'dbo.service.v_ServiceId','FK LOGICA a la atencion.'),
    ('i_MedicoId','int',0,1,'dbo.systemuser.i_SystemUserId','FK LOGICA al medico prescriptor.'),
    ('v_MedicoName','varchar(250)',0,0,NULL,'Nombre del medico prescriptor (desnormalizado).'),
    ('d_Total','real',0,0,NULL,'Total de la receta.'),
    ('i_IsDeleted','int',0,0,NULL,'Soft-delete: 0 = vigente. Filtrar i_IsDeleted=0.')
) x(v_Columna, v_TipoDato, b_EsPk, b_EsFk, v_FkObjeto, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO


-- #####################################################################
-- 3) nlq_regla_negocio: reglas de los dominios nuevos.
-- #####################################################################
INSERT INTO conta.nlq_regla_negocio (v_Dominio, v_Objeto, v_Regla, b_Activa, i_Orden)
SELECT x.v_Dominio, x.v_Objeto, x.v_Regla, 1, x.i_Orden
FROM (VALUES
    -- clinico_hospitalizacion
    ('clinico_hospitalizacion', NULL,
     'Soft-delete i_IsDeleted=0. La FECHA de hospitalizacion es hospitalizacion.d_FechaIngreso (NUNCA d_ServiceDate ni d_InsertDate); el alta es d_FechaAlta; la estancia = dias entre ambas.', 1),
    ('clinico_hospitalizacion', 'hospitalizacion',
     'Los diagnosticos de hospitalizacion NO estan en diagnosticrepository: viven DESNORMALIZADOS en hospitalizacion. Dx de INGRESO = v_CIE10Id + v_DiseasesName; dx de SALIDA/EGRESO = v_CIE10IdSalida + v_DiseasesNameSalida (unir a cie10 para la descripcion del codigo).', 2),
    ('clinico_hospitalizacion', 'hospitalizacionservice',
     'hospitalizacionservice es el puente 1:1 hospitalizacion<->service (v_HopitalizacionId, v_ServiceId). Una atencion es hospitalizacion si EXISTS en hospitalizacionservice. Ojo typo legacy: la columna es v_HopitalizacionId (sin s).', 3),
    -- clinico_agenda
    ('clinico_agenda', 'calendar',
     'La FECHA de una cita/atencion programada es calendar.d_DateTimeCalendar. El estado es i_CalendarStatusId (systemparameter g122): 1=AGENDADO, 2=ATENDIDO, 3=VENCIDO, 4=CANCELADO, 5=INGRESO. Filtra i_IsDeleted=0. Distingue agenda (programado) de service (atencion realizada).', 1),
    -- clinico_referencias
    ('clinico_referencias', 'masterrecommendationrestricction',
     'masterrecommendationrestricction es el catalogo de textos: i_TypifyingId=1 RECOMENDACION, 2 RESTRICCION. recommendation (recomendaciones medicas) y restriction (restricciones laborales) se unen a service (v_ServiceId) y diagnosticrepository (v_DiagnosticRepositoryId); el texto maestro via recommendation.v_MasterRecommendationId / restriction.v_MasterRestrictionId. Filtra i_IsDeleted=0.', 1),
    -- organizaciones
    ('organizaciones', 'organization',
     'organization es la empresa/entidad: i_OrganizationTypeId (1=CLIENTE, 2=GENERICA, 3=PROPIETARIA/clinica, 4=ASEGURADORA); v_IdentificationNumber=RUC; v_Name=razon social. La empresa EMPLEADORA de un trabajador se resuelve via organizationperson (v_PersonId<->v_OrganizationId). Filtra i_IsDeleted=0.', 1),
    ('organizaciones', 'location',
     'location = sede/ubicacion de una organization (v_OrganizationId). groupoccupation = grupo ocupacional/puesto dentro de una location (v_LocationId). Filtra i_IsDeleted=0.', 2),
    -- clinico_receta
    ('clinico_receta', 'receta',
     'receta = medicamentos recetados (PK i_IdReceta, identity). Se une a la atencion (v_ServiceId), al dx (v_DiagnosticRepositoryId) y a la cabecera receipHeader (v_ReceipId). Dosis en v_Posologia/v_Duracion/d_Cantidad. receipHeader trae el medico prescriptor (i_MedicoId->systemuser, v_MedicoName) y d_Total. Filtra i_IsDeleted=0.', 1),
    -- clinico_catalogos (amplia el dominio ya existente)
    ('clinico_catalogos', 'datahierarchy',
     'datahierarchy es un catalogo en ARBOL con PK COMPUESTA (i_GroupId, i_ItemId); etiqueta en v_Value1, padre en i_ParentItemId. Grupo 113 = UBIGEO (departamento->provincia->distrito), usado para la PROCEDENCIA geografica del paciente. Filtra i_IsDeleted=0.', 3),
    ('clinico_catalogos', 'componentfields',
     'componentfields (PK COMPUESTA v_ComponentId+v_ComponentFieldId) es el puente examen<->campo EMR: relaciona component con componentfield (definicion del campo, v_TextLabel). Filtra i_IsDeleted=0.', 4)
) x(v_Dominio, v_Objeto, v_Regla, i_Orden)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_regla_negocio r
    WHERE r.v_Dominio = x.v_Dominio AND r.v_Regla = x.v_Regla);
GO

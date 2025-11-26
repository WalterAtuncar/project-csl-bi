// =============================================================================
// ENUMS DEFINITIONS
// =============================================================================

export enum ServiceTypeId {
    EMPRESARIAL = 1,
    PARTICULAR = 9,
    SEGUROS = 11,
    MTC = 34,
    SISOL = 42
}

export enum ServiceId {
    EXAMEN_SALUD_OCUPACIONAL = 2,
    CONSULTA_MEDICA_EMPRESARIAL = 3,
    CONSULTA_MEDICA_PARTICULAR = 10,
    SEGUROS_SEGUROS = 12,
    SEGUROS_HOSPI = 13,
    ECOGRAFIAS_PARTICULAR = 15,
    HON_MED_NO_QUIRURGICOS = 16,
    HONORARIOS_PORCENTUALES = 17,
    HONORARIOS_QUIRURGICOS = 18,
    HOSPITALIZACION = 19,
    LABORATORIO_PARTICULAR = 20,
    PATOLOGIA = 21,
    RAYOS_X_PARTICULAR = 22,
    PROCEDIMIENTOS_PARTICULAR = 23,
    INTERCONSULTAS = 24,
    SERVICIOS = 25,
    ODONTOLOGIA = 26,
    CLINICA_ABIERTA = 27,
    TOPICO_PARTICULAR = 28,
    PARTOS = 29,
    SALA_DE_OPERACIONES = 30,
    EMERGENCIA_PARTICULAR = 31,
    OFTALMOLOGIA = 32,
    DOCUMENTOS = 33,
    CONDUCTOR_NUEVO = 35,
    CONDUCTOR_REVALIDACION = 36,
    CONDUCTOR_RECATEGORIZACION = 37,
    CONDUCTOR_CANJE_EXTRANJERO = 38,
    URGENCIA = 39,
    RMN_PARTICULAR = 40,
    TOMOGRAFIA_PARTICULAR = 41,
    CONSULTA_MEDICA_SISOL = 43,
    PROCEDIMIENTOS_SISOL = 44,
    RAYOS_X_SISOL = 45,
    ECOGRAFIAS_SISOL = 46,
    RMN_SISOL = 47,
    LABORATORIO_SISOL = 48,
    TOMOGRAFIA_SISOL = 49,
    TOPICO_SISOL = 50,
    EMERGENCIA_SISOL = 51
}

export enum CalendarStatusId {
    AGENDADO = 1,
    ATENDIDO = 2,
    VENCIDO = 3,
    CANCELADO = 4,
    INGRESO = 5
}

export enum LineStatusId {
    EN_CIRCUITO = 1,
    FUERA_DE_CIRCUITO = 2
}

export enum CategoryId {
    Farmacia = 0,
    Laboratorio = 1,
    Odontologia = 2,
    Cardiologia = 5,
    RayosX = 6,
    Psicologia = 7,
    Triaje = 10,
    Medicina = 11,
    Inmunizaciones = 13,
    Oftalmologia = 14,
    Audiometria = 15,
    Espirometria = 16,
    RxLumbar = 18,
    LaboratorioC = 19,
    ClinicaAbierta = 20,
    Psicosensometrico = 22,
    Recepcion = 23,
    Toxicologico = 24,
    Procedimientos = 25,
    HonorariosMedicosNoQuirurgicos = 26,
    HonorariosPorcentuales = 27,
    HonorariosQuirurgicos = 28,
    Hospitalizacion = 29,
    Interconsultas = 30,
    Patologia = 31,
    Servicios = 33,
    SOP = 34,
    Topico = 36,
    UsoDeEquipos = 37,
    Otros = 38,
    Endocrinologia = 39
}

export enum FinalQualificationId {
    SinCalificar = 1,
    Definitivo = 2,
    Presuntivo = 3,
    Descartado = 4
}

export enum TypifyingId {
    Recomendacion = 1,
    Restriccion = 2
}

export enum DocTypeId {
    DNI = 1,
    Pasaporte = 2,
    LicenciaDeConducir = 3,
    CarnetDeExtranjeria = 4
}

export enum SexTypeId {
    Masculino = 1,
    Femenino = 2
}

export enum MaritalStatusId {
    Soltero = 1,
    Casado = 2,
    Viudo = 3,
    Divorciado = 4,
    Conviviente = 5
}

export enum LevelOfId {
    Analfabeto = 1,
    PrimariaIncompleta = 2,
    PrimariaCompleta = 3,
    SecundariaIncompleta = 4,
    SecundariaCompleta = 5,
    Tecnico = 6,
    Universitario = 7,
    TecnicoIncompleto = 8,
    UniversitarioIncompleto = 9,
    PostGrado = 10,
    Doctorado = 11
}

export enum Consultorio {
    MedicinaGeneral = 1,
    MedicinaInterna = 2,
    CirugiaGeneral = 3,
    GinecoObstetricia = 4,
    Pediatria = 5,
    Cardiologia = 6,
    Otorrinolaringologia = 7,
    ResonanciaMagnetica = 8,
    Ocupacional = 9,
    Laboratorio = 10,
    Neumologia = 11,
    Gastroenterologia = 12,
    Traumatologia = 13,
    CabezaYCuello = 14,
    Cardiovascular = 15,
    CirugiaPlastica = 16,
    Dermatologia = 17,
    Geriatria = 18,
    Neurocirugia = 19,
    Neurologia = 20,
    Nutricion = 21,
    Odontologia = 22,
    Oftalmologia = 23,
    Oncologia = 24,
    Psicologia = 25,
    MedicinaFisicaYRehabilitacion = 26,
    Urologia = 27,
    ProcedimientosCardiologicos = 28,
    Endocrinologia = 29,
    MedicinaTropicalEInfectologia = 30,
    Nefrologia = 31,
    Psiquiatria = 32,
    MedicamentosEmpresa = 33,
    Vacunas = 34,
    Radiologia = 35,
    Ecografia = 36,
    Reumatologia = 37,
    Topico = 38,
    Mamografia = 39,
    Tomografia = 40,
    Podologia = 41,
    Masoterapia = 42,
    RayosX = 43,
    CirugiaPediatrica = 44,
    Traslados = 45,
    Hospitalizacion = 46,
    EmergenciaMedicinaGeneral = 47
}

export enum EsoTypeId {
    Otros = 0,
    PreOcupacional = 1,
    PeriodicoOAnual = 2,
    DeRetiro = 3,
    Preventivo = 4,
    Reubicacion = 5,
    Chequeo = 6,
    Visita = 7,
    Altura = 8,
    SuficienciaMedica = 9,
    Psicosensometrico = 10,
    Audiometria = 11,
    Laboratorio = 12,
    RayosX = 13,
    Procedimientos = 14,
    Ecografia = 15,
    CopiaDeExamen = 16,
    Espirometria = 17,
    Documentos = 18,
    MTCProfesional = 19,
    MTCNoProfesional = 20,
    MetalesPesados = 21,
    Urgencia = 22,
    Reevaluacion = 23,
    Psicologia = 24,
    ConsultorioExterno = 25
}

export enum ServiceStatusId {
    PorIniciar = 1,
    Iniciado = 2,
    Culminado = 3,
    Incompleto = 4,
    Cancelado = 5,
    EsperandoAptitud = 6
}

export enum AptitudeStatusId {
    SinAptitud = 1,
    Apto = 2,
    NoApto = 3,
    Observado = 4,
    AptoConRestricciones = 5,
    Asistencial = 6,
    Evaluado = 7,
    NoAptoTemporal = 9,
    PorReevaluar = 10,
    NoRealizado = 11
}

export enum EstateRoom {
    Ocupado = 1,
    EnLimpieza = 2,
    Libre = 3
}

export enum OrganizationTypeId {
    OrganizacionCliente = 1,
    OrganizacionGenerica = 2,
    OrganizacionPropietaria = 3,
    Aseguradora = 4
}

export enum ServiceComponentStatusId {
    PorIniciar = 1,
    Iniciado = 2,
    Culminado = 3,
    PorReevaluar = 4,
    NoRealizado = 5,
    PorAprobacion = 6,
    Exonerado = 7,
    EnviarAEspecialista = 8
}

export enum IdMedioPago {
    DepositoEnCuenta = 1,
    Giro = 2,
    TransferenciaFondos = 3,
    OrdenDePago = 4,
    TarjetaDebito = 5,
    TarjetaCredito = 6,
    ChequesConClausulaNoNegociable = 7,
    EfectivoSinObligacionMedioPago = 8,
    EfectivoDemasOperaciones = 9,
    MediosPagoComercioExterior = 10,
    LetrasDeCambio = 11,
    TransferenciasComercioExterior = 12,
    ChequesBancariosComercioExterior = 13,
    OrdenPagoSimpleComercioExterior = 14,
    OrdenPagoDocumentarioComercioExterior = 15,
    RemesaSimpleComercioExterior = 16,
    RemesaDocumentariaComercioExterior = 17,
    CartaCreditoSimpleComercioExterior = 18,
    CartaCreditoDocumentarioComercioExterior = 19,
    OtrosMediosPago = 20
}

export enum IdMoneda {
    Soles = 1,
    Dolares = 2
}

export enum IdEstadoCobranza {
    Anulado = 0,
    Activo = 1
}

export enum IdFormaPago {
    EfectivoSoles = 1,
    Visa = 2,
    Mastercard = 3,
    NotaDeCredito = 4,
    Adelanto = 5,
    Cheque = 6,
    VisaDolares = 7,
    NotaDeCreditoDolares = 8,
    Deposito = 9,
    EfectivoDolares = 10,
    Adelanto2 = 11
}

export enum IdCondicionPago {
    Contado = 1,
    Credito = 2,
    Cheque = 3,
    Contraentrega = 4,
    Deposito = 5,
    LetraDeCambio = 6
}

export enum EstadoSunat {
    PENDIENTE = 0,
    CDR_ACEPTADO = 1,
    CDR_ACEPTADO_CON_OBSERV = 2,
    CDR_RECHAZADO = 3,
    DE_BAJA = 4,
    DE_BAJA_CDR_ACEPTADO = 5,
    DE_BAJA_CDR_RECHAZADO = 6,
    ENVIADO_ANTERIORMENTE = 7,
    ERROR_RECEPCION_ENVIO = 8,
    ENVIADO_POR_CONSULTAR_ESTADO = 9,
    ERROR_RECEPCION_BAJA = 10
}

export enum TipoServicio {
    Empresarial = 1,
    Particular = 2,
    Farmacia = 3,
    SegurosFarmacia = 4,
    SegurosPaciente = 5,
    SegurosFacturacion = 6,
    MTC = 7,
    Ginecologia = 8,
    RehabilitacionTerapia = 9,
    HospSolidaridad = 10
}

export enum TipoDestinoDocumento {
    Ingreso = 1,
    Egreso = 2
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type FieldType = 'varchar' | 'nvarchar' | 'nchar' | 'int' | 'datetime' | 'datetime2' | 'date' | 'decimal' | 'real' | 'smallint';

export interface FieldDefinition {
    type: FieldType;
    length?: number;
    precision?: number;
    scale?: number;
    nullable: boolean;
    isIdentity?: boolean;
    enumRef?: string;
}

export interface TableDefinition {
    name: string;
    database: string;
    schema: string;
    fullName: string;
    fields: Record<string, FieldDefinition>;
    primaryKey: string[];
    foreignKeys: Record<string, {
        referencedTable: string;
        referencedField: string;
    }>;
    relatedEnums: Record<string, object>;
}

// =============================================================================
// DATABASE SCHEMA DEFINITION
// =============================================================================

export const DatabaseSchema: Record<string, TableDefinition> = {
    // =========================================================================
    // MEDICAL DATABASE - SigesoftDesarrollo_2
    // =========================================================================
    
    'SigesoftDesarrollo_2.dbo.calendar': {
        name: 'calendar',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[calendar]',
        fields: {
            v_CalendarId: { type: 'varchar', length: 16, nullable: false },
            v_PersonId: { type: 'varchar', length: 16, nullable: true },
            v_ServiceId: { type: 'varchar', length: 16, nullable: true },
            d_DateTimeCalendar: { type: 'datetime2', precision: 7, nullable: true },
            d_CircuitStartDate: { type: 'datetime2', precision: 7, nullable: true },
            i_ServiceTypeId: { type: 'int', nullable: true, enumRef: 'ServiceTypeId' },
            i_CalendarStatusId: { type: 'int', nullable: true, enumRef: 'CalendarStatusId' },
            i_ServiceId: { type: 'int', nullable: true, enumRef: 'ServiceId' },
            v_ProtocolId: { type: 'varchar', length: 16, nullable: true },
            i_LineStatusId: { type: 'int', nullable: true, enumRef: 'LineStatusId' },
            i_IsDeleted: { type: 'int', nullable: true },
            i_InsertUserId: { type: 'int', nullable: true },
            d_InsertDate: { type: 'datetime2', precision: 7, nullable: true }
        },
        primaryKey: ['v_CalendarId'],
        foreignKeys: {
            v_PersonId: { referencedTable: 'SigesoftDesarrollo_2.dbo.person', referencedField: 'v_PersonId' },
            v_ServiceId: { referencedTable: 'SigesoftDesarrollo_2.dbo.service', referencedField: 'v_ServiceId' }
        },
        relatedEnums: {
            i_ServiceTypeId: ServiceTypeId,
            i_CalendarStatusId: CalendarStatusId,
            i_ServiceId: ServiceId,
            i_LineStatusId: LineStatusId
        }
    },

    'SigesoftDesarrollo_2.dbo.cie10': {
        name: 'cie10',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[cie10]',
        fields: {
            v_CIE10Id: { type: 'varchar', length: 20, nullable: false },
            v_CIE10Description1: { type: 'varchar', length: 8000, nullable: true },
            v_CIE10Description2: { type: 'varchar', length: 8000, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true }
        },
        primaryKey: ['v_CIE10Id'],
        foreignKeys: {},
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.component': {
        name: 'component',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[component]',
        fields: {
            v_ComponentId: { type: 'varchar', length: 16, nullable: false },
            v_Name: { type: 'varchar', length: 250, nullable: true },
            i_CategoryId: { type: 'int', nullable: true, enumRef: 'CategoryId' },
            r_BasePrice: { type: 'real', nullable: true },
            i_IsDeleted: { type: 'int', nullable: true }
        },
        primaryKey: ['v_ComponentId'],
        foreignKeys: {},
        relatedEnums: {
            i_CategoryId: CategoryId
        }
    },

    'SigesoftDesarrollo_2.dbo.componentfield': {
        name: 'componentfield',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[componentfield]',
        fields: {
            v_ComponentFieldId: { type: 'varchar', length: 16, nullable: false },
            v_TextLabel: { type: 'varchar', length: 250, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true }
        },
        primaryKey: ['v_ComponentFieldId'],
        foreignKeys: {},
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.componentfields': {
        name: 'componentfields',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[componentfields]',
        fields: {
            v_ComponentId: { type: 'varchar', length: 16, nullable: false },
            v_ComponentFieldId: { type: 'varchar', length: 16, nullable: false },
            v_Group: { type: 'varchar', length: 250, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true }
        },
        primaryKey: ['v_ComponentId', 'v_ComponentFieldId'],
        foreignKeys: {
            v_ComponentId: { referencedTable: 'SigesoftDesarrollo_2.dbo.component', referencedField: 'v_ComponentId' },
            v_ComponentFieldId: { referencedTable: 'SigesoftDesarrollo_2.dbo.componentfield', referencedField: 'v_ComponentFieldId' }
        },
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.diagnosticrepository': {
        name: 'diagnosticrepository',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[diagnosticrepository]',
        fields: {
            v_DiagnosticRepositoryId: { type: 'varchar', length: 16, nullable: false },
            v_ServiceId: { type: 'varchar', length: 16, nullable: true },
            v_DiseasesId: { type: 'varchar', length: 16, nullable: true },
            v_ComponentId: { type: 'varchar', length: 16, nullable: true },
            v_ComponentFieldId: { type: 'varchar', length: 16, nullable: true },
            i_FinalQualificationId: { type: 'int', nullable: true, enumRef: 'FinalQualificationId' },
            i_IsDeleted: { type: 'int', nullable: true },
            i_InsertUserId: { type: 'int', nullable: true },
            d_InsertDate: { type: 'datetime2', precision: 7, nullable: true }
        },
        primaryKey: ['v_DiagnosticRepositoryId'],
        foreignKeys: {
            v_ServiceId: { referencedTable: 'SigesoftDesarrollo_2.dbo.service', referencedField: 'v_ServiceId' },
            v_DiseasesId: { referencedTable: 'SigesoftDesarrollo_2.dbo.diseases', referencedField: 'v_DiseasesId' }
        },
        relatedEnums: {
            i_FinalQualificationId: FinalQualificationId
        }
    },

    'SigesoftDesarrollo_2.dbo.diseases': {
        name: 'diseases',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[diseases]',
        fields: {
            v_DiseasesId: { type: 'varchar', length: 16, nullable: false },
            v_CIE10Id: { type: 'varchar', length: 20, nullable: true },
            v_Name: { type: 'varchar', length: 500, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true }
        },
        primaryKey: ['v_DiseasesId'],
        foreignKeys: {
            v_CIE10Id: { referencedTable: 'SigesoftDesarrollo_2.dbo.cie10', referencedField: 'v_CIE10Id' }
        },
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.hospitalizacion': {
        name: 'hospitalizacion',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[hospitalizacion]',
        fields: {
            v_HopitalizacionId: { type: 'varchar', length: 16, nullable: false },
            v_PersonId: { type: 'varchar', length: 16, nullable: true },
            d_FechaIngreso: { type: 'datetime', nullable: true },
            d_FechaAlta: { type: 'datetime', nullable: true },
            v_Comentario: { type: 'varchar', length: 250, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true },
            i_InsertUserId: { type: 'int', nullable: true }
        },
        primaryKey: ['v_HopitalizacionId'],
        foreignKeys: {},
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.hospitalizacionhabitacion': {
        name: 'hospitalizacionhabitacion',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[hospitalizacionhabitacion]',
        fields: {
            v_HospitalizacionHabitacionId: { type: 'varchar', length: 16, nullable: false },
            v_HopitalizacionId: { type: 'varchar', length: 16, nullable: true },
            i_HabitacionId: { type: 'int', nullable: true },
            d_StartDate: { type: 'datetime', nullable: true },
            d_EndDate: { type: 'datetime', nullable: true },
            i_IsDeleted: { type: 'int', nullable: true },
            i_InsertUserId: { type: 'int', nullable: true },
            d_InsertDate: { type: 'datetime2', precision: 7, nullable: true },
            i_EstateRoom: { type: 'int', nullable: true, enumRef: 'EstateRoom' }
        },
        primaryKey: ['v_HospitalizacionHabitacionId'],
        foreignKeys: {},
        relatedEnums: {
            i_EstateRoom: EstateRoom
        }
    },

    'SigesoftDesarrollo_2.dbo.hospitalizacionservice': {
        name: 'hospitalizacionservice',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[hospitalizacionservice]',
        fields: {
            v_HospitalizacionServiceId: { type: 'varchar', length: 16, nullable: false },
            v_HopitalizacionId: { type: 'varchar', length: 16, nullable: true },
            v_ServiceId: { type: 'varchar', length: 16, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true },
            i_InsertUserId: { type: 'int', nullable: true }
        },
        primaryKey: ['v_HospitalizacionServiceId'],
        foreignKeys: {
            v_HopitalizacionId: { referencedTable: 'SigesoftDesarrollo_2.dbo.hospitalizacion', referencedField: 'v_HopitalizacionId' }
        },
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.masterrecommendationrestricction': {
        name: 'masterrecommendationrestricction',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[masterrecommendationrestricction]',
        fields: {
            v_MasterRecommendationRestricctionId: { type: 'varchar', length: 16, nullable: false },
            v_Name: { type: 'varchar', length: 8000, nullable: true },
            i_TypifyingId: { type: 'int', nullable: true, enumRef: 'TypifyingId' },
            i_IsDeleted: { type: 'int', nullable: true }
        },
        primaryKey: ['v_MasterRecommendationRestricctionId'],
        foreignKeys: {},
        relatedEnums: {
            i_TypifyingId: TypifyingId
        }
    },

    'SigesoftDesarrollo_2.dbo.organization': {
        name: 'organization',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[organization]',
        fields: {
            v_OrganizationId: { type: 'varchar', length: 16, nullable: false },
            i_OrganizationTypeId: { type: 'int', nullable: true, enumRef: 'OrganizationTypeId' },
            v_IdentificationNumber: { type: 'varchar', length: 20, nullable: true },
            v_Name: { type: 'varchar', length: 250, nullable: true }
        },
        primaryKey: ['v_OrganizationId'],
        foreignKeys: {},
        relatedEnums: {
            i_OrganizationTypeId: OrganizationTypeId
        }
    },

    'SigesoftDesarrollo_2.dbo.pacient': {
        name: 'pacient',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[pacient]',
        fields: {
            v_PersonId: { type: 'varchar', length: 16, nullable: false },
            i_IsDeleted: { type: 'int', nullable: true }
        },
        primaryKey: ['v_PersonId'],
        foreignKeys: {
            v_PersonId: { referencedTable: 'SigesoftDesarrollo_2.dbo.person', referencedField: 'v_PersonId' }
        },
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.person': {
        name: 'person',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[person]',
        fields: {
            v_PersonId: { type: 'varchar', length: 16, nullable: false },
            v_FirstName: { type: 'varchar', length: 50, nullable: true },
            v_FirstLastName: { type: 'varchar', length: 50, nullable: true },
            v_SecondLastName: { type: 'varchar', length: 50, nullable: true },
            i_DocTypeId: { type: 'int', nullable: true, enumRef: 'DocTypeId' },
            v_DocNumber: { type: 'varchar', length: 20, nullable: true },
            d_Birthdate: { type: 'date', nullable: true },
            v_BirthPlace: { type: 'varchar', length: 100, nullable: true },
            i_SexTypeId: { type: 'int', nullable: true, enumRef: 'SexTypeId' },
            i_MaritalStatusId: { type: 'int', nullable: true, enumRef: 'MaritalStatusId' },
            i_LevelOfId: { type: 'int', nullable: true, enumRef: 'LevelOfId' },
            i_IsDeleted: { type: 'int', nullable: true },
            i_InsertUserId: { type: 'int', nullable: true }
        },
        primaryKey: ['v_PersonId'],
        foreignKeys: {},
        relatedEnums: {
            i_DocTypeId: DocTypeId,
            i_SexTypeId: SexTypeId,
            i_MaritalStatusId: MaritalStatusId,
            i_LevelOfId: LevelOfId
        }
    },

    'SigesoftDesarrollo_2.dbo.professional': {
        name: 'professional',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[professional]',
        fields: {
            v_PersonId: { type: 'varchar', length: 16, nullable: false },
            i_ProfessionId: { type: 'int', nullable: true },
            v_ProfessionalCode: { type: 'varchar', length: 20, nullable: true },
            v_ProfessionalInformation: { type: 'varchar', length: 100, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true }
        },
        primaryKey: ['v_PersonId'],
        foreignKeys: {
            v_PersonId: { referencedTable: 'SigesoftDesarrollo_2.dbo.person', referencedField: 'v_PersonId' }
        },
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.protocol': {
        name: 'protocol',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[protocol]',
        fields: {
            v_ProtocolId: { type: 'varchar', length: 16, nullable: false },
            v_Name: { type: 'varchar', length: 500, nullable: true },
            v_EmployerOrganizationId: { type: 'varchar', length: 16, nullable: true },
            v_EmployerLocationId: { type: 'varchar', length: 16, nullable: true },
            i_EsoTypeId: { type: 'int', nullable: true, enumRef: 'EsoTypeId' },
            v_CustomerOrganizationId: { type: 'varchar', length: 16, nullable: true },
            v_WorkingOrganizationId: { type: 'varchar', length: 16, nullable: true },
            i_MasterServiceTypeId: { type: 'int', nullable: true },
            i_MasterServiceId: { type: 'int', nullable: true },
            i_IsDeleted: { type: 'int', nullable: true },
            i_InsertUserId: { type: 'int', nullable: true },
            d_InsertDate: { type: 'datetime2', precision: 7, nullable: true },
            v_AseguradoraOrganizationId: { type: 'nvarchar', length: 16, nullable: true },
            i_Consultorio: { type: 'int', nullable: true, enumRef: 'Consultorio' }
        },
        primaryKey: ['v_ProtocolId'],
        foreignKeys: {},
        relatedEnums: {
            i_EsoTypeId: EsoTypeId,
            i_Consultorio: Consultorio,
            i_MasterServiceTypeId: ServiceTypeId
        }
    },

    'SigesoftDesarrollo_2.dbo.protocolcomponent': {
        name: 'protocolcomponent',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[protocolcomponent]',
        fields: {
            v_ProtocolComponentId: { type: 'varchar', length: 16, nullable: false },
            v_ProtocolId: { type: 'varchar', length: 16, nullable: true },
            v_ComponentId: { type: 'varchar', length: 16, nullable: true },
            r_Price: { type: 'real', nullable: true },
            i_IsDeleted: { type: 'int', nullable: true },
            i_InsertUserId: { type: 'int', nullable: true },
            d_InsertDate: { type: 'datetime2', precision: 7, nullable: true }
        },
        primaryKey: ['v_ProtocolComponentId'],
        foreignKeys: {
            v_ProtocolId: { referencedTable: 'SigesoftDesarrollo_2.dbo.protocol', referencedField: 'v_ProtocolId' },
            v_ComponentId: { referencedTable: 'SigesoftDesarrollo_2.dbo.component', referencedField: 'v_ComponentId' }
        },
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.receipHeader': {
        name: 'receipHeader',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[receipHeader]',
        fields: {
            v_ReceipId: { type: 'varchar', length: 16, nullable: false },
            v_ServiceId: { type: 'varchar', length: 16, nullable: true },
            i_MedicoId: { type: 'int', nullable: true },
            v_MedicoName: { type: 'varchar', length: 250, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true },
            v_diaxrepositoryId: { type: 'varchar', length: 16, nullable: true }
        },
        primaryKey: ['v_ReceipId'],
        foreignKeys: {},
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.receta': {
        name: 'receta',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[receta]',
        fields: {
            i_IdReceta: { type: 'int', nullable: false, isIdentity: true },
            v_DiagnosticRepositoryId: { type: 'varchar', length: 16, nullable: true },
            d_Cantidad: { type: 'decimal', precision: 18, scale: 4, nullable: true },
            v_Posologia: { type: 'varchar', length: 150, nullable: true },
            v_Duracion: { type: 'varchar', length: 150, nullable: true },
            t_FechaFin: { type: 'datetime', nullable: true },
            v_IdProductoDetalle: { type: 'varchar', length: 16, nullable: true },
            v_Lote: { type: 'nvarchar', length: 30, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true },
            v_ReceipId: { type: 'varchar', length: 16, nullable: true }
        },
        primaryKey: ['i_IdReceta'],
        foreignKeys: {},
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.recommendation': {
        name: 'recommendation',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[recommendation]',
        fields: {
            v_RecommendationId: { type: 'varchar', length: 16, nullable: false },
            v_ServiceId: { type: 'varchar', length: 16, nullable: true },
            v_DiagnosticRepositoryId: { type: 'varchar', length: 16, nullable: true },
            v_ComponentId: { type: 'varchar', length: 16, nullable: true },
            v_MasterRecommendationId: { type: 'varchar', length: 16, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true },
            i_InsertUserId: { type: 'int', nullable: true }
        },
        primaryKey: ['v_RecommendationId'],
        foreignKeys: {
            v_ServiceId: { referencedTable: 'SigesoftDesarrollo_2.dbo.service', referencedField: 'v_ServiceId' },
            v_DiagnosticRepositoryId: { referencedTable: 'SigesoftDesarrollo_2.dbo.diagnosticrepository', referencedField: 'v_DiagnosticRepositoryId' },
            v_ComponentId: { referencedTable: 'SigesoftDesarrollo_2.dbo.component', referencedField: 'v_ComponentId' }
        },
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.restriction': {
        name: 'restriction',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[restriction]',
        fields: {
            v_RestrictionId: { type: 'varchar', length: 16, nullable: false },
            v_DiagnosticRepositoryId: { type: 'varchar', length: 16, nullable: true },
            v_ServiceId: { type: 'varchar', length: 16, nullable: true },
            v_ComponentId: { type: 'varchar', length: 16, nullable: true },
            v_MasterRestrictionId: { type: 'varchar', length: 16, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true },
            i_InsertUserId: { type: 'int', nullable: true }
        },
        primaryKey: ['v_RestrictionId'],
        foreignKeys: {
            v_ServiceId: { referencedTable: 'SigesoftDesarrollo_2.dbo.service', referencedField: 'v_ServiceId' },
            v_DiagnosticRepositoryId: { referencedTable: 'SigesoftDesarrollo_2.dbo.diagnosticrepository', referencedField: 'v_DiagnosticRepositoryId' },
            v_ComponentId: { referencedTable: 'SigesoftDesarrollo_2.dbo.component', referencedField: 'v_ComponentId' }
        },
        relatedEnums: {}
    },

    'SigesoftDesarrollo_2.dbo.service': {
        name: 'service',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[service]',
        fields: {
            v_ServiceId: { type: 'varchar', length: 16, nullable: false },
            v_ProtocolId: { type: 'varchar', length: 16, nullable: true },
            v_PersonId: { type: 'varchar', length: 16, nullable: true },
            i_MasterServiceId: { type: 'int', nullable: true },
            i_ServiceStatusId: { type: 'int', nullable: true, enumRef: 'ServiceStatusId' },
            v_Motive: { type: 'varchar', length: 250, nullable: true },
            i_AptitudeStatusId: { type: 'int', nullable: true, enumRef: 'AptitudeStatusId' },
            d_ServiceDate: { type: 'datetime2', precision: 7, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true },
            i_InsertUserId: { type: 'int', nullable: true },
            d_InsertDate: { type: 'datetime2', precision: 7, nullable: true },
            i_MedicoTratanteId: { type: 'int', nullable: true },
            v_ComprobantePago: { type: 'nchar', length: 100, nullable: true }
        },
        primaryKey: ['v_ServiceId'],
        foreignKeys: {
            v_PersonId: { referencedTable: 'SigesoftDesarrollo_2.dbo.person', referencedField: 'v_PersonId' },
            v_ProtocolId: { referencedTable: 'SigesoftDesarrollo_2.dbo.protocol', referencedField: 'v_ProtocolId' }
        },
        relatedEnums: {
            i_ServiceStatusId: ServiceStatusId,
            i_AptitudeStatusId: AptitudeStatusId
        }
    },

    'SigesoftDesarrollo_2.dbo.servicecomponent': {
        name: 'servicecomponent',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[servicecomponent]',
        fields: {
            v_ServiceComponentId: { type: 'varchar', length: 16, nullable: false },
            v_ServiceId: { type: 'varchar', length: 16, nullable: true },
            v_ComponentId: { type: 'varchar', length: 16, nullable: true },
            i_ServiceComponentStatusId: { type: 'int', nullable: true, enumRef: 'ServiceComponentStatusId' }
        },
        primaryKey: ['v_ServiceComponentId'],
        foreignKeys: {
            v_ServiceId: { referencedTable: 'SigesoftDesarrollo_2.dbo.service', referencedField: 'v_ServiceId' },
            v_ComponentId: { referencedTable: 'SigesoftDesarrollo_2.dbo.component', referencedField: 'v_ComponentId' }
        },
        relatedEnums: {
            i_ServiceComponentStatusId: ServiceComponentStatusId
        }
    },

    'SigesoftDesarrollo_2.dbo.systemuser': {
        name: 'systemuser',
        database: 'SigesoftDesarrollo_2',
        schema: 'dbo',
        fullName: '[SigesoftDesarrollo_2].[dbo].[systemuser]',
        fields: {
            i_SystemUserId: { type: 'int', nullable: false },
            v_PersonId: { type: 'varchar', length: 16, nullable: true },
            v_UserName: { type: 'varchar', length: 100, nullable: true },
            i_IsDeleted: { type: 'int', nullable: true }
        },
        primaryKey: ['i_SystemUserId'],
        foreignKeys: {
            v_PersonId: { referencedTable: 'SigesoftDesarrollo_2.dbo.person', referencedField: 'v_PersonId' }
        },
        relatedEnums: {}
    },

    // =========================================================================
    // SALES DATABASE - 20505310072
    // =========================================================================

    '20505310072.dbo.almacen': {
        name: 'almacen',
        database: '20505310072',
        schema: 'dbo',
        fullName: '[20505310072].[dbo].[almacen]',
        fields: {
            i_IdAlmacen: { type: 'int', nullable: false },
            v_Nombre: { type: 'varchar', length: 250, nullable: true },
            i_Eliminado: { type: 'int', nullable: true },
            i_ValidarStockAlmacen: { type: 'int', nullable: true },
            v_Ubigueo: { type: 'varchar', length: 10, nullable: true }
        },
        primaryKey: ['i_IdAlmacen'],
        foreignKeys: {},
        relatedEnums: {}
    },

    '20505310072.dbo.cobranza': {
        name: 'cobranza',
        database: '20505310072',
        schema: 'dbo',
        fullName: '[20505310072].[dbo].[cobranza]',
        fields: {
            v_IdCobranza: { type: 'nchar', length: 16, nullable: false },
            v_Periodo: { type: 'nchar', length: 4, nullable: true },
            i_IdEstablecimiento: { type: 'int', nullable: true },
            i_IdTipoDocumento: { type: 'int', nullable: true },
            v_Mes: { type: 'nchar', length: 4, nullable: true },
            v_Correlativo: { type: 'nvarchar', length: 8, nullable: true },
            t_FechaRegistro: { type: 'datetime', nullable: true },
            d_TipoCambio: { type: 'decimal', precision: 18, scale: 4, nullable: true },
            i_IdMedioPago: { type: 'int', nullable: true, enumRef: 'IdMedioPago' },
            v_Nombre: { type: 'nvarchar', length: 150, nullable: true },
            v_Glosa: { type: 'nvarchar', length: 250, nullable: true },
            i_IdMoneda: { type: 'int', nullable: true, enumRef: 'IdMoneda' },
            i_IdEstado: { type: 'int', nullable: true, enumRef: 'IdEstadoCobranza' },
            d_TotalSoles: { type: 'decimal', precision: 18, scale: 2, nullable: true },
            d_TotalDolares: { type: 'decimal', precision: 18, scale: 2, nullable: true },
            i_Eliminado: { type: 'int', nullable: true },
            i_InsertaIdUsuario: { type: 'int', nullable: true }
        },
        primaryKey: ['v_IdCobranza'],
        foreignKeys: {},
        relatedEnums: {
            i_IdMedioPago: IdMedioPago,
            i_IdMoneda: IdMoneda,
            i_IdEstado: IdEstadoCobranza
        }
    },

    '20505310072.dbo.cobranzadetalle': {
        name: 'cobranzadetalle',
        database: '20505310072',
        schema: 'dbo',
        fullName: '[20505310072].[dbo].[cobranzadetalle]',
        fields: {
            v_IdCobranzaDetalle: { type: 'nchar', length: 16, nullable: false },
            v_IdCobranza: { type: 'nchar', length: 16, nullable: true },
            v_IdVenta: { type: 'nchar', length: 16, nullable: true },
            i_IdFormaPago: { type: 'int', nullable: true, enumRef: 'IdFormaPago' },
            d_NetoXCobrar: { type: 'decimal', precision: 18, scale: 2, nullable: true },
            d_ImporteSoles: { type: 'decimal', precision: 18, scale: 2, nullable: true },
            d_ImporteDolares: { type: 'decimal', precision: 18, scale: 2, nullable: true },
            i_Eliminado: { type: 'int', nullable: true },
            i_InsertaIdUsuario: { type: 'int', nullable: true },
            t_InsertaFecha: { type: 'datetime', nullable: true }
        },
        primaryKey: ['v_IdCobranzaDetalle'],
        foreignKeys: {
            v_IdCobranza: { referencedTable: '20505310072.dbo.cobranza', referencedField: 'v_IdCobranza' }
        },
        relatedEnums: {
            i_IdFormaPago: IdFormaPago
        }
    },

    '20505310072.dbo.documento': {
        name: 'documento',
        database: '20505310072',
        schema: 'dbo',
        fullName: '[20505310072].[dbo].[documento]',
        fields: {
            i_CodigoDocumento: { type: 'int', nullable: false },
            v_Nombre: { type: 'varchar', length: 50, nullable: true },
            v_Siglas: { type: 'varchar', length: 5, nullable: true },
            i_UsadoVentas: { type: 'int', nullable: true },
            i_Destino: { type: 'int', nullable: true, enumRef: 'TipoDestinoDocumento' },
            i_Eliminado: { type: 'int', nullable: true }
        },
        primaryKey: ['i_CodigoDocumento'],
        foreignKeys: {},
        relatedEnums: {
            i_Destino: TipoDestinoDocumento
        }
    },

    '20505310072.dbo.producto': {
        name: 'producto',
        database: '20505310072',
        schema: 'dbo',
        fullName: '[20505310072].[dbo].[producto]',
        fields: {
            v_IdProducto: { type: 'varchar', length: 16, nullable: false },
            v_CodInterno: { type: 'varchar', length: 20, nullable: true },
            v_Descripcion: { type: 'varchar', length: 800, nullable: true },
            v_Descripcion2: { type: 'varchar', length: 120, nullable: true },
            i_EsServicio: { type: 'int', nullable: true },
            d_PrecioVenta: { type: 'decimal', precision: 18, scale: 7, nullable: true },
            d_PrecioCosto: { type: 'decimal', precision: 18, scale: 7, nullable: true },
            i_Eliminado: { type: 'int', nullable: true },
            i_InsertaIdUsuario: { type: 'int', nullable: true }
        },
        primaryKey: ['v_IdProducto'],
        foreignKeys: {},
        relatedEnums: {}
    },

    '20505310072.dbo.productoalmacen': {
        name: 'productoalmacen',
        database: '20505310072',
        schema: 'dbo',
        fullName: '[20505310072].[dbo].[productoalmacen]',
        fields: {
            v_IdProductoAlmacen: { type: 'varchar', length: 16, nullable: false },
            i_IdAlmacen: { type: 'int', nullable: false },
            v_Periodo: { type: 'nchar', length: 4, nullable: true },
            v_ProductoDetalleId: { type: 'varchar', length: 16, nullable: true },
            d_StockActual: { type: 'decimal', precision: 18, scale: 7, nullable: true },
            i_Eliminado: { type: 'int', nullable: true }
        },
        primaryKey: ['v_IdProductoAlmacen'],
        foreignKeys: {
            i_IdAlmacen: { referencedTable: '20505310072.dbo.almacen', referencedField: 'i_IdAlmacen' }
        },
        relatedEnums: {}
    },

    '20505310072.dbo.systemuser': {
        name: 'systemuser',
        database: '20505310072',
        schema: 'dbo',
        fullName: '[20505310072].[dbo].[systemuser]',
        fields: {
            i_SystemUserId: { type: 'int', nullable: false },
            i_PersonId: { type: 'int', nullable: true },
            v_UserName: { type: 'varchar', length: 100, nullable: true }
        },
        primaryKey: ['i_SystemUserId'],
        foreignKeys: {},
        relatedEnums: {}
    },

    '20505310072.dbo.venta': {
        name: 'venta',
        database: '20505310072',
        schema: 'dbo',
        fullName: '[20505310072].[dbo].[venta]',
        fields: {
            v_IdVenta: { type: 'nchar', length: 16, nullable: false },
            v_Periodo: { type: 'nchar', length: 4, nullable: false },
            v_Mes: { type: 'nchar', length: 4, nullable: true },
            v_CorrelativoDocumentoFin: { type: 'nvarchar', length: 20, nullable: true },
            i_ClienteEsAgente: { type: 'int', nullable: true, enumRef: 'TipoServicio' },
            t_FechaRegistro: { type: 'datetime', nullable: true },
            d_TipoCambio: { type: 'decimal', precision: 18, scale: 4, nullable: true },
            i_IdCondicionPago: { type: 'int', nullable: true, enumRef: 'IdCondicionPago' },
            v_Concepto: { type: 'nvarchar', length: 250, nullable: true },
            i_IdMoneda: { type: 'int', nullable: true, enumRef: 'IdMoneda' },
            d_Valor: { type: 'decimal', precision: 18, scale: 4, nullable: true },
            d_IGV: { type: 'decimal', precision: 18, scale: 4, nullable: true },
            d_Total: { type: 'decimal', precision: 18, scale: 4, nullable: true },
            i_Eliminado: { type: 'int', nullable: true },
            i_EstadoSunat: { type: 'smallint', nullable: true, enumRef: 'EstadoSunat' }
        },
        primaryKey: ['v_IdVenta'],
        foreignKeys: {},
        relatedEnums: {
            i_ClienteEsAgente: TipoServicio,
            i_IdCondicionPago: IdCondicionPago,
            i_IdMoneda: IdMoneda,
            i_EstadoSunat: EstadoSunat
        }
    },

    '20505310072.dbo.ventadetalle': {
        name: 'ventadetalle',
        database: '20505310072',
        schema: 'dbo',
        fullName: '[20505310072].[dbo].[ventadetalle]',
        fields: {
            v_IdVentaDetalle: { type: 'nchar', length: 16, nullable: false },
            v_IdVenta: { type: 'nchar', length: 16, nullable: true },
            i_IdAlmacen: { type: 'int', nullable: true },
            v_IdProductoDetalle: { type: 'nchar', length: 16, nullable: true },
            v_DescripcionProducto: { type: 'nvarchar', length: 2000, nullable: true },
            d_Cantidad: { type: 'decimal', precision: 21, scale: 7, nullable: true },
            d_ValorVenta: { type: 'decimal', precision: 18, scale: 4, nullable: true },
            d_Igv: { type: 'decimal', precision: 18, scale: 4, nullable: true },
            d_PrecioVenta: { type: 'decimal', precision: 18, scale: 4, nullable: true },
            i_Eliminado: { type: 'int', nullable: true },
            i_InsertaIdUsuario: { type: 'int', nullable: true }
        },
        primaryKey: ['v_IdVentaDetalle'],
        foreignKeys: {
            v_IdVenta: { referencedTable: '20505310072.dbo.venta', referencedField: 'v_IdVenta' }
        },
        relatedEnums: {}
    }
};

// =============================================================================
// CROSS-DATABASE RELATIONSHIPS
// =============================================================================

export interface CrossDatabaseRelationship {
    sourceTable: string;
    sourceField: string;
    targetTable: string;
    targetField: string;
    relationshipType: 'pipe-separated' | 'direct';
    description: string;
}

export const CrossDatabaseRelationships: CrossDatabaseRelationship[] = [
    {
        sourceTable: 'SigesoftDesarrollo_2.dbo.service',
        sourceField: 'v_ComprobantePago',
        targetTable: '20505310072.dbo.venta',
        targetField: 'v_CorrelativoDocumentoFin',
        relationshipType: 'pipe-separated',
        description: 'Service receipts linked to sales with pipe-separated format'
    }
];

// =============================================================================
// EXPORT ALL ENUMS FOR EASY ACCESS
// =============================================================================

export const AllEnums = {
    ServiceTypeId,
    ServiceId,
    CalendarStatusId,
    LineStatusId,
    CategoryId,
    FinalQualificationId,
    TypifyingId,
    DocTypeId,
    SexTypeId,
    MaritalStatusId,
    LevelOfId,
    Consultorio,
    EsoTypeId,
    ServiceStatusId,
    AptitudeStatusId,
    EstateRoom,
    OrganizationTypeId,
    ServiceComponentStatusId,
    IdMedioPago,
    IdMoneda,
    IdEstadoCobranza,
    IdFormaPago,
    IdCondicionPago,
    EstadoSunat,
    TipoServicio,
    TipoDestinoDocumento
};
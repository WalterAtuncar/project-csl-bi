// Interfaces TypeScript para la estructura de tablas

interface FieldDefinition {
    type: 'varchar' | 'int' | 'datetime2' | 'date' | 'decimal' | 'real' | 'float' | 'nchar' | 'nvarchar' | 'datetime' | 'smallint' | 'char';
    length?: number;
    precision?: number;
    scale?: number;
    nullable: boolean;
  }
  
  interface ForeignKeyDefinition {
    referencedTable: string;
    referencedField: string;
    selectFields?: {
      fieldName: string;
      aliasName: string;
    }[];
  }
  
  interface SystemParameterJoinDefinition {
    table: 'systemparameter';
    alias: string;
    joinField: 'i_ParameterId';
    condition: string;
    selectFields: {
      fieldName: string;
      aliasName: string;
    }[];
  }
  
  interface CustomJoinStep {
    table: string;
    alias: string;
    joinField: string;
    sourceField?: string;
    selectFields?: {
      fieldName: string;
      aliasName: string;
    }[];
  }
  
  interface CustomJoinDefinition {
    type: 'nested';
    joins: CustomJoinStep[];
  }
  
  interface TableStructure {
    name: string;
    database: string;
    schema: string;
    fullName: string;
    fields: Record<string, FieldDefinition>;
    primaryKey: string[];
    foreignKeys: Record<string, ForeignKeyDefinition>;
    systemParameterJoins: Record<string, SystemParameterJoinDefinition>;
    customJoins?: Record<string, CustomJoinDefinition>;
  }
  
  interface DatabaseStructure {
    [tableName: string]: TableStructure;
  }
  
  // Objeto principal con tipado TypeScript
  const tablesStructure: DatabaseStructure = {
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
              i_ServiceTypeId: { type: 'int', nullable: true },
              i_CalendarStatusId: { type: 'int', nullable: true },
              i_ServiceId: { type: 'int', nullable: true },
              v_ProtocolId: { type: 'varchar', length: 16, nullable: true },
              i_LineStatusId: { type: 'int', nullable: true },
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['v_CalendarId'],
          foreignKeys: {
              v_PersonId: { referencedTable: 'SigesoftDesarrollo_2.dbo.person', referencedField: 'v_PersonId' },
              v_ServiceId: { referencedTable: 'SigesoftDesarrollo_2.dbo.service', referencedField: 'v_ServiceId' }
          },
          systemParameterJoins: {
              i_ServiceTypeId: { 
                  table: 'systemparameter', 
                  alias: 'ServiceType', 
                  joinField: 'i_ParameterId',
                  condition: 'i_GroupId = 119',
                  selectFields: [
                      { fieldName: 'v_Value1', aliasName: 'ServiceTypeName' }
                  ]
              },
              i_CalendarStatusId: { 
                  table: 'systemparameter', 
                  alias: 'CalendarStatus', 
                  joinField: 'i_ParameterId',
                  condition: 'i_GroupId = 122',
                  selectFields: [
                      { fieldName: 'v_Value1', aliasName: 'CalendarStatusName' }
                  ]
              },
              i_ServiceId: { 
                  table: 'systemparameter', 
                  alias: 'Service', 
                  joinField: 'i_ParameterId',
                  condition: 'i_GroupId = 119',
                  selectFields: [
                      { fieldName: 'v_Value1', aliasName: 'ServiceName' }
                  ]
              },
              i_LineStatusId: { 
                  table: 'systemparameter', 
                  alias: 'LineStatus', 
                  joinField: 'i_ParameterId',
                  condition: 'i_GroupId = 120',
                  selectFields: [
                      { fieldName: 'v_Value1', aliasName: 'LineStatusName' }
                  ]
              }
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
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['v_CIE10Id'],
          foreignKeys: {},
          systemParameterJoins: {}
      },
  
      'SigesoftDesarrollo_2.dbo.component': {
          name: 'component',
          database: 'SigesoftDesarrollo_2',
          schema: 'dbo',
          fullName: '[SigesoftDesarrollo_2].[dbo].[component]',
          fields: {
              v_ComponentId: { type: 'varchar', length: 16, nullable: false },
              v_Name: { type: 'varchar', length: 250, nullable: true },
              i_CategoryId: { type: 'int', nullable: true },
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['v_ComponentId'],
          foreignKeys: {},
          systemParameterJoins: {
              i_CategoryId: { 
                  table: 'systemparameter', 
                  alias: 'Category', 
                  joinField: 'i_ParameterId',
                  condition: 'i_GroupId = 116',
                  selectFields: [
                      { fieldName: 'v_Value1', aliasName: 'CategoryName' }
                  ]
              }
          }
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
              i_FinalQualificationId: { type: 'int', nullable: true },
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['v_DiagnosticRepositoryId'],
          foreignKeys: {
              v_ServiceId: { referencedTable: 'SigesoftDesarrollo_2.dbo.service', referencedField: 'v_ServiceId' },
              v_DiseasesId: { referencedTable: 'SigesoftDesarrollo_2.dbo.diseases', referencedField: 'v_DiseasesId' },
              v_ComponentId: { referencedTable: 'SigesoftDesarrollo_2.dbo.component', referencedField: 'v_ComponentId' }
          },
          systemParameterJoins: {
              i_FinalQualificationId: { 
                  table: 'systemparameter', 
                  alias: 'PreQualification', 
                  joinField: 'i_ParameterId',
                  condition: 'i_GroupId = 138',
                  selectFields: [
                      { fieldName: 'v_Value1', aliasName: 'FinalQualificationName' }
                  ]
              }
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
              v_CIE10Id: { 
                  referencedTable: 'SigesoftDesarrollo_2.dbo.cie10', 
                  referencedField: 'v_CIE10Id',
                  selectFields: [
                      { fieldName: 'v_CIE10Description1', aliasName: 'CIE10Description' }
                  ]
              }
          },
          systemParameterJoins: {}
      },
  
      'SigesoftDesarrollo_2.dbo.groupoccupation': {
          name: 'groupoccupation',
          database: 'SigesoftDesarrollo_2',
          schema: 'dbo',
          fullName: '[SigesoftDesarrollo_2].[dbo].[groupoccupation]',
          fields: {
              v_GroupOccupationId: { type: 'varchar', length: 16, nullable: false },
              v_Name: { type: 'varchar', length: 250, nullable: true },
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['v_GroupOccupationId'],
          foreignKeys: {},
          systemParameterJoins: {}
      },
  
      'SigesoftDesarrollo_2.dbo.organization': {
          name: 'organization',
          database: 'SigesoftDesarrollo_2',
          schema: 'dbo',
          fullName: '[SigesoftDesarrollo_2].[dbo].[organization]',
          fields: {
              v_OrganizationId: { type: 'varchar', length: 16, nullable: false },
              v_IdentificationNumber: { type: 'varchar', length: 20, nullable: true },
              v_Name: { type: 'varchar', length: 250, nullable: true },
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['v_OrganizationId'],
          foreignKeys: {},
          systemParameterJoins: {}
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
              i_DocTypeId: { type: 'int', nullable: true },
              v_DocNumber: { type: 'varchar', length: 20, nullable: true },
              d_Birthdate: { type: 'date', nullable: true },
              i_SexTypeId: { type: 'int', nullable: true },
              i_MaritalStatusId: { type: 'int', nullable: true },
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['v_PersonId'],
          foreignKeys: {},
          systemParameterJoins: {}
      },
  
      'SigesoftDesarrollo_2.dbo.protocol': {
          name: 'protocol',
          database: 'SigesoftDesarrollo_2',
          schema: 'dbo',
          fullName: '[SigesoftDesarrollo_2].[dbo].[protocol]',
          fields: {
              v_ProtocolId: { type: 'varchar', length: 16, nullable: false },
              v_Name: { type: 'varchar', length: 500, nullable: true },
              v_CustomerOrganizationId: { type: 'varchar', length: 16, nullable: true },
              i_EsoTypeId: { type: 'int', nullable: true },
              v_GroupOccupationId: { type: 'varchar', length: 16, nullable: true },
              i_MasterServiceTypeId: { type: 'int', nullable: true },
              i_MasterServiceId: { type: 'int', nullable: true },
              i_Consultorio: { type: 'int', nullable: true },
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['v_ProtocolId'],
          foreignKeys: {
              v_GroupOccupationId: { referencedTable: 'SigesoftDesarrollo_2.dbo.groupoccupation', referencedField: 'v_GroupOccupationId' }
          },
          systemParameterJoins: {
              i_EsoTypeId: { 
                  table: 'systemparameter', 
                  alias: 'EsoType', 
                  joinField: 'i_ParameterId',
                  condition: 'i_GroupId = 118',
                  selectFields: [
                      { fieldName: 'v_Value1', aliasName: 'EsoTypeName' }
                  ]
              },
              i_MasterServiceTypeId: { 
                  table: 'systemparameter', 
                  alias: 'ServiceType', 
                  joinField: 'i_ParameterId',
                  condition: 'i_GroupId = 119',
                  selectFields: [
                      { fieldName: 'v_Value1', aliasName: 'MasterServiceTypeName' }
                  ]
              },
              i_MasterServiceId: { 
                  table: 'systemparameter', 
                  alias: 'Service', 
                  joinField: 'i_ParameterId',
                  condition: 'i_GroupId = 119',
                  selectFields: [
                      { fieldName: 'v_Value1', aliasName: 'MasterServiceName' }
                  ]
              },
              i_Consultorio: { 
                  table: 'systemparameter', 
                  alias: 'Consultorio', 
                  joinField: 'i_ParameterId', 
                  condition: 'i_GroupId = 403', 
                  selectFields: [ 
                      { fieldName: 'v_Value1', aliasName: 'Consultorio' } 
                  ] 
              }
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
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['v_ProtocolComponentId'],
          foreignKeys: {
              v_ProtocolId: { referencedTable: 'SigesoftDesarrollo_2.dbo.protocol', referencedField: 'v_ProtocolId' },
              v_ComponentId: { referencedTable: 'SigesoftDesarrollo_2.dbo.component', referencedField: 'v_ComponentId' }
          },
          systemParameterJoins: {}
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
              i_ServiceStatusId: { type: 'int', nullable: true },
              i_AptitudeStatusId: { type: 'int', nullable: true },
              d_ServiceDate: { type: 'datetime2', precision: 7, nullable: true },
              v_ComprobantePago: { type: 'varchar', length: 100, nullable: true },
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['v_ServiceId'],
          foreignKeys: {
              v_ProtocolId: { referencedTable: 'SigesoftDesarrollo_2.dbo.protocol', referencedField: 'v_ProtocolId' },
              v_PersonId: { referencedTable: 'SigesoftDesarrollo_2.dbo.person', referencedField: 'v_PersonId' }
          },
          systemParameterJoins: {
              i_AptitudeStatusId: { 
                  table: 'systemparameter', 
                  alias: 'AptitudeStatus', 
                  joinField: 'i_ParameterId',
                  condition: 'i_GroupId = 124',
                  selectFields: [
                      { fieldName: 'v_Value1', aliasName: 'AptitudeStatusName' }
                  ]
              },
              i_ServiceStatusId: { 
                  table: 'systemparameter', 
                  alias: 'ServiceStatus', 
                  joinField: 'i_ParameterId',
                  condition: 'i_GroupId = 125',
                  selectFields: [
                      { fieldName: 'v_Value1', aliasName: 'ServiceStatusName' }
                  ]
              }
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
              i_MedicoTratanteId: { type: 'int', nullable: true },
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['v_ServiceComponentId'],
          foreignKeys: {
              v_ServiceId: { referencedTable: 'SigesoftDesarrollo_2.dbo.service', referencedField: 'v_ServiceId' },
              v_ComponentId: { referencedTable: 'SigesoftDesarrollo_2.dbo.component', referencedField: 'v_ComponentId' }
          },
          systemParameterJoins: {},
          customJoins: {
              i_MedicoTratanteId: {
                  type: 'nested',
                  joins: [
                      { 
                          table: 'systemuser', 
                          alias: 'su', 
                          joinField: 'i_SystemUserId',
                          selectFields: [
                              { fieldName: 'v_UserName', aliasName: 'MedicoUserName' }
                          ]
                      },
                      { 
                          table: 'person', 
                          alias: 'pp', 
                          joinField: 'v_PersonId', 
                          sourceField: 'su.v_PersonId',
                          selectFields: [
                              { fieldName: 'v_FirstName', aliasName: 'MedicoFirstName' },
                              { fieldName: 'v_FirstLastName', aliasName: 'MedicoLastName' }
                          ]
                      }
                  ]
              }
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
              i_SystemUserTypeId: { type: 'int', nullable: true },
              i_IsDeleted: { type: 'int', nullable: true }
          },
          primaryKey: ['i_SystemUserId'],
          foreignKeys: {
              v_PersonId: { referencedTable: 'SigesoftDesarrollo_2.dbo.person', referencedField: 'v_PersonId' }
          },
          systemParameterJoins: {}
      },
  
      // ===== SISTEMA SAM - Base de Datos: 20505310072 =====
      '20505310072.dbo.documento': {
          name: 'documento',
          database: '20505310072',
          schema: 'dbo',
          fullName: '[20505310072].[dbo].[documento]',
          fields: {
              i_CodigoDocumento: { type: 'int', nullable: false },
              v_Nombre: { type: 'varchar', length: 50, nullable: true },
              i_Destino: { type: 'int', nullable: true },
              i_Eliminado: { type: 'int', nullable: true }
          },
          primaryKey: ['i_CodigoDocumento'],
          foreignKeys: {},
          systemParameterJoins: {}
      },
  
      '20505310072.dbo.producto': {
          name: 'producto',
          database: '20505310072',
          schema: 'dbo',
          fullName: '[20505310072].[dbo].[producto]',
          fields: {
              v_IdProducto: { type: 'varchar', length: 16, nullable: false },
              v_Descripcion: { type: 'varchar', length: 800, nullable: true },
              i_EsActivo: { type: 'int', nullable: true },
              d_PrecioVenta: { type: 'decimal', precision: 18, scale: 7, nullable: true },
              d_PrecioCosto: { type: 'decimal', precision: 18, scale: 7, nullable: true },
              i_Eliminado: { type: 'int', nullable: true }
          },
          primaryKey: ['v_IdProducto'],
          foreignKeys: {},
          systemParameterJoins: {}
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
              i_Eliminado: { type: 'int', nullable: true }
          },
          primaryKey: ['v_IdProductoAlmacen'],
          foreignKeys: {
              v_ProductoDetalleId: { referencedTable: '20505310072.dbo.productodetalle', referencedField: 'v_IdProductoDetalle' }
          },
          systemParameterJoins: {}
      },
  
      '20505310072.dbo.productodetalle': {
          name: 'productodetalle',
          database: '20505310072',
          schema: 'dbo',
          fullName: '[20505310072].[dbo].[productodetalle]',
          fields: {
              v_IdProductoDetalle: { type: 'varchar', length: 16, nullable: false },
              v_IdProducto: { type: 'varchar', length: 16, nullable: true },
              i_Eliminado: { type: 'int', nullable: true }
          },
          primaryKey: ['v_IdProductoDetalle'],
          foreignKeys: {
              v_IdProducto: { referencedTable: '20505310072.dbo.producto', referencedField: 'v_IdProducto' }
          },
          systemParameterJoins: {}
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
              i_IdTipoDocumento: { type: 'int', nullable: true },
              v_CorrelativoDocumento: { type: 'nvarchar', length: 8, nullable: true },
              v_CorrelativoDocumentoFin: { type: 'nvarchar', length: 20, nullable: true },
              t_FechaRegistro: { type: 'datetime', nullable: true },
              d_TipoCambio: { type: 'decimal', precision: 18, scale: 4, nullable: true },
              i_EsAfectoIgv: { type: 'int', nullable: true },
              d_ValorVenta: { type: 'decimal', precision: 18, scale: 4, nullable: true },
              d_IGV: { type: 'decimal', precision: 18, scale: 4, nullable: true },
              d_Total: { type: 'decimal', precision: 18, scale: 4, nullable: true },
              i_ClienteEsAgente: { type: 'int', nullable: true },
              i_Eliminado: { type: 'int', nullable: true }
          },
          primaryKey: ['v_IdVenta'],
          foreignKeys: {
              i_IdTipoDocumento: { referencedTable: '20505310072.dbo.documento', referencedField: 'i_CodigoDocumento' }
          },
          systemParameterJoins: {}
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
              i_Eliminado: { type: 'int', nullable: true }
          },
          primaryKey: ['v_IdVentaDetalle'],
          foreignKeys: {
              v_IdVenta: { referencedTable: '20505310072.dbo.venta', referencedField: 'v_IdVenta' },
              v_IdProductoDetalle: { referencedTable: '20505310072.dbo.productodetalle', referencedField: 'v_IdProductoDetalle' }
          },
          systemParameterJoins: {}
      }
  };
  
  // Exportar las interfaces y el objeto para uso en TypeScript
  export type { 
      FieldDefinition, 
      ForeignKeyDefinition, 
      SystemParameterJoinDefinition, 
      CustomJoinDefinition,
      TableStructure, 
      DatabaseStructure 
  };
  
  export { tablesStructure };
  
  // Ejemplo de uso con TypeScript
  export class DatabaseQueryBuilder {
      private tables: DatabaseStructure;
  
      constructor(tablesStructure: DatabaseStructure) {
          this.tables = tablesStructure;
      }
  
      // Método para obtener información de una tabla
      getTableInfo(tableName: string): TableStructure | null {
          return this.tables[tableName] || null;
      }
  
      // Método para generar JOIN con systemparameter incluyendo campos SELECT
      generateSystemParameterJoin(tableName: string, fieldName: string): { join: string; selectFields: string[] } {
          const table = this.tables[tableName];
          if (!table) return { join: '', selectFields: [] };
  
          const joinDef = table.systemParameterJoins[fieldName];
          if (!joinDef) return { join: '', selectFields: [] };
  
          const join = `INNER JOIN ${joinDef.table} ${joinDef.alias} ON ${table.name}.${fieldName} = ${joinDef.alias}.${joinDef.joinField} AND ${joinDef.alias}.${joinDef.condition}`;
          
          const selectFields = joinDef.selectFields.map(field => 
              `${joinDef.alias}.${field.fieldName} AS ${field.aliasName}`
          );
  
          return { join, selectFields };
      }
  
      // Método para generar JOINs con foreign keys incluyendo campos SELECT
      generateForeignKeyJoin(tableName: string, fieldName: string): { join: string; selectFields: string[] } {
          const table = this.tables[tableName];
          if (!table) return { join: '', selectFields: [] };
  
          const fkDef = table.foreignKeys[fieldName];
          if (!fkDef) return { join: '', selectFields: [] };
  
          const referencedTableName = fkDef.referencedTable.split('.').pop()!;
          const join = `INNER JOIN ${fkDef.referencedTable} ${referencedTableName} ON ${table.name}.${fieldName} = ${referencedTableName}.${fkDef.referencedField}`;
          
          const selectFields = fkDef.selectFields 
              ? fkDef.selectFields.map(field => `${referencedTableName}.${field.fieldName} AS ${field.aliasName}`)
              : [];
  
          return { join, selectFields };
      }
  
      // Método para generar consulta completa con JOINs y campos SELECT
      generateCompleteQuery(tableName: string, options?: {
          includeSystemParameterJoins?: boolean;
          includeForeignKeyJoins?: boolean;
          customFields?: string[];
      }): string {
          const table = this.tables[tableName];
          if (!table) return '';
  
          const opts = {
              includeSystemParameterJoins: true,
              includeForeignKeyJoins: true,
              ...options
          };
  
          // Campos base de la tabla
          const selectFields: string[] = [];
          const fieldsToSelect = opts.customFields || Object.keys(table.fields);
          selectFields.push(...fieldsToSelect.map(field => `${table.name}.${field}`));
  
          // JOINs y campos adicionales
          const joins: string[] = [];
  
          // System Parameter JOINs
          if (opts.includeSystemParameterJoins) {
              Object.keys(table.systemParameterJoins).forEach(fieldName => {
                  const result = this.generateSystemParameterJoin(tableName, fieldName);
                  if (result.join) {
                      joins.push(result.join);
                      selectFields.push(...result.selectFields);
                  }
              });
          }
  
          // Foreign Key JOINs
          if (opts.includeForeignKeyJoins) {
              Object.keys(table.foreignKeys).forEach(fieldName => {
                  const result = this.generateForeignKeyJoin(tableName, fieldName);
                  if (result.join) {
                      joins.push(result.join);
                      selectFields.push(...result.selectFields);
                  }
              });
          }
  
          // Construir query completa
          let query = `SELECT ${selectFields.join(', ')}\nFROM ${table.fullName} ${table.name}`;
          
          if (joins.length > 0) {
              query += '\n' + joins.join('\n');
          }
  
          return query;
      }
  
      // Método para obtener todos los campos de una tabla
      getTableFields(tableName: string): string[] {
          const table = this.tables[tableName];
          return table ? Object.keys(table.fields) : [];
      }
  
      // Método para validar si un campo existe en una tabla
      fieldExists(tableName: string, fieldName: string): boolean {
          const table = this.tables[tableName];
          return table ? fieldName in table.fields : false;
      }
  
      // Método para generar SELECT con alias
      generateSelect(tableName: string, fields?: string[]): string {
          const table = this.tables[tableName];
          if (!table) return '';
  
          const fieldsToSelect = fields || Object.keys(table.fields);
          const selectFields = fieldsToSelect.map(field => `${table.name}.${field}`);
          
          return `SELECT ${selectFields.join(', ')} FROM ${table.fullName} ${table.name}`;
      }
  }
  
  // Ejemplo de uso práctico
  /*export function exampleUsage() {
      const queryBuilder = new DatabaseQueryBuilder(tablesStructure);
      
      // Ejemplo 1: Generar JOIN con campos SELECT específicos
      const joinResult = queryBuilder.generateSystemParameterJoin('SigesoftDesarrollo_2.dbo.calendar', 'i_ServiceTypeId');
      console.log('Generated JOIN:', joinResult.join);
      console.log('SELECT fields:', joinResult.selectFields);
      
      // Ejemplo 2: Query completa con todos los JOINs
      const completeQuery = queryBuilder.generateCompleteQuery('SigesoftDesarrollo_2.dbo.calendar');
      console.log('Complete Query:\n', completeQuery);
      
      // Ejemplo 3: Query personalizada con campos específicos
      const customQuery = queryBuilder.generateCompleteQuery('SigesoftDesarrollo_2.dbo.calendar', {
          customFields: ['v_CalendarId', 'd_DateTimeCalendar', 'i_ServiceTypeId'],
          includeSystemParameterJoins: true,
          includeForeignKeyJoins: false
      });
      console.log('Custom Query:\n', customQuery);
  }*/
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, FileText, Save, 
  Plus, Send, Bot, User, Copy, MessageSquare,
  Check, ChevronRight, Settings, Table, BarChart, RefreshCw, PieChart, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ToastAlerts from '../../components/UI/ToastAlerts';
import { useLocalAI } from '../../hooks/useLocalAI'; // DESCOMENTADO - IA LOCAL
import { AnthropicService } from '../../services/AnthropicService'; // NUEVA IMPORTACIÓN - ANTHROPIC
import { dashboardService } from '../../services/DashboardService'; // NUEVA IMPORTACIÓN - DASHBOARD SERVICE
import { DatabaseSchema, AllEnums, type TableDefinition } from './MedicalTables'; // NUEVA IMPORTACIÓN - SCHEMA COMPLETO
import './styles.css';

// NUEVA INTERFAZ PARA DATOS DE GRÁFICO
interface ChartData {
  labels: string[];
  values: number[];
  maxValue: number;
  labelColumn: string;
  valueColumn: string;
  percentageColumn?: string;
  realPercentages?: number[] | null;
  // NUEVOS CAMPOS PARA CLUSTERED BAR CHART
  series?: {
    name: string;
    data: number[];
    color?: string;
  }[];
  isGrouped?: boolean;
  groupingColumn?: string;
}

// Tipos para las tablas del sistema médico - USANDO NUEVA ESTRUCTURA
interface MedicalTable {
  id: string;
  name: string;
  description: string;
  database: string;
  schema: string;
  fullName: string;
  fields: MedicalField[];
  primaryKeys: string[];
  foreignKeys: Record<string, { referencedTable: string; referencedField: string; }>;
  relatedEnums: Record<string, object>;
}

interface MedicalField {
  name: string;
  type: 'varchar' | 'nvarchar' | 'nchar' | 'int' | 'datetime' | 'datetime2' | 'date' | 'decimal' | 'real' | 'smallint';
  displayType: 'string' | 'number' | 'date' | 'boolean'; // Para compatibilidad con UI
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  description: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: string;
  enumRef?: string;
  enumValues?: Record<string, string>;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  sqlScript?: string;
  timestamp: Date;
}

interface SavedQuery {
  id: string;
  name: string;
  description: string;
  userQuestion: string;
  sqlScript: string;
  isFavorite: boolean;
  createdAt: Date;
}

// NUEVO TIPO PARA EL CONTEXTO DE TABLAS
interface TablesContext {
  userQuestion: string;
  selectedTables: string[];
  tablesDetails: {
    name: string;
    description: string;
    fields: {
      name: string;
      type: string;
      description: string;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
      references?: string;
    }[];
  }[];
  relationships: { [key: string]: string[] };
  availablePatterns: {
    keywords: string[];
    description: string;
  }[];
}

// =============================================================================
// FUNCIONES DE TRANSFORMACIÓN DEL SCHEMA
// =============================================================================

/**
 * Convierte el tipo de dato SQL a tipo para UI
 */
const mapSQLTypeToDisplayType = (sqlType: string): 'string' | 'number' | 'date' | 'boolean' => {
  switch (sqlType) {
    case 'varchar':
    case 'nvarchar':
    case 'nchar':
      return 'string';
    case 'int':
    case 'decimal':
    case 'real':
    case 'smallint':
      return 'number';
    case 'datetime':
    case 'datetime2':
    case 'date':
      return 'date';
    default:
      return 'string';
  }
};

/**
 * Obtiene descripción amigable para una tabla
 */
const getTableDescription = (tableName: string): string => {
  // Para evitar conflictos con nombres duplicados entre bases de datos
  const descriptions: Record<string, string> = {
    'calendar': 'Citas y Programación',
    'service': 'Servicios Médicos',
    'protocol': 'Protocolos Médicos',
    'person': 'Pacientes y Personas',
    'component': 'Componentes/Exámenes',
    'servicecomponent': 'Componentes por Servicio',
    'organization': 'Organizaciones/Empresas',
    'diagnosticrepository': 'Diagnósticos',
    'diseases': 'Enfermedades',
    'cie10': 'Códigos CIE10',
    'systemuser': 'Usuarios del Sistema Médico',
    'protocolcomponent': 'Componentes de Protocolo',
    'pacient': 'Pacientes',
    'professional': 'Profesionales',
    'hospitalizacion': 'Hospitalización',
    'hospitalizacionservice': 'Servicios de Hospitalización',
    'hospitalizacionhabitacion': 'Habitaciones de Hospitalización',
    'recommendation': 'Recomendaciones',
    'restriction': 'Restricciones',
    'receta': 'Recetas Médicas',
    'receipHeader': 'Cabecera de Recetas',
    'masterrecommendationrestricction': 'Maestro de Recomendaciones y Restricciones',
    'almacen': 'Almacenes',
    'producto': 'Productos',
    'productoalmacen': 'Stock por Almacén',
    'venta': 'Ventas',
    'ventadetalle': 'Detalle de Ventas',
    'cobranza': 'Cobranzas',
    'cobranzadetalle': 'Detalle de Cobranzas',
    'documento': 'Tipos de Documentos'
  };
  return descriptions[tableName] || `Tabla ${tableName.toUpperCase()}`;
};

/**
 * Obtiene descripción amigable para un campo
 */
const getFieldDescription = (tableName: string, fieldName: string): string => {
  const commonFields: Record<string, string> = {
    'v_CalendarId': 'ID del calendario',
    'v_PersonId': 'ID de la persona',
    'v_ServiceId': 'ID del servicio',
    'v_ProtocolId': 'ID del protocolo',
    'v_ComponentId': 'ID del componente',
    'v_OrganizationId': 'ID de la organización',
    'v_DiseasesId': 'ID de la enfermedad',
    'v_CIE10Id': 'ID del CIE10',
    'v_DiagnosticRepositoryId': 'ID del diagnóstico',
    'v_ServiceComponentId': 'ID del componente de servicio',
    'v_Name': 'Nombre',
    'v_FirstName': 'Primer nombre',
    'v_FirstLastName': 'Primer apellido',
    'v_SecondLastName': 'Segundo apellido',
    'v_DocNumber': 'Número de documento',
    'v_Mail': 'Email',
    'v_UserName': 'Nombre de usuario',
    'v_IdentificationNumber': 'RUC/Identificación',
    'v_Descripcion': 'Descripción',
    'v_CodInterno': 'Código interno',
    'd_InsertDate': 'Fecha de creación',
    'd_ServiceDate': 'Fecha del servicio',
    'd_Birthdate': 'Fecha de nacimiento',
    'd_DateTimeCalendar': 'Fecha y hora de la cita',
    'd_StartDate': 'Fecha de inicio',
    'd_EndDate': 'Fecha de fin',
    'd_FechaRegistro': 'Fecha de registro',
    't_FechaRegistro': 'Fecha de registro',
    'i_ServiceStatusId': 'Estado del servicio',
    'i_CalendarStatusId': 'Estado de la cita',
    'i_AptitudeStatusId': 'Estado de aptitud',
    'i_ServiceTypeId': 'Tipo de servicio',
    'i_OrganizationTypeId': 'Tipo de organización',
    'i_SexTypeId': 'Sexo',
    'i_DocTypeId': 'Tipo de documento',
    'i_EsoTypeId': 'Tipo de examen ocupacional',
    'i_CategoryId': 'Categoría',
    'i_FinalQualificationId': 'Calificación final',
    'i_MedicoTratanteId': 'ID del médico tratante',
    'i_SystemUserId': 'ID del usuario del sistema',
    'i_IsDeleted': 'Eliminado',
    'i_Eliminado': 'Eliminado',
    'r_BasePrice': 'Precio base',
    'r_Price': 'Precio',
    'r_Costo': 'Costo',
    'd_PrecioVenta': 'Precio de venta',
    'd_PrecioCosto': 'Precio de costo',
    'd_Total': 'Total',
    'd_IGV': 'IGV',
    'd_Valor': 'Valor'
  };
  
  return commonFields[fieldName] || fieldName.replace(/^[vi]_|^d_|^r_|^t_/, '').replace(/([A-Z])/g, ' $1').trim();
};

/**
 * Convierte valores de enum a etiquetas amigables
 */
const getEnumValues = (enumRef: string): Record<string, string> => {
  if (!AllEnums[enumRef as keyof typeof AllEnums]) return {};
  
  const enumObj = AllEnums[enumRef as keyof typeof AllEnums];
  const result: Record<string, string> = {};
  
  Object.entries(enumObj).forEach(([key, value]) => {
    if (typeof value === 'number') {
      result[value.toString()] = key;
    }
  });
  
  return result;
};

/**
 * Transforma la definición del schema a la estructura esperada por el UI
 */
const transformTableDefinition = (tableDef: TableDefinition): MedicalTable => {
  const fields: MedicalField[] = Object.entries(tableDef.fields).map(([fieldName, fieldDef]) => ({
    name: fieldName,
    type: fieldDef.type,
    displayType: mapSQLTypeToDisplayType(fieldDef.type),
    length: fieldDef.length,
    precision: fieldDef.precision,
    scale: fieldDef.scale,
    nullable: fieldDef.nullable,
    description: getFieldDescription(tableDef.name, fieldName),
    isPrimaryKey: tableDef.primaryKey.includes(fieldName),
    isForeignKey: fieldName in tableDef.foreignKeys,
    references: tableDef.foreignKeys[fieldName]?.referencedTable?.split('.').pop() || undefined,
    enumRef: fieldDef.enumRef,
    enumValues: fieldDef.enumRef ? getEnumValues(fieldDef.enumRef) : undefined
  }));

  return {
    id: tableDef.name,
    name: tableDef.name.toUpperCase(),
    description: getTableDescription(tableDef.name),
    database: tableDef.database,
    schema: tableDef.schema,
    fullName: tableDef.fullName,
    fields,
    primaryKeys: tableDef.primaryKey,
    foreignKeys: tableDef.foreignKeys,
    relatedEnums: tableDef.relatedEnums
  };
};

// =============================================================================
// TABLAS MÉDICAS Y DE VENTAS - USANDO SCHEMA COMPLETO
// =============================================================================

// Filtrar solo las tablas principales para el BI
const MAIN_MEDICAL_TABLES = [
  'SigesoftDesarrollo_2.dbo.calendar',
  'SigesoftDesarrollo_2.dbo.service', 
  'SigesoftDesarrollo_2.dbo.protocol',
  'SigesoftDesarrollo_2.dbo.person',
  'SigesoftDesarrollo_2.dbo.component',
  'SigesoftDesarrollo_2.dbo.servicecomponent',
  'SigesoftDesarrollo_2.dbo.organization',
  'SigesoftDesarrollo_2.dbo.diagnosticrepository',
  'SigesoftDesarrollo_2.dbo.diseases',
  'SigesoftDesarrollo_2.dbo.cie10',
  'SigesoftDesarrollo_2.dbo.systemuser',
  'SigesoftDesarrollo_2.dbo.protocolcomponent',
  '20505310072.dbo.venta',
  '20505310072.dbo.ventadetalle',
  '20505310072.dbo.producto',
  '20505310072.dbo.productoalmacen',
  '20505310072.dbo.systemuser',
  '20505310072.dbo.cobranza',
  '20505310072.dbo.cobranzadetalle',
  '20505310072.dbo.almacen',
  '20505310072.dbo.documento'
];

// Generar tablas médicas desde el schema completo
const MEDICAL_TABLES: MedicalTable[] = MAIN_MEDICAL_TABLES
  .map(tableKey => DatabaseSchema[tableKey])
  .filter(Boolean)
  .map(transformTableDefinition);

// Función para simular respuesta de IA
const generateSQLFromQuestion = (question: string, selectedTables: string[]): string => {
  // Construir el contexto completo para la IA
  const selectedTableObjects = MEDICAL_TABLES.filter(table => 
    selectedTables.includes(table.name)
  );
  
  // Construir información de relaciones FK
  const tableRelations: { [key: string]: string[] } = {};
  selectedTableObjects.forEach(table => {
    const relations: string[] = [];
    table.fields.forEach(field => {
      if (field.isForeignKey && field.references) {
        relations.push(`${field.name} -> ${field.references.toUpperCase()}`);
      }
    });
    if (relations.length > 0) {
      tableRelations[table.name] = relations;
    }
  });
  
  const lowerQuestion = question.toLowerCase();
  
  // Casos específicos basados en palabras clave - ACTUALIZADO CON NUEVAS TABLAS
  if (lowerQuestion.includes('diagnósticos') && lowerQuestion.includes('tendencia')) {
    return `-- Diagnósticos de mayor tendencia en los últimos 3 meses
SELECT 
    d.v_Name as Enfermedad,
    c.v_CIE10Description1 as DescripcionCIE10,
    COUNT(*) as CantidadDiagnosticos,
    COUNT(DISTINCT dr.v_ServiceId) as ServiciosAfectados
FROM DIAGNOSTICREPOSITORY dr
    INNER JOIN DISEASES d ON dr.v_DiseasesId = d.v_DiseasesId
    INNER JOIN CIE10 c ON d.v_CIE10Id = c.v_CIE10Id
    INNER JOIN SERVICE s ON dr.v_ServiceId = s.v_ServiceId
WHERE 
    dr.d_InsertDate >= DATEADD(MONTH, -3, GETDATE())
GROUP BY 
    d.v_Name, 
    c.v_CIE10Description1
ORDER BY 
    CantidadDiagnosticos DESC, 
    ServiciosAfectados DESC;`;
  }
  
  if (lowerQuestion.includes('ingresos') && lowerQuestion.includes('mes')) {
    return `-- Ingresos por mes con estados de servicio descriptivos
SELECT 
    YEAR(s.d_ServiceDate) as Año,
    MONTH(s.d_ServiceDate) as Mes,
    COUNT(*) as TotalServicios,
    SUM(s.r_Costo) as IngresoTotal,
    AVG(s.r_Costo) as PromedioServicio,
    CASE 
        WHEN s.i_ServiceStatusId = 1 THEN 'Activo'
        WHEN s.i_ServiceStatusId = 2 THEN 'Pendiente'
        WHEN s.i_ServiceStatusId = 3 THEN 'Cancelado'
        ELSE 'Desconocido'
    END as EstadoServicio
FROM SERVICE s
WHERE 
    s.d_ServiceDate >= DATEADD(MONTH, -6, GETDATE())
    AND s.i_ServiceStatusId = 1 -- Servicios completados
GROUP BY 
    YEAR(s.d_ServiceDate), 
    MONTH(s.d_ServiceDate),
    s.i_ServiceStatusId
ORDER BY 
    Año DESC, 
    Mes DESC;`;
  }
  
  if (lowerQuestion.includes('empresas') && lowerQuestion.includes('servicios')) {
    return `-- Top empresas por cantidad de servicios
SELECT 
    o.v_Name as NombreEmpresa,
    o.v_IdentificationNumber as RUC,
    COUNT(s.v_ServiceId) as TotalServicios,
    SUM(s.r_Costo) as MontoTotal,
    AVG(s.r_Costo) as PromedioServicio
FROM ORGANIZATION o
    INNER JOIN SERVICE s ON o.v_OrganizationId = s.v_OrganizationId
WHERE 
    s.d_ServiceDate >= DATEADD(MONTH, -6, GETDATE())
GROUP BY 
    o.v_Name, 
    o.v_IdentificationNumber
ORDER BY 
    TotalServicios DESC, 
    MontoTotal DESC;`;
  }
  
  if (lowerQuestion.includes('pacientes') && lowerQuestion.includes('edad')) {
    return `-- Distribución de pacientes por rango de edad
SELECT 
    CASE 
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) < 18 THEN 'Menor de 18'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 18 AND 30 THEN '18-30 años'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 31 AND 45 THEN '31-45 años'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 46 AND 60 THEN '46-60 años'
        ELSE 'Mayor de 60'
    END as RangoEdad,
    COUNT(*) as CantidadPacientes,
    COUNT(DISTINCT s.v_ServiceId) as ServiciosRealizados
FROM PERSON p
    LEFT JOIN SERVICE s ON p.v_PersonId = s.v_PersonId
WHERE 
    s.d_ServiceDate >= DATEADD(MONTH, -12, GETDATE())
GROUP BY 
    CASE 
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) < 18 THEN 'Menor de 18'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 18 AND 30 THEN '18-30 años'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 31 AND 45 THEN '31-45 años'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 46 AND 60 THEN '46-60 años'
        ELSE 'Mayor de 60'
    END
ORDER BY 
    CantidadPacientes DESC;`;
  }
  
  // NUEVOS CASOS PARA TÉRMINOS DE NEGOCIO ESPECÍFICOS
  if (lowerQuestion.includes('caja empresarial') || lowerQuestion.includes('atención empresarial') || 
      (lowerQuestion.includes('empresarial') && (lowerQuestion.includes('caja') || lowerQuestion.includes('atención')))) {
    return `-- Análisis de Caja/Atención Empresarial con tipo de cliente descriptivo
SELECT 
    YEAR(v.t_FechaRegistro) as Año,
    MONTH(v.t_FechaRegistro) as Mes,
    COUNT(v.v_IdVenta) as TotalVentasEmpresarial,
    SUM(v.d_Total) as MontoTotalEmpresarial,
    AVG(v.d_Total) as PromedioVentaEmpresarial,
    COUNT(DISTINCT v.v_IdCliente) as ClientesAtendidos,
    CASE 
        WHEN v.i_ClienteEsAgente = 1 THEN 'Empresarial'
        ELSE 'Otro'
    END as TipoCliente
FROM [20505310072].[dbo].[venta] v
WHERE 
    v.i_ClienteEsAgente IN (1) -- TipoServicio.Empresarial
    AND v.t_FechaRegistro >= DATEADD(MONTH, -6, GETDATE())
    AND v.i_Eliminado = 0
GROUP BY 
    YEAR(v.t_FechaRegistro), 
    MONTH(v.t_FechaRegistro),
    v.i_ClienteEsAgente
ORDER BY 
    Año DESC, 
    Mes DESC;`;
  }

  if (lowerQuestion.includes('caja particular') || lowerQuestion.includes('atención particular') || 
      (lowerQuestion.includes('particular') && (lowerQuestion.includes('caja') || lowerQuestion.includes('atención')))) {
    return `-- Análisis de Caja/Atención Particular (incluyendo Ginecología)
SELECT 
    CASE 
        WHEN v.i_ClienteEsAgente = 2 THEN 'Particular'
        WHEN v.i_ClienteEsAgente = 8 THEN 'Ginecología Tipo 1'
        WHEN v.i_ClienteEsAgente = 9 THEN 'Ginecología Tipo 2'
    END as TipoAtencionParticular,
    COUNT(v.v_IdVenta) as TotalVentas,
    SUM(v.d_Total) as MontoTotal,
    AVG(v.d_Total) as PromedioVenta
FROM [20505310072].[dbo].[venta] v
WHERE 
    v.i_ClienteEsAgente IN (2,8,9) -- TipoServicio.Particular + Ginecologia
    AND v.t_FechaRegistro >= DATEADD(MONTH, -3, GETDATE())
    AND v.i_Eliminado = 0
GROUP BY 
    v.i_ClienteEsAgente
ORDER BY 
    TotalVentas DESC;`;
  }

  if (lowerQuestion.includes('caja farmacia') || lowerQuestion.includes('atención farmacia') || 
      (lowerQuestion.includes('farmacia') && (lowerQuestion.includes('caja') || lowerQuestion.includes('atención')))) {
    return `-- Análisis de Caja/Atención Farmacia
SELECT 
    CASE 
        WHEN v.i_ClienteEsAgente = 3 THEN 'Farmacia'
        WHEN v.i_ClienteEsAgente = 4 THEN 'Seguros Farmacia'
    END as TipoFarmacia,
    COUNT(v.v_IdVenta) as TotalVentas,
    SUM(v.d_Total) as MontoTotal,
    COUNT(DISTINCT vd.v_IdProductoDetalle) as ProductosVendidos
FROM [20505310072].[dbo].[venta] v
    LEFT JOIN [20505310072].[dbo].[ventadetalle] vd ON v.v_IdVenta = vd.v_IdVenta
WHERE 
    v.i_ClienteEsAgente IN (3,4) -- TipoServicio.Farmacia + SegurosFarmacia
    AND v.t_FechaRegistro >= DATEADD(MONTH, -3, GETDATE())
    AND v.i_Eliminado = 0
GROUP BY 
    v.i_ClienteEsAgente
ORDER BY 
    MontoTotal DESC;`;
  }

  // NUEVO CASO CROSS-DATABASE: Relación entre servicios médicos y ventas (SQL SERVER 2012 COMPATIBLE)
  if (lowerQuestion.includes('servicios') && lowerQuestion.includes('ventas')) {
    return `-- Relación entre servicios médicos y ventas (SQL Server 2012 - usando STRING_SPLIT para múltiples comprobantes)
SELECT 
    o.v_Name as NombreEmpresa,
    COUNT(s.v_ServiceId) as ServiciosMedicos,
    COUNT(v.v_IdVenta) as VentasAsociadas,
    SUM(v.d_Total) as MontoTotalVentas,
    AVG(s.r_Costo) as PromedioServicio
FROM [20505310072].[dbo].[venta] v
    INNER JOIN [SigesoftDesarrollo_2].[dbo].[service] s ON v.v_CorrelativoDocumentoFin IN (
        SELECT value FROM STRING_SPLIT(s.v_ComprobantePago, '|')
        WHERE value IS NOT NULL AND value <> ''
    )
    INNER JOIN [SigesoftDesarrollo_2].[dbo].[organization] o ON s.v_OrganizationId = o.v_OrganizationId
WHERE 
    s.d_ServiceDate >= DATEADD(MONTH, -6, GETDATE())
    AND v.t_FechaRegistro >= DATEADD(MONTH, -6, GETDATE())
    AND s.i_ServiceStatusId = 1
    AND v.i_Eliminado = 0
    AND s.v_ComprobantePago IS NOT NULL
    AND s.v_ComprobantePago <> ''
GROUP BY 
    o.v_Name
ORDER BY 
    ServiciosMedicos DESC,
    MontoTotalVentas DESC;`;
  }

  // NUEVOS CASOS PARA TABLAS DE VENTAS
  if (lowerQuestion.includes('ventas') && lowerQuestion.includes('mes')) {
    return `-- Análisis de ventas por mes
SELECT 
    YEAR(v.t_FechaRegistro) as Año,
    MONTH(v.t_FechaRegistro) as Mes,
    COUNT(*) as TotalVentas,
    SUM(v.d_Total) as MontoTotal,
    AVG(v.d_Total) as PromedioVenta,
    COUNT(DISTINCT vd.v_IdProductoDetalle) as ProductosVendidos
FROM [20505310072].[dbo].[venta] v
    LEFT JOIN [20505310072].[dbo].[ventadetalle] vd ON v.v_IdVenta = vd.v_IdVenta
WHERE 
    v.t_FechaRegistro >= DATEADD(MONTH, -6, GETDATE())
    AND v.i_Eliminado = 0
GROUP BY 
    YEAR(v.t_FechaRegistro), 
    MONTH(v.t_FechaRegistro)
ORDER BY 
    Año DESC, 
    Mes DESC;`;
  }
  
  if (lowerQuestion.includes('productos') && (lowerQuestion.includes('vendidos') || lowerQuestion.includes('top'))) {
    return `-- Productos más vendidos
SELECT 
    p.v_Descripcion as Producto,
    p.v_CodInterno as CodigoInterno,
    SUM(vd.d_Cantidad) as CantidadVendida,
    SUM(vd.d_PrecioVenta) as VentaTotal,
    AVG(vd.d_PrecioVenta / vd.d_Cantidad) as PrecioPromedio,
    COUNT(DISTINCT v.v_IdVenta) as NumeroVentas
FROM [20505310072].[dbo].[producto] p
    INNER JOIN [20505310072].[dbo].[ventadetalle] vd ON p.v_IdProducto = vd.v_IdProductoDetalle
    INNER JOIN [20505310072].[dbo].[venta] v ON vd.v_IdVenta = v.v_IdVenta
WHERE 
    v.t_FechaRegistro >= DATEADD(MONTH, -3, GETDATE())
    AND v.i_Eliminado = 0
    AND p.i_Eliminado = 0
GROUP BY 
    p.v_Descripcion,
    p.v_CodInterno
ORDER BY 
    CantidadVendida DESC,
    VentaTotal DESC;`;
  }
  
  if (lowerQuestion.includes('cobranza') && (lowerQuestion.includes('estado') || lowerQuestion.includes('pendiente'))) {
    return `-- Estado de cobranzas
SELECT 
    CASE 
        WHEN c.i_IdEstado = 0 THEN 'Anulado'
        WHEN c.i_IdEstado = 1 THEN 'Activo'
        ELSE 'Desconocido'
    END as EstadoCobranza,
    CASE 
        WHEN c.i_IdMoneda = 1 THEN 'Soles'
        WHEN c.i_IdMoneda = 2 THEN 'Dólares'
        ELSE 'Desconocido'
    END as Moneda,
    COUNT(*) as TotalCobranzas,
    SUM(c.d_TotalSoles) as TotalSoles,
    SUM(c.d_TotalDolares) as TotalDolares,
    AVG(CASE WHEN c.i_IdMoneda = 1 THEN c.d_TotalSoles ELSE c.d_TotalDolares END) as PromedioMoneda
FROM [20505310072].[dbo].[cobranza] c
WHERE 
    c.t_FechaRegistro >= DATEADD(MONTH, -3, GETDATE())
    AND c.i_Eliminado = 0
GROUP BY 
    c.i_IdEstado,
    c.i_IdMoneda
ORDER BY 
    TotalCobranzas DESC;`;
  }
  
  if (lowerQuestion.includes('stock') || lowerQuestion.includes('inventario') || lowerQuestion.includes('almacen')) {
    return `-- Estado de inventarios por almacén
SELECT 
    a.v_Nombre as NombreAlmacen,
    p.v_Descripcion as Producto,
    p.v_CodInterno as CodigoInterno,
    pa.d_StockActual as StockActual,
    p.d_PrecioVenta as PrecioVenta,
    (pa.d_StockActual * p.d_PrecioVenta) as ValorInventario,
    CASE 
        WHEN pa.d_StockActual <= 5 THEN 'Stock Bajo'
        WHEN pa.d_StockActual <= 20 THEN 'Stock Medio'
        ELSE 'Stock Alto'
    END as EstadoStock
FROM [20505310072].[dbo].[almacen] a
    INNER JOIN [20505310072].[dbo].[productoalmacen] pa ON a.i_IdAlmacen = pa.i_IdAlmacen
    INNER JOIN [20505310072].[dbo].[producto] p ON pa.v_ProductoDetalleId = p.v_IdProducto
WHERE 
    a.i_Eliminado = 0
    AND p.i_Eliminado = 0
    AND pa.i_Eliminado = 0
    AND pa.d_StockActual > 0
ORDER BY 
    a.v_Nombre,
    pa.d_StockActual DESC;`;
  }
  
  // Respuesta genérica (SQL Server 2012 compatible)
  return `-- Consulta basada en: "${question}"
-- Tablas seleccionadas: ${selectedTables.join(', ')}
-- SQL Server 2012 Compatible
SELECT 
    *
FROM ${selectedTables[0] || 'SERVICE'}
WHERE 
    d_InsertDate >= DATEADD(MONTH, -3, GETDATE())
ORDER BY 
    d_InsertDate DESC;

-- Nota: Esta es una consulta base compatible con SQL Server 2012.
-- Para obtener resultados más específicos y relaciones cross-database,
-- proporcione más detalles sobre lo que necesita analizar.
-- RECORDATORIO: Para VENTA + SERVICE usar STRING_SPLIT en v_ComprobantePago`;
};

const AnalisisBI: React.FC = () => {
  const [selectedTables, setSelectedTables] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [currentSQLScript, setCurrentSQLScript] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [queryDescription, setQueryDescription] = useState('');
  const [enableLocalAI, setEnableLocalAI] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isExecutingScript, setIsExecutingScript] = useState(false);
  const [queryResults, setQueryResults] = useState<Record<string, unknown>[]>([]); // NUEVO: Estado para resultados de consulta
  const [showChart, setShowChart] = useState(false); // NUEVO: Estado para mostrar gráfico
  const [isAnalyzingChart, setIsAnalyzingChart] = useState(false); // NUEVO: Estado para análisis de IA
  const [chartConfig, setChartConfig] = useState<{
    labelColumn: string;
    valueColumn: string;
    reasoning: string;
    recommendedType?: 'barras' | 'clustered' | 'pastel' | 'dona';
    groupingColumn?: string;
    seriesColumns?: string[];
  } | null>(null); // NUEVO: Configuración sugerida por IA
  const [showResetModal, setShowResetModal] = useState(false); // NUEVO: Modal de confirmación de reinicio
  const [chartType, setChartType] = useState<'barras' | 'clustered' | 'pastel' | 'dona'>('barras'); // NUEVO: Tipo de gráfico seleccionado
  
  // NUEVA REFERENCIA PARA EXPORTAR RESULTADOS
  const resultsCardRef = useRef<HTMLDivElement>(null);
  
  // NUEVA INSTANCIA DE ANTHROPIC SERVICE
  const anthropicService = AnthropicService.getInstance();
  const isAIAvailable = anthropicService.isClientReady();

  // HOOK DE IA LOCAL PARA ANÁLISIS DE GRÁFICOS
  const { isAvailable: isLocalAIAvailable } = useLocalAI();

  // NUEVO: Definir los steps del proceso
  const steps = [
    {
      id: 0,
      title: 'Seleccionar Tablas',
      description: 'Elija las tablas para el análisis',
      icon: Database,
      completed: selectedTables.trim() !== ''
    },
    {
      id: 1,
      title: 'Chat con IA',
      description: 'Haga preguntas en lenguaje natural',
      icon: MessageSquare,
      completed: chatMessages.length > 0
    },
    {
      id: 2,
      title: 'Script SQL',
      description: 'Revise y use el código generado',
      icon: FileText,
      completed: currentSQLScript !== ''
    },
    {
      id: 3,
      title: 'Resultados',
      description: 'Revise los resultados de la consulta',
      icon: Table,
      completed: queryResults.length > 0
    },
    {
      id: 4,
      title: 'Visualización',
      description: 'Genere gráficos y exporte sus resultados',
      icon: BarChart,
      completed: showChart || queryResults.length > 0
    }
  ];

  // FUNCIÓN PARA MANEJAR EL AUTO-RESIZE DEL TEXTAREA
  const handleTextareaResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = 24;
    const minHeight = lineHeight;
    const maxHeight = lineHeight * 4;
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
    
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentMessage(e.target.value);
    handleTextareaResize(e.target);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // NUEVA FUNCIÓN PARA EJECUTAR EL SCRIPT SQL GENERADO
  const executeCurrentScript = async () => {
    if (!currentSQLScript.trim()) {
      ToastAlerts.error({
        title: "Error",
        message: "No hay script SQL para ejecutar"
      });
      return;
    }

    setIsExecutingScript(true);
    
    try {
      // Preparar el script: reemplazar saltos de línea con \r\n para compatibilidad Windows/SQL Server
      const formattedScript = currentSQLScript
        .replace(/\r\n/g, '\n') // Normalizar primero a \n
        .replace(/\n/g, '\r\n'); // Luego convertir a \r\n
      
      // Ejecutar el script usando nuestro nuevo endpoint
      const result = await dashboardService.executeScriptParsed(formattedScript);
      
      // Guardar resultados y navegar al step de resultados
      setQueryResults(result.data as Record<string, unknown>[]);
      
      ToastAlerts.success({
        title: "Script ejecutado exitosamente",
        message: `Se obtuvieron ${result.data.length} filas de resultado. Navegando a resultados...`
      });
      
      // Auto-navegar al step de resultados después de un breve delay
      setTimeout(() => {
        setActiveStep(3);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error ejecutando script:', error);
      
      ToastAlerts.error({
        title: "Error ejecutando script",
        message: error instanceof Error ? error.message : "Error desconocido al ejecutar el script SQL"
      });
    } finally {
      setIsExecutingScript(false);
    }
  };

  // NUEVA FUNCIÓN PARA OBTENER COLUMNAS DINÁMICAMENTE
  const getTableColumns = (data: Record<string, unknown>[]): string[] => {
    if (data.length === 0) return [];
    
    // Obtener todas las claves únicas de todos los objetos
    const allKeys = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });
    
    return Array.from(allKeys);
  };

  // NUEVA FUNCIÓN PARA FORMATEAR VALORES DE CELDA
  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') {
      // Si es un número decimal, mostrar con 2 decimales
      return value % 1 !== 0 ? value.toFixed(2) : value.toString();
    }
    if (typeof value === 'string') {
      // Si parece una fecha, intentar formatearla
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
        try {
          return new Date(value).toLocaleDateString('es-ES');
        } catch {
          return value;
        }
      }
      return value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  // NUEVA FUNCIÓN PARA DETECTAR TIPO DE COLUMNA (MEJORADA)
  const getColumnType = (data: Record<string, unknown>[], columnKey: string): 'number' | 'date' | 'boolean' | 'text' => {
    const values = data.map(row => row[columnKey]).filter(val => val !== null && val !== undefined);
    if (values.length === 0) return 'text';
    
    // Verificar si la mayoría de valores son numéricos
    let numericCount = 0;
    let booleanCount = 0;
    let dateCount = 0;
    
    for (const value of values) {
      if (typeof value === 'boolean') {
        booleanCount++;
      } else if (typeof value === 'number') {
        numericCount++;
      } else if (typeof value === 'string') {
        // Verificar si es un número en formato string
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && isFinite(numValue)) {
          numericCount++;
        } else if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
          dateCount++;
        }
      }
    }
    
    const total = values.length;
    
    // Si más del 80% son numéricos, es una columna numérica
    if (numericCount / total > 0.8) return 'number';
    if (booleanCount / total > 0.8) return 'boolean';
    if (dateCount / total > 0.8) return 'date';
    
    return 'text';
  };

  // Función para construir el contexto de tablas - ACTUALIZADA PARA NUEVO SCHEMA
  const buildTablesContext = (question: string, tables: string[]): TablesContext => {
    const selectedTableObjects = MEDICAL_TABLES.filter(table => 
      tables.includes(table.name)
    );
    
    const tableRelations: { [key: string]: string[] } = {};
    selectedTableObjects.forEach(table => {
      const relations: string[] = [];
      table.fields.forEach(field => {
        if (field.isForeignKey && field.references) {
          relations.push(`${field.name} -> ${field.references.toUpperCase()}`);
        }
      });
      if (relations.length > 0) {
        tableRelations[table.name] = relations;
      }
    });
    
    return {
      userQuestion: question,
      selectedTables: tables,
      tablesDetails: selectedTableObjects.map(table => ({
        name: table.name,
        description: table.description,
        fields: table.fields.map(field => ({
          name: field.name,
          type: field.displayType, // Usar displayType para compatibilidad con UI
          description: field.description,
          isPrimaryKey: field.isPrimaryKey || false,
          isForeignKey: field.isForeignKey || false,
          references: field.references || undefined
        }))
      })),
      relationships: tableRelations,
      availablePatterns: [
        {
          keywords: ["diagnósticos", "tendencia"],
          description: "Obtiene diagnósticos más frecuentes con CIE10"
        },
        {
          keywords: ["ingresos", "mes"],
          description: "Calcula ingresos agrupados por mes"
        },
        {
          keywords: ["empresas", "servicios"],
          description: "Top empresas por cantidad de servicios"
        },
        {
          keywords: ["pacientes", "edad"],
          description: "Distribución de pacientes por rangos de edad"
        },
        {
          keywords: ["ventas", "productos"],
          description: "Análisis de ventas y productos"
        },
        {
          keywords: ["cobranza", "pagos"],
          description: "Estado de cobranzas y pagos"
        },
        {
          keywords: ["stock", "almacen"],
          description: "Estado de inventarios por almacén"
        }
      ]
    };
  };

  // FUNCIÓN OPTIMIZADA PARA CREAR PROMPT CON CHAT CONTINUO
  const createAnthropicPrompt = (question: string, tablesContext: TablesContext, recentMessages?: ChatMessage[]): string => {
    // Helper para generar mapeo de cajas dinámicamente sin repetición
    const generateCajasMapping = () => {
      const cajas = {
        Empresarial: { service: 'Empresarial', venta: '1' },
        Particular: { service: 'Particular,Ginecologia', venta: '2,8,9' },
        Farmacia: { service: 'Farmacia,SegurosFarmacia', venta: '3,4' },
        Seguros: { service: 'SegurosPaciente,SegurosFacturacion', venta: '5,6' },
        MTC: { service: 'MTC', venta: '7' },
        Solidaridad: { service: 'HospSolidaridad', venta: '10' }
      };
      
      return Object.entries(cajas).map(([name, config]) => 
        `"${name.toLowerCase()}" → service:TipoServicio.${config.service} | venta:i_ClienteEsAgente IN (${config.venta})`
      ).join('\n    - ');
    };

    // Helper para generar template del CTE optimizado
    const generateCTETemplate = () => {
      // Detectar rango de fechas en la pregunta
      const detectDateRange = (question: string): { start: string, end: string } => {
        const lowerQ = question.toLowerCase();
        
        // Patrones comunes de fechas
        if (lowerQ.includes('abril') || lowerQ.includes('april')) {
          return { start: '2024-04-01', end: 'GETDATE()' };
        }
        if (lowerQ.includes('hoy') || lowerQ.includes('today') || lowerQ.includes('actual')) {
          return { start: 'DATEADD(month, -1, GETDATE())', end: 'GETDATE()' };
        }
        if (lowerQ.includes('mes') || lowerQ.includes('month')) {
          return { start: 'DATEADD(month, -1, GETDATE())', end: 'GETDATE()' };
        }
        if (lowerQ.includes('año') || lowerQ.includes('year') || lowerQ.includes('2024')) {
          return { start: '2024-01-01', end: 'GETDATE()' };
        }
        
        // Default: último mes
        return { start: 'DATEADD(month, -1, GETDATE())', end: 'GETDATE()' };
      };

      const dateRange = detectDateRange(question);
      
      return `OBLIGATORIO usar este patrón CTE para CROSS-DB JOIN:

WITH ComprobantesExpandidos AS (
    SELECT s.v_ServiceId, s.v_ProtocolId,
        LTRIM(RTRIM(SUBSTRING(s.v_ComprobantePago, N.number, 
            CHARINDEX('|', s.v_ComprobantePago + '|', N.number) - N.number))) AS v_ComprobantePago
    FROM [SigesoftDesarrollo_2].[dbo].[SERVICE] s
    INNER JOIN (SELECT TOP 100 number FROM master..spt_values WHERE type='P' AND number BETWEEN 1 AND 100) N 
        ON N.number <= LEN(s.v_ComprobantePago) + 1 AND SUBSTRING('|' + s.v_ComprobantePago, N.number, 1) = '|'
    WHERE s.v_ComprobantePago IS NOT NULL 
    AND s.d_ServiceDate >= ${dateRange.start} 
    AND s.d_ServiceDate <= ${dateRange.end}
    AND LTRIM(RTRIM(SUBSTRING(s.v_ComprobantePago, N.number, 
        CHARINDEX('|', s.v_ComprobantePago + '|', N.number) - N.number))) != ''
)
-- Luego usar:
FROM [20505310072].[dbo].[VENTA] v
INNER JOIN ComprobantesExpandidos ce ON v.v_CorrelativoDocumentoFin = ce.v_ComprobantePago
INNER JOIN [SigesoftDesarrollo_2].[dbo].[PROTOCOL] p ON ce.v_ProtocolId = p.v_ProtocolId`;
    };

    // Detectar si es una repregunta de modificación
    const isFollowUpQuestion = (question: string): boolean => {
      const lowerQ = question.toLowerCase();
      const followUpKeywords = [
        'ordenar', 'ordenado', 'order', 'sort',
        'filtrar', 'filtro', 'filter', 'where',
        'agrupar', 'group', 'agregar', 'añadir', 'add',
        'modificar', 'cambiar', 'change', 'modify',
        'limitar', 'limit', 'top', 'primeros',
        'también', 'además', 'also', 'and',
        'pero', 'except', 'sin', 'without',
        'descendente', 'ascendente', 'desc', 'asc'
      ];
      
      return followUpKeywords.some(keyword => lowerQ.includes(keyword)) && question.length < 100;
    };

    // LÓGICA PRINCIPAL: Detectar si es repregunta
    const messages = recentMessages || [];
    const lastAIMessage = messages.filter(m => m.type === 'ai' && m.sqlScript).pop();
    const isFollowUp = isFollowUpQuestion(question) && !!lastAIMessage;
    
    if (isFollowUp && lastAIMessage?.sqlScript) {
      // MODO REPREGUNTA: Prompt ultra-optimizado
      return `Modifica el siguiente SQL según la nueva instrucción del usuario.

SQL ACTUAL:
${lastAIMessage.sqlScript}

NUEVA INSTRUCCIÓN: "${question}"

REGLAS PARA MODIFICACIÓN:
🔧 Mantener toda la lógica de negocio actual
🔧 Aplicar solo los cambios solicitados
🔧 Conservar alias en ESPAÑOL
🔧 Mantener el patrón CTE si existe

RESPONDE SOLO CON EL SQL MODIFICADO:`;
    }

    // Extraer solo tablas relevantes del contexto para reducir tokens
    const relevantTables = tablesContext.tablesDetails.map(t => ({
      name: t.name,
      key_fields: t.fields.filter(f => f.isPrimaryKey || f.isForeignKey).map(f => f.name),
      enum_fields: t.fields.filter(f => f.name.includes('Id') && f.type === 'int').map(f => f.name)
    }));
    
    // MODO NORMAL: Prompt completo
    return `Eres experto SQL para sistemas médicos/comerciales integrados. Genera SQL compatible con SQL Server 2012.

BASES DE DATOS:
- Medical: [SigesoftDesarrollo_2] (citas, servicios, diagnósticos)  
- Sales: [20505310072] (ventas, productos, cobranzas)

TABLAS DISPONIBLES:
${relevantTables.map(t => `- ${t.name}: ${t.key_fields.join(',')}`).join('\n')}

REGLAS CRÍTICAS:
🔧 **ALIAS ESPAÑOL:** COUNT(*) AS Cantidad, SUM() AS Total, v_Name AS Nombre
🔧 **ENUMS → TEXTO:** CASE WHEN i_ServiceStatusId=1 THEN 'Activo' ELSE 'Inactivo' END AS Estado

MAPEO CAJAS/ATENCIÓN:
    - ${generateCajasMapping()}

${generateCTETemplate()}

PREGUNTA: "${question}"

RESPONDE SOLO CON SQL FUNCIONAL:`;
  };

  // Función para enviar mensaje al chat (ACTUALIZADA CON ANTHROPIC)
  const sendMessage = async () => {
    if (!currentMessage.trim()) {
      return;
    }
    
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    const questionToProcess = currentMessage;
    setCurrentMessage('');
    setIsAITyping(true);
    
    try {
      // Preparar contexto
      const selectedTablesList = selectedTables
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('--'));
      
      const tablesContext = buildTablesContext(questionToProcess, selectedTablesList);
      
      let sqlScript = '';
      let responseMessage = '';
      
      if (enableLocalAI) {
        // FALLBACK A ANTHROPIC SI IA LOCAL ESTÁ HABILITADA PERO NO DISPONIBLE
        // USAR PROMPT CON CONTEXTO DE CHAT CONTINUO
        const anthropicPrompt = createAnthropicPrompt(questionToProcess, tablesContext, chatMessages);
        
        // ENVIAR PROMPT CON INSTRUCCIONES DE SQL
        sqlScript = await anthropicService.sendMessage(anthropicPrompt, {
          max_tokens: 1500,
          temperature: 0.1, // Baja temperatura para respuestas más precisas
          system: 'Eres un experto en SQL para sistemas médicos. Responde únicamente con código SQL válido, sin explicaciones adicionales.'
        });
        
        responseMessage = '🔬 He generado un script SQL usando Claude (Anthropic) como fallback. El análisis fue realizado por IA avanzada especializada en consultas médicas:';
      } else {
        // USAR PROMPT CON CONTEXTO DE CHAT CONTINUO
        const anthropicPrompt = createAnthropicPrompt(questionToProcess, tablesContext, chatMessages);
        
        // ENVIAR PROMPT CON INSTRUCCIONES DE SQL
        sqlScript = await anthropicService.sendMessage(anthropicPrompt, {
          max_tokens: 1500,
          temperature: 0.1, // Baja temperatura para respuestas más precisas
          system: 'Eres un experto en SQL para sistemas médicos. Responde únicamente con código SQL válido, sin explicaciones adicionales.'
        });
        
        responseMessage = '🧠 He generado un script SQL usando Claude (Anthropic). Análisis realizado por IA avanzada:';
      }
      
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: responseMessage,
        sqlScript,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      setCurrentSQLScript(sqlScript);
      setIsAITyping(false);
      
      ToastAlerts.success({
        title: enableLocalAI ? "SQL generado por IA local" : "SQL generado por Claude",
        message: enableLocalAI ? 
          "La IA analizó tu consulta completamente offline usando algoritmos locales" :
          "Claude analizó tu consulta y generó SQL optimizado para el sistema médico"
      });
      
    } catch (error) {
      console.error('Error generando SQL:', error);
      setIsAITyping(false);
      
      // FALLBACK SI ANTHROPIC FALLA
      const selectedTablesList = selectedTables
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('--'));
      const fallbackSQL = generateSQLFromQuestion(questionToProcess, selectedTablesList);
      
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: '⚠️ Hubo un problema con Claude, pero generé SQL usando patrones predefinidos:',
        sqlScript: fallbackSQL,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      setCurrentSQLScript(fallbackSQL);
      setIsAITyping(false);
      
      ToastAlerts.error({
        title: "Error con IA, usando fallback",
        message: error instanceof Error ? error.message : "Error desconocido. Se usó generador alternativo."
      });
    }
  };

  // Función para copiar SQL
  const copySQLToClipboard = (sql: string) => {
    navigator.clipboard.writeText(sql);
    ToastAlerts.success({
      title: "Copiado",
      message: "Script SQL copiado al portapapeles"
    });
  };

  // Función para guardar consulta
  const saveCurrentQuery = () => {
    if (!queryName.trim() || !currentSQLScript) return;
    
    const lastUserMessage = chatMessages.filter(m => m.type === 'user').pop();
    
    const newQuery: SavedQuery = {
      id: `query_${Date.now()}`,
      name: queryName,
      description: queryDescription,
      userQuestion: lastUserMessage?.content || '',
      sqlScript: currentSQLScript,
      isFavorite: false,
      createdAt: new Date()
    };
    
    setSavedQueries(prev => [...prev, newQuery]);
    setShowSaveModal(false);
    setQueryName('');
    setQueryDescription('');
    
    ToastAlerts.success({
      title: "Consulta guardada",
      message: "La consulta se guardó correctamente"
    });
  };

  // Función para cargar consulta guardada
  const loadSavedQuery = (query: SavedQuery) => {
    setCurrentSQLScript(query.sqlScript);
    
    // Agregar mensaje al chat
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: query.userQuestion,
      timestamp: new Date()
    };
    
    const aiMessage: ChatMessage = {
      id: `ai_${Date.now()}`,
      type: 'ai',
      content: `He cargado la consulta guardada: "${query.name}"`,
      sqlScript: query.sqlScript,
      timestamp: new Date()
    };
    
    setChatMessages([userMessage, aiMessage]);
  };

  // NUEVO: Función para cambiar de step
  const goToStep = (stepId: number) => {
    setActiveStep(stepId);
  };

  // NUEVA FUNCIÓN PARA MOSTRAR MODAL DE CONFIRMACIÓN DE REINICIO
  const showResetConfirmation = () => {
    setShowResetModal(true);
  };

  // NUEVA FUNCIÓN PARA REINICIAR ANÁLISIS COMPLETO
  const confirmResetAnalysis = () => {
    // Step 0 - Seleccionar Tablas
    setSelectedTables('');
    
    // Step 1 - Chat con IA
    setChatMessages([]);
    setCurrentMessage('');
    setIsAITyping(false);
    
    // Step 2 - Script SQL y consultas guardadas
    setCurrentSQLScript('');
    setShowSaveModal(false);
    setQueryName('');
    setQueryDescription('');
    // Nota: savedQueries se mantiene para preservar el historial del usuario
    
    // Step 3 - Resultados y gráficos
    setQueryResults([]);
    setShowChart(false);
    setIsAnalyzingChart(false);
    setChartConfig(null);
    setIsExecutingScript(false);
    setChartType('barras'); // Reset tipo de gráfico
    
    // Estados generales
    setActiveStep(0);
    setShowResetModal(false);
    // Nota: enableLocalAI se mantiene como preferencia del usuario
    
    // Mostrar notificación de éxito
    ToastAlerts.success({
      title: "Análisis reiniciado",
      message: "Todos los datos han sido limpiados. Puede comenzar un nuevo análisis."
    });
  };

  // =============================================================================
  // FUNCIONES AVANZADAS DE ANÁLISIS DE GRÁFICOS
  // =============================================================================

  /**
   * Detecta automáticamente el mejor tipo de gráfico basado en la estructura de datos
   */
  const detectOptimalChartType = (data: Record<string, unknown>[]): {
    recommendedType: 'barras' | 'clustered' | 'pastel' | 'dona';
    reasoning: string;
    confidence: number;
  } => {
    if (data.length === 0) {
      return { recommendedType: 'barras', reasoning: 'No hay datos disponibles', confidence: 0 };
    }

    const columns = getTableColumns(data);
    const numericColumns = columns.filter(col => getColumnType(data, col) === 'number');
    const textColumns = columns.filter(col => getColumnType(data, col) === 'text');
    const dateColumns = columns.filter(col => getColumnType(data, col) === 'date');

    console.log('🔍 Análisis de tipos de columnas:', {
      columns,
      numericColumns,
      textColumns,
      dateColumns,
      columnTypes: columns.map(col => ({ 
        name: col, 
        type: getColumnType(data, col),
        sampleValues: data.slice(0, 2).map(row => row[col])
      }))
    });

    // CASO 1: CLUSTERED BAR CHART - Múltiples métricas numéricas (DETECCIÓN MEJORADA)
    if (numericColumns.length >= 2 && numericColumns.length <= 8) {
      // Verificar si hay dimensión temporal
      const hasTemporalDimension = dateColumns.length > 0 || 
        textColumns.some(col => 
          col.toLowerCase().includes('mes') || 
          col.toLowerCase().includes('año') || 
          col.toLowerCase().includes('trimestre') ||
          col.toLowerCase().includes('periodo')
        );

      // Verificar si los valores son comparables en escala
      const scales = numericColumns.map(col => {
        const values = data.map(row => Number(row[col]) || 0).filter(v => v > 0);
        if (values.length === 0) return { max: 0, min: 0, avg: 0 };
        return { max: Math.max(...values), min: Math.min(...values), avg: values.reduce((a, b) => a + b, 0) / values.length };
      });

      const maxScale = Math.max(...scales.map(s => s.max));
      const minScale = Math.min(...scales.map(s => s.max));
      const scaleRatio = minScale > 0 ? maxScale / minScale : maxScale;

      console.log('📊 Análisis de escalas para clustered:', {
        scales,
        maxScale,
        minScale,
        scaleRatio,
        hasTemporalDimension,
        dataLength: data.length,
        numericColumns
      });

      // DETECCIÓN INTELIGENTE MEJORADA
      let confidence = 0.95; // Alta confianza por defecto para múltiples métricas
      let reasoning = '';

      if (hasTemporalDimension && numericColumns.length >= 3) {
        confidence = 0.98;
        reasoning = `⭐ OPTIMAL: ${numericColumns.length} métricas financieras con dimensión temporal perfecta para análisis multidimensional`;
      } else if (numericColumns.length >= 4) {
        confidence = 0.95;
        reasoning = `🎯 IDEAL: ${numericColumns.length} métricas numéricas - perfecto para comparación múltiple (${numericColumns.slice(0,3).join(', ')}...)`;
      } else if (hasTemporalDimension) {
        confidence = 0.90;
        reasoning = `📈 RECOMENDADO: ${numericColumns.length} métricas con dimensión temporal (${hasTemporalDimension ? 'series temporales' : 'categorías'})`;
      } else {
        confidence = 0.85;
        reasoning = `📊 APROPIADO: ${numericColumns.length} métricas numéricas - ideal para comparación paralela`;
      }

      // Solo verificar escalas si la diferencia es muy extrema
      if (scaleRatio > 10000) {
        confidence *= 0.8; // Reducir confianza pero no descartar
        reasoning += ` (escalas muy diferentes pero manejables)`;
      }

      return {
        recommendedType: 'clustered',
        reasoning,
        confidence
      };
    }

    // CASO 2: PIE/DONUT CHART - Composición de un todo
    if (numericColumns.length === 1 && data.length <= 8) {
      const values = data.map(row => Number(row[numericColumns[0]]) || 0);
      const total = values.reduce((a, b) => a + b, 0);
      const hasPercentages = columns.some(col => 
        col.toLowerCase().includes('porcentaje') || 
        col.toLowerCase().includes('percentage')
      );

      // Si parece representar partes de un todo
      if (hasPercentages || total > 0) {
        return {
          recommendedType: 'dona',
          reasoning: `Detectado: composición de un todo, ${data.length} categorías, ${hasPercentages ? 'con porcentajes' : 'valores sumables'}`,
          confidence: 0.8
        };
      }
    }

    // CASO 3: SIMPLE BAR CHART - Una métrica, ranking/comparación
    if (numericColumns.length === 1 && textColumns.length >= 1) {
      return {
        recommendedType: 'barras',
        reasoning: `Detectado: métrica única (${numericColumns[0]}), ${data.length} categorías, ideal para ranking/comparación`,
        confidence: 0.7
      };
    }

    // FALLBACK: Barras simples
    return {
      recommendedType: 'barras',
      reasoning: 'Estructura de datos estándar, usando barras simples como fallback',
      confidence: 0.5
    };
  };

  /**
   * Genera configuración inteligente para gráficos agrupados
   */
  const generateClusteredConfig = (data: Record<string, unknown>[]): {
    labelColumn: string;
    seriesColumns: string[];
    groupingColumn?: string;
  } => {
    const columns = getTableColumns(data);
    const numericColumns = columns.filter(col => getColumnType(data, col) === 'number');
    const textColumns = columns.filter(col => getColumnType(data, col) === 'text');
    const dateColumns = columns.filter(col => getColumnType(data, col) === 'date');

    console.log('🔍 Columnas detectadas:', { columns, numericColumns, textColumns, dateColumns });

    // Buscar columna principal de agrupación (temporal o categórica)
    let labelColumn = textColumns[0] || columns[0];
    
    // Priorizar columnas temporales
    if (dateColumns.length > 0) {
      labelColumn = dateColumns[0];
    } else {
      // Buscar columnas que indiquen temporalidad o agrupación
      const temporalColumn = textColumns.find(col => 
        col.toLowerCase().includes('mes') || 
        col.toLowerCase().includes('año') || 
        col.toLowerCase().includes('periodo') ||
        col.toLowerCase().includes('trimestre') ||
        col.toLowerCase().includes('fecha')
      );
      
      if (temporalColumn) {
        labelColumn = temporalColumn;
      } else {
        // Si hay múltiples columnas de texto, crear etiqueta combinada para casos como PERIODO + MES
        const periodoCol = textColumns.find(col => col.toLowerCase().includes('periodo'));
        const mesCol = textColumns.find(col => col.toLowerCase().includes('mes'));
        
        if (periodoCol && mesCol) {
          // Crear etiqueta combinada internamente
          labelColumn = periodoCol; // Usar el período como base, luego combinaremos
        }
      }
    }

    // Filtrar métricas numéricas relevantes (excluir IDs, códigos, etc.)
    const relevantMetrics = numericColumns.filter(col => {
      const lowercaseCol = col.toLowerCase();
      // Excluir columnas que claramente no son métricas de negocio
      const isExcluded = lowercaseCol.includes('id') ||
                        lowercaseCol.includes('codigo') ||
                        lowercaseCol.includes('num') ||
                        lowercaseCol.includes('year') ||
                        lowercaseCol.includes('año') ||
                        (lowercaseCol.includes('tipocambio') && !lowercaseCol.includes('total')) ||
                        (lowercaseCol.includes('tipo') && !lowercaseCol.includes('total'));
      
      console.log(`🔍 Evaluando columna "${col}": ${isExcluded ? 'EXCLUIDA' : 'INCLUIDA'} (${lowercaseCol})`);
      
      return !isExcluded;
    });

    console.log('✅ Métricas relevantes encontradas:', relevantMetrics);

    // Seleccionar las mejores métricas (máximo 6)
    let seriesColumns = relevantMetrics.slice(0, 6);

    // GARANTIZAR MÍNIMO 2 SERIES PARA CLUSTERED
    if (seriesColumns.length < 2 && numericColumns.length >= 2) {
      console.log('⚠️ Usando todas las columnas numéricas como fallback');
      seriesColumns = numericColumns.slice(0, 6);
    }

    // VALIDACIÓN FINAL - GARANTIZAR QUE SIEMPRE TENGAMOS SERIES
    if (seriesColumns.length === 0) {
      console.log('🚨 EMERGENCIA: No se encontraron columnas numéricas, usando todas las columnas');
      seriesColumns = columns.filter(col => col !== labelColumn).slice(0, 6);
    }

    console.log('🎯 SERIES FINALES GARANTIZADAS:', seriesColumns, 'Cantidad:', seriesColumns.length);

    console.log('📊 Configuración generada:', { labelColumn, seriesColumns });

    return {
      labelColumn,
      seriesColumns,
      groupingColumn: textColumns.find(col => col !== labelColumn)
    };
  };

  // NUEVA FUNCIÓN PARA GENERAR DATOS DEL GRÁFICO (ACTUALIZADA CON IA AVANZADA)
  const generateChartData = (): ChartData => {
    if (queryResults.length === 0 || !chartConfig) {
      console.log('❌ generateChartData: Sin datos o config');
      return { 
        labels: [], 
        values: [], 
        maxValue: 0,
        labelColumn: '',
        valueColumn: '',
        percentageColumn: undefined,
        realPercentages: null,
        isGrouped: false
      };
    }
    
    const { labelColumn, valueColumn, seriesColumns } = chartConfig;
    const columns = getTableColumns(queryResults);
    
    console.log('🔍 DEBUG generateChartData - Estado inicial:', {
      chartType,
      labelColumn,
      valueColumn,
      seriesColumns,
      seriesColumnsLength: seriesColumns?.length,
      columns,
      chartConfig,
      queryResultsLength: queryResults.length
    });
    
    // VALIDACIÓN Y REPARACIÓN DE SERIES
    if (chartType === 'clustered' && (!seriesColumns || seriesColumns.length < 2)) {
      console.log('🚨 REPARACIÓN AUTOMÁTICA: Regenerando seriesColumns para clustered');
      const numericColumns = columns.filter(col => getColumnType(queryResults, col) === 'number');
      const repairedSeriesColumns = numericColumns.slice(0, 6);
      
      console.log('🔧 Series reparadas:', repairedSeriesColumns);
      
      // Actualizar chartConfig inmediatamente
      setChartConfig(prev => prev ? {
        ...prev,
        seriesColumns: repairedSeriesColumns
      } : null);
      
      // Usar las series reparadas para esta ejecución
      chartConfig.seriesColumns = repairedSeriesColumns;
    }
    
    // MODO CLUSTERED/GROUPED: Múltiples series
    console.log('🔍 Evaluando condiciones para clustered:', {
      isClusteredType: chartType === 'clustered',
      hasSeriesColumns: !!seriesColumns,
      seriesColumnsLength: seriesColumns?.length,
      isLengthOk: seriesColumns && seriesColumns.length > 1,
      finalCondition: chartType === 'clustered' && seriesColumns && seriesColumns.length > 1
    });
    
    if (chartType === 'clustered' && seriesColumns && seriesColumns.length > 1) {
      console.log('🚀 Generando datos clustered:', { labelColumn, seriesColumns, columns });
      
      // Validar que todas las columnas existen
      const allColumnsExist = [labelColumn, ...seriesColumns].every(col => columns.includes(col));
      if (!allColumnsExist) {
        console.error('❌ Columnas faltantes:', { 
          labelColumn, 
          seriesColumns, 
          available: columns,
          missing: [labelColumn, ...seriesColumns].filter(col => !columns.includes(col))
        });
        return { 
          labels: [], 
          values: [], 
          maxValue: 0,
          labelColumn: '',
          valueColumn: '',
          isGrouped: false
        };
      }

      // Crear etiquetas más descriptivas (combinar PERIODO + MES si están disponibles)
      const labels = queryResults.map(row => {
        const periodoCol = columns.find(col => col.toLowerCase().includes('periodo'));
        const mesCol = columns.find(col => col.toLowerCase().includes('mes'));
        
        if (periodoCol && mesCol && periodoCol !== mesCol) {
          const periodo = String(row[periodoCol] || '');
          const mes = String(row[mesCol] || '').padStart(2, '0');
          return `${periodo}-${mes}`;
        } else {
          return String(row[labelColumn] || 'Sin datos');
        }
      });
      
      // Generar series para cada métrica
      const series = seriesColumns.map((col, index) => {
        const data = queryResults.map(row => {
          const value = row[col];
          return typeof value === 'number' ? value : 0;
        });
        
        // Colores para las series
        const colors = [
          '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'
        ];
        
        // Nombres más amigables para las métricas comunes
        let friendlyName = getFieldDescription('', col);
        if (col.toLowerCase().includes('cantidad')) {
          friendlyName = 'Cantidad de Ventas';
        } else if (col.toLowerCase().includes('valorneto')) {
          friendlyName = 'Valor Neto';
        } else if (col.toLowerCase().includes('montoigv')) {
          friendlyName = 'Monto IGV';
        } else if (col.toLowerCase().includes('montototal')) {
          friendlyName = 'Monto Total';
        } else if (col.toLowerCase().includes('precio')) {
          friendlyName = 'Precio Promedio';
        }
        
        return {
          name: friendlyName,
          data,
          color: colors[index % colors.length]
        };
      });

      console.log('📈 Series generadas:', series.map(s => ({ name: s.name, dataLength: s.data.length, firstValue: s.data[0] })));

      // Calcular valor máximo entre todas las series
      const allValues = series.flatMap(s => s.data);
      const maxValue = Math.max(...allValues);

      const result = {
        labels,
        values: series[0]?.data || [], // Para compatibilidad con funciones existentes
        maxValue,
        labelColumn,
        valueColumn: seriesColumns[0],
        series,
        isGrouped: true,
        groupingColumn: chartConfig.groupingColumn
      };

      console.log('✅ Datos clustered generados exitosamente:', {
        labelsCount: result.labels.length,
        seriesCount: result.series?.length,
        maxValue: result.maxValue,
        firstLabel: result.labels[0],
        seriesNames: result.series?.map(s => s.name)
      });

      return result;
    } else if (chartType === 'clustered') {
      console.log('❌ Condición clustered falló - cayendo al modo simple:', {
        chartType,
        seriesColumns,
        seriesColumnsLength: seriesColumns?.length,
        reason: !seriesColumns ? 'No seriesColumns' : 
                seriesColumns.length <= 1 ? 'seriesColumns.length <= 1' : 
                'Condición desconocida'
      });
    }
    
    // MODO SIMPLE: Una sola serie (comportamiento original)
    if (!columns.includes(labelColumn) || !columns.includes(valueColumn)) {
      return { 
        labels: [], 
        values: [], 
        maxValue: 0,
        labelColumn: '',
        valueColumn: '',
        percentageColumn: undefined,
        realPercentages: null,
        isGrouped: false
      };
    }
    
    // Buscar columna de porcentajes
    const percentageColumn = columns.find(col => 
      col.toLowerCase().includes('porcentaje') || 
      col.toLowerCase().includes('percentage') ||
      col.toLowerCase().includes('percent')
    );
    
    const labels = queryResults.map(row => String(row[labelColumn] || 'Sin datos'));
    const values = queryResults.map(row => {
      const value = row[valueColumn];
      return typeof value === 'number' ? value : 0;
    });
    
    // Obtener porcentajes reales si están disponibles
    const realPercentages = percentageColumn ? queryResults.map(row => {
      const percentage = row[percentageColumn];
      return typeof percentage === 'number' ? percentage : 0;
    }) : null;
    
    const maxValue = Math.max(...values);
    
    return { 
      labels, 
      values, 
      maxValue, 
      labelColumn, 
      valueColumn,
      percentageColumn,
      realPercentages,
      isGrouped: false
    };
  };

  // NUEVA FUNCIÓN PARA ANALIZAR DATOS CON IA AVANZADA
  const analyzeDataForChart = async () => {
    if (queryResults.length === 0) {
      ToastAlerts.error({
        title: "Error",
        message: "No hay datos para analizar"
      });
      return;
    }

    setIsAnalyzingChart(true);
    
    try {
            // PASO 1: Detección automática avanzada
      const detectionResult = detectOptimalChartType(queryResults);
      console.log('🎯 Resultado de detección automática:', detectionResult);
      
      // PASO 2: Generar configuración específica según el tipo detectado
      let config: {
        labelColumn: string;
        valueColumn: string;
        recommendedType: 'barras' | 'clustered' | 'pastel' | 'dona';
        reasoning: string;
        seriesColumns?: string[];
        groupingColumn?: string;
      };
      
      // FORZAR CLUSTERED SI HAY MÚLTIPLES COLUMNAS NUMÉRICAS
      const columns = getTableColumns(queryResults);
      const numericColumns = columns.filter(col => getColumnType(queryResults, col) === 'number');
      console.log('🔢 Columnas numéricas detectadas:', numericColumns);
      
      if (numericColumns.length >= 2) {
        console.log('🎯 FORZANDO CLUSTERED: Múltiples columnas numéricas detectadas');
        // Configuración para gráfico agrupado
        const clusteredConfig = generateClusteredConfig(queryResults);
        console.log('🔧 Configuración clustered generada:', clusteredConfig);
        
        config = {
          labelColumn: clusteredConfig.labelColumn,
          valueColumn: clusteredConfig.seriesColumns[0],
          seriesColumns: clusteredConfig.seriesColumns,
          groupingColumn: clusteredConfig.groupingColumn,
          recommendedType: 'clustered' as const,
          reasoning: `FORZADO: ${numericColumns.length} métricas detectadas. Series: ${clusteredConfig.seriesColumns.join(', ')}`
        };
        
        console.log('⚙️ Config final FORZADO para clustered:', config);
      } else if (detectionResult.recommendedType === 'clustered') {
        // Configuración para gráfico agrupado (caso original)
        const clusteredConfig = generateClusteredConfig(queryResults);
        console.log('🔧 Configuración clustered generada:', clusteredConfig);
        
        config = {
          labelColumn: clusteredConfig.labelColumn,
          valueColumn: clusteredConfig.seriesColumns[0],
          seriesColumns: clusteredConfig.seriesColumns,
          groupingColumn: clusteredConfig.groupingColumn,
          recommendedType: 'clustered' as const,
          reasoning: `${detectionResult.reasoning}. Series detectadas: ${clusteredConfig.seriesColumns.join(', ')}`
        };
        
        console.log('⚙️ Config final para clustered:', config);
        } else {
        // Configuración para gráficos simples (barras, pastel, dona)
        const columns = getTableColumns(queryResults);
        const numericColumns = columns.filter(col => getColumnType(queryResults, col) === 'number');
        const textColumns = columns.filter(col => getColumnType(queryResults, col) === 'text');
        const dateColumns = columns.filter(col => getColumnType(queryResults, col) === 'date');
        
        // Seleccionar mejor columna de etiquetas
        let labelColumn = textColumns[0] || dateColumns[0] || columns[0];
        if (dateColumns.length > 0) {
          labelColumn = dateColumns[0];
        } else if (textColumns.some(col => 
          col.toLowerCase().includes('nombre') || 
          col.toLowerCase().includes('descripcion') ||
          col.toLowerCase().includes('categoria')
        )) {
          labelColumn = textColumns.find(col => 
            col.toLowerCase().includes('nombre') || 
            col.toLowerCase().includes('descripcion') ||
            col.toLowerCase().includes('categoria')
          ) || textColumns[0];
        }
        
        // Seleccionar mejor columna de valores
        let valueColumn = numericColumns[0] || columns[1];
        if (numericColumns.some(col => 
          col.toLowerCase().includes('total') || 
          col.toLowerCase().includes('cantidad') ||
          col.toLowerCase().includes('monto')
        )) {
          valueColumn = numericColumns.find(col => 
            col.toLowerCase().includes('total') || 
            col.toLowerCase().includes('cantidad') ||
            col.toLowerCase().includes('monto')
          ) || numericColumns[0];
        }
        
        config = {
          labelColumn,
          valueColumn,
          recommendedType: detectionResult.recommendedType,
          reasoning: detectionResult.reasoning
        };
      }

      // VALIDACIÓN FINAL ANTES DE GUARDAR
      console.log('💾 Guardando configuración final:', config);
      console.log('📊 Series que se van a guardar:', config.seriesColumns);

      setChartConfig(config);
      setShowChart(true);
        setChartType(config.recommendedType);

      const confidenceText = detectionResult.confidence >= 0.8 ? 'alta confianza' : 
                            detectionResult.confidence >= 0.6 ? 'confianza media' : 'baja confianza';

      ToastAlerts.success({
        title: "Análisis IA completado",
        message: `Detectado automáticamente: ${config.recommendedType.toUpperCase()} (${confidenceText}). ${config.reasoning.substring(0, 100)}...`
      });
      
      // VERIFICACIÓN POST-GUARDADO
      setTimeout(() => {
        console.log('🔍 Verificación post-guardado de chartConfig:', chartConfig);
      }, 100);

    } catch (error) {
      console.error('❌ Error analizando datos:', error);
      
      // Fallback a configuración simple
      const columns = getTableColumns(queryResults);
      const numericColumn = columns.find(col => getColumnType(queryResults, col) === 'number');
      const fallbackConfig = {
        labelColumn: columns[0],
        valueColumn: numericColumn || columns[1],
        recommendedType: 'barras' as const,
        reasoning: 'Configuración de emergencia: primera columna como etiquetas, primera numérica como valores'
      };
      
      setChartConfig(fallbackConfig);
      setShowChart(true);
      setChartType('barras');
      
      ToastAlerts.warning({
        title: "Usando configuración automática",
        message: "Error en análisis avanzado, aplicando configuración básica"
      });
    } finally {
      setIsAnalyzingChart(false);
    }
  };

  // FUNCIÓN MODIFICADA PARA GENERAR GRÁFICO CON IA
  const toggleChart = async () => {
    if (showChart) {
      setShowChart(false);
      setChartConfig(null);
    } else {
      await analyzeDataForChart();
    }
  };

  // NUEVA FUNCIÓN PARA RENDERIZAR GRÁFICO DE BARRAS AGRUPADAS (CLUSTERED)
  const renderClusteredBarChart = (chartData: ChartData) => {
    console.log('🎨 Renderizando gráfico clustered:', {
      hasData: !!chartData,
      hasSeries: !!chartData.series,
      seriesLength: chartData.series?.length,
      labels: chartData.labels?.slice(0, 3)
    });

    if (!chartData.series || chartData.series.length === 0) {
      return (
        <div className="text-center py-12">
          <BarChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
            Error en datos agrupados
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            No se pudieron generar las series para el gráfico agrupado
          </p>
          <div className="mt-4 text-sm text-gray-400 bg-gray-100 dark:bg-gray-700 rounded p-3 text-left">
            <strong>Debug info:</strong><br/>
            Series: {JSON.stringify(chartData.series)}<br/>
            Labels: {JSON.stringify(chartData.labels?.slice(0, 2))}<br/>
            isGrouped: {String(chartData.isGrouped)}
          </div>
        </div>
      );
    }

    const maxValue = Math.max(...chartData.series.flatMap(s => s.data));

    return (
      <div className="space-y-6">
        {/* Información del gráfico agrupado moderna */}
        <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 dark:from-indigo-900 dark:via-blue-900 dark:to-purple-900 dark:bg-opacity-20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  Análisis Multidimensional
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Comparación de múltiples métricas por período
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {chartData.series.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                métricas
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Períodos Analizados</span>
              </div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {chartData.labels.length}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Métricas Comparadas</span>
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {chartData.series.length}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Valor Máximo</span>
              </div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {maxValue > 999999 ? `${(maxValue/1000000).toFixed(1)}M` : 
                 maxValue > 999 ? `${(maxValue/1000).toFixed(1)}k` : 
                 maxValue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

                                 {/* Leyenda de series moderna */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 rounded-2xl p-6 border border-gray-200 dark:border-gray-600">
          <h5 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">
            Métricas Analizadas
          </h5>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {chartData.series?.map((serie, index) => (
              <motion.div 
                key={`serie-legend-${serie.name}-${index}`} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: serie.color }}
                  />
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    {serie.name}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total: {serie.data.reduce((sum, val) => sum + val, 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Promedio: {(serie.data.reduce((sum, val) => sum + val, 0) / serie.data.length).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

                {/* Gráfico de barras agrupadas moderno */}
        <div className="space-y-8">
          {chartData.labels.map((label: string, labelIndex: number) => (
            <div key={labelIndex} className="relative">
              {/* Etiqueta de la categoría con estilo moderno */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                  <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {label}
                  </h4>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  Total: {chartData.series?.reduce((sum, serie) => sum + (serie.data[labelIndex] || 0), 0).toLocaleString()}
                </div>
              </div>
              
              {/* Grupo de barras con diseño moderno */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-end justify-center space-x-4 h-32">
                  {chartData.series?.map((serie, serieIndex) => {
                    const value = serie.data[labelIndex] || 0;
                    const barHeight = maxValue > 0 ? Math.max((value / maxValue) * 120, value > 0 ? 8 : 0) : 0; // 120px max height
                    
                    return (
                      <div 
                        key={`serie-bar-${serie.name}-${serieIndex}-${labelIndex}`}
                        className="flex flex-col items-center flex-1 max-w-20"
                      >
                        {/* Valor encima de la barra */}
                        <div className="mb-2 text-center">
                          <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            {value > 999999 ? `${(value/1000000).toFixed(1)}M` : 
                             value > 999 ? `${(value/1000).toFixed(1)}k` : 
                             value.toLocaleString()}
                          </div>
                        </div>
                        
                        {/* Barra con gradiente y sombra */}
                        <motion.div
                          initial={{ height: 0, scale: 0.8 }}
                          animate={{ height: `${barHeight}px`, scale: 1 }}
                          transition={{ 
                            duration: 0.8, 
                            delay: (labelIndex * 0.15) + (serieIndex * 0.1),
                            type: "spring",
                            stiffness: 100
                          }}
                          className="w-full rounded-t-xl shadow-lg relative group cursor-pointer hover:shadow-xl transition-all duration-300"
                          style={{ 
                            background: `linear-gradient(135deg, ${serie.color}, ${serie.color}dd)`,
                            minHeight: value > 0 ? '8px' : '0px',
                            border: `2px solid ${serie.color}22`
                          }}
                          whileHover={{ scale: 1.05, y: -2 }}
                        >
                          {/* Brillo superior */}
                          <div 
                            className="absolute top-0 left-0 right-0 h-1/3 rounded-t-xl opacity-30"
                            style={{ 
                              background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)'
                            }}
                          />
                          
                          {/* Tooltip mejorado */}
                          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap z-20 shadow-xl">
                            <div className="font-medium">{serie.name}</div>
                            <div className="text-center">{value.toLocaleString()}</div>
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                          </div>
                        </motion.div>
                        
                        {/* Etiqueta de serie */}
                        <div className="mt-3 text-center">
                          <div 
                            className="w-3 h-3 rounded-full mx-auto mb-1"
                            style={{ backgroundColor: serie.color }}
                          />
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-tight">
                            {serie.name}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

                 {/* Estadísticas comparativas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {chartData.series?.map((serie, index) => {
            const total = serie.data.reduce((sum, val) => sum + val, 0);
            const average = total / serie.data.length;
            const max = Math.max(...serie.data);
            
            return (
              <div 
                key={`serie-stats-${serie.name}-${index}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: serie.color }}
                  />
                  <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                    {serie.name}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div>Total: <span className="font-medium">{total.toLocaleString()}</span></div>
                  <div>Promedio: <span className="font-medium">{average.toFixed(2)}</span></div>
                  <div>Máximo: <span className="font-medium">{max.toLocaleString()}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // NUEVA FUNCIÓN PARA RENDERIZAR GRÁFICO DE BARRAS SIMPLES
  const renderBarChart = (chartData: ChartData) => {
    return (
      <div className="space-y-4">
        {chartData.labels.map((label: string, index: number) => {
          const value = chartData.values[index];
          const displayPercentage = chartData.realPercentages 
            ? chartData.realPercentages[index]
            : chartData.maxValue > 0 ? (value / chartData.maxValue) * 100 : 0;
          
          const barWidthPercentage = chartData.maxValue > 0 ? (value / chartData.maxValue) * 100 : 0;
          
          return (
            <div key={`bar-${label.replace(/\s+/g, '')}-${index}`} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-xs">
                  {label}
                </span>
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {value.toLocaleString()}
                  </span>
                  {chartData.realPercentages && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                      {displayPercentage.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-6 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidthPercentage}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-end pr-2"
                >
                  {barWidthPercentage > 15 && (
                    <span className="text-white text-xs font-medium">
                      {chartData.realPercentages 
                        ? `${displayPercentage.toFixed(1)}%` 
                        : `${barWidthPercentage.toFixed(1)}%`
                      }
                    </span>
                  )}
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // NUEVA FUNCIÓN PARA RENDERIZAR GRÁFICO DE PASTEL
  const renderPieChart = (chartData: ChartData) => {
    const total = chartData.values.reduce((sum: number, value: number) => sum + value, 0);
    let currentAngle = 0;
    
    return (
      <div className="flex flex-col items-center">
        {/* SVG del gráfico de pastel */}
        <div className="relative">
          <svg width="300" height="300" viewBox="0 0 300 300" className="transform -rotate-90">
            {chartData.labels.map((label: string, index: number) => {
              const value = chartData.values[index];
              const percentage = total > 0 ? (value / total) * 100 : 0;
              const angle = (percentage / 100) * 360;
              
              if (percentage === 0) return null;
              
              const x1 = 150 + 120 * Math.cos((currentAngle * Math.PI) / 180);
              const y1 = 150 + 120 * Math.sin((currentAngle * Math.PI) / 180);
              const x2 = 150 + 120 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
              const y2 = 150 + 120 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M 150 150`,
                `L ${x1} ${y1}`,
                `A 120 120 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              const colors = [
                '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', 
                '#ef4444', '#ec4899', '#84cc16', '#f97316', '#3b82f6'
              ];
              
              const element = (
                <motion.path
                  key={`pie-slice-${label.replace(/\s+/g, '')}-${index}`}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="hover:opacity-80 cursor-pointer"
                />
              );
              
              currentAngle += angle;
              return element;
            })}
          </svg>
          
          {/* Centro del pastel con total */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800 dark:text-white">
                {total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total
              </div>
            </div>
          </div>
        </div>
        
        {/* Leyenda */}
        <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
          {chartData.labels.map((label: string, index: number) => {
            const value = chartData.values[index];
            const percentage = total > 0 ? (value / total) * 100 : 0;
            const colors = [
              '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', 
              '#ef4444', '#ec4899', '#84cc16', '#f97316', '#3b82f6'
            ];
            
            return (
              <motion.div
                key={`pie-legend-${label.replace(/\s+/g, '')}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-2"
              >
                <div 
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {value.toLocaleString()} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // NUEVA FUNCIÓN PARA RENDERIZAR GRÁFICO DE DONA
  const renderDonutChart = (chartData: ChartData) => {
    const total = chartData.values.reduce((sum: number, value: number) => sum + value, 0);
    let currentAngle = 0;
    
    return (
      <div className="flex flex-col items-center">
        {/* SVG del gráfico de dona */}
        <div className="relative">
          <svg width="300" height="300" viewBox="0 0 300 300" className="transform -rotate-90">
            {chartData.labels.map((label: string, index: number) => {
              const value = chartData.values[index];
              const percentage = total > 0 ? (value / total) * 100 : 0;
              const angle = (percentage / 100) * 360;
              
              if (percentage === 0) return null;
              
              // Dona exterior
              const x1 = 150 + 120 * Math.cos((currentAngle * Math.PI) / 180);
              const y1 = 150 + 120 * Math.sin((currentAngle * Math.PI) / 180);
              const x2 = 150 + 120 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
              const y2 = 150 + 120 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
              
              // Dona interior
              const x3 = 150 + 70 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
              const y3 = 150 + 70 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
              const x4 = 150 + 70 * Math.cos((currentAngle * Math.PI) / 180);
              const y4 = 150 + 70 * Math.sin((currentAngle * Math.PI) / 180);
              
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M ${x1} ${y1}`,
                `A 120 120 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `L ${x3} ${y3}`,
                `A 70 70 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                'Z'
              ].join(' ');
              
              const colors = [
                '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', 
                '#ef4444', '#ec4899', '#84cc16', '#f97316', '#3b82f6'
              ];
              
              const element = (
                <motion.path
                  key={`donut-slice-${label.replace(/\s+/g, '')}-${index}`}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="hover:opacity-80 cursor-pointer"
                />
              );
              
              currentAngle += angle;
              return element;
            })}
          </svg>
          
          {/* Centro de la dona con total */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800 dark:text-white">
                {total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total
              </div>
            </div>
          </div>
        </div>
        
        {/* Leyenda */}
        <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
          {chartData.labels.map((label: string, index: number) => {
            const value = chartData.values[index];
            const percentage = total > 0 ? (value / total) * 100 : 0;
            const colors = [
              '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', 
              '#ef4444', '#ec4899', '#84cc16', '#f97316', '#3b82f6'
            ];
            
            return (
              <motion.div
                key={`donut-legend-${label.replace(/\s+/g, '')}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-2"
              >
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {value.toLocaleString()} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // NUEVA FUNCIÓN PARA EXPORTAR RESULTADOS COMO EXCEL
  const exportResultsAsExcel = async () => {
    if (queryResults.length === 0) {
      ToastAlerts.error({
        title: "Error de exportación",
        message: "No hay datos para exportar"
      });
      return;
    }

    try {
      ToastAlerts.info({
        title: "Generando Excel...",
        message: "Creando archivo con los datos de la consulta"
      });

      // Obtener columnas y datos
      const columns = getTableColumns(queryResults);
      
      // Preparar datos para Excel: cabeceras + filas
      const excelData = [
        // Primera fila: cabeceras
        columns,
        // Resto de filas: datos
        ...queryResults.map(row => 
          columns.map(col => {
            const value = row[col];
            // Formatear valores para Excel
            if (value === null || value === undefined) return '';
            if (typeof value === 'boolean') return value ? 'Sí' : 'No';
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
              // Si parece una fecha, intentar convertirla
              if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
                try {
                  return new Date(value).toLocaleDateString('es-ES');
                } catch {
                  return value;
                }
              }
              return value;
            }
            return String(value);
          })
        )
      ];

      // Crear libro de trabajo
      const workbook = XLSX.utils.book_new();
      
      // Crear hoja de trabajo desde array de arrays
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      
      // Ajustar ancho de columnas automáticamente
      const colWidths = columns.map(col => {
        // Calcular ancho máximo entre cabecera y datos
        const headerLength = col.length;
        const maxDataLength = Math.max(
          ...queryResults.slice(0, 100).map(row => {
            const value = row[col];
            return String(value || '').length;
          })
        );
        return { wch: Math.min(Math.max(headerLength, maxDataLength, 10), 50) };
      });
      
      worksheet['!cols'] = colWidths;
      
      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados de Consulta');

      // Generar nombre de archivo con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `analisis-bi-${timestamp}.xlsx`;
      
      // Escribir archivo Excel
      XLSX.writeFile(workbook, filename);

      ToastAlerts.success({
        title: "Exportación exitosa",
        message: `Los datos se han exportado a Excel: ${filename}`
      });

    } catch (error) {
      console.error('Error exportando a Excel:', error);
      ToastAlerts.error({
        title: "Error de exportación",
        message: error instanceof Error ? error.message : "Error desconocido al exportar a Excel"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary-dark to-blue-800 text-white rounded-xl shadow-xl p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10"
        >
          <div className="flex items-center mb-6">
            <div className="mr-4 bg-white bg-opacity-20 p-4 rounded-xl backdrop-blur-sm">
              <Bot className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Análisis BI Integrado con IA</h1>
              <p className="text-blue-100 text-lg">
                Sistema médico y comercial unificado - Transforme preguntas en consultas SQL con inteligencia artificial
              </p>
              <div className="mt-3 flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isAIAvailable ? 'bg-green-400' : 'bg-red-400'} shadow-lg`}></div>
                <span className="text-sm text-blue-100 font-medium">
                  {isAIAvailable ? 'Claude (Anthropic) Conectado' : 'Claude No Disponible'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white bg-opacity-10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white bg-opacity-5 rounded-full translate-y-24 -translate-x-24"></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Steps Sidebar */}
        <div className="xl:col-span-1">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 sticky top-6"
          >
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-primary" />
              Proceso de Análisis
            </h2>
            
            <div className="space-y-6">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === step.id;
                const isCompleted = step.completed;
                
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    {/* Connector Line */}
                    {index < steps.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-6 bg-gray-200 dark:bg-gray-600">
                        <motion.div
                          className="w-full bg-primary"
                          initial={{ height: 0 }}
                          animate={{ 
                            height: isCompleted ? '100%' : '0%'
                          }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                      </div>
                    )}
                    
                    <motion.button
                      onClick={() => goToStep(step.id)}
                      className={`w-full text-left p-4 rounded-lg transition-all duration-300 ${
                        isActive 
                          ? 'bg-primary bg-opacity-10 border-2 border-primary shadow-md' 
                          : isCompleted
                          ? 'bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border border-green-200 dark:border-green-800 hover:shadow-md'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isCompleted
                            ? 'bg-green-500 text-white shadow-lg'
                            : isActive 
                            ? 'bg-primary text-white shadow-lg'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                        }`}>
                          {isCompleted ? (
                            <Check className="w-6 h-6" />
                          ) : (
                            <Icon className="w-6 h-6" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className={`font-semibold ${
                            isActive ? 'text-primary' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            {step.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {step.description}
                          </p>
                        </div>
                        
                        {isActive && (
                          <ChevronRight className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="xl:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {/* Step 0: Selector de Tablas */}
            {activeStep === 0 && (
              <motion.div
                key="step-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700"
              >
                <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-750 px-8 py-6 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                        <Database className="w-7 h-7 mr-3 text-primary" />
                        Seleccionar Tablas del Sistema
              </h2>
                      <p className="text-gray-600 dark:text-gray-300 mt-2">
                        Elija las tablas que desea incluir en su análisis de datos médicos
                      </p>
            </div>
                    
                    {/* Botón de reinicio - solo se muestra si hay datos para limpiar */}
                    {(selectedTables.trim() || chatMessages.length > 0 || currentSQLScript || queryResults.length > 0) && (
                      <motion.button
                        onClick={showResetConfirmation}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium shadow-lg transition-all duration-300"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title="Reiniciar análisis completo - Limpia todos los datos de todos los pasos para iniciar desde cero"
                      >
                        <RefreshCw className="w-5 h-5" />
                        <span>Nuevo Análisis</span>
                      </motion.button>
                    )}
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="mb-6">
                    <label className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
                      Escriba los nombres de las tablas:
                </label>
                <textarea
                  value={selectedTables}
                  onChange={(e) => setSelectedTables(e.target.value)}
                      className="w-full h-40 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm shadow-sm"
                  placeholder="Escriba los nombres de las tablas, una por línea:

CALENDAR
SERVICE
PROTOCOL
PERSON
ORGANIZATION"
                />
              </div>
              
                  {/* Grid de tablas disponibles mejorado */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Tablas Disponibles en el Sistema Integrado:
                </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200">Sistema Médico</h4>
                          </div>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            SigesoftDesarrollo_2 - Citas, servicios, diagnósticos, protocolos
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {MEDICAL_TABLES.filter(t => t.database === 'SigesoftDesarrollo_2').length} tablas disponibles
                          </p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <h4 className="font-semibold text-green-800 dark:text-green-200">Sistema Comercial</h4>
                          </div>
                          <p className="text-xs text-green-700 dark:text-green-300">
                            20505310072 - Ventas, productos, cobranzas, inventarios
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {MEDICAL_TABLES.filter(t => t.database === '20505310072').length} tablas disponibles
                          </p>
                        </div>
                      </div>
                      
                      {/* Información sobre especificaciones técnicas críticas */}
                      <div className="mt-4 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-xs font-bold">🔧</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                              🔧 Especificaciones Técnicas Críticas
                            </h4>
                            <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-2">
                              <div className="bg-yellow-100 dark:bg-yellow-800 dark:bg-opacity-30 rounded p-2">
                                <p><strong>📋 SQL Server:</strong> Versión 2012 - La IA usa sintaxis compatible</p>
                              </div>
                              <div className="bg-yellow-100 dark:bg-yellow-800 dark:bg-opacity-30 rounded p-2">
                                <p><strong>🔗 Cross-Database JOIN:</strong> service.v_ComprobantePago contiene múltiples valores (pipe |)</p>
                                <div className="mt-1 font-mono text-xs bg-gray-800 text-green-400 rounded p-2">
                                  [20505310072].[dbo].[VENTA] v<br/>
                                  INNER JOIN [SigesoftDesarrollo_2].[dbo].[SERVICE] s<br/>
                                  ON v.v_CorrelativoDocumentoFin IN (<br/>
                                  &nbsp;&nbsp;SELECT value FROM STRING_SPLIT(s.v_ComprobantePago, '|')<br/>
                                  )
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Información sobre términos de negocio */}
                      <div className="mt-4 bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-xs font-bold">C</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                              🏥 Términos de Negocio - Cajas/Atención
                            </h4>
                            <div className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
                              <p><strong>La IA reconoce automáticamente estos términos:</strong></p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                <div className="space-y-1">
                                  <div>• <strong>Empresarial:</strong> i_ClienteEsAgente = 1</div>
                                  <div>• <strong>Particular:</strong> i_ClienteEsAgente IN (2,8,9)</div>
                                  <div>• <strong>Farmacia:</strong> i_ClienteEsAgente IN (3,4)</div>
                                </div>
                                <div className="space-y-1">
                                  <div>• <strong>Seguros:</strong> i_ClienteEsAgente IN (5,6)</div>
                                  <div>• <strong>MTC:</strong> i_ClienteEsAgente = 7</div>
                                  <div>• <strong>Solidaridad:</strong> i_ClienteEsAgente = 10</div>
                                </div>
                              </div>
                              <p className="mt-2 text-purple-600 dark:text-purple-400 italic">
                                Puede preguntar: "Análisis de caja empresarial" o "Comparar atención particular vs farmacia"
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Información sobre conversión automática de enums */}
                      <div className="mt-4 bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-white text-xs font-bold">🔄</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
                              🔄 Conversión Automática de Enums
                            </h4>
                            <div className="text-xs text-indigo-700 dark:text-indigo-300 space-y-2">
                              <p><strong>La IA convierte automáticamente valores numéricos a texto descriptivo:</strong></p>
                              <div className="bg-indigo-100 dark:bg-indigo-800 dark:bg-opacity-30 rounded p-2">
                                <p><strong>❌ Antes:</strong> i_ServiceStatusId = 1, 2, 3...</p>
                                <p><strong>✅ Ahora:</strong> EstadoServicio = "Activo", "Pendiente", "Cancelado"</p>
                              </div>
                              <div className="bg-indigo-100 dark:bg-indigo-800 dark:bg-opacity-30 rounded p-2 font-mono text-xs">
                                CASE WHEN i_ServiceStatusId = 1 THEN 'Activo'<br/>
                                &nbsp;&nbsp;&nbsp;&nbsp; WHEN i_ServiceStatusId = 2 THEN 'Pendiente'<br/>
                                &nbsp;&nbsp;&nbsp;&nbsp; ELSE 'Desconocido' END AS EstadoServicio
                              </div>
                              <p className="text-indigo-600 dark:text-indigo-400 italic">
                                Los resultados serán siempre en texto legible, no números crípticos
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {MEDICAL_TABLES.map(table => (
                        <motion.div 
                      key={table.id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-750 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-600"
                      onClick={() => {
                        if (!selectedTables.includes(table.name)) {
                          setSelectedTables(prev => prev ? `${prev}\n${table.name}` : table.name);
                        }
                      }}
                    >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold text-gray-800 dark:text-white text-sm">
                            {table.name}
                          </h4>
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  table.database === 'SigesoftDesarrollo_2' 
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                }`}>
                                  {table.database === 'SigesoftDesarrollo_2' ? 'Médico' : 'Ventas'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            {table.description}
                          </p>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-500">
                                {table.fields.length} campos
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">
                                  {table.database.replace('SigesoftDesarrollo_2', 'SigesoftDes')}
                                </span>
                        </div>
                      </div>
                            <div className="ml-3 bg-primary bg-opacity-20 p-2 rounded-full">
                              <Plus className="w-4 h-4 text-primary" />
                    </div>
                          </div>
                        </motion.div>
                  ))}
                </div>
              </div>
                  
                  {selectedTables.trim() && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-2">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-green-800 dark:text-green-400 font-medium">
                          Tablas seleccionadas correctamente
                        </span>
            </div>
          </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 1: Chat con IA */}
            {activeStep === 1 && (
          <motion.div 
                key="step-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700"
              >
                <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-750 px-8 py-6 rounded-t-xl">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                    <MessageSquare className="w-7 h-7 mr-3 text-primary" />
                Chat con IA Analítica
                    <span className={`ml-3 px-3 py-1 text-sm rounded-full font-medium ${
                      enableLocalAI 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}>
                      {enableLocalAI ? 'Powered by Flan-T5-base' : 'Powered by Claude'}
                    </span>
              </h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">
                    Haga preguntas sobre sus datos y obtenga consultas SQL automáticamente
                  </p>
            </div>
            
                {/* Toggle IA con diseño mejorado */}
                <div className="px-8 py-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        {enableLocalAI ? (
                          <Bot className="w-6 h-6 text-blue-600" />
                        ) : (
                          <Bot className="w-6 h-6 text-purple-600" />
                        )}
                        <div>
                          <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                            {enableLocalAI ? 'Flan-T5-base (Local)' : 'Claude (Anthropic)'}
                          </span>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {enableLocalAI ? (
                              'IA local con 250M parámetros - Procesamiento offline'
                            ) : (
                              isAIAvailable ? 'IA avanzada en la nube - Conectado' : 'Servicio no disponible'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <motion.button
                      onClick={() => setEnableLocalAI(!enableLocalAI)}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 ${
                        enableLocalAI 
                          ? 'bg-blue-600'
                          : (isAIAvailable ? 'bg-purple-600' : 'bg-gray-400')
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.span
                        className="inline-block h-6 w-6 transform rounded-full bg-white shadow-lg"
                        animate={{
                          x: enableLocalAI ? 28 : 4
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>
                </div>
                
                {/* Chat messages con diseño mejorado */}
                <div className="h-96 overflow-y-auto p-8 space-y-6">
              {chatMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center"
                      >
                        <Bot className="w-10 h-10 text-white" />
                      </motion.div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                        {enableLocalAI 
                          ? '¡Hola! Soy tu asistente BI con Flan-T5-base'
                          : '¡Hola! Soy tu asistente BI con Claude'
                        }
                      </h3>
                      <div className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed space-y-3">
                        <p className="text-center">
                          Haga preguntas sobre datos médicos y comerciales. Ejemplos:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-lg p-3">
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📊 Análisis Médico</h4>
                            <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                              <li>• "¿Cuáles son los diagnósticos más frecuentes?"</li>
                              <li>• "¿Qué empresas tienen más servicios?"</li>
                              <li>• "Distribución de pacientes por edad"</li>
                              <li>• "Relaciona servicios médicos con ventas"</li>
                              <li>• "Estados de servicios por mes" (convierte enums)</li>
                            </ul>
                          </div>
                          <div className="bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg p-3">
                            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">💰 Análisis Comercial</h4>
                            <ul className="space-y-1 text-green-700 dark:text-green-300">
                              <li>• "¿Cuáles son los productos más vendidos?"</li>
                              <li>• "Ventas por mes del último año"</li>
                              <li>• "Estado de inventarios por almacén"</li>
                              <li>• "Análisis de caja empresarial" (tipos descriptivos)</li>
                              <li>• "Comparar atención particular vs farmacia"</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                </div>
              ) : (
                chatMessages.map(message => (
                  <motion.div
                    key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                        <div className={`max-w-4xl rounded-2xl px-6 py-4 ${
                      message.type === 'user'
                            ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white shadow-md'
                    }`}>
                          <div className="flex items-start space-x-3">
                        {message.type === 'ai' && (
                              <div className="w-8 h-8 mt-1 bg-primary bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                                <Bot className="w-5 h-5 text-primary" />
                              </div>
                        )}
                        {message.type === 'user' && (
                              <div className="w-8 h-8 mt-1 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5" />
                              </div>
                        )}
                        <div className="flex-1">
                              <p className="leading-relaxed">{message.content}</p>
                          {message.sqlScript && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  transition={{ delay: 0.3 }}
                                  className="mt-4 bg-gray-900 text-green-400 rounded-xl p-4 text-sm font-mono overflow-x-auto shadow-inner"
                                >
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-gray-400 font-medium">SQL Script:</span>
                                    <motion.button
                                  onClick={() => copySQLToClipboard(message.sqlScript!)}
                                      className="text-gray-400 hover:text-white flex items-center space-x-2 text-xs bg-gray-800 px-3 py-1 rounded-lg transition-colors"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar</span>
                                    </motion.button>
                              </div>
                                  <pre className="whitespace-pre-wrap leading-relaxed">{message.sqlScript}</pre>
                                </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              
              {isAITyping && (
                <motion.div
                      initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-6 py-4 shadow-md">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary bg-opacity-20 rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                          </div>
                      <div className="flex space-x-1">
                            <motion.div 
                              className="w-2 h-2 bg-primary rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div 
                              className="w-2 h-2 bg-primary rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                            />
                            <motion.div 
                              className="w-2 h-2 bg-primary rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                            />
                      </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            {enableLocalAI ? 'Flan-T5-base procesando...' : 'Claude analizando...'}
                          </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
                {/* Input del chat mejorado */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-750 rounded-b-xl">
                  <div className="flex space-x-4">
                    <textarea
                  value={currentMessage}
                      onChange={handleMessageChange}
                      onKeyPress={handleKeyPress}
                      placeholder={enableLocalAI 
                        ? "Escriba su pregunta para Flan-T5-base..." 
                        : "Escriba su pregunta para Claude..."
                      }
                      className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white resize-none shadow-sm"
                      style={{ 
                        minHeight: '48px',
                        height: '48px',
                        lineHeight: '24px'
                      }}
                  disabled={isAITyping}
                      rows={1}
                />
                    <motion.button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isAITyping}
                      className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:from-primary-dark hover:to-blue-700 disabled:opacity-50 font-medium shadow-lg self-end"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                >
                      <Send className="w-5 h-5" />
                  <span>Enviar</span>
                    </motion.button>
              </div>
            </div>
          </motion.div>
            )}

            {/* Step 2: Script SQL */}
            {activeStep === 2 && (
            <motion.div 
                key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
            >
                {/* Script SQL actual */}
                {currentSQLScript && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-750 px-8 py-6 rounded-t-xl">
                <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                            <FileText className="w-7 h-7 mr-3 text-primary" />
                    Script SQL Generado
                  </h2>
                          <p className="text-gray-600 dark:text-gray-300 mt-2">
                            Su consulta SQL está lista para usar
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <motion.button
                      onClick={() => copySQLToClipboard(currentSQLScript)}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center space-x-2 font-medium shadow-sm"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                    >
                            <Copy className="w-4 h-4" />
                      <span>Copiar</span>
                          </motion.button>
                          <motion.button
                            onClick={executeCurrentScript}
                            disabled={isExecutingScript || !currentSQLScript.trim()}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm flex items-center space-x-2 font-medium shadow-lg"
                            whileHover={{ scale: isExecutingScript ? 1 : 1.02 }}
                            whileTap={{ scale: isExecutingScript ? 1 : 0.98 }}
                          >
                            {isExecutingScript ? (
                              <>
                                <motion.div
                                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                                <span>Ejecutando...</span>
                              </>
                            ) : (
                              <>
                                <Database className="w-4 h-4" />
                                <span>Ejecutar</span>
                              </>
                            )}
                          </motion.button>
                          <motion.button
                      onClick={() => setShowSaveModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg text-sm hover:from-primary-dark hover:to-blue-700 flex items-center space-x-2 font-medium shadow-lg"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                    >
                            <Save className="w-4 h-4" />
                      <span>Guardar</span>
                          </motion.button>
                  </div>
                </div>
              </div>
                    <div className="p-8">
                      <div className="bg-gray-900 text-green-400 rounded-xl p-6 font-mono text-sm overflow-x-auto shadow-inner border border-gray-800">
                        <pre className="whitespace-pre-wrap leading-relaxed">{currentSQLScript}</pre>
                </div>
              </div>
        </div>
                )}
                
                {/* Consultas guardadas mejoradas */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                  <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 px-8 py-6 rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                      <Save className="w-6 h-6 mr-3 text-primary" />
                Consultas Guardadas
              </h2>
            </div>
                  <div className="p-8">
              {savedQueries.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                          No hay consultas guardadas
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Las consultas que guarde aparecerán aquí
                        </p>
                </div>
              ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedQueries.map(query => (
                          <motion.div
                      key={query.id}
                            className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:border-primary hover:shadow-lg cursor-pointer transition-all duration-300 bg-gray-50 dark:bg-gray-750"
                      onClick={() => loadSavedQuery(query)}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                    >
                            <h3 className="font-semibold text-gray-800 dark:text-white text-lg mb-2">
                        {query.name}
                      </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                        {query.description}
                      </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 italic bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                        "{query.userQuestion}"
                      </p>
                          </motion.div>
                        ))}
                    </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Resultados */}
            {activeStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Resultados de la consulta */}
                {queryResults.length > 0 ? (
                  <div ref={resultsCardRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-750 px-8 py-6 rounded-t-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                            <Table className="w-7 h-7 mr-3 text-primary" />
                            Resultados de la Consulta
                          </h2>
                          <p className="text-gray-600 dark:text-gray-300 mt-2">
                            Los resultados de la consulta se muestran a continuación
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <motion.button
                            onClick={() => setShowSaveModal(true)}
                            className="px-4 py-2 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg text-sm hover:from-primary-dark hover:to-blue-700 flex items-center space-x-2 font-medium shadow-lg"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Save className="w-4 h-4" />
                            <span>Guardar</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                    <div className="p-8">
                      {/* Estadísticas de resultados */}
                      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <Table className="w-5 h-5 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Total de Filas</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                            {queryResults.length.toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <Database className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-green-800 dark:text-green-200">Columnas</span>
                          </div>
                          <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                            {getTableColumns(queryResults).length}
                          </p>
                        </div>
                        
                        <div className="bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-5 h-5 text-purple-600" />
                            <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Estado</span>
                          </div>
                          <p className="text-lg font-semibold text-purple-900 dark:text-purple-100 mt-1">
                            {queryResults.length > 0 ? 'Datos Cargados' : 'Sin Datos'}
                          </p>
                        </div>
                      </div>

                      {/* Grid dinámico de resultados */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                {getTableColumns(queryResults).map((column, index) => {
                                  const columnType = getColumnType(queryResults, column);
                                  const isFirstColumn = index === 0;
                                  
                                  return (
                                    <th 
                                      key={column}
                                      className={`px-6 py-4 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider ${
                                        isFirstColumn ? 'text-left' : 'text-center'
                                      } ${
                                        index === 0 ? 'rounded-tl-lg' : ''
                                      } ${
                                        index === getTableColumns(queryResults).length - 1 ? 'rounded-tr-lg' : ''
                                      }`}
                                    >
                                      <div className={`flex items-center space-x-2 ${
                                        isFirstColumn ? 'justify-start' : 'justify-center'
                                      }`}>
                                        <span>{column}</span>
                                        <span className={`px-2 py-1 text-xs rounded-full ${
                                          columnType === 'number' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                          columnType === 'date' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                          columnType === 'boolean' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                          'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                        }`}>
                                          {columnType === 'number' ? '#' :
                                           columnType === 'date' ? '📅' :
                                           columnType === 'boolean' ? '✓' : 'T'}
                                        </span>
                                      </div>
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                              {queryResults.map((row, rowIndex) => (
                                <motion.tr
                                  key={rowIndex}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: rowIndex * 0.02, duration: 0.3 }}
                                  className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200"
                                >
                                  {getTableColumns(queryResults).map((column, columnIndex) => {
                                    const value = row[column];
                                    const isFirstColumn = columnIndex === 0;
                                    
                                    return (
                                      <td 
                                        key={`${rowIndex}-${column}`}
                                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                                          isFirstColumn ? 'text-left' : 'text-center'
                                        }`}
                                      >
                                        <span className="text-gray-900 dark:text-gray-100">
                                          {formatCellValue(value)}
                                        </span>
                                      </td>
                                    );
                                  })}
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                </div>
                        
                        {/* Footer con información adicional */}
                        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>
                              Mostrando {queryResults.length} {queryResults.length === 1 ? 'fila' : 'filas'}
                            </span>
                            <span>
                              {getTableColumns(queryResults).length} {getTableColumns(queryResults).length === 1 ? 'columna' : 'columnas'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Botón para continuar a visualización */}
                      <div className="mt-6 flex justify-center">
                        <motion.button
                          onClick={() => setActiveStep(4)}
                          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg flex items-center space-x-3"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <BarChart className="w-5 h-5" />
                          <span>Continuar a Visualización y Exportación</span>
                          <ChevronRight className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                      No hay resultados disponibles
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Los resultados aparecerán aquí después de ejecutar el script SQL
                    </p>
                </div>
              )}
              </motion.div>
            )}

            {/* Step 4: Visualización */}
            {activeStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Visualización y Exportación */}
                {queryResults.length > 0 ? (
                  <div ref={resultsCardRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-700 dark:to-gray-750 px-8 py-6 rounded-t-xl">
                      <div className="flex justify-between items-center">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center">
                            <BarChart className="w-7 h-7 mr-3 text-primary" />
                            Visualización y Exportación
                          </h2>
                          <p className="text-gray-600 dark:text-gray-300 mt-2">
                            Genere gráficos y exporte sus resultados
                          </p>
                        </div>
                        <div className="flex space-x-3">
                          <motion.button
                            onClick={exportResultsAsExcel}
                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm hover:from-green-700 hover:to-emerald-700 flex items-center space-x-2 font-medium shadow-lg"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Download className="w-4 h-4" />
                            <span>Exportar Excel</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    <div className="p-8">
                      {/* Botón para generar gráfico con IA */}
                      <div className="mb-6 flex flex-col items-center space-y-4">
                        <motion.button
                          onClick={toggleChart}
                          disabled={isAnalyzingChart}
                          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-lg flex items-center space-x-3"
                          whileHover={{ scale: isAnalyzingChart ? 1 : 1.02 }}
                          whileTap={{ scale: isAnalyzingChart ? 1 : 0.98 }}
                        >
                          {isAnalyzingChart ? (
                            <>
                              <motion.div
                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              <span>Flan-T5-base analizando...</span>
                            </>
                          ) : (
                            <>
                              <BarChart className="w-5 h-5" />
                              <span>{showChart ? 'Ocultar Gráfico' : 'Analizar con IA y Generar Gráfico (Barras Simples/Agrupadas/Pastel/Dona)'}</span>
                            </>
                          )}
                        </motion.button>
                        
                        {/* Información sobre disponibilidad de IA local */}
                        <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm">
                          <div className={`w-2 h-2 rounded-full ${isLocalAIAvailable ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                          <span className="text-gray-600 dark:text-gray-400">
                            {isLocalAIAvailable 
                                ? 'IA avanzada de detección disponible - detecta automáticamente barras simples vs agrupadas' 
                                : 'Sistema de detección inteligente cargando - fallback automático disponible'
                            }
                          </span>
                          </div>
                          
                          {/* Botón de debug temporal */}
                          <motion.button
                            onClick={() => {
                              console.log('🧪 DEBUG: Forzando detección clustered');
                              const detection = detectOptimalChartType(queryResults);
                              console.log('🔍 Resultado detección:', detection);
                              const config = generateClusteredConfig(queryResults);
                              console.log('⚙️ Config clustered:', config);
                              
                              const finalConfig = {
                                labelColumn: config.labelColumn,
                                valueColumn: config.seriesColumns[0],
                                seriesColumns: config.seriesColumns,
                                groupingColumn: config.groupingColumn,
                                recommendedType: 'clustered' as const,
                                reasoning: 'DEBUG: Forzado manualmente'
                              };
                              
                              console.log('🧪 DEBUG: Configuración final que se va a guardar:', finalConfig);
                              console.log('🧪 DEBUG: Series columns específicamente:', {
                                seriesColumns: finalConfig.seriesColumns,
                                length: finalConfig.seriesColumns?.length,
                                firstSeries: finalConfig.seriesColumns?.[0],
                                allSeries: finalConfig.seriesColumns
                              });
                              
                              setChartConfig(finalConfig);
                              setChartType('clustered');
                              setShowChart(true);
                            }}
                            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            🧪 DEBUG
                          </motion.button>
                        </div>

                        {/* Mostrar configuración sugerida por IA */}
                        {chartConfig && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded-lg p-4 max-w-2xl"
                          >
                            <div className="flex items-start space-x-3">
                              <Bot className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                  Configuración sugerida por IA de Detección Avanzada:
                                </h4>
                                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                  <p><strong>Etiquetas (X):</strong> {chartConfig.labelColumn}</p>
                                  <p><strong>Valores (Y):</strong> {chartConfig.valueColumn}</p>
                                  <p><strong>Razonamiento:</strong> {chartConfig.reasoning}</p>
                                </div>
            </div>
          </div>
        </motion.div>
                        )}
      </div>

                      {/* Selector de tipo de gráfico */}
                      {chartConfig && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-6"
                        >
                          <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                            <BarChart className="w-5 h-5 mr-2 text-primary" />
                            Tipo de Gráfico
                          </h4>
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                              { 
                                type: 'barras' as const, 
                                label: 'Barras Simples', 
                                icon: BarChart, 
                                description: 'Una métrica, ranking',
                                recommended: chartConfig.recommendedType === 'barras'
                              },
                              { 
                                type: 'clustered' as const, 
                                label: 'Barras Agrupadas', 
                                icon: BarChart, 
                                description: 'Múltiples métricas',
                                recommended: chartConfig.recommendedType === 'clustered'
                              },
                              { 
                                type: 'pastel' as const, 
                                label: 'Pastel', 
                                icon: PieChart, 
                                description: 'Mostrar proporciones',
                                recommended: chartConfig.recommendedType === 'pastel'
                              },
                              { 
                                type: 'dona' as const, 
                                label: 'Dona', 
                                icon: PieChart, 
                                description: 'Proporciones modernas',
                                recommended: chartConfig.recommendedType === 'dona'
                              }
                            ].map((option) => {
                              const Icon = option.icon;
                              const isSelected = chartType === option.type;
                              
                              return (
                                <motion.button
                                  key={option.type}
                                  onClick={() => setChartType(option.type)}
                                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                                    isSelected
                                      ? 'border-primary bg-primary bg-opacity-10 shadow-lg'
                                      : 'border-gray-200 dark:border-gray-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }`}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {/* Badge de recomendado */}
                                  {option.recommended && (
                                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                                      IA ✨
                                    </div>
                                  )}
                                  
                                  <div className="flex flex-col items-center space-y-2">
                                    <Icon className={`w-8 h-8 ${
                                      isSelected ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
                                    }`} />
                                    <span className={`font-semibold ${
                                      isSelected ? 'text-primary' : 'text-gray-700 dark:text-gray-300'
                                    }`}>
                                      {option.label}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                      {option.description}
                                    </span>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}

                      {/* Gráfico dinámico */}
                      <AnimatePresence>
                        {showChart && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.5 }}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden"
                          >
                            <div className="border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-750 px-8 py-6">
                              <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                                <BarChart className="w-6 h-6 mr-3 text-indigo-600" />
                                Gráfico Dinámico - Visualización de Datos
                              </h3>
                              <p className="text-gray-600 dark:text-gray-300 mt-2">
                                Representación visual de los datos de la consulta
                              </p>
                            </div>
                            
                            <div className="p-8">
                              {(() => {
                                const chartData = generateChartData();
                                
                                if (chartData.labels.length === 0) {
                                  return (
                                    <div className="text-center py-12">
                                      <BarChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                      <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                                        No se pueden generar gráficos
                                      </h3>
                                      <p className="text-gray-500 dark:text-gray-400">
                                        Los datos deben tener al menos una columna numérica para crear el gráfico
                                      </p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-6">
                                    {/* Información del gráfico */}
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                          <span className="font-semibold text-gray-700 dark:text-gray-300">Etiquetas: </span>
                                          <span className="text-gray-600 dark:text-gray-400">{chartData.labelColumn}</span>
                                        </div>
                                        <div>
                                          <span className="font-semibold text-gray-700 dark:text-gray-300">Valores: </span>
                                          <span className="text-gray-600 dark:text-gray-400">{chartData.valueColumn}</span>
                                        </div>
                                        <div>
                                          <span className="font-semibold text-gray-700 dark:text-gray-300">Porcentajes: </span>
                                          <span className="text-gray-600 dark:text-gray-400">
                                            {chartData.percentageColumn ? `${chartData.percentageColumn} (datos reales)` : 'Calculados relativos'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="font-semibold text-gray-700 dark:text-gray-300">Tipo: </span>
                                          <span className="text-gray-600 dark:text-gray-400 capitalize">
                                            {chartType} 
                                            {chartConfig?.recommendedType === chartType && (
                                              <span className="ml-1 text-green-600 dark:text-green-400">✨ IA</span>
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Renderizado dinámico del gráfico */}
                                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                                      {chartType === 'barras' && renderBarChart(chartData)}
                                      {chartType === 'clustered' && renderClusteredBarChart(chartData)}
                                      {chartType === 'pastel' && renderPieChart(chartData)}
                                      {chartType === 'dona' && renderDonutChart(chartData)}
                                    </div>

                                    {/* Estadísticas del gráfico */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                                      <div className="bg-indigo-50 dark:bg-indigo-900 dark:bg-opacity-20 rounded-lg p-4">
                                        <div className="flex items-center space-x-2">
                                          <BarChart className="w-5 h-5 text-indigo-600" />
                                          <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Valor Máximo</span>
                                        </div>
                                        <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">
                                          {chartData.maxValue.toLocaleString()}
                                        </p>
                                      </div>
                                      
                                      <div className="bg-purple-50 dark:bg-purple-900 dark:bg-opacity-20 rounded-lg p-4">
                                        <div className="flex items-center space-x-2">
                                          <Database className="w-5 h-5 text-purple-600" />
                                          <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Total Elementos</span>
                                        </div>
                                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                                          {chartData.values.length}
                                        </p>
                                      </div>
                                      
                                      <div className="bg-green-50 dark:bg-green-900 dark:bg-opacity-20 rounded-lg p-4">
                                        <div className="flex items-center space-x-2">
                                          <Table className="w-5 h-5 text-green-600" />
                                          <span className="text-sm font-medium text-green-800 dark:text-green-200">Promedio</span>
                                        </div>
                                        <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                                          {(chartData.values.reduce((a, b) => a + b, 0) / chartData.values.length).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                      
                                      {chartData.realPercentages && (
                                        <div className="bg-orange-50 dark:bg-orange-900 dark:bg-opacity-20 rounded-lg p-4">
                                          <div className="flex items-center space-x-2">
                                            <Database className="w-5 h-5 text-orange-600" />
                                            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">% Promedio</span>
                                          </div>
                                          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">
                                            {(chartData.realPercentages.reduce((a, b) => a + b, 0) / chartData.realPercentages.length).toFixed(2)}%
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                      No hay datos para visualizar
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Primero debe ejecutar una consulta para generar datos
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal para guardar consulta - mejorado */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                <Save className="w-6 h-6 mr-3 text-primary" />
                Guardar Consulta
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Nombre de la consulta
                  </label>
                  <input
                    type="text"
                    value={queryName}
                    onChange={(e) => setQueryName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Ej: Diagnósticos más frecuentes"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={queryDescription}
                    onChange={(e) => setQueryDescription(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                    rows={3}
                    placeholder="Descripción detallada de la consulta..."
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <motion.button
                  onClick={() => setShowSaveModal(false)}
                  className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={saveCurrentQuery}
                  disabled={!queryName.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:from-primary-dark hover:to-blue-700 disabled:opacity-50 font-medium shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Guardar Consulta
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmación de reinicio */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 dark:bg-opacity-30 rounded-full flex items-center justify-center mr-4">
                  <RefreshCw className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    Reiniciar Análisis
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  ¿Está seguro de que desea reiniciar el análisis? Se eliminarán:
                </p>
                <ul className="mt-3 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                    Tablas seleccionadas
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                    Historial del chat con IA
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                    Scripts SQL generados
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                    Resultados y gráficos
                  </li>
                </ul>
                <p className="mt-3 text-xs text-green-600 dark:text-green-400">
                  ✓ Las consultas guardadas se mantendrán
                </p>
              </div>
              
              <div className="flex space-x-4">
                <motion.button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={confirmResetAnalysis}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium shadow-lg flex items-center justify-center space-x-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sí, Reiniciar</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalisisBI; 
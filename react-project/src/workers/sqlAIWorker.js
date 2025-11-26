// Configuración de entorno para ONNX Runtime Web
if (typeof globalThis !== 'undefined') {
  globalThis.global = globalThis;
}

// IMPORTAR MedicalTables-v2.ts para acceso completo a la estructura de BD
let tablesStructure = null;
let DatabaseQueryBuilder = null;

// Función para cargar la estructura de tablas
async function loadTablesStructure() {
  try {
    // Importar dinámicamente MedicalTables-v2.ts
    const module = await import('../pages/ConsultasBI/MedicalTables-v2.ts');
    tablesStructure = module.tablesStructure;
    DatabaseQueryBuilder = module.DatabaseQueryBuilder;
    console.log('✅ Estructura de tablas cargada en worker:', Object.keys(tablesStructure).length, 'tablas');
    return true;
  } catch (error) {
    console.warn('⚠️ No se pudo cargar MedicalTables-v2.ts en worker:', error.message);
    return false;
  }
}

// Variables para el sistema de IA híbrido
let useOnlineAI = true; // ✅ ACTIVADO PARA V2: Usar Flan-T5 como orquestador
let pipeline = null;
let transformersAvailable = false;
let initPromise = null;

// NUEVO V2: Analizador inteligente de consultas con Flan-T5
class QueryAnalyzer {
  static async analyzeUserQuestion(userQuestion, availableTables) {
    console.log('🔍 Iniciando análisis inteligente de:', userQuestion);
    console.log('📋 Tablas disponibles:', availableTables);
    
    // Cargar estructura de tablas si no está disponible
    if (!tablesStructure) {
      console.log('📊 Cargando estructura de MedicalTables-v2.ts...');
      await loadTablesStructure();
    }
    
    const lowerQuestion = userQuestion.toLowerCase();
    
    // Análisis de intención con IA
    const intent = this.detectIntent(lowerQuestion);
    const entities = this.extractEntities(lowerQuestion);
    const timeframe = this.detectTimeframe(lowerQuestion);
    const requiredTables = this.detectRequiredTables(lowerQuestion, availableTables);
    const complexity = this.assessComplexity(lowerQuestion, requiredTables);
    
    // Si Flan-T5 está disponible, usar para refinamiento
    let aiEnhancedAnalysis = null;
    if (transformersAvailable && useOnlineAI) {
      try {
        aiEnhancedAnalysis = await this.enhanceWithFlanT5(userQuestion, {
          intent, entities, timeframe, requiredTables
        });
      } catch (error) {
        console.warn('⚠️ Flan-T5 no disponible, usando análisis local:', error.message);
      }
    }
    
    const analysis = {
      intent,
      entities: aiEnhancedAnalysis?.entities || entities,
      timeframe,
      requiredTables: aiEnhancedAnalysis?.requiredTables || requiredTables,
      relationships: this.detectRelationships(requiredTables),
      complexity,
      confidence: aiEnhancedAnalysis ? 0.9 : 0.7
    };
    
    console.log('✅ Análisis completado:', analysis);
    return analysis;
  }
  
  static detectIntent(lowerQuestion) {
    const medicalKeywords = ['diagnósticos', 'pacientes', 'servicios', 'enfermedades', 'médico', 'consultas', 'citas', 'atenciones', 'médicos', 'tratantes'];
    const commercialKeywords = ['ventas', 'ingresos', 'productos', 'cobranza', 'facturación', 'comercial', 'dinero', 'montos', 'total', 'precio', 'costo', 'comprobantes', 'documentos'];
    const analyticalKeywords = ['análisis', 'tendencia', 'comparar', 'estadísticas', 'reporte'];
    
    const medicalScore = medicalKeywords.filter(word => lowerQuestion.includes(word)).length;
    const commercialScore = commercialKeywords.filter(word => lowerQuestion.includes(word)).length;
    const analyticalScore = analyticalKeywords.filter(word => lowerQuestion.includes(word)).length;
    
    // Detectar consultas híbridas (médico + comercial)
    if (medicalScore > 0 && commercialScore > 0) {
      console.log('🔄 Consulta HÍBRIDA detectada: Atenciones médicas + Ventas');
      return 'hybrid';
    }
    
    if (medicalScore > commercialScore) return 'medical';
    if (commercialScore > 0) return 'commercial';
    if (analyticalScore > 0) return 'analytical';
    
    return 'medical'; // Default para sistema médico
  }
  
  static extractEntities(lowerQuestion) {
    const entityMap = {
      'diagnósticos': ['diagnósticos', 'diagnóstico', 'enfermedades', 'patologías'],
      'pacientes': ['pacientes', 'paciente', 'personas', 'persona'],
      'servicios': ['servicios', 'servicio', 'atenciones', 'consultas'],
      'ventas': ['ventas', 'venta', 'productos', 'producto'],
      'empresas': ['empresas', 'empresa', 'organizaciones', 'clientes'],
      'ingresos': ['ingresos', 'ganancias', 'facturación', 'dinero'],
      'tiempo': ['mes', 'meses', 'año', 'años', 'período', 'periodo']
    };
    
    const entities = [];
    Object.entries(entityMap).forEach(([entity, keywords]) => {
      if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
        entities.push(entity);
      }
    });
    
    return entities;
  }
  
  static detectTimeframe(lowerQuestion) {
    const now = new Date();
    let start = '';
    let end = 'GETDATE()';
    let period = '3 meses';
    
    if (lowerQuestion.includes('último mes') || lowerQuestion.includes('mes actual')) {
      start = 'DATEADD(month, -1, GETDATE())';
      period = '1 mes';
    } else if (lowerQuestion.includes('últimos 6 meses') || lowerQuestion.includes('semestre')) {
      start = 'DATEADD(month, -6, GETDATE())';
      period = '6 meses';
    } else if (lowerQuestion.includes('último año') || lowerQuestion.includes('año actual')) {
      start = 'DATEADD(year, -1, GETDATE())';
      period = '12 meses';
    } else if (lowerQuestion.includes('abril')) {
      start = '2024-04-01';
      period = 'desde abril';
    } else if (lowerQuestion.includes('hoy') || lowerQuestion.includes('actual')) {
      start = 'DATEADD(month, -1, GETDATE())';
      period = '1 mes';
    } else {
      // Default: últimos 3 meses
      start = 'DATEADD(month, -3, GETDATE())';
      period = '3 meses';
    }
    
    return { start, end, period };
  }
  
  static detectRequiredTables(lowerQuestion, availableTables) {
    console.log('🔍 Detectando tablas requeridas para:', lowerQuestion);
    console.log('📋 Tablas disponibles recibidas:', availableTables);
    
    const tableMapping = {
      // Médicas - Base de datos: SigesoftDesarrollo_2
      'service': ['servicios', 'servicio', 'atenciones', 'consultas', 'citas'],
      'person': ['pacientes', 'paciente', 'personas', 'persona', 'edad', 'años'],
      'organization': ['empresas', 'empresa', 'organizaciones', 'clientes'],
      'diagnosticrepository': ['diagnósticos', 'diagnóstico', 'enfermedades'],
      'diseases': ['enfermedades', 'enfermedad', 'patologías'],
      'cie10': ['cie10', 'códigos', 'clasificación'],
      'calendar': ['citas', 'agenda', 'calendario'],
      'protocol': ['consultorio', 'consultorios', 'especialidad', 'especialidades', 'protocolo', 'protocolos', 'top de protocolos'],
      'servicecomponent': ['médicos', 'medico', 'doctor', 'doctores', 'tratante', 'tratantes', 'médico tratante', 'medicos tratantes', 'profesional', 'profesionales'],
      
      // Comerciales - Base de datos: 20505310072
      'venta': ['ventas', 'venta', 'facturación', 'dinero', 'montos', 'total', 'ingresos', 'comprobantes', 'documentos'],
      'producto': ['productos', 'producto', 'medicamentos'],
      'documento': ['documentos', 'documento', 'comprobantes', 'comprobante'],
      'productodetalle': ['detalles', 'detalle'],
      'productoalmacen': ['almacén', 'almacen', 'stock', 'inventario']
    };
    
    const requiredTables = [];
    
    // Función helper para encontrar tabla en availableTables
    const findTableInAvailable = (tableName) => {
      return availableTables.find(availableTable => 
        availableTable.toLowerCase().includes(tableName.toLowerCase()) ||
        availableTable.toLowerCase().endsWith(`.${tableName.toLowerCase()}`)
      );
    };
    
    // Detectar tablas basadas en keywords
    Object.entries(tableMapping).forEach(([table, keywords]) => {
      if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
        const foundTable = findTableInAvailable(table);
        if (foundTable) {
          requiredTables.push(table); // Usar nombre simplificado para lógica interna
          console.log(`✅ Detectada tabla ${table} por keywords: ${keywords.filter(k => lowerQuestion.includes(k)).join(', ')}`);
        }
      }
    });
    
    // Si se detecta diagnósticos, agregar tablas relacionadas
    if (requiredTables.includes('diagnosticrepository')) {
      ['diseases', 'cie10', 'service'].forEach(table => {
        const foundTable = findTableInAvailable(table);
        if (foundTable && !requiredTables.includes(table)) {
          requiredTables.push(table);
          console.log(`✅ Agregada tabla relacionada: ${table}`);
        }
      });
    }
    
    // Si se detecta servicios, agregar relacionadas
    if (requiredTables.includes('service')) {
      ['person', 'organization'].forEach(table => {
        const foundTable = findTableInAvailable(table);
        if (foundTable && !requiredTables.includes(table)) {
          requiredTables.push(table);
          console.log(`✅ Agregada tabla relacionada: ${table}`);
        }
      });
    }
    
    // Si se detecta protocol (consultorios), agregar service
    if (requiredTables.includes('protocol')) {
      const foundService = findTableInAvailable('service');
      if (foundService && !requiredTables.includes('service')) {
        requiredTables.push('service');
        console.log(`✅ Agregada tabla service para consultorios`);
      }
    }
    
    // Si se detecta servicecomponent (médicos tratantes), agregar tablas relacionadas
    if (requiredTables.includes('servicecomponent')) {
      // Si tenemos acceso a la estructura real, usar customJoins
      if (tablesStructure) {
        const serviceComponentKey = Object.keys(tablesStructure).find(key => 
          tablesStructure[key].name.toLowerCase() === 'servicecomponent'
        );
        
        if (serviceComponentKey) {
          const schema = tablesStructure[serviceComponentKey];
          
          // Agregar service (FK directo)
          if (schema.foreignKeys.v_ServiceId) {
            const foundService = findTableInAvailable('service');
            if (foundService && !requiredTables.includes('service')) {
              requiredTables.push('service');
              console.log(`✅ Agregada tabla FK: service`);
            }
          }
          
          // Agregar tablas de customJoins para médicos tratantes
          if (schema.customJoins && schema.customJoins.i_MedicoTratanteId) {
            schema.customJoins.i_MedicoTratanteId.joins.forEach(step => {
              const tableName = step.table.toLowerCase();
              const foundTable = findTableInAvailable(tableName);
              if (foundTable && !requiredTables.includes(tableName)) {
                requiredTables.push(tableName);
                console.log(`✅ Agregada tabla customJoin: ${tableName}`);
              }
            });
          }
        }
      } else {
        // Fallback: agregar manualmente
        ['service', 'systemuser', 'person'].forEach(table => {
          const foundTable = findTableInAvailable(table);
          if (foundTable && !requiredTables.includes(table)) {
            requiredTables.push(table);
            console.log(`✅ Agregada tabla relacionada para médicos tratantes (fallback): ${table}`);
          }
        });
      }
    }
    
    // LÓGICA ESPECIAL PARA CONSULTAS HÍBRIDAS (Médico + Comercial)
    const hasServiceTable = requiredTables.includes('service');
    const hasVentaTable = requiredTables.includes('venta');
    
    if (hasServiceTable && hasVentaTable) {
      console.log('🔄 CONSULTA HÍBRIDA DETECTADA: service + venta');
      console.log('📋 Se requiere enlace complejo entre bases de datos');
      
      // Marcar que es una consulta híbrida para el orquestador
      requiredTables.push('__HYBRID_QUERY__');
    }
    
    // Fallback: si no se detectó nada, usar SERVICE como base
    if (requiredTables.length === 0) {
      const foundService = findTableInAvailable('service');
      if (foundService) {
        requiredTables.push('service');
        console.log(`✅ Usando service como tabla base (fallback)`);
      }
    }
    
    console.log('🎯 Tablas requeridas detectadas:', requiredTables);
    return requiredTables;
  }
  
  static detectRelationships(requiredTables) {
    console.log('🔗 Detectando relaciones usando MedicalTables-v2.ts...');
    
    // Si tenemos acceso a la estructura real, usarla
    if (tablesStructure) {
      return this.detectRelationshipsFromSchema(requiredTables);
    }
    
    // Fallback: relaciones hardcodeadas básicas
    console.warn('⚠️ Usando relaciones fallback (MedicalTables-v2.ts no disponible)');
    return this.detectRelationshipsFallback(requiredTables);
  }
  
  static detectRelationshipsFromSchema(requiredTables) {
    const relationships = [];
    
    requiredTables.forEach(tableName => {
      // Buscar la tabla en la estructura
      const tableKey = Object.keys(tablesStructure).find(key => 
        tablesStructure[key].name.toLowerCase() === tableName.toLowerCase()
      );
      
      if (!tableKey) {
        console.warn(`⚠️ Tabla ${tableName} no encontrada en schema`);
        return;
      }
      
      const tableSchema = tablesStructure[tableKey];
      console.log(`🔍 Analizando relaciones para ${tableName}:`, tableSchema.name);
      
      // 1. FOREIGN KEYS - Relaciones directas
      Object.entries(tableSchema.foreignKeys).forEach(([fkField, fkInfo]) => {
        const referencedTableName = fkInfo.referencedTable.split('.').pop().toLowerCase();
        
        if (requiredTables.some(t => t.toLowerCase() === referencedTableName)) {
          const alias1 = this.generateTableAlias(tableName);
          const alias2 = this.generateTableAlias(referencedTableName);
          
          relationships.push({
            fromTable: tableName,
            toTable: referencedTableName,
            joinType: 'INNER',
            onCondition: `${alias1}.${fkField} = ${alias2}.${fkInfo.referencedField}`,
            type: 'foreignKey'
          });
          
          console.log(`✅ FK Relation: ${tableName}.${fkField} -> ${referencedTableName}.${fkInfo.referencedField}`);
        }
      });
      
      // 2. SYSTEM PARAMETER JOINS
      Object.entries(tableSchema.systemParameterJoins).forEach(([fieldName, joinDef]) => {
        relationships.push({
          fromTable: tableName,
          toTable: 'systemparameter',
          joinType: 'INNER',
          onCondition: `${tableName}.${fieldName} = ${joinDef.alias}.i_ParameterId AND ${joinDef.alias}.${joinDef.condition}`,
          alias: joinDef.alias,
          selectFields: joinDef.selectFields,
          type: 'systemParameter'
        });
        
        console.log(`✅ System Param: ${tableName}.${fieldName} -> systemparameter (${joinDef.condition})`);
      });
      
      // 3. CUSTOM JOINS - Relaciones complejas como médicos tratantes
      if (tableSchema.customJoins) {
        Object.entries(tableSchema.customJoins).forEach(([fieldName, joinDef]) => {
          if (joinDef.type === 'nested') {
            // Generar relaciones para cada paso del join anidado
            joinDef.joins.forEach((step, index) => {
              const stepTableName = step.table.toLowerCase();
              
              if (index === 0) {
                // Primer paso: tabla principal -> primera tabla del join
                relationships.push({
                  fromTable: tableName,
                  toTable: stepTableName,
                  joinType: 'INNER',
                  onCondition: `${tableName}.${fieldName} = ${step.alias}.${step.joinField}`,
                  alias: step.alias,
                  selectFields: step.selectFields,
                  type: 'customJoin',
                  step: index
                });
              } else {
                // Pasos siguientes: tabla anterior -> tabla actual
                const prevStep = joinDef.joins[index - 1];
                const sourceField = step.sourceField || `${prevStep.alias}.${step.joinField}`;
                
                relationships.push({
                  fromTable: prevStep.table.toLowerCase(),
                  toTable: stepTableName,
                  joinType: 'INNER',
                  onCondition: `${sourceField} = ${step.alias}.${step.joinField}`,
                  alias: step.alias,
                  selectFields: step.selectFields,
                  type: 'customJoin',
                  step: index
                });
              }
              
              console.log(`✅ Custom Join Step ${index}: ${fieldName} -> ${step.table} (${step.alias})`);
            });
          }
        });
      }
    });
    
    console.log(`🎯 Total relaciones detectadas desde schema: ${relationships.length}`);
    return relationships;
  }
  
  static detectRelationshipsFallback(requiredTables) {
    const commonRelations = {
      'service': [
        { toTable: 'person', joinType: 'INNER', onCondition: 's.v_PersonId = p.v_PersonId' },
        { toTable: 'organization', joinType: 'INNER', onCondition: 's.v_OrganizationId = o.v_OrganizationId' },
        { toTable: 'protocol', joinType: 'INNER', onCondition: 's.v_ProtocolId = pr.v_ProtocolId' },
        { toTable: 'servicecomponent', joinType: 'INNER', onCondition: 's.v_ServiceId = sc.v_ServiceId' }
      ],
      'servicecomponent': [
        { toTable: 'service', joinType: 'INNER', onCondition: 'sc.v_ServiceId = s.v_ServiceId' },
        { toTable: 'systemuser', joinType: 'INNER', onCondition: 'sc.i_MedicoTratanteId = su.i_SystemUserId' },
        { toTable: 'person', joinType: 'INNER', onCondition: 'su.v_PersonId = p.v_PersonId', dependsOn: 'systemuser' }
      ],
      'diagnosticrepository': [
        { toTable: 'diseases', joinType: 'INNER', onCondition: 'dr.v_DiseasesId = d.v_DiseasesId' },
        { toTable: 'service', joinType: 'INNER', onCondition: 'dr.v_ServiceId = s.v_ServiceId' }
      ],
      'diseases': [
        { toTable: 'cie10', joinType: 'INNER', onCondition: 'd.v_CIE10Id = c.v_CIE10Id' }
      ],
      'protocol': [
        { toTable: 'service', joinType: 'INNER', onCondition: 'pr.v_ProtocolId = s.v_ProtocolId' }
      ]
    };
    
    const relationships = [];
    requiredTables.forEach(table => {
      if (commonRelations[table]) {
        commonRelations[table].forEach(relation => {
          if (requiredTables.includes(relation.toTable)) {
            relationships.push({
              fromTable: table,
              ...relation
            });
          }
        });
      }
    });
    
    return relationships;
  }
  
  static generateTableAlias(tableName) {
    const aliasMap = {
      'service': 's',
      'person': 'p',
      'organization': 'o',
      'servicecomponent': 'sc',
      'systemuser': 'su',
      'protocol': 'pr',
      'diseases': 'd',
      'diagnosticrepository': 'dr',
      'cie10': 'c',
      'systemparameter': 'sp'
    };
    
    return aliasMap[tableName.toLowerCase()] || tableName.substring(0, 2).toLowerCase();
  }
  
  static assessComplexity(lowerQuestion, requiredTables) {
    let complexity = 'simple';
    
    // Factores de complejidad
    const complexKeywords = ['comparar', 'tendencia', 'análisis', 'estadísticas', 'correlación'];
    const hasComplexKeywords = complexKeywords.some(word => lowerQuestion.includes(word));
    
    if (requiredTables.length > 3 || hasComplexKeywords) {
      complexity = 'complex';
    } else if (requiredTables.length > 1) {
      complexity = 'medium';
    }
    
    return complexity;
  }
  
  static async enhanceWithFlanT5(userQuestion, basicAnalysis) {
    if (!transformersAvailable || !useOnlineAI) {
      throw new Error('Flan-T5 no disponible');
    }
    
    try {
      // Inicializar Flan-T5 si no está cargado
      await initializeTransformers();
      const model = await OnlineSQLPipeline.getInstance();
      
      // Crear prompt especializado para análisis de intención
      const analysisPrompt = `Analyze this medical/commercial database query and identify entities and required tables:

Question: "${userQuestion}"

Available tables: service, person, organization, diagnosticrepository, diseases, cie10, protocol, venta, producto, cobranza

Current analysis:
- Intent: ${basicAnalysis.intent}
- Entities: ${basicAnalysis.entities.join(', ')}
- Tables: ${basicAnalysis.requiredTables.join(', ')}

Enhance the entity list and suggest the most relevant tables for this query.
Response format: entities: [list] | tables: [list]`;

      console.log('🤖 Enviando a Flan-T5 para refinamiento:', analysisPrompt);
      
      const result = await model(analysisPrompt, {
        max_length: 150,
        temperature: 0.1
      });
      
      console.log('🎯 Respuesta de Flan-T5:', result);
      
      // Parsear respuesta de Flan-T5 (simplificado)
      const enhancement = this.parseFlanT5Response(result);
      
      return {
        entities: enhancement.entities || basicAnalysis.entities,
        requiredTables: enhancement.tables || basicAnalysis.requiredTables
      };
      
    } catch (error) {
      console.warn('⚠️ Error con Flan-T5, usando análisis básico:', error.message);
      throw error;
    }
  }
  
  static parseFlanT5Response(response) {
    try {
      const text = typeof response === 'object' ? response.generated_text || String(response) : String(response);
      
      const entities = [];
      const tables = [];
      
      // Parsing simple de la respuesta
      if (text.includes('entities:')) {
        const entitiesMatch = text.match(/entities:\s*\[(.*?)\]/);
        if (entitiesMatch) {
          entities.push(...entitiesMatch[1].split(',').map(e => e.trim()));
        }
      }
      
      if (text.includes('tables:')) {
        const tablesMatch = text.match(/tables:\s*\[(.*?)\]/);
        if (tablesMatch) {
          tables.push(...tablesMatch[1].split(',').map(t => t.trim()));
        }
      }
      
      return { entities, tables };
    } catch (error) {
      console.warn('Error parseando respuesta Flan-T5:', error);
      return {};
    }
  }
}

// Sistema de IA local simplificado (sin descarga de modelos)
class LocalSQLGenerator {
  static generateSQL(userQuestion, tablesContext) {
    const lowerQuestion = userQuestion.toLowerCase();
    
    console.log('🧠 Generando SQL con IA local simplificada...');
    console.log('📋 Contexto completo recibido:', tablesContext);
    
    // Mostrar detalles de las tablas disponibles
    if (tablesContext.tablesDetails && tablesContext.tablesDetails.length > 0) {
      console.log('🗃️ TABLAS DISPONIBLES CON DETALLES COMPLETOS:');
      tablesContext.tablesDetails.forEach(table => {
        console.log(`  📊 ${table.name} (${table.description})`);
        if (table.fields && table.fields.length > 0) {
          table.fields.forEach(field => {
            let fieldInfo = `    • ${field.name} (${field.type}) - ${field.description}`;
            if (field.isPrimaryKey) fieldInfo += ' [PK]';
            if (field.isForeignKey) fieldInfo += ` [FK -> ${field.references}]`;
            console.log(fieldInfo);
          });
        }
      });
    }
    
    // Mostrar relaciones FK
    if (tablesContext.relationships) {
      console.log('🔗 RELACIONES ENTRE TABLAS:');
      Object.entries(tablesContext.relationships).forEach(([tableName, relations]) => {
        console.log(`  ${tableName}:`);
        relations.forEach(relation => console.log(`    • ${relation}`));
      });
    }
    
    // Análisis avanzado de la pregunta con información de tablas
    const keywords = {
      diagnósticos: ['diagnósticos', 'diagnóstico', 'enfermedades', 'patologías', 'cie10'],
      ingresos: ['ingresos', 'ganancias', 'facturación', 'dinero', 'costo', 'precio'],
      empresas: ['empresas', 'organizaciones', 'compañías', 'clientes', 'organization'],
      pacientes: ['pacientes', 'personas', 'edad', 'años', 'person'],
      servicios: ['servicios', 'service', 'atenciones', 'consultas'],
      tiempo: ['mes', 'meses', 'año', 'años', 'últimos', 'recientes', 'tendencia', 'periodo'],
      cantidad: ['top', 'mayor', 'menor', 'cantidad', 'número', 'frecuentes', 'más', 'menos']
    };
    
    // Detectar intención de la consulta basada en tablas disponibles
    let intention = 'general';
    let timeFrame = '3 meses';
    let availableTables = tablesContext.selectedTables || [];
    
    // Análisis de palabras clave
    const hasKeyword = (category) => keywords[category].some(word => lowerQuestion.includes(word));
    
    // Detectar qué tablas están disponibles
    const hasTable = (tableName) => availableTables.some(table => 
      table.toUpperCase() === tableName.toUpperCase()
    );
    
    // Lógica de detección de intención mejorada con tablas disponibles
    if (hasKeyword('diagnósticos') && hasTable('DIAGNOSTICREPOSITORY')) {
      intention = 'diagnósticos_tendencia';
    } else if (hasKeyword('ingresos') && hasTable('SERVICE')) {
      intention = 'ingresos_mensuales';
    } else if (hasKeyword('empresas') && hasTable('ORGANIZATION')) {
      intention = 'empresas_servicios';
    } else if (hasKeyword('pacientes') && hasTable('PERSON')) {
      intention = 'pacientes_edad';
    } else if (hasKeyword('servicios') && hasTable('SERVICE')) {
      intention = 'servicios_analisis';
    } else if (hasTable('CALENDAR')) {
      intention = 'calendario_citas';
    }
    
    // Detectar marco temporal
    if (lowerQuestion.includes('6 meses') || lowerQuestion.includes('semestre')) {
      timeFrame = '6 meses';
    } else if (lowerQuestion.includes('año') || lowerQuestion.includes('anual') || lowerQuestion.includes('12 meses')) {
      timeFrame = '12 meses';
    } else if (lowerQuestion.includes('semana') || lowerQuestion.includes('semanal')) {
      timeFrame = '1 mes';
    }
    
    console.log(`🎯 Intención detectada: ${intention}`);
    console.log(`⏰ Marco temporal: ${timeFrame}`);
    console.log(`📋 Tablas disponibles: ${availableTables.join(', ')}`);
    
    // Generar SQL basado en la intención detectada y tablas disponibles
    return this.generateBasedOnIntention(intention, timeFrame, tablesContext, userQuestion);
  }
  
  static generateBasedOnIntention(intention, timeFrame, tablesContext, originalQuestion) {
    const timeFilter = timeFrame === '12 meses' ? 12 : timeFrame === '6 meses' ? 6 : timeFrame === '1 mes' ? 1 : 3;
    const availableTables = tablesContext.selectedTables || [];
    const tablesDetails = tablesContext.tablesDetails || [];
    
    // Función helper para obtener campos de una tabla
    const getTableFields = (tableName) => {
      const table = tablesDetails.find(t => t.name.toUpperCase() === tableName.toUpperCase());
      return table ? table.fields : [];
    };
    
    // Función helper para verificar si una tabla está disponible
    const hasTable = (tableName) => availableTables.some(table => 
      table.toUpperCase() === tableName.toUpperCase()
    );
    
    switch (intention) {
      case 'diagnósticos_tendencia':
        if (hasTable('DIAGNOSTICREPOSITORY') && hasTable('DISEASES') && hasTable('CIE10')) {
          return `-- ANÁLISIS DE DIAGNÓSTICOS DE TENDENCIA (IA Local Avanzada)
-- Pregunta: "${originalQuestion}"
-- Tablas analizadas: DIAGNOSTICREPOSITORY, DISEASES, CIE10, SERVICE
-- Campos utilizados basados en estructura real de BD

SELECT 
    d.v_Name as Enfermedad,
    c.v_CIE10Description1 as CodigoCIE10,
    c.v_CIE10Description2 as DescripcionSecundaria,
    COUNT(*) as TotalDiagnosticos,
    COUNT(DISTINCT dr.v_ServiceId) as ServiciosAfectados,
    COUNT(DISTINCT s.v_PersonId) as PacientesAfectados,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as PorcentajeTendencia,
    MIN(dr.d_InsertDate) as PrimerDiagnostico,
    MAX(dr.d_InsertDate) as UltimoDiagnostico,
    AVG(s.r_Costo) as CostoPromedioServicio
FROM DIAGNOSTICREPOSITORY dr
    INNER JOIN DISEASES d ON dr.v_DiseasesId = d.v_DiseasesId
    INNER JOIN CIE10 c ON d.v_CIE10Id = c.v_CIE10Id
    INNER JOIN SERVICE s ON dr.v_ServiceId = s.v_ServiceId
WHERE 
    dr.d_InsertDate >= DATEADD(MONTH, -${timeFilter}, GETDATE())
    AND s.i_ServiceStatusId = 1  -- Solo servicios completados
GROUP BY 
    d.v_Name, 
    c.v_CIE10Description1, 
    c.v_CIE10Description2
HAVING COUNT(*) >= 2  -- Mínimo 2 casos para considerar tendencia
ORDER BY 
    TotalDiagnosticos DESC, 
    PacientesAfectados DESC
LIMIT 25;`;
        }
        break;

      case 'ingresos_mensuales':
        if (hasTable('SERVICE')) {
          return `-- ANÁLISIS DETALLADO DE INGRESOS MENSUALES (IA Local Avanzada)
-- Pregunta: "${originalQuestion}"
-- Tabla principal: SERVICE con análisis de campo r_Costo
-- Periodo: Últimos ${timeFilter} meses

SELECT 
    YEAR(s.d_ServiceDate) as Año,
    MONTH(s.d_ServiceDate) as Mes,
    DATENAME(MONTH, s.d_ServiceDate) as NombreMes,
    COUNT(*) as TotalServicios,
    COUNT(DISTINCT s.v_PersonId) as PacientesUnicos,
    SUM(s.r_Costo) as IngresoTotal,
    AVG(s.r_Costo) as PromedioServicio,
    MIN(s.r_Costo) as ServicioMinimo,
    MAX(s.r_Costo) as ServicioMaximo,
    STDEV(s.r_Costo) as DesviacionEstandar,
    -- Análisis por tipo de servicio
    COUNT(CASE WHEN s.i_MasterServiceId = 1 THEN 1 END) as ServiciosTipo1,
    -- Análisis por estado de aptitud
    COUNT(CASE WHEN s.i_AptitudeStatusId = 1 THEN 1 END) as ServiciosAptos,
    -- Crecimiento vs mes anterior
    LAG(SUM(s.r_Costo)) OVER (ORDER BY YEAR(s.d_ServiceDate), MONTH(s.d_ServiceDate)) as IngresoMesAnterior
FROM SERVICE s
WHERE 
    s.d_ServiceDate >= DATEADD(MONTH, -${timeFilter}, GETDATE())
    AND s.i_ServiceStatusId = 1  -- Solo servicios completados
    AND s.r_Costo > 0  -- Solo servicios con costo
GROUP BY 
    YEAR(s.d_ServiceDate), 
    MONTH(s.d_ServiceDate),
    DATENAME(MONTH, s.d_ServiceDate)
ORDER BY 
    Año DESC, Mes DESC;`;
        }
        break;

      case 'empresas_servicios':
        if (hasTable('ORGANIZATION') && hasTable('SERVICE')) {
          return `-- TOP EMPRESAS POR VOLUMEN DE SERVICIOS (IA Local Avanzada)
-- Pregunta: "${originalQuestion}"
-- Tablas: ORGANIZATION (v_Name, v_IdentificationNumber) + SERVICE (análisis completo)
-- Análisis de relación v_OrganizationId

SELECT 
    o.v_Name as NombreEmpresa,
    o.v_IdentificationNumber as RUC,
    o.i_OrganizationTypeId as TipoOrganizacion,
    COUNT(s.v_ServiceId) as TotalServicios,
    COUNT(DISTINCT s.v_PersonId) as PacientesAtendidos,
    SUM(s.r_Costo) as MontoTotal,
    AVG(s.r_Costo) as PromedioServicio,
    MIN(s.d_ServiceDate) as PrimerServicio,
    MAX(s.d_ServiceDate) as UltimoServicio,
    DATEDIFF(DAY, MIN(s.d_ServiceDate), MAX(s.d_ServiceDate)) as DiasActividad,
    -- Análisis de frecuencia
    COUNT(s.v_ServiceId) / NULLIF(DATEDIFF(MONTH, MIN(s.d_ServiceDate), MAX(s.d_ServiceDate)), 0) as ServiciosPorMes,
    -- Distribución por estado de servicio
    COUNT(CASE WHEN s.i_ServiceStatusId = 1 THEN 1 END) as ServiciosCompletados,
    COUNT(CASE WHEN s.i_AptitudeStatusId = 1 THEN 1 END) as ResultadosAptos
FROM ORGANIZATION o
    INNER JOIN SERVICE s ON o.v_OrganizationId = s.v_OrganizationId
WHERE 
    s.d_ServiceDate >= DATEADD(MONTH, -${timeFilter}, GETDATE())
GROUP BY 
    o.v_Name, 
    o.v_IdentificationNumber, 
    o.i_OrganizationTypeId
HAVING COUNT(s.v_ServiceId) >= 1
ORDER BY 
    TotalServicios DESC, 
    MontoTotal DESC
LIMIT 20;`;
        }
        break;

      case 'pacientes_edad':
        if (hasTable('PERSON') && hasTable('SERVICE')) {
          return `-- DISTRIBUCIÓN DETALLADA DE PACIENTES POR EDAD (IA Local Avanzada)
-- Pregunta: "${originalQuestion}"
-- Tablas: PERSON (d_Birthdate, i_SexTypeId) + SERVICE (análisis de servicios)
-- Cálculo de edad usando DATEDIFF con d_Birthdate

SELECT 
    CASE 
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) < 18 THEN '< 18 años (Menores)'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 18 AND 25 THEN '18-25 años (Jóvenes)'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 26 AND 35 THEN '26-35 años (Adultos Jóvenes)'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 36 AND 45 THEN '36-45 años (Adultos)'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 46 AND 55 THEN '46-55 años (Mediana Edad)'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 56 AND 65 THEN '56-65 años (Pre-Jubilación)'
        ELSE '> 65 años (Tercera Edad)'
    END as RangoEdad,
    COUNT(DISTINCT p.v_PersonId) as CantidadPacientes,
    COUNT(s.v_ServiceId) as ServiciosRealizados,
    AVG(s.r_Costo) as PromedioGastoPorServicio,
    SUM(s.r_Costo) as GastoTotal,
    -- Análisis por sexo
    COUNT(DISTINCT CASE WHEN p.i_SexTypeId = 1 THEN p.v_PersonId END) as Masculinos,
    COUNT(DISTINCT CASE WHEN p.i_SexTypeId = 2 THEN p.v_PersonId END) as Femeninos,
    -- Métricas adicionales
    AVG(DATEDIFF(YEAR, p.d_Birthdate, GETDATE())) as EdadPromedio,
    ROUND(COUNT(DISTINCT p.v_PersonId) * 100.0 / SUM(COUNT(DISTINCT p.v_PersonId)) OVER(), 2) as PorcentajePacientes,
    ROUND(COUNT(s.v_ServiceId) * 100.0 / SUM(COUNT(s.v_ServiceId)) OVER(), 2) as PorcentajeServicios
FROM PERSON p
    INNER JOIN SERVICE s ON p.v_PersonId = s.v_PersonId
WHERE 
    s.d_ServiceDate >= DATEADD(MONTH, -${timeFilter}, GETDATE())
    AND s.i_ServiceStatusId = 1
    AND p.d_Birthdate IS NOT NULL
    AND DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 0 AND 120  -- Validación de edades realistas
GROUP BY 
    CASE 
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) < 18 THEN '< 18 años (Menores)'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 18 AND 25 THEN '18-25 años (Jóvenes)'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 26 AND 35 THEN '26-35 años (Adultos Jóvenes)'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 36 AND 45 THEN '36-45 años (Adultos)'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 46 AND 55 THEN '46-55 años (Mediana Edad)'
        WHEN DATEDIFF(YEAR, p.d_Birthdate, GETDATE()) BETWEEN 56 AND 65 THEN '56-65 años (Pre-Jubilación)'
        ELSE '> 65 años (Tercera Edad)'
    END
ORDER BY 
    MIN(DATEDIFF(YEAR, p.d_Birthdate, GETDATE()));`;
        }
        break;

      case 'servicios_analisis':
        if (hasTable('SERVICE')) {
          return `-- ANÁLISIS COMPLETO DE SERVICIOS (IA Local Avanzada)
-- Pregunta: "${originalQuestion}"
-- Tabla: SERVICE con todos los campos disponibles
-- Análisis de i_MasterServiceId, i_ServiceStatusId, i_AptitudeStatusId

SELECT 
    s.i_MasterServiceId as TipoServicio,
    s.i_ServiceStatusId as EstadoServicio,
    s.i_AptitudeStatusId as EstadoAptitud,
    COUNT(*) as TotalServicios,
    COUNT(DISTINCT s.v_PersonId) as PacientesUnicos,
    AVG(s.r_Costo) as CostoPromedio,
    SUM(s.r_Costo) as CostoTotal,
    MIN(s.d_ServiceDate) as FechaPrimero,
    MAX(s.d_ServiceDate) as FechaUltimo,
    -- Análisis temporal
    COUNT(CASE WHEN s.d_ServiceDate >= DATEADD(MONTH, -1, GETDATE()) THEN 1 END) as ServiciosUltimoMes,
    COUNT(CASE WHEN s.d_ServiceDate >= DATEADD(WEEK, -1, GETDATE()) THEN 1 END) as ServiciosUltimaSemana,
    -- Análisis por médico tratante
    COUNT(DISTINCT s.i_MedicoTratanteId) as MedicosTratantes,
    -- Métricas de rendimiento
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as PorcentajeTotal
FROM SERVICE s
WHERE 
    s.d_ServiceDate >= DATEADD(MONTH, -${timeFilter}, GETDATE())
GROUP BY 
    s.i_MasterServiceId,
    s.i_ServiceStatusId,
    s.i_AptitudeStatusId
ORDER BY 
    TotalServicios DESC;`;
        }
        break;

      case 'calendario_citas':
        if (hasTable('CALENDAR')) {
          return `-- ANÁLISIS DE CALENDARIO Y CITAS (IA Local Avanzada)
-- Pregunta: "${originalQuestion}"
-- Tabla: CALENDAR con análisis de d_DateTimeCalendar, i_CalendarStatusId
-- Relaciones: v_PersonId -> PERSON, v_ServiceId -> SERVICE

SELECT 
    CONVERT(DATE, c.d_DateTimeCalendar) as FechaCita,
    DATEPART(HOUR, c.d_DateTimeCalendar) as HoraCita,
    DATENAME(WEEKDAY, c.d_DateTimeCalendar) as DiaSemana,
    c.i_ServiceTypeId as TipoServicio,
    c.i_CalendarStatusId as EstadoCita,
    COUNT(*) as TotalCitas,
    COUNT(DISTINCT c.v_PersonId) as PacientesUnicos,
    COUNT(DISTINCT c.v_ServiceId) as ServiciosAsociados,
    -- Análisis por estado
    COUNT(CASE WHEN c.i_CalendarStatusId = 1 THEN 1 END) as CitasConfirmadas,
    COUNT(CASE WHEN c.i_CalendarStatusId = 2 THEN 1 END) as CitasCanceladas,
    -- Análisis temporal
    AVG(DATEDIFF(DAY, c.d_InsertDate, c.d_DateTimeCalendar)) as DiasAnticipacion,
    -- Distribución horaria
    COUNT(CASE WHEN DATEPART(HOUR, c.d_DateTimeCalendar) BETWEEN 8 AND 12 THEN 1 END) as CitasMañana,
    COUNT(CASE WHEN DATEPART(HOUR, c.d_DateTimeCalendar) BETWEEN 13 AND 17 THEN 1 END) as CitasTarde
FROM CALENDAR c
WHERE 
    c.d_DateTimeCalendar >= DATEADD(MONTH, -${timeFilter}, GETDATE())
    AND c.d_DateTimeCalendar <= DATEADD(MONTH, 1, GETDATE())  -- Incluir citas futuras
GROUP BY 
    CONVERT(DATE, c.d_DateTimeCalendar),
    DATEPART(HOUR, c.d_DateTimeCalendar),
    DATENAME(WEEKDAY, c.d_DateTimeCalendar),
    c.i_ServiceTypeId,
    c.i_CalendarStatusId
ORDER BY 
    FechaCita DESC, HoraCita;`;
        }
        break;

      default:
        // Consulta genérica inteligente usando la información real de las tablas
        const primaryTable = availableTables[0] || 'SERVICE';
        const tableInfo = getTableFields(primaryTable);
        const dateFields = tableInfo.filter(f => f.type === 'date').map(f => f.name);
        const primaryDateField = dateFields.find(f => f.includes('Insert')) || dateFields[0] || 'd_InsertDate';
        
        return `-- CONSULTA GENÉRICA INTELIGENTE (IA Local Avanzada)
-- Pregunta: "${originalQuestion}"
-- Tabla principal: ${primaryTable}
-- Campos disponibles detectados: ${tableInfo.map(f => f.name).join(', ')}
-- Campo de fecha principal: ${primaryDateField}

SELECT 
    ${tableInfo.length > 0 ? tableInfo.slice(0, 8).map(f => `${primaryTable}.${f.name}`).join(',\n    ') : '*'}
FROM ${primaryTable}
WHERE 
    ${primaryDateField} >= DATEADD(MONTH, -${timeFilter}, GETDATE())
ORDER BY 
    ${primaryDateField} DESC
LIMIT 100;

-- INFORMACIÓN DE LA TABLA ${primaryTable}:
${tableInfo.map(f => `-- • ${f.name} (${f.type}): ${f.description}${f.isPrimaryKey ? ' [PK]' : ''}${f.isForeignKey ? ` [FK -> ${f.references}]` : ''}`).join('\n')}

-- SUGERENCIAS PARA MEJORAR LA CONSULTA:
-- 1. Especifique qué campos específicos necesita analizar
-- 2. Indique el período de tiempo deseado (mes, año, etc.)
-- 3. Mencione si necesita agrupaciones, totales o promedios
-- 4. Considere usar otras tablas disponibles: ${availableTables.filter(t => t !== primaryTable).join(', ') || 'ninguna otra seleccionada'}`;
    }
    
    // Si llegamos aquí, significa que no se pudo generar una consulta específica
    return `-- CONSULTA BÁSICA GENERADA (Tablas no compatibles con la intención)
-- Pregunta: "${originalQuestion}"
-- Tablas disponibles: ${availableTables.join(', ')}
-- Intención detectada: ${intention}

SELECT TOP 50 *
FROM ${availableTables[0] || 'SERVICE'}
ORDER BY d_InsertDate DESC;

-- NOTA: Para obtener mejores resultados, asegúrese de seleccionar las tablas apropiadas:
-- • Para diagnósticos: DIAGNOSTICREPOSITORY, DISEASES, CIE10
-- • Para ingresos: SERVICE
-- • Para empresas: ORGANIZATION, SERVICE  
-- • Para pacientes: PERSON, SERVICE
-- • Para citas: CALENDAR`;
  }
}

// Nueva clase para análisis de dashboards
class LocalDashboardAnalyzer {
  static analyzeDashboard(userQuestion, dashboardData, dashboardType = 'general') {
    const lowerQuestion = userQuestion.toLowerCase();
    
    console.log('🔍 Analizando dashboard con IA local...');
    console.log('📊 Tipo de dashboard:', dashboardType);
    console.log('📈 Datos disponibles:', !!dashboardData);
    
    try {
      if (dashboardType === 'general') {
        return this.analyzeGeneralDashboard(userQuestion, dashboardData, lowerQuestion);
      } else if (dashboardType === 'sales') {
        return this.analyzeSalesDashboard(userQuestion, dashboardData, lowerQuestion);
      } else {
        return this.analyzeCustomDashboard(userQuestion, dashboardData, lowerQuestion);
      }
    } catch (error) {
      console.error('Error en análisis de dashboard:', error);
      return `Lo siento, tuve problemas al analizar los datos del dashboard para tu pregunta: "${userQuestion}".

**Error:** ${error.message}

**Sugerencia:** Intenta reformular tu pregunta o usar el servicio de Claude para un análisis más detallado.`;
    }
  }

  static analyzeGeneralDashboard(userQuestion, dashboardData, lowerQuestion) {
    const data = dashboardData || {};
    
    // Análisis de tendencias de ingresos
    if (lowerQuestion.includes('tendencia') && (lowerQuestion.includes('ingreso') || lowerQuestion.includes('revenue'))) {
      const mainStats = data.mainStats || {};
      const incomeChart = data.incomeChart || {};
      const dailyRevenue = mainStats.dailyRevenue || {};
      
      let trendAnalysis = '';
      if (incomeChart.dataPoints && Array.isArray(incomeChart.dataPoints)) {
        const points = incomeChart.dataPoints;
        if (points.length >= 2) {
          const firstValue = points[0]?.value || 0;
          const lastValue = points[points.length - 1]?.value || 0;
          const change = lastValue - firstValue;
          const percentChange = firstValue > 0 ? ((change / firstValue) * 100).toFixed(1) : 0;
          
          trendAnalysis = `\n**Análisis de Tendencia Detallado:**
- Comparando el primer punto (S/. ${firstValue.toLocaleString()}) con el último (S/. ${lastValue.toLocaleString()})
- Cambio absoluto: S/. ${change.toLocaleString()} (${change >= 0 ? '+' : ''}${percentChange}%)
- Tendencia: ${change > 0 ? 'Creciente ↗️' : change < 0 ? 'Decreciente ↘️' : 'Estable ➡️'}
- Puntos de datos analizados: ${points.length}`;
        }
      }
      
      return `Basándome en los datos del dashboard general, aquí está el análisis de la tendencia de ingresos:

**Estadísticas Principales:**
- Ingresos diarios actuales: ${dailyRevenue.value || 'N/A'}
- Tendencia reportada: ${dailyRevenue.trend || 'Sin datos'}
- Dirección: ${dailyRevenue.trendDirection === 'up' ? 'Ascendente ↗️' : dailyRevenue.trendDirection === 'down' ? 'Descendente ↘️' : 'Neutral ➡️'}
${trendAnalysis}

**Contexto del Período:**
- Rango de fechas: ${data.dateRange?.startDate || 'N/A'} hasta ${data.dateRange?.endDate || 'N/A'}
- Total de días: ${data.dateRange?.totalDays || 'N/A'}

**Recomendación:** ${dailyRevenue.trendDirection === 'up' ? 'Continúe monitoreando para mantener el crecimiento positivo.' : dailyRevenue.trendDirection === 'down' ? 'Revise las causas de la disminución y considere estrategias de mejora.' : 'Analice estrategias para impulsar el crecimiento.'}`;
    }
    
    // Análisis de pacientes
    if (lowerQuestion.includes('paciente') || lowerQuestion.includes('atendido')) {
      const mainStats = data.mainStats || {};
      const patientsAttended = mainStats.patientsAttended || {};
      const specialtiesRanking = data.specialtiesRanking || [];
      
      let specialtyInfo = '';
      if (specialtiesRanking.length > 0) {
        const topSpecialty = specialtiesRanking[0];
        specialtyInfo = `\n**Top Especialidad:**
- ${topSpecialty.name}: ${topSpecialty.patients} pacientes (${topSpecialty.formattedRevenue})`;
      }
      
      return `Análisis de pacientes atendidos en el dashboard general:

**Estadísticas de Pacientes:**
- Total atendido: ${patientsAttended.value || 'N/A'}
- Tendencia: ${patientsAttended.trend || 'Sin datos'} (${patientsAttended.trendDescription || ''})
- Estado: ${patientsAttended.trendDirection === 'up' ? 'Incremento en atención ↗️' : patientsAttended.trendDirection === 'down' ? 'Disminución en atención ↘️' : 'Atención estable ➡️'}
${specialtyInfo}

**Contexto:**
La información refleja la actividad de atención médica en el período ${data.dateRange?.startDate || 'seleccionado'} hasta ${data.dateRange?.endDate || 'actual'}.

**Insight:** ${patientsAttended.trendDirection === 'up' ? 'El aumento en pacientes atendidos indica una mayor demanda de servicios.' : 'Considere analizar factores que puedan estar afectando la afluencia de pacientes.'}`;
    }
    
    // Análisis de servicios
    if (lowerQuestion.includes('servicio') || lowerQuestion.includes('distribución')) {
      const servicesDistribution = data.servicesDistribution || [];
      
      let servicesAnalysis = '';
      if (servicesDistribution.length > 0) {
        const topServices = servicesDistribution.slice(0, 3);
        servicesAnalysis = '\n**Top 3 Servicios:**\n' + 
          topServices.map((service, index) => 
            `${index + 1}. ${service.name}: ${service.percentage.toFixed(1)}%`
          ).join('\n');
      }
      
      return `Análisis de distribución de servicios:

**Resumen de Servicios:**
- Total de tipos de servicios: ${servicesDistribution.length}
- Distribución analizada para el período seleccionado
${servicesAnalysis}

**Observación:** La distribución de servicios refleja las principales áreas de atención de la clínica en el período analizado.`;
    }
    
    // Respuesta genérica para dashboard general
    return `He analizado el dashboard general para tu consulta: "${userQuestion}".

**Datos Disponibles:**
- Estadísticas principales: ${data.mainStats ? 'Disponibles' : 'No disponibles'}
- Gráfico de ingresos: ${data.incomeChart ? 'Disponible' : 'No disponible'}
- Ranking de especialidades: ${data.specialtiesRanking?.length || 0} especialidades
- Distribución de servicios: ${data.servicesDistribution?.length || 0} servicios
- Transacciones recientes: ${data.recentTransactions?.length || 0} registros

**Sugerencia:** Para obtener análisis más específicos, puedes preguntar sobre:
- "tendencia de ingresos"
- "pacientes atendidos"
- "servicios más utilizados"
- "ranking de especialidades"`;
  }

  static analyzeSalesDashboard(userQuestion, dashboardData, lowerQuestion) {
    const data = dashboardData || {};
    
    // Análisis de ventas generales
    if (lowerQuestion.includes('venta') || lowerQuestion.includes('ingreso') || lowerQuestion.includes('revenue')) {
      const generalStats = data.generalStats || {};
      const medicalVsPharmacy = data.medicalVsPharmacy || [];
      
      let medicalData = medicalVsPharmacy.find(item => item.category === 'Atenciones Médicas') || {};
      let pharmacyData = medicalVsPharmacy.find(item => item.category === 'Productos Farmacia') || {};
      
      const totalRevenue = (medicalData.totalWithTax || 0) + (pharmacyData.totalWithTax || 0);
      const medicalPercentage = totalRevenue > 0 ? ((medicalData.totalWithTax || 0) / totalRevenue * 100).toFixed(1) : 0;
      const pharmacyPercentage = totalRevenue > 0 ? ((pharmacyData.totalWithTax || 0) / totalRevenue * 100).toFixed(1) : 0;
      
      return `Análisis completo de ventas e ingresos:

**Estadísticas Generales:**
- Total de ventas: ${generalStats.totalSales?.toLocaleString() || 'N/A'}
- Ingresos totales: ${generalStats.formattedTotalRevenue || 'N/A'}
- Ticket promedio: S/. ${generalStats.averageSalePerInvoice?.toFixed(2) || 'N/A'}
- Items vendidos: ${generalStats.totalItems?.toLocaleString() || 'N/A'}

**Distribución Médico vs Farmacia:**
- Atenciones médicas: ${medicalData.formattedTotal || 'N/A'} (${medicalPercentage}%)
- Productos farmacia: ${pharmacyData.formattedTotal || 'N/A'} (${pharmacyPercentage}%)

**Insight:** ${medicalPercentage > pharmacyPercentage ? 
  'Las atenciones médicas generan la mayor parte de los ingresos, indicando un enfoque hacia servicios de salud.' : 
  'Los productos de farmacia tienen una participación significativa, sugiriendo oportunidades en venta de medicamentos.'}

**Recomendación:** Analice las tendencias diarias para identificar patrones de venta y optimizar la estrategia comercial.`;
    }
    
    // Análisis de productos de farmacia
    if (lowerQuestion.includes('farmacia') || lowerQuestion.includes('producto') || lowerQuestion.includes('medicamento')) {
      const topPharmacyProducts = data.topPharmacyProducts || [];
      
      let pharmacyAnalysis = '';
      if (topPharmacyProducts.length > 0) {
        const top3 = topPharmacyProducts.slice(0, 3);
        pharmacyAnalysis = '\n**Top 3 Productos:**\n' + 
          top3.map((product, index) => 
            `${index + 1}. ${product.productName}: ${product.timesSold} ventas, ${product.formattedTotal}`
          ).join('\n');
        
        const totalPharmacySales = topPharmacyProducts.reduce((sum, product) => sum + (product.totalSales || 0), 0);
        pharmacyAnalysis += `\n\n**Resumen:**
- Total de productos analizados: ${topPharmacyProducts.length}
- Ventas combinadas top productos: S/. ${totalPharmacySales.toLocaleString()}`;
      }
      
      return `Análisis de productos de farmacia:
${pharmacyAnalysis || '\n**Estado:** No se encontraron datos de productos de farmacia en el período seleccionado.'}

**Oportunidades:** ${topPharmacyProducts.length > 0 ? 
  'Considere promocionar los productos de mayor rotación y analizar el inventario de los de menor venta.' : 
  'Revise la configuración del período de análisis o la disponibilidad de datos de farmacia.'}`;
    }
    
    // Análisis de documentos de venta
    if (lowerQuestion.includes('documento') || lowerQuestion.includes('tipo') || lowerQuestion.includes('factura') || lowerQuestion.includes('boleta')) {
      const salesByDocumentType = data.salesByDocumentType || [];
      
      let documentAnalysis = '';
      if (salesByDocumentType.length > 0) {
        const sortedDocs = [...salesByDocumentType].sort((a, b) => b.percentageOfTotal - a.percentageOfTotal);
        documentAnalysis = '\n**Distribución por Tipo de Documento:**\n' + 
          sortedDocs.map((doc, index) => 
            `${index + 1}. ${doc.documentType}: ${doc.percentageOfTotal.toFixed(1)}% (${doc.formattedTotal})`
          ).join('\n');
      }
      
      return `Análisis de ventas por tipo de documento:
${documentAnalysis || '\n**Estado:** No se encontraron datos de tipos de documento en el período.'}

**Interpretación:** La distribución muestra los patrones de facturación y puede indicar el tipo de clientes atendidos (empresas vs particulares).`;
    }
    
    // Respuesta genérica para dashboard de ventas
    return `He analizado el dashboard de ventas para tu consulta: "${userQuestion}".

**Datos Disponibles:**
- Estadísticas generales: ${data.generalStats ? 'Disponibles' : 'No disponibles'}
- Productos de farmacia: ${data.topPharmacyProducts?.length || 0} productos
- Tipos de documento: ${data.salesByDocumentType?.length || 0} tipos
- Tendencia diaria: ${data.dailySalesTrend?.length || 0} puntos de datos
- Ventas recientes: ${data.recentSales?.length || 0} registros

**Sugerencias de análisis:**
- "ingresos totales y distribución"
- "productos de farmacia más vendidos"
- "tipos de documentos de venta"
- "comparación médico vs farmacia"`;
  }

  static analyzeCustomDashboard(userQuestion, dashboardData, lowerQuestion) {
    return `Análisis de dashboard personalizado para: "${userQuestion}".

**Estado:** Dashboard personalizado detectado.
**Datos disponibles:** ${dashboardData ? 'Sí' : 'No'}

**Recomendación:** Para obtener análisis específicos de dashboards personalizados, por favor proporciona más contexto sobre el tipo de datos que contiene.`;
  }
}

// Función para inicializar transformers (opcional, solo si se habilita)
async function initializeTransformers() {
  if (initPromise || !useOnlineAI) {
    return initPromise || Promise.resolve(false);
  }

  initPromise = (async () => {
    try {
      console.log('🌐 Intentando cargar modelo online...');
      const transformersModule = await import('@xenova/transformers');
      pipeline = transformersModule.pipeline;
      
      const { env } = transformersModule;
      env.allowRemoteModels = true;
      env.allowLocalModels = false;
      env.useBrowserCache = false;
      
      transformersAvailable = true;
      console.log('✅ Modelo online disponible');
      return true;
    } catch (error) {
      console.warn('⚠️ Modelo online no disponible, usando IA local:', error.message);
      transformersAvailable = false;
      useOnlineAI = false;
      return false;
    }
  })();

  return initPromise;
}

// Clase para manejo de modelos online (opcional)
class OnlineSQLPipeline {
  static task = 'text2text-generation';
  static model = 'Xenova/flan-t5-base';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (!useOnlineAI || !transformersAvailable) {
      throw new Error('Modelo online no habilitado');
    }

    if (this.instance === null) {
      console.log('🤖 Cargando modelo Flan-T5-base (más potente)...');
      this.instance = await pipeline(this.task, this.model, { 
        progress_callback,
        dtype: 'fp32',
        device: 'cpu',
      });
    }
    return this.instance;
  }
}

// Manejar mensajes del hilo principal
self.addEventListener('message', async (event) => {
  const { type, userQuestion, tablesContext, dashboardData, dashboardType, maxLength = 200, preferOnlineAI = false, availableTables } = event.data;
  
  try {
    console.log('🔧 Worker recibió mensaje:', { type, userQuestion, dashboardType });
    
    let processingMode = 'IA Local Simplificada';
    let result = '';
    
    if (type === 'analyzeQuery') {
      // NUEVO V2: Análisis inteligente de consulta con Flan-T5
      console.log('🧠 Analizando consulta con IA para orquestación...');
      
      self.postMessage({
        status: 'analyzing',
        message: 'Analizando tu pregunta con IA local...'
      });
      
      const analysis = await QueryAnalyzer.analyzeUserQuestion(userQuestion, availableTables || []);
      processingMode = 'Analizador de Consulta IA';
      
      console.log(`🎯 Análisis de consulta completado:`, analysis);
      
      self.postMessage({
        status: 'analysis_complete',
        analysis: analysis,
        originalOutput: `Generado con ${processingMode}`,
        prompt: userQuestion
      });
      
    } else if (type === 'analyzeDashboard') {
      // Existente: Análisis de dashboard
      console.log('📊 Iniciando análisis de dashboard...');
      
      self.postMessage({
        status: 'generating',
        message: 'Analizando datos del dashboard...'
      });
      
      result = LocalDashboardAnalyzer.analyzeDashboard(userQuestion, dashboardData, dashboardType);
      processingMode = 'Analizador de Dashboard Local';
      
      console.log(`✨ Análisis de dashboard generado con ${processingMode}:`, result);
      
      self.postMessage({
        status: 'complete',
        dashboardAnalysis: result,
        originalOutput: `Generado con ${processingMode}`,
        prompt: userQuestion
      });
      
    } else if (type === 'generateSQL') {
      // Existente: Generación de SQL
      console.log('🛠️ Iniciando generación de SQL...');
      
      self.postMessage({
        status: 'generating',
        message: 'Generando SQL con IA local...'
      });
      
      result = LocalSQLGenerator.generateSQL(userQuestion, tablesContext);
      processingMode = 'Generador SQL Local';
      
      console.log(`✨ SQL generado con ${processingMode}:`, result);
      
      self.postMessage({
        status: 'complete',
        sqlScript: result,
        originalOutput: `Generado con ${processingMode}`,
        prompt: userQuestion
      });
      
    } else {
      // Fallback para compatibilidad con mensajes antiguos
      console.log('🔄 Mensaje legacy, asumiendo generación SQL...');
      
      self.postMessage({
        status: 'generating',
        message: 'Generando SQL con IA local...'
      });
      
      result = LocalSQLGenerator.generateSQL(userQuestion, tablesContext || {});
      processingMode = 'Generador SQL Local (Legacy)';
      
      console.log(`✨ SQL generado con ${processingMode}:`, result);
      
      self.postMessage({
        status: 'complete',
        sqlScript: result,
        originalOutput: `Generado con ${processingMode}`,
        prompt: userQuestion
      });
    }
    
  } catch (error) {
    console.error('❌ Error en worker:', error);
    
    if (type === 'analyzeQuery') {
      // Fallback para análisis de consulta
      const fallbackAnalysis = {
        intent: 'medical',
        entities: ['servicios'],
        timeframe: { start: 'DATEADD(month, -3, GETDATE())', end: 'GETDATE()', period: '3 meses' },
        requiredTables: ['SERVICE'],
        relationships: [],
        complexity: 'simple',
        confidence: 0.3
      };
      
      self.postMessage({
        status: 'analysis_complete',
        analysis: fallbackAnalysis,
        originalOutput: `Fallback por error: ${error.message}`,
        prompt: 'Fallback por error',
        error: error.message
      });
    } else if (type === 'analyzeDashboard') {
      // Fallback para análisis de dashboard
      const fallbackAnalysis = `Lo siento, hubo un error al analizar el dashboard para tu pregunta: "${userQuestion}".

**Error:** ${error.message}

**Sugerencia:** Intenta hacer una pregunta más específica o usa el servicio de Claude para obtener un análisis más detallado.`;
      
      self.postMessage({
        status: 'complete',
        dashboardAnalysis: fallbackAnalysis,
        originalOutput: `Fallback por error: ${error.message}`,
        prompt: 'Fallback por error',
        error: error.message
      });
    } else {
      // Fallback para SQL
      const fallbackSQL = LocalSQLGenerator.generateSQL(userQuestion, tablesContext || {});
      
      self.postMessage({
        status: 'complete',
        sqlScript: fallbackSQL,
        originalOutput: `Fallback: ${error.message}`,
        prompt: 'Fallback por error',
        error: error.message
      });
    }
  }
});

// Función para limpiar respuestas de IA online
function cleanOnlineResponse(rawResponse) {
  let sqlText = '';
  
  if (typeof rawResponse === 'object') {
    if (rawResponse.generated_text) {
      sqlText = rawResponse.generated_text;
    } else if (Array.isArray(rawResponse) && rawResponse.length > 0) {
      sqlText = rawResponse[0].generated_text || rawResponse[0];
    } else {
      sqlText = String(rawResponse);
    }
  } else {
    sqlText = String(rawResponse);
  }
  
  let sql = sqlText
    .replace(/^SQL:\s*/i, '')
    .replace(/^Query:\s*/i, '')
    .replace(/^translate English to SQL:\s*/i, '')
    .trim();
  
  if (!sql.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH)/i)) {
    sql = `-- Respuesta del modelo online: ${sql}
SELECT * FROM SERVICE 
WHERE d_InsertDate >= DATEADD(MONTH, -3, GETDATE())
ORDER BY d_InsertDate DESC;`;
  }
  
  if (!sql.endsWith(';')) {
    sql += ';';
  }
  
  return sql;
}

// Manejar errores
self.addEventListener('error', (error) => {
  console.error('💥 Error crítico:', error);
  self.postMessage({
    status: 'error',
    error: `Error crítico: ${error.message}`,
    fallbackSQL: `-- Error crítico en worker
SELECT 'Error en sistema de IA' as Estado;`
  });
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('💥 Promesa rechazada:', event.reason);
  self.postMessage({
    status: 'error',
    error: `Error de promesa: ${event.reason}`,
    fallbackSQL: `-- Error de promesa
SELECT 'Error de promesa en IA' as Estado;`
  });
}); 
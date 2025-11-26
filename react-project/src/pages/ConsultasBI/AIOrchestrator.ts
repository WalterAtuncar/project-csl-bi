import { AnthropicService } from '../../services/AnthropicService';
import { dashboardService } from '../../services/DashboardService';
import { tablesStructure as DatabaseSchema } from './MedicalTables-v2';

// ============================================================================
// INTERFACES DEL ORQUESTADOR
// ============================================================================

export interface QueryAnalysis {
  intent: 'medical' | 'commercial' | 'hybrid' | 'analytical';
  entities: string[];           // diagnósticos, pacientes, ventas, etc.
  timeframe: {
    start: string;
    end: string;
    period: string;            // '3 meses', '6 meses', etc.
  };
  requiredTables: string[];     // Auto-detectadas por IA
  relationships: TableRelation[];
  complexity: 'simple' | 'medium' | 'complex';
  confidence: number;          // 0-1, qué tan seguro está el análisis
}

export interface TableRelation {
  fromTable: string;
  toTable: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT';
  onCondition: string;
}

export interface ExecutionResult {
  success: boolean;
  data?: Record<string, unknown>[];
  error?: string;
  sqlExecuted: string;
  executionTime: number;
  rowCount: number;
}

export interface OrchestratorStatus {
  stage: 'analyzing' | 'building_context' | 'generating_sql' | 
         'executing' | 'correcting' | 'completed' | 'failed';
  message: string;
  progress: number;
  attempt: number;
  lastError?: string;
  currentSQL?: string;
}

export interface EnrichedContext {
  userQuestion: string;
  analysis: QueryAnalysis;
  selectedTables: string[];
  tablesDetails: Array<{
    name: string;
    description: string;
    fields: Array<{
      name: string;
      type: string;
      description: string;
      isPrimaryKey: boolean;
      isForeignKey: boolean;
      references?: string;
    }>;
  }>;
  relationships: { [key: string]: string[] };
  businessRules: string[];
  suggestedJoins: string[];
}

// ============================================================================
// SERVICIO ORQUESTADOR PRINCIPAL
// ============================================================================

export class AIOrchestrator {
  private static instance: AIOrchestrator;
  private anthropicService: AnthropicService;
  private workerRef: Worker | null = null;
  private currentStatus: OrchestratorStatus = {
    stage: 'analyzing',
    message: 'Inicializando...',
    progress: 0,
    attempt: 0
  };
  
  private statusCallbacks: Array<(status: OrchestratorStatus) => void> = [];

  private constructor() {
    this.anthropicService = AnthropicService.getInstance();
    this.initializeWorker();
  }

  public static getInstance(): AIOrchestrator {
    if (!AIOrchestrator.instance) {
      AIOrchestrator.instance = new AIOrchestrator();
    }
    return AIOrchestrator.instance;
  }

  // ========================================================================
  // INICIALIZACIÓN DEL WORKER DE IA LOCAL
  // ========================================================================

  private initializeWorker(): void {
    try {
      this.workerRef = new Worker(
        new URL('../../workers/sqlAIWorker.js', import.meta.url),
        { type: 'module' }
      );

      this.workerRef.onmessage = (event) => {
        const { progress, error } = event.data;
        console.log('🤖 Worker mensaje:', event.data);
        
        // Actualizar estado interno
        this.currentStatus = {
          ...this.currentStatus,
          progress: progress || this.currentStatus.progress,
          lastError: error || undefined
        };
        
        // Notificar a los callbacks
        this.notifyStatusChange();
      };

      this.workerRef.onerror = (error) => {
        console.error('❌ Error en worker IA:', error);
        this.updateStatus('failed', 'Error crítico en IA local', 0);
      };

    } catch (error) {
      console.error('❌ No se pudo inicializar worker:', error);
    }
  }

  // ========================================================================
  // GESTIÓN DE ESTADO Y CALLBACKS
  // ========================================================================

  public onStatusChange(callback: (status: OrchestratorStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  public removeStatusCallback(callback: (status: OrchestratorStatus) => void): void {
    const index = this.statusCallbacks.indexOf(callback);
    if (index > -1) {
      this.statusCallbacks.splice(index, 1);
    }
  }

  private updateStatus(
    stage: OrchestratorStatus['stage'], 
    message: string, 
    progress: number,
    attempt?: number,
    currentSQL?: string
  ): void {
    this.currentStatus = {
      stage,
      message,
      progress,
      attempt: attempt || this.currentStatus.attempt,
      currentSQL,
      lastError: stage === 'failed' ? message : undefined
    };
    this.notifyStatusChange();
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this.currentStatus);
      } catch (error) {
        console.error('Error en callback de status:', error);
      }
    });
  }

  // ========================================================================
  // MÉTODO PRINCIPAL: PROCESAR CONSULTA DEL USUARIO
  // ========================================================================

  public async processUserQuery(userQuestion: string): Promise<ExecutionResult> {
    console.log('🚀 Iniciando procesamiento de consulta:', userQuestion);
    
    try {
      // PASO 1: Analizar la pregunta con IA local
      this.updateStatus('analyzing', 'Analizando tu pregunta con IA local...', 10);
      const analysis = await this.analyzeQuestionWithAI(userQuestion);
      
      // PASO 2: Construir contexto enriquecido
      this.updateStatus('building_context', 'Construyendo contexto inteligente...', 25);
      const enrichedContext = await this.buildEnrichedContext(userQuestion, analysis);
      
      // PASO 3: Generar y ejecutar SQL con auto-corrección
      this.updateStatus('generating_sql', 'Generando SQL con Anthropic...', 40);
      const result = await this.executeWithAutoCorrection(enrichedContext);
      
      this.updateStatus('completed', `¡Consulta completada! ${result.rowCount} filas obtenidas`, 100);
      return result;
      
    } catch (error) {
      console.error('❌ Error en orquestador:', error);
      this.updateStatus('failed', error instanceof Error ? error.message : 'Error desconocido', 0);
      throw error;
    }
  }

  // ========================================================================
  // ANÁLISIS DE PREGUNTA CON IA LOCAL (FLAN-T5)
  // ========================================================================

  private async analyzeQuestionWithAI(userQuestion: string): Promise<QueryAnalysis> {
    return new Promise((resolve, reject) => {
      if (!this.workerRef) {
        reject(new Error('Worker de IA no disponible'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout en análisis de IA'));
      }, 30000);

      const messageHandler = (event: MessageEvent) => {
        const { status, analysis, error } = event.data;
        
        if (status === 'analysis_complete') {
          clearTimeout(timeout);
          this.workerRef?.removeEventListener('message', messageHandler);
          resolve(analysis);
        } else if (status === 'error') {
          clearTimeout(timeout);
          this.workerRef?.removeEventListener('message', messageHandler);
          reject(new Error(error));
        }
      };

      this.workerRef.addEventListener('message', messageHandler);
      
      // Enviar solicitud de análisis al worker
      this.workerRef.postMessage({
        type: 'analyzeQuery',
        userQuestion,
        availableTables: Object.keys(DatabaseSchema)
      });
    });
  }

  // ========================================================================
  // CONSTRUCCIÓN DE CONTEXTO ENRIQUECIDO
  // ========================================================================

  private async buildEnrichedContext(userQuestion: string, analysis: QueryAnalysis): Promise<EnrichedContext> {
    // Obtener información real de las tablas desde DatabaseSchema (MedicalTables-v2)
    const realTableDetails = analysis.requiredTables.map(tableName => {
      // Buscar la tabla en el schema usando la nueva estructura
      const tableKey = Object.keys(DatabaseSchema).find(key => 
        key.toLowerCase().includes(tableName.toLowerCase()) ||
        DatabaseSchema[key].name.toLowerCase() === tableName.toLowerCase()
      );
      
      if (tableKey) {
        const tableSchema = DatabaseSchema[tableKey];
        return {
          name: tableSchema.name,
          description: `${tableSchema.database}.${tableSchema.schema}.${tableSchema.name}`,
          fields: Object.entries(tableSchema.fields).map(([fieldName, fieldDef]) => ({
            name: fieldName,
            type: fieldDef.type,
            description: `${fieldName} (${fieldDef.type}${fieldDef.length ? `(${fieldDef.length})` : ''})`,
            isPrimaryKey: tableSchema.primaryKey.includes(fieldName),
            isForeignKey: Object.keys(tableSchema.foreignKeys).includes(fieldName),
            references: tableSchema.foreignKeys[fieldName]?.referencedTable
          }))
        };
      } else {
        // Fallback para tablas no encontradas
        return {
          name: tableName,
          description: `Tabla ${tableName}`,
          fields: [
            { name: 'id', type: 'string', description: 'ID', isPrimaryKey: true, isForeignKey: false }
          ]
        };
      }
    });

    // Generar reglas de negocio específicas basadas en el análisis
    const businessRules = this.generateBusinessRules(analysis);
    
    // Sugerir JOINs automáticamente
    const suggestedJoins = this.generateSuggestedJoins(analysis.requiredTables);

    return {
      userQuestion,
      analysis,
      selectedTables: analysis.requiredTables,
      tablesDetails: realTableDetails,
      relationships: {},
      businessRules,
      suggestedJoins
    };
  }

  // ========================================================================
  // EJECUCIÓN CON AUTO-CORRECCIÓN
  // ========================================================================

  private async executeWithAutoCorrection(context: EnrichedContext, maxRetries: number = 3): Promise<ExecutionResult> {
    let currentSQL = '';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.updateStatus('generating_sql', `Generando SQL (intento ${attempt}/${maxRetries})...`, 40 + (attempt * 10));
      
      try {
        // Generar SQL con Anthropic
        currentSQL = await this.generateSQLWithAnthropic(context, currentSQL, attempt);
        this.updateStatus('executing', `Ejecutando consulta (intento ${attempt})...`, 70 + (attempt * 5), attempt, currentSQL);
        
        // Ejecutar SQL
        const startTime = Date.now();
        const result = await dashboardService.executeScriptParsed(currentSQL);
        const executionTime = Date.now() - startTime;
        
        // ¡Éxito!
        return {
          success: true,
          data: result.data as Record<string, unknown>[],
          sqlExecuted: currentSQL,
          executionTime,
          rowCount: result.data.length
        };
        
      } catch (error) {
        console.error(`❌ Error en intento ${attempt}:`, error);
        this.updateStatus('correcting', `Corrigiendo error (intento ${attempt})...`, 60 + (attempt * 5), attempt);
        
        if (attempt === maxRetries) {
          // Último intento fallido
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
            sqlExecuted: currentSQL,
            executionTime: 0,
            rowCount: 0
          };
        }
        
        // Preparar context para corrección
        context = {
          ...context,
          userQuestion: `CORRECCIÓN REQUERIDA - Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nSQL Problemático:\n${currentSQL}\n\nPregunta original: ${context.userQuestion}`
        };
      }
    }
    
    throw new Error('No se pudo completar la consulta después de múltiples intentos');
  }

  // ========================================================================
  // GENERACIÓN DE SQL CON ANTHROPIC
  // ========================================================================

  private async generateSQLWithAnthropic(context: EnrichedContext, previousSQL: string, attempt: number): Promise<string> {
    const prompt = this.createAnthropicPrompt(context, previousSQL, attempt);
    
    const sqlScript = await this.anthropicService.sendMessage(prompt, {
      max_tokens: 2000,
      temperature: 0.1,
      system: `Eres un experto en SQL Server para sistemas médicos/comerciales. 
               Generas SQL optimizado y compatible con SQL Server 2012.
               Respondes ÚNICAMENTE con código SQL válido, sin explicaciones.`
    });
    
    console.log('🔍 SQL RAW de Anthropic:', sqlScript);
    
    // Limpiar el SQL de marcadores Markdown y espacios
    const cleanedSQL = this.cleanSQLResponse(sqlScript);
    
    console.log('✅ SQL LIMPIO para ejecución:', cleanedSQL);
    
    return cleanedSQL;
  }

  // ========================================================================
  // LIMPIEZA DE RESPUESTA SQL
  // ========================================================================

  private cleanSQLResponse(rawSQL: string): string {
    let cleanSQL = rawSQL.trim();
    
    // Remover marcadores de código Markdown
    cleanSQL = cleanSQL.replace(/^```sql\s*/i, '');
    cleanSQL = cleanSQL.replace(/^```\s*/i, '');
    cleanSQL = cleanSQL.replace(/\s*```$/i, '');
    
    // Remover líneas vacías al inicio y final
    cleanSQL = cleanSQL.replace(/^\s*\n+/, '');
    cleanSQL = cleanSQL.replace(/\n+\s*$/, '');
    
    // Remover comentarios de explicación que puedan haber quedado
    const lines = cleanSQL.split('\n');
    const sqlLines = lines.filter(line => {
      const trimmedLine = line.trim();
      // Mantener solo líneas SQL válidas
      return trimmedLine && 
             !trimmedLine.startsWith('--') && 
             !trimmedLine.startsWith('/*') &&
             !trimmedLine.startsWith('*') &&
             !trimmedLine.startsWith('*/');
    });
    
    return sqlLines.join('\n').trim();
  }

  // ========================================================================
  // CREACIÓN DE PROMPTS ESPECIALIZADOS
  // ========================================================================

  private createAnthropicPrompt(context: EnrichedContext, previousSQL: string, attempt: number): string {
    if (attempt > 1 && previousSQL) {
      // Prompt de corrección
      return `CORRECCIÓN SQL REQUERIDA - Intento ${attempt}

SQL PROBLEMÁTICO:
${previousSQL}

CONTEXTO DEL ERROR:
${context.userQuestion}

TABLAS DISPONIBLES:
${context.tablesDetails.map(t => `- ${t.name}: ${t.fields.filter(f => f.isPrimaryKey || f.isForeignKey).map(f => f.name).join(', ')}`).join('\n')}

REGLAS CRÍTICAS DE CORRECCIÓN:
🔧 BASE DE DATOS: SigesoftDesarrollo_2 (SIN corchetes para médico), [20505310072] (CON corchetes para ventas)
🔧 TABLA SYSTEM PARAMETER: systemparameter (NO system_parameter)
🔧 CAMPO VALOR: v_Value1 (NO v_Value)
🔧 JOIN CONSULTORIO: INNER JOIN SigesoftDesarrollo_2.dbo.systemparameter sp ON protocol.i_Consultorio = sp.i_ParameterId AND sp.i_GroupId = 403
🔧 SELECT CONSULTORIO: sp.v_Value1 AS Consultorio
🔧 SIEMPRE: i_ServiceStatusId = 3 para servicios culminados, i_IsDeleted = 0 para activos
🔧 CONSULTAS HÍBRIDAS: Si combina atenciones + ventas, usar tabla temporal #ComprobantesExpandidos (NO LIKE)
🔧 MONTOS/DINERO: Siempre usar [20505310072].dbo.venta.d_Total
🔧 Mantén alias en ESPAÑOL

⚠️ RESPONDE SOLO CON SQL CORREGIDO (sin marcadores de código):`;
    }
    
    // Prompt inicial
    return `Genera SQL SIMPLE y OPTIMIZADO para sistema médico/comercial.

PREGUNTA: "${context.analysis.intent === 'medical' ? '🏥' : context.analysis.intent === 'commercial' ? '💰' : '📊'} ${context.userQuestion}"

CONTEXTO INTELIGENTE:
• Intención: ${context.analysis.intent.toUpperCase()}
• Entidades: ${context.analysis.entities.join(', ')}
• Periodo: ${context.analysis.timeframe.period}
• Complejidad: ${context.analysis.complexity.toUpperCase()}

TABLAS SELECCIONADAS POR IA:
${context.tablesDetails.map(t => {
  const enumFields = t.fields.filter(f => f.name.includes('StatusId') || f.name.includes('Estado'));
  const keyFields = t.fields.filter(f => f.isPrimaryKey || f.isForeignKey).map(f => f.name).join(', ');
  const enumInfo = enumFields.length > 0 ? `\n   🔢 ENUMS: ${enumFields.map(f => f.name).join(', ')}` : '';
  return `📋 ${t.name} (${t.description})\n   Campos clave: ${keyFields}${enumInfo}`;
}).join('\n')}

RELACIONES DETECTADAS:
${Object.entries(context.relationships).map(([table, relations]) => `🔗 ${table}: ${relations.join(', ')}`).join('\n')}

REGLAS DE NEGOCIO:
${context.businessRules.map(rule => `✅ ${rule}`).join('\n')}

JOINS SUGERIDOS:
${context.suggestedJoins.map(join => `🔄 ${join}`).join('\n')}

🏥 BASES DE DATOS CORRECTAS (USAR EXACTAMENTE):
- Medical/Médico: SigesoftDesarrollo_2 (SIN corchetes)
- Sales/Ventas: [20505310072] (CON corchetes)
- NUNCA usar [SigesoftDesarrollo_2] con corchetes para médico

💰 REGLAS PARA CONSULTAS DE DINERO/VENTAS:
- Montos/Dinero: [20505310072].dbo.venta.d_Total
- Productos: [20505310072].dbo.producto
- Documentos: [20505310072].dbo.documento

🔢 SYSTEM PARAMETERS - NOMBRES EXACTOS (CRÍTICO):
• Tabla: systemparameter (NO system_parameter)
• Campo valor: v_Value1 (NO v_Value)
• JOIN: INNER JOIN SigesoftDesarrollo_2.dbo.systemparameter sp ON tabla.campo = sp.i_ParameterId AND sp.i_GroupId = XXX
• Consultorio: i_GroupId = 403
• ServiceStatus: i_GroupId = 122

🔢 ENUMERADORES CRÍTICOS (USAR VALORES EXACTOS):
• ServiceStatusId: 1=PorIniciar, 2=Iniciado, 3=Culminado, 4=Incompleto, 5=Cancelado, 6=EsperandoAptitud
• AptitudeStatusId: 1=Apto, 2=NoApto, 3=AptoConRestricciones, 4=Observado
• Para análisis de servicios SIEMPRE usar i_ServiceStatusId = 3 (Culminado)
• Para registros activos SIEMPRE usar i_IsDeleted = 0

🚀 REGLAS DE OPTIMIZACIÓN SQL:
• EVITA CTEs complejos - usa consultas directas cuando sea posible
• Para porcentajes: calcula DESPUÉS en la aplicación, NO en SQL
• NO uses subconsultas en SELECT para porcentajes
• Prefiere GROUP BY simple con COUNT(*) y ORDER BY
• Para TOP 10: usa SELECT TOP 10 directamente
• SOLO incluye campos necesarios en SELECT
• Usa índices existentes (campos con Id, Date, Status)

⚡ OPTIMIZACIÓN CRÍTICA PARA CONSULTAS HÍBRIDAS:
• NUNCA usar LIKE en JOIN con v_ComprobantePago (muy lento)
• SIEMPRE crear tabla temporal #ComprobantesExpandidos primero
• Usar master..spt_values para separar strings por | (pipes)
• JOIN directo con tabla temporal (mucho más rápido)
• Limpiar tabla temporal al final con DROP TABLE

🎯 PATRÓN RECOMENDADO PARA TOP + PORCENTAJES:
SELECT TOP 10
    campo_nombre,
    campo_codigo,
    COUNT(*) as Cantidad
FROM tabla_principal tp
INNER JOIN tabla_relacionada tr ON tp.campo_id = tr.campo_id
WHERE condiciones_filtro
GROUP BY campo_nombre, campo_codigo
ORDER BY COUNT(*) DESC

🏥 EJEMPLO ESPECÍFICO CONSULTORIOS (USAR EXACTAMENTE):
SELECT TOP 10
    sp.v_Value1 AS Consultorio,
    COUNT(*) AS TotalAtenciones
FROM SigesoftDesarrollo_2.dbo.service s
INNER JOIN SigesoftDesarrollo_2.dbo.protocol p ON s.v_ProtocolId = p.v_ProtocolId
INNER JOIN SigesoftDesarrollo_2.dbo.systemparameter sp ON p.i_Consultorio = sp.i_ParameterId AND sp.i_GroupId = 403
WHERE s.i_ServiceStatusId = 3 AND s.i_IsDeleted = 0
GROUP BY sp.v_Value1
ORDER BY COUNT(*) DESC

👨‍⚕️ EJEMPLO ESPECÍFICO MÉDICOS TRATANTES (USAR EXACTAMENTE):
SELECT TOP 10
    p.v_FirstName + ' ' + p.v_FirstLastName AS MedicoTratante,
    COUNT(*) AS TotalAtenciones
FROM SigesoftDesarrollo_2.dbo.service s
INNER JOIN SigesoftDesarrollo_2.dbo.servicecomponent sc ON s.v_ServiceId = sc.v_ServiceId
INNER JOIN SigesoftDesarrollo_2.dbo.systemuser su ON sc.i_MedicoTratanteId = su.i_SystemUserId
INNER JOIN SigesoftDesarrollo_2.dbo.person p ON su.v_PersonId = p.v_PersonId
WHERE s.i_ServiceStatusId = 3 AND s.i_IsDeleted = 0 AND sc.i_IsDeleted = 0
GROUP BY p.v_FirstName, p.v_FirstLastName
ORDER BY COUNT(*) DESC

💰 EJEMPLO CONSULTA HÍBRIDA OPTIMIZADA - TABLA TEMPORAL (SQL SERVER 2012):
-- PASO 1: Crear tabla temporal expandiendo comprobantes separados por |
SELECT DISTINCT
    s.v_ServiceId,
    s.v_ProtocolId,
    s.v_PersonId,
    s.d_ServiceDate,
    LTRIM(RTRIM(
        SUBSTRING(
            s.v_ComprobantePago, 
            N.number, 
            CHARINDEX('|', s.v_ComprobantePago + '|', N.number) - N.number
        )
    )) AS v_ComprobantePago
INTO #ComprobantesExpandidos
FROM SigesoftDesarrollo_2.dbo.service s
INNER JOIN (
    SELECT TOP 10 number
    FROM master..spt_values 
    WHERE type = 'P' 
    AND number BETWEEN 1 AND 10
) N ON N.number <= LEN(s.v_ComprobantePago) + 1
AND SUBSTRING('|' + s.v_ComprobantePago, N.number, 1) = '|'
WHERE s.v_ComprobantePago IS NOT NULL
AND s.i_ServiceStatusId = 3
AND s.i_IsDeleted = 0
AND LTRIM(RTRIM(
    SUBSTRING(
        s.v_ComprobantePago, 
        N.number, 
        CHARINDEX('|', s.v_ComprobantePago + '|', N.number) - N.number
    )
)) != '';

-- PASO 2: JOIN optimizado con tabla temporal
SELECT TOP 10
    sp.v_Value1 AS Protocolo,
    SUM(v.d_Total) AS MontoTotal
FROM #ComprobantesExpandidos ce
INNER JOIN SigesoftDesarrollo_2.dbo.protocol p ON ce.v_ProtocolId = p.v_ProtocolId
INNER JOIN SigesoftDesarrollo_2.dbo.systemparameter sp ON p.i_Consultorio = sp.i_ParameterId AND sp.i_GroupId = 403
INNER JOIN [20505310072].dbo.venta v ON ce.v_ComprobantePago = v.v_CorrelativoDocumentoFin
WHERE v.i_Eliminado = 0
GROUP BY sp.v_Value1
ORDER BY MontoTotal DESC;

-- PASO 3: Limpiar tabla temporal
DROP TABLE #ComprobantesExpandidos;

🤖 INFORMACIÓN AUTOMÁTICA DESDE SCHEMA DE BASE DE DATOS:
Las reglas de negocio, relaciones, campos exactos y enumeradores se generan automáticamente desde MedicalTables.ts

⚠️ IMPORTANTE: 
- Responde ÚNICAMENTE con código SQL puro, SIN marcadores de código Markdown
- Genera SQL SIMPLE y RÁPIDO
- Los porcentajes se calcularán en la aplicación React

RESPONDE SOLO CON SQL OPTIMIZADO Y SIMPLE:`;
  }

  // ========================================================================
  // HELPERS PARA GENERAR REGLAS Y JOINS
  // ========================================================================

  private generateBusinessRules(analysis: QueryAnalysis): string[] {
    const rules: string[] = [];
    
    // Reglas generales basadas en la intención
    if (analysis.intent === 'medical') {
      rules.push('Solo servicios CULMINADOS (i_ServiceStatusId = 3) - NO usar 1 que es "PorIniciar"');
      rules.push('Excluir registros eliminados (i_IsDeleted = 0)');
      rules.push('Alias en español para columnas de resultado');
    }
    
    if (analysis.intent === 'commercial') {
      rules.push('Solo ventas no eliminadas (i_Eliminado = 0)');
      rules.push('Incluir análisis de rentabilidad');
    }
    
    // Reglas de tiempo
    if (analysis.timeframe.period !== 'sin_limite') {
      rules.push(`Filtrar por periodo: ${analysis.timeframe.period}`);
    }

    // GENERAR REGLAS AUTOMÁTICAMENTE DESDE DatabaseSchema
    const schemaRules = this.generateSchemaBasedRules(analysis.requiredTables);
    rules.push(...schemaRules);
    
    return rules;
  }

  // ========================================================================
  // GENERACIÓN AUTOMÁTICA DE REGLAS DESDE DatabaseSchema
  // ========================================================================

  private generateSchemaBasedRules(requiredTables: string[]): string[] {
    const rules: string[] = [];
    
    // Obtener información de las tablas requeridas
    const tablesInfo = requiredTables.map(tableName => {
      const tableKey = Object.keys(DatabaseSchema).find(key => 
        key.toLowerCase().includes(tableName.toLowerCase()) ||
        DatabaseSchema[key].name.toLowerCase() === tableName.toLowerCase()
      );
      return tableKey ? { key: tableKey, schema: DatabaseSchema[tableKey] } : null;
    }).filter(Boolean);

    // 1. REGLAS DE CAMPOS EXACTOS
    const fieldRules: string[] = [];
    tablesInfo.forEach(tableInfo => {
      if (tableInfo) {
        const { schema } = tableInfo;
        const importantFields = Object.entries(schema.fields)
          .filter(([fieldName]) => 
            fieldName.includes('Name') || 
            fieldName.includes('Date') || 
            fieldName.includes('Status') ||
            fieldName.includes('Id')
          )
          .map(([fieldName]) => `${schema.name}.${fieldName}`)
          .slice(0, 5); // Limitar a 5 campos más importantes
        
        if (importantFields.length > 0) {
          fieldRules.push(`CAMPOS EXACTOS ${schema.name.toUpperCase()}: ${importantFields.join(', ')}`);
        }
      }
    });
    rules.push(...fieldRules);

    // 2. REGLAS DE FOREIGN KEYS (RELACIONES)
    const relationRules: string[] = [];
    tablesInfo.forEach(tableInfo => {
      if (tableInfo) {
        const { schema } = tableInfo;
        Object.entries(schema.foreignKeys).forEach(([fkField, fkInfo]) => {
          const targetTable = fkInfo.referencedTable.split('.').pop(); // Obtener solo el nombre de la tabla
          relationRules.push(`RELACIÓN: ${schema.name}.${fkField} -> ${targetTable}.${fkInfo.referencedField}`);
        });
      }
    });
    rules.push(...relationRules);

    // 3. REGLAS DE SYSTEM PARAMETERS (reemplaza enumeradores)
    const systemParamRules: string[] = [];
    tablesInfo.forEach(tableInfo => {
      if (tableInfo) {
        const { schema } = tableInfo;
        Object.entries(schema.systemParameterJoins).forEach(([fieldName, joinDef]) => {
          const paramName = fieldName.replace('i_', '').replace('Id', '');
          // Generar regla específica con nombres exactos
          const selectField = joinDef.selectFields[0]; // Primer campo select
          systemParamRules.push(`SYSTEM_PARAM ${paramName}: INNER JOIN ${schema.database}.dbo.systemparameter ${joinDef.alias} ON ${schema.name}.${fieldName} = ${joinDef.alias}.i_ParameterId AND ${joinDef.alias}.${joinDef.condition}`);
          systemParamRules.push(`SELECT FIELD: ${joinDef.alias}.${selectField.fieldName} AS ${selectField.aliasName}`);
        });
      }
    });
    rules.push(...systemParamRules);

    // 4. REGLAS DE CUSTOM JOINS (para relaciones complejas como médicos tratantes)
    const customJoinRules: string[] = [];
    tablesInfo.forEach(tableInfo => {
      if (tableInfo) {
        const { schema } = tableInfo;
        if (schema.customJoins) {
          Object.entries(schema.customJoins).forEach(([fieldName, joinDef]) => {
            if (joinDef.type === 'nested') {
              const joinSteps = joinDef.joins.map(step => 
                `${step.table} ${step.alias} ON ${schema.name}.${fieldName} = ${step.alias}.${step.joinField}`
              ).join(' -> ');
              customJoinRules.push(`CUSTOM JOIN ${fieldName}: ${joinSteps}`);
              
              // Agregar campos SELECT de cada paso
              joinDef.joins.forEach(step => {
                if (step.selectFields) {
                  step.selectFields.forEach(sf => {
                    customJoinRules.push(`SELECT FIELD: ${step.alias}.${sf.fieldName} AS ${sf.aliasName}`);
                  });
                }
              });
            }
          });
        }
      }
    });
    rules.push(...customJoinRules);

    // 5. REGLAS DE PRIMARY KEYS
    const pkRules: string[] = [];
    tablesInfo.forEach(tableInfo => {
      if (tableInfo) {
        const { schema } = tableInfo;
        if (schema.primaryKey.length > 0) {
          pkRules.push(`PRIMARY KEY ${schema.name}: ${schema.primaryKey.join(', ')}`);
        }
      }
    });
    rules.push(...pkRules);

    // 5. REGLAS ESPECÍFICAS PARA COMBINACIONES COMUNES
    const tableNames = tablesInfo.map(t => t?.schema.name.toLowerCase()).filter(Boolean);
    
    if (tableNames.includes('diagnosticrepository') && tableNames.includes('service')) {
      rules.push('CRÍTICO: DiagnosticRepository NO tiene d_ServiceDate ni i_ServiceStatusId - usar JOIN con service');
    }
    
    if (tableNames.includes('diseases')) {
      rules.push('CRÍTICO: diseases.v_Name es el campo correcto para nombre de diagnóstico (NO v_DiseasesName)');
    }

    if (tableNames.includes('protocol')) {
      rules.push('CRÍTICO CONSULTORIO: INNER JOIN SigesoftDesarrollo_2.dbo.systemparameter sp ON protocol.i_Consultorio = sp.i_ParameterId AND sp.i_GroupId = 403');
      rules.push('CRÍTICO CONSULTORIO: SELECT sp.v_Value1 AS Consultorio (NO v_Value)');
      rules.push('CRÍTICO CONSULTORIO: Tabla systemparameter (NO system_parameter)');
    }

    if (tableNames.includes('servicecomponent')) {
      rules.push('CRÍTICO MÉDICO TRATANTE: servicecomponent.i_MedicoTratanteId -> systemuser.i_SystemUserId -> person.v_PersonId');
      rules.push('CRÍTICO MÉDICO TRATANTE: INNER JOIN systemuser su ON servicecomponent.i_MedicoTratanteId = su.i_SystemUserId');
      rules.push('CRÍTICO MÉDICO TRATANTE: INNER JOIN person p ON su.v_PersonId = p.v_PersonId');
      rules.push('CRÍTICO MÉDICO TRATANTE: SELECT p.v_FirstName + \' \' + p.v_FirstLastName AS MedicoTratante');
    }

    if (tableNames.includes('person')) {
      rules.push('CRÍTICO: person.v_FirstName, person.v_FirstLastName para nombres de persona');
    }

    // REGLAS ESPECIALES PARA CONSULTAS HÍBRIDAS
    if (tableNames.includes('__HYBRID_QUERY__')) {
      rules.push('🔄 CONSULTA HÍBRIDA DETECTADA: Atenciones médicas + Ventas');
      rules.push('💰 ENLACE COMPLEJO: SigesoftDesarrollo_2.dbo.service.v_ComprobantePago = [20505310072].dbo.venta.v_CorrelativoDocumentoFin');
      rules.push('🔗 MÚLTIPLES COMPROBANTES: v_ComprobantePago puede contener varios valores separados por | (pipes)');
      rules.push('⚡ OPTIMIZACIÓN CRÍTICA: NO usar LIKE en JOIN - Crear tabla temporal #ComprobantesExpandidos');
      rules.push('📋 ESTRATEGIA: 1) Crear tabla temporal expandiendo comprobantes, 2) JOIN directo con tabla temporal, 3) DROP tabla temporal');
      rules.push('🚀 RENDIMIENTO: Usar master..spt_values para separar strings por | (mucho más rápido que LIKE)');
      rules.push('💡 PATRÓN OPTIMIZADO: Ver ejemplo completo con tabla temporal en el prompt');
    }

    if (tableNames.includes('venta')) {
      rules.push('💰 VENTAS: Base de datos [20505310072].dbo.venta');
      rules.push('💰 MONTO: Campo d_Total para importes totales');
      rules.push('💰 DOCUMENTO: v_CorrelativoDocumentoFin para enlace con service.v_ComprobantePago');
      rules.push('💰 ACTIVOS: i_Eliminado = 0 para ventas válidas');
    }

    return rules;
  }

  private generateSuggestedJoins(requiredTables: string[]): string[] {
    const joins: string[] = [];
    
    // GENERAR JOINS AUTOMÁTICAMENTE DESDE DatabaseSchema
    const autoJoins = this.generateSchemaBasedJoins(requiredTables);
    joins.push(...autoJoins);
    
    // Mapeo manual para casos especiales (fallback)
    const manualJoins: Record<string, string> = {
      'SERVICE+PERSON': 'SERVICE s INNER JOIN PERSON p ON s.v_PersonId = p.v_PersonId',
      'SERVICE+ORGANIZATION': 'SERVICE s INNER JOIN ORGANIZATION o ON s.v_OrganizationId = o.v_OrganizationId',
      'DIAGNOSTICREPOSITORY+DISEASES': 'DIAGNOSTICREPOSITORY dr INNER JOIN DISEASES d ON dr.v_DiseasesId = d.v_DiseasesId',
      'DIAGNOSTICREPOSITORY+SERVICE': 'DIAGNOSTICREPOSITORY dr INNER JOIN SERVICE s ON dr.v_ServiceId = s.v_ServiceId',
      'DISEASES+CIE10': 'DISEASES d INNER JOIN CIE10 c ON d.v_CIE10Id = c.v_CIE10Id'
    };
    
    // Agregar joins manuales si no se generaron automáticamente
    requiredTables.forEach(table1 => {
      requiredTables.forEach(table2 => {
        if (table1 !== table2) {
          const joinKey = `${table1.toUpperCase()}+${table2.toUpperCase()}`;
          const reverseJoinKey = `${table2.toUpperCase()}+${table1.toUpperCase()}`;
          
          if (manualJoins[joinKey] && !joins.some(j => j.includes(table1) && j.includes(table2))) {
            joins.push(manualJoins[joinKey]);
          } else if (manualJoins[reverseJoinKey] && !joins.some(j => j.includes(table1) && j.includes(table2))) {
            joins.push(manualJoins[reverseJoinKey]);
          }
        }
      });
    });
    
    return [...new Set(joins)]; // Eliminar duplicados
  }

  // ========================================================================
  // GENERACIÓN AUTOMÁTICA DE JOINS DESDE DatabaseSchema
  // ========================================================================

  private generateSchemaBasedJoins(requiredTables: string[]): string[] {
    const joins: string[] = [];
    
    // Obtener información de las tablas requeridas
    const tablesInfo = requiredTables.map(tableName => {
      const tableKey = Object.keys(DatabaseSchema).find(key => 
        key.toLowerCase().includes(tableName.toLowerCase()) ||
        DatabaseSchema[key].name.toLowerCase() === tableName.toLowerCase()
      );
      return tableKey ? { key: tableKey, schema: DatabaseSchema[tableKey] } : null;
    }).filter(Boolean);

    // Generar JOINs basados en foreign keys
    tablesInfo.forEach(tableInfo => {
      if (tableInfo) {
        const { schema } = tableInfo;
        
        Object.entries(schema.foreignKeys).forEach(([fkField, fkInfo]) => {
          // Buscar si la tabla referenciada está en las tablas requeridas
          const referencedTableName = fkInfo.referencedTable.split('.').pop()?.toLowerCase();
          const referencedTableInfo = tablesInfo.find(t => 
            t?.schema.name.toLowerCase() === referencedTableName
          );
          
          if (referencedTableInfo) {
            // Generar alias simples
            const sourceAlias = this.generateTableAlias(schema.name);
            const targetAlias = this.generateTableAlias(referencedTableInfo.schema.name);
            
            const joinSQL = `${schema.name.toUpperCase()} ${sourceAlias} INNER JOIN ${referencedTableInfo.schema.name.toUpperCase()} ${targetAlias} ON ${sourceAlias}.${fkField} = ${targetAlias}.${fkInfo.referencedField}`;
            joins.push(joinSQL);
          }
        });
      }
    });

    return joins;
  }

  // ========================================================================
  // HELPER PARA GENERAR ALIAS DE TABLAS
  // ========================================================================

  private generateTableAlias(tableName: string): string {
    // Generar alias inteligentes basados en el nombre de la tabla
    const aliasMap: Record<string, string> = {
      'service': 's',
      'person': 'p',
      'diseases': 'd',
      'diagnosticrepository': 'dr',
      'protocol': 'pr',
      'organization': 'o',
      'component': 'c',
      'calendar': 'cal',
      'cie10': 'cie',
      'venta': 'v',
      'producto': 'prod'
    };
    
    return aliasMap[tableName.toLowerCase()] || tableName.substring(0, 2).toLowerCase();
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  public dispose(): void {
    if (this.workerRef) {
      this.workerRef.terminate();
      this.workerRef = null;
    }
    this.statusCallbacks = [];
  }
} 
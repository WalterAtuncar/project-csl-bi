import { useState, useRef, useCallback } from 'react';

export interface AIStatus {
  isLoading: boolean;
  isModelLoaded: boolean;
  progress: number;
  currentMessage: string;
  error: string | null;
  hasError: boolean;
}

export interface GenerateOptions {
  maxLength?: number;
  useLocalAI?: boolean;
}

export interface TableField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  description: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: string;
}

export interface TableDetail {
  name: string;
  description: string;
  fields: TableField[];
}

export interface TablesContext {
  userQuestion: string;
  selectedTables: string[];
  tablesDetails: TableDetail[];
  relationships: { [key: string]: string[] };
  availablePatterns: Array<{
    keywords: string[];
    description: string;
  }>;
}

export const useLocalAI = () => {
  const [status, setStatus] = useState<AIStatus>({
    isLoading: false,
    isModelLoaded: false,
    progress: 0,
    currentMessage: '',
    error: null,
    hasError: false
  });
  
  const workerRef = useRef<Worker | null>(null);
  const resolveRef = useRef<((value: string) => void) | null>(null);
  const rejectRef = useRef<((reason?: unknown) => void) | null>(null);

  const initializeWorker = useCallback(() => {
    if (!workerRef.current) {
      console.log('🚀 Inicializando worker de IA local...');
      
      try {
        workerRef.current = new Worker(
          new URL('../workers/sqlAIWorker.js', import.meta.url),
          { type: 'module' }
        );

        workerRef.current.onmessage = (event) => {
          const { status: workerStatus, message, progress, sqlScript, error, fallbackSQL, originalOutput, prompt, dashboardAnalysis } = event.data;
          
          console.log('📨 Mensaje del worker:', event.data);
          
          switch (workerStatus) {
            case 'loading':
              setStatus(prev => ({
                ...prev,
                isLoading: true,
                currentMessage: message || 'Inicializando IA local...',
                error: null,
                hasError: false
              }));
              break;
              
            case 'progress':
              setStatus(prev => ({
                ...prev,
                progress: Math.min(progress || 0, 100),
                currentMessage: message || `Cargando: ${Math.round((progress || 0) * 100)}%`
              }));
              break;
              
            case 'generating':
              setStatus(prev => ({
                ...prev,
                isModelLoaded: true,
                currentMessage: message || 'Generando análisis con IA...',
                progress: 100
              }));
              break;
              
            case 'complete':
              setStatus(prev => ({
                ...prev,
                isLoading: false,
                currentMessage: error ? 
                  'Análisis generado con fallback (error en IA)' : 
                  'Análisis generado exitosamente',
                error: error || null,
                hasError: !!error
              }));
              
              console.log('✅ Análisis generado:', dashboardAnalysis || sqlScript);
              if (prompt) console.log('🔍 Prompt usado:', prompt);
              if (originalOutput) console.log('🤖 Respuesta original:', originalOutput);
              
              if (resolveRef.current) {
                resolveRef.current(dashboardAnalysis || sqlScript);
                resolveRef.current = null;
              }
              break;
              
            case 'error':
              setStatus(prev => ({
                ...prev,
                isLoading: false,
                error: error || 'Error desconocido en IA',
                currentMessage: `Error: ${error || 'Desconocido'}`,
                hasError: true
              }));
              
              console.error('❌ Error en IA:', error);
              
              if (rejectRef.current) {
                // Si hay fallback, usarlo en lugar de rechazar
                if (fallbackSQL || dashboardAnalysis) {
                  console.log('🔄 Usando respuesta de respaldo:', fallbackSQL || dashboardAnalysis);
                  if (resolveRef.current) {
                    resolveRef.current(fallbackSQL || dashboardAnalysis);
                    resolveRef.current = null;
                  }
                } else {
                  rejectRef.current(new Error(error));
                }
                rejectRef.current = null;
              }
              break;
          }
        };

        workerRef.current.onerror = (error) => {
          console.error('💥 Error crítico en worker:', error);
          setStatus(prev => ({
            ...prev,
            isLoading: false,
            error: 'Error crítico: Incompatibilidad del navegador',
            currentMessage: 'Error crítico en IA local',
            hasError: true
          }));
          
          if (rejectRef.current) {
            rejectRef.current(new Error('Error crítico en worker de IA'));
            rejectRef.current = null;
          }
        };

      } catch (error) {
        console.error('❌ Error creando worker:', error);
        setStatus(prev => ({
          ...prev,
          error: 'No se pudo inicializar el worker de IA',
          currentMessage: 'Error de inicialización',
          hasError: true
        }));
      }
    }
  }, []);

  const generateSQL = useCallback(async (
    userQuestion: string, 
    tablesContext: TablesContext, 
    options: GenerateOptions = {}
  ): Promise<string> => {
    if (!userQuestion.trim()) {
      throw new Error('La pregunta no puede estar vacía');
    }

    // Si no quiere usar IA local, usar el fallback original
    if (options.useLocalAI === false) {
      console.log('⚡ Usando generador de SQL rápido (sin IA)');
      return generateFallbackSQL(userQuestion, tablesContext);
    }

    // Verificar si Web Workers están disponibles
    if (!window.Worker) {
      console.warn('⚠️ Web Workers no disponibles, usando fallback');
      return generateFallbackSQL(userQuestion, tablesContext);
    }

    return new Promise((resolve, reject) => {
      // Guardar las funciones de resolve/reject
      resolveRef.current = resolve;
      rejectRef.current = reject;
      
      // Inicializar worker si no existe
      if (!workerRef.current) {
        initializeWorker();
      }

      // Si aún no se pudo crear el worker, usar fallback
      if (!workerRef.current) {
        console.warn('⚠️ No se pudo crear worker, usando fallback');
        resolve(generateFallbackSQL(userQuestion, tablesContext));
        return;
      }

      console.log('📤 Enviando consulta SQL al worker:', {
        userQuestion,
        tablesContext: tablesContext.selectedTables,
        maxLength: options.maxLength || 300
      });

      // Timeout general para toda la operación
      const generalTimeout = setTimeout(() => {
        console.warn('⏰ Timeout general de IA, usando fallback');
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: 'Timeout en IA local',
          currentMessage: 'Timeout - usando fallback',
          hasError: true
        }));
        
        if (resolveRef.current) {
          resolveRef.current(generateFallbackSQL(userQuestion, tablesContext));
          resolveRef.current = null;
        }
      }, 45000); // 45 segundos timeout total

      // Limpiar timeout cuando se resuelva
      const originalResolve = resolveRef.current;
      const originalReject = rejectRef.current;
      
      resolveRef.current = (value) => {
        clearTimeout(generalTimeout);
        if (originalResolve) originalResolve(value);
      };
      
      rejectRef.current = (reason) => {
        clearTimeout(generalTimeout);
        if (originalReject) originalReject(reason);
      };

      // Enviar mensaje al worker para generar SQL
      try {
        workerRef.current.postMessage({
          type: 'generateSQL',
          userQuestion,
          tablesContext,
          maxLength: options.maxLength || 300
        });
      } catch (error) {
        clearTimeout(generalTimeout);
        console.error('❌ Error enviando mensaje al worker:', error);
        resolve(generateFallbackSQL(userQuestion, tablesContext));
      }
    });
  }, [initializeWorker]);

  // Nueva función para análisis de dashboards
  const generateDashboardAnalysis = useCallback(async (
    userQuestion: string,
    dashboardData: Record<string, unknown> | object | null,
    dashboardType: 'general' | 'sales' | 'custom' = 'general',
    options: GenerateOptions = {}
  ): Promise<string> => {
    if (!userQuestion.trim()) {
      throw new Error('La pregunta no puede estar vacía');
    }

    if (!dashboardData) {
      throw new Error('No hay datos del dashboard disponibles');
    }

    // Si no quiere usar IA local, usar el fallback
    if (options.useLocalAI === false) {
      console.log('⚡ Usando analizador de dashboard rápido (sin IA)');
      return generateFallbackDashboardAnalysis(userQuestion, dashboardData, dashboardType);
    }

    // Verificar si Web Workers están disponibles
    if (!window.Worker) {
      console.warn('⚠️ Web Workers no disponibles, usando fallback para dashboard');
      return generateFallbackDashboardAnalysis(userQuestion, dashboardData, dashboardType);
    }

    return new Promise((resolve, reject) => {
      // Guardar las funciones de resolve/reject
      resolveRef.current = resolve;
      rejectRef.current = reject;
      
      // Inicializar worker si no existe
      if (!workerRef.current) {
        initializeWorker();
      }

      // Si aún no se pudo crear el worker, usar fallback
      if (!workerRef.current) {
        console.warn('⚠️ No se pudo crear worker, usando fallback para dashboard');
        resolve(generateFallbackDashboardAnalysis(userQuestion, dashboardData, dashboardType));
        return;
      }

      console.log('📤 Enviando consulta de dashboard al worker:', {
        userQuestion,
        dashboardType,
        hasData: !!dashboardData
      });

      // Timeout general para toda la operación
      const generalTimeout = setTimeout(() => {
        console.warn('⏰ Timeout de IA para dashboard, usando fallback');
        setStatus(prev => ({
          ...prev,
          isLoading: false,
          error: 'Timeout en IA local',
          currentMessage: 'Timeout - usando fallback',
          hasError: true
        }));
        
        if (resolveRef.current) {
          resolveRef.current(generateFallbackDashboardAnalysis(userQuestion, dashboardData, dashboardType));
          resolveRef.current = null;
        }
      }, 30000); // 30 segundos timeout para dashboard

      // Limpiar timeout cuando se resuelva
      const originalResolve = resolveRef.current;
      const originalReject = rejectRef.current;
      
      resolveRef.current = (value) => {
        clearTimeout(generalTimeout);
        if (originalResolve) originalResolve(value);
      };
      
      rejectRef.current = (reason) => {
        clearTimeout(generalTimeout);
        if (originalReject) originalReject(reason);
      };

      // Enviar mensaje al worker para análisis de dashboard
      try {
        workerRef.current.postMessage({
          type: 'analyzeDashboard',
          userQuestion,
          dashboardData,
          dashboardType,
          maxLength: options.maxLength || 800
        });
      } catch (error) {
        clearTimeout(generalTimeout);
        console.error('❌ Error enviando mensaje de dashboard al worker:', error);
        resolve(generateFallbackDashboardAnalysis(userQuestion, dashboardData, dashboardType));
      }
    });
  }, [initializeWorker]);

  const resetStatus = useCallback(() => {
    setStatus({
      isLoading: false,
      isModelLoaded: false,
      progress: 0,
      currentMessage: '',
      error: null,
      hasError: false
    });
  }, []);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      console.log('🛑 Terminando worker de IA');
      workerRef.current.terminate();
      workerRef.current = null;
      resetStatus();
    }
  }, [resetStatus]);

  return {
    generateSQL,
    generateDashboardAnalysis, // Nueva función exportada
    status,
    resetStatus,
    terminateWorker,
    isAvailable: !!window.Worker // Verificar si Web Workers están disponibles
  };
};

// Función de fallback que genera SQL sin IA
function generateFallbackSQL(question: string, tablesContext: TablesContext): string {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('diagnósticos') && lowerQuestion.includes('tendencia')) {
    return `-- Diagnósticos de mayor tendencia (Fallback - sin IA local)
SELECT 
    d.v_Name as Enfermedad,
    c.v_CIE10Description1 as DescripcionCIE10,
    COUNT(*) as CantidadDiagnosticos,
    COUNT(DISTINCT dr.v_ServiceId) as ServiciosAfectados
FROM DIAGNOSTICREPOSITORY dr
    INNER JOIN DISEASES d ON dr.v_DiseasesId = d.v_DiseasesId
    INNER JOIN CIE10 c ON d.v_CIE10Id = c.v_CIE10Id
WHERE 
    dr.d_InsertDate >= DATEADD(MONTH, -3, GETDATE())
GROUP BY 
    d.v_Name, c.v_CIE10Description1
ORDER BY 
    CantidadDiagnosticos DESC;`;
  }

  if (lowerQuestion.includes('ingresos') && lowerQuestion.includes('mes')) {
    return `-- Ingresos mensuales (Fallback - sin IA local)
SELECT 
    YEAR(s.d_ServiceDate) as Año,
    MONTH(s.d_ServiceDate) as Mes,
    COUNT(*) as TotalServicios,
    SUM(s.r_Costo) as IngresoTotal,
    AVG(s.r_Costo) as PromedioServicio
FROM SERVICE s
WHERE 
    s.i_ServiceStatusId = 1
    AND s.d_ServiceDate >= DATEADD(MONTH, -6, GETDATE())
GROUP BY 
    YEAR(s.d_ServiceDate), MONTH(s.d_ServiceDate)
ORDER BY 
    Año DESC, Mes DESC;`;
  }

  if (lowerQuestion.includes('empresas') && lowerQuestion.includes('servicios')) {
    return `-- Top empresas por servicios (Fallback - sin IA local)
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
    o.v_Name, o.v_IdentificationNumber
ORDER BY 
    TotalServicios DESC;`;
  }

  if (lowerQuestion.includes('pacientes') && lowerQuestion.includes('edad')) {
    return `-- Distribución por edades (Fallback - sin IA local)
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
  
  return `-- Consulta generada sin IA local para: "${question}"
-- Tablas disponibles: ${tablesContext.selectedTables.join(', ')}
SELECT *
FROM ${tablesContext.selectedTables[0] || 'SERVICE'}
WHERE d_InsertDate >= DATEADD(MONTH, -3, GETDATE())
ORDER BY d_InsertDate DESC
LIMIT 100;

-- NOTA: Esta consulta fue generada sin IA debido a limitaciones técnicas.
-- Para mejores resultados, use el toggle "Generador Rápido" o reinicie la aplicación.`;
}

// Nueva función de fallback para análisis de dashboards
function generateFallbackDashboardAnalysis(
  question: string, 
  dashboardData: Record<string, unknown> | object | null,
  dashboardType: 'general' | 'sales' | 'custom' = 'general'
): string {
  const lowerQuestion = question.toLowerCase();
  
  console.log('🔄 Generando análisis de dashboard con IA local simplificada...');
  
  try {
    // Extraer métricas relevantes del dashboard
    const data = dashboardData as Record<string, unknown>;
    
    if (dashboardType === 'general') {
      // Análisis para dashboard general
      if (lowerQuestion.includes('tendencia') && lowerQuestion.includes('ingreso')) {
        const mainStats = data?.mainStats as Record<string, unknown>;
        const incomeChart = data?.incomeChart as Record<string, unknown>;
        const dailyRevenue = mainStats?.dailyRevenue as Record<string, unknown>;
        
        return `Basándome en los datos actuales del dashboard general, puedo observar lo siguiente sobre la tendencia de ingresos:

**Estadísticas Principales:**
- Ingresos diarios: ${dailyRevenue?.value || 'N/A'}
- Tendencia: ${dailyRevenue?.trend || 'Sin datos de tendencia'}

**Análisis de la Tendencia:**
${incomeChart?.dataPoints ? 
  `Los datos muestran ${(incomeChart.dataPoints as unknown[]).length} puntos de información en el período seleccionado. ` : 
  'No hay datos suficientes del gráfico de ingresos. '
}

La información disponible sugiere ${dailyRevenue?.trendDirection === 'up' ? 'una tendencia positiva' : dailyRevenue?.trendDirection === 'down' ? 'una tendencia descendente' : 'estabilidad'} en los ingresos.

**Recomendación:** Para un análisis más detallado, considere revisar los datos del período específico y comparar con meses anteriores.`;
      }
      
      if (lowerQuestion.includes('pacientes') || lowerQuestion.includes('atendidos')) {
        const mainStats = data?.mainStats as Record<string, unknown>;
        const patientsAttended = mainStats?.patientsAttended as Record<string, unknown>;
        
        return `Según los datos actuales del dashboard:

**Pacientes Atendidos:**
- Total actual: ${patientsAttended?.value || 'N/A'}
- Tendencia: ${patientsAttended?.trend || 'Sin datos'}

Esta información refleja la actividad de atención médica en el período seleccionado del dashboard.`;
      }
    } else if (dashboardType === 'sales') {
      // Análisis para dashboard de ventas
      if (lowerQuestion.includes('venta') || lowerQuestion.includes('ingreso')) {
        const generalStats = data?.generalStats as Record<string, unknown>;
        
        return `Basándome en los datos del dashboard de ventas:

**Resumen de Ventas:**
- Ventas totales: ${generalStats?.totalSales || 'N/A'}
- Ingresos totales: ${generalStats?.formattedTotalRevenue || 'N/A'}
- Ticket promedio: S/. ${generalStats?.averageSalePerInvoice || 'N/A'}

**Distribución:**
- Ingresos por atenciones médicas: ${generalStats?.formattedAttentionRevenue || 'N/A'}
- Ingresos por farmacia: ${generalStats?.formattedPharmacyRevenue || 'N/A'}

La información muestra el rendimiento comercial en el período seleccionado.`;
      }
      
      if (lowerQuestion.includes('farmacia') || lowerQuestion.includes('producto')) {
        const topPharmacyProducts = data?.topPharmacyProducts as unknown[];
        
        return `Análisis de productos de farmacia:

**Top Productos:**
${topPharmacyProducts && topPharmacyProducts.length > 0 ? 
  `Se identificaron ${topPharmacyProducts.length} productos principales en el período analizado. Los datos incluyen información sobre ventas, cantidades y porcentajes de participación.` :
  'No se encontraron datos específicos de productos de farmacia en el período seleccionado.'
}

**Recomendación:** Revise el top de productos para identificar los de mayor rotación y optimizar el inventario.`;
      }
    }
    
    // Respuesta genérica pero útil
    return `He analizado los datos disponibles del dashboard ${dashboardType === 'general' ? 'general' : 'de ventas'} para responder tu pregunta sobre "${question}".

**Datos Disponibles:**
Los datos del dashboard incluyen múltiples métricas y estadísticas del período seleccionado.

**Análisis:**
Con base en la información actual, puedo observar que el dashboard contiene datos estructurados que reflejan el rendimiento del período analizado.

**Sugerencia:** Para obtener respuestas más específicas, podrías reformular tu pregunta incluyendo métricas específicas como "ingresos", "tendencias", "pacientes", "ventas" o "comparaciones".`;
    
  } catch (error) {
    console.error('Error en análisis de fallback:', error);
    return `Lo siento, tuve dificultades para analizar los datos del dashboard para tu pregunta: "${question}".

**Estado:** Los datos están disponibles pero requieren procesamiento adicional.

**Sugerencia:** Intenta hacer una pregunta más específica o usa el servicio de Claude para obtener un análisis más detallado.`;
  }
} 
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Send, Download, 
  AlertTriangle, CheckCircle, Loader, MessageSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ToastAlerts from '../../components/UI/ToastAlerts';
import { AIOrchestrator, type OrchestratorStatus, type ExecutionResult } from './AIOrchestrator';
import './styles.css';

// ============================================================================
// INTERFACES DEL COMPONENTE V2
// ============================================================================

interface ChartData {
  labels: string[];
  values: number[];
  maxValue: number;
  labelColumn: string;
  valueColumn: string;
  percentageColumn?: string;
  realPercentages?: number[] | null;
  series?: Array<{
    name: string;
    data: number[];
    color?: string;
  }>;
  isGrouped?: boolean;
  groupingColumn?: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL ANALISIS V2
// ============================================================================

const AnalisisV2: React.FC = () => {
  // ========================================================================
  // ESTADO DEL COMPONENTE
  // ========================================================================
  const [userQuestion, setUserQuestion] = useState('');
  const [orchestratorStatus, setOrchestratorStatus] = useState<OrchestratorStatus>({
    stage: 'analyzing',
    message: 'Listo para analizar',
    progress: 0,
    attempt: 0
  });
  const [queryResults, setQueryResults] = useState<Record<string, unknown>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);

  // ========================================================================
  // INICIALIZACIÓN DEL ORQUESTADOR
  // ========================================================================
  const orchestrator = AIOrchestrator.getInstance();

  // Suscribirse a cambios de estado del orquestador
  useEffect(() => {
    const handleStatusChange = (status: OrchestratorStatus) => {
      setOrchestratorStatus(status);
      // SQL se mantiene oculto para usuarios no técnicos
    };

    orchestrator.onStatusChange(handleStatusChange);

    return () => {
      orchestrator.removeStatusCallback(handleStatusChange);
    };
  }, [orchestrator]);

  // ========================================================================
  // MANEJO DE CONSULTAS
  // ========================================================================

  const handleQuerySubmit = async () => {
    if (!userQuestion.trim()) {
      ToastAlerts.error({
        title: "Pregunta requerida",
        message: "Por favor escribe tu pregunta antes de continuar"
      });
      return;
    }

    setIsProcessing(true);
    setShowResults(false);
    setShowChart(false);
    setQueryResults([]);

    try {
      console.log('🚀 Enviando consulta al orquestador:', userQuestion);
      
      const result: ExecutionResult = await orchestrator.processUserQuery(userQuestion);
      
      if (result.success && result.data) {
        setQueryResults(result.data);
        setShowResults(true);
        
        // Auto-generar gráfico si los datos son apropiados
        setTimeout(() => {
          if (result.data) {
            generateChartFromResults(result.data);
          }
        }, 1000);
        
        ToastAlerts.success({
          title: "¡Consulta completada!",
          message: `Se obtuvieron ${result.rowCount} filas en ${result.executionTime}ms`
        });
      } else {
        ToastAlerts.error({
          title: "Error en la consulta",
          message: result.error || "Error desconocido"
        });
      }
    } catch (error) {
      console.error('❌ Error en consulta:', error);
      ToastAlerts.error({
        title: "Error procesando consulta",
        message: error instanceof Error ? error.message : "Error desconocido"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ========================================================================
  // GENERACIÓN AUTOMÁTICA DE GRÁFICOS
  // ========================================================================

  const generateChartFromResults = (data: Record<string, unknown>[]) => {
    if (!data || data.length === 0 || !data[0]) return;

    // Detectar columnas numéricas y de texto
    const columns = Object.keys(data[0]);
    const textColumn = columns.find(col => 
      typeof data[0][col] === 'string' && 
      data.every(row => typeof row[col] === 'string')
    );
    const numericColumn = columns.find(col => 
      typeof data[0][col] === 'number' || 
      data.every(row => {
        const val = row[col];
        return val !== null && val !== undefined && val !== '' && !isNaN(Number(val));
      })
    );

    if (textColumn && numericColumn) {
      // CALCULAR PORCENTAJES AUTOMÁTICAMENTE EN LA APLICACIÓN
      const values = data.map(row => Number(row[numericColumn]) || 0);
      const total = values.reduce((sum, val) => sum + val, 0);
      const percentages = total > 0 ? values.map(val => (val / total) * 100) : values.map(() => 0);
      
      const chartConfig: ChartData = {
        labels: data.map(row => String(row[textColumn] || 'Sin datos')),
        values: values,
        maxValue: Math.max(...values),
        labelColumn: textColumn,
        valueColumn: numericColumn,
        realPercentages: percentages // Porcentajes calculados automáticamente
      };

      setChartData(chartConfig);
      setShowChart(true);
    }
  };

  // ========================================================================
  // MANEJO DE ENTRADA
  // ========================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserQuestion(e.target.value);
    
    // Auto-resize del textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuerySubmit();
    }
  };

  // ========================================================================
  // EXPORTACIÓN DE RESULTADOS
  // ========================================================================

  const exportToExcel = useCallback(() => {
    if (queryResults.length === 0) return;

    try {
      const worksheet = XLSX.utils.json_to_sheet(queryResults);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');
      
      const fileName = `analisis_bi_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      ToastAlerts.success({
        title: "Exportación exitosa",
        message: `Archivo ${fileName} descargado`
      });
    } catch {
      ToastAlerts.error({
        title: "Error al exportar",
        message: "No se pudo generar el archivo Excel"
      });
    }
  }, [queryResults]);

  // ========================================================================
  // RENDERIZADO DE ESTADO DEL ORQUESTADOR
  // ========================================================================

  const renderOrchestratorStatus = () => {
    const getStatusIcon = () => {
      switch (orchestratorStatus.stage) {
        case 'analyzing':
        case 'building_context':
        case 'generating_sql':
        case 'executing':
        case 'correcting':
          return <Loader className="w-5 h-5 animate-spin text-blue-500" />;
        case 'completed':
          return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'failed':
          return <AlertTriangle className="w-5 h-5 text-red-500" />;
        default:
          return <Bot className="w-5 h-5 text-gray-500" />;
      }
    };

    const getStatusColor = () => {
      switch (orchestratorStatus.stage) {
        case 'completed':
          return 'bg-green-50 border-green-200 text-green-800';
        case 'failed':
          return 'bg-red-50 border-red-200 text-red-800';
        default:
          return 'bg-blue-50 border-blue-200 text-blue-800';
      }
    };

    return (
      <div className={`rounded-lg p-4 border ${getStatusColor()}`}>
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="font-medium">{orchestratorStatus.message}</div>
            {orchestratorStatus.attempt > 0 && (
              <div className="text-sm opacity-75">
                Intento {orchestratorStatus.attempt} • Etapa: {orchestratorStatus.stage}
              </div>
            )}
          </div>
          {orchestratorStatus.progress > 0 && (
            <div className="text-sm font-mono">
              {orchestratorStatus.progress}%
            </div>
          )}
        </div>
        
        {/* Barra de progreso */}
        {isProcessing && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${orchestratorStatus.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // ========================================================================
  // RENDERIZADO DE RESULTADOS EN TABLA
  // ========================================================================

  const renderResultsTable = () => {
    if (queryResults.length === 0 || !queryResults[0]) return null;

    const columns = Object.keys(queryResults[0]);
    
    // Detectar si necesitamos agregar columna de porcentajes
    const numericColumn = columns.find(col => 
      typeof queryResults[0][col] === 'number' || 
      queryResults.every(row => {
        const val = row[col];
        return val !== null && val !== undefined && val !== '' && !isNaN(Number(val));
      })
    );
    const textColumn = columns.find(col => 
      typeof queryResults[0][col] === 'string' && 
      queryResults.every(row => typeof row[col] === 'string')
    );
    
    // Calcular porcentajes si hay datos numéricos
    let percentages: number[] = [];
    const shouldShowPercentages = numericColumn && textColumn && 
      (userQuestion.toLowerCase().includes('porcentaje') || 
       userQuestion.toLowerCase().includes('top') ||
       userQuestion.toLowerCase().includes('frecuent'));
    
    if (shouldShowPercentages) {
      const values = queryResults.map(row => Number(row[numericColumn]) || 0);
      const total = values.reduce((sum, val) => sum + val, 0);
      percentages = total > 0 ? values.map(val => (val / total) * 100) : values.map(() => 0);
    }
    
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Resultados ({queryResults.length} filas)
            {shouldShowPercentages && (
              <span className="ml-2 text-sm text-blue-600 font-normal">
                • Porcentajes calculados automáticamente
              </span>
            )}
          </h3>
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
        
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column}
                  </th>
                ))}
                {shouldShowPercentages && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentaje
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {queryResults.map((row, index) => (
                <tr key={`result-row-${index}-${JSON.stringify(row).slice(0, 50)}`} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCellValue(row[column])}
                    </td>
                  ))}
                  {shouldShowPercentages && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {percentages[index]?.toFixed(1)}%
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ========================================================================
  // RENDERIZADO DE GRÁFICOS AVANZADOS
  // ========================================================================

  const renderChart = () => {
    if (!chartData || !showChart) return null;

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">📊 Visualización Inteligente</h3>
          <button
            onClick={() => setShowChart(false)}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6">
          {chartData.series && chartData.series.length > 0 ? 
            renderClusteredBarChart(chartData) : 
            renderBarChart(chartData)
          }
        </div>
      </div>
    );
  };

  // GRÁFICO DE BARRAS AGRUPADAS AVANZADO
  const renderClusteredBarChart = (chartData: ChartData) => {
    if (!chartData.series || chartData.series.length === 0) {
      return renderBarChart(chartData);
    }

    const maxValue = Math.max(...chartData.series.flatMap(s => s.data));

    return (
      <div className="space-y-6">
        {/* Información del gráfico agrupado moderna */}
        <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-800">
                  Análisis Multidimensional
                </h4>
                <p className="text-sm text-gray-600">
                  Comparación de múltiples métricas por período
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-indigo-600">
                {chartData.series.length}
              </div>
              <div className="text-xs text-gray-500">
                métricas
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-700">Períodos Analizados</span>
              </div>
              <div className="text-2xl font-bold text-indigo-600">
                {chartData.labels.length}
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-700">Métricas Comparadas</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {chartData.series.length}
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-semibold text-gray-700">Valor Máximo</span>
              </div>
              <div className="text-lg font-bold text-blue-600">
                {maxValue > 999999 ? `${(maxValue/1000000).toFixed(1)}M` : 
                 maxValue > 999 ? `${(maxValue/1000).toFixed(1)}k` : 
                 maxValue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Leyenda de series moderna */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
          <h5 className="text-lg font-bold text-gray-800 mb-4 text-center">
            Métricas Analizadas
          </h5>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {chartData.series?.map((serie, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: serie.color }}
                  />
                  <span className="text-sm font-bold text-gray-800">
                    {serie.name}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Total: {serie.data.reduce((sum, val) => sum + val, 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
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
                  <h4 className="text-lg font-bold text-gray-800">
                    {label}
                  </h4>
                </div>
                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  Total: {chartData.series?.reduce((sum, serie) => sum + (serie.data[labelIndex] || 0), 0).toLocaleString()}
                </div>
              </div>
              
              {/* Grupo de barras con diseño moderno */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="flex items-end justify-center space-x-4 h-32">
                  {chartData.series?.map((serie, serieIndex) => {
                    const value = serie.data[labelIndex] || 0;
                    const barHeight = maxValue > 0 ? Math.max((value / maxValue) * 120, value > 0 ? 8 : 0) : 0;
                    
                    return (
                      <div 
                        key={serieIndex}
                        className="flex flex-col items-center flex-1 max-w-20"
                      >
                        {/* Valor encima de la barra */}
                        <div className="mb-2 text-center">
                          <div className="text-sm font-bold text-gray-800">
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
                        
                        {/* Nombre de la serie */}
                        <div className="mt-2 text-xs text-gray-600 text-center truncate w-full">
                          {serie.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // GRÁFICO DE BARRAS SIMPLES AVANZADO
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
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700 truncate max-w-xs">
                  {label}
                </span>
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-indigo-600">
                    {value.toLocaleString()}
                  </span>
                  {chartData.realPercentages && (
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {displayPercentage.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
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

  // ========================================================================
  // HELPER PARA FORMATEAR VALORES
  // ========================================================================

  const formatCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number') {
      // Formatear números con separadores de miles
      if (value % 1 !== 0) {
        // Número decimal - mostrar con 2 decimales y separadores de miles
        return value.toLocaleString('es-ES', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        });
      } else {
        // Número entero - mostrar con separadores de miles
        return value.toLocaleString('es-ES');
      }
    }
    if (typeof value === 'string') {
      // Verificar si es un string que representa un número
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue) && isFinite(numericValue) && value.trim() !== '') {
        // Es un número en formato string - formatearlo con separadores
        if (numericValue % 1 !== 0) {
          return numericValue.toLocaleString('es-ES', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
          });
        } else {
          return numericValue.toLocaleString('es-ES');
        }
      }
      
      // Formatear fechas
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
  };

  // ========================================================================
  // RENDER PRINCIPAL
  // ========================================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white rounded-xl shadow-xl p-8"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 p-4 rounded-xl">
              <Bot className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">BI Inteligente v2.0</h1>
              <p className="text-blue-100 text-lg">
                Sistema autónomo de análisis - Solo haz tu pregunta y obtén resultados automáticamente
              </p>
              <div className="mt-3 flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-400 shadow-lg animate-pulse"></div>
                <span className="text-sm font-medium">IA Local + Anthropic Claude</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Input de Consulta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <div className="flex items-start space-x-4">
            <MessageSquare className="w-6 h-6 text-blue-500 mt-1" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Haz tu pregunta de análisis de datos
              </label>
              <textarea
                value={userQuestion}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Ejemplo: ¿Cuáles son los diagnósticos más frecuentes en los últimos 3 meses?"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[80px]"
                disabled={isProcessing}
              />
              <div className="mt-3 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Presiona Enter para enviar • Shift+Enter para nueva línea
                </div>
                <button
                  onClick={handleQuerySubmit}
                  disabled={isProcessing || !userQuestion.trim()}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>{isProcessing ? 'Procesando...' : 'Analizar'}</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Estado del Orquestador */}
        <AnimatePresence>
          {(isProcessing || orchestratorStatus.stage !== 'analyzing') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {renderOrchestratorStatus()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* SQL Generado - OCULTO para usuarios no técnicos */}
        {/* <AnimatePresence>
          {currentSQL && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm overflow-x-auto"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">SQL Generado:</span>
                <button
                  onClick={() => navigator.clipboard.writeText(currentSQL)}
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >
                  Copiar
                </button>
              </div>
              <pre className="whitespace-pre-wrap">{currentSQL}</pre>
            </motion.div>
          )}
        </AnimatePresence> */}

        {/* Resultados */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {renderResultsTable()}
              {renderChart()}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default AnalisisV2; 
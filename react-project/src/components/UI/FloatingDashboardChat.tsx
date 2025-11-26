import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, Bot, Minimize2, 
  Maximize2, Copy, RefreshCw 
} from 'lucide-react';
import { AnthropicService } from '../../services/AnthropicService';
import { useLocalAI } from '../../hooks/useLocalAI';
import { ServicesDashboardData } from '../../services/DashboardService';
import ToastAlerts from './ToastAlerts';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface DashboardChatProps {
  dashboardData: Record<string, unknown> | object | null; // Datos específicos del dashboard (más flexible)
  dashboardType: 'general' | 'sales' | 'custom'; // Tipo de dashboard para contexto
  dashboardTitle: string; // Título del dashboard para el contexto
  className?: string;
  disabled?: boolean;
}

// Función para crear resumen de servicios médicos
const createServicesSummary = (serviciosData: ServicesDashboardData[]): string => {
  if (!serviciosData || serviciosData.length === 0) {
    return `
DATOS DEL DASHBOARD "Dashboard de Servicios Médicos":
No hay datos de servicios disponibles.`;
  }

  // Estadísticas básicas
  const totalServicios = serviciosData.length;
  const pacientesUnicos = new Set(serviciosData.map(item => item.comprobante.trim())).size;
  const medicosActivos = new Set(serviciosData.map(item => item.medicoTratante)).size;
  const especialidadesActivas = new Set(serviciosData.map(item => item.especialidadMedica)).size;
  const consultoriosActivos = new Set(serviciosData.filter(item => item.consultorioNombre !== 'SIN CONSULTORIO').map(item => item.consultorioNombre)).size;
  const protocolosUtilizados = new Set(serviciosData.map(item => item.protocoloNombre)).size;
  const edadPromedio = Math.round(serviciosData.reduce((sum, item) => sum + item.edad, 0) / serviciosData.length);
  const conDiagnostico = serviciosData.filter(item => item.estadoDiagnostico !== 'Sin_Dx').length;
  const tasaDiagnostico = Math.round((conDiagnostico / totalServicios) * 100);

  // Top especialidades (máximo 10)
  const especialidadesCounts = serviciosData.reduce((acc, item) => {
    acc[item.especialidadMedica] = (acc[item.especialidadMedica] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topEspecialidades = Object.entries(especialidadesCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `${name}: ${count} servicios`);

  // Top médicos (máximo 10)
  const medicosCounts = serviciosData.reduce((acc, item) => {
    acc[item.medicoTratante] = (acc[item.medicoTratante] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topMedicos = Object.entries(medicosCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `${name}: ${count} servicios`);

  // Distribución por sexo
  const sexoCounts = serviciosData.reduce((acc, item) => {
    acc[item.sexo] = (acc[item.sexo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Grupos etarios
  const gruposEtarios = serviciosData.reduce((acc, item) => {
    let grupo = '';
    if (item.edad <= 12) grupo = 'Niños (0-12)';
    else if (item.edad <= 18) grupo = 'Adolescentes (13-18)';
    else if (item.edad <= 30) grupo = 'Jóvenes (19-30)';
    else if (item.edad <= 45) grupo = 'Adultos (31-45)';
    else if (item.edad <= 60) grupo = 'Adultos Maduros (46-60)';
    else grupo = 'Adultos Mayores (60+)';
    
    acc[grupo] = (acc[grupo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return `
RESUMEN INTELIGENTE DEL DASHBOARD "Dashboard de Servicios Médicos":

=== ESTADÍSTICAS PRINCIPALES ===
• Total de Servicios: ${totalServicios.toLocaleString()}
• Pacientes Únicos: ${pacientesUnicos.toLocaleString()}
• Médicos Activos: ${medicosActivos}
• Especialidades Activas: ${especialidadesActivas}
• Consultorios Activos: ${consultoriosActivos}
• Protocolos Utilizados: ${protocolosUtilizados}
• Edad Promedio: ${edadPromedio} años
• Tasa de Diagnóstico: ${tasaDiagnostico}%

=== TOP ESPECIALIDADES MÉDICAS ===
${topEspecialidades.join('\n')}

=== TOP MÉDICOS POR SERVICIOS ===
${topMedicos.join('\n')}

=== DISTRIBUCIÓN POR SEXO ===
${Object.entries(sexoCounts).map(([sexo, count]) => `${sexo}: ${count} (${Math.round((count/totalServicios)*100)}%)`).join('\n')}

=== DISTRIBUCIÓN POR GRUPOS ETARIOS ===
${Object.entries(gruposEtarios).map(([grupo, count]) => `${grupo}: ${count} (${Math.round((count/totalServicios)*100)}%)`).join('\n')}

IMPORTANTE: Este es un resumen inteligente de ${totalServicios} servicios médicos. Los datos están agregados y resumidos para análisis eficiente.`;
};

// Función para crear resumen general de cualquier dashboard
const createGeneralSummary = (data: Record<string, unknown> | object): string => {
  try {
    const dataStr = JSON.stringify(data);
    const preview = dataStr.substring(0, 1000);
    
    return `
RESUMEN DEL DASHBOARD:
Los datos son muy extensos para mostrar completos. 

VISTA PREVIA DE LA ESTRUCTURA:
${preview}...

INFORMACIÓN ADICIONAL:
- Tamaño total de datos: ${dataStr.length} caracteres
- Tipo de datos: ${Array.isArray(data) ? 'Array' : typeof data}
- Elementos: ${Array.isArray(data) ? data.length : 'N/A'}

IMPORTANTE: Los datos completos están disponibles para análisis, pero se muestra solo un resumen por límites de procesamiento.`;
  } catch (err) {
    return `
RESUMEN DEL DASHBOARD:
Error al procesar los datos para resumen.
Tipo de datos: ${typeof data}
Error: ${err instanceof Error ? err.message : 'Error desconocido'}`;
  }
};

const FloatingDashboardChat: React.FC<DashboardChatProps> = ({
  dashboardData,
  dashboardType,
  dashboardTitle,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [enableLocalAI, setEnableLocalAI] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Servicios de IA
  const anthropicService = AnthropicService.getInstance();
  const isAIAvailable = anthropicService.isClientReady();
  const { generateDashboardAnalysis, isAvailable: isLocalAIAvailable } = useLocalAI();

  // Auto-scroll al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Crear prompt específico para el dashboard
  const createDashboardPrompt = (userQuestion: string): string => {
    let dataContext = '';
    
    try {
      // Crear un resumen estructurado de los datos del dashboard
      if (dashboardData) {
        // Para dashboard de servicios médicos, crear un resumen inteligente
        if (dashboardType === 'custom' && Array.isArray(dashboardData)) {
          const serviciosData = dashboardData as ServicesDashboardData[];
          dataContext = createServicesSummary(serviciosData);
        } else {
          // Para otros dashboards (financiero, etc.) usar JSON directo
          const jsonString = JSON.stringify(dashboardData, null, 2);
          // Si es muy largo (>50k caracteres), crear resumen
          if (jsonString.length > 50000) {
            dataContext = createGeneralSummary(dashboardData);
          } else {
            dataContext = `
DATOS DEL DASHBOARD "${dashboardTitle}":

${jsonString}

IMPORTANTE: Los datos anteriores son TODA la información disponible sobre este dashboard.`;
          }
        }
      }
    } catch (err) {
      dataContext = `
DATOS DEL DASHBOARD "${dashboardTitle}":
Error al procesar los datos. Dashboard disponible pero datos no accesibles en formato JSON.
Mensaje de error: ${err instanceof Error ? err.message : 'Error desconocido'}
`;
    }

    const dashboardContext = {
      general: `
CONTEXTO: Este es un Dashboard General de una clínica médica que muestra:
- Estadísticas principales (pacientes atendidos, ingresos diarios, citas pendientes, tasa de ocupación)
- Tendencias de ingresos por período
- Distribución por servicios médicos
- Ranking de especialidades médicas
- Transacciones recientes
- Rangos de fechas y filtros temporales`,
      
      sales: `
CONTEXTO: Este es un Dashboard de Ventas/Operaciones de una clínica médica que muestra:
- Estadísticas de ventas y operaciones
- Productos farmacéuticos más vendidos
- Análisis de rangos de precios
- Tendencias de ventas diarias
- Comparativa médica vs farmacia
- Tipos de documentos de venta
- Transacciones y operaciones recientes`,
      
      custom: `
CONTEXTO: Este es un Dashboard personalizado que muestra datos específicos del sistema médico.`
    };

    return `Eres un analista experto de dashboards médicos especializado en interpretar datos de clínicas y hospitales.

${dashboardContext[dashboardType]}

${dataContext}

INSTRUCCIONES CRÍTICAS:
1. **SOLO RESPONDE BASÁNDOTE EN LOS DATOS PROPORCIONADOS ARRIBA**
2. **NO INVENTES, NO ASUMAS, NO USES CONOCIMIENTO EXTERNO**
3. Si no tienes la información específica en los datos, di claramente "No tengo esa información en los datos actuales del dashboard"
4. Responde en español de manera conversacional y profesional
5. Usa los números exactos de los datos cuando sea relevante
6. Puedes hacer cálculos simples con los datos disponibles
7. Si hay fechas/períodos en los datos, refiérelos correctamente
8. Mantén las respuestas concisas pero informativas

PREGUNTA DEL USUARIO: "${userQuestion}"

Responde únicamente basándote en los datos del dashboard proporcionados. Si la pregunta no se puede responder con esos datos, explica qué información específica falta.`;
  };

  // Función para enviar mensaje
  const sendMessage = async () => {
    if (!currentMessage.trim() || isAITyping || disabled) {
      return;
    }

    if (!dashboardData) {
      ToastAlerts.error({
        title: "Sin datos",
        message: "No hay datos del dashboard disponibles para consultar"
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const questionToProcess = currentMessage;
    setCurrentMessage('');
    setIsAITyping(true);

    try {
      const prompt = createDashboardPrompt(questionToProcess);
      let aiResponse = '';

      if (enableLocalAI && isLocalAIAvailable) {
        // Usar IA local específica para análisis de dashboard
        aiResponse = await generateDashboardAnalysis(
          questionToProcess,
          dashboardData,
          dashboardType,
          { useLocalAI: true }
        );
      } else if (isAIAvailable) {
        // Usar Claude (Anthropic) - opción principal
        aiResponse = await anthropicService.sendMessage(prompt, {
          max_tokens: 800,
          temperature: 0.3, // Baja temperatura para respuestas más precisas y enfocadas
          system: `Eres un analista experto de dashboards médicos. Responde únicamente basándote en los datos proporcionados del dashboard "${dashboardTitle}". No uses conocimiento externo.`
        });
      } else {
        throw new Error('No hay servicios de IA disponibles');
      }

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      ToastAlerts.success({
        title: "Respuesta generada",
        message: enableLocalAI ? "Respondido por IA local" : "Respondido por Claude"
      });

    } catch (error) {
      console.error('Error en chat del dashboard:', error);
      
      const errorMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: `Lo siento, hubo un error al procesar tu pregunta. Error: ${error instanceof Error ? error.message : 'Error desconocido'}. Por favor, inténtalo nuevamente.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);

      ToastAlerts.error({
        title: "Error en el chat",
        message: error instanceof Error ? error.message : "Error desconocido al procesar la pregunta"
      });
    } finally {
      setIsAITyping(false);
    }
  };

  // Función para limpiar chat
  const clearChat = () => {
    setMessages([]);
    ToastAlerts.success({
      title: "Chat limpiado",
      message: "El historial de conversación ha sido eliminado"
    });
  };

  // Función para copiar respuesta
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    ToastAlerts.success({
      title: "Copiado",
      message: "Respuesta copiada al portapapeles"
    });
  };

  // Manejar Enter en textarea
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentMessage(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120; // 5 líneas aprox
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
  };

  if (disabled) {
    return null;
  }

  return (
    <>
      {/* Botón flotante para abrir el chat */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-primary to-blue-600 hover:from-primary-dark hover:to-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center z-40 transition-all duration-300 ${className}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={`Chat con IA - ${dashboardTitle}`}
          >
            <MessageCircle className="w-6 h-6" />
            {/* Indicador de disponibilidad */}
            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${
              isAIAvailable || isLocalAIAvailable ? 'bg-green-400' : 'bg-red-400'
            } border-2 border-white`}></div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Ventana del chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              width: isMinimized ? '320px' : '400px',
              height: isMinimized ? '60px' : '600px'
            }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className={`fixed bottom-6 right-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col overflow-hidden ${className}`}
          >
            {/* Header del chat */}
            <div className="bg-gradient-to-r from-primary to-blue-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Chat IA - {dashboardTitle}</h3>
                  <p className="text-xs text-blue-100">
                    {enableLocalAI ? 'IA Local' : 'Claude'} • {isAIAvailable || isLocalAIAvailable ? 'Conectado' : 'Desconectado'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Toggle IA */}
                <motion.button
                  onClick={() => setEnableLocalAI(!enableLocalAI)}
                  className={`w-6 h-3 rounded-full transition-colors duration-300 ${
                    enableLocalAI ? 'bg-blue-300' : 'bg-white bg-opacity-30'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  title={enableLocalAI ? 'Cambiar a Claude' : 'Cambiar a IA Local'}
                >
                  <motion.div
                    className="w-3 h-3 bg-white rounded-full shadow"
                    animate={{ x: enableLocalAI ? 12 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </motion.button>

                {/* Limpiar chat */}
                <motion.button
                  onClick={clearChat}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Limpiar chat"
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.button>

                {/* Minimizar/Maximizar */}
                <motion.button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={isMinimized ? 'Maximizar' : 'Minimizar'}
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </motion.button>

                {/* Cerrar */}
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Cerrar chat"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Contenido del chat */}
            {!isMinimized && (
              <>
                {/* Área de mensajes */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center"
                      >
                        <Bot className="w-6 h-6 text-white" />
                      </motion.div>
                      <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                        ¡Hola! Pregúntame sobre este dashboard
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs mx-auto">
                        Puedo ayudarte a analizar los datos, encontrar tendencias o responder preguntas específicas sobre la información mostrada.
                      </p>
                    </div>
                  ) : (
                    messages.map(message => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs rounded-2xl px-4 py-3 ${
                          message.type === 'user'
                            ? 'bg-gradient-to-r from-primary to-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-md border border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="flex items-start space-x-2">
                            {message.type === 'ai' && (
                              <Bot className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                              {message.type === 'ai' && (
                                <motion.button
                                  onClick={() => copyMessage(message.content)}
                                  className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center space-x-1"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar</span>
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}

                  {/* Indicador de "IA escribiendo" */}
                  {isAITyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-md border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2">
                          <Bot className="w-4 h-4 text-primary" />
                          <div className="flex space-x-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-2 h-2 bg-primary rounded-full"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  delay: i * 0.2
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {enableLocalAI ? 'IA Local' : 'Claude'} analizando...
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input de mensaje */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <div className="flex space-x-3">
                    <textarea
                      ref={inputRef}
                      value={currentMessage}
                      onChange={handleTextareaChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Pregunta sobre los datos del dashboard..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white resize-none text-sm"
                      style={{ minHeight: '40px', maxHeight: '120px' }}
                      disabled={isAITyping}
                    />
                    <motion.button
                      onClick={sendMessage}
                      disabled={!currentMessage.trim() || isAITyping}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:from-primary-dark hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Send className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingDashboardChat; 
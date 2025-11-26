import React, { useState } from 'react';
import { AnthropicService } from '../services/AnthropicService';

/**
 * Componente de prueba para verificar la conectividad con Anthropic Claude
 */
export const AnthropicTest: React.FC = () => {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serviceStatus, setServiceStatus] = useState<string>('');

  // Obtener la instancia del servicio
  const anthropicService = AnthropicService.getInstance();

  // Verificar el estado del servicio al cargar
  React.useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = () => {
    const isReady = anthropicService.isClientReady();
    const error = anthropicService.getInitializationError();
    const modelInfo = anthropicService.getModelInfo();
    
    if (isReady) {
      setServiceStatus(`✅ Conectado - Modelo: ${modelInfo.model}`);
    } else {
      setServiceStatus(`❌ Error: ${error || 'Desconocido'}`);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      setError('Por favor ingresa un mensaje');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const aiResponse = await anthropicService.sendMessage(message.trim(), {
        max_tokens: 500,
        temperature: 0.7
      });
      
      setResponse(aiResponse);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setError('');
    setResponse('');

    try {
      const testResponse = await anthropicService.sendMessage(
        'Hola, por favor responde con una frase corta confirmando que puedes comunicarte en español.',
        { max_tokens: 100, temperature: 0.1 }
      );
      
      setResponse(`Prueba de conexión exitosa: ${testResponse}`);
      checkServiceStatus();
    } catch (error) {
      console.error('Error en prueba de conexión:', error);
      setError(error instanceof Error ? error.message : 'Error en la prueba de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Prueba de Anthropic Claude
      </h2>
      
      {/* Estado del servicio */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <p className="text-sm font-medium">Estado del servicio:</p>
        <p className="text-sm">{serviceStatus}</p>
      </div>

      {/* Botón de prueba de conexión */}
      <div className="mb-4">
        <button
          onClick={handleTestConnection}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Probando...' : 'Probar Conexión'}
        </button>
      </div>

      {/* Área de entrada de mensaje */}
      <div className="mb-4">
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
          Mensaje para Claude:
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe tu mensaje aquí..."
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          disabled={loading}
        />
      </div>

      {/* Botón de envío */}
      <div className="mb-4">
        <button
          onClick={handleSendMessage}
          disabled={loading || !message.trim()}
          className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enviando...' : 'Enviar Mensaje'}
        </button>
      </div>

      {/* Área de respuesta */}
      {response && (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Respuesta de Claude:</h3>
          <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded-md">
            <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
          </div>
        </div>
      )}

      {/* Área de error */}
      {error && (
        <div className="mb-4">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error:</h3>
          <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Información del modelo */}
      <div className="mt-6 p-3 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-800 mb-2">Información del modelo:</h4>
        <pre className="text-xs text-gray-600">
          {JSON.stringify(anthropicService.getModelInfo(), null, 2)}
        </pre>
      </div>
    </div>
  );
}; 
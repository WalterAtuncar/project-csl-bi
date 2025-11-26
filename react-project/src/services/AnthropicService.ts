import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from './config';
import { CryptoService } from './CryptoService';
import { 
  AnthropicApiOptions, 
  AnthropicModelType, 
  AnthropicAttachment
} from '../types/anthropic';

/**
 * Servicio para interactuar con la API de Anthropic Claude
 * Implementa un cliente con autenticación y métodos para enviar mensajes
 */
export class AnthropicService {
  private static instance: AnthropicService;
  private client: Anthropic | null = null;
  private cryptoService: CryptoService;
  private apiKey: string = '';
  private initError: string | null = null;
  private readonly config = getConfig();

  /**
   * Constructor privado para implementar patrón Singleton
   */
  private constructor() {
    this.config = getConfig();
    this.cryptoService = CryptoService.getInstance();
    this.client = null;
    this.initError = null;
    
    // Dejar que la inicialización se complete antes de continuar
    try {
      this.initClient();
    } catch (error) {
      console.error('Error crítico en constructor de AnthropicService:', error);
      this.initError = error instanceof Error ? error.message : 'Error desconocido';
    }
  }

  /**
   * Obtener la instancia única del servicio
   * @returns Instancia de AnthropicService
   */
  public static getInstance(): AnthropicService {
    if (!AnthropicService.instance) {
      AnthropicService.instance = new AnthropicService();
    }
    return AnthropicService.instance;
  }

  /**
   * Inicializa el cliente de Anthropic con la clave API desencriptada
   */
  private initClient(): void {
    try {
      // Verificar configuración
      if (!this.config.ai?.anthropic?.apiKey) {
        const errorMsg = 'API Key de Anthropic no configurada en config.ts';
        throw new Error(errorMsg);
      }

      // Desencriptar la clave API
      const decryptedApiKey = this.cryptoService.decrypt(this.config.ai.anthropic.apiKey);

      // Verificar que la clave tenga el formato correcto
      if (!decryptedApiKey.startsWith('sk-ant-')) {
        const errorMsg = `Formato de API Key inválido. Esperaba que empezara con 'sk-ant-' pero recibió: ${decryptedApiKey.substring(0, 10)}...`;
        throw new Error(errorMsg);
      }

      // Crear el cliente de Anthropic
      this.client = new Anthropic({
        apiKey: decryptedApiKey,
        dangerouslyAllowBrowser: true
      });

      this.initError = null;

    } catch (error) {
      console.error('Error en initClient:', error);
      this.client = null;
      this.initError = error instanceof Error ? error.message : 'Error desconocido en initClient';
      throw error;
    }
  }

  /**
   * Verifica si una cadena está en formato base64
   * @param str Cadena a verificar
   * @returns true si es base64 válido
   */
  private isBase64(str: string): boolean {
    try {
      return btoa(atob(str)) === str;
    } catch {
      return false;
    }
  }

  /**
   * Reintentar la inicialización del cliente
   * @returns true si la inicialización tuvo éxito
   */
  public reinitializeClient(): boolean {
    try {
      this.initClient();
      return this.isClientReady();
    } catch (error) {
      console.error('Error al reinicializar el cliente:', error);
      return false;
    }
  }

  /**
   * Envía un mensaje simple a Anthropic Claude y recibe una respuesta
   * @param prompt Mensaje del usuario
   * @param options Opciones de configuración de la API
   * @returns Respuesta de Claude
   */
  public async sendMessage(prompt: string, options: Partial<AnthropicApiOptions> = {}): Promise<string> {
    if (!this.client) {
      const errorMsg = `El cliente de Anthropic no está inicializado: ${this.initError}`;
      
      if (this.initError) {
        throw new Error(errorMsg);
      } else {
        throw new Error('El cliente de Anthropic no está inicializado');
      }
    }

    try {
      // Configurar valores por defecto desde la configuración
      const model = options.model || this.config.ai.anthropic.defaultModel as AnthropicModelType;
      const maxTokens = options.max_tokens || this.config.ai.anthropic.maxTokens;
      const temperature = options.temperature !== undefined ? options.temperature : this.config.ai.anthropic.temperature;
      const system = options.system || 'Eres un asistente de IA útil y preciso. Respondes siempre en español.';

      console.log(`Enviando mensaje a Anthropic usando modelo: ${model}`);
      
      // Enviar mensaje a la API de Anthropic
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      // Extraer la respuesta del asistente
      const assistantMessage = response.content.find(
        content => content.type === 'text'
      );

      if (assistantMessage && 'text' in assistantMessage) {
        return assistantMessage.text;
      }

      const errorMsg = 'No se recibió respuesta textual del asistente';
      throw new Error(errorMsg);
    } catch (error) {
      console.error('Error al enviar mensaje a Anthropic Claude:', error);
      
      // Si es un error de red, mostrar más detalles
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('Response status:', (error as unknown as { response?: { status?: number } }).response?.status);
        console.error('Response data:', (error as unknown as { response?: { data?: unknown } }).response?.data);
      }
      
      throw new Error(`Error al comunicarse con Anthropic: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Envía un mensaje con archivos adjuntos a Anthropic Claude y recibe una respuesta
   * @param prompt Mensaje del usuario
   * @param attachments Archivos adjuntos (imágenes, PDFs, etc.)
   * @param options Opciones de configuración de la API
   * @returns Respuesta de Claude
   */
  public async sendMessageWithAttachments(
    prompt: string, 
    attachments: AnthropicAttachment[], 
    options: Partial<AnthropicApiOptions> = {}
  ): Promise<string> {
    if (!this.client) {
      if (this.initError) {
        throw new Error(`El cliente de Anthropic no está inicializado: ${this.initError}`);
      } else {
        throw new Error('El cliente de Anthropic no está inicializado');
      }
    }

    try {
      // Configurar valores por defecto desde la configuración
      const model = options.model || this.config.ai.anthropic.defaultModel as AnthropicModelType;
      const maxTokens = options.max_tokens || this.config.ai.anthropic.maxTokens;
      const temperature = options.temperature !== undefined ? options.temperature : this.config.ai.anthropic.temperature;
      const system = options.system || 'Eres un asistente de IA útil y preciso. Respondes siempre en español.';

      // Verificar si el modelo soporta archivos adjuntos
      if (!this.supportsAttachments(model)) {
        throw new Error(`El modelo ${model} no soporta el procesamiento de archivos adjuntos.`);
      }

      console.log(`Enviando mensaje con adjuntos a Anthropic usando modelo: ${model}`);
      
      // Crear contenido compatible con la API de Anthropic
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiCompatibleContents: any[] = [];

      // Primero procesamos los archivos adjuntos
      for (const attachment of attachments) {
        // Si tenemos un fileId, lo usamos directamente
        if (attachment.fileId) {
          if (attachment.type === 'image') {
            apiCompatibleContents.push({
              type: 'image',
              source: {
                type: 'file',
                file_id: attachment.fileId
              }
            });
          } else if (attachment.type === 'pdf') {
            apiCompatibleContents.push({
              type: 'document',
              source: {
                type: 'file',
                file_id: attachment.fileId
              }
            });
          }
        }
        // Si tenemos una URL, la usamos
        else if (attachment.fileUrl) {
          if (attachment.type === 'image') {
            apiCompatibleContents.push({
              type: 'image',
              source: {
                type: 'url',
                url: attachment.fileUrl
              }
            });
          } else if (attachment.type === 'pdf') {
            apiCompatibleContents.push({
              type: 'document',
              source: {
                type: 'url',
                url: attachment.fileUrl
              }
            });
          }
        }
        // Si tenemos un archivo, necesitamos subirlo primero con la Files API
        else if (attachment.file) {
          const fileId = await this.uploadFile(attachment.file);
          
          if (attachment.type === 'image') {
            apiCompatibleContents.push({
              type: 'image',
              source: {
                type: 'file',
                file_id: fileId
              }
            });
          } else if (attachment.type === 'pdf') {
            apiCompatibleContents.push({
              type: 'document',
              source: {
                type: 'file',
                file_id: fileId
              }
            });
          }
        }
      }

      // Luego agregamos el texto del mensaje
      apiCompatibleContents.push({
        type: 'text',
        text: prompt
      });

      // Verificar si necesitamos activar la beta de Files API
      const needsFilesAPI = attachments.some(att => att.type === 'pdf' || att.fileId || att.file);
      
      // Opciones de la petición con headers beta si es necesario
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestOptions: any = needsFilesAPI 
        ? { headers: { 'anthropic-beta': 'pdfs-2024-09-25' } }
        : undefined;

      // Enviar mensaje a la API de Anthropic
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [
          { role: 'user', content: apiCompatibleContents }
        ]
      }, requestOptions);

      // Extraer la respuesta del asistente
      const assistantMessage = response.content.find(
        content => content.type === 'text'
      );

      if (assistantMessage && 'text' in assistantMessage) {
        return assistantMessage.text;
      }

      throw new Error('No se recibió respuesta textual del asistente');
    } catch (error) {
      console.error('Error al enviar mensaje con adjuntos a Anthropic Claude:', error);
      throw new Error(`Error al comunicarse con Anthropic: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Sube un archivo a Anthropic utilizando la Files API (beta)
   * @param file El archivo a subir (como File o Blob)
   * @returns ID del archivo subido
   */
  public async uploadFile(file: File | Blob): Promise<string> {
    if (!this.client) {
      if (this.initError) {
        throw new Error(`El cliente de Anthropic no está inicializado: ${this.initError}`);
      } else {
        throw new Error('El cliente de Anthropic no está inicializado');
      }
    }

    try {
      console.log('Subiendo archivo a Anthropic...');
      
      // Formar el nombre del archivo si no está disponible
      const fileName = file instanceof File ? file.name : `file_${Date.now()}`;
      
      // Crear un objeto FormData
      const formData = new FormData();
      formData.append('file', file, fileName);
      
      // Realizar una petición manual para subir el archivo
      const response = await fetch('https://api.anthropic.com/v1/files', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'pdfs-2024-09-25'
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al subir archivo: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Archivo subido correctamente a Anthropic:', data);
      
      return data.id;
    } catch (error) {
      console.error('Error al subir archivo a Anthropic:', error);
      throw new Error(`Error al subir archivo a Anthropic: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Verifica si un modelo soporta el procesamiento de archivos adjuntos
   * @param model Nombre del modelo a verificar
   * @returns boolean que indica si el modelo soporta archivos adjuntos
   */
  public supportsAttachments(model?: string): boolean {
    // Los modelos Claude 3.5+ soportan tanto imágenes como PDFs
    const supportedModels = [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-3-5-haiku',
      'claude-3-opus-20240229'
    ];
    
    const modelToCheck = model || this.config.ai.anthropic.defaultModel;
    
    // Verificar si el modelo soporta adjuntos
    return supportedModels.some(m => modelToCheck.includes(m));
  }

  /**
   * Comprueba si el cliente está inicializado correctamente
   * @returns true si el cliente está listo para usar
   */
  public isClientReady(): boolean {
    return this.client !== null;
  }
  
  /**
   * Obtiene el mensaje de error de inicialización si existe
   * @returns Mensaje de error o null si no hay error
   */
  public getInitializationError(): string | null {
    return this.initError;
  }

  /**
   * Obtiene información del modelo actual configurado
   * @returns Información del modelo y configuración
   */
  public getModelInfo(): { 
    model: string; 
    maxTokens: number; 
    temperature: number; 
    supportsAttachments: boolean; 
  } {
    const model = this.config.ai.anthropic.defaultModel;
    return {
      model,
      maxTokens: this.config.ai.anthropic.maxTokens,
      temperature: this.config.ai.anthropic.temperature,
      supportsAttachments: this.supportsAttachments(model)
    };
  }

  /**
   * Actualiza la configuración de la API key temporalmente
   * @param newApiKey Nueva clave API
   * @returns true si se actualizó correctamente
   */
  public updateApiKey(newApiKey: string): boolean {
    try {
      this.apiKey = newApiKey;
      this.initClient();
      return this.isClientReady();
    } catch (error) {
      console.error('Error al actualizar la API key:', error);
      return false;
    }
  }
} 
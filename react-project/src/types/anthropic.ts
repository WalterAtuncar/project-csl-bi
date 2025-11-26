/**
 * Tipos para la integración con Anthropic Claude
 */

/**
 * Modelos disponibles de Anthropic Claude
 */
export type AnthropicModelType = 
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-sonnet-20240620'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-opus-20240229'
  | 'claude-3-haiku-20240307';

/**
 * Opciones para configurar la API de Anthropic
 */
export interface AnthropicApiOptions {
  model: AnthropicModelType;
  max_tokens: number;
  temperature?: number;
  system?: string;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
}

/**
 * Contenido de texto para mensajes
 */
export interface AnthropicTextContent {
  type: 'text';
  text: string;
}

/**
 * Contenido de imagen para mensajes
 */
export interface AnthropicImageContent {
  type: 'image';
  source: {
    type: 'base64' | 'url' | 'file';
    media_type: string;
    data?: string;
    url?: string;
    file_id?: string;
  };
}

/**
 * Contenido de documento para mensajes
 */
export interface AnthropicDocumentContent {
  type: 'document';
  source: {
    type: 'file' | 'url';
    file_id?: string;
    url?: string;
  };
}

/**
 * Tipo de contenido para mensajes de Anthropic
 */
export type AnthropicContent = 
  | AnthropicTextContent 
  | AnthropicImageContent 
  | AnthropicDocumentContent;

/**
 * Mensaje para enviar a Anthropic
 */
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

/**
 * Archivo adjunto para Anthropic
 */
export interface AnthropicAttachment {
  file?: File | Blob;
  fileName?: string;
  fileType?: string;
  type: 'image' | 'pdf' | 'text';
  fileId?: string;
  fileUrl?: string;
}

/**
 * Respuesta de la API de Anthropic
 */
export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContent[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Error de la API de Anthropic
 */
export interface AnthropicError {
  type: string;
  message: string;
  error?: {
    type: string;
    message: string;
  };
} 
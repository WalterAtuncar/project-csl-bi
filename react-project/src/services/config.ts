/**
 * Configuración de la API y variables de entorno
 */

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface AnthropicConfig {
  apiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface AppConfig {
  api: ApiConfig;
  auth: {
    tokenKey: string;
    refreshTokenKey: string;
    tokenExpiration: number;
  };
  app: {
    name: string;
    version: string;
    environment: string;
  };
  ai: {
    anthropic: AnthropicConfig;
  };
}

/**
 * Configuración por defecto de la aplicación
 */
export const defaultConfig: AppConfig = {
  api: {
    baseURL: 'https://localhost:7036/api', //'http://190.116.90.35:8183/api', //import.meta.env.VITE_API_BASE_URL ||
    timeout: 30000, // 30 segundos
    retryAttempts: 3,
    retryDelay: 1000, // 1 segundo
  },
  auth: {
    tokenKey: 'authToken',
    refreshTokenKey: 'refreshToken',
    tokenExpiration: 3600000, // 1 hora en milisegundos
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Clinic Management System',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.MODE || 'development',
  },
  ai: {
    anthropic: {
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || 'AGQn0vNmKbmoyau1W0uYngBbykGHjDOPlFIxlKEfK3jchUkMo4GVhKrDSZQC/FaDf0rc/0TLWp9WLLQaNUSiUXCYhKpvoWU/e97cOmsE5l0cxhEPHFJnObK/CVmpfjL9VIrPTJxGkpdBmJ9M048R0g==',
      defaultModel: 'claude-3-5-sonnet-20241022', // Claude 3.5 Sonnet más reciente
      maxTokens: 4000,
      temperature: 0.7,
      timeout: 60000, // 60 segundos para IA
    },
  },
};

/**
 * Obtiene la configuración actual de la aplicación
 */
export const getConfig = (): AppConfig => {
  return defaultConfig;
};

/**
 * Verifica si estamos en modo desarrollo
 */
export const isDevelopment = (): boolean => {
  return defaultConfig.app.environment === 'development';
};

/**
 * Verifica si estamos en modo producción
 */
export const isProduction = (): boolean => {
  return defaultConfig.app.environment === 'production';
}; 
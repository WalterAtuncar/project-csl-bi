import CryptoJS from 'crypto-js';

/**
 * Servicio para operaciones criptográficas
 * Implementa encriptación y desencriptación AES-256-CBC con PKCS5Padding
 */
export class CryptoService {
  private static instance: CryptoService;
  private readonly secretKey: string = '1O2M3E4G5A6N7E8T915092203ZYXWVUA';
  private readonly keySize: number = 256 / 32; // 256 bits = 32 bytes
  private readonly mode: typeof CryptoJS.mode.CBC = CryptoJS.mode.CBC;
  private readonly padding: typeof CryptoJS.pad.Pkcs7 = CryptoJS.pad.Pkcs7; // PKCS5Padding es equivalente a PKCS7Padding en crypto-js

  /**
   * Constructor privado para implementar patrón Singleton
   */
  private constructor() {
    // La clave se define como constante en esta implementación
    console.log('CryptoService inicializado con longitud de clave:', this.secretKey.length);
    if (this.secretKey.length < 32) {
      console.warn('ADVERTENCIA: La clave secreta es menor que 32 bytes, lo que puede afectar la seguridad');
    }
  }

  /**
   * Obtener la instancia única del servicio
   * @returns Instancia de CryptoService
   */
  public static getInstance(): CryptoService {
    if (!CryptoService.instance) {
      CryptoService.instance = new CryptoService();
    }
    return CryptoService.instance;
  }

  /**
   * Encripta un texto usando AES-256-CBC y retorna el resultado en Base64
   * @param plainText Texto a encriptar
   * @returns Texto encriptado en formato Base64
   * @throws Error si falla la encriptación y throwOnError es true
   */
  public encrypt(plainText: string, throwOnError: boolean = false): string {
    if (!plainText) {
      const message = 'Error: No se puede encriptar un texto vacío';
      console.error(message);
      if (throwOnError) throw new Error(message);
      return '';
    }
    
    try {
      // Crear la clave a partir del secretKey
      const key = CryptoJS.enc.Utf8.parse(this.secretKey);
      
      // Usar los primeros 16 caracteres de la clave como IV
      const iv = CryptoJS.enc.Utf8.parse(this.secretKey.substring(0, 16));

      // Encriptar
      const encrypted = CryptoJS.AES.encrypt(plainText, key, {
        iv: iv,
        mode: this.mode,
        padding: this.padding
      });

      // Retornar en formato Base64
      return encrypted.toString();
    } catch (error) {
      const message = `Error al encriptar: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      console.error(message, error);
      if (throwOnError) throw new Error(message);
      return '';
    }
  }

  /**
   * Desencripta un texto en formato Base64 usando AES-256-CBC
   * @param encryptedText Texto encriptado en formato Base64
   * @returns Texto desencriptado
   * @throws Error si falla la desencriptación y throwOnError es true
   */
  public decrypt(encryptedText: string, throwOnError: boolean = false): string {
    if (!encryptedText) {
      const message = 'Error: No se puede desencriptar un texto vacío';
      console.error(message);
      if (throwOnError) throw new Error(message);
      return '';
    }
    
    try {
      console.log(`Intentando desencriptar texto (longitud: ${encryptedText.length})`);
      
      // Crear la clave a partir del secretKey
      const key = CryptoJS.enc.Utf8.parse(this.secretKey);
      
      // Usar los primeros 16 caracteres de la clave como IV
      const iv = CryptoJS.enc.Utf8.parse(this.secretKey.substring(0, 16));

      // Desencriptar
      const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
        iv: iv,
        mode: this.mode,
        padding: this.padding
      });

      // Convertir el resultado a string UTF-8
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!result) {
        const message = 'Error: La desencriptación produjo un resultado vacío. Posiblemente clave incorrecta o texto corrupto.';
        console.error(message);
        if (throwOnError) throw new Error(message);
      }
      
      return result;
    } catch (error) {
      const message = `Error al desencriptar: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      console.error(message, error);
      if (throwOnError) throw new Error(message);
      return '';
    }
  }

  /**
   * Desencripta un texto en formato Base64 usando AES-256-CBC con IV personalizado
   * @param encryptedText Texto encriptado en formato Base64
   * @param iv Vector de inicialización (IV) en formato string o Base64
   * @param isIvBase64 Indica si el IV está en formato Base64
   * @returns Texto desencriptado
   * @throws Error si falla la desencriptación y throwOnError es true
   */
  public decryptWithIV(encryptedText: string, iv: string, isIvBase64: boolean = false, throwOnError: boolean = false): string {
    if (!encryptedText) {
      const message = 'Error: No se puede desencriptar un texto vacío';
      console.error(message);
      if (throwOnError) throw new Error(message);
      return '';
    }
    
    if (!iv) {
      const message = 'Error: No se proporcionó un IV válido';
      console.error(message);
      if (throwOnError) throw new Error(message);
      return '';
    }
    
    try {
      // Decodificar el texto de Base64
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(encryptedText)
      });

      // Crear la clave a partir del secretKey
      const key = CryptoJS.enc.Utf8.parse(this.secretKey);
      
      // Procesar el IV según su formato
      const ivParams = isIvBase64 
        ? CryptoJS.enc.Base64.parse(iv)
        : CryptoJS.enc.Utf8.parse(iv);

      // Desencriptar
      const decrypted = CryptoJS.AES.decrypt(
        cipherParams,
        key,
        {
          iv: ivParams,
          mode: this.mode,
          padding: this.padding
        }
      );

      // Convertir el resultado a string UTF-8
      const result = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!result) {
        const message = 'Error: La desencriptación produjo un resultado vacío. Posiblemente clave incorrecta, IV incorrecto o texto corrupto.';
        console.error(message);
        if (throwOnError) throw new Error(message);
      }
      
      return result;
    } catch (error) {
      const message = `Error al desencriptar con IV personalizado: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      console.error(message, error);
      if (throwOnError) throw new Error(message);
      return '';
    }
  }

  /**
   * Verifica si el servicio está inicializado correctamente
   * @returns true si el servicio está listo
   */
  public isReady(): boolean {
    return true; // Como usa clave fija, siempre está listo
  }
} 
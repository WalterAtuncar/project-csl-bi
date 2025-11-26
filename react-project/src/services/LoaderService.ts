/**
 * Servicio para manejar el estado global del loader
 * Permite mostrar/ocultar el loader desde cualquier parte de la aplicación
 */

type LoaderListener = (isVisible: boolean, message?: string) => void;

class LoaderService {
  private isVisible: boolean = false;
  private message: string = 'Procesando...';
  private listeners: LoaderListener[] = [];
  private requestCount: number = 0;

  /**
   * Suscribe un listener para cambios en el estado del loader
   */
  subscribe(listener: LoaderListener): () => void {
    this.listeners.push(listener);
    
    // Retorna función para desuscribirse
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notifica a todos los listeners sobre cambios en el estado
   */
  private notify(): void {
    this.listeners.forEach(listener => {
      listener(this.isVisible, this.message);
    });
  }

  /**
   * Muestra el loader con un mensaje opcional
   */
  show(message: string = 'Procesando...'): void {
    this.requestCount++;
    this.message = message;
    
    if (!this.isVisible) {
      this.isVisible = true;
      this.notify();
    }
  }

  /**
   * Oculta el loader
   */
  hide(): void {
    this.requestCount = Math.max(0, this.requestCount - 1);
    
    // Solo ocultar si no hay más peticiones pendientes
    if (this.requestCount === 0 && this.isVisible) {
      this.isVisible = false;
      this.notify();
    }
  }

  /**
   * Fuerza el ocultado del loader (ignora el contador de peticiones)
   */
  forceHide(): void {
    this.requestCount = 0;
    if (this.isVisible) {
      this.isVisible = false;
      this.notify();
    }
  }

  /**
   * Obtiene el estado actual del loader
   */
  getState(): { isVisible: boolean; message: string; requestCount: number } {
    return {
      isVisible: this.isVisible,
      message: this.message,
      requestCount: this.requestCount
    };
  }

  /**
   * Verifica si el loader está visible
   */
  isLoaderVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Actualiza solo el mensaje sin cambiar la visibilidad
   */
  updateMessage(message: string): void {
    this.message = message;
    if (this.isVisible) {
      this.notify();
    }
  }

  /**
   * Ejecuta una función mostrando el loader automáticamente
   */
  async withLoader<T>(
    asyncFunction: () => Promise<T>,
    message: string = 'Procesando...'
  ): Promise<T> {
    this.show(message);
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      this.hide();
    }
  }

  /**
   * Resetea completamente el servicio
   */
  reset(): void {
    this.requestCount = 0;
    this.isVisible = false;
    this.message = 'Procesando...';
    this.notify();
  }
}

// Crear instancia singleton
export const loaderService = new LoaderService();

// Exportar también la clase para testing
export { LoaderService }; 
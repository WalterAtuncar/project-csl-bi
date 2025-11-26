import { useState, useEffect } from 'react';
import { loaderService } from '../services/LoaderService';

export interface UseLoaderReturn {
  isVisible: boolean;
  message: string;
  show: (message?: string) => void;
  hide: () => void;
  forceHide: () => void;
  updateMessage: (message: string) => void;
  withLoader: <T>(asyncFunction: () => Promise<T>, message?: string) => Promise<T>;
}

/**
 * Hook personalizado para manejar el loader global
 */
export const useLoader = (): UseLoaderReturn => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('Procesando...');

  useEffect(() => {
    // Suscribirse a cambios en el loader service
    const unsubscribe = loaderService.subscribe((visible, msg) => {
      setIsVisible(visible);
      if (msg) {
        setMessage(msg);
      }
    });

    // Obtener estado inicial
    const initialState = loaderService.getState();
    setIsVisible(initialState.isVisible);
    setMessage(initialState.message);

    // Cleanup al desmontar
    return unsubscribe;
  }, []);

  return {
    isVisible,
    message,
    show: loaderService.show.bind(loaderService),
    hide: loaderService.hide.bind(loaderService),
    forceHide: loaderService.forceHide.bind(loaderService),
    updateMessage: loaderService.updateMessage.bind(loaderService),
    withLoader: loaderService.withLoader.bind(loaderService)
  };
}; 
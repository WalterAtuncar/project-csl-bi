import React from 'react';
import { useLoader } from '../../hooks/useLoader';
import HeartBeatLoader from './HeartBeatLoader';

/**
 * Componente global del loader que se renderiza en toda la aplicación
 * Se suscribe automáticamente al LoaderService para mostrar/ocultar el loader
 */
const GlobalLoader: React.FC = () => {
  const { isVisible, message } = useLoader();

  return <HeartBeatLoader isVisible={isVisible} message={message} />;
};

export default GlobalLoader; 
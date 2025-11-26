import React from 'react';
import './HeartBeatLoader.css';

interface HeartBeatLoaderProps {
  isVisible: boolean;
  message?: string;
}

const HeartBeatLoader: React.FC<HeartBeatLoaderProps> = ({ 
  isVisible, 
  message = "Procesando..." 
}) => {
  if (!isVisible) return null;

  return (
    <div className="heartbeat-loader-overlay">
      <div className="heartbeat-loader-container">
        <div className="heartbeat-monitor">
          {/* Línea del ECG */}
          <svg 
            className="heartbeat-svg" 
            viewBox="0 0 400 100" 
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Grid de fondo */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path 
                  d="M 20 0 L 0 0 0 20" 
                  fill="none" 
                  stroke="rgba(59, 130, 246, 0.2)" 
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Línea base del ECG */}
            <path
              className="heartbeat-line"
              d="M0,50 L80,50 L85,50 L90,20 L95,80 L100,10 L105,90 L110,50 L400,50"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            />
            
            {/* Punto que se mueve */}
            <circle
              className="heartbeat-dot"
              r="4"
              fill="#ffffff"
              stroke="#ef4444"
              strokeWidth="2"
            >
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                path="M0,50 L80,50 L85,50 L90,20 L95,80 L100,10 L105,90 L110,50 L400,50"
              />
            </circle>
            
            {/* Efecto de brillo en el punto */}
            <circle
              className="heartbeat-glow"
              r="8"
              fill="rgba(255, 255, 255, 0.3)"
              stroke="none"
            >
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                path="M0,50 L80,50 L85,50 L90,20 L95,80 L100,10 L105,90 L110,50 L400,50"
              />
            </circle>
          </svg>
          
          {/* Líneas de barrido */}
          <div className="scan-line"></div>
        </div>
        
        {/* Texto del mensaje */}
        <div className="heartbeat-message">
          <span className="heartbeat-text">{message}</span>
          <div className="heartbeat-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        
        {/* Nombre de la empresa con efecto neón */}
        <div className="clinic-name">
          <span className="neon-text">Clínica San Lorenzo</span>
        </div>
      </div>
    </div>
  );
};

export default HeartBeatLoader; 
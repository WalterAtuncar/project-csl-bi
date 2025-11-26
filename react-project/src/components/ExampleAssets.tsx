import React from 'react';

// Componente de ejemplo para mostrar cómo usar activos desde la carpeta public
const ExampleAssets: React.FC = () => {
  return (
    <div className="public-asset-examples p-4">
      <h2 className="text-xl font-bold mb-4">Ejemplo de recursos desde carpeta public</h2>
      
      {/* Importar imagen usando ruta absoluta desde la raíz pública */}
      <div className="mb-4">
        <h3 className="font-medium mb-2">Imagen desde public:</h3>
        <img 
          src="/assets/images/logo.png" 
          alt="Logo" 
          className="public-asset mb-2 border p-2" 
        />
        <p className="text-sm text-gray-600">
          Ruta de importación: <code>/assets/images/logo.png</code>
        </p>
      </div>
      
      {/* Importar ícono SVG desde la carpeta public */}
      <div className="mb-4">
        <h3 className="font-medium mb-2">Ícono desde public:</h3>
        <img 
          src="/assets/icons/home.svg" 
          alt="Home Icon" 
          className="w-8 h-8 mb-2" 
        />
        <p className="text-sm text-gray-600">
          Ruta de importación: <code>/assets/icons/home.svg</code>
        </p>
      </div>
      
      {/* Referencia a estilos CSS */}
      <div className="mb-4">
        <h3 className="font-medium mb-2">Estilos desde public:</h3>
        <p className="text-sm text-gray-600">
          Los estilos desde <code>/assets/styles/main.css</code> se cargan de manera global
          o pueden ser importados en el archivo principal.
        </p>
      </div>
    </div>
  );
};

export default ExampleAssets; 
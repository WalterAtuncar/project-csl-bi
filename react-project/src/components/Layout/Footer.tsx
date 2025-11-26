import React from 'react';
import { Heart } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-sm mt-auto">
      <div className="px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-2 md:mb-0">
            <div className="w-6 h-6 bg-secondary dark:bg-gray-700 rounded-md flex items-center justify-center text-white font-bold text-xs mr-2">
              CS
            </div>
            <p className="text-sm text-primary dark:text-white">
              &copy; {currentYear} Clínica San Lorenzo. Todos los derechos reservados.
            </p>
          </div>
          
          <div className="flex space-x-6">
            <a 
              href="#privacy" 
              className="text-sm text-primary hover:text-primary-dark dark:text-white dark:hover:text-white/80"
            >
              Privacidad
            </a>
            <a 
              href="#terms" 
              className="text-sm text-primary hover:text-primary-dark dark:text-white dark:hover:text-white/80"
            >
              Términos
            </a>
            <a 
              href="#support" 
              className="text-sm text-primary hover:text-primary-dark dark:text-white dark:hover:text-white/80"
            >
              Soporte
            </a>
          </div>
          
          <div className="mt-2 md:mt-0 flex items-center">
            <span className="text-xs text-primary dark:text-white flex items-center">
              Desarrollado por IT Soporte
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
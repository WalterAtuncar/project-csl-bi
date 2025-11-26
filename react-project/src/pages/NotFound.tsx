import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Button from '../components/UI/Button';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div 
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 dark:bg-red-900 mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, 10, 0] }}
          transition={{ type: 'spring', delay: 0.2, duration: 0.8 }}
        >
          <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
        </motion.div>
        
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
        <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Página no encontrada</h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline"
          >
            Volver atrás
          </Button>
          <Button 
            onClick={() => navigate('/dashboards/general')} 
            variant="primary"
          >
            Ir al Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
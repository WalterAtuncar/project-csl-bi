import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return window.innerWidth >= 1024;
  });
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <div className="w-full h-screen flex bg-gray-50 dark:bg-gray-900 text-primary dark:text-white">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Contenedor principal con scroll propio */}
      <div className={`w-full h-screen flex flex-col ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-16'} transition-all duration-300 text-primary dark:text-white`} 
           style={{ width: 'calc(100% - (isSidebarOpen ? 16rem : 4rem))' }}>
        {/* Header fijo */}
        <Header toggleSidebar={toggleSidebar} userName="Usuario CSL" />
        
        {/* Contenido principal con scroll */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="p-4"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
          
          {/* Footer integrado en el scroll del contenido */}
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
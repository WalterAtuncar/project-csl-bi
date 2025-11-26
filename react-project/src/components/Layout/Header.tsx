import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Menu, Bell, User, ChevronDown } from 'lucide-react';
import ThemeToggle from '../UI/ThemeToggle';

interface HeaderProps {
  toggleSidebar?: () => void;
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, userName = 'Usuario' }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Manejar clics fuera del menú desplegable
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="bg-primary dark:bg-gray-800 border-b border-primary-light/20 dark:border-gray-700 h-16 w-full shrink-0 shadow-sm">
      <div className="flex items-center justify-between px-4 h-full">
        <div className="flex items-center gap-3">
          <motion.button 
            onClick={toggleSidebar}
            className="p-2 rounded-full hover:bg-primary-light/20 dark:hover:bg-gray-700 text-white dark:text-gray-300 transition-colors"
            aria-label="Menú principal"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Menu className="w-5 h-5" />
          </motion.button>
          
          <motion.h1 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="text-lg font-medium text-white dark:text-white"
          >
            BI y Gestión de Caja Mayor - CSL
          </motion.h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          
          <button className="p-2 rounded-full hover:bg-primary-light/20 dark:hover:bg-gray-700 text-white dark:text-gray-300 relative transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 bg-red-500 rounded-full w-2 h-2"></span>
          </button>
          
          <div className="flex items-center gap-2 ml-3 relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 hover:bg-primary-light/20 dark:hover:bg-gray-700 p-1.5 rounded-lg transition-colors"
            >
              <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center text-primary shadow-sm">
                <User className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-white dark:text-gray-300 hidden md:block">
                {userName}
              </span>
              <ChevronDown className="w-4 h-4 text-white dark:text-gray-400 hidden md:block" />
            </button>
            
            <AnimateDropdown isOpen={isDropdownOpen} />
          </div>
        </div>
      </div>
    </header>
  );
};

const AnimateDropdown: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={isOpen ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 ${
        isOpen ? 'block' : 'hidden'
      }`}
      style={{ display: isOpen ? 'block' : 'none' }}
    >
      <div className="py-1">
        <a
          href="/login"
          className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
        >
          <svg className="w-4 h-4 mr-2 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </a>
      </div>
    </motion.div>
  );
};

export default Header;
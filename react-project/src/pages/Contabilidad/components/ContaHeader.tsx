import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Menu, Bell, User, ChevronDown, LogOut } from 'lucide-react';
import ThemeToggle from '../../../components/UI/ThemeToggle';
import type { ContaUser } from '../../../context/ContaAuthContext';

// Réplica visual del Header del sistema principal (src/components/Layout/Header.tsx):
// bg-primary h-16, botón toggle, título, ThemeToggle + Bell + dropdown de usuario.
// Diferencia: el "Cerrar sesión" NO es <a href="/login"> sino un botón que llama al
// onLogout PROPIO del conta (logout() + navigate a /conta/login).

interface ContaHeaderProps {
  toggleSidebar?: () => void;
  user: ContaUser | null;
  onLogout: () => void;
}

const ContaHeader: React.FC<ContaHeaderProps> = ({ toggleSidebar, user, onLogout }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.Nombre || user?.Username || 'Usuario';
  const displayRoles = user?.Roles?.join(', ') || '';

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
            Gestión Financiera · CSL
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
                {displayName}
              </span>
              <ChevronDown className="w-4 h-4 text-white dark:text-gray-400 hidden md:block" />
            </button>

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={
                isDropdownOpen
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: -10, scale: 0.95 }
              }
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
              style={{ display: isDropdownOpen ? 'block' : 'none' }}
            >
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {displayName}
                </div>
                {displayRoles && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {displayRoles}
                  </div>
                )}
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                >
                  <LogOut className="w-4 h-4 mr-2 text-red-500 dark:text-red-400" />
                  Cerrar sesión
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ContaHeader;

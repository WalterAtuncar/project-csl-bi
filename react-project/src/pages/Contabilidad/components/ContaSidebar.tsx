import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';

// Réplica visual del Sidebar del sistema principal (src/components/Layout/Sidebar.tsx):
// gradiente primary, colapsable con framer-motion, logo CSL, círculos decorativos y tooltips
// en modo colapsado. La diferencia: la navegación del conta es PLANA (sin submenús), por eso
// aquí sólo existe la rama de "item simple" (NavLink + tooltip); toda la lógica de subItems/
// floating/expand del principal se omite a propósito.

export interface ContaNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ContaSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  items: ContaNavItem[]; // ya filtrados por rol en ContaLayout
}

// Variantes de animación (mismas que el Sidebar principal)
const sidebarVariants: Variants = {
  open: {
    width: '16rem',
    transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 20 }
  },
  closed: {
    width: '4rem',
    transition: { duration: 0.5, type: 'spring', stiffness: 100, damping: 20 }
  },
  mobile: {
    width: '0',
    transition: { duration: 0.5, ease: 'easeInOut' }
  }
};

const menuItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (custom: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: custom * 0.1,
      duration: 0.4,
      ease: 'easeOut'
    }
  })
};

const tooltipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
};

const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 0.5, transition: { duration: 0.4 } }
};

const decorationVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0.3 },
  visible: {
    scale: 1,
    opacity: 0.5,
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut'
    }
  }
};

// Tooltip simplificado (idéntico al del Sidebar principal)
const Tooltip: React.FC<{ text: string }> = ({ text }) => {
  return (
    <motion.div
      variants={tooltipVariants}
      initial="hidden"
      animate="visible"
      className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs font-medium rounded-md shadow-lg px-3 py-2 whitespace-nowrap z-[9999] pointer-events-none"
      style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.3))' }}
    >
      {text}
      <div className="absolute -left-1 top-1/2 -mt-1 w-2 h-2 bg-gray-800 transform rotate-45"></div>
    </motion.div>
  );
};

const ContaSidebar: React.FC<ContaSidebarProps> = ({ isOpen, toggleSidebar, items }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <>
      {/* Overlay para mobile cuando el menú está abierto */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black z-20 lg:hidden"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Contenedor del sidebar */}
      <div className="fixed top-0 left-0 h-full z-30 overflow-visible">
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary via-primary-dark to-blue-800 dark:bg-gradient-to-r dark:from-gray-900 dark:via-blue-950 dark:to-slate-900 shadow-lg overflow-hidden"
          variants={sidebarVariants}
          initial={false}
          animate={isOpen ? 'open' : window.innerWidth < 1024 ? 'mobile' : 'closed'}
        >
          {/* Círculos decorativos con animación suave */}
          <motion.div
            className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-16"
            variants={decorationVariants}
            initial="hidden"
            animate="visible"
            custom={0}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-10 -mb-10"
            variants={decorationVariants}
            initial="hidden"
            animate="visible"
            custom={1}
          />
          <motion.div
            className="absolute top-1/3 right-0 w-16 h-16 bg-white opacity-5 rounded-full -mr-6"
            variants={decorationVariants}
            initial="hidden"
            animate="visible"
            custom={2}
          />
          <motion.div
            className="absolute top-2/3 left-1/4 w-20 h-20 bg-white opacity-5 rounded-full"
            variants={decorationVariants}
            initial="hidden"
            animate="visible"
            custom={3}
          />

          {/* Contenido del sidebar con estructura fija */}
          <div className="h-full flex flex-col relative z-10">
            {/* Logo de la empresa (reemplaza la caja emerald+Calculator anterior) */}
            <div className="flex items-center justify-between p-4 shrink-0 relative z-20">
              <div className="flex items-center justify-center w-full">
                <motion.div
                  className="flex items-center justify-center overflow-hidden bg-white/60 rounded-lg p-2"
                  animate={{ width: isOpen ? '13rem' : '3rem' }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                  {isOpen ? (
                    <motion.img
                      src="/assets/images/logo-csl.png"
                      alt="Clínica San Lorenzo"
                      className="w-full h-auto object-contain drop-shadow-md"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.4 }}
                      onError={(e) => {
                        e.currentTarget.src = 'https://i.ibb.co/qpL1NrK/logo-san-lorenzo.png';
                      }}
                    />
                  ) : (
                    <motion.img
                      src="/assets/images/logo-ico.png"
                      alt="CSL"
                      className="w-full h-auto object-contain drop-shadow-md"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.4 }}
                      onError={(e) => {
                        e.currentTarget.src = 'https://i.ibb.co/qpL1NrK/logo-san-lorenzo.png';
                      }}
                    />
                  )}
                </motion.div>
              </div>

              <motion.button
                onClick={toggleSidebar}
                className="p-1 rounded-full text-white hover:bg-white/15 dark:hover:bg-gray-700 lg:hidden"
                aria-label="Cerrar menú"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>

            {/* Separador */}
            <motion.div
              className="border-b border-white/10 dark:border-gray-600 w-full shrink-0"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />

            {/* Menú de navegación PLANO - con scroll independiente */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
              <ul className="px-2 space-y-2">
                {items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.li
                      key={item.to}
                      variants={menuItemVariants}
                      initial="hidden"
                      animate="visible"
                      custom={index}
                    >
                      <div
                        className="relative"
                        onMouseEnter={() => !isOpen && setHoveredItem(item.to)}
                        onMouseLeave={() => !isOpen && setHoveredItem(null)}
                      >
                        <NavLink
                          to={item.to}
                          className={({ isActive }) =>
                            `flex items-center p-2 rounded-md ${
                              isActive
                                ? 'bg-secondary dark:bg-blue-800 text-white font-medium'
                                : 'text-white/80 hover:bg-white/15 dark:hover:bg-blue-900/50 hover:text-white'
                            }`
                          }
                          onClick={() => {
                            if (window.innerWidth < 1024) {
                              toggleSidebar();
                            }
                          }}
                        >
                          {({ isActive }) => (
                            <motion.div
                              className="flex items-center"
                              whileHover={{ x: 3 }}
                              whileTap={{ scale: 0.98 }}
                              transition={{ duration: 0.3 }}
                            >
                              {/* Acento rojo en el icono para PARIDAD con el Sidebar principal.
                                  NOTA: en una nav plana con todos los items rojos el acento se
                                  ve cargado (y sobre el item activo bg-secondary rojo casi no
                                  contrasta), pero es exactamente el look del sistema principal. */}
                              <motion.div
                                className="text-red-500"
                                animate={{ scale: isActive ? 1.1 : 1 }}
                                whileHover={{ rotate: 5 }}
                                transition={{ duration: 0.3 }}
                              >
                                <Icon className="w-5 h-5" />
                              </motion.div>
                              {isOpen && (
                                <motion.span
                                  className="ml-3"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  {item.label}
                                </motion.span>
                              )}
                            </motion.div>
                          )}
                        </NavLink>

                        {/* Tooltip en modo colapsado */}
                        {!isOpen && hoveredItem === item.to && (
                          <div className="sidebar-tooltip">
                            <Tooltip text={item.label} />
                          </div>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ContaSidebar;

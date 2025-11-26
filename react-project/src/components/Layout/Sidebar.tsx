import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  X, LayoutDashboard, TrendingUp, DollarSign, ChevronRight,
  // Icons for submenu items
  LineChart, Activity,
  Search,
  // Icon for Honorarios Médicos
  Stethoscope
} from 'lucide-react';

// Variantes de animación
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

const subMenuVariants: Variants = {
  hidden: { 
    height: 0, 
    opacity: 0,
    transition: { duration: 0.4, ease: 'easeInOut' } 
  },
  visible: { 
    height: 'auto', 
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeInOut', staggerChildren: 0.1 } 
  }
};

const collapsedSubMenuVariants: Variants = {
  hidden: { 
    height: 0, 
    opacity: 0,
    overflow: 'hidden',
    transition: { duration: 0.3, ease: 'easeInOut' } 
  },
  visible: { 
    height: 'auto', 
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeInOut', staggerChildren: 0.05 } 
  }
};

const floatingMenuVariants: Variants = {
  hidden: { 
    opacity: 0, 
    x: -10,
    transition: { duration: 0.2, ease: 'easeInOut' } 
  },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut', staggerChildren: 0.05 } 
  }
};

const tooltipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
};

const subMenuItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' } 
  }
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

interface SubMenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

interface MenuItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  subItems?: SubMenuItem[];
}

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

// Componente Tooltip simplificado
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

const menuItems: MenuItem[] = [
  {
    name: 'Dashboards',
    path: '/dashboards',
    icon: <LayoutDashboard className="w-5 h-5" />,
    subItems: [
      { name: 'General', path: '/dashboards/general', icon: <LineChart className="w-4 h-4" /> },
      { name: 'Servicios', path: '/dashboards/ventas', icon: <Activity className="w-4 h-4" /> }
    ]
  },
  {
    name: 'Consultas BI',
    path: '/consultas-bi',
    icon: <TrendingUp className="w-5 h-5" />,
    subItems: [
      { name: 'BI Inteligente', path: '/consultas-bi/v2', icon: <Search className="w-4 h-4" /> }
    ]
  },
  {
    name: 'Caja Mayor',
    path: '/caja-mayor',
    icon: <DollarSign className="w-5 h-5" />
  },
  {
    name: 'Honorarios Médicos',
    path: '/honorarios-medicos',
    icon: <Stethoscope className="w-5 h-5" />
  }
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const location = useLocation();
  
  const toggleExpand = (name: string) => {
    setExpandedMenu(prev => prev === name ? null : name);
  };

  React.useEffect(() => {
    const menuToExpand = menuItems.find(item => 
      item.subItems?.some(subItem => 
        location.pathname === subItem.path || 
        location.pathname.startsWith(subItem.path + '/')
      )
    );
    
    if (menuToExpand) {
      setExpandedMenu(menuToExpand.name);
    }
  }, [location.pathname]);

  // Estilo global para asegurar que los tooltips aparezcan por encima de todo
  React.useEffect(() => {
    // Añadimos una regla CSS para asegurar que el tooltip esté por encima de todo
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .sidebar-tooltip {
        position: fixed;
        z-index: 9999 !important;
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <>
      {/* Overlay para mobile cuando el menu está abierto */}
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

      {/* Sidebar container */}
      <div 
        className="fixed top-0 left-0 h-full z-30 overflow-visible"
      >
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
            {/* Logo de la empresa - fijo en la parte superior */}
            <div className="flex items-center justify-between p-4 shrink-0 relative z-20">
              <div className="flex items-center justify-center w-full">
                <motion.div 
                  className="flex items-center justify-center overflow-hidden bg-white/60 rounded-lg p-2"
                  animate={{
                    width: isOpen ? '13rem' : '3rem'
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeInOut"
                  }}
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
                        e.currentTarget.src = "https://i.ibb.co/qpL1NrK/logo-san-lorenzo.png";
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
                        e.currentTarget.src = "https://i.ibb.co/qpL1NrK/logo-san-lorenzo.png";
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
            
            {/* Menú de navegación - con scroll independiente */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
              <ul className="px-2 space-y-2">
                {menuItems.map((item, index) => (
                  <motion.li 
                    key={item.name}
                    variants={menuItemVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                  >
                    {item.subItems ? (
                      <div 
                        className="relative"
                        onMouseEnter={() => {
                          if (!isOpen) {
                            setHoveredMenu(item.name);
                            setHoveredItem(item.name);
                          }
                        }}
                        onMouseLeave={() => {
                          if (!isOpen) {
                            setHoveredMenu(null);
                            setHoveredItem(null);
                          }
                        }}
                      >
                        <motion.button
                          onClick={() => toggleExpand(item.name)}
                          className={`flex items-center justify-between w-full p-2 rounded-md text-white hover:bg-white/15 dark:hover:bg-blue-900/50 transition-colors relative`}
                          whileHover={{ backgroundColor: "rgba(255,255,255,0.15)", scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex items-center min-w-0">
                            <motion.div
                              className="text-red-500"
                              whileHover={{ rotate: 5 }}
                              transition={{ duration: 0.3 }}
                            >
                              {item.icon}
                            </motion.div>
                            {isOpen && (
                              <motion.span 
                                className="ml-3 font-medium whitespace-nowrap"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                {item.name}
                              </motion.span>
                            )}
                          </div>
                          {isOpen && (
                            <motion.div
                              animate={{ rotate: expandedMenu === item.name ? 180 : 0 }}
                              transition={{ duration: 0.4 }}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </motion.div>
                          )}

                          {/* Tooltip para ítem principal */}
                          {!isOpen && hoveredItem === item.name && !hoveredMenu && (
                            <div className="sidebar-tooltip">
                              <Tooltip text={item.name} />
                            </div>
                          )}
                        </motion.button>
                        
                        {/* Submenu en modo expandido */}
                        <AnimatePresence>
                          {(isOpen && expandedMenu === item.name) && (
                            <motion.ul
                              variants={subMenuVariants}
                              initial="hidden"
                              animate="visible"
                              exit="hidden"
                              className="ml-6 mt-1 space-y-1 overflow-hidden"
                            >
                              {item.subItems.map((subItem, subIndex) => (
                                <motion.li
                                  key={subItem.path}
                                  variants={subMenuItemVariants}
                                  custom={subIndex}
                                >
                                  <NavLink
                                    to={subItem.path}
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
                                        className="flex items-center w-full"
                                        whileHover={{ x: 3 }}
                                        transition={{ duration: 0.3 }}
                                      >
                                        <motion.div
                                          animate={{ 
                                            scale: isActive ? 1.1 : 1,
                                            rotate: isActive ? 0 : 0
                                          }}
                                          whileHover={{ rotate: 5 }}
                                          transition={{ duration: 0.3 }}
                                        >
                                          {subItem.icon}
                                        </motion.div>
                                        <motion.span 
                                          className="ml-2"
                                          animate={{ 
                                            fontWeight: isActive ? 600 : 400
                                          }}
                                        >
                                          {subItem.name}
                                        </motion.span>
                                      </motion.div>
                                    )}
                                  </NavLink>
                                </motion.li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                        
                        {/* Submenu flotante en modo colapsado cuando hay hover */}
                        <AnimatePresence>
                          {(!isOpen && hoveredMenu === item.name) && (
                            <motion.ul
                              variants={floatingMenuVariants}
                              initial="hidden"
                              animate="visible"
                              exit="hidden"
                              className="absolute left-full top-0 ml-1 bg-gradient-to-r from-primary via-primary-dark to-blue-800 dark:bg-gradient-to-r dark:from-gray-900 dark:via-blue-950 dark:to-slate-900 rounded-md shadow-lg min-w-[200px] py-2 px-2 space-y-1 z-[9999]"
                            >
                              <div className="text-white font-medium px-3 pb-2 border-b border-white/10 mb-2">
                                {item.name}
                              </div>
                              {item.subItems.map((subItem, subIndex) => (
                                <motion.li
                                  key={subItem.path}
                                  variants={subMenuItemVariants}
                                  custom={subIndex}
                                >
                                  <NavLink
                                    to={subItem.path}
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
                                        className="flex items-center w-full"
                                        whileHover={{ x: 3 }}
                                        transition={{ duration: 0.3 }}
                                      >
                                        <motion.div
                                          animate={{ scale: isActive ? 1.1 : 1 }}
                                          whileHover={{ rotate: 5 }}
                                          transition={{ duration: 0.3 }}
                                        >
                                          {subItem.icon}
                                        </motion.div>
                                        <span className="ml-2">{subItem.name}</span>
                                      </motion.div>
                                    )}
                                  </NavLink>
                                </motion.li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>

                        {/* Submenú visible en modo colapsado (sin hover) */}
                        <AnimatePresence>
                          {(!isOpen && expandedMenu === item.name) && (
                            <motion.ul
                              variants={collapsedSubMenuVariants}
                              initial="hidden"
                              animate="visible"
                              exit="hidden"
                              className="mt-1 overflow-hidden"
                            >
                              {item.subItems.map((subItem, subIndex) => (
                                <motion.li
                                  key={subItem.path}
                                  variants={subMenuItemVariants}
                                  custom={subIndex}
                                  onMouseEnter={() => setHoveredItem(subItem.path)}
                                  onMouseLeave={() => setHoveredItem(null)}
                                  className="relative"
                                >
                                  <NavLink
                                    to={subItem.path}
                                    className={({ isActive }) =>
                                      `flex items-center justify-center p-2 rounded-md ${
                                        isActive
                                          ? 'bg-secondary dark:bg-blue-800 text-white'
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
                                        animate={{ 
                                          scale: isActive ? 1.1 : 1,
                                        }}
                                        whileHover={{ rotate: 5, scale: 1.1 }}
                                        transition={{ duration: 0.3 }}
                                      >
                                        {subItem.icon}
                                      </motion.div>
                                    )}
                                  </NavLink>
                                  
                                  {/* Tooltip para subítems */}
                                  {hoveredItem === subItem.path && (
                                    <div className="sidebar-tooltip">
                                      <Tooltip text={subItem.name} />
                                    </div>
                                  )}
                                </motion.li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div 
                        className="relative"
                        onMouseEnter={() => !isOpen && setHoveredItem(item.path)}
                        onMouseLeave={() => !isOpen && setHoveredItem(null)}
                      >
                        <NavLink
                          to={item.path}
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
                              <motion.div
                                className="text-red-500"
                                animate={{ 
                                  scale: isActive ? 1.1 : 1,
                                  rotate: isActive ? 0 : 0
                                }}
                                whileHover={{ rotate: 5 }}
                                transition={{ duration: 0.3 }}
                              >
                                {item.icon}
                              </motion.div>
                              {isOpen && (
                                <motion.span 
                                  className="ml-3"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  {item.name}
                                </motion.span>
                              )}
                            </motion.div>
                          )}
                        </NavLink>

                        {/* Tooltip para items simples */}
                        {!isOpen && hoveredItem === item.path && (
                          <div className="sidebar-tooltip">
                            <Tooltip text={item.name} />
                          </div>
                        )}
                      </div>
                    )}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Sidebar;
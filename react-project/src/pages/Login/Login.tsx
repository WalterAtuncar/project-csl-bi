import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Button from '../../components/UI/Button';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../../components/UI/ThemeToggle';
import { useAuth } from '../../hooks';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  
  useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Por favor, complete todos los campos');
      return;
    }

    setError('');
    
    try {
      const userData = await login(username, password);
      
      // Login exitoso - navegar al dashboard
      console.log('Login exitoso:', userData);
      
      // Pequeño delay para asegurar que el estado se actualice
      setTimeout(() => {
        navigate('/dashboards/general');
      }, 100);
    } catch (error: unknown) {
      console.error('Error de login:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al iniciar sesión. Verifique sus credenciales.';
      setError(errorMessage);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1.2,
        ease: "easeOut",
        when: "beforeChildren",
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.8,
        type: "spring", 
        stiffness: 100, 
        damping: 20 
      }
    }
  };

  const logoVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 1.8,
        ease: "easeInOut",
        delay: 0.3
      }
    }
  };

  const backgroundVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 2 }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-r from-primary via-primary-dark to-blue-800 dark:from-gray-900 dark:via-blue-950 dark:to-slate-900">
      <motion.div 
        className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-40 dark:opacity-20"
        variants={backgroundVariants}
        initial="hidden"
        animate="visible"
      />

      <motion.div 
        className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-16"
        initial={{ scale: 0.8, opacity: 0.3 }}
        animate={{ 
          scale: 1, 
          opacity: 0.5,
          transition: { 
            duration: 3, 
            repeat: Infinity, 
            repeatType: "reverse",
            ease: "easeInOut" 
          } 
        }}
      />
      <motion.div 
        className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-10 -mb-10"
        initial={{ scale: 0.8, opacity: 0.3 }}
        animate={{ 
          scale: 1, 
          opacity: 0.5,
          transition: { 
            duration: 3, 
            repeat: Infinity, 
            repeatType: "reverse",
            ease: "easeInOut",
            delay: 0.5
          } 
        }}
      />
      <motion.div 
        className="absolute top-1/3 right-0 w-16 h-16 bg-white opacity-5 rounded-full -mr-6"
        initial={{ scale: 0.8, opacity: 0.3 }}
        animate={{ 
          scale: 1, 
          opacity: 0.5,
          transition: { 
            duration: 3, 
            repeat: Infinity, 
            repeatType: "reverse",
            ease: "easeInOut",
            delay: 1
          } 
        }}
      />

      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          className="max-w-md w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            variants={itemVariants}
            className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8 space-y-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-secondary/30 to-primary/30 dark:from-secondary/20 dark:to-primary/20 rounded-bl-full -z-10" />
            
            <motion.div variants={itemVariants} className="text-center">
              <motion.div
                className="mx-auto w-40 h-auto flex items-center justify-center mb-2"
                variants={logoVariants}
                animate="visible"
                initial="hidden"
              >
                <img 
                  src="/assets/images/logo-csl.png" 
                  alt="Clínica San Lorenzo"
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "https://i.ibb.co/qpL1NrK/logo-san-lorenzo.png";
                  }}
                />
              </motion.div>
              <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
                Iniciar Sesión
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Sistema de BI y Gestión de Caja General
              </p>
            </motion.div>
            
            {error && (
              <motion.div
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 100, damping: 20 }}
              >
                {error}
              </motion.div>
            )}
            
            <motion.form variants={itemVariants} className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre de usuario
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <motion.input
                      whileFocus={{ scale: 1.01 }}
                      transition={{ duration: 0.4 }}
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary dark:focus:ring-secondary-light focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Ingrese su usuario"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <motion.input
                      whileFocus={{ scale: 1.01 }}
                      transition={{ duration: 0.4 }}
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-secondary dark:focus:ring-secondary-light focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Ingrese su contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <motion.input
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    type="checkbox"
                    id="remember-me"
                    disabled={isLoading}
                    className="h-4 w-4 text-secondary focus:ring-secondary border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Recordarme
                  </label>
                </div>

                <motion.a
                  href="#recover"
                  className="text-sm font-medium text-secondary hover:text-secondary-light dark:text-secondary-light dark:hover:text-secondary transition-colors duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                >
                  ¿Olvidó su contraseña?
                </motion.a>
              </div>

              <motion.div
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.4 }}
              >
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isLoading}
                  className="py-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark dark:hover:bg-primary-light transition-all duration-300"
                  icon={isLoading ? undefined : <ArrowRight className="w-5 h-5" />}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Iniciando sesión...
                    </span>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
              </motion.div>
            </motion.form>
            
            <motion.div variants={itemVariants} className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Clínica San Lorenzo &copy; {new Date().getFullYear()}
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
import React from 'react';
import toast, { Toaster, ToastOptions } from 'react-hot-toast';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  HelpCircle,
  X
} from 'lucide-react';

// Configuración por defecto para los toasts
const defaultToastOptions: ToastOptions = {
  duration: 4000,
  position: 'top-right',
  style: {
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    fontSize: '14px',
    fontWeight: '500',
    maxWidth: '400px',
  },
};

// Interfaz para las opciones de cada tipo de toast
interface ToastAlertOptions extends Partial<ToastOptions> {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Interfaz para el toast de confirmación
interface ConfirmationOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
}

// Clase para manejar todos los tipos de alertas
class ToastAlerts {
  
  /**
   * Toast de éxito
   */
  static success(options: ToastAlertOptions) {
    const { title, message, action, ...toastOptions } = options;
    
    toast.custom((t) => (
      <div className={`
        flex items-start p-4 bg-white dark:bg-gray-800 border-l-4 border-green-500 shadow-lg rounded-lg
        ${t.visible ? 'animate-enter' : 'animate-leave'}
      `}>
        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          {title && (
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {message}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="ml-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ), { ...defaultToastOptions, ...toastOptions });
  }

  /**
   * Toast de error
   */
  static error(options: ToastAlertOptions) {
    const { title, message, action, ...toastOptions } = options;
    
    toast.custom((t) => (
      <div className={`
        flex items-start p-4 bg-white dark:bg-gray-800 border-l-4 border-red-500 shadow-lg rounded-lg
        ${t.visible ? 'animate-enter' : 'animate-leave'}
      `}>
        <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          {title && (
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {message}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="ml-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ), { ...defaultToastOptions, duration: 6000, ...toastOptions });
  }

  /**
   * Toast de advertencia
   */
  static warning(options: ToastAlertOptions) {
    const { title, message, action, ...toastOptions } = options;
    
    toast.custom((t) => (
      <div className={`
        flex items-start p-4 bg-white dark:bg-gray-800 border-l-4 border-yellow-500 shadow-lg rounded-lg
        ${t.visible ? 'animate-enter' : 'animate-leave'}
      `}>
        <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          {title && (
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {message}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm text-yellow-600 hover:text-yellow-700 font-medium"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="ml-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ), { ...defaultToastOptions, duration: 5000, ...toastOptions });
  }

  /**
   * Toast de información
   */
  static info(options: ToastAlertOptions) {
    const { title, message, action, ...toastOptions } = options;
    
    toast.custom((t) => (
      <div className={`
        flex items-start p-4 bg-white dark:bg-gray-800 border-l-4 border-blue-500 shadow-lg rounded-lg
        ${t.visible ? 'animate-enter' : 'animate-leave'}
      `}>
        <Info className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          {title && (
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {message}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="ml-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ), { ...defaultToastOptions, ...toastOptions });
  }

  /**
   * Toast de loading/cargando
   */
  static loading(message: string, options?: Partial<ToastOptions>) {
    return toast.custom((t) => (
      <div className={`
        flex items-center p-4 bg-white dark:bg-gray-800 border-l-4 border-gray-500 shadow-lg rounded-lg
        ${t.visible ? 'animate-enter' : 'animate-leave'}
      `}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500 mr-3"></div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {message}
        </p>
      </div>
    ), { ...defaultToastOptions, duration: Infinity, ...options });
  }

  /**
   * Toast de confirmación (modal-like)
   */
  static confirmation(options: ConfirmationOptions) {
    const { 
      title, 
      message, 
      confirmText = 'Confirmar', 
      cancelText = 'Cancelar',
      onConfirm,
      onCancel,
      confirmButtonClass = 'bg-red-600 hover:bg-red-700 text-white',
      cancelButtonClass = 'bg-gray-300 hover:bg-gray-400 text-gray-800'
    } = options;

    toast.custom((t) => (
      <div className={`
        flex flex-col p-6 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 min-w-[320px] max-w-[400px]
        ${t.visible ? 'animate-enter' : 'animate-leave'}
      `}>
        <div className="flex items-start mb-4">
          <AlertCircle className="w-6 h-6 text-orange-500 mt-1 mr-3 flex-shrink-0" />
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {title}
              </h3>
            )}
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              onCancel?.();
              toast.dismiss(t.id);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${cancelButtonClass}`}
          >
            {cancelText}
          </button>
          <button
            onClick={async () => {
              try {
                await onConfirm();
                toast.dismiss(t.id);
              } catch (error) {
                console.error('Error en confirmación:', error);
              }
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    ), { 
      duration: Infinity,
      position: 'top-center',
    });
  }

  /**
   * Toast de ayuda
   */
  static help(options: ToastAlertOptions) {
    const { title, message, action, ...toastOptions } = options;
    
    toast.custom((t) => (
      <div className={`
        flex items-start p-4 bg-white dark:bg-gray-800 border-l-4 border-purple-500 shadow-lg rounded-lg
        ${t.visible ? 'animate-enter' : 'animate-leave'}
      `}>
        <HelpCircle className="w-5 h-5 text-purple-500 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          {title && (
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {message}
          </p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="ml-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ), { ...defaultToastOptions, duration: 6000, ...toastOptions });
  }

  /**
   * Promocionar toast loading a success
   */
  static promiseToSuccess(loadingToastId: string, options: ToastAlertOptions) {
    toast.dismiss(loadingToastId);
    this.success(options);
  }

  /**
   * Promocionar toast loading a error
   */
  static promiseToError(loadingToastId: string, options: ToastAlertOptions) {
    toast.dismiss(loadingToastId);
    this.error(options);
  }

  /**
   * Cerrar todos los toasts
   */
  static dismissAll() {
    toast.dismiss();
  }

  /**
   * Cerrar un toast específico
   */
  static dismiss(toastId: string) {
    toast.dismiss(toastId);
  }
}

// Componente proveedor que debe envolver la aplicación
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          className: '',
          duration: 4000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0,
            margin: 0,
          },
        }}
      />
      
      {/* Estilos para las animaciones */}
      <style>{`
        @keyframes enter {
          0% {
            transform: translate3d(0, -200%, 0) scale(0.6);
            opacity: 0.5;
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes leave {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate3d(0, -200%, 0) scale(0.6);
            opacity: 0.5;
          }
        }
        
        .animate-enter {
          animation: enter 0.35s cubic-bezier(0.21, 1.02, 0.73, 1) forwards;
        }
        
        .animate-leave {
          animation: leave 0.4s cubic-bezier(0.06, 0.71, 0.55, 1) forwards;
        }
      `}</style>
    </>
  );
};

export default ToastAlerts; 
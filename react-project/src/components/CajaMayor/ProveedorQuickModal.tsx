// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Building2 } from 'lucide-react';
import ToastAlerts from '../UI/ToastAlerts';

interface ProveedorQuickModalProps {
  isOpen: boolean;
  rucInicial?: string;
  onClose: () => void;
  onSaved: (proveedor: ProveedorCreado) => void;
  onCrearProveedor: (data: CrearProveedorData) => Promise<ProveedorCreado>;
}

export interface CrearProveedorData {
  ruc: string;
  razonSocial: string;
  direccion: string;
  email?: string;
}

export interface ProveedorCreado {
  idProveedor: number;
  ruc: string;
  razonSocial: string;
  direccion: string;
  email?: string;
}

const ProveedorQuickModal: React.FC<ProveedorQuickModalProps> = ({
  isOpen,
  rucInicial = '',
  onClose,
  onSaved,
  onCrearProveedor,
}) => {
  const [loading, setLoading] = useState(false);
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRuc(rucInicial || '');
      setRazonSocial('');
      setDireccion('');
      setEmail('');
    }
  }, [isOpen, rucInicial]);

  const validarRuc = (rucValue: string): boolean => {
    const rucClean = rucValue.replace(/\s/g, '');
    if (rucClean.length !== 11) return false;
    if (!/^\d{11}$/.test(rucClean)) return false;
    const prefijo = rucClean.substring(0, 2);
    return ['10', '15', '17', '20'].includes(prefijo);
  };

  const handleSubmit = async () => {
    const rucClean = ruc.trim();
    const razonSocialClean = razonSocial.trim();
    const direccionClean = direccion.trim();
    const emailClean = email.trim();

    if (!rucClean || !razonSocialClean || !direccionClean) {
      ToastAlerts.warning({
        title: 'Campos requeridos',
        message: 'RUC, Razón Social y Dirección son obligatorios.',
      });
      return;
    }

    if (!validarRuc(rucClean)) {
      ToastAlerts.warning({
        title: 'RUC inválido',
        message: 'El RUC debe tener 11 dígitos y comenzar con 10, 15, 17 o 20.',
      });
      return;
    }

    if (emailClean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      ToastAlerts.warning({
        title: 'Email inválido',
        message: 'Ingrese un email válido o déjelo vacío.',
      });
      return;
    }

    try {
      setLoading(true);
      const proveedorCreado = await onCrearProveedor({
        ruc: rucClean,
        razonSocial: razonSocialClean,
        direccion: direccionClean,
        // Si email es vacío o null, enviar '---' por defecto
        email: emailClean || '---',
      });
      ToastAlerts.success({
        title: 'Proveedor creado',
        message: `${razonSocialClean} registrado correctamente.`,
      });
      onSaved(proveedorCreado);
    } catch (e: any) {
      ToastAlerts.error({
        title: 'Error',
        message: e?.message || 'No se pudo crear el proveedor.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-blue-600 text-white rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Nuevo Proveedor</h3>
              </div>
              <button
                className="p-1.5 rounded-md hover:bg-blue-700 transition-colors"
                onClick={onClose}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  RUC <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={11}
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ej: 20512345678"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Razón Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  placeholder="Nombre de la empresa"
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  placeholder="Dirección fiscal"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                  placeholder="correo@empresa.com (opcional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <motion.button
                onClick={onClose}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                <X className="w-4 h-4 mr-1 inline" />
                Cancelar
              </motion.button>
              <motion.button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1 inline" />
                    Guardar
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProveedorQuickModal;

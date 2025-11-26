import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { 
  cashClosingService,
  CashClosingDetailPagedItem,
  CashClosingMovementRequest
} from '../../services/CashClosingService';
import ToastAlerts from './ToastAlerts';

interface CashClosingDetailModalProps {
  isOpen: boolean;
  operation: 'INSERT' | 'UPDATE';
  idCierreCaja: number;
  detalle?: CashClosingDetailPagedItem; // Para UPDATE
  fechaInicio?: string; // Fecha mínima del período
  fechaFin?: string; // Fecha máxima del período
  onClose: () => void;
  onSuccess: (operacion?: string, monto?: number, esEgreso?: boolean, detallePrevio?: CashClosingDetailPagedItem) => void; // Callback para recargar datos
}

// Modelo unificado basado en la estructura de BD exacta
interface MovimientoFormData {
  // Campos básicos siempre requeridos
  d_FechaVenta: string;               // d_FechaVenta (date)
  I_EsEgreso: boolean;                // I_EsEgreso (bit)
  I_TipoMovimiento: number;           // I_TipoMovimiento (int)
  v_MovimientoNombre: string;         // v_MovimientoNombre (varchar(150))
  I_AuthorizedBy?: number;            // I_AuthorizedBy (int)
  v_UserName?: string;                // v_UserName (varchar(250))
  d_MontoVenta: number;               // d_MontoVenta (decimal(18,2))
  v_Description: string;              // v_Description (varchar(250))
  
  // Campos específicos para egresos/comprobantes
  I_TipoDocumento?: number;           // I_TipoDocumento (int)
  v_NombreTipoDocumento?: string;     // v_NombreTipoDocumento (varchar(100))
  d_FechaComprobante?: string;        // d_FechaComprobante (date)
  v_Serie?: string;                   // v_Serie (varchar(50))
  v_Correlativo?: string;             // v_Correlativo (varchar(50))
  v_Proveedor?: string;               // v_Proveedor (varchar(250))
  d_IGV?: number;                     // d_IGV (decimal(18,2))
  d_SubTotal?: number;                // d_SubTotal (decimal(18,2))
  v_ReceivedBy?: string;              // v_ReceivedBy (varchar(250))
  
  // Campos específicos para ingresos
  v_TipoOperacion?: string;           // v_TipoOperacion (varchar(20))
  
  // Control de comprobante (solo para UI)
  tieneComprobante: boolean;          // Control para mostrar/ocultar campos de comprobante
}

type TipoMovimiento = 'ingreso' | 'egreso';

const CashClosingDetailModal: React.FC<CashClosingDetailModalProps> = ({
  isOpen,
  operation,
  idCierreCaja,
  detalle,
  fechaInicio,
  fechaFin,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TipoMovimiento>('egreso');
  const [formData, setFormData] = useState<MovimientoFormData>({
    d_FechaVenta: '',
    I_EsEgreso: true,
    I_TipoMovimiento: 1,
    v_MovimientoNombre: '',
    I_AuthorizedBy: undefined,
    v_UserName: undefined,
    d_MontoVenta: 0,
    v_Description: '',
    d_SubTotal: 0,
    tieneComprobante: false
  });

  // Configuraciones y opciones
  const tiposMovimientoEgreso = [
    { value: 1, label: 'MOVILIDAD', nombre: 'MOVILIDAD' },
    { value: 2, label: 'ANULACION DE COMPROBANTE', nombre: 'ANULACION DE COMPROBANTE' },
    { value: 3, label: 'ANULACION DE COMPROBANTE', nombre: 'ANULACION DE COMPROBANTE' },
    { value: 4, label: 'PAGO A ACREEDORES', nombre: 'PAGO A ACREEDORES' },
    { value: 5, label: 'REFRIGERIO', nombre: 'REFRIGERIO' },
    { value: 6, label: 'VIATICOS', nombre: 'VIATICOS' },
    { value: 7, label: 'ADELANTOS', nombre: 'ADELANTOS' },
    { value: 8, label: 'SALIDA DE CAJA', nombre: 'SALIDA DE CAJA' }
  ];

  const tiposDocumento = [
    { value: 1, label: 'FACTURA', nombre: 'FACTURA' },
    { value: 2, label: 'BOLETA DE VENTA', nombre: 'BOLETA DE VENTA' },
    { value: 3, label: 'RECIBO POR HONORARIOS', nombre: 'RECIBO POR HONORARIOS' },
    { value: 4, label: 'NOTA DE CRÉDITO', nombre: 'NOTA DE CRÉDITO' },
    { value: 5, label: 'NOTA DE DÉBITO', nombre: 'NOTA DE DÉBITO' },
    { value: 6, label: 'RECIBO DE COMPRA', nombre: 'RECIBO DE COMPRA' },
    { value: 7, label: 'OTROS DOCUMENTOS', nombre: 'OTROS DOCUMENTOS' }
  ];

  const tiposIngreso = [
    { value: 1, label: 'POR PAGO DE FACTURA', nombre: 'POR PAGO DE FACTURA' },
    { value: 2, label: 'POR PAGO DE BOLETA', nombre: 'POR PAGO DE BOLETA' },
    { value: 3, label: 'POR COBRO DE DOCUMENTO', nombre: 'POR COBRO DE DOCUMENTO' },
    { value: 4, label: 'CAJA DIA ANTERIOR', nombre: 'CAJA DIA ANTERIOR' },
    { value: 5, label: 'TRANSFERENCIA O PRESTAMO', nombre: 'TRANSFERENCIA O PRESTAMO' }
  ];

  const usuariosAutorizados = [
    { id: 168, nombre: 'maruja.medina', label: 'Maruja Medina' },
    { id: 169, nombre: 'rocio.medina', label: 'Rocío Medina' },
    { id: 175, nombre: 'cesar.medina', label: 'César Medina' },
    { id: 196, nombre: 'ronald.medina', label: 'Ronald Medina' }
  ];

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (operation === 'UPDATE' && detalle) {
        // Para UPDATE, cargar datos existentes - mapear desde propiedades del servicio
        setActiveTab(detalle.esEgreso ? 'egreso' : 'ingreso');
        setFormData({
          d_FechaVenta: detalle.fechaVenta.split('T')[0],
          I_EsEgreso: detalle.esEgreso,
          I_TipoMovimiento: detalle.tipoDocumento || 1,
          v_MovimientoNombre: detalle.nombreTipoDocumento || '',
          I_AuthorizedBy: undefined, // No viene del servicio actual
          v_UserName: undefined,
          d_MontoVenta: detalle.montoVenta,
          v_Description: detalle.concepto || '',
          I_TipoDocumento: detalle.esEgreso ? detalle.tipoDocumento : undefined,
          v_NombreTipoDocumento: detalle.esEgreso ? detalle.nombreTipoDocumento : undefined,
          v_TipoOperacion: !detalle.esEgreso ? detalle.tipoOperacion : undefined,
          d_SubTotal: 0,
          tieneComprobante: false
        });
      } else {
        // Para INSERT, resetear formulario
        const defaultDate = fechaInicio 
          ? fechaInicio.split('T')[0] 
          : new Date().toISOString().split('T')[0];
          
        setFormData({
          d_FechaVenta: defaultDate,
          I_EsEgreso: activeTab === 'egreso',
          I_TipoMovimiento: activeTab === 'egreso' ? 500 : 1,
          v_MovimientoNombre: '',
          I_AuthorizedBy: undefined,
          v_UserName: undefined,
          d_MontoVenta: 0,
          v_Description: '',
          d_SubTotal: 0,
          tieneComprobante: false
        });
      }
    }
  }, [isOpen, operation, detalle, fechaInicio, activeTab]);

  // Cambiar tab y actualizar campos relacionados
  const handleTabChange = (tab: TipoMovimiento) => {
    // Ahora permitir cambio de tab en UPDATE también
    
    setActiveTab(tab);
    setFormData(prev => ({
      ...prev,
      I_EsEgreso: tab === 'egreso',
      I_TipoMovimiento: tab === 'egreso' ? 1 : 1, // Inicializar con el primer tipo de cada categoría
      // Limpiar campos específicos del tipo anterior
      I_TipoDocumento: tab === 'egreso' ? undefined : undefined,
      v_NombreTipoDocumento: tab === 'egreso' ? undefined : undefined,
      v_MovimientoNombre: tab === 'egreso' ? 'MOVILIDAD' : 'POR PAGO DE FACTURA',
      v_TipoOperacion: tab === 'ingreso' ? 'INGRESO' : undefined,
      // Mantener campos comunes
      d_MontoVenta: prev.d_MontoVenta,
      d_FechaVenta: prev.d_FechaVenta
    }));
  };

  // Obtener fechas formateadas para el input date
  const getMinDate = (): string => {
    if (fechaInicio) return fechaInicio.split('T')[0];
    return '';
  };

  const getMaxDate = (): string => {
    if (fechaFin) return fechaFin.split('T')[0];
    return '';
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field: keyof MovimientoFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-actualizar nombre del tipo de movimiento para egresos e ingresos
    if (field === 'I_TipoMovimiento') {
      if (activeTab === 'egreso') {
        const tipo = tiposMovimientoEgreso.find(t => t.value === value);
        if (tipo) {
          setFormData(prev => ({ 
            ...prev, 
            I_TipoMovimiento: value as number,
            v_MovimientoNombre: tipo.nombre 
          }));
        }
      } else if (activeTab === 'ingreso') {
        const tipo = tiposIngreso.find(t => t.value === value);
        if (tipo) {
          setFormData(prev => ({ 
            ...prev, 
            I_TipoMovimiento: value as number,
            v_MovimientoNombre: tipo.nombre 
          }));
        }
      }
    }

    // Auto-actualizar nombre del tipo de documento
    if (field === 'I_TipoDocumento') {
      const tipoDoc = tiposDocumento.find(t => t.value === value);
      if (tipoDoc) {
        setFormData(prev => ({ 
          ...prev, 
          I_TipoDocumento: value as number,
          v_NombreTipoDocumento: tipoDoc.nombre 
        }));
      }
    }

    // Auto-actualizar nombre del usuario autorizado
    if (field === 'I_AuthorizedBy') {
      const usuario = usuariosAutorizados.find(u => u.id === value);
      if (usuario) {
        setFormData(prev => ({ 
          ...prev, 
          I_AuthorizedBy: value as number,
          v_UserName: usuario.nombre 
        }));
      }
    }

    // Cálculos automáticos para comprobantes cuando cambia el monto
    if (field === 'd_MontoVenta' && operation === 'INSERT') {
      const monto = value as number;
      const igv = Math.round(monto * 0.18 * 100) / 100; // 18% redondeado a 2 decimales
      const subTotal = Math.round((monto - igv) * 100) / 100; // SubTotal redondeado a 2 decimales
      
      setFormData(prev => ({ 
        ...prev, 
        d_MontoVenta: monto,
        d_IGV: igv,
        d_SubTotal: subTotal
      }));
    }
  };

  // Validar formulario - mismas validaciones para INSERT y UPDATE
  const isFormValid = () => {
    // Validaciones básicas para ambos modos
    const basicValidation = formData.d_FechaVenta.trim() !== '' && 
                           formData.d_MontoVenta > 0 && 
                           formData.v_Description.trim() !== '';
    
    if (!basicValidation) return false;
    
    // Validación de fecha dentro del período
    if (fechaInicio && fechaFin) {
      const selectedDate = new Date(formData.d_FechaVenta);
      const minDate = new Date(fechaInicio.split('T')[0]);
      const maxDate = new Date(fechaFin.split('T')[0]);
      
      if (selectedDate < minDate || selectedDate > maxDate) return false;
    }
    
    return true;
  };

  // Crear objeto para envío al backend
  const createBackendObject = (): Record<string, string | number | boolean | null> => {
    const baseObject = {
      // Campos siempre presentes
      idCierreCaja: idCierreCaja, // Siempre enviar el idCierreCaja para INSERT y UPDATE
      idCierreCajaDetalle: operation === 'UPDATE' ? (detalle?.idCierreCajaDetalle || 0) : 0,
      d_FechaVenta: `${formData.d_FechaVenta}T00:00:00`,
      I_EsEgreso: formData.I_EsEgreso,
      I_TipoMovimiento: formData.I_TipoMovimiento,
      d_MontoVenta: formData.d_MontoVenta,
      v_Description: formData.v_Description,
      v_ReceivedBy: formData.v_ReceivedBy || null,
      // Campo específico para UPDATE
      ...(operation === 'UPDATE' && { Eliminado: 0 }),
      
      // Campos específicos según el tipo
      ...(formData.I_EsEgreso ? {
        // Campos de egreso
        v_MovimientoNombre: tiposMovimientoEgreso.find(t => t.value === formData.I_TipoMovimiento)?.label || null,
        I_AuthorizedBy: formData.I_AuthorizedBy || null,
        v_UserName: formData.v_UserName || null,
        I_TipoDocumento: formData.I_TipoDocumento || null,
        v_NombreTipoDocumento: formData.v_NombreTipoDocumento || null,
        v_TipoOperacion: 'EGRESO',
        // Campos de comprobante (si aplica)
        ...(formData.tieneComprobante ? {
          d_FechaComprobante: formData.d_FechaComprobante ? `${formData.d_FechaComprobante}T00:00:00` : null,
          v_Serie: formData.v_Serie || null,
          v_Correlativo: formData.v_Correlativo || null,
          v_Proveedor: formData.v_Proveedor || null,
          d_IGV: formData.d_IGV || 0,
          d_SubTotal: formData.d_SubTotal || 0
        } : {
          d_FechaComprobante: null,
          v_Serie: null,
          v_Correlativo: null,
          v_Proveedor: null,
          d_IGV: null,
          d_SubTotal: null
        })
      } : {
        // Campos de ingreso
        v_MovimientoNombre: tiposIngreso.find(t => t.value === formData.I_TipoMovimiento)?.label || null,
        I_AuthorizedBy: null,
        v_UserName: null,
        I_TipoDocumento: null,
        v_NombreTipoDocumento: null,
        v_TipoOperacion: formData.v_TipoOperacion || 'INGRESO',
        // Nullear campos de comprobante para ingresos
        d_FechaComprobante: null,
        v_Serie: null,
        v_Correlativo: null,
        v_Proveedor: null,
        d_IGV: null,
        d_SubTotal: null
      })
    };

    return baseObject;
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    if (!isFormValid()) {
      // Verificar específicamente si es error de fecha
      if (fechaInicio && fechaFin) {
        const selectedDate = new Date(formData.d_FechaVenta);
        const minDate = new Date(fechaInicio.split('T')[0]);
        const maxDate = new Date(fechaFin.split('T')[0]);
        
        if (selectedDate < minDate || selectedDate > maxDate) {
          ToastAlerts.warning({
            title: "Fecha fuera del período",
            message: `La fecha debe estar entre ${minDate.toLocaleDateString()} y ${maxDate.toLocaleDateString()}`
          });
          return;
        }
      }
      
      ToastAlerts.warning({
        title: "Campos incompletos",
        message: "Por favor complete todos los campos obligatorios"
      });
      return;
    }

    try {
      setLoading(true);
      const loadingId = ToastAlerts.loading(
        operation === 'INSERT' ? "Creando movimiento..." : "Actualizando movimiento..."
      );

      // Crear objeto para backend
      const backendObject = createBackendObject();
      
      // LOG PARA PRUEBAS BACKEND
      console.log('🚀 OBJETO PARA BACKEND:', backendObject);
      console.log('📋 TIPO DE MOVIMIENTO:', activeTab.toUpperCase());
      console.log(' MONTO:', formData.d_MontoVenta);
      console.log('📝 DESCRIPCIÓN:', formData.v_Description);

      // Usar el objeto completo para ambos modos INSERT y UPDATE
      const movementRequest: CashClosingMovementRequest = backendObject as unknown as CashClosingMovementRequest;
      
      console.log('📋 ENVIANDO OBJETO COMPLETO AL BACKEND:', movementRequest);
      console.log('🔄 OPERACIÓN:', operation);
      
      if (operation === 'INSERT') {
        await cashClosingService.createCashClosingMovement(movementRequest);
      } else if (operation === 'UPDATE' && detalle) {
        // Para UPDATE, usar el endpoint PUT específico con el objeto completo
        await cashClosingService.updateCashClosingMovement(detalle.idCierreCajaDetalle, movementRequest);
      }

      ToastAlerts.promiseToSuccess(loadingId, {
        title: operation === 'INSERT' ? "¡Movimiento creado!" : "¡Movimiento actualizado!",
        message: operation === 'INSERT' 
          ? `El ${activeTab} se creó correctamente`
          : "El movimiento se actualizó correctamente"
      });

      // Llamar al callback onSuccess con los parámetros necesarios para actualizar totales
      onSuccess(operation, formData.d_MontoVenta, formData.I_EsEgreso, detalle);
      onClose();
    } catch (err) {
      const errorLoadingId = ToastAlerts.loading("");
      ToastAlerts.promiseToError(errorLoadingId, {
        title: "Error",
        message: operation === 'INSERT' 
          ? "No se pudo crear el movimiento"
          : "No se pudo actualizar el movimiento"
      });
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-4 border-b border-primary-dark">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">
                {operation === 'INSERT' ? 'Agregar Movimiento' : 'Editar Movimiento'}
              </h2>
              <p className="text-blue-100 text-sm">
                {operation === 'INSERT' 
                  ? 'Crear nuevo movimiento en el cierre de caja'
                  : 'Modificar monto del movimiento'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido del modal */}
        <div className="p-4 max-h-[75vh] overflow-y-auto">
          {/* Información del período para INSERT */}
          {operation === 'INSERT' && fechaInicio && fechaFin && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400 text-lg">📅</span>
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Período del Cierre de Caja
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {new Date(fechaInicio).toLocaleDateString()} - {new Date(fechaFin).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs para tipo de movimiento - disponible en INSERT y UPDATE */}
          {(
            <div className="mb-6">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => handleTabChange('egreso')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'egreso'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400'
                  }`}
                  disabled={loading}
                >
                  <span className="text-lg">💸</span>
                  Egreso
                </button>
                <button
                  onClick={() => handleTabChange('ingreso')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === 'ingreso'
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400'
                  }`}
                  disabled={loading}
                >
                  <span className="text-lg">💰</span>
                  Ingreso
                </button>
              </div>
            </div>
          )}



          <div className="space-y-4">
            {/* Formulario completo para INSERT y UPDATE */}
              <>
                {/* Fecha y Monto en una fila horizontal */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fecha <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.d_FechaVenta}
                      onChange={(e) => handleInputChange('d_FechaVenta', e.target.value)}
                      min={getMinDate()}
                      max={getMaxDate()}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Monto <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        S/
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.d_MontoVenta}
                        onChange={(e) => handleInputChange('d_MontoVenta', parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="0.00"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Descripción del movimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {activeTab === 'egreso' ? 'Descripción del Gasto' : 'Descripción del Ingreso'} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.v_Description}
                    onChange={(e) => handleInputChange('v_Description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    placeholder={activeTab === 'egreso' ? 'Describe el gasto realizado...' : 'Describe el ingreso recibido...'}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Tipo de movimiento y Autorizado Por */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {activeTab === 'egreso' ? 'Tipo de Egreso' : 'Tipo de Ingreso'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.I_TipoMovimiento}
                      onChange={(e) => handleInputChange('I_TipoMovimiento', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={loading}
                    >
                      {activeTab === 'egreso' 
                        ? tiposMovimientoEgreso.map(tipo => (
                            <option key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </option>
                          ))
                        : tiposIngreso.map(tipo => (
                            <option key={tipo.value} value={tipo.value}>
                              {tipo.label}
                            </option>
                          ))
                      }
                    </select>
                  </div>

                  {/* Autorizado Por - solo para egresos */}
                  {activeTab === 'egreso' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Autorizado Por
                      </label>
                      <select
                        value={formData.I_AuthorizedBy || ''}
                        onChange={(e) => handleInputChange('I_AuthorizedBy', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={loading}
                      >
                        <option value="">Seleccionar autorizado...</option>
                        {usuariosAutorizados.map(usuario => (
                          <option key={usuario.id} value={usuario.id}>
                            {usuario.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Recibido Por - para ambos tipos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {activeTab === 'egreso' ? 'Recibido Por' : 'Recibido Por'}
                  </label>
                  <input
                    type="text"
                    maxLength={250}
                    value={formData.v_ReceivedBy || ''}
                    onChange={(e) => handleInputChange('v_ReceivedBy', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={activeTab === 'egreso' ? 'Persona que recibe' : 'Persona que entrega el ingreso'}
                    disabled={loading}
                  />
                </div>

                {/* Control de comprobante - solo para egresos */}
                {activeTab === 'egreso' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Comprobante
                      </label>
                      <div className="flex gap-6">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="comprobante"
                            checked={!formData.tieneComprobante}
                            onChange={() => handleInputChange('tieneComprobante', false)}
                            className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                            disabled={loading}
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Sin comprobante</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="comprobante"
                            checked={formData.tieneComprobante}
                            onChange={() => handleInputChange('tieneComprobante', true)}
                            className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                            disabled={loading}
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Con comprobante</span>
                        </label>
                      </div>
                    </div>

                    {/* Campos de comprobante - solo si tieneComprobante es true */}
                    {formData.tieneComprobante && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Descripción del Comprobante
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Tipo de Documento
                            </label>
                            <select
                              value={formData.I_TipoDocumento || ''}
                              onChange={(e) => handleInputChange('I_TipoDocumento', Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                              disabled={loading}
                            >
                              <option value="">Seleccionar tipo...</option>
                              {tiposDocumento.map(tipo => (
                                <option key={tipo.value} value={tipo.value}>
                                  {tipo.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Fecha del Comprobante
                            </label>
                            <input
                              type="date"
                              value={formData.d_FechaComprobante || ''}
                              onChange={(e) => handleInputChange('d_FechaComprobante', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                              disabled={loading}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-6 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Serie
                            </label>
                            <input
                              type="text"
                              maxLength={5}
                              value={formData.v_Serie || ''}
                              onChange={(e) => handleInputChange('v_Serie', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Serie"
                              disabled={loading}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Número
                            </label>
                            <input
                              type="text"
                              maxLength={8}
                              value={formData.v_Correlativo || ''}
                              onChange={(e) => handleInputChange('v_Correlativo', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Número"
                              disabled={loading}
                            />
                          </div>
                          <div className="col-span-4">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Proveedor
                            </label>
                            <input
                              type="text"
                              value={formData.v_Proveedor || ''}
                              onChange={(e) => handleInputChange('v_Proveedor', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Nombre del proveedor"
                              disabled={loading}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Valor
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.d_MontoVenta || 0}
                              onChange={(e) => handleInputChange('d_MontoVenta', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                              disabled={operation === 'INSERT' || loading}
                              readOnly={operation === 'INSERT'}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              IGV
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.d_IGV || 0}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white"
                              disabled={true}
                              readOnly={true}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Sub Total
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.d_SubTotal || 0}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white"
                              disabled={true}
                              readOnly={true}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Información específica para ingresos */}
                {activeTab === 'ingreso' && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-600 dark:text-green-400 text-lg">💰</span>
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                        Registro de Ingreso
                      </h4>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Este movimiento se registrará como un ingreso de caja. Los ingresos no requieren comprobante.
                    </p>
                  </div>
                )}
              </>
            )
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className={`px-4 py-2 rounded-lg text-white font-medium transition-colors flex items-center gap-2 ${
                isFormValid() && !loading
                  ? 'bg-primary hover:bg-primary-dark'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={!isFormValid() || loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {operation === 'INSERT' ? 'Creando...' : 'Actualizando...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {operation === 'INSERT' 
                    ? `Crear ${activeTab === 'egreso' ? 'Egreso' : 'Ingreso'}` 
                    : `Actualizar ${activeTab === 'egreso' ? 'Egreso' : 'Ingreso'}`
                  }
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CashClosingDetailModal; 
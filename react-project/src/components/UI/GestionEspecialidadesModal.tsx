import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Plus, Edit, Trash2, Search, Save, 
  ChevronLeft, ChevronRight, Stethoscope
} from 'lucide-react';
import { 
  especialidadesMedicasService,
  EspecialidadResponse,
  CreateEspecialidadRequest,
  UpdateEspecialidadRequest,
  SearchEspecialidadesRequest
} from '../../services/EspecialidadesMedicasService';
import ToastAlerts from './ToastAlerts';

interface GestionEspecialidadesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EspecialidadFormData {
  nombreEspecialidad: string;
  porcentajePago: number;
}

type ModalMode = 'list' | 'create' | 'edit';

// Componente de paginación local
interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const GestionEspecialidadesModal: React.FC<GestionEspecialidadesModalProps> = ({
  isOpen,
  onClose
}) => {
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('list');
  const [especialidades, setEspecialidades] = useState<EspecialidadResponse[]>([]);
  const [filteredEspecialidades, setFilteredEspecialidades] = useState<EspecialidadResponse[]>([]);
  
  // Estados para formulario
  const [formData, setFormData] = useState<EspecialidadFormData>({
    nombreEspecialidad: '',
    porcentajePago: 0
  });
  const [selectedEspecialidad, setSelectedEspecialidad] = useState<EspecialidadResponse | null>(null);
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [porcentajeMin, setPorcentajeMin] = useState<number | undefined>(undefined);
  const [porcentajeMax, setPorcentajeMax] = useState<number | undefined>(undefined);
  
  // Estados para paginación
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  });

  // Cargar especialidades al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadEspecialidades();
    }
  }, [isOpen]);

  // Aplicar filtros y paginación cuando cambien los datos o filtros
  useEffect(() => {
    applyFiltersAndPagination();
  }, [especialidades, searchTerm, includeDeleted, porcentajeMin, porcentajeMax, pagination.currentPage, pagination.pageSize]);

  // Cargar todas las especialidades
  const loadEspecialidades = async () => {
    try {
      setLoading(true);
      const loadingId = ToastAlerts.loading("Cargando especialidades...");
      
      const response = await especialidadesMedicasService.getEspecialidades({
        includeDeleted: includeDeleted
      });
      
      setEspecialidades(response || []);
      
      ToastAlerts.promiseToSuccess(loadingId, {
        title: "Especialidades cargadas",
        message: `Se cargaron ${response?.length || 0} especialidades`,
        duration: 2000
      });
    } catch (error) {
      const errorLoadingId = ToastAlerts.loading("");
      ToastAlerts.promiseToError(errorLoadingId, {
        title: "Error",
        message: "No se pudieron cargar las especialidades"
      });
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros y paginación en el frontend
  const applyFiltersAndPagination = () => {
    let filtered = [...especialidades];

    // Filtro por término de búsqueda
    if (searchTerm.trim()) {
      filtered = filtered.filter(esp => 
        esp.nombreEspecialidad?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por rango de porcentaje
    if (porcentajeMin !== undefined) {
      filtered = filtered.filter(esp => esp.porcentajePago >= porcentajeMin);
    }
    if (porcentajeMax !== undefined) {
      filtered = filtered.filter(esp => esp.porcentajePago <= porcentajeMax);
    }

    // Filtro por eliminados
    if (!includeDeleted) {
      filtered = filtered.filter(esp => !esp.isDeleted);
    }

    // Calcular paginación
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pagination.pageSize);
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    const paginatedData = filtered.slice(startIndex, endIndex);

    setFilteredEspecialidades(paginatedData);
    setPagination(prev => ({
      ...prev,
      totalItems,
      totalPages
    }));
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      nombreEspecialidad: '',
      porcentajePago: 0
    });
    setSelectedEspecialidad(null);
  };

  // Abrir modal de creación
  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
  };

  // Abrir modal de edición
  const openEditModal = (especialidad: EspecialidadResponse) => {
    setFormData({
      nombreEspecialidad: especialidad.nombreEspecialidad || '',
      porcentajePago: especialidad.porcentajePago
    });
    setSelectedEspecialidad(especialidad);
    setModalMode('edit');
  };

  // Volver a la lista
  const backToList = () => {
    resetForm();
    setModalMode('list');
  };

  // Validar formulario
  const isFormValid = () => {
    return formData.nombreEspecialidad.trim() !== '' && 
           formData.nombreEspecialidad.trim().length >= 3 &&
           formData.porcentajePago >= 0 && 
           formData.porcentajePago <= 100;
  };

  // Crear especialidad
  const handleCreate = async () => {
    if (!isFormValid()) {
      ToastAlerts.warning({
        title: "Campos incompletos",
        message: "Por favor complete todos los campos correctamente"
      });
      return;
    }

    try {
      setLoading(true);
      const loadingId = ToastAlerts.loading("Creando especialidad...");

      // Obtener usuario actual
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const userId = userData.systemUserId;

      const request: CreateEspecialidadRequest = {
        nombreEspecialidad: formData.nombreEspecialidad.trim(),
        porcentajePago: formData.porcentajePago,
        userId: userId
      };

      await especialidadesMedicasService.createEspecialidad(request);

      ToastAlerts.promiseToSuccess(loadingId, {
        title: "¡Especialidad creada!",
        message: `La especialidad "${formData.nombreEspecialidad}" se creó correctamente`
      });

      // Recargar lista y volver
      await loadEspecialidades();
      backToList();
    } catch (error) {
      const errorLoadingId = ToastAlerts.loading("");
      ToastAlerts.promiseToError(errorLoadingId, {
        title: "Error",
        message: "No se pudo crear la especialidad"
      });
    } finally {
      setLoading(false);
    }
  };

  // Actualizar especialidad
  const handleUpdate = async () => {
    if (!isFormValid() || !selectedEspecialidad) {
      ToastAlerts.warning({
        title: "Campos incompletos",
        message: "Por favor complete todos los campos correctamente"
      });
      return;
    }

    try {
      setLoading(true);
      const loadingId = ToastAlerts.loading("Actualizando especialidad...");

      // Obtener usuario actual
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const userId = userData.systemUserId;

      const request: UpdateEspecialidadRequest = {
        nombreEspecialidad: formData.nombreEspecialidad.trim(),
        porcentajePago: formData.porcentajePago,
        userId: userId
      };

      await especialidadesMedicasService.updateEspecialidad(selectedEspecialidad.id, request);

      ToastAlerts.promiseToSuccess(loadingId, {
        title: "¡Especialidad actualizada!",
        message: `La especialidad "${formData.nombreEspecialidad}" se actualizó correctamente`
      });

      // Recargar lista y volver
      await loadEspecialidades();
      backToList();
    } catch (error) {
      const errorLoadingId = ToastAlerts.loading("");
      ToastAlerts.promiseToError(errorLoadingId, {
        title: "Error",
        message: "No se pudo actualizar la especialidad"
      });
    } finally {
      setLoading(false);
    }
  };

  // Eliminar especialidad
  const handleDelete = async (especialidad: EspecialidadResponse) => {
    const confirmed = window.confirm(
      `¿Está seguro de eliminar la especialidad "${especialidad.nombreEspecialidad}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const loadingId = ToastAlerts.loading("Eliminando especialidad...");

      // Obtener usuario actual
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const userId = userData.systemUserId;

      await especialidadesMedicasService.deleteEspecialidad(especialidad.id, {
        userId: userId
      });

      ToastAlerts.promiseToSuccess(loadingId, {
        title: "¡Especialidad eliminada!",
        message: `La especialidad "${especialidad.nombreEspecialidad}" se eliminó correctamente`
      });

      // Recargar lista
      await loadEspecialidades();
    } catch (error) {
      const errorLoadingId = ToastAlerts.loading("");
      ToastAlerts.promiseToError(errorLoadingId, {
        title: "Error",
        message: "No se pudo eliminar la especialidad"
      });
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de página
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  // Limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setPorcentajeMin(undefined);
    setPorcentajeMax(undefined);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
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
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-4 border-b border-primary-dark">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {modalMode !== 'list' && (
                <button
                  onClick={backToList}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                  disabled={loading}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Stethoscope className="w-6 h-6" />
                  {modalMode === 'list' && 'Gestión de Especialidades Médicas'}
                  {modalMode === 'create' && 'Agregar Nueva Especialidad'}
                  {modalMode === 'edit' && 'Editar Especialidad'}
                </h2>
                <p className="text-blue-100 text-sm">
                  {modalMode === 'list' && 'Administrar especialidades médicas y porcentajes de pago'}
                  {modalMode === 'create' && 'Crear una nueva especialidad médica'}
                  {modalMode === 'edit' && 'Modificar datos de la especialidad'}
                </p>
              </div>
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
          {modalMode === 'list' ? (
            <>
              {/* Controles de búsqueda y filtros */}
              <div className="mb-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Buscar especialidad
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Nombre de especialidad..."
                        disabled={loading}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Porcentaje mínimo
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={porcentajeMin || ''}
                      onChange={(e) => setPorcentajeMin(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="0.0"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Porcentaje máximo
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={porcentajeMax || ''}
                      onChange={(e) => setPorcentajeMax(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="100.0"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Opciones
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeDeleted}
                          onChange={(e) => setIncludeDeleted(e.target.checked)}
                          className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary"
                          disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Incluir eliminados
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    disabled={loading}
                  >
                    Limpiar filtros
                  </button>
                  
                  <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Especialidad
                  </button>
                </div>
              </div>

              {/* Tabla de especialidades */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Especialidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Porcentaje de Pago
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Fecha Creación
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          </td>
                        </tr>
                      ) : filteredEspecialidades.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            No se encontraron especialidades
                          </td>
                        </tr>
                      ) : (
                        filteredEspecialidades.map((especialidad) => (
                          <tr
                            key={especialidad.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {especialidad.nombreEspecialidad}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {especialidad.porcentajePago.toFixed(2)}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                especialidad.isDeleted 
                                  ? 'text-red-600 bg-red-100' 
                                  : 'text-green-600 bg-green-100'
                              }`}>
                                {especialidad.isDeleted ? 'Eliminado' : 'Activo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(especialidad.createdDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditModal(especialidad)}
                                  className="text-primary hover:text-primary-dark"
                                  disabled={loading}
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                {!especialidad.isDeleted && (
                                  <button
                                    onClick={() => handleDelete(especialidad)}
                                    className="text-red-600 hover:text-red-800"
                                    disabled={loading}
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                {pagination.totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Mostrando {((pagination.currentPage - 1) * pagination.pageSize) + 1} a {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} de {pagination.totalItems} registros
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={pagination.currentPage === 1 || loading}
                          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            disabled={loading}
                            className={`px-3 py-1 rounded-lg text-sm ${
                              page === pagination.currentPage
                                ? 'bg-primary text-white'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={pagination.currentPage === pagination.totalPages || loading}
                          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Formulario de creación/edición */
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      {modalMode === 'create' ? 'Nueva Especialidad Médica' : 'Editar Especialidad Médica'}
                    </h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {modalMode === 'create' 
                        ? 'Complete los datos para crear una nueva especialidad médica'
                        : 'Modifique los datos de la especialidad médica'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre de la Especialidad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={formData.nombreEspecialidad}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombreEspecialidad: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Ej: Cardiología, Neurología, Pediatría..."
                    disabled={loading}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Mínimo 3 caracteres, máximo 200 caracteres
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Porcentaje de Pago <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.porcentajePago}
                      onChange={(e) => setFormData(prev => ({ ...prev, porcentajePago: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="0.0"
                      disabled={loading}
                      required
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Porcentaje entre 0% y 100%
                  </p>
                </div>
              </div>

              {modalMode === 'edit' && selectedEspecialidad && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Información Adicional
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium">ID:</span> {selectedEspecialidad.id}
                    </div>
                    <div>
                      <span className="font-medium">Creado por:</span> {selectedEspecialidad.createdBy}
                    </div>
                    <div>
                      <span className="font-medium">Fecha de creación:</span> {new Date(selectedEspecialidad.createdDate).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Última modificación:</span> {
                        selectedEspecialidad.updatedDate 
                          ? new Date(selectedEspecialidad.updatedDate).toLocaleString() 
                          : 'Sin modificaciones'
                      }
                    </div>
                  </div>
                </div>
              )}

              {/* Botones del formulario */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={backToList}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={modalMode === 'create' ? handleCreate : handleUpdate}
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
                      {modalMode === 'create' ? 'Creando...' : 'Actualizando...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {modalMode === 'create' ? 'Crear Especialidad' : 'Actualizar Especialidad'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GestionEspecialidadesModal; 
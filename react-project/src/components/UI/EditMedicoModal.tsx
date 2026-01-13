import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { pagoMedicosService } from '../../services/PagoMedicosService';
import type { MedicoByConsultorioResponse, UpdateMedicoTratanteRequest } from '../../services/PagoMedicosService';
import ToastAlerts from './ToastAlerts';

interface EditMedicoModalProps {
    isOpen: boolean;
    onClose: () => void;
    serviceComponentId: string;
    currentMedicoId: number;
    currentMedicoName: string;
    consultorioId: number;
    onSuccess: () => void;
}

const EditMedicoModal: React.FC<EditMedicoModalProps> = ({
    isOpen,
    onClose,
    serviceComponentId,
    currentMedicoId,
    currentMedicoName,
    consultorioId,
    onSuccess
}) => {
    const [medicos, setMedicos] = useState<MedicoByConsultorioResponse[]>([]);
    const [selectedMedicoId, setSelectedMedicoId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cargar médicos al abrir el modal
    useEffect(() => {
        if (isOpen && consultorioId) {
            loadMedicos();
            setSelectedMedicoId(currentMedicoId); // Pre-seleccionar actual
        }
    }, [isOpen, consultorioId, currentMedicoId]);

    // Cerrar dropdown al hacer click afuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadMedicos = async () => {
        setLoading(true);
        try {
            const lista = await pagoMedicosService.getMedicosByConsultorio(consultorioId);
            setMedicos(lista);
        } catch (error) {
            ToastAlerts.error({ title: 'Error', message: 'No se pudieron cargar los médicos' });
        } finally {
            setLoading(false);
        }
    };

    const handleActualizar = async () => {
        if (!selectedMedicoId) {
            ToastAlerts.warning({ title: 'Advertencia', message: 'Debe seleccionar un médico' });
            return;
        }

        if (selectedMedicoId === currentMedicoId) {
            ToastAlerts.info({ title: 'Sin cambios', message: 'El médico seleccionado es el mismo' });
            return;
        }

        setUpdating(true);
        try {
            const request: UpdateMedicoTratanteRequest = {
                v_ServiceComponentId: serviceComponentId,
                i_MedicoTratanteId: selectedMedicoId,
                i_UpdateUserId: 1 // TODO: Obtener del contexto
            };

            const response = await pagoMedicosService.updateMedicoTratante(request);

            if (response.success) {
                ToastAlerts.success({
                    title: 'Éxito',
                    message: 'Médico tratante actualizado correctamente'
                });
                onSuccess(); // Refrescar análisis
                onClose();
            } else {
                ToastAlerts.error({
                    title: 'Error',
                    message: 'No se pudo actualizar el médico tratante'
                });
            }
        } catch (error) {
            ToastAlerts.error({
                title: 'Error',
                message: 'Error al actualizar el médico tratante'
            });
        } finally {
            setUpdating(false);
        }
    };

    const filteredMedicos = medicos.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.consultorio.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedMedico = medicos.find(m => m.medicoTratanteId === selectedMedicoId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Editar Médico Tratante
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        disabled={updating}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Médico actual */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-sm text-gray-600 dark:text-gray-300">Médico actual:</p>
                    <p className="font-medium text-gray-900 dark:text-white">{currentMedicoName}</p>
                </div>

                {/* Autocomplete */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Seleccione nuevo médico
                    </label>
                    <div className="relative" ref={dropdownRef}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                placeholder="Buscar médico..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                disabled={loading || updating}
                            />
                        </div>

                        {/* Dropdown */}
                        {showDropdown && !loading && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                                {filteredMedicos.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                        No se encontraron médicos
                                    </div>
                                ) : (
                                    filteredMedicos.map((medico) => (
                                        <div
                                            key={medico.medicoTratanteId}
                                            className={`px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${selectedMedicoId === medico.medicoTratanteId ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                                }`}
                                            onClick={() => {
                                                setSelectedMedicoId(medico.medicoTratanteId);
                                                setSearchTerm(medico.name);
                                                setShowDropdown(false);
                                            }}
                                        >
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {medico.name}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {medico.consultorio} - {medico.userName}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Médico seleccionado */}
                    {selectedMedico && !showDropdown && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Seleccionado:</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedMedico.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {selectedMedico.consultorio} - {selectedMedico.userName}
                            </p>
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                        disabled={updating}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleActualizar}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={updating || loading || !selectedMedicoId}
                    >
                        {updating ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Cargando médicos...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditMedicoModal;

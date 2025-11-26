import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

interface SaveQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

const SaveQueryModal: React.FC<SaveQueryModalProps> = ({ isOpen, onClose, onSave }) => {
  const [queryName, setQueryName] = useState('');
  const [queryDescription, setQueryDescription] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!queryName) return;
    
    setSaving(true);
    // Simulación de guardar (para etapa de maquetación)
    setTimeout(() => {
      onSave(queryName, queryDescription);
      setSaving(false);
      setQueryName('');
      setQueryDescription('');
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Guardar Consulta
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="query-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre de la consulta *
            </label>
            <input
              id="query-name"
              type="text"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Ej. Ranking Servicios Ocupacionales Q1"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="query-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Descripción
            </label>
            <textarea
              id="query-description"
              value={queryDescription}
              onChange={(e) => setQueryDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white h-24 resize-none"
              placeholder="Descripción opcional de la consulta"
            />
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !queryName}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:bg-primary/70 rounded-md transition-colors"
            >
              {saving ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Consulta
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveQueryModal; 
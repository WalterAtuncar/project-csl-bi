import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  onRangeChange: (startDate: string, endDate: string) => void;
  defaultStartDate?: string;
  defaultEndDate?: string;
  className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  onRangeChange,
  defaultStartDate = '2025-01-01',
  defaultEndDate = '2025-03-31',
  className = ''
}) => {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [isOpen, setIsOpen] = useState(false);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    onRangeChange(e.target.value, endDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    onRangeChange(startDate, e.target.value);
  };

  const handleQuickRange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    onRangeChange(start, end);
    setIsOpen(false);
  };

  // Rangos predefinidos que corresponden al requisito de visualizar el primer trimestre de 2025
  const predefinedRanges = [
    { label: 'Primer Trimestre 2025', start: '2025-01-01', end: '2025-03-31' },
    { label: 'Enero 2025', start: '2025-01-01', end: '2025-01-31' },
    { label: 'Febrero 2025', start: '2025-02-01', end: '2025-02-28' },
    { label: 'Marzo 2025', start: '2025-03-01', end: '2025-03-31' },
  ];

  // Función helper para formatear fechas sin problemas de zona horaria
  const formatDateForDisplay = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className="flex items-center space-x-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <span>
          {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
        </span>
      </button>

      {isOpen && (
        <div className="absolute mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rangos predefinidos
              </p>
              {predefinedRanges.map((range, index) => (
                <button
                  key={`range-${range.start}-${range.end}-${index}`}
                  onClick={() => handleQuickRange(range.start, range.end)}
                  className="w-full text-left text-xs py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker; 
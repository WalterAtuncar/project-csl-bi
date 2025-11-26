import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, DollarSign, TrendingUp, Users, 
  FileBarChart, Download,
  ArrowUpRight, ArrowDownRight, Percent,
  FileText, Receipt, CreditCard, Plus,
  Clock, CheckCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ToastAlerts from '../../components/UI/ToastAlerts';

// Interfaz para el modal de registro de egresos
interface ExpenseFormData {
  amount: string;
  category: string;
  description: string;
  responsible: string;
  date: string;
  file: File | null;
}

// Componente de modal para registrar egresos
const ExpenseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<ExpenseFormData>({
    amount: '',
    category: 'insumos',
    description: '',
    responsible: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    file: null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files![0] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary" />
            Registrar Egreso
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monto (S/.)
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Categoría
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                >
                  <option value="insumos">Insumos médicos</option>
                  <option value="servicios">Servicios</option>
                  <option value="salarios">Salarios</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="equipo">Equipos</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Responsable
                </label>
                <input
                  type="text"
                  name="responsible"
                  value={formData.responsible}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Comprobante (PDF, imagen)
                </label>
                <input
                  type="file"
                  name="file"
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md"
              >
                Guardar Egreso
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Componente para cuadre diario
const DailyBalanceCard: React.FC = () => {
  const [isBalanced, setIsBalanced] = useState(false);

  return (
    <motion.div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
          <Receipt className="w-5 h-5 mr-2 text-primary" />
          Cuadre Diario de Caja
        </h2>
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1 text-amber-500" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {format(new Date(), 'dd MMM, yyyy', { locale: es })}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Ingresos</p>
          <p className="text-lg font-bold text-gray-800 dark:text-white">S/. 4,250.00</p>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Egresos</p>
          <p className="text-lg font-bold text-gray-800 dark:text-white">S/. 1,825.30</p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Saldo</p>
          <p className="text-lg font-bold text-gray-800 dark:text-white">S/. 2,424.70</p>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Estado de cuadre:
          {isBalanced ? (
            <span className="inline-flex items-center ml-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4 mr-1" /> Verificado
            </span>
          ) : (
            <span className="inline-flex items-center ml-2 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4 mr-1" /> Pendiente
            </span>
          )}
        </p>
        
        <button 
          onClick={() => setIsBalanced(!isBalanced)}
          className={`px-3 py-1 text-sm rounded-md ${
            isBalanced 
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' 
              : 'bg-primary text-white'
          }`}
        >
          {isBalanced ? 'Reabrir cuadre' : 'Verificar y cerrar'}
        </button>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
        El cuadre de caja debe realizarse diariamente al cierre de operaciones.
      </div>
    </motion.div>
  );
};

// Componente de exportación
const ExportOptions: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: string) => {
    // Mock de la funcionalidad de exportación
    console.log(`Exportando en formato ${format}`);
    setIsOpen(false);
    
    // En un caso real, aquí se llamaría a la API para generar el archivo
    ToastAlerts.success({
      title: "¡Exportación completada!",
      message: `Se ha generado la exportación en formato ${format.toUpperCase()} correctamente.`,
      action: {
        label: "Exportar otro formato",
        onClick: () => setIsOpen(true)
      }
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
      >
        <Download className="w-4 h-4 mr-2" />
        Exportar
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 overflow-hidden border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FileText className="w-4 h-4 mr-2 text-red-500" />
            Exportar como PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FileText className="w-4 h-4 mr-2 text-green-500" />
            Exportar como Excel
          </button>
        </div>
      )}
    </div>
  );
};

// Componente principal del dashboard financiero
const FinancialDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  // Estado para la lista de egresos (demo)
  const [expenses, setExpenses] = useState([
    {
      id: 'EXP-001',
      amount: 'S/. 450.30',
      category: 'Insumos médicos',
      description: 'Compra de insumos para laboratorio',
      responsible: 'María López',
      date: '2025-03-10'
    },
    {
      id: 'EXP-002',
      amount: 'S/. 780.00',
      category: 'Servicios',
      description: 'Servicio de limpieza mensual',
      responsible: 'Juan Pérez',
      date: '2025-03-08'
    },
    {
      id: 'EXP-003',
      amount: 'S/. 325.00',
      category: 'Mantenimiento',
      description: 'Reparación de equipo de rayos X',
      responsible: 'Carlos Gómez',
      date: '2025-03-05'
    }
  ]);

  // Datos de ejemplo
  const salesData = [
    { name: 'Ene', Consultas: 85000, Farmacia: 45000, Laboratorio: 32000 },
    { name: 'Feb', Consultas: 92000, Farmacia: 48000, Laboratorio: 35000 },
    { name: 'Mar', Consultas: 88000, Farmacia: 52000, Laboratorio: 38000 },
    { name: 'Abr', Consultas: 95000, Farmacia: 51000, Laboratorio: 42000 },
    { name: 'May', Consultas: 102000, Farmacia: 55000, Laboratorio: 45000 },
    { name: 'Jun', Consultas: 98000, Farmacia: 49000, Laboratorio: 39000 }
  ];

  const specialtyData = [
    { name: 'Medicina General', value: 35 },
    { name: 'Pediatría', value: 25 },
    { name: 'Ginecología', value: 20 },
    { name: 'Traumatología', value: 15 },
    { name: 'Otros', value: 5 }
  ];

  const COLORS = ['#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'];

  const handleSaveExpense = (data: ExpenseFormData) => {
    // En una implementación real, esto iría a la API
    const newExpense = {
      id: `EXP-${Math.floor(Math.random() * 1000)}`,
      amount: `S/. ${data.amount}`,
      category: data.category,
      description: data.description,
      responsible: data.responsible,
      date: data.date
    };
    
    setExpenses([newExpense, ...expenses]);
    setShowExpenseModal(false);
  };

  const StatCard = ({ title, value, trend, trendValue, icon: Icon }) => (
    <motion.div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`${trend === 'up' ? 'bg-green-100' : 'bg-red-100'} rounded-lg p-3 text-white`}>
          <Icon className={trend === 'up' ? 'text-green-600' : 'text-red-600'} />
        </div>
      </div>
      <div className="mt-3">
        <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'} flex items-center`}>
          {trend === 'up' ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
          {trendValue}
          <span className="text-gray-500 dark:text-gray-400 ml-1">desde el mes pasado</span>
        </span>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <motion.h1 
          className="text-2xl font-bold text-gray-800 dark:text-white"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          Dashboard Financiero
        </motion.h1>
        <div className="flex space-x-4">
          <select 
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="quarter">Este trimestre</option>
            <option value="year">Este año</option>
          </select>
          <ExportOptions />
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1
            }
          }
        }}
        initial="hidden"
        animate="show"
      >
        <StatCard 
          title="Ventas Totales" 
          value="$195,000" 
          trend="up" 
          trendValue="+12.5%"
          icon={DollarSign}
        />
        <StatCard 
          title="Ventas por Consultorio" 
          value="$85,000" 
          trend="up" 
          trendValue="+8.3%"
          icon={Users}
        />
        <StatCard 
          title="Ventas por Farmacia" 
          value="$55,000" 
          trend="down" 
          trendValue="-2.4%"
          icon={FileBarChart}
        />
        <StatCard 
          title="Margen de Beneficio" 
          value="32.8%" 
          trend="up" 
          trendValue="+1.2%"
          icon={Percent}
        />
      </motion.div>

      {/* Cuadre diario de caja */}
      <DailyBalanceCard />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por Categoría */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-primary" />
              Ventas por Categoría
            </h2>
            <select 
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md px-2 py-1 text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              <option value="consultas">Consultas</option>
              <option value="farmacia">Farmacia</option>
              <option value="laboratorio">Laboratorio</option>
            </select>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Consultas" fill="#1E3A8A" />
              <Bar dataKey="Farmacia" fill="#2563EB" />
              <Bar dataKey="Laboratorio" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Distribución por Especialidad */}
        <motion.div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              Distribución por Especialidad
            </h2>
            <select 
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md px-2 py-1 text-sm"
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
            >
              <option value="all">Todas las especialidades</option>
              <option value="general">Medicina General</option>
              <option value="pediatria">Pediatría</option>
              <option value="ginecologia">Ginecología</option>
            </select>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={specialtyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {specialtyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Egresos */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="px-6 py-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-primary" />
            Registro de Egresos
          </h2>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center px-3 py-1.5 bg-primary text-white rounded-md text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuevo Egreso
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Responsable
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-white">
                    {expense.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {format(new Date(expense.date), 'dd MMM, yyyy', { locale: es })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {expense.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">
                    {expense.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {expense.responsible}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t dark:border-gray-700 flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {expenses.length} egresos recientes
          </span>
          <button className="text-sm text-primary hover:text-primary-dark dark:hover:text-primary-light font-medium">
            Ver todos los egresos
          </button>
        </div>
      </motion.div>

      {/* Modal de registro de egresos */}
      {showExpenseModal && (
        <ExpenseModal
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          onSave={handleSaveExpense}
        />
      )}
    </div>
  );
};

export default FinancialDashboard;
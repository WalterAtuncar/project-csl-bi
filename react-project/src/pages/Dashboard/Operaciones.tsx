import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Download, AlertCircle, Loader2, Users, Stethoscope, 
  Building2, Activity, UserCheck, ClipboardList, TrendingUp, Heart,
  PieChart, BarChart3, Target, MapPin
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  dashboardService, 
  ServicesDashboardRequest, 
  ServicesDashboardData
} from '../../services/DashboardService';
import FloatingDashboardChat from '../../components/UI/FloatingDashboardChat';

// Interfaces para el estado de exportación
interface ExportState {
  loading: boolean;
  error: string | null;
}

interface DateRangeFilter {
  startDate: string;
  endDate: string;
  quickFilter: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

// Componente para exportar
const ExportOptions: React.FC<{
  onExport: (format: 'pdf' | 'excel') => Promise<void>;
  exportState: ExportState;
}> = ({ onExport, exportState }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = async (format: 'pdf' | 'excel') => {
    setIsOpen(false);
    await onExport(format);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={exportState.loading}
        className="flex items-center px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exportState.loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-2" />
        )}
        {exportState.loading ? 'Exportando...' : 'Exportar'}
      </button>

      {exportState.error && (
        <div className="absolute right-0 mt-2 max-w-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 z-50">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-200">{exportState.error}</span>
          </div>
        </div>
      )}

      {isOpen && !exportState.loading && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 overflow-hidden border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Download className="w-4 h-4 mr-2 text-red-500" />
            Exportar como PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Download className="w-4 h-4 mr-2 text-green-500" />
            Exportar como Excel
          </button>
        </div>
      )}
    </div>
  );
};

// Componente para filtros de fecha
const DateRangeFilterComponent: React.FC<{
  onApplyFilter: (range: { startDate: string; endDate: string }) => void
}> = ({ onApplyFilter }) => {
  // Usar fechas dinámicas por defecto
  const getDefaultDates = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      startDate: oneWeekAgo.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    };
  };

  const [startDate, setStartDate] = useState(getDefaultDates().startDate);
  const [endDate, setEndDate] = useState(getDefaultDates().endDate);
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    onApplyFilter({ startDate, endDate });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 text-sm focus:outline-none"
      >
        <Calendar className="w-4 h-4 mr-2" />
        <span>Rango de fechas</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 p-4 border border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 text-sm"
              />
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 mr-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleApply}
                className="px-3 py-1 bg-primary text-white rounded-md text-sm"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Colores para gráficos
const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
];

// Componente KPI Card
const KPICard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: string;
  delay?: number;
}> = ({ title, value, icon: Icon, color, trend, delay = 0 }) => (
    <motion.div 
    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
    initial={{ opacity: 0, y: 20, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {trend && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">{trend}</p>
        )}
      </div>
      <div className={`${color} rounded-xl p-3 ml-4`}>
        <Icon className="w-6 h-6 text-white" />
          </div>
      </div>
    </motion.div>
  );

// Componente principal del dashboard
const ServicesDashboardContent: React.FC<{ data: ServicesDashboardData[] }> = ({ data }) => {
  // Procesar datos para KPIs
  const kpiData = useMemo(() => {
    const totalServicios = data.length;
    const pacientesUnicos = new Set(data.map(item => item.comprobante.trim())).size;
    const medicosActivos = new Set(data.map(item => item.medicoTratante)).size;
    const especialidadesActivas = new Set(data.map(item => item.especialidadMedica)).size;
    const consultoriosActivos = new Set(data.filter(item => item.consultorioNombre !== 'SIN CONSULTORIO').map(item => item.consultorioNombre)).size;
    const protocolosUtilizados = new Set(data.map(item => item.protocoloNombre)).size;
    const edadPromedio = data.reduce((sum, item) => sum + item.edad, 0) / data.length;
    const conDiagnostico = data.filter(item => item.estadoDiagnostico !== 'Sin_Dx').length;
    const tasaDiagnostico = (conDiagnostico / totalServicios) * 100;
    
    return {
      totalServicios,
      pacientesUnicos,
      medicosActivos,
      especialidadesActivas,
      consultoriosActivos,
      protocolosUtilizados,
      edadPromedio: Math.round(edadPromedio),
      tasaDiagnostico: Math.round(tasaDiagnostico)
    };
  }, [data]);

  // Procesar datos para Top Especialidades
  const especialidadesData = useMemo(() => {
    const especialidadesCounts = data.reduce((acc, item) => {
      acc[item.especialidadMedica] = (acc[item.especialidadMedica] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(especialidadesCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data]);

  // Procesar datos para Top Médicos
  const medicosData = useMemo(() => {
    const medicosCounts = data.reduce((acc, item) => {
      acc[item.medicoTratante] = (acc[item.medicoTratante] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(medicosCounts)
      .map(([name, value]) => ({ name: name.length > 25 ? name.substring(0, 25) + '...' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data]);

  // Procesar datos para Top Protocolos
  const protocolosData = useMemo(() => {
    const protocolosCounts = data.reduce((acc, item) => {
      acc[item.protocoloNombre] = (acc[item.protocoloNombre] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(protocolosCounts)
      .map(([name, value]) => ({ name: name.length > 30 ? name.substring(0, 30) + '...' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data]);

  // Procesar datos para Diagnósticos (Radar Chart)
  const diagnosticosRadarResult = useMemo(() => {
    // Filtrar SOLO servicios con estadoDiagnostico = "Con_Dx"
    const serviciosConDiagnostico = data.filter(item => 
      item.estadoDiagnostico === "Con_Dx"
    );

    // Contar ocurrencias de cada diagnóstico
    const diagnosticosCounts = serviciosConDiagnostico.reduce((acc, item) => {
      if (item.diagnosticoNombre && item.diagnosticoNombre.trim() !== '') {
        acc[item.diagnosticoNombre] = (acc[item.diagnosticoNombre] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Base para cálculo: SOLO servicios con estadoDiagnostico = "Con_Dx"
    const totalConDiagnostico = serviciosConDiagnostico.length;
    
    const sortedDiagnosticos = Object.entries(diagnosticosCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Calcular la suma total de casos de los diagnósticos del top
    const totalCasosTop = sortedDiagnosticos.reduce((sum, [, count]) => sum + count, 0);

    const resultados = sortedDiagnosticos.map(([name, count]) => {
      const porcentajeRelativo = Math.round((count / totalCasosTop) * 100);
      return {
        diagnostico: name.length > 25 ? name.substring(0, 25) + '...' : name,
        fullName: name,
        prevalencia: count,
        porcentaje: porcentajeRelativo
      };
    });

    // Calcular el máximo dinámico para el radar
    const maxPorcentaje = Math.max(...resultados.map(r => r.porcentaje));
    const calcularMaximoRadar = (max: number): number => {
      if (max <= 5) return 10;
      if (max <= 10) return 15;
      if (max <= 15) return 20;
      if (max <= 20) return 25;
      if (max <= 25) return 30;
      if (max <= 30) return 35;
      if (max <= 40) return 50;
      if (max <= 50) return 60;
      if (max <= 75) return 80;
      return 100;
    };

    const radarMaximo = calcularMaximoRadar(maxPorcentaje);

    console.log('🔍 Debug Radar Dinámico:', {
      totalServicios: data.length,
      serviciosConDx: totalConDiagnostico,
      totalCasosTop8: totalCasosTop,
      maxPorcentajeReal: maxPorcentaje,
      maximoRadarCalculado: radarMaximo,
      top5Diagnosticos: sortedDiagnosticos.slice(0, 5).map(([name, count]) => ({
        nombre: name,
        casos: count,
        porcentajeRelativo: Math.round((count / totalCasosTop) * 100),
        formula: `${count}/${totalCasosTop}*100`
      }))
    });

    return { data: resultados, radarMaximo };
  }, [data]);

  const diagnosticosRadarData = diagnosticosRadarResult.data;
  const radarMaximo = diagnosticosRadarResult.radarMaximo;

  // Procesar datos para Grupos Etarios
  const gruposEtariosData = useMemo(() => {
    const gruposEtarios = data.reduce((acc, item) => {
      let grupo = '';
      if (item.edad <= 12) grupo = 'Niños (0-12)';
      else if (item.edad <= 18) grupo = 'Adolescentes (13-18)';
      else if (item.edad <= 30) grupo = 'Jóvenes (19-30)';
      else if (item.edad <= 45) grupo = 'Adultos (31-45)';
      else if (item.edad <= 60) grupo = 'Adultos Maduros (46-60)';
      else grupo = 'Adultos Mayores (60+)';
      
      acc[grupo] = (acc[grupo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalPacientes = data.length;
    
    return Object.entries(gruposEtarios)
      .map(([grupo, count]) => ({
        grupo,
        count,
        porcentaje: Math.round((count / totalPacientes) * 100)
      }))
             .sort((a, b) => b.count - a.count);
  }, [data]);

  // Procesar datos para Top Usuarios de Recepción
  const usuariosRecepcionData = useMemo(() => {
    const usuariosCounts = data.reduce((acc, item) => {
      if (item.usuarioRegistro && item.usuarioRegistro.trim() !== '') {
        acc[item.usuarioRegistro] = (acc[item.usuarioRegistro] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(usuariosCounts)
      .map(([name, value]) => ({ 
        name: name.length > 30 ? name.substring(0, 30) + '...' : name, 
        fullName: name,
        value 
      }))
             .sort((a, b) => b.value - a.value)
       .slice(0, 10); // Top 10 usuarios
  }, [data]);

  // Procesar datos para Distribución Geográfica por Distrito
  const distribucionUbigeoData = useMemo(() => {
    const ubigeoCounts = data.reduce((acc, item) => {
      if (item.ubigeoId && item.ubigeoId.trim() !== '') {
        // Extraer el distrito (última parte del ubigeoId)
        const partes = item.ubigeoId.split('-');
        const distrito = partes[partes.length - 1] || 'No especificado';
        acc[distrito] = (acc[distrito] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const totalPacientes = data.length;
    
    return Object.entries(ubigeoCounts)
      .map(([distrito, count]) => ({
        name: distrito,
        value: count,
        porcentaje: Math.round((count / totalPacientes) * 100)
      }))
             .sort((a, b) => b.value - a.value)
       .slice(0, 10); // Top 10 distritos
  }, [data]);

  // Procesar datos para Procedencia de Atención
  const procedenciaData = useMemo(() => {
    const procedenciaCounts = data.reduce((acc, item) => {
      if (item.procedenciaNombre && item.procedenciaNombre.trim() !== '') {
        acc[item.procedenciaNombre] = (acc[item.procedenciaNombre] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const totalPacientes = data.length;
    
    return Object.entries(procedenciaCounts)
      .map(([name, count]) => ({
        name,
        value: count,
        porcentaje: Math.round((count / totalPacientes) * 100)
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Procesar datos para Medios de Marketing
  const marketingData = useMemo(() => {
    const marketingCounts = data.reduce((acc, item) => {
      if (item.medioMarketing && item.medioMarketing.trim() !== '') {
        acc[item.medioMarketing] = (acc[item.medioMarketing] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const totalPacientes = data.length;
    
    return Object.entries(marketingCounts)
      .map(([name, count]) => ({
        name,
        value: count,
        porcentaje: Math.round((count / totalPacientes) * 100)
      }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Procesar datos para distribución por sexo
  const sexoData = useMemo(() => {
    const sexoCounts = data.reduce((acc, item) => {
      acc[item.sexo] = (acc[item.sexo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sexoCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / data.length) * 100)
    }));
  }, [data]);

  // Procesar datos para servicios por consultorio
  const consultoriosData = useMemo(() => {
    const consultoriosCounts = data.reduce((acc, item) => {
      const consultorio = item.consultorioNombre === 'SIN CONSULTORIO' ? 'Sin Consultorio' : item.consultorioNombre;
      acc[consultorio] = (acc[consultorio] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(consultoriosCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Procesar datos para especialidades por sexo (gráfico agrupado)
  const especialidadesPorSexoData = useMemo(() => {
    const especialidadesTop = especialidadesData.slice(0, 6).map(item => item.name);
    
    return especialidadesTop.map(especialidad => {
      const serviciosEspecialidad = data.filter(item => item.especialidadMedica === especialidad);
      const masculino = serviciosEspecialidad.filter(item => item.sexo === 'MASCULINO').length;
      const femenino = serviciosEspecialidad.filter(item => item.sexo === 'FEMENINO').length;
      
            return {
        name: especialidad.length > 15 ? especialidad.substring(0, 15) + '...' : especialidad,
        Masculino: masculino,
        Femenino: femenino
            };
          });
  }, [data, especialidadesData]);

    return (
    <div className="space-y-8">
      {/* KPI Cards Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
      >
        <KPICard
          title="Total de Servicios"
          value={kpiData.totalServicios.toLocaleString()}
          icon={Activity}
          color="bg-blue-500"
          delay={0}
        />
        <KPICard
          title="Pacientes Únicos"
          value={kpiData.pacientesUnicos.toLocaleString()}
          icon={Users}
          color="bg-green-500"
          delay={0.1}
        />
        <KPICard
          title="Médicos Activos"
          value={kpiData.medicosActivos}
          icon={Stethoscope}
          color="bg-purple-500"
          delay={0.2}
        />
        <KPICard
          title="Especialidades"
          value={kpiData.especialidadesActivas}
          icon={UserCheck}
          color="bg-orange-500"
          delay={0.3}
        />
      </motion.div>

      {/* Segunda fila de KPIs */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1, delay: 0.2 }}
      >
        <KPICard
          title="Consultorios Activos"
          value={kpiData.consultoriosActivos}
          icon={Building2}
          color="bg-cyan-500"
          delay={0}
        />
        <KPICard
          title="Protocolos Utilizados"
          value={kpiData.protocolosUtilizados}
          icon={ClipboardList}
          color="bg-indigo-500"
          delay={0.1}
        />
        <KPICard
          title="Edad Promedio"
          value={`${kpiData.edadPromedio} años`}
          icon={Heart}
          color="bg-pink-500"
          delay={0.2}
        />
        <KPICard
          title="Tasa Diagnóstico"
          value={`${kpiData.tasaDiagnostico}%`}
          icon={Target}
          color="bg-emerald-500"
          delay={0.3}
        />
      </motion.div>

      {/* Gráficos Principal - Primera fila */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Especialidades */}
      <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
            Top Especialidades Médicas
        </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={especialidadesData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
                stroke="#6B7280"
              />
              <YAxis stroke="#6B7280" />
              <Tooltip 
                formatter={(value) => [value, '']}
                labelFormatter={(label) => label}
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                {especialidadesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Distribución por Sexo - Pie Chart */}
                <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-green-500" />
            Distribución por Sexo
          </h3>
          <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                data={sexoData}
                    cx="50%"
                    cy="50%"
                outerRadius={100}
                    fill="#8884d8"
                dataKey="value"
                label={({ name, percentage }) => `${name}: ${percentage}%`}
              >
                {sexoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                formatter={(value) => [`${value} servicios (${((Number(value) / data.length) * 100).toFixed(1)}%)`, '']}
                labelStyle={{ color: '#F9FAFB' }}
                itemStyle={{ color: '#F9FAFB' }}
                contentStyle={{ 
                  backgroundColor: '#111827', 
                  border: '1px solid #374151', 
                  borderRadius: '8px',
                  color: '#F9FAFB',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
                }} 
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
        </motion.div>
          </div>

      {/* Segunda fila de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Médicos */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
            <Stethoscope className="w-5 h-5 mr-2 text-purple-500" />
            Top Médicos por Servicios
          </h3>
          <div className="space-y-4">
            {medicosData.map((medico, index) => {
              const maxValue = Math.max(...medicosData.map(m => m.value));
              const percentage = (medico.value / maxValue) * 100;
              const originalName = data.find(item => 
                item.medicoTratante.startsWith(medico.name.replace('...', ''))
              )?.medicoTratante || medico.name;
              
                return (
                  <motion.div 
                  key={medico.name}
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate pr-2" title={originalName}>
                      {originalName}
                    </span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400 min-w-fit">
                      {medico.value} servicios
                    </span>
                        </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-end pr-2"
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                    >
                      {percentage > 20 && (
                        <span className="text-white text-xs font-medium">
                          {medico.value}
                        </span>
                      )}
                    </motion.div>
                    </div>
                  </motion.div>
                );
              })}
        </div>
      </motion.div>

        {/* Top Protocolos */}
      <motion.div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-indigo-500" />
            Top Protocolos por Servicios
          </h3>
          <div className="space-y-4">
            {protocolosData.map((protocolo, index) => {
              const maxValue = Math.max(...protocolosData.map(p => p.value));
              const percentage = (protocolo.value / maxValue) * 100;
              const originalName = data.find(item => 
                item.protocoloNombre.startsWith(protocolo.name.replace('...', ''))
              )?.protocoloNombre || protocolo.name;
              
              return (
              <motion.div 
                  key={protocolo.name}
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
            <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate pr-2" title={originalName}>
                      {originalName}
                    </span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 min-w-fit">
                      {protocolo.value} servicios
                    </span>
              </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <motion.div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full flex items-center justify-end pr-2"
                initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                    >
                      {percentage > 20 && (
                        <span className="text-white text-xs font-medium">
                          {protocolo.value}
                        </span>
                      )}
              </motion.div>
            </div>
                </motion.div>
              );
            })}
        </div>
      </motion.div>
      </div>

      {/* Servicios por Consultorio - Ancho completo */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2 text-cyan-500" />
          Servicios por Consultorio
        </h3>
                 <ResponsiveContainer width="100%" height={500}>
           <BarChart data={consultoriosData} margin={{ top: 20, right: 30, left: 20, bottom: 120 }}>
             <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
             <XAxis 
               dataKey="name" 
               angle={-90}
               textAnchor="end"
               height={120}
               fontSize={12}
               stroke="#6B7280"
               interval={0}
             />
            <YAxis stroke="#6B7280" />
            <Tooltip 
              formatter={(value) => [value, '']}
              labelFormatter={(label) => label}
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: 'none', 
                borderRadius: '8px',
                color: '#F9FAFB'
              }} 
            />
            <Bar dataKey="value" fill="#06B6D4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Gráfico Agrupado - Ancho completo */}
      <motion.div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
          Servicios por Especialidad y Sexo
              </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={especialidadesPorSexoData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              angle={0}
              textAnchor="middle"
              height={50}
              fontSize={12}
              stroke="#6B7280"
            />
            <YAxis stroke="#6B7280" />
            <Tooltip 
              formatter={(value, name) => [`${value} servicios`, name]}
              labelFormatter={(label) => `Especialidad: ${label}`}
              contentStyle={{ 
                backgroundColor: '#111827', 
                border: '1px solid #374151', 
                borderRadius: '8px',
                color: '#F9FAFB',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
              }} 
              labelStyle={{ color: '#F9FAFB', fontWeight: 'bold', marginBottom: '4px' }}
              itemStyle={{ color: '#F9FAFB' }}
            />
            <Bar dataKey="Masculino" fill="#3B82F6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Femenino" fill="#EC4899" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Quinta fila: Radar + Grupos Etarios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Radar de Diagnósticos Prevalentes */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-rose-500" />
            Prevalencia de Diagnósticos Médicos
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={diagnosticosRadarData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
              <PolarGrid stroke="#374151" opacity={0.3} />
              <PolarAngleAxis 
                dataKey="diagnostico" 
                fontSize={12}
                tick={{ fill: '#6B7280', fontSize: 11 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, radarMaximo]}
                fontSize={10}
                tick={{ fill: '#6B7280', fontSize: 10 }}
              />
              <Radar
                name="Prevalencia (%)"
                dataKey="porcentaje"
                stroke="#F43F5E"
                fill="#F43F5E"
                fillOpacity={0.3}
                strokeWidth={2}
                dot={{ fill: '#F43F5E', strokeWidth: 2, r: 4 }}
              />
              <Tooltip 
                formatter={(value, name) => {
                  const diagnostico = diagnosticosRadarData.find(d => d.porcentaje === value);
                  return [`${diagnostico?.prevalencia || value} casos (${value}%)`, name];
                }}
                labelFormatter={(label) => `${diagnosticosRadarData.find(d => d.diagnostico === label)?.fullName || label}`}
                contentStyle={{ 
                  backgroundColor: '#111827', 
                  border: '1px solid #374151', 
                  borderRadius: '8px',
                  color: '#F9FAFB',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
                }} 
                labelStyle={{ color: '#F9FAFB', fontWeight: 'bold', marginBottom: '4px' }}
                itemStyle={{ color: '#F43F5E' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Distribución por Grupos Etarios */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-500" />
            Distribución por Grupos Etarios
          </h3>
          <div className="space-y-4">
            {gruposEtariosData.map((grupo, index) => {
              const maxValue = Math.max(...gruposEtariosData.map(g => g.count));
              const percentage = (grupo.count / maxValue) * 100;
              
              const colores = [
                'from-blue-500 to-blue-600',
                'from-green-500 to-green-600', 
                'from-yellow-500 to-yellow-600',
                'from-orange-500 to-orange-600',
                'from-red-500 to-red-600',
                'from-purple-500 to-purple-600'
              ];
              
              return (
                <motion.div
                  key={grupo.grupo}
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {grupo.grupo}
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 min-w-fit">
                      {grupo.count} pacientes ({grupo.porcentaje}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <motion.div 
                      className={`h-full bg-gradient-to-r ${colores[index]} rounded-full flex items-center justify-end pr-2`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                    >
                      {percentage > 20 && (
                        <span className="text-white text-xs font-medium">
                          {grupo.count}
                        </span>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
                 </motion.div>
       </div>

       {/* Sexta fila: Usuarios Recepción + Distribución Geográfica */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Top Usuarios de Recepción */}
         <motion.div
           className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 1.1 }}
         >
           <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
             <UserCheck className="w-5 h-5 mr-2 text-emerald-500" />
             Top Usuarios de Recepción
           </h3>
           <ResponsiveContainer width="100%" height={400}>
             <BarChart data={usuariosRecepcionData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
               <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
               <XAxis 
                 dataKey="name" 
                 angle={-45}
                 textAnchor="end"
                 height={100}
                 fontSize={12}
                 stroke="#6B7280"
                 interval={0}
               />
               <YAxis stroke="#6B7280" />
               <Tooltip 
                 formatter={(value, name) => {
                   const usuario = usuariosRecepcionData.find(u => u.value === value);
                   return [`${value} servicios`, usuario?.fullName || name];
                 }}
                 labelFormatter={(label) => {
                   const usuario = usuariosRecepcionData.find(u => u.name === label);
                   return usuario?.fullName || label;
                 }}
                 contentStyle={{ 
                   backgroundColor: '#1F2937', 
                   border: 'none', 
                   borderRadius: '8px',
                   color: '#F9FAFB'
                 }} 
               />
               <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
         </motion.div>

         {/* Distribución Geográfica por Departamentos */}
         <motion.div
           className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 1.2 }}
         >
           <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6 flex items-center">
             <MapPin className="w-5 h-5 mr-2 text-amber-500" />
             Distribución Geográfica por Distritos
           </h3>
           <div className="space-y-4">
             {distribucionUbigeoData.map((departamento, index) => {
               const maxValue = Math.max(...distribucionUbigeoData.map(d => d.value));
               const percentage = (departamento.value / maxValue) * 100;
               
               const colores = [
                 'from-amber-500 to-amber-600',
                 'from-red-500 to-red-600',
                 'from-green-500 to-green-600', 
                 'from-blue-500 to-blue-600',
                 'from-purple-500 to-purple-600',
                 'from-orange-500 to-orange-600',
                 'from-cyan-500 to-cyan-600',
                 'from-lime-500 to-lime-600'
               ];
               
               return (
                 <motion.div
                   key={departamento.name}
                   className="space-y-2"
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ duration: 0.4, delay: index * 0.1 }}
                 >
                   <div className="flex justify-between items-center">
                     <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                       {departamento.name}
                     </span>
                     <span className="text-sm font-bold text-amber-600 dark:text-amber-400 min-w-fit">
                       {departamento.value} pacientes ({departamento.porcentaje}%)
                     </span>
                   </div>
                   <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                     <motion.div 
                       className={`h-full bg-gradient-to-r ${colores[index]} rounded-full flex items-center justify-end pr-2`}
                       initial={{ width: 0 }}
                       animate={{ width: `${percentage}%` }}
                       transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                     >
                       {percentage > 20 && (
                         <span className="text-white text-xs font-medium">
                           {departamento.value}
                         </span>
                       )}
                     </motion.div>
                   </div>
                 </motion.div>
               );
             })}
           </div>
         </motion.div>
       </div>

       {/* Séptima fila: Procedencia + Marketing */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Procedencia de Atención */}
         <motion.div
           className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 1.3 }}
         >
           <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
             <Building2 className="w-5 h-5 mr-2 text-teal-500" />
             Procedencia de Atención
           </h3>
           <ResponsiveContainer width="100%" height={350}>
             <BarChart data={procedenciaData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
               <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
               <XAxis 
                 dataKey="name" 
                 angle={-45}
                 textAnchor="end"
                 height={80}
                 fontSize={12}
                 stroke="#6B7280"
                 interval={0}
               />
               <YAxis stroke="#6B7280" />
               <Tooltip 
                 formatter={(value) => [`${value} pacientes`, '']}
                 labelFormatter={(label) => `${label}`}
                 contentStyle={{ 
                   backgroundColor: '#1F2937', 
                   border: 'none', 
                   borderRadius: '8px',
                   color: '#F9FAFB'
                 }} 
               />
               <Bar dataKey="value" fill="#14B8A6" radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
         </motion.div>

         {/* Medios de Marketing */}
         <motion.div
           className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6, delay: 1.4 }}
         >
           <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
             <TrendingUp className="w-5 h-5 mr-2 text-pink-500" />
             Medios de Marketing
           </h3>
           <ResponsiveContainer width="100%" height={350}>
             <BarChart data={marketingData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
               <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
               <XAxis 
                 dataKey="name" 
                 angle={-45}
                 textAnchor="end"
                 height={80}
                 fontSize={12}
                 stroke="#6B7280"
                 interval={0}
               />
               <YAxis stroke="#6B7280" />
               <Tooltip 
                 formatter={(value) => [`${value} pacientes`, '']}
                 labelFormatter={(label) => `${label}`}
                 contentStyle={{ 
                   backgroundColor: '#1F2937', 
                   border: 'none', 
                   borderRadius: '8px',
                   color: '#F9FAFB'
                 }} 
               />
               <Bar dataKey="value" fill="#EC4899" radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
         </motion.div>
       </div>
                      </div>
  );
};

const ServicesDashboard: React.FC = () => {
  // Estado para exportación
  const [exportState, setExportState] = useState<ExportState>({
    loading: false,
    error: null
  });

  // Estado para el rango de fechas
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    quickFilter: 'week'
  });

  // Estado para los datos de servicios
  const [servicesData, setServicesData] = useState<ServicesDashboardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handler para aplicar filtro de fechas
  const handleDateRangeFilter = async (range: { startDate: string; endDate: string }) => {
    const newDateRange: DateRangeFilter = {
      ...range,
      quickFilter: 'custom'
    };
    setDateRange(newDateRange);
    
    // Llamar al endpoint de servicios
    setLoading(true);
    setError(null);
    
    try {
      // Convertir fechas al formato ISO que espera el endpoint
      const fechaInicio = new Date(range.startDate).toISOString();
      const fechaFin = new Date(range.endDate).toISOString();
      
      const request: ServicesDashboardRequest = {
        fechaInicio,
        fechaFin
      };
      
      console.log('📅 Llamando al endpoint con request:', request);
      
      const response = await dashboardService.getServicesDashboard(request);
      
      console.log('✅ Respuesta del endpoint DashboardServicios:', response);
      console.log(`📊 Total de servicios obtenidos: ${response.length}`);
      
      if (response.length > 0) {
        console.log('🔍 Primer servicio (ejemplo):', response[0]);
        console.log('🔍 Estructura de campos:', Object.keys(response[0]));
      }
      
      setServicesData(response);
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Error al obtener datos de servicios:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setLoading(false);
    }
  };

  // Handler para exportación
  const handleExport = async (format: 'pdf' | 'excel') => {
    setExportState({ loading: true, error: null });
    
    try {
      // TODO: Implementar exportación del dashboard de servicios
      console.log('Exportando dashboard de servicios en formato:', format);
      
      // Simular tiempo de exportación
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setExportState({ loading: false, error: null });
    } catch (error) {
      console.error(`Error exporting dashboard as ${format}:`, error);
      setExportState({
        loading: false,
        error: error instanceof Error ? error.message : `Error al exportar en formato ${format}`
      });
    }
  };

  const formatDateForDisplay = (dateString: string): string => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  const calculateTotalDays = (): number => {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  };

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
          🏥 Dashboard de Servicios Médicos 🏥
        </motion.h1>
        <div className="flex space-x-3">
          <DateRangeFilterComponent onApplyFilter={handleDateRangeFilter} />
          <ExportOptions onExport={handleExport} exportState={exportState} />
                        </div>
              </div>
              
      {/* Rango de fechas seleccionado */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2 text-sm text-blue-800 dark:text-blue-200 flex items-center">
        <Calendar className="w-4 h-4 mr-2" />
        <span className="mr-2">
          Período de {calculateTotalDays()} días - desde {formatDateForDisplay(dateRange.startDate)} hasta {formatDateForDisplay(dateRange.endDate)}
        </span>
                  </div>

            {/* Loading State */}
      {loading && (
        <motion.div 
          className="flex items-center justify-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
          <span className="text-lg text-gray-600 dark:text-gray-400">Cargando servicios médicos...</span>
      </motion.div>
      )}

      {/* Error State */}
      {error && (
      <motion.div 
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Error al cargar datos</h3>
              <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
        </div>
      </motion.div>
      )}

      {/* Empty State */}
      {!loading && !error && servicesData.length === 0 && (
      <motion.div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        >
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            Dashboard de Servicios Médicos
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Selecciona un rango de fechas para cargar los datos y visualizar las métricas de servicios médicos.
          </p>
      </motion.div>
      )}

      {/* Dashboard Content */}
      {!loading && !error && servicesData.length > 0 && (
        <ServicesDashboardContent data={servicesData} />
      )}

      {/* Chat AI Flotante */}
      <FloatingDashboardChat 
        dashboardData={servicesData}
        dashboardType="custom"
        dashboardTitle="Dashboard de Servicios Médicos"
        disabled={!servicesData || servicesData.length === 0}
      />
    </div>
  );
};

export default ServicesDashboard;
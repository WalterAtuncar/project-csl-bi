import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login/Login';
import { GeneralDashboard, FinancialDashboard, SalesDashboard } from './pages/Dashboard';
import { CajaMayor } from './pages/CajaMayor';
import { HonorariosMedicos } from './pages/HonorariosMedicos';
import { FlujoCaja } from './pages/FlujoCaja';
import { RegistroCompras } from './pages/RegistroCompras';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import ExampleAssets from './components/ExampleAssets';
import AnalisisV2 from './pages/ConsultasBI/Analisis-v2';
import { GlobalLoader, ToastProvider } from './components/UI';

const App: React.FC = () => {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboards/general" replace />} />
            
            <Route path="dashboards">
              <Route index element={<Navigate to="/dashboards/general" replace />} />
              <Route path="general" element={<GeneralDashboard />} />
              <Route path="finanzas" element={<FinancialDashboard />} />
              <Route path="ventas" element={<SalesDashboard />} />
              <Route path="operaciones" element={<Navigate to="/dashboards/ventas" replace />} />
            </Route>
            
            <Route path="consultas-bi">
              <Route index element={<Navigate to="/consultas-bi/v2" replace />} />
              <Route path="v2" element={<AnalisisV2 />} />
              {/* Redirigir la ruta antigua a la nueva versión */}
              <Route path="analisis" element={<Navigate to="/consultas-bi/v2" replace />} />
            </Route>
            
            <Route path="caja-mayor" element={<CajaMayor />} />
            <Route path="flujo-caja" element={<FlujoCaja />} />
            <Route path="registro-compras" element={<RegistroCompras />} />
            <Route path="honorarios-medicos" element={<HonorariosMedicos />} />

            {/* Ruta para probar los recursos estáticos */}
            <Route path="assets-demo" element={<ExampleAssets />} />
          </Route>
        </Route>
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Loader global que se muestra en toda la aplicación */}
      <GlobalLoader />
    </ToastProvider>
  );
};

export default App;
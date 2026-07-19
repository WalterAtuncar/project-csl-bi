import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login/Login';
import NotFound from './pages/NotFound';
import { GlobalLoader, ToastProvider } from './components/UI';
import { ContaAuthProvider } from './context/ContaAuthContext';
import { ContaLayout, Dashboard, Egresos, CostosPersonal, CajaDiaria, FlujoConsolidado, Rentabilidad, Honorarios, Epidemiologia, Catalogos, Usuarios } from './pages/Contabilidad';
// [SOFT-DELETE 2026-07-13] Registro de Compras absorbido por Egresos (/conta/egresos), que ahora
// unifica compras (receptor PROVEEDOR) + entidades. La ruta /conta/compras redirige a /conta/egresos
// para no romper bookmarks. El componente Compras sigue en disco (bandeja fiscal sin feed). Restaurar
// cuando exista el feed PLE/SUNAT: descomentar el import y devolver element={<Compras />} a su <Route>.
// import { Compras } from './pages/Contabilidad';
// [SOFT-DELETE 2026-07-12] RentabilidadUnidades absorbida por Rentabilidad.tsx (seccion Por Unidad).
// Fuera del routing: la ruta /conta/rentabilidad-unidades ahora redirige a /conta/rentabilidad.
// El componente sigue en disco. Para restaurar: descomentar el import de abajo y devolver
// element={<RentabilidadUnidades />} a su <Route>, y re-agregar la entrada en ContaLayout.
// import { RentabilidadUnidades } from './pages/Contabilidad';
// [SOFT-DELETE 2026-07-13] "Liquidacion SISOL" (/conta/sisol) retirada: no fue solicitada. La ruta
// redirige a /conta/catalogos. Se CONSERVA la configuracion de porcentajes en Catalogos -> tab "% SISOL"
// (Participacion SISOL / vigencias %Clinica-%Hospital). El componente Sisol.tsx sigue en disco.
// Restaurar: descomentar el import de abajo y devolver element={<Sisol />} a su <Route>, re-agregar la entrada en ContaLayout.
// import { Sisol } from './pages/Contabilidad';

// [CLEANUP 2026-07-15] Rutas legacy (MainLayout + ProtectedRoute: dashboards, consultas-bi, caja-mayor,
// flujo-caja, registro-compras, honorarios-medicos, assets-demo) RETIRADAS del routing: el BI vive ahora
// bajo /conta/* con el login unificado (/login). Tambien se retiro /conta/login (deep-link duplicado):
// el guard de no-autenticado del conta redirige directo a /login. Los componentes legacy siguen en disco
// (huerfanos, sin ruta). La raiz '/' ahora entra a /conta/dashboard (el guard rebota a /login si no hay sesion).

// El provider de auth de contabilidad envuelve las rutas hijas del modulo.
const ContaOutlet: React.FC = () => <Outlet />;

const App: React.FC = () => {
  return (
    <ToastProvider>
      <Routes>
        {/* Raiz -> app. Si no hay sesion, el guard de ContaLayout rebota a /login. */}
        <Route path="/" element={<Navigate to="/conta/dashboard" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Modulo de Gestion Financiera / Contabilidad (API dedicada + identity propia) */}
        <Route path="/conta" element={<ContaAuthProvider><ContaOutlet /></ContaAuthProvider>}>
          <Route element={<ContaLayout />}>
            <Route index element={<Navigate to="/conta/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="caja" element={<CajaDiaria />} />
            <Route path="flujo-consolidado" element={<FlujoConsolidado />} />
            <Route path="rentabilidad" element={<Rentabilidad />} />
            {/* [SOFT-DELETE 2026-07-12] Ruta absorbida por /conta/rentabilidad (seccion Por Unidad).
                Redirige para no romper bookmarks/links viejos. Restaurar: element={<RentabilidadUnidades />}. */}
            <Route path="rentabilidad-unidades" element={<Navigate to="/conta/rentabilidad" replace />} />
            {/* [SOFT-DELETE 2026-07-13] Liquidacion SISOL retirada (no solicitada). Redirige para no romper
                bookmarks. La config de % SISOL se mantiene en /conta/catalogos (tab "% SISOL"). Restaurar: element={<Sisol />}. */}
            <Route path="sisol" element={<Navigate to="/conta/catalogos" replace />} />
            <Route path="egresos" element={<Egresos />} />
            <Route path="honorarios" element={<Honorarios />} />
            <Route path="epidemiologia" element={<Epidemiologia />} />
            <Route path="personal" element={<CostosPersonal />} />
            {/* [SOFT-DELETE 2026-07-13] Ruta absorbida por /conta/egresos (unifica proveedor/entidad).
                Redirige para no romper bookmarks/links viejos. Restaurar: element={<Compras />}. */}
            <Route path="compras" element={<Navigate to="/conta/egresos" replace />} />
            <Route path="catalogos" element={<Catalogos />} />
            <Route path="usuarios" element={<Usuarios />} />
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

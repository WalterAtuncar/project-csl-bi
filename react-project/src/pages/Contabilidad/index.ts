// [SOFT-DELETE 2026-07-25] ContaLogin (breakglass) fuera del barrel: no tiene ruta desde el
// routing unificado (App.tsx no registra /conta/login). La pagina queda INTACTA en disco;
// restaurar = re-agregar este export y su <Route>.
export { default as ContaLayout } from './ContaLayout';
export { default as Dashboard } from './Dashboard';
export { default as Egresos } from './Egresos';
export { default as CostosPersonal } from './CostosPersonal';
export { default as CajaDiaria } from './CajaDiaria';
export { default as FlujoConsolidado } from './FlujoConsolidado';
export { default as Rentabilidad } from './Rentabilidad';
export { default as Honorarios } from './Honorarios';
export { default as Epidemiologia } from './Epidemiologia';
export { default as RentabilidadUnidades } from './RentabilidadUnidades';
export { default as Sisol } from './Sisol';
export { default as Compras } from './Compras';
export { default as Catalogos } from './Catalogos';
export { default as Usuarios } from './Usuarios';
export { default as Consultas } from './Consultas/Consultas';

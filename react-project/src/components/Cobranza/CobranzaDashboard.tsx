import React, { useState, useEffect } from 'react';
import useCobranza from '../../hooks/useCobranza';
import { EstadisticasVentas, RangoFechas } from '../../types/cobranza';
import './CobranzaDashboard.css';

/**
 * Dashboard principal de cobranza que demuestra el uso del hook useCobranza
 */
const CobranzaDashboard: React.FC = () => {
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaInicio] = useState<string>('');
  const [estadisticas, setEstadisticas] = useState<EstadisticasVentas | null>(null);
  const [ventasAsistenciales, setVentasAsistenciales] = useState<any[]>([]);
  const [ventasOcupacionales, setVentasOcupacionales] = useState<any[]>([]);

  const {
    loading,
    error,
    lastOperation,
    getEstadisticasVentas,
    getVentasAsistenciales,
    getVentasOcupacionales,
    getRangoMesActual,
    getRangoMesAnterior,
    clearError,
    resetState
  } = useCobranza();

  // Inicializar fechas con el mes actual
  useEffect(() => {
    const rangoActual = getRangoMesActual();
    setFechaInicio(rangoActual.fechaInicio);
    setFechaInicio(rangoActual.fechaFin);
  }, [getRangoMesActual]);

  // Cargar estadísticas cuando cambien las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      cargarEstadisticas();
    }
  }, [fechaInicio, fechaFin]);

  const cargarEstadisticas = async () => {
    if (!fechaInicio || !fechaFin) return;

    const stats = await getEstadisticasVentas(fechaInicio, fechaFin);
    if (stats) {
      setEstadisticas(stats);
    }
  };

  const cargarVentasAsistenciales = async () => {
    if (!fechaInicio || !fechaFin) return;

    const ventas = await getVentasAsistenciales({
      fechaInicio,
      fechaFin,
      fechaInicioRet2Meses: fechaInicio
    });

    if (ventas?.objModel) {
      setVentasAsistenciales(ventas.objModel);
    }
  };

  const cargarVentasOcupacionales = async () => {
    if (!fechaInicio || !fechaFin) return;

    const ventas = await getVentasOcupacionales({
      fechaInicio,
      fechaFin,
      fechaInicioRet2Meses: fechaInicio
    });

    if (ventas?.objModel) {
      setVentasOcupacionales(ventas.objModel);
    }
  };

  const usarMesActual = () => {
    const rango = getRangoMesActual();
    setFechaInicio(rango.fechaInicio);
    setFechaInicio(rango.fechaFin);
  };

  const usarMesAnterior = () => {
    const rango = getRangoMesAnterior();
    setFechaInicio(rango.fechaInicio);
    setFechaInicio(rango.fechaFin);
  };

  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(valor);
  };

  const formatearFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleDateString('es-PE');
  };

  if (loading) {
    return (
      <div className="cobranza-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando información de cobranza...</p>
          <p className="operation-info">{lastOperation}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cobranza-dashboard">
      <header className="dashboard-header">
        <h1>Dashboard de Cobranza</h1>
        <div className="header-actions">
          <button onClick={resetState} className="btn-secondary">
            Reiniciar Estado
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <p className="error-message">{error}</p>
          <button onClick={clearError} className="btn-error">
            Cerrar
          </button>
        </div>
      )}

      <section className="filtros-section">
        <h2>Filtros de Fecha</h2>
        <div className="filtros-container">
          <div className="filtro-grupo">
            <label htmlFor="fechaInicio">Fecha de Inicio:</label>
            <input
              type="date"
              id="fechaInicio"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="filtro-input"
            />
          </div>
          
          <div className="filtro-grupo">
            <label htmlFor="fechaFin">Fecha de Fin:</label>
            <input
              type="date"
              id="fechaFin"
              value={fechaFin}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="filtro-input"
            />
          </div>
          
          <div className="filtro-acciones">
            <button onClick={usarMesActual} className="btn-primary">
              Mes Actual
            </button>
            <button onClick={usarMesAnterior} className="btn-primary">
              Mes Anterior
            </button>
            <button onClick={cargarEstadisticas} className="btn-success">
              Actualizar
            </button>
          </div>
        </div>
      </section>

      {estadisticas && (
        <section className="estadisticas-section">
          <h2>Estadísticas de Ventas</h2>
          <div className="estadisticas-grid">
            <div className="stat-card">
              <h3>Total de Ventas</h3>
              <p className="stat-value">{estadisticas.totalVentas.toLocaleString()}</p>
            </div>
            
            <div className="stat-card">
              <h3>Total de Ingresos</h3>
              <p className="stat-value">{formatearMoneda(estadisticas.totalIngresos)}</p>
            </div>
            
            <div className="stat-card">
              <h3>Total de Anulaciones</h3>
              <p className="stat-value">{estadisticas.totalAnulaciones.toLocaleString()}</p>
            </div>
            
            <div className="stat-card">
              <h3>Promedio por Venta</h3>
              <p className="stat-value">{formatearMoneda(estadisticas.promedioVenta)}</p>
            </div>
          </div>

          <div className="ventas-por-tipo">
            <h3>Ventas por Tipo</h3>
            <div className="tipo-ventas-grid">
              {Object.entries(estadisticas.ventasPorTipo).map(([tipo, cantidad]) => (
                <div key={tipo} className="tipo-venta-card">
                  <h4>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</h4>
                  <p className="tipo-cantidad">{cantidad.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="acciones-section">
        <h2>Acciones Rápidas</h2>
        <div className="acciones-grid">
          <button onClick={cargarVentasAsistenciales} className="accion-btn">
            Cargar Ventas Asistenciales
          </button>
          
          <button onClick={cargarVentasOcupacionales} className="accion-btn">
            Cargar Ventas Ocupacionales
          </button>
        </div>
      </section>

      {ventasAsistenciales.length > 0 && (
        <section className="ventas-section">
          <h2>Ventas Asistenciales ({ventasAsistenciales.length})</h2>
          <div className="ventas-table-container">
            <table className="ventas-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Servicio</th>
                  <th>Importe</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ventasAsistenciales.slice(0, 10).map((venta, index) => (
                  <tr key={index}>
                    <td>{venta.idVenta || 'N/A'}</td>
                    <td>{venta.fecha ? formatearFecha(venta.fecha) : 'N/A'}</td>
                    <td>{venta.paciente || 'N/A'}</td>
                    <td>{venta.servicio || 'N/A'}</td>
                    <td>{venta.importe ? formatearMoneda(venta.importe) : 'N/A'}</td>
                    <td>
                      <span className={`estado-badge estado-${venta.estado?.toLowerCase() || 'desconocido'}`}>
                        {venta.estado || 'N/A'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ventasAsistenciales.length > 10 && (
              <p className="table-info">
                Mostrando 10 de {ventasAsistenciales.length} ventas
              </p>
            )}
          </div>
        </section>
      )}

      {ventasOcupacionales.length > 0 && (
        <section className="ventas-section">
          <h2>Ventas Ocupacionales ({ventasOcupacionales.length})</h2>
          <div className="ventas-table-container">
            <table className="ventas-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Servicio</th>
                  <th>Importe</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ventasOcupacionales.slice(0, 10).map((venta, index) => (
                  <tr key={index}>
                    <td>{venta.idVenta || 'N/A'}</td>
                    <td>{venta.fecha ? formatearFecha(venta.fecha) : 'N/A'}</td>
                    <td>{venta.paciente || 'N/A'}</td>
                    <td>{venta.servicio || 'N/A'}</td>
                    <td>{venta.importe ? formatearMoneda(venta.importe) : 'N/A'}</td>
                    <td>
                      <span className={`estado-badge estado-${venta.estado?.toLowerCase() || 'desconocido'}`}>
                        {venta.estado || 'N/A'}
                      </td>
                    </span>
                  </tr>
                ))}
              </tbody>
            </table>
            {ventasOcupacionales.length > 10 && (
              <p className="table-info">
                Mostrando 10 de {ventasOcupacionales.length} ventas
              </p>
            )}
          </div>
        </section>
      )}

      <footer className="dashboard-footer">
        <p>Última operación: {lastOperation || 'Ninguna'}</p>
        <p>Estado: {loading ? 'Cargando...' : 'Listo'}</p>
      </footer>
    </div>
  );
};

export default CobranzaDashboard;

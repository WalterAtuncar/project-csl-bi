import { useState, useCallback, useMemo } from 'react';
import CobranzaService from '../services/cobranzaService';
import { EstadisticasVentas, RangoFechas, FiltroBusquedaExtendido } from '../types/cobranza';
import { ApiResponse } from '../@types/facturacion';

/**
 * Hook personalizado para el servicio de cobranza
 * Proporciona una interfaz fácil de usar para todas las operaciones de cobranza
 */
export const useCobranza = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOperation, setLastOperation] = useState<string | null>(null);

  // Instancia del servicio
  const cobranzaService = useMemo(() => CobranzaService.getInstance(), []);

  // Función para manejar errores
  const handleError = useCallback((error: unknown, operation: string) => {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    setError(errorMessage);
    setLastOperation(operation);
    console.error(`Error en ${operation}:`, error);
  }, []);

  // Función para limpiar errores
  const clearError = useCallback(() => {
    setError(null);
    setLastOperation(null);
  }, []);

  // Función para ejecutar operaciones con manejo de estado
  const executeOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    setLastOperation(operationName);

    try {
      const result = await operation();
      setLoading(false);
      return result;
    } catch (err) {
      handleError(err, operationName);
      setLoading(false);
      return null;
    }
  }, [handleError]);

  // ========================================
  // MÉTODOS PARA CIERRE DE CAJA
  // ========================================

  const getVentasAsistenciales = useCallback(async (request: any) => {
    return executeOperation(
      () => cobranzaService.getGerenciaVentasAsistencialMS(request),
      'Obtener ventas asistenciales'
    );
  }, [executeOperation, cobranzaService]);

  const getVentasOcupacionales = useCallback(async (request: any) => {
    return executeOperation(
      () => cobranzaService.getGerenciaVentasOcupacionalMS(request),
      'Obtener ventas ocupacionales'
    );
  }, [executeOperation, cobranzaService]);

  const getVentasMTC = useCallback(async (request: any) => {
    return executeOperation(
      () => cobranzaService.getGerenciaVentasMTCMS(request),
      'Obtener ventas MTC'
    );
  }, [executeOperation, cobranzaService]);

  const getVentasFarmacia = useCallback(async (request: any) => {
    return executeOperation(
      () => cobranzaService.getGerenciaVentasFarmaciaMS(request),
      'Obtener ventas de farmacia'
    );
  }, [executeOperation, cobranzaService]);

  // ========================================
  // MÉTODOS PARA LIQUIDACIONES
  // ========================================

  const getLiquidacionesNoFacturadas = useCallback(async (request: any) => {
    return executeOperation(
      () => cobranzaService.getNoLiquidados(request),
      'Obtener liquidaciones no facturadas'
    );
  }, [executeOperation, cobranzaService]);

  const getLiquidacionesPorEmpresa = useCallback(async (request: any) => {
    return executeOperation(
      () => cobranzaService.getLiquidacionCuentasPorCobrar(request),
      'Obtener liquidaciones por empresa'
    );
  }, [executeOperation, cobranzaService]);

  // ========================================
  // MÉTODOS PARA INDICADORES
  // ========================================

  const getIndicadoresLaboratorio = useCallback(async (request: any) => {
    return executeOperation(
      () => cobranzaService.getLaboratorioIndicadores_Cantidad(request),
      'Obtener indicadores de laboratorio'
    );
  }, [executeOperation, cobranzaService]);

  // ========================================
  // MÉTODOS PARA ESTADÍSTICAS
  // ========================================

  const getEstadisticasVentas = useCallback(async (fechaInicio: string, fechaFin: string): Promise<EstadisticasVentas | null> => {
    return executeOperation(
      () => cobranzaService.getEstadisticasVentas(fechaInicio, fechaFin),
      'Obtener estadísticas de ventas'
    );
  }, [executeOperation, cobranzaService]);

  // ========================================
  // MÉTODOS PARA UTILIDADES
  // ========================================

  const getRangoMesActual = useCallback((): RangoFechas => {
    return cobranzaService.getCurrentMonthRange();
  }, [cobranzaService]);

  const getRangoMesAnterior = useCallback((): RangoFechas => {
    return cobranzaService.getPreviousMonthRange();
  }, [cobranzaService]);

  // ========================================
  // MÉTODOS PARA EXPORTACIÓN
  // ========================================

  const exportarVentasCSV = useCallback(async (data: unknown[], filename?: string) => {
    return executeOperation(
      () => cobranzaService.exportToCSV(data as Record<string, unknown>[], filename),
      'Exportar ventas a CSV'
    );
  }, [executeOperation, cobranzaService]);

  const prepararDatosExportacion = useCallback((data: unknown[], tipo: 'ventas' | 'liquidaciones' | 'indicadores') => {
    return cobranzaService.prepareDataForExport(data as Record<string, unknown>[], tipo);
  }, [cobranzaService]);

  // ========================================
  // MÉTODOS PARA REPORTES AVANZADOS
  // ========================================

  const getReporteVentasAvanzado = useCallback(async (request: any) => {
    return executeOperation(
      () => cobranzaService.getReporteVentasAvanzado(request),
      'Obtener reporte de ventas avanzado'
    );
  }, [executeOperation, cobranzaService]);

  // ========================================
  // MÉTODOS PARA CATÁLOGOS
  // ========================================

  const getMarcas = useCallback(async (filtro: string) => {
    return executeOperation(
      () => cobranzaService.getCLMarca(filtro),
      'Obtener marcas'
    );
  }, [executeOperation, cobranzaService]);

  const getProveedores = useCallback(async (filtro: string) => {
    return executeOperation(
      () => cobranzaService.getCLProveedor(filtro),
      'Obtener proveedores'
    );
  }, [executeOperation, cobranzaService]);

  // ========================================
  // MÉTODOS PARA COBRANZA
  // ========================================

  const getCobranzaDetalle = useCallback(async (idVenta: string) => {
    return executeOperation(
      () => cobranzaService.getCobranzaDetalleByIdVenta(idVenta),
      'Obtener detalle de cobranza'
    );
  }, [executeOperation, cobranzaService]);

  const anularVenta = useCallback(async (id: string) => {
    return executeOperation(
      () => cobranzaService.anularVentaMalEnviada(id),
      'Anular venta'
    );
  }, [executeOperation, cobranzaService]);

  // ========================================
  // MÉTODOS PARA OPERACIONES CONSOLIDADAS
  // ========================================

  const getResumenConsolidado = useCallback(async (fechaInicio: string, fechaFin: string) => {
    return executeOperation(
      () => cobranzaService.getResumenConsolidadoCierreCaja(fechaInicio, fechaFin),
      'Obtener resumen consolidado'
    );
  }, [executeOperation, cobranzaService]);

  // ========================================
  // ESTADO Y MÉTODOS DE UTILIDAD
  // ========================================

  const resetState = useCallback(() => {
    setLoading(false);
    setError(null);
    setLastOperation(null);
  }, []);

  const isOperationSuccessful = useCallback((operationName: string) => {
    return lastOperation === operationName && !error;
  }, [lastOperation, error]);

  return {
    // Estado
    loading,
    error,
    lastOperation,
    
    // Métodos de cierre de caja
    getVentasAsistenciales,
    getVentasOcupacionales,
    getVentasMTC,
    getVentasFarmacia,
    
    // Métodos de liquidaciones
    getLiquidacionesNoFacturadas,
    getLiquidacionesPorEmpresa,
    
    // Métodos de indicadores
    getIndicadoresLaboratorio,
    
    // Métodos de estadísticas
    getEstadisticasVentas,
    
    // Métodos de utilidades
    getRangoMesActual,
    getRangoMesAnterior,
    
    // Métodos de exportación
    exportarVentasCSV,
    prepararDatosExportacion,
    
    // Métodos de reportes avanzados
    getReporteVentasAvanzado,
    
    // Métodos de catálogos
    getMarcas,
    getProveedores,
    
    // Métodos de cobranza
    getCobranzaDetalle,
    anularVenta,
    
    // Métodos consolidados
    getResumenConsolidado,
    
    // Métodos de utilidad
    clearError,
    resetState,
    isOperationSuccessful
  };
};

export default useCobranza;

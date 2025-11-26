# Servicio de Cobranza - Documentación

## Descripción

El servicio de cobranza es un sistema completo para manejar todas las operaciones relacionadas con cobranza, ventas y reportes gerenciales en la aplicación de facturación. Proporciona una interfaz unificada para acceder a diferentes tipos de ventas, liquidaciones, indicadores y estadísticas.

## Características Principales

- ✅ **Cierre de Caja**: Manejo de ventas asistenciales, ocupacionales, MTC y farmacia
- ✅ **Liquidaciones**: Gestión de cuentas por cobrar y estados de liquidación
- ✅ **Indicadores**: Métricas de laboratorio y reportes gerenciales
- ✅ **Estadísticas**: Resúmenes consolidados y análisis de ventas
- ✅ **Exportación**: Funcionalidades para exportar datos a CSV
- ✅ **Manejo de Errores**: Sistema robusto de manejo de errores y reintentos
- ✅ **Validaciones**: Validación de fechas y parámetros de entrada
- ✅ **Hook Personalizado**: React hook para fácil integración en componentes

## Estructura del Proyecto

```
src/
├── components/
│   └── Cobranza/
│       ├── CobranzaDashboard.tsx    # Componente principal del dashboard
│       ├── CobranzaDashboard.css    # Estilos del dashboard
│       └── index.ts                 # Exportaciones
├── hooks/
│   └── useCobranza.ts               # Hook personalizado para cobranza
├── services/
│   └── cobranzaService.ts           # Servicio principal de cobranza
└── types/
    └── cobranza.ts                  # Tipos TypeScript específicos
```

## Instalación y Uso

### 1. Importar el Hook

```typescript
import { useCobranza } from '../components/Cobranza';
```

### 2. Usar en un Componente

```typescript
const MiComponente = () => {
  const {
    loading,
    error,
    getEstadisticasVentas,
    getVentasAsistenciales,
    clearError
  } = useCobranza();

  const cargarEstadisticas = async () => {
    const stats = await getEstadisticasVentas('2024-01-01', '2024-01-31');
    if (stats) {
      console.log('Estadísticas cargadas:', stats);
    }
  };

  return (
    <div>
      {loading && <p>Cargando...</p>}
      {error && <p>Error: {error}</p>}
      <button onClick={cargarEstadisticas}>
        Cargar Estadísticas
      </button>
    </div>
  );
};
```

## API del Hook

### Estado

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `loading` | `boolean` | Indica si hay una operación en curso |
| `error` | `string \| null` | Mensaje de error si ocurrió alguno |
| `lastOperation` | `string \| null` | Nombre de la última operación ejecutada |

### Métodos de Cierre de Caja

#### `getVentasAsistenciales(request)`
Obtiene ventas asistenciales para cierre de caja.

```typescript
const ventas = await getVentasAsistenciales({
  fechaInicio: '2024-01-01',
  fechaFin: '2024-01-31',
  fechaInicioRet2Meses: '2024-01-01'
});
```

#### `getVentasOcupacionales(request)`
Obtiene ventas ocupacionales para cierre de caja.

#### `getVentasMTC(request)`
Obtiene ventas MTC para cierre de caja.

#### `getVentasFarmacia(request)`
Obtiene ventas de farmacia para cierre de caja.

### Métodos de Liquidaciones

#### `getLiquidacionesNoFacturadas(request)`
Obtiene liquidaciones no facturadas.

#### `getLiquidacionesPorEmpresa(request)`
Obtiene liquidaciones por empresa.

### Métodos de Indicadores

#### `getIndicadoresLaboratorio(request)`
Obtiene indicadores de laboratorio.

### Métodos de Estadísticas

#### `getEstadisticasVentas(fechaInicio, fechaFin)`
Obtiene estadísticas resumidas de ventas por período.

```typescript
const stats = await getEstadisticasVentas('2024-01-01', '2024-01-31');
// Retorna: { totalVentas, totalIngresos, totalAnulaciones, promedioVenta, ventasPorTipo }
```

### Métodos de Utilidades

#### `getRangoMesActual()`
Obtiene el rango de fechas del mes actual.

#### `getRangoMesAnterior()`
Obtiene el rango de fechas del mes anterior.

### Métodos de Exportación

#### `exportarVentasCSV(data, filename?)`
Exporta datos a formato CSV.

#### `prepararDatosExportacion(data, tipo)`
Prepara datos para exportación con formato específico.

### Métodos de Reportes Avanzados

#### `getReporteVentasAvanzado(request)`
Obtiene reporte de ventas con filtros avanzados.

### Métodos de Catálogos

#### `getMarcas(filtro)`
Obtiene marcas por filtro.

#### `getProveedores(filtro)`
Obtiene proveedores por filtro.

### Métodos de Cobranza

#### `getCobranzaDetalle(idVenta)`
Obtiene detalle de cobranza por ID de venta.

#### `anularVenta(id)`
Anula una venta mal enviada.

### Métodos Consolidados

#### `getResumenConsolidado(fechaInicio, fechaFin)`
Obtiene resumen consolidado para cierre de caja de todos los tipos.

### Métodos de Utilidad

#### `clearError()`
Limpia el estado de error.

#### `resetState()`
Reinicia todo el estado del hook.

#### `isOperationSuccessful(operationName)`
Verifica si una operación específica fue exitosa.

## Tipos de Datos

### EstadisticasVentas

```typescript
interface EstadisticasVentas {
  totalVentas: number;
  totalIngresos: number;
  totalAnulaciones: number;
  promedioVenta: number;
  ventasPorTipo: Record<string, number>;
}
```

### RangoFechas

```typescript
interface RangoFechas {
  fechaInicio: string;
  fechaFin: string;
}
```

### ReporteVentasAvanzadoRequest

```typescript
interface ReporteVentasAvanzadoRequest {
  tipoReporte: 'asistencial' | 'ocupacional' | 'mtc' | 'farmacia' | 'global';
  incluirAnuladas?: boolean;
  agruparPor?: 'dia' | 'semana' | 'mes';
  fechaInicio: string;
  fechaFin: string;
  // ... otros campos
}
```

## Ejemplos de Uso

### Dashboard Completo

```typescript
import { CobranzaDashboard } from '../components/Cobranza';

// En tu ruta o componente principal
<CobranzaDashboard />
```

### Uso Personalizado

```typescript
import { useCobranza } from '../components/Cobranza';

const MiDashboard = () => {
  const {
    loading,
    error,
    getEstadisticasVentas,
    getRangoMesActual
  } = useCobranza();

  const [estadisticas, setEstadisticas] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const rango = getRangoMesActual();
      const stats = await getEstadisticasVentas(rango.fechaInicio, rango.fechaFin);
      if (stats) {
        setEstadisticas(stats);
      }
    };

    cargarDatos();
  }, []);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Mi Dashboard</h1>
      {estadisticas && (
        <div>
          <p>Total Ventas: {estadisticas.totalVentas}</p>
          <p>Total Ingresos: {estadisticas.totalIngresos}</p>
        </div>
      )}
    </div>
  );
};
```

### Exportación de Datos

```typescript
const { exportarVentasCSV, prepararDatosExportacion } = useCobranza();

const exportarVentas = async () => {
  const datosFormateados = prepararDatosExportacion(ventas, 'ventas');
  await exportarVentasCSV(datosFormateados, 'ventas_enero_2024.csv');
};
```

## Manejo de Errores

El hook maneja automáticamente los errores y los expone a través del estado `error`. Puedes limpiar los errores usando `clearError()`:

```typescript
const { error, clearError } = useCobranza();

// En tu JSX
{error && (
  <div className="error-banner">
    <p>{error}</p>
    <button onClick={clearError}>Cerrar</button>
  </div>
)}
```

## Validaciones

El servicio incluye validaciones automáticas para:

- Formato de fechas
- Rango de fechas válido
- Parámetros requeridos
- Tipos de datos

## Características Avanzadas

### Reintentos Automáticos

El servicio incluye un sistema de reintentos automáticos para operaciones que pueden fallar temporalmente (errores de red, errores 5xx).

### Caché de Datos

El servicio puede implementar caché de datos para mejorar el rendimiento (configurable).

### Métricas de Rendimiento

El servicio registra métricas de rendimiento para monitoreo y optimización.

## Configuración

El servicio se configura automáticamente usando la configuración del `BaseApiService`. Puedes personalizar la configuración modificando el archivo de configuración de la API.

## Dependencias

- React 18+
- TypeScript 4.5+
- BaseApiService (servicio base de la aplicación)

## Contribución

Para contribuir al servicio de cobranza:

1. Mantén la consistencia con el patrón de diseño existente
2. Agrega tipos TypeScript para nuevas funcionalidades
3. Incluye documentación para nuevos métodos
4. Agrega tests para nuevas funcionalidades
5. Sigue las convenciones de nomenclatura establecidas

## Soporte

Para soporte técnico o preguntas sobre el servicio de cobranza, contacta al equipo de desarrollo o consulta la documentación de la API.

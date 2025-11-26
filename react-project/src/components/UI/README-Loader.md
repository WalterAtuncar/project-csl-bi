# Sistema de Loader con Temática Médica

Este sistema proporciona un loader global con temática de electrocardiograma (ECG) que se integra automáticamente con todas las peticiones HTTP.

## Componentes

### HeartBeatLoader
Componente visual del loader que simula un monitor de electrocardiograma con:
- Línea de ECG animada con latidos del corazón
- Punto blanco que recorre la línea
- Grid de fondo estilo monitor médico
- Indicadores vitales (BPM, STATUS)
- Colores del proyecto (azul y rojo)

### GlobalLoader
Componente provider que se conecta automáticamente al LoaderService.

## Servicios

### LoaderService
Servicio singleton que maneja el estado global del loader:
- Control de visibilidad
- Contador de peticiones concurrentes
- Mensajes personalizados
- Integración automática con HTTP

## Hooks

### useLoader
Hook personalizado para manejar el loader en componentes React.

## Uso

### 1. Integración Global
```tsx
// En App.tsx o layout principal
import { GlobalLoader } from './components/UI';

function App() {
  return (
    <div>
      {/* Tu aplicación */}
      <GlobalLoader />
    </div>
  );
}
```

### 2. Uso Manual en Componentes
```tsx
import { useLoader } from './hooks';

function MyComponent() {
  const { show, hide, withLoader } = useLoader();

  const handleAction = async () => {
    // Opción 1: Manual
    show('Procesando datos...');
    try {
      await someAsyncOperation();
    } finally {
      hide();
    }

    // Opción 2: Automático
    await withLoader(
      () => someAsyncOperation(),
      'Procesando datos...'
    );
  };
}
```

### 3. Integración Automática con HTTP
El loader se muestra automáticamente en todas las peticiones HTTP:

```tsx
// Esto mostrará el loader automáticamente
const userData = await authService.login(username, password);

// Para omitir el loader en una petición específica
const response = await apiService.get('/endpoint', {}, { skipLoader: true });
```

## Mensajes Automáticos

El sistema detecta automáticamente el tipo de petición y muestra mensajes apropiados:

- `/auth/login` → "Iniciando sesión..."
- `/dashboard` → "Cargando dashboard..."
- `/auth/logout` → "Cerrando sesión..."
- `POST` → "Guardando datos..."
- `PUT/PATCH` → "Actualizando información..."
- `DELETE` → "Eliminando registro..."
- `GET` → "Cargando información..."

## Características

- **Automático**: Se integra con todos los servicios HTTP
- **Contador inteligente**: Maneja múltiples peticiones concurrentes
- **Temática médica**: Diseño de electrocardiograma
- **Responsive**: Se adapta a diferentes tamaños de pantalla
- **Accesible**: Soporte para temas claro/oscuro
- **Personalizable**: Mensajes y comportamiento configurables

## Colores del Proyecto

- **Azul**: `#3b82f6` (primary)
- **Rojo**: `#ef4444` (accent/heartbeat)
- **Fondo**: Gradientes oscuros para simular monitor médico 
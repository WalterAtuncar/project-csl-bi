# 🚨 ToastAlerts - Sistema de Alertas Reutilizable

Sistema completo de alertas y notificaciones usando React Hot Toast con diseño personalizado y múltiples tipos de alertas.

## 📦 Instalación y Configuración

El componente ya está configurado en `App.tsx` con el `ToastProvider`, por lo que está listo para usar en cualquier parte de la aplicación.

## 🎯 Uso Básico

```typescript
import ToastAlerts from '../components/UI/ToastAlerts';

// En cualquier componente o función
ToastAlerts.success({
  message: "¡Operación completada exitosamente!"
});
```

## 🎨 Tipos de Alertas Disponibles

### ✅ SUCCESS - Éxito
```typescript
ToastAlerts.success({
  title: "¡Éxito!",
  message: "El cierre de caja se creó correctamente",
  action: {
    label: "Ver detalles",
    onClick: () => navigate('/caja-mayor')
  }
});
```

### ❌ ERROR - Error
```typescript
ToastAlerts.error({
  title: "Error en la operación",
  message: "No se pudo conectar con el servidor. Inténtelo nuevamente.",
  action: {
    label: "Reintentar",
    onClick: () => retryOperation()
  }
});
```

### ⚠️ WARNING - Advertencia
```typescript
ToastAlerts.warning({
  title: "Advertencia",
  message: "Esta acción no se puede deshacer",
  duration: 6000
});
```

### ℹ️ INFO - Información
```typescript
ToastAlerts.info({
  title: "Información",
  message: "Se han cargado 150 registros en la tabla",
  position: 'bottom-right'
});
```

### 🔄 LOADING - Cargando
```typescript
// Mostrar loading
const loadingToastId = ToastAlerts.loading("Procesando datos...");

// Luego convertir a éxito o error
ToastAlerts.promiseToSuccess(loadingToastId, {
  message: "¡Datos procesados correctamente!"
});

// O a error
ToastAlerts.promiseToError(loadingToastId, {
  title: "Error",
  message: "No se pudieron procesar los datos"
});
```

### ❓ CONFIRMATION - Confirmación (Modal-like)
```typescript
ToastAlerts.confirmation({
  title: "Confirmar eliminación",
  message: "¿Está seguro de que desea eliminar este registro? Esta acción no se puede deshacer.",
  confirmText: "Sí, eliminar",
  cancelText: "Cancelar",
  confirmButtonClass: "bg-red-600 hover:bg-red-700 text-white",
  onConfirm: async () => {
    await deleteRecord();
    ToastAlerts.success({ message: "Registro eliminado correctamente" });
  },
  onCancel: () => {
    console.log("Operación cancelada");
  }
});
```

### 💡 HELP - Ayuda
```typescript
ToastAlerts.help({
  title: "Ayuda",
  message: "Para filtrar por fecha, use el formato DD/MM/YYYY",
  action: {
    label: "Ver guía completa",
    onClick: () => openHelpModal()
  }
});
```

## 🔧 Opciones Avanzadas

### Posicionamiento
```typescript
ToastAlerts.success({
  message: "Notificación en la esquina inferior izquierda",
  position: 'bottom-left' // 'top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'
});
```

### Duración personalizada
```typescript
ToastAlerts.warning({
  message: "Esta alerta durará 10 segundos",
  duration: 10000 // milisegundos
});
```

### Sin cierre automático
```typescript
ToastAlerts.error({
  message: "Error crítico - requiere atención manual",
  duration: Infinity // No se cierra automáticamente
});
```

## 🎯 Patrones de Uso Comunes

### Para operaciones CRUD
```typescript
// Crear
const handleCreate = async () => {
  const loadingId = ToastAlerts.loading("Creando registro...");
  
  try {
    await createRecord();
    ToastAlerts.promiseToSuccess(loadingId, {
      title: "¡Creado!",
      message: "El registro se creó correctamente"
    });
  } catch (error) {
    ToastAlerts.promiseToError(loadingId, {
      title: "Error",
      message: "No se pudo crear el registro"
    });
  }
};

// Eliminar con confirmación
const handleDelete = (id: number) => {
  ToastAlerts.confirmation({
    title: "Confirmar eliminación",
    message: "¿Está seguro de eliminar este elemento?",
    onConfirm: async () => {
      try {
        await deleteRecord(id);
        ToastAlerts.success({ message: "Eliminado correctamente" });
        refreshList();
      } catch (error) {
        ToastAlerts.error({ message: "Error al eliminar" });
      }
    }
  });
};
```

### Para validaciones de formulario
```typescript
const validateForm = () => {
  if (!form.email) {
    ToastAlerts.warning({
      title: "Campo requerido",
      message: "El email es obligatorio"
    });
    return false;
  }
  
  if (!isValidEmail(form.email)) {
    ToastAlerts.error({
      title: "Email inválido",
      message: "Por favor ingrese un email válido"
    });
    return false;
  }
  
  return true;
};
```

### Para notificaciones de estado
```typescript
// Al cargar datos
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await fetchData();
      ToastAlerts.info({
        message: `Se cargaron ${data.length} registros`
      });
    } catch (error) {
      ToastAlerts.error({
        title: "Error de conexión",
        message: "No se pudieron cargar los datos"
      });
    }
  };
  
  loadData();
}, []);
```

## 🛠️ Métodos de Control

```typescript
// Cerrar todos los toasts
ToastAlerts.dismissAll();

// Cerrar un toast específico
ToastAlerts.dismiss(toastId);
```

## 🎨 Personalización de Estilos

Cada tipo de alerta tiene colores temáticos automáticos:
- **Success**: Verde
- **Error**: Rojo  
- **Warning**: Amarillo
- **Info**: Azul
- **Help**: Púrpura

Compatible con modo oscuro automáticamente.

## 📱 Responsivo

Todas las alertas son completamente responsivas y se adaptan a dispositivos móviles y de escritorio.

## 🔄 Animaciones

Incluye animaciones suaves de entrada y salida con easing personalizado para una mejor experiencia de usuario. 
# Gestión de Cuentas Bancarias y Conciliación en el Sistema de Clínica

## Tabla de Contenidos
1. Introducción
2. Arquitectura de Tesorería
3. Componentes del Sistema
4. Creación de Nuevas Cuentas Bancarias
5. Asociación de Cuentas a Formas de Pago
6. Actualización de Cuentas Existentes
7. Habilitación por Establecimiento
8. Proceso de Conciliación Bancaria
9. Validaciones y Troubleshooting
10. Anexos

---

## Introducción

Procedimientos técnicos para la gestión de cuentas bancarias: creación, asociación a formas de pago, mantenimiento y conciliación.

---

## Arquitectura del Módulo de Tesorería

- `datahierarchy` (grupo 46): catálogo de formas de pago.
- `relacionformapagodocumento`: pivote forma de pago → documento.
- `documento`: bancos y cajas (`i_UsadoTesoreria`, `v_NroCuenta`).
- `asientocontable`: plan de cuentas (`v_Periodo`, `i_IdMoneda`).
- `cobranzadetalle`: registro de cobros por forma de pago.

---

## Componentes del Sistema

### documento
Representa cuentas bancarias y cajas. Ejemplo: `BANCO CREDITO MN`, `CAJA SOLES`.

### asientocontable
Plan de cuentas por periodo con moneda (1 = Soles, 2 = Dólares).

### relacionformapagodocumento
Vincula formas de pago (grupo 46) con documentos.

### datahierarchy
Catálogos jerárquicos (medio de pago y forma de pago).

### establecimientodetalle
Habilitación por establecimiento (sede/sucursal).

---

## Creación de Nuevas Cuentas Bancarias

Flujo:
1. Obtener próximo código de documento.
2. Insertar cuenta en `asientocontable` (periodo y moneda).
3. Crear `documento` apuntando a `v_NroCuenta` contable.
4. Asociar formas de pago en `relacionformapagodocumento`.
5. Habilitar por establecimiento.
6. Validar relación `documento` ↔ `asientocontable`.

---

## Asociación de Cuentas a Formas de Pago

- Asociar nueva cuenta a forma de pago existente.
- Crear nueva forma y vincularla.
- Múltiples formas para un mismo banco (según política).

---

## Actualización de Cuentas Existentes

- Cambiar número visible (nombre) del banco.
- Cambiar cuenta contable: actualizar `v_NroCuenta` y validar en plan de cuentas.
- Cambiar moneda: coherencia con `i_IdMoneda` y nombre (MN/ME).
- Deshabilitar cuenta: `i_UsadoTesoreria = 0` en lugar de eliminar.

---

## Proceso de Conciliación Bancaria

Tablas: `movimientoestadeobancario`, `saldoestadeobancario`, `saldomensualbancos` (según implementación).

Reportes:
- Comparativo sistema vs banco por cuenta y fechas.
- Partidas en tránsito: cobros sin match bancario.
- Resumen de saldos con diferencias.

---

## Validaciones y Troubleshooting

- Documentos sin cuenta contable en periodo actual.
- Formas de pago sin documento asociado.
- Moneda incoherente entre documento y plan de cuentas.
- Duplicidad en `relacionformapagodocumento`.
- Cobros con formas de pago inválidas.

Soluciones frecuentes: crear/actualizar cuenta contable, habilitar documento en establecimiento, corregir formas de pago NULL, revisar diferencias en conciliación.

---

## Anexos

- Script ejemplo para crear un banco.
- Reporte ejecutivo de tesorería.
- Diagrama ER simplificado.
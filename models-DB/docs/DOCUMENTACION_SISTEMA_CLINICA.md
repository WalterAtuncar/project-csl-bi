# Documentación del Sistema de Gestión Clínica

## Tabla de Contenidos
1. [Introducción](#introducción)
2. [Arquitectura General](#arquitectura-general)
3. [Base de Datos: SigesoftDesarrollo_2 (Atenciones Médicas)](#base-de-datos-sigesoftdesarrollo_2-atenciones-médicas)
4. [Base de Datos: 20505310072 (Facturación/Ventas)](#base-de-datos-20505310072-facturaciónventas)
5. [Relación entre Bases de Datos](#relación-entre-bases-de-datos)
6. [Tipos de Servicios Médicos](#tipos-de-servicios-médicos)
7. [Tipos de Clientes y Cajas](#tipos-de-clientes-y-cajas)
8. [Lógica de Comprobantes](#lógica-de-comprobantes)
9. [Casos Especiales](#casos-especiales)
10. [Estados del Sistema](#estados-del-sistema)
11. [Ejemplos de Consultas](#ejemplos-de-consultas)
12. [Glosario de Términos](#glosario-de-términos)

---

## Introducción

El sistema de gestión de la clínica está compuesto por dos bases de datos independientes que trabajan de forma coordinada:

- SigesoftDesarrollo_2: Gestiona las atenciones médicas, citas, pacientes y protocolos.
- 20505310072: Gestiona la facturación, ventas, cobranzas y control contable.

Estas bases de datos se relacionan principalmente a través del número de comprobante de pago (facturas, boletas, etc.).

---

## Arquitectura General

Unión principal: `service.v_ComprobantePago` ↔ `venta.v_SerieDocumento + '-' + v_CorrelativoDocumento`, aplicando limpieza de guiones/espacios/pipes.

- SigesoftDesarrollo_2 (Base Médica): `service`, `calendar`, `protocol`, `person`, `servicecomponent`, `organization`.
- 20505310072 (Base Facturación): `venta`, `ventadetalle`, `cliente`, `cobranzadetalle`.

---

## Base de Datos: SigesoftDesarrollo_2 (Atenciones Médicas)

### service (Atenciones/Consultas)
Almacena cada atención médica realizada a un paciente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `v_ServiceId` | VARCHAR(50) | ID único del servicio (PK) |
| `v_PersonId` | VARCHAR(50) | ID del paciente |
| `v_ProtocolId` | VARCHAR(50) | ID del protocolo/tipo de examen |
| `d_ServiceDate` | DATETIME | Fecha de la atención |
| `v_ComprobantePago` | VARCHAR(50) | Número de comprobante (puede ser NULL) |

Características:
- `v_ComprobantePago` puede ser NULL (empresarial), único (particular) o múltiple separado por `|` (seguros).

### protocol (Protocolos de Atención)
Define qué tipo de servicio se brinda (consulta, examen, procedimiento).

### calendar (Agenda/Citas)
Registra las citas programadas y su estado.

### servicecomponent (Componentes del Servicio)
Componentes/estudios de una atención y el médico tratante. Si hay varios médicos, se puede usar `ROW_NUMBER()`.

### person (Pacientes y Médicos)
Datos personales de pacientes y personal médico.

---

## Base de Datos: 20505310072 (Facturación/Ventas)

### venta (Facturas/Boletas)
Almacena cada documento de venta emitido. Comprobante completo: `v_SerieDocumento + '-' + v_CorrelativoDocumento`.

### ventadetalle (Detalle de Ventas)
Productos/servicios incluidos en cada venta. Una venta puede tener múltiples detalles.

### cliente (Clientes)
Datos de los clientes (personas o empresas). Si `v_ApePaterno` está vacío, es empresa; caso contrario, persona natural.

### cobranzadetalle (Detalle de Cobranzas)
Registro de cobros por forma de pago (efectivo, tarjeta, depósito, etc.).

---

## Relación entre Bases de Datos

```sql
-- Limpieza de comprobantes para comparación
REPLACE(REPLACE(REPLACE(s.v_ComprobantePago, '-', ''), ' ', ''), '|', '') =
REPLACE(REPLACE(REPLACE(v.v_SerieDocumento + '-' + v.v_CorrelativoDocumento, '-', ''), ' ', ''), '|', '')
```

Casos:
- Particular: relación 1:1 con `venta`.
- Empresarial: `v_ComprobantePago` NULL; se factura luego grupalmente.
- Farmacia: ventas sin servicio médico.
- Seguros: un servicio con múltiples comprobantes (separados por `|`).

---

## Tipos de Servicios Médicos

Según `datahierarchy` (i_GroupId = 119). Ejemplos: Empresarial, Particular, Seguros, MTC, SISOL. Filtro típico: `i_MasterServiceTypeId <> 1` para excluir empresariales.

---

## Tipos de Clientes y Cajas

Tipos de cliente (`venta.i_ClienteEsAgente`) determinan cajas contables y reportes. Ejemplo: Asistencial `IN (2,8,9)`.

---

## Lógica de Comprobantes y Casos Especiales

- Ingresos: series `F***`, `B***`, `RSL`, `ICA*`.
- Egresos: `EC*` (devoluciones/NC).
- Internos: `THM`, `TFM` se excluyen.
- Evitar `DISTINCT` si interesa `ventadetalle`.

---

## Ejemplos de Consultas y Validaciones

- Match de atenciones con ventas por fecha, excluyendo empresariales.
- Ventas de farmacia con productos.
- Seguros con conteo de comprobantes.
- Detección de inconsistencias y performance (índices, rangos de fechas).

---

## Glosario de Términos

Catálogo de términos médicos y de facturación usados en el sistema.
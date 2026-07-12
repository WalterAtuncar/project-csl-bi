# PLAN EJECUTABLE: Plataforma de Gestión Financiera (schema `conta` + API Contabilidad + páginas BI)

> **Documento ejecutable por un agente IA.** Basado en "INDICACIONES SISTEMA BI" (Ruth Quispe Jara, 08-jul-2026),
> las 3 maquetas impresas (`_nuevos requerimientos/01bi..03bi.jpeg`), las 22 respuestas de negocio del usuario
> (11-jul-2026) y la exploración verificada de la BD de producción. Todas las decisiones de negocio están
> CERRADAS — no re-preguntar; ejecutar en orden. Cada fase tiene GATE con criterios verificables.
> Estado: **PENDIENTE DE EJECUCIÓN**.

---

## 0. CONTEXTO VERIFICADO Y CONVENCIONES (leer completo antes de ejecutar)

### 0.1 Entorno

| Elemento | Valor |
|---|---|
| BD producción | SQL Server **2012** (11.0.2100) — `190.116.90.35\CSL_2025`, base `20505310072`, user `sa` |
| Herramienta SQL | `D:\Projects\PROYECT-CSL\db-console` → `node query.js [--write] [--db X] [--file y.sql] [--sp nombre] "SQL"`. Archivos SQL en **UTF-8 SIN BOM**, **sin `GO`** (un batch por archivo; los `CREATE PROCEDURE` van cada uno en su propio archivo) |
| Repo git | `D:\Projects\PROYECT-CSL\Project-CSL\project-csl-bi` (rama `main`, remoto WalterAtuncar/project-csl-bi) |
| API existente | `SanLorenzoMicroservices/SanLorenzo.Core.Services` — **net6.0**, Dapper, capas Controller → Business.Logic → Data.Access → SP. NO SE TOCA salvo `ocelot.json` (ruta nueva) |
| Frontend | `react-project/` (React + TS + Vite + Tailwind). Servicios extienden `BaseApiService` |
| Reglas duras | **PROHIBIDO** hacer `ALTER`/`DROP` sobre tablas existentes de `dbo` (las usa el legacy WinForms). Todo lo nuevo va al schema **`conta`**. Referencias cross-schema (FK de `conta.*` → `dbo.*`) están permitidas SOLO hacia tablas creadas por el BI (`dbo.tipocaja`, `dbo.proveedores`); hacia tablas legacy (`venta`, `cobranzadetalle`, `datahierarchy`) NO se crean FKs — se validan por SP |

### 0.2 Compatibilidad SQL Server 2012 (OBLIGATORIO)

- NO existe: `CREATE OR ALTER`, `OPENJSON`/`JSON_VALUE`, `STRING_SPLIT`, `STRING_AGG`, `DROP TABLE IF EXISTS`, `TRIM`.
- SÍ existe: `IIF`, `CONCAT`, `TRY_CONVERT`, `FORMAT`, `OFFSET/FETCH`, `DATEFROMPARTS`, `EOMONTH`, TVP (table-valued parameters), `FOR XML PATH` (para concatenar), `MERGE`.
- Patrón de creación de SP: `IF OBJECT_ID('conta.sp_X','P') IS NOT NULL DROP PROCEDURE conta.sp_X;` en un archivo, `CREATE PROCEDURE conta.sp_X ...` en el mismo archivo NO es posible sin `GO` → **usar dos ejecuciones**: la herramienta db-console ejecuta cada archivo como un batch, así que: archivo `drop_<sp>.sql` (opcional, solo re-runs) y archivo `<sp>.sql` con solo el `CREATE`. Para re-aplicar cambios usar `ALTER PROCEDURE` en el mismo archivo (convención ya usada en `models-DB/script-cajamayor/sp/`).
- Carga masiva: **TVP** (no JSON). El API .NET parsea el Excel/JSON y pasa `DataTable` a Dapper (`AsTableValuedParameter`).

### 0.3 Datos de referencia ya verificados (no redescubrir)

- `dbo.tipocaja`: 1=ATENCION_ASISTENCIAL, 2=ATENCION_OCUPACIONAL, 3=SISOL, 4=MTC, 5=SEGUROS, 6=FARMACIA.
- `dbo.datahierarchy` grupo 46 (forma de pago): 1=EFECTIVO SOLES, 2=VISA, 3=MASTERCARD, 6=CHEQUE, 9=DEPOSITO, 12=YAPE, 13=PLIN. Grupo 41 (condición): 1=CONTADO, 2=CREDITO, 3=CHEQUE, 5=DEPOSITO.
- `dbo.proveedores` existe (BI): `id_proveedor, ruc, razon_social, direccion, email, activo, fecha_registro` (17 filas). `dbo.registro_compras` existe, vacía (demo).
- Ingresos de CAJA se leen de `dbo.cobranzadetalle` (`d_ImporteSoles`, `t_InsertaFecha` = fecha de cobro, `i_IdFormaPago`, `i_Eliminado=0`) + `dbo.venta` para unidad (`i_ClienteEsAgente`) vía `dbo.tipocaja_clientetipo`.
- Ingresos de VENTAS/RENTABILIDAD: pipeline actual de cierres (`sp_CajaMayor_GenerarDesdeCobranzas`, pese al nombre lee ventas) — NETO sin IGV = `ventadetalle.d_Valor`. Las NC/anulaciones ya están excluidas vía `i_Eliminado=0`.
- Tablas legacy de referencia (SOLO LECTURA, data vieja 2015): `dbo.saldomensualbancos`, `dbo.pendientesconciliacion`, `dbo.tipoegresomensual`, `dbo.tipoingresomensual`, `dbo.flujoefectivo*`. El módulo de planillas legacy (`dbo.planilla*`) está VACÍO.
- Usuario 2036 = POS FARMACIA (cuenta genérica).

### 0.4 Decisiones de negocio cerradas (resumen operativo)

1. **Dos tuberías**: CAJA = cobranzas por fecha de cobro + egresos PAGADOS por fecha de pago. VENTAS/RENTABILIDAD = facturado neto sin IGV por fecha de venta + gastos devengados por fecha de documento.
2. **Gasto con máquina de estados**: `POR_PAGAR` (impacta rentabilidad, NO caja) → `PAGADO` (fecha de pago dispara caja) → `ANULADO`. PAGADO exige `t_FechaPago`.
3. **Centros de costo jerárquicos** independientes de las cajas; ADMINISTRACION es centro de costo sin cableado; cablear centro→unidad es opcional y decide si el gasto baja a la rentabilidad de esa unidad. Regla 3: centro de costo es NOT NULL en todo gasto.
4. **Personal**: fase 1 = un monto mensual por centro de costo × concepto (REMUNERACION, GRATIFICACION, CTS, UTILIDADES, BENEFICIOS_SOCIALES, PERSONAL_ADICIONAL). Sin detalle por empleado.
5. **SISOL**: % configurable con vigencia por rango de fechas, default 70/30, sobre venta neta. La caja recibe 100% (como hoy); participación Hospital = egreso. Rentabilidad usa solo participación clínica. Pagos a especialistas siguen la lógica del módulo Honorarios Médicos existente.
6. **Semáforo** configurable, defaults: margen ≥ 15% RENTABLE, 0–15% BAJO_MARGEN, < 0 PERDIDA.
7. **Comparativas progresivas**: mensual siempre; trimestral con ≥2 trimestres completos del año; semestral con año completo. Sin presupuesto.
8. **Saldos**: saldo inicial del primer período lo digita el usuario (+ MONTO INICIAL NETO por lo anterior a ene-2026); luego encadenado automático saldo final→inicial. Saldos bancarios mensuales por cuenta (Interbank, BCP, BBVA) en tabla propia `conta`.
9. **Moneda**: PEN default; el modelo soporta moneda + tipo de cambio por documento desde el día 1.
10. **Identity nuevo**: roles SA, GERENTE, CONTABILIDAD; JWT para el React. Registro directo con auditoría (sin flujo de aprobación).
11. **California, Biomedicine, Drimagen, convenios (Atriz, Medialfa, Rosales)** = proveedores en `dbo.proveedores` (o `conta.entidad` si no tienen RUC).
12. **Páginas nuevas** para Caja/Rentabilidad/SISOL/Egresos; las páginas actuales (Caja Mayor, Flujo de Caja, Registro de Compras, Honorarios) se conservan.

### 0.5 Convenciones de trabajo del ejecutor

- Scripts SQL nuevos en el repo: `models-DB/script-conta/ddl/` (tablas+seeds) y `models-DB/script-conta/sp/` (un SP por archivo). Aplicar a producción con db-console y dejar SIEMPRE el archivo versionado idéntico a lo aplicado.
- API nueva en `SanLorenzoMicroservices/SanLorenzo.Contabilidad.Services/` (solución independiente).
- **Un commit + push por fase completada**, mensaje `feat(conta): FASE N - <resumen>` con Co-Authored-By de rigor.
- Si un GATE falla: DETENERSE, diagnosticar, no avanzar de fase.
- Todo SP de escritura registra auditoría (ver `conta.sp_Auditoria_Insert`).

---

## FASE 0 — SCHEMA `conta`: DDL DE CATÁLOGOS, IDENTITY Y AUDITORÍA

### 0-A. Crear schema y tablas

Archivo `models-DB/script-conta/ddl/00_schema.sql`:
```sql
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'conta')
    EXEC('CREATE SCHEMA conta');
```

Archivo `models-DB/script-conta/ddl/01_catalogos.sql` (batch único; usar `IF OBJECT_ID(...) IS NULL` por tabla para idempotencia):

```sql
-- Centros de costo jerárquicos (Regla 3 y respuesta 8)
IF OBJECT_ID('conta.centro_costo','U') IS NULL
CREATE TABLE conta.centro_costo (
    i_IdCentroCosto     INT IDENTITY(1,1) PRIMARY KEY,
    i_IdPadre           INT NULL REFERENCES conta.centro_costo(i_IdCentroCosto),
    v_Codigo            NVARCHAR(20) NOT NULL UNIQUE,
    v_Nombre            NVARCHAR(150) NOT NULL,
    v_Descripcion       NVARCHAR(300) NULL,
    i_IdTipoCaja        INT NULL REFERENCES dbo.tipocaja(i_IdTipoCaja), -- cableado opcional a unidad
    b_Activo            BIT NOT NULL DEFAULT 1,
    i_InsertaIdUsuario  INT NOT NULL,
    t_InsertaFecha      DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha    DATETIME NULL
);

-- Tipos de gasto jerárquicos (secciones y rubros de las maquetas)
IF OBJECT_ID('conta.tipo_gasto','U') IS NULL
CREATE TABLE conta.tipo_gasto (
    i_IdTipoGasto       INT IDENTITY(1,1) PRIMARY KEY,
    i_IdPadre           INT NULL REFERENCES conta.tipo_gasto(i_IdTipoGasto),
    v_Codigo            NVARCHAR(20) NOT NULL UNIQUE,
    v_Nombre            NVARCHAR(200) NOT NULL,
    -- Sección del estado de flujo (solo nivel raíz): PERSONAL | ADMIN | MEDICO | TRIBUTOS |
    -- RENTA | INVERSION | FINANCIAMIENTO | OTROS_EGRESOS
    v_SeccionFlujo      NVARCHAR(20) NULL,
    b_Activo            BIT NOT NULL DEFAULT 1,
    i_InsertaIdUsuario  INT NOT NULL,
    t_InsertaFecha      DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha    DATETIME NULL
);

-- Entidades receptoras de pago que no son proveedores formales (respuesta 7/18)
IF OBJECT_ID('conta.entidad','U') IS NULL
CREATE TABLE conta.entidad (
    i_IdEntidad         INT IDENTITY(1,1) PRIMARY KEY,
    v_Nombre            NVARCHAR(200) NOT NULL,
    v_Tipo              NVARCHAR(50) NULL, -- ASOCIADO | CONVENIO | INTERNO | OTRO
    b_Activo            BIT NOT NULL DEFAULT 1,
    i_InsertaIdUsuario  INT NOT NULL,
    t_InsertaFecha      DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha    DATETIME NULL
);

-- Cuentas bancarias propias
IF OBJECT_ID('conta.cuenta_bancaria','U') IS NULL
CREATE TABLE conta.cuenta_bancaria (
    i_IdCuentaBancaria  INT IDENTITY(1,1) PRIMARY KEY,
    v_Banco             NVARCHAR(50) NOT NULL,   -- INTERBANK | BCP | BBVA | ...
    v_NroCuenta         NVARCHAR(40) NOT NULL,
    v_Moneda            CHAR(3) NOT NULL DEFAULT 'PEN',
    b_Activo            BIT NOT NULL DEFAULT 1,
    i_InsertaIdUsuario  INT NOT NULL,
    t_InsertaFecha      DATETIME NOT NULL DEFAULT GETDATE()
);

-- % de participación SISOL con vigencia (respuesta 13)
IF OBJECT_ID('conta.sisol_participacion','U') IS NULL
CREATE TABLE conta.sisol_participacion (
    i_IdParticipacion   INT IDENTITY(1,1) PRIMARY KEY,
    d_PorcClinica       DECIMAL(5,2) NOT NULL,
    d_PorcHospital      DECIMAL(5,2) NOT NULL,
    t_VigenciaDesde     DATE NOT NULL,
    t_VigenciaHasta     DATE NULL,               -- NULL = vigente
    i_InsertaIdUsuario  INT NOT NULL,
    t_InsertaFecha      DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT CK_sisol_100 CHECK (d_PorcClinica + d_PorcHospital = 100)
);

-- Configuración clave-valor (semáforo y otros)
IF OBJECT_ID('conta.config','U') IS NULL
CREATE TABLE conta.config (
    v_Clave             NVARCHAR(50) PRIMARY KEY,
    v_Valor             NVARCHAR(200) NOT NULL,
    v_Descripcion       NVARCHAR(300) NULL,
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha    DATETIME NULL
);
```

Archivo `models-DB/script-conta/ddl/02_identity_auditoria.sql`:
```sql
IF OBJECT_ID('conta.usuario','U') IS NULL
CREATE TABLE conta.usuario (
    i_IdUsuario         INT IDENTITY(1,1) PRIMARY KEY,
    v_Username          NVARCHAR(50) NOT NULL UNIQUE,
    v_PasswordHash      NVARCHAR(500) NOT NULL,   -- PBKDF2 generado por el API
    v_NombreCompleto    NVARCHAR(150) NOT NULL,
    b_Activo            BIT NOT NULL DEFAULT 1,
    t_UltimoLogin       DATETIME NULL,
    i_InsertaIdUsuario  INT NULL,
    t_InsertaFecha      DATETIME NOT NULL DEFAULT GETDATE()
);
IF OBJECT_ID('conta.rol','U') IS NULL
CREATE TABLE conta.rol (
    i_IdRol INT IDENTITY(1,1) PRIMARY KEY,
    v_Nombre NVARCHAR(30) NOT NULL UNIQUE       -- SA | GERENTE | CONTABILIDAD
);
IF OBJECT_ID('conta.usuario_rol','U') IS NULL
CREATE TABLE conta.usuario_rol (
    i_IdUsuario INT NOT NULL REFERENCES conta.usuario(i_IdUsuario),
    i_IdRol     INT NOT NULL REFERENCES conta.rol(i_IdRol),
    PRIMARY KEY (i_IdUsuario, i_IdRol)
);
IF OBJECT_ID('conta.auditoria','U') IS NULL
CREATE TABLE conta.auditoria (
    i_IdAuditoria       BIGINT IDENTITY(1,1) PRIMARY KEY,
    v_Tabla             NVARCHAR(80) NOT NULL,
    v_IdRegistro        NVARCHAR(40) NOT NULL,
    v_Accion            NVARCHAR(20) NOT NULL,    -- INSERT|UPDATE|PAGAR|ANULAR|DELETE
    v_Detalle           NVARCHAR(MAX) NULL,       -- resumen antes/después armado por el SP
    i_IdUsuario         INT NOT NULL,
    t_Fecha             DATETIME NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_auditoria_tabla ON conta.auditoria(v_Tabla, v_IdRegistro);
```

### 0-B. Seeds (archivo `models-DB/script-conta/ddl/03_seeds.sql`, idempotente con `IF NOT EXISTS` por fila clave)

1. **Roles**: SA, GERENTE, CONTABILIDAD. **Usuario inicial**: `sa` con rol SA (el hash lo genera el API en Fase 1; sembrar con hash placeholder `'PENDIENTE'` y flag para forzar set de password en el primer login del API, o sembrar desde el endpoint de bootstrap — decisión del ejecutor, documentarla).
2. **Config semáforo**: `('SEMAFORO_RENTABLE_MIN','15')`, `('SEMAFORO_BAJO_MIN','0')`.
3. **SISOL**: `(70, 30, '2026-01-01', NULL)`.
4. **Centros de costo raíz** (v_Codigo → cableado): `ADM`=ADMINISTRACION (sin caja), `CC-ASIS`→tipocaja 1, `CC-OCUP`→tipocaja 2, `CC-FARM`→tipocaja 6, `CC-SEG`→tipocaja 5, `CC-SISOL`→tipocaja 3.
5. **Tipos de gasto** — plan de cuentas EXACTO de las maquetas (nivel 1 = sección con `v_SeccionFlujo`; nivel 2 = rubro). Sembrar:
   - `PERSONAL` (PERSONAL): REMUNERACIONES, GRATIFICACIONES, CTS, UTILIDADES, BENEFICIOS SOCIALES, PERSONAL ADICIONAL.
   - `GASTOS ADMINISTRATIVOS` (ADMIN): TRANSPORTE Y VIAJES, CAPACITACION, ATENCIONES AL PERSONAL, HONORARIOS ESPECIALISTAS CLINICA, HONORARIOS ESPECIALISTAS OCUPACIONAL, HONORARIOS ESPECIALISTAS SISOL, HONORARIOS LEGALES, HONORARIOS CONTABLES, MANTENIMIENTO, SERVICIOS PUBLICOS, MARKETING Y PUBLICIDAD, GASTOS DE REPRESENTACION, SUSCRIPCIONES Y CERTIFICADOS, SUMINISTROS OFICINA, SUMINISTROS LIMPIEZA, SEGUROS, FLETES, IZIPAY-OPENPAY, OTROS GASTOS ADMINISTRATIVOS.
   - `GASTOS MEDICOS` (MEDICO): SUMINISTROS MEDICOS, INSUMOS MEDICOS, ALQUILER EQUIPOS MEDICOS, GASTOS DE LABORATORIO, GASTOS DE AMBULANCIA, SERVICIOS ESPECIALIDADES MEDICAS, SERVICIOS ALIMENTACION PACIENTES, GASTOS ASISTENCIALES, GASTOS OCUPACIONALES, GASTOS SISOL.
   - `TRIBUTOS CORRIENTES` (TRIBUTOS): IMPUESTOS, AFP.
   - `IMPUESTO A LA RENTA Y PARTICIPACIONES` (RENTA): IMPUESTO A LA RENTA, PARTICIPACIONES.
   - `EGRESOS DE INVERSION` (INVERSION): CAPEX ACTIVO FIJO, CAPEX INFRAESTRUCTURA.
   - `EGRESOS DE FINANCIAMIENTO` (FINANCIAMIENTO): AMORTIZACION DEUDA INTERBANK, AMORTIZACION DEUDA BCP, AMORTIZACION DEUDA BBVA, GASTOS BANCARIOS / ITF.
   - `OTROS EGRESOS` (OTROS_EGRESOS): PAGO ASOCIADOS, PAGO CONVENIOS, OTROS SISOL, TRANSFERENCIAS A CALIFORNIA.
   - `OTROS INGRESOS` (OTROS_INGRESOS): TRANSFERENCIAS DE CALIFORNIA. *(sí: un tipo "gasto" negativo/ingreso extraordinario — se modela como sección OTROS_INGRESOS y el motor de caja lo suma en lugar de restar)*
6. **Cuentas bancarias**: INTERBANK, BCP, BBVA (números de cuenta placeholder `'POR-DEFINIR'`, el usuario los completa).
7. **Entidades**: BIOMEDICINE (ASOCIADO), DRIMAGEN (ASOCIADO), CONVENIO ATRIZ, CONVENIO MEDIALFA, CONVENIO ROSALES (CONVENIO). **California va en `dbo.proveedores`** (respuesta 16) — insertar ahí si no existe (INSERT permitido; lo prohibido es ALTER de estructura).

### GATE 0
1. `SELECT s.name, COUNT(*) tablas FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name='conta' GROUP BY s.name` → ≥ 11 tablas.
2. Conteos de seeds: roles=3, config≥2, sisol_participacion=1 (70/30), centro_costo≥6, tipo_gasto≥9 raíces y ≥45 rubros, cuenta_bancaria=3, entidad≥5.
3. Ninguna tabla de `dbo` alterada: verificar que `sys.tables` de dbo no tenga `modify_date` de hoy salvo las propias del BI si aplica (spot check).
4. Scripts versionados en `models-DB/script-conta/ddl/` idénticos a lo aplicado. Commit de fase.

---

## FASE 1 — API `SanLorenzo.Contabilidad.Services` + IDENTITY + CRUD DE CATÁLOGOS

### 1-A. Proyecto

Crear `SanLorenzoMicroservices/SanLorenzo.Contabilidad.Services/` — **webapi net6.0 standalone** (su propio `.sln`), espejando el patrón del Core:
```
SanLorenzo.Contabilidad.Services/
  Controllers/          (AuthController, CatalogosController, EgresosController, ...)
  Business.Logic/       (IContractsBL + ImplementationsBL, pass-through a repos)
  Data.Access/          (repositorios Dapper, CommandType.StoredProcedure SIEMPRE)
  Data.Model/           (Request/Response DTOs)
  Program.cs            (JWT Bearer, CORS AllowAll como los otros, Swagger habilitado en todos los ambientes)
  appsettings.json      (cadena de conexión igual a CajaRepository + Jwt:Key/Issuer/ExpireMinutes)
```
NuGet: `Dapper`, `Microsoft.Data.SqlClient`, `Microsoft.AspNetCore.Authentication.JwtBearer` (v6.x), `Swashbuckle`.

### 1-B. Identity

- Hash: PBKDF2 (`Rfc2898DeriveBytes`, 100k iteraciones, salt embebido en el hash `{iter}.{saltB64}.{hashB64}`).
- Endpoints: `POST /api/conta/auth/login` → JWT con claims (userId, username, roles); `POST /api/conta/auth/bootstrap` → crea usuario `sa` con password inicial SOLO si `conta.usuario` está vacío o el hash es 'PENDIENTE' (resuelve el seed de Fase 0); `POST /api/conta/usuarios` (rol SA) CRUD usuarios/roles.
- SPs: `conta.sp_Auth_GetUsuario`, `conta.sp_Usuario_Insert/Update/List`, `conta.sp_Auth_RegistrarLogin`.
- Autorización: `[Authorize(Roles="SA")]` para usuarios/catálogos-config; `[Authorize(Roles="SA,CONTABILIDAD")]` para captura; `[Authorize]` para lecturas/dashboards.

### 1-C. CRUD catálogos

Endpoints + SPs (`conta.sp_CentroCosto_*`, `conta.sp_TipoGasto_*`, `conta.sp_Entidad_*`, `conta.sp_CuentaBancaria_*`, `conta.sp_SisolParticipacion_*`, `conta.sp_Config_*`):
- `GET/POST/PUT /api/conta/centros-costo` (árbol jerárquico; validar que el padre exista; el cableado `i_IdTipoCaja` editable).
- `GET/POST/PUT /api/conta/tipos-gasto` (árbol; `v_SeccionFlujo` solo en raíz).
- `GET/POST/PUT /api/conta/entidades`, `/cuentas-bancarias`, `/config`, `/sisol/participacion` (esta última: al insertar nueva vigencia, cerrar la anterior — `t_VigenciaHasta = nueva desde - 1 día`; validar no-solape en el SP).
- Todos los SPs de escritura insertan en `conta.auditoria`.

### GATE 1
1. `dotnet build` sin errores; el API corre local (`dotnet run`) y Swagger responde.
2. `POST /auth/bootstrap` + `POST /auth/login` devuelven JWT válido; endpoint protegido sin token → 401, con rol incorrecto → 403.
3. CRUD de centros de costo y tipos de gasto: crear/editar/listar reflejado en BD y con fila en `conta.auditoria`.
4. Commit de fase (incluye los SPs en `models-DB/script-conta/sp/`).

---

## FASE 2 — EGRESOS: TABLA, MÁQUINA DE ESTADOS, CRUD Y CARGA MASIVA

### 2-A. DDL (`models-DB/script-conta/ddl/04_egresos.sql`)

```sql
IF OBJECT_ID('conta.egreso','U') IS NULL
CREATE TABLE conta.egreso (
    i_IdEgreso          INT IDENTITY(1,1) PRIMARY KEY,
    i_IdProveedor       INT NULL REFERENCES dbo.proveedores(id_proveedor),
    i_IdEntidad         INT NULL REFERENCES conta.entidad(i_IdEntidad),
    t_FechaDocumento    DATE NOT NULL,                 -- devengado (rentabilidad)
    v_TipoDocumento     NVARCHAR(30) NOT NULL,         -- FACTURA|RECIBO|PLANILLA|VOUCHER|OTRO
    v_SerieNumero       NVARCHAR(50) NULL,
    i_IdCentroCosto     INT NOT NULL REFERENCES conta.centro_costo(i_IdCentroCosto), -- Regla 3
    i_IdTipoGasto       INT NOT NULL REFERENCES conta.tipo_gasto(i_IdTipoGasto),
    v_Condicion         NVARCHAR(20) NOT NULL DEFAULT 'CONTADO',  -- CONTADO|CREDITO
    v_Moneda            CHAR(3) NOT NULL DEFAULT 'PEN',
    d_TipoCambio        DECIMAL(9,4) NOT NULL DEFAULT 1,
    d_MontoBruto        DECIMAL(18,2) NOT NULL,
    d_IGV               DECIMAL(18,2) NOT NULL DEFAULT 0,
    d_MontoNeto         DECIMAL(18,2) NOT NULL,        -- sin IGV (rentabilidad)
    v_Estado            NVARCHAR(15) NOT NULL DEFAULT 'POR_PAGAR', -- POR_PAGAR|PAGADO|ANULADO
    t_FechaPago         DATE NULL,                     -- dispara caja
    i_IdFormaPago       INT NULL,                      -- datahierarchy grupo 46 (sin FK)
    i_IdCuentaBancaria  INT NULL REFERENCES conta.cuenta_bancaria(i_IdCuentaBancaria),
    v_Glosa             NVARCHAR(300) NULL,
    i_IdCompra          INT NULL,                      -- link opcional a dbo.registro_compras
    i_InsertaIdUsuario  INT NOT NULL,
    t_InsertaFecha      DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha    DATETIME NULL,
    CONSTRAINT CK_egreso_receptor CHECK (i_IdProveedor IS NOT NULL OR i_IdEntidad IS NOT NULL),
    CONSTRAINT CK_egreso_pagado  CHECK (v_Estado <> 'PAGADO' OR t_FechaPago IS NOT NULL),
    CONSTRAINT CK_egreso_montos  CHECK (d_MontoBruto = d_MontoNeto + d_IGV)
);
CREATE INDEX IX_egreso_fdoc  ON conta.egreso(t_FechaDocumento) INCLUDE (i_IdCentroCosto, d_MontoNeto, v_Estado);
CREATE INDEX IX_egreso_fpago ON conta.egreso(t_FechaPago)      INCLUDE (i_IdTipoGasto, d_MontoBruto, v_Estado);

-- TVP para carga masiva
IF TYPE_ID('conta.tvp_egreso') IS NULL
CREATE TYPE conta.tvp_egreso AS TABLE (
    v_RucOEntidad NVARCHAR(200), t_FechaDocumento DATE, v_TipoDocumento NVARCHAR(30),
    v_SerieNumero NVARCHAR(50), v_CodCentroCosto NVARCHAR(20), v_CodTipoGasto NVARCHAR(20),
    v_Condicion NVARCHAR(20), v_Moneda CHAR(3), d_TipoCambio DECIMAL(9,4),
    d_MontoBruto DECIMAL(18,2), d_IGV DECIMAL(18,2), v_Glosa NVARCHAR(300)
);
```

También `conta.costo_personal_mensual`:
```sql
IF OBJECT_ID('conta.costo_personal_mensual','U') IS NULL
CREATE TABLE conta.costo_personal_mensual (
    i_Id                INT IDENTITY(1,1) PRIMARY KEY,
    n_Anio              SMALLINT NOT NULL,
    n_Mes               TINYINT NOT NULL,
    i_IdCentroCosto     INT NOT NULL REFERENCES conta.centro_costo(i_IdCentroCosto),
    v_Concepto          NVARCHAR(30) NOT NULL, -- REMUNERACION|GRATIFICACION|CTS|UTILIDADES|BENEFICIOS_SOCIALES|PERSONAL_ADICIONAL
    d_Monto             DECIMAL(18,2) NOT NULL,
    v_Estado            NVARCHAR(15) NOT NULL DEFAULT 'POR_PAGAR',
    t_FechaPago         DATE NULL,
    i_InsertaIdUsuario  INT NOT NULL,
    t_InsertaFecha      DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL, t_ActualizaFecha DATETIME NULL,
    CONSTRAINT UQ_costo_personal UNIQUE (n_Anio, n_Mes, i_IdCentroCosto, v_Concepto),
    CONSTRAINT CK_cpm_pagado CHECK (v_Estado <> 'PAGADO' OR t_FechaPago IS NOT NULL)
);
```

### 2-B. SPs y endpoints

- `conta.sp_Egreso_Insert` / `_Update` (solo en POR_PAGAR) / `_Pagar` (@FechaPago, @IdFormaPago, @IdCuentaBancaria → estado PAGADO) / `_Anular` / `_Get` / `_List` (filtros: rango fecha doc, rango fecha pago, estado, centro, tipo, proveedor; paginado OFFSET/FETCH).
- `conta.sp_Egreso_CargaMasiva (@Filas conta.tvp_egreso READONLY, @IdUsuario INT)` → resuelve RUC→proveedor / nombre→entidad, códigos→ids; inserta válidas, devuelve resultset de errores por fila (fila, motivo). Transaccional: TODO o NADA si hay errores estructurales; parcial permitido si el flag @PermitirParcial=1.
- `conta.sp_CostoPersonal_Upsert` / `_List` / `_Pagar` (marca todo el período o por fila).
- Endpoints: `GET/POST/PUT /api/conta/egresos`, `POST /api/conta/egresos/{id}/pagar`, `POST /api/conta/egresos/{id}/anular`, `POST /api/conta/egresos/carga-masiva` (recibe JSON de filas parseadas del Excel por el front → DataTable → TVP), `GET/POST /api/conta/costos-personal`, `POST /api/conta/costos-personal/pagar`.
- Auditoría en cada acción (`PAGAR` y `ANULAR` con detalle de fechas/montos).

### 2-C. Frontend

- Página **Egresos** (`/conta/egresos`): grilla con filtros + badges de estado, modal de registro (proveedor con autocomplete de `dbo.proveedores` + opción entidad, árboles de centro/tipo de gasto), acciones Pagar (modal fecha+forma+cuenta) y Anular (con confirmación), y **Carga Excel** (SheetJS: parsear → previsualizar → validar → enviar; plantilla `.xlsx` descargable con las columnas del TVP).
- Página **Costos de Personal** (`/conta/personal`): matriz período × centro de costo × 6 conceptos, edición inline, botón "marcar pagado".
- Nuevo `ContabilidadService` en el front extendiendo `BaseApiService` con el JWT (interceptor: header Authorization desde el login de Fase 1; página de Login previa).

### GATE 2
1. Flujo completo por API: crear egreso POR_PAGAR → verificar que NO aparece en caja (Fase 4 aún no existe: verificar solo estado) → pagar → estado PAGADO con fecha; anular otro. Auditoría registra las 3 acciones.
2. Carga masiva: archivo de prueba con 10 filas (2 con errores adrede: centro inexistente, monto bruto ≠ neto+IGV) → 8 insertadas, 2 reportadas con motivo.
3. Regla 3 verificada: INSERT sin centro de costo → error de BD/SP.
4. UI: registrar, pagar y cargar Excel desde la página sin errores de consola. Commit de fase.

---

## FASE 3 — MOTOR DE CAJA (ingresos por cobranza + egresos pagados + saldos encadenados)

### 3-A. DDL (`05_caja.sql`)

```sql
IF OBJECT_ID('conta.saldo_caja','U') IS NULL
CREATE TABLE conta.saldo_caja (
    i_Id                INT IDENTITY(1,1) PRIMARY KEY,
    n_Anio              SMALLINT NOT NULL,
    n_Mes               TINYINT NOT NULL,
    d_SaldoInicial      DECIMAL(18,2) NOT NULL DEFAULT 0,   -- digitado solo en el primer período
    d_MontoInicialNeto  DECIMAL(18,2) NOT NULL DEFAULT 0,   -- ajuste apertura pre-2026 (resp. 21)
    d_IngresosCaja      DECIMAL(18,2) NOT NULL DEFAULT 0,   -- materializado al cerrar
    d_EgresosCaja       DECIMAL(18,2) NOT NULL DEFAULT 0,
    d_SaldoFinal        DECIMAL(18,2) NOT NULL DEFAULT 0,
    b_Cerrado           BIT NOT NULL DEFAULT 0,
    i_ActualizaIdUsuario INT NULL, t_ActualizaFecha DATETIME NULL,
    CONSTRAINT UQ_saldo_caja UNIQUE (n_Anio, n_Mes)
);
IF OBJECT_ID('conta.saldo_banco_mensual','U') IS NULL
CREATE TABLE conta.saldo_banco_mensual (
    i_Id INT IDENTITY(1,1) PRIMARY KEY,
    n_Anio SMALLINT NOT NULL, n_Mes TINYINT NOT NULL,
    i_IdCuentaBancaria INT NOT NULL REFERENCES conta.cuenta_bancaria(i_IdCuentaBancaria),
    d_SaldoSoles DECIMAL(18,2) NOT NULL DEFAULT 0,
    d_SaldoDolares DECIMAL(18,2) NOT NULL DEFAULT 0,
    i_ActualizaIdUsuario INT NULL, t_ActualizaFecha DATETIME NULL,
    CONSTRAINT UQ_saldo_banco UNIQUE (n_Anio, n_Mes, i_IdCuentaBancaria)
);
```

### 3-B. SPs del motor (los cálculos SIEMPRE al vuelo sobre fuentes; `saldo_caja` solo materializa al cerrar mes)

1. `conta.sp_Caja_Ingresos (@Desde DATE, @Hasta DATE)` — **fuente cobranzas**: `dbo.cobranzadetalle cd (i_Eliminado=0, t_InsertaFecha en rango)` JOIN `dbo.venta v (i_Eliminado=0)` para unidad (`i_ClienteEsAgente`→`tipocaja_clientetipo`), monto = `cd.d_ImporteSoles`, forma de pago = grupo 46; los cobros de ventas al crédito son simplemente cobranzas de fecha posterior a la venta → etiquetar `b_EsCobranzaCredito = IIF(condición venta = CREDITO, 1, 0)` (grupo 41 vía `v.i_IdCondicionPago`) para las líneas "Cobranzas crédito ocupacional/seguros" del mockup. Devuelve: unidad, forma de pago, esCobranzaCredito, día, monto.
2. `conta.sp_Caja_Egresos (@Desde, @Hasta)` — `conta.egreso` PAGADO por `t_FechaPago` en rango (monto = `d_MontoBruto × d_TipoCambio` si moneda≠PEN) + `conta.costo_personal_mensual` PAGADO, agrupado por sección de `tipo_gasto` (`v_SeccionFlujo` del ancestro raíz — resolver con CTE recursivo) y centro de costo. Sección `OTROS_INGRESOS` se devuelve con signo positivo separado.
3. `conta.sp_Caja_Diaria (@Anio, @Mes)` — para el mes en curso: saldo inicial del mes (de `saldo_caja` encadenado) + serie diaria acumulada ingresos−egresos → saldo de caja al día (respuesta 2).
4. `conta.sp_Caja_FlujoConsolidado (@Anio)` — estructura EXACTA del mockup 01, columnas Ene..Dic: INGRESOS OPERATIVOS (por unidad + cobranzas crédito ocupacional/seguros como líneas propias) → TOTAL; EGRESOS OPERATIVOS (PERSONAL, ADMIN, MEDICO, TRIBUTOS, RENTA) → TOTAL; FLUJO DE CAJA OPERATIVO; INVERSION; CAJA OPERATIVA+INVERSION; FINANCIAMIENTO (amortizaciones + ITF); CAJA OPERATIVA+FIN; OTROS EGRESOS / OTROS INGRESOS; SALDO DE CAJA; SALDO INICIAL; SALDO FINAL.
5. `conta.sp_Caja_CerrarMes (@Anio, @Mes, @IdUsuario)` — materializa ingresos/egresos del mes en `saldo_caja`, calcula `d_SaldoFinal = d_SaldoInicial + d_MontoInicialNeto + ingresos − egresos + otros_ingresos`, marca `b_Cerrado=1` y **crea/actualiza el registro del mes siguiente con `d_SaldoInicial = d_SaldoFinal`** (encadenado, respuesta 3). Reabrible por SA (`sp_Caja_ReabrirMes`).
6. `conta.sp_SaldoCaja_SetApertura (@Anio, @Mes, @SaldoInicial, @MontoInicialNeto, @IdUsuario)` — solo para el primer período de la cadena.

Endpoints: `GET /api/conta/caja/ingresos`, `/caja/egresos`, `/caja/diaria?anio&mes`, `/caja/flujo-consolidado?anio`, `POST /caja/cerrar-mes`, `/caja/apertura`, CRUD `/saldos-banco`.

### 3-C. Frontend

- Página **Caja Diaria** (`/conta/caja`): tarjetas (saldo hoy, ingresos del mes al día, egresos del mes al día), gráfico de línea saldo diario, tabla del día por forma de pago. Mes en curso por default.
- Página **Flujo de Caja Consolidado** (`/conta/flujo-consolidado`): la tabla del mockup 01 (secciones con colores como la página Flujo actual), columnas mensuales + total, y fila de saldos encadenados. Botones: cerrar mes (rol SA/CONTABILIDAD), fijar apertura (primera vez).

### GATE 3
1. **Cuadre de ingresos**: `conta.sp_Caja_Ingresos` de un mes completo debe cuadrar (±0.01) contra la query independiente `SELECT SUM(cd.d_ImporteSoles) FROM dbo.cobranzadetalle cd JOIN dbo.venta v ON v.v_IdVenta=cd.v_IdVenta AND ISNULL(v.i_Eliminado,0)=0 WHERE cd.i_Eliminado=0 AND cd.t_InsertaFecha >= @ini AND cd.t_InsertaFecha < @fin` (ejecutar para 2026-06).
2. **Estados respetados**: un egreso POR_PAGAR de junio NO aparece en caja de junio; al pagarlo con fecha julio aparece en julio (probar con data de prueba).
3. **Encadenado**: fijar apertura en 2026-01 (ej. saldo 10,000 + MONTO INICIAL NETO 5,000), cerrar ene→jun secuencialmente → el saldo inicial de cada mes = saldo final del anterior; reabrir y recerrar un mes intermedio recalcula la cadena hacia adelante.
4. Flujo consolidado: TOTAL INGRESOS − TOTAL EGRESOS + OTROS = SALDO DE CAJA en cada columna; SALDO FINAL = SALDO INICIAL + SALDO DE CAJA.
5. UI carga sin errores y el gerente (rol GERENTE) puede ver pero no cerrar mes. Commit de fase.

---

## FASE 4 — RENTABILIDAD (general y por unidad) + COMPARATIVAS

### 4-A. SPs

1. `conta.sp_Rentabilidad_Ingresos (@Anio, @Mes)` — VENTAS netas sin IGV por unidad: fuente = `dbo.venta`+`ventadetalle` con los MISMOS filtros del pipeline de cierres actual (i_Eliminado=0, exclusión de series de egreso/TFM/THM, regla usuario 2036 `(user<>2036 OR area IN (3,4))`), monto = `vd.d_Valor` (sin IGV), fecha = `v.t_InsertaFecha`. **Ajuste SISOL**: a la unidad SISOL aplicar `% clínica` vigente de `conta.sisol_participacion` a la fecha; devolver también el bruto y la participación Hospital como columnas informativas (Regla 5).
2. `conta.sp_Rentabilidad_Gastos (@Anio, @Mes)` — gastos DEVENGADOS por `t_FechaDocumento` (estado ≠ ANULADO, pagados o no) + costo personal del período, agrupados por centro de costo → resueltos a unidad si el centro (o su ancestro) está cableado (`i_IdTipoCaja`), si no → bucket ADMINISTRACION.
3. `conta.sp_Rentabilidad_General (@Anio, @Mes)` — ingresos totales − gastos totales = resultado; % margen; semáforo según `conta.config`.
4. `conta.sp_Rentabilidad_PorUnidad (@Anio, @Mes)` — por unidad: ingresos, gastos directos (cableados), resultado, margen, semáforo; fila aparte ADMINISTRACION (gastos sin unidad, sin semáforo); fila TOTAL = rentabilidad general.
5. `conta.sp_Rentabilidad_Comparativa (@Anio)` — serie mensual del año + agregados trimestrales/semestrales. **Activación progresiva** (respuesta 12): el SP devuelve flags `b_TrimestralActiva = IIF(trimestres completos transcurridos >= 2, 1, 0)`, `b_SemestralActiva = IIF(año completo, 1, 0)`; la UI muestra/oculta pestañas según flags.

Endpoints: `GET /api/conta/rentabilidad/general?anio&mes`, `/rentabilidad/por-unidad?anio&mes`, `/rentabilidad/comparativa?anio`.

### 4-B. Frontend

- Página **Rentabilidad** (`/conta/rentabilidad`): tarjeta grande resultado del mes (ganancia/pérdida + semáforo), desglose ingresos vs gastos por sección, pestañas Mensual / Trimestral / Semestral (habilitadas por flags), gráfico de barras ingresos vs gastos por mes.
- Página **Rentabilidad por Unidad** (`/conta/rentabilidad-unidades`): tabla unidad × (ingresos, gastos, resultado, margen, semáforo con colores), ADMINISTRACION como fila neutra, y detalle expandible de gastos por tipo al hacer clic.

### GATE 4
1. Cuadre de ingresos de rentabilidad: para 2026-06, total sin IGV por unidad debe ser consistente con los cierres existentes (mismos filtros, columna `d_Valor` en lugar de `d_PrecioVenta`): validar con query independiente.
2. SISOL: con el 70/30 sembrado, ingreso rentabilidad SISOL de un mes = 70% de la venta neta SISOL (validar contra query manual); el flujo de CAJA sigue mostrando el 100% (verificar que sp_Caja_Ingresos no cambió).
3. Gastos: un egreso devengado en junio POR_PAGAR aparece en rentabilidad de junio aunque no esté pagado; uno ANULADO no aparece.
4. Semáforo: cambiar `SEMAFORO_RENTABLE_MIN` a 20 vía config → el semáforo de la UI cambia sin redeploy.
5. Comparativas: con fecha simulada (parámetro @Anio pasado), flags trimestral/semestral se activan según la regla. Commit de fase.

---

## FASE 5 — MÓDULO SISOL (liquidación y especialistas)

### 5-A. DDL (`06_sisol.sql`)

```sql
IF OBJECT_ID('conta.sisol_liquidacion','U') IS NULL
CREATE TABLE conta.sisol_liquidacion (
    i_IdLiquidacion     INT IDENTITY(1,1) PRIMARY KEY,
    n_Anio SMALLINT NOT NULL, n_Mes TINYINT NOT NULL,
    d_VentaNeta         DECIMAL(18,2) NOT NULL,
    d_PorcClinica       DECIMAL(5,2) NOT NULL,   -- copiado de la vigencia al calcular (foto histórica)
    d_ParticipacionClinica  DECIMAL(18,2) NOT NULL,
    d_ParticipacionHospital DECIMAL(18,2) NOT NULL,
    v_Estado            NVARCHAR(15) NOT NULL DEFAULT 'CALCULADO', -- CALCULADO|PAGADO
    i_IdEgresoHospital  INT NULL REFERENCES conta.egreso(i_IdEgreso), -- egreso generado al pagar
    i_InsertaIdUsuario INT NOT NULL, t_InsertaFecha DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_sisol_liq UNIQUE (n_Anio, n_Mes)
);
IF OBJECT_ID('conta.sisol_liquidacion_especialista','U') IS NULL
CREATE TABLE conta.sisol_liquidacion_especialista (
    i_Id INT IDENTITY(1,1) PRIMARY KEY,
    i_IdLiquidacion INT NOT NULL REFERENCES conta.sisol_liquidacion(i_IdLiquidacion),
    v_IdMedico      NVARCHAR(40) NOT NULL,    -- id del médico en el modelo de Honorarios
    v_NombreMedico  NVARCHAR(200) NOT NULL,
    d_BaseCalculo   DECIMAL(18,2) NOT NULL,
    d_Porcentaje    DECIMAL(5,2) NOT NULL,
    d_Monto         DECIMAL(18,2) NOT NULL,
    v_Estado        NVARCHAR(15) NOT NULL DEFAULT 'CALCULADO'
);
```

### 5-B. Lógica

- `conta.sp_Sisol_Calcular (@Anio, @Mes, @IdUsuario)`: venta neta SISOL del mes (mismos filtros de rentabilidad) × % vigente → llena liquidación; especialistas: **reutilizar la lógica/consultas del módulo Honorarios Médicos existente** (`PagoMedicosRepository` / `PagoMedicoPorConsultorio`) restringida a la unidad SISOL, aplicando el % de cada médico sobre la participación de la clínica (respuesta 14 — misma mecánica de porcentajes que Honorarios).
- `conta.sp_Sisol_Pagar (@IdLiquidacion, @FechaPago, ...)`: genera automáticamente el `conta.egreso` de la participación Hospital (tipo de gasto OTROS SISOL, entidad/proveedor Hospital de la Solidaridad — crear proveedor seed) y lo marca PAGADO → así el egreso fluye a CAJA sin doble registro.
- Endpoints: `GET/POST /api/conta/sisol/liquidaciones`, `POST /api/conta/sisol/liquidaciones/{id}/pagar`.

### 5-C. Frontend — Página **SISOL** (`/conta/sisol`): selector de período, tarjetas venta neta / participación clínica / participación hospital, tabla de especialistas con sus %, botones Calcular y Pagar.

### GATE 5
1. Liquidación de un mes con datos: participaciones suman la venta neta; el % aplicado es el vigente a ese mes (probar cambiando vigencia a mitad de año con dos liquidaciones).
2. Pagar liquidación crea el egreso Hospital PAGADO y aparece en Caja (sección OTROS EGRESOS) — sin duplicados al recalcular.
3. Rentabilidad SISOL del mes = participación clínica − gastos SISOL (cruce con Fase 4). Commit de fase.

---

## FASE 6 — INTEGRACIÓN REGISTRO DE COMPRAS + PÁGINAS DE ADMINISTRACIÓN

1. **Satélite** `conta.compra_ext (i_IdCompra PK/UNIQUE → dbo.registro_compras.id..., i_IdCentroCosto NOT NULL, i_IdTipoGasto NOT NULL, i_IdEgreso NULL)`: al registrar/pagar una compra desde la página Registro de Compras existente, un endpoint nuevo (`POST /api/conta/compras/{id}/clasificar`) crea la extensión y **genera el `conta.egreso` espejo** (link `i_IdCompra`) — la compra clasificada ES un egreso; evitar doble captura: si una compra tiene `compra_ext`, no se permite crear egreso manual con el mismo documento+proveedor (validación en `sp_Egreso_Insert`).
2. Página Registro de Compras: agregar al modal existente los combos centro de costo/tipo de gasto (llamando al API conta) — cambio mínimo, sin romper lo actual.
3. Página **Catálogos** (`/conta/catalogos`): tabs para centros de costo (árbol editable con cableado a unidad), tipos de gasto (árbol), entidades, cuentas bancarias, % SISOL (con historial de vigencias), config semáforo. Solo SA/CONTABILIDAD.
4. Página **Usuarios** (`/conta/usuarios`, solo SA) + **Login** (si no se hizo en Fase 2) + guards de rol en el router (GERENTE: solo dashboards/lecturas).

### GATE 6
1. Clasificar una compra genera el egreso espejo y bloquea el duplicado manual.
2. Roles verificados en UI: GERENTE no ve botones de captura; CONTABILIDAD no ve Usuarios.
3. Commit de fase.

---

## FASE 7 — DESPLIEGUE, DATA HISTÓRICA Y VALIDACIÓN E2E

1. **Despliegue**: publicar `SanLorenzo.Contabilidad.Services` en el IIS del servidor (mismo patrón que los microservicios actuales; puerto libre — verificar con el usuario/`netsh` los puertos ocupados 8182-8186 y elegir el siguiente); registrar ruta en `ocelot.json` si el front consume vía gateway, o URL directa en `config.ts` como los demás servicios. Build del React con las páginas nuevas.
2. **Data histórica** (respuesta 21): los cierres de VENTAS ya existen (ene–jun 2026, verificados); el usuario fija la apertura de caja de ene-2026 (saldo inicial + MONTO INICIAL NETO) y cierra caja mes a mes ene→jun con `sp_Caja_CerrarMes`; egresos históricos: carga masiva Excel por mes (contabilidad) — el sistema queda con 6 meses comparables.
3. **Validación E2E** (checklist final): las preguntas del documento de Ruth deben poder responderse en pantalla:
   - "¿Tengo dinero para pagar planillas?" → Caja Diaria (saldo hoy).
   - "¿Estoy ganando o perdiendo?" → Rentabilidad (semáforo del mes).
   - "¿Qué unidad mantiene a la clínica / cuál pierde?" → Rentabilidad por Unidad.
   - "¿Cuánto debo cobrar este mes?" → Egresos POR_PAGAR del mes (agregar tarjeta "por pagar" en Caja Diaria) + ventas al crédito sin cobrar (query sobre ventas CREDITO − cobranzas: exponer como tarjeta "por cobrar").
   - "¿Cuál es mi liquidez real?" → Flujo Consolidado (saldo final + saldos bancarios).
4. Actualizar `models-DB/docs/` con el log de ejecución (sección 9 de este documento, como se hizo en el plan FARMACIA/SISOL), README de `script-conta/`, commit final y push.

### GATE 7 (aceptación global)
- [ ] Todas las páginas nuevas funcionan en producción con login y roles.
- [ ] Caja y Rentabilidad de un mismo mes muestran cifras DISTINTAS y explicables (crédito y estados de pago son la diferencia) — validado con un caso trazado a mano.
- [ ] Cadena de saldos ene→jun cerrada y cuadrada.
- [ ] Cero ALTER sobre tablas legacy (verificar `modify_date` en `sys.tables` de dbo).
- [ ] Todo versionado y pusheado; scripts de `models-DB/script-conta/` = producción.

---

## CONTINGENCIA / ROLLBACK

- Fases 0–2 (DDL): `DROP` de objetos del schema `conta` es seguro (nada del legacy depende de él). Antes de un drop masivo, respaldar con `SELECT * INTO` si ya hay data capturada.
- SPs: versiones anteriores en git (`git show <hash>:models-DB/script-conta/sp/<archivo>`).
- API/Front: rollback por despliegue anterior (IIS mantiene la carpeta previa; renombrar en lugar de borrar).
- La tubería de VENTAS/cierres actual NO se modifica en ninguna fase — riesgo de regresión sobre lo ya validado: nulo por diseño.

## RESUMEN DE FASES (para tracking del ejecutor)

| Fase | Entregable | Dependencia |
|---|---|---|
| 0 | Schema conta + catálogos + identity + seeds | — |
| 1 | API Contabilidad + JWT + CRUD catálogos | 0 |
| 2 | Egresos + costos personal + carga Excel + páginas | 1 |
| 3 | Motor de Caja + saldos encadenados + páginas | 2 |
| 4 | Rentabilidad general/por unidad + comparativas | 2 (ideal 3) |
| 5 | SISOL liquidación + especialistas | 4 |
| 6 | Integración Registro Compras + catálogos UI + roles | 2 |
| 7 | Despliegue + data histórica + E2E | todas |

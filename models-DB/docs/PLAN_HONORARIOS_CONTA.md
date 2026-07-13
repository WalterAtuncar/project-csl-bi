# PLAN — Migración de Honorarios Médicos a /conta + Egreso por consultorio + Rentabilidad v2

> **Estado: APROBADO POR EL USUARIO, PENDIENTE DE EJECUCIÓN.**
> Ejecutar en cadena: FASE 1 (db-experto) → FASE 2 (backend-api) → FASE 3 (bi-frontend) → FASE 4 (E2E orquestador).
> Los GATEs los verifica el orquestador. Commits solo el orquestador al integrar (`feat(conta): ...`).
> Basado en 3 análisis de producción del 2026-07-13 (front, legacy-negocio, db-experto). Definiciones legacy
> tomadas de las versiones VIVAS (sys.sql_modules), NO de los .sql del repo (divergen — hecho de oro #3).

---

## §0. Contexto y decisiones cerradas (del usuario)

1. **Migrar el page completo** `/honorarios-medicos` (BI legacy) a `/conta/honorarios` con API propia (conta).
2. Al registrar el pago se generan **egresos por consultorio** (N egresos, uno por consultorio del pago),
   además del centro de costo. Nuevo modelo de datos `conta.pago_honorario*`.
3. **Rentabilidad por consultorio asistencial** gana columna **Egresos** (y Resultado = Ingresos − Egresos).
4. **SIN frontera / anti-duplicado ECA-ECF**: el usuario confirmó que los ECA/ECF del desktop son de uso
   mixto (pagos de cirugía/hospitalización, almuerzos, pasajes, etc.) y NO deben preocuparnos. No se
   implementa ninguna lógica de des-duplicación ni corte operativo. Cero cambios sobre ese flujo.
5. Sin dependencia del **cierre de Caja Mayor legacy**: el pago conta es autocontenido.
6. **PDF del recibo NO se guarda en BD** (el legacy guardaba base64 de ~112KB por fila). Se genera
   client-side on-demand desde los datos del pago (reimprimible determinísticamente).
7. La lógica de cálculo del monto **se preserva tal como opera el front legacy** (§3.4): VISA −4% editable,
   "restar IGV" = ×0.82 flat (NO ÷1.18 — regla deliberada), cadena de % multiplicativos. El % del catálogo
   403 (65 parejo) es solo default/referencia editable.
8. El page legacy `/honorarios-medicos` **NO se toca en este plan** (soft-delete posterior = decisión aparte
   del usuario tras validar el nuevo).

## §0.1 Hechos de producción que fundamentan el diseño (verificados 2026-07-13)

- El módulo BI legacy **nunca operó**: `servicespaid` = 1 fila (prueba dic-2025), `registro_compras` = 0 filas,
  `cajamayor_movimiento` sin origen `pago_de_medicos`.
- `SigesoftDesarrollo_2` es **SOLO LECTURA** para nosotros → el registro del pago vive en `conta`
  (reemplaza `servicespaid/servicespaiddetails`). La validación anti-doble-pago lee AMBAS fuentes.
- Catálogo de consultorios = `SigesoftDesarrollo_2.dbo.systemparameter` grupo **403** (48 filas, ids 1..48),
  `v_Value1`=nombre, `v_Value2`=% médico (65.00 parejo). NO existe tabla gc_consultorio.
- 15 de 62 médicos con servicios (jun-2026) atienden en **2+ consultorios** (hasta 16) → cabecera
  multi-consultorio obligatoria.
- `conta.egreso`: 24 columnas, 0 filas, sin consultorio. INVARIANTE crítica: `sp_Egreso_Insert` devuelve
  resultset ÚNICO de 1 columna (`SELECT @id AS i_IdEgreso`) porque `sp_Compra_Clasificar` le hace INSERT..EXEC.
- `conta.centro_costo`: CC-ASIS = id **2** (asistencial). `conta.tipo_gasto`: NO hay hoja de honorarios →
  se siembra **`MED-HON`** bajo la sección **MEDICO** (los honorarios se reportan como sección MEDICO en caja;
  usar ADM-HEC los movería mal a ADMIN).
- SP rentabilidad: `conta.sp_Rentabilidad_PorConsultorio(@Anio,@Mes,@IncluirCredito=1)` →
  RS1 `Grupo, Consultorio, Ingresos, PorcDelGrupo, EsNoClasificado, EsTotal` + RS2 diagnóstico.
  Ingreso SIEMPRE de `dbo.ventadetalle`; dimensión ASISTENCIAL vía comprobante→service→protocol.i_Consultorio→403.
  La iTVF `fn_Rentabilidad_IngresosDetalleEx` es **INTOCABLE**.
- Montos legacy `servicespaid.*` son REAL (float32) → al comparar con histórico, tolerancia de centavos.

---

## FASE 1 — BD (db-experto)

Todo idempotente, SQL Server **2012** (ver reglas-sql2012.md: sin STRING_SPLIT/STRING_AGG/IIF-cuidado;
OFFSET/FETCH, índices filtrados y TRY_CONVERT SÍ están disponibles). Aplicar a producción vía db-console
`--write --file` y versionar los .sql fuente. Verificar `modify_date` (drift) antes de tocar SPs existentes.
PROHIBIDO alterar `dbo`/`SigesoftDesarrollo_2` (solo SELECT cross-DB con `COLLATE DATABASE_DEFAULT` en joins).

### 1.1 DDL — `ddl/10_pago_honorario.sql` (NUEVO)

```sql
-- (1) Columna de consultorio en egreso (referencia LÓGICA a systemparameter grupo 403; sin FK: cross-DB.
--     Precedente: i_IdFormaPago→dh46, i_IdCuentaBancaria→dbo.documento)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('conta.egreso') AND name='i_IdConsultorio')
    ALTER TABLE conta.egreso ADD i_IdConsultorio INT NULL;
-- Índice filtrado para el join de rentabilidad
CREATE NONCLUSTERED INDEX IX_egreso_consultorio ON conta.egreso (i_IdConsultorio, t_FechaDocumento)
    INCLUDE (d_MontoNeto, v_Estado) WHERE i_IdConsultorio IS NOT NULL;  -- (envolver en IF NOT EXISTS sys.indexes)

-- (2) Cabecera del pago (nace PAGADO — patrón sp_Sisol_Pagar)
CREATE TABLE conta.pago_honorario (
    i_IdPago INT IDENTITY(1,1) PRIMARY KEY,
    i_MedicoId INT NOT NULL,                    -- lógico a SigesoftDesarrollo_2 systemuser.i_SystemUserId
    v_MedicoNombre NVARCHAR(200) NOT NULL,      -- denormalizado (congelado)
    i_IdEntidad INT NULL,                       -- FK conta.entidad (upsert v_Tipo='MEDICO' en el Insert)
    t_PeriodoDesde DATE NOT NULL, t_PeriodoHasta DATE NOT NULL,
    d_PorcMedico DECIMAL(5,2) NULL,             -- referencial (v_Value2 del 403 o el aplicado)
    d_TotalServicios DECIMAL(18,2) NOT NULL, d_TotalPago DECIMAL(18,2) NOT NULL,
    v_Estado NVARCHAR(10) NOT NULL DEFAULT 'PAGADO' CHECK (v_Estado IN ('PAGADO','ANULADO')),
    t_FechaPago DATE NOT NULL,
    i_IdFormaPago INT NULL, i_IdCuentaBancaria INT NULL,   -- lógicos (dh46 / dbo.documento)
    v_Glosa NVARCHAR(300) NULL, v_MotivoAnulacion NVARCHAR(300) NULL,
    i_InsertaIdUsuario INT NOT NULL, t_InsertaFecha DATETIME NOT NULL DEFAULT GETDATE(),
    i_ActualizaIdUsuario INT NULL, t_ActualizaFecha DATETIME NULL,
    CONSTRAINT FK_pago_hon_entidad FOREIGN KEY (i_IdEntidad) REFERENCES conta.entidad(i_IdEntidad));

-- (3) Detalle por consultorio (1 pago → N consultorios; cada fila enlaza su egreso espejo)
CREATE TABLE conta.pago_honorario_consultorio (
    i_Id INT IDENTITY(1,1) PRIMARY KEY,
    i_IdPago INT NOT NULL REFERENCES conta.pago_honorario(i_IdPago),
    i_IdConsultorio INT NOT NULL,               -- lógico 403
    v_ConsultorioNombre NVARCHAR(100) NOT NULL, -- congelado (independiza el histórico del catálogo)
    d_MontoServicios DECIMAL(18,2) NOT NULL, d_MontoPago DECIMAL(18,2) NOT NULL,
    i_IdEgreso INT NULL REFERENCES conta.egreso(i_IdEgreso),
    CONSTRAINT UQ_pago_hon_cons UNIQUE (i_IdPago, i_IdConsultorio));

-- (4) Servicios pagados (reemplazo conta de servicespaiddetails; ANTI-DOBLE-PAGO)
CREATE TABLE conta.pago_honorario_servicio (
    i_Id INT IDENTITY(1,1) PRIMARY KEY,
    i_IdPago INT NOT NULL REFERENCES conta.pago_honorario(i_IdPago),
    v_ServiceId NVARCHAR(50) NOT NULL,          -- lógico a Sigesoft service.v_ServiceId (varchar(16) real)
    i_IdConsultorio INT NOT NULL,
    d_Precio DECIMAL(18,2) NULL, d_Porc DECIMAL(5,2) NULL, d_Pagado DECIMAL(18,2) NULL,
    b_Anulado BIT NOT NULL DEFAULT 0);
CREATE UNIQUE NONCLUSTERED INDEX UX_pago_hon_serv_activo
    ON conta.pago_honorario_servicio (v_ServiceId) WHERE b_Anulado = 0;   -- 2012 OK

-- (5) TVP
CREATE TYPE conta.tvp_pago_honorario_servicio AS TABLE (
    v_ServiceId NVARCHAR(50) NOT NULL, i_IdConsultorio INT NOT NULL,
    d_Precio DECIMAL(18,2) NULL, d_Porc DECIMAL(5,2) NULL, d_Pagado DECIMAL(18,2) NULL);

-- (6) Seed hoja de tipo de gasto (padre = raíz de la sección MEDICO, la de MED-SEM/MED-ASI)
IF NOT EXISTS (SELECT 1 FROM conta.tipo_gasto WHERE v_Codigo='MED-HON')
    INSERT INTO conta.tipo_gasto (...) VALUES ('MED-HON','HONORARIOS MEDICOS', <i_IdPadre de MEDICO>, ...);
```

### 1.2 SPs de egresos — `sp/03_egresos.sql` (v3, retrocompatible)

- `sp_Egreso_Insert`: **+ `@IdConsultorio INT = NULL` AL FINAL** de la lista de parámetros; el INSERT incluye
  `i_IdConsultorio`. ⚠️ El shape del resultset NO cambia (`SELECT @id AS i_IdEgreso`, 1 columna) — invariante
  de `sp_Compra_Clasificar` (INSERT..EXEC).
- `sp_Egreso_List`: + filtro `@IdConsultorio INT = NULL` al final; el SELECT agrega **al final** las columnas
  `i_IdConsultorio` y `Consultorio` (join a 403 por id, `COLLATE DATABASE_DEFAULT`, NULL-safe). Dapper mapea
  por nombre → API/front actuales no se rompen.
- `Update/Pagar/Anular/Get/CargaMasiva`: **sin cambios** (los honorarios NO entran por carga masiva).

### 1.3 SPs de honorarios — `sp/11_pago_honorario.sql` (NUEVO)

**`conta.sp_PagoHonorario_Insert`**
`(@MedicoId INT, @MedicoNombre NVARCHAR(200), @Desde DATE, @Hasta DATE, @PorcMedico DECIMAL(5,2)=NULL,
 @FechaPago DATE, @IdFormaPago INT=NULL, @IdCuentaBancaria INT=NULL, @Glosa NVARCHAR(300)=NULL,
 @TotalServicios DECIMAL(18,2), @TotalPago DECIMAL(18,2),
 @Servicios conta.tvp_pago_honorario_servicio READONLY, @IdUsuario INT)`

Transacción + TRY/CATCH. Pasos:
1. Validar: TVP no vacía; `@TotalPago > 0`; fechas coherentes.
2. **Anti-doble-pago dual**: RAISERROR listando serviceIds ofensores si alguno existe en
   (a) `conta.pago_honorario_servicio WHERE b_Anulado=0`, o
   (b) `SigesoftDesarrollo_2.dbo.servicespaiddetails d JOIN ...servicespaid p ON ... WHERE d.i_IsDeleted=0 AND p.i_IsDeleted=0` (read-only, cubre el histórico legacy).
3. Upsert `conta.entidad` (`v_Nombre=@MedicoNombre`, `v_Tipo='MEDICO'`, reactivar si inactiva) → `@IdEntidad`.
4. INSERT cabecera (estado PAGADO) → `@IdPago`.
5. Agrupar TVP por `i_IdConsultorio` (nombre desde 403 con fallback `'CONSULTORIO '+id`); prorratear
   `d_MontoPago` por consultorio = `@TotalPago × (servicios del consultorio / Σ servicios)` redondeado a 2
   decimales **con ajuste de residuo en el consultorio mayor** (Σ exacta = @TotalPago).
6. WHILE sobre los consultorios agrupados:
   `INSERT INTO @out EXEC conta.sp_Egreso_Insert @IdEntidad=@IdEntidad, @FechaDocumento=@FechaPago,
    @TipoDocumento='HONORARIO', @SerieNumero='PH-'+CAST(@IdPago AS VARCHAR), @IdCentroCosto=2 /*CC-ASIS*/,
    @IdTipoGasto=<MED-HON>, @Condicion='CONTADO', @Moneda='PEN', @TipoCambio=1,
    @MontoBruto=<monto consultorio>, @IGV=0, @Glosa=<'Honorarios '+@MedicoNombre+' '+periodo+' - '+consultorio>,
    @IdUsuario=@IdUsuario, @Estado='PAGADO', @FechaPago=@FechaPago, @IdFormaPago=@IdFormaPago,
    @IdCuentaBancaria=@IdCuentaBancaria, @IdConsultorio=<id>` → guardar i_IdEgreso.
   ⚠️ NUEVA INVARIANTE: nadie puede hacer INSERT..EXEC sobre `sp_PagoHonorario_Insert` (anidamiento SQL).
7. INSERT `pago_honorario_consultorio` (con i_IdEgreso) e INSERT `pago_honorario_servicio` desde la TVP.
8. RS1: `SELECT @IdPago AS i_IdPago`; RS2: consultorios con sus egresos (id, nombre, monto, i_IdEgreso).

**`conta.sp_PagoHonorario_Anular` (@IdPago, @Motivo NVARCHAR(300), @IdUsuario)**: valida PAGADO; por cada
egreso enlazado → `EXEC conta.sp_Egreso_Anular`; `b_Anulado=1` en servicios (libera el UNIQUE filtrado);
cabecera → ANULADO + motivo + auditoría. Transaccional.

**`conta.sp_PagoHonorario_List` (@Desde DATE=NULL, @Hasta DATE=NULL, @MedicoId INT=NULL,
@IncluirAnulados BIT=0, @Page INT=1, @PageSize INT=50)**: RS1 total; RS2 página (OFFSET/FETCH) con
`i_IdPago, t_FechaPago, v_MedicoNombre, t_PeriodoDesde/Hasta, d_TotalPago, NroConsultorios, NroServicios, v_Estado`.

**`conta.sp_PagoHonorario_Get` (@IdPago)**: RS1 cabecera; RS2 consultorios (+i_IdEgreso); RS3 servicios.

### 1.4 SPs de análisis/catálogo (lectura cross-DB) — mismo archivo `sp/11`

- **`conta.sp_Honorarios_Analisis` (@ConsultorioId INT=NULL /*NULL=todos*/, @Desde DATE, @Hasta DATE)**:
  **port fiel de la definición VIVA de `SigesoftDesarrollo_2.dbo.PagoMedicoPorConsultorio_SP`**
  (obtenerla de `sys.sql_modules`, NO de los .sql del repo — divergen y uno termina en ROLLBACK), adaptado:
  three-part names, `COLLATE DATABASE_DEFAULT`, y `esPagado` = EXISTS en **ambas** fuentes
  (legacy `servicespaiddetails` activo + `conta.pago_honorario_servicio` b_Anulado=0).
  Se CONSERVAN sus filtros propios (exclusiones de tipos doc y las 19 ventas hardcodeadas): son el negocio
  tal como opera. RS: espejo del legacy (headers por médico + detalles por servicio con consultorio id+nombre,
  formaPagoName, precio, esPagado) + `PorcRef` (v_Value2 del 403).
- **`conta.sp_Honorarios_Consultorios`**: `SELECT i_ParameterId AS Id, v_Value1 AS Nombre,
  TRY_CONVERT(DECIMAL(5,2), v_Value2) AS PorcMedico FROM ...systemparameter WHERE i_GroupId=403
  AND ISNULL(i_IsDeleted,0)=0 ORDER BY v_Value1`.
- **`conta.sp_Honorarios_Medicos` (@ConsultorioId INT=NULL)**: port de la viva `GetMedicosByConsultorio_SP`.
- **`conta.sp_Honorarios_BuscarProfesional` (@Texto NVARCHAR(100))**: port de `sp_BuscarProfesionales`
  (systemuser+person activos, LIKE).

### 1.5 Rentabilidad v2 — `sp/10_rentabilidad_consultorio.sql` (v2, mismo SP)

- Nuevo temp `#egr`: agregado de `conta.egreso` del mes (devengado `t_FechaDocumento`, `v_Estado<>'ANULADO'`,
  `i_IdConsultorio IS NOT NULL`) → `Consultorio (nombre 403 COLLATE DATABASE_DEFAULT, fallback 'CONSULTORIO '+id),
  Egresos=SUM(d_MontoNeto)`.
- Grupo ASISTENCIAL: LEFT JOIN `#egr` por nombre; **insertar filas Ingresos=0** para consultorios solo-egreso;
  relajar filtro a `(Ingresos<>0 OR Egresos<>0)`.
- RS1 agrega **AL FINAL**: `Egresos DECIMAL(18,2)`, `Resultado` (=Ingresos−Egresos; TOTALes suman ambas).
  `PorcDelGrupo` NO cambia. RS2 intacto. La iTVF NO se toca.
- OCUPACIONAL/OTRAS_UNIDADES: Egresos=0 en esta fase.

### 1.6 GATEs FASE 1 (los verifica el orquestador)

- G1: `sp_Honorarios_Analisis` vs SP legacy vivo — mismos médicos y Σ precios para 1 consultorio + rango de
  jun-2026 (tolerancia centavos por REAL).
- G2: `sp_Egreso_Insert` con y sin `@IdConsultorio` → shape 1 columna intacto; `sp_Egreso_List` columnas
  nuevas al final; smoke de `sp_Compra_Clasificar` (compila, dependencia re-bindeada).
- G3: pago de prueba multi-consultorio (2 consultorios) → cabecera + 2 detalles + 2 egresos PAGADO
  MED-HON/CC-ASIS con i_IdConsultorio; re-pago del mismo servicio → error anti-doble-pago; Anular → egresos
  ANULADO + servicios liberados (re-pago posible).
- G4: `sp_Rentabilidad_PorConsultorio` del mes de prueba → columna Egresos refleja los egresos del G3 en los
  consultorios correctos; Δ=0 en Ingresos vs versión previa (columnas viejas intactas).
- G5: **LIMPIEZA total** del G3/G4 (DELETE + `DBCC CHECKIDENT RESEED` de pago_honorario, ..._consultorio,
  ..._servicio, egreso; borrar entidad MEDICO de prueba). Estado final = inicial.

**Contrato para FASE 2**: firmas exactas de los 8 SPs + shapes de resultsets (documentarlos en el reporte).

---

## FASE 2 — Backend (backend-api)

Proyecto `SanLorenzoMicroservices/SanLorenzo.Contabilidad.Services` (net6, Dapper+SPs, JWT propio).

### 2.1 `Controllers/HonorariosController.cs` (NUEVO) — `[Route("api/conta/honorarios")] [Authorize]`

| Verbo/Ruta | Roles | SP | Notas |
|---|---|---|---|
| GET `consultorios` | todos | sp_Honorarios_Consultorios | `ConsultorioDto {Id, Nombre, PorcMedico}` |
| GET `medicos?consultorioId=` | todos | sp_Honorarios_Medicos | |
| GET `profesionales?texto=` | todos | sp_Honorarios_BuscarProfesional | mín 3 chars (validar en controller) |
| GET `analisis?consultorioId=&desde=&hasta=` | todos | sp_Honorarios_Analisis | `AnalisisHonorariosDto {Cabeceras[], Detalles[]}` (QueryMultiple) |
| GET `pagos?desde&hasta&medicoId&incluirAnulados&page&pageSize` | todos | sp_PagoHonorario_List | `{Total, Items[]}` |
| GET `pagos/{id}` | todos | sp_PagoHonorario_Get | cabecera+consultorios+servicios |
| POST `pagos` | **SA,CONTABILIDAD** | sp_PagoHonorario_Insert | TVP vía DataTable; `IdUsuario=User.UserId()` |
| POST `pagos/{id}/anular` | **SA,CONTABILIDAD** | sp_PagoHonorario_Anular | body `{Motivo}` |

`PagoHonorarioCreateRequest {MedicoId, MedicoNombre, Desde, Hasta, PorcMedico?, FechaPago, IdFormaPago?,
IdCuentaBancaria?, Glosa?, TotalServicios, TotalPago, Servicios: [{ServiceId, IdConsultorio, Precio?, Porc?, Pagado?}]}`.
Convención JSON del proyecto (sin camelCase forzado, DTOs calcados). Errores del SP (RAISERROR) → 400 con mensaje.

### 2.2 Ajustes menores

- `Dtos.cs`: `RentabilidadConsultorioRow` += `Egresos`, `Resultado` (decimal) — Dapper mapea por nombre.
- `EgresoCreate` += `IdConsultorio?` (int?, se pasa a `sp_Egreso_Insert`; el front de egresos NO lo usa aún).
- `EgresoRow` += `i_IdConsultorio?`, `Consultorio?` (del List v3).
- Repos: `HonorariosRepository` (nuevo) + `RentabilidadRepository`/`EgresoRepository` (ajuste).
- Build verde. NO tocar auth/otros controllers.

**Contrato para FASE 3**: rutas + shapes JSON exactos (documentarlos en el reporte).

---

## FASE 3 — Frontend (bi-frontend)

`react-project`. Estilo conta (shell nuevo primary/secondary + páginas slate/emerald con patrón Card).
Deps ya disponibles: `xlsx`, `@react-pdf/renderer`, `react-pdf`, framer-motion, react-hot-toast.

### 3.1 Estructura

- **`src/pages/Contabilidad/Honorarios.tsx`** (page) + **`src/pages/Contabilidad/components/honorarios/`**
  (`GenerarPagoHonorarioModal.tsx`, `ReciboPDF.tsx`, helpers de Excel).
- Ruta en `App.tsx`: `<Route path="honorarios" element={<Honorarios />} />` bajo /conta.
- Sidebar (`ContaLayout.tsx` navItems): `{ to: '/conta/honorarios', label: 'Honorarios Médicos', icon: Stethoscope }`
  (visible a todos; acciones de escritura gated por `canWrite`).
- `ContabilidadService.ts`: métodos `honorariosConsultorios/Medicos/Profesionales/Analisis/Pagos/PagoGet/
  PagoCrear/PagoAnular`. `contaTypes.ts`: tipos calcados de los DTOs de FASE 2.
- **Auth**: 100% `useContaAuth`/JWT conta. NADA de `userData`/localStorage legacy (corrige el
  `i_InsertUserId=1` hardcodeado del legacy). ÚNICA excepción legacy permitida: "Editar médico tratante"
  puede seguir llamando al 8183 (`PagoMedicosService.updateMedicoTratante`) — es escritura del legacy en su
  propio sistema; marcarla con comentario.

### 3.2 Page (grid de pagos)

- Filtros: profesional (autocomplete conta, mín 3 chars, debounce 300ms), rango de fechas, incluir anulados.
- Grid con **paginación REAL server-side** (Total del RS1): ID | Fecha pago | Médico | Periodo | Total
  (S/ verde) | Consultorios | Servicios | Estado (badge PAGADO/ANULADO) | Acciones.
- Acciones: **Ver** (detalle con consultorios+egresos+servicios), **Imprimir** (regenera `ReciboPDF`
  on-demand desde el Get — NO hay base64 en BD), **Anular** (solo canWrite; modal con motivo obligatorio).
- Botones cabecera: "Generar Nuevo Pago" (canWrite), "Descargar plantilla de atenciones" (port del XLSX
  2 hojas: Instrucciones + Plantilla Atenciones).
- **Deuda que NO se migra**: paginación falsa, modales muertos, KPIs en 0, PDF en BD.

### 3.3 GenerarPagoHonorarioModal (flujo unificado — colapsa los 2 caminos legacy en 1)

1. **Parámetros**: consultorio (SearchableSelect con catálogo conta; opción "Todos") + rango (default mes
   anterior) → `GET analisis`.
2. **Resultados**: cards KPI (total servicios, Σ precios, pendientes) + lista de médicos (checkbox; para
   REGISTRAR pago se exige UN solo médico seleccionado) + grid de detalles con filtros locales (paciente/
   comprobante/precio/forma pago/estado) y flag pagado (deshabilitado).
3. **Validación Excel (opcional)**: carga "Plantilla Atenciones", cruce por comprobante (primer token de
   split '|') + fecha normalizada ddMMyyyy (port del parser: seriales Excel con bug 1900, DD/MM/YYYY,
   YYYY-MM-DD, DD.MM.YYYY, 8 dígitos); autoselecciona válidos pendientes; modal de errores.
4. **Cálculo (port EXACTO de la lógica legacy)**: `totalVisa` (formaPagoName contiene 'VISA') /
   `totalEfectivo` (contiene 'EFECTIVO'); descuento VISA % editable default **4**; toggle "Restar IGV (18%)"
   default ON = **×0.82 flat**; **cadena de % multiplicativos** (presets 100/90/80/70 + input libre;
   factor = Π(p/100)); total final visible en el botón.
5. **Datos del pago**: fecha de pago (default hoy), forma de pago (catálogo conta formas-pago), cuenta
   bancaria (catálogo conta — las 6 reales del legacy), % referencial (PorcMedico del consultorio, editable),
   glosa.
6. **Registrar** → `POST pagos` (servicios seleccionados con su consultorio real del detalle — un pago puede
   abarcar VARIOS consultorios) → éxito: toast + oferta de **imprimir recibo** (`ReciboPDF` con
   @react-pdf/renderer: logo CSL, datos clínica —estáticos o del legacy `/PagoMedicos/info`—, médico, periodo,
   desglose por consultorio, N° `PH-{IdPago}-{YYYYMM}`) → refresh del grid.
7. Manejo de errores: 400 del anti-doble-pago muestra los servicios ofensores.

### 3.4 Rentabilidad (ajuste)

`Rentabilidad.tsx` → `ConsultorioBloque`: columnas `Consultorio | Ingresos | Egresos | Resultado | % del grupo`
(Resultado en verde/rojo). Tipo `RentabilidadConsultorioRow` += `Egresos, Resultado`. Nota al pie:
"Egresos por consultorio: pagos de honorarios registrados en el módulo (desde jul-2026). OCUPACIONAL y otras
unidades no llevan egresos por consultorio."

Build Vite verde.

---

## FASE 4 — E2E + limpieza (orquestador)

1. API 5090 arriba + login demo (`sa`, POST `/api/conta/auth/login-bi`).
2. `GET analisis` de un consultorio con datos (jun-2026) → cuadrar 1 médico contra el SP legacy vivo.
3. `POST pagos` de prueba: 1 médico, servicios de **2 consultorios** → verificar en BD: cabecera PAGADO,
   2 detalles consultorio, 2 egresos (MED-HON, CC-ASIS=2, `i_IdConsultorio`, PAGADO, Σ = TotalPago exacto).
4. Reintento con un servicio repetido → 400 anti-doble-pago (mensaje con serviceId).
5. `GET /rentabilidad/por-consultorio` del mes → columnas Egresos/Resultado reflejan el pago en los 2
   consultorios; Ingresos idénticos a antes (Δ=0).
6. Caja diaria del mes → el egreso aparece en sección MEDICO.
7. `POST anular` → egresos ANULADO, servicios liberados, rentabilidad vuelve a 0 egresos.
8. UI: page /conta/honorarios (grid, modal completo, Excel, PDF) — verificación visual.
9. **LIMPIEZA TOTAL**: DELETE de pago/detalles/servicios/egresos de prueba + `DBCC CHECKIDENT RESEED` de
   las 4 tablas conta + eliminar entidad MEDICO de prueba (+reseed entidad si aplica). Verificar 0 filas.

## Riesgos / invariantes (leer antes de ejecutar cada fase)

1. `sp_Egreso_Insert`: resultset 1 columna, siempre (INSERT..EXEC de `sp_Compra_Clasificar` y ahora también
   de `sp_PagoHonorario_Insert`). Nadie hace INSERT..EXEC sobre `sp_PagoHonorario_Insert`.
2. Cross-DB: siempre `COLLATE DATABASE_DEFAULT` en joins de texto con SigesoftDesarrollo_2.
3. Montos legacy REAL → tolerancia de centavos en GATEs comparativos.
4. Los .sql del repo de los SPs legacy NO son la verdad — portar SIEMPRE desde `sys.sql_modules`.
5. `SigesoftDesarrollo_2`: SOLO SELECT. `dbo` de la BD principal: intocable (este plan no lo toca).
6. Sin lógica ECA/ECF (decisión del usuario §0.4) — no agregar filtros ni cortes por eso.
7. El page legacy `/honorarios-medicos` queda intacto (soft-delete = decisión posterior del usuario).
8. BD de producción: probar → evidenciar → **limpiar** (RESEED incluido).

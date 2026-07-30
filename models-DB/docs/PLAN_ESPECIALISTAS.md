# PLAN — Page `/conta/especialistas` (atenciones y referencias por especialista)

> **Para el ejecutor (IA):** este plan es autocontenido — TODA la investigación de BD/legacy ya está
> hecha y verificada con data real (sesión 2026-07-29, 3 spikes de `legacy-negocio` contra producción).
> **NO re-investigues** el esquema clínico ni el puente a ventas: los nombres de columna, centinelas,
> catálogos y llaves de join de §2 son hechos probados. Implementa exactamente lo especificado,
> verifica con los GATEs de §9 y reporta. Donde diga "VERIFICAR al implementar" es un detalle menor
> deliberadamente delegado (no bloquea el diseño).
>
> Cadena de ejecución: **db-experto (F1) → backend-api (F2) ∥ bi-frontend (F3) → qa-tester (F4)**.
> El contrato de la BD manda: los alias de los SPs definen los DTOs y los tipos TS, letra por letra.

Fecha del plan: 2026-07-29 · Autor: Fable 5 (planificador, protocolo Planificador/Ejecutor) ·
Estado: **LISTO PARA EJECUTAR (espera "go" del usuario)**

---

## 1. Objetivo

Nuevo page **`/conta/especialistas`** en el BI React: analizar la actividad de los **especialistas
que atienden consultorios** en un rango de fechas de atención.

- **Card de filtros:** dropdown *Especialidad* → jerarquiza el dropdown *Especialista* (con su id),
  rango de fechas *Desde/Hasta* (fecha de atención = `service.d_ServiceDate`), botón **Buscar**.
- **Bandeja principal (cabecera, PAGINADA a 25):** por especialista: especialidad, username, nombre,
  colegiatura, nº de atenciones totales, nº de referencias hechas, nº de **referencias efectivas**.
- **Acciones por fila:** "Ver Atenciones" y "Ver Referencias" → modales con listas de detalle
  (carga **lazy** por click, ver decisión D1 en §4).
- **Export a Excel** de las TRES listas: bandeja principal, atenciones del modal, referencias del modal.

Es una feature **100% de LECTURA**: cero DDL, cero escrituras, cero datos de prueba que limpiar.

## 2. Hechos verificados (2026-07-29, data real — NO re-investigar)

Dos BD en la misma instancia `190.116.90.35\CSL_2025` (puerto directo `190.116.90.35,50198`):
**clínico** = `SigesoftDesarrollo_2` · **ventas** = `20505310072`. Los SPs nuevos viven en el schema
`conta` de `20505310072` (nuestro) y cruzan con three-part naming + `COLLATE DATABASE_DEFAULT`.

| # | Hecho | Detalle verificado |
|---|---|---|
| H1 | **Fecha de atención** | `service.d_ServiceDate` (datetime2, 99.999% poblada). NO existe `d_ProbableServiceDate`. `d_ServiceDate ≈ d_InsertDate` (se registra el mismo día) — palanca de performance H8. |
| H2 | **Médico tratante** | `servicecomponent.i_MedicoTratanteId` (FK→`systemuser.i_SystemUserId`), fila del componente `i_IsRequiredId=1`. Centinelas a excluir: `-1` (sin médico), `0`, `11` (=`sa` institucional, colegiatura falsa 85193), `NULL`. Atención→tratante es 1:1 de facto (38/4180 con 2 → desempatar por menor `v_ServiceComponentId`, igual que `GetMedicoTratante_SP`). |
| H3 | **Médico que refiere** | `servicecomponent.i_ApplicantMedic` (FK→systemuser; en la UI legacy es el combo "Médico Solicitante" de `frmAddExam`). Mismos centinelas `0/-1/11/NULL`. VIVO: ~12.9k componentes/mes (jul-2026 = 12,898). Cubre lab Y derivación consultorio→consultorio (NO hay módulo de interconsulta: está muerto). |
| H4 | **Especialidad** | NO hay tabla maestra (`especiality` está VACÍA; `medico` mapea a tipo de servicio, no especialidad). Se INFIERE: `service.v_ProtocolId → protocol.i_Consultorio → systemparameter (i_GroupId=403, i_ParameterId=consultorio, v_Value1=nombre)`. 48 hojas; consultorio ≡ especialidad. |
| H5 | **Especialista (vs universo)** | `systemuser → person` (nombre) + `professional` por `v_PersonId` con `ISNULL(v_ProfessionalCode,'') <> ''` (colegiado) y `ISNULL(professional.i_IsDeleted,0)=0`. Esto filtra cajeros/admin/cuentas de sistema (`laboratorio`=25963, `rayosx`=191, `solidaridad`=31184 no tienen colegiatura); `sa`=11 se excluye por id (H2). ~75 especialistas activos en 2026. |
| H6 | **Estado de la atención** | `service.i_ServiceStatusId` → catálogo `systemparameter` grupo 125 (1 POR INICIAR, 2 INICIADO, 3 CULMINADO, 4 INCOMPLETO, 5 CANCELADO, 6 ESPERANDO APTITUD). **CANCELADO(5) está en desuso (0 filas 2026): la anulación real es `service.i_IsDeleted=1`.** "Atención efectiva/realizada" = `i_IsDeleted=0 AND i_ServiceStatusId IN (2,3)`. `v_MotivoVentaNoVenta` es texto libre inservible — NO usar. |
| H7 | **Puente atención→boleta (cross-DB)** | `service.v_ComprobantePago` (nchar, formato `"B004-00088446 |"`, puede traer varios tokens separados por `\|`; usar el PRIMER token). Split por `-`: serie + correlativo (correlativo conserva ceros a la izquierda → match EXACTO). Join: `20505310072.dbo.venta` por `v_SerieDocumento` + `v_CorrelativoDocumento` con `COLLATE DATABASE_DEFAULT` (nchar↔varchar). Cobertura jul-2026: 100% de los que tienen comprobante matchean; ~11% de services SIN comprobante (SISOL/empresa/ocupacional facturan por liquidación → **LEFT JOIN obligatorio**). `venta.i_IdTipoDocumento`: 3=BOLETA, 1=FACTURA. Montos: `d_Total` (bruto c/IGV) y `d_Valor` (neto). ~1.03 services/boleta (⚠️ ~3% de boletas cubren >1 service → D4). Las columnas `v_IdVentaCliente`/`v_IdVentaAseguradora` están 0% pobladas — NO usarlas. |
| H8 | **Performance/índices** | `servicecomponent` = 2.59M filas, CLUSTERED `(d_InsertDate, v_ServiceId)` + NC `(d_InsertDate, i_MedicoTratanteId)` y `(d_InsertDate, i_ApplicantMedic)`. `service` = 331k (HEAP), todos sus NC lideran por `d_InsertDate`. ⇒ **TODA query debe acotar `d_InsertDate` en AMBAS tablas** (con buffer de días) además de `d_ServiceDate` (H1); sin eso, table scan de 2.59M. |
| H9 | **Diagnósticos** | `diagnosticrepository` (N por atención, llave `v_ServiceId`) JOIN `diseases` por `v_DiseasesId`; código = `diseases.v_CIE10Id`, nombre = `diseases.v_Name`. Filtros: `dr.i_IsDeleted=0 AND dr.i_FinalQualificationId IN (2,3)` (2 DEFINITIVO, 3 PRESUNTIVO; excluye 4 DESCARTADO auto-generado por plantillas EMO). Hay pares duplicados → `DISTINCT`. Concat en SQL 2012: `STUFF(... FOR XML PATH(''),TYPE)` (patrón probado en §6.3). |
| H10 | **Referencia efectiva** | Verificado jul-2026 sobre 12,898 componentes-referencia: 94.6% cuelgan de service vivo; **89.6% el service tiene boleta→venta viva = EFECTIVA**. Solo 52% está CULMINADO (criterio demasiado estricto — descartado). ⇒ efectiva = service referido `i_IsDeleted=0` **y** comprobante que matchea venta no anulada. |
| H11 | **Cifras ancla para QA** | jul-2026: 12,898 comps-referencia; 89.6% efectivas; 3,975 services con comprobante → 3,975 match / 3,971 venta viva; boleta `B004-00088446` = `d_Total 195.00` / `d_Valor 165.25` (service `N009-SR000804761`). 2026 ene-jul: 75 especialistas / 32 especialidades / 142 pares. Ej.: `cesar.velasquezc` CARDIOLOGIA 6,051 atenciones; `victor.oruna` GASTROENTEROLOGIA 2,582; `jose.ramirez` multi (MEDICINA INTERNA 7,140 dominante + CARDIOLOGIA 40). |

Reglas duras del proyecto que aplican: SQL Server **2012** (sin `STRING_AGG`/`CREATE OR ALTER`/
`TRIM`/`DROP IF EXISTS`; `OFFSET/FETCH` SÍ existe en 2012) — ver `reglas-sql2012.md`. **NUNCA tocar
objetos `dbo`** de ninguna de las dos BD (solo SELECT); los SPs van en `conta`.

## 3. Decisiones cerradas (por el planificador, con data — el PO puede vetar antes del "go")

| # | Decisión | Valor y porqué |
|---|---|---|
| D1 | **Lazy vs eager** (pedido: "evalúalo tú") | **LAZY** — ver evaluación en §4. Los modales llaman a la BD al click, con cache cliente por `(medicoId, rango)`. |
| D2 | **"Referencia" — definición** | Componente con `i_ApplicantMedic` real **y** `i_ApplicantMedic <> ISNULL(i_MedicoTratanteId,-999)` (solicita algo que EJECUTA otro; si él mismo lo ejecuta no es referencia). **Grano de conteo y de listado = SERVICIO referido DISTINTO** (no componente): evita inflar 5 exámenes de la misma orden y repetir la misma boleta 5 veces. Los componentes se muestran concatenados en la fila. |
| D3 | **"Referencia efectiva"** | = service referido vivo + boleta→venta viva (H10, 89.6%). NO "CULMINADO" (52%, demasiado estricto). Coincide con la semántica del PO: "el paciente decidió hacerla acá". |
| D4 | **Monto** | Mostrar `venta.d_Total` (bruto c/IGV) como **"Monto comprobante" INFORMATIVO** — no es KPI de rentabilidad ni cifra de tubería (no aplican los 4 filtros de ventas). Se acepta el ~3% de boletas compartidas entre 2 services (cada fila muestra el total de SU comprobante; no se suman montos en footers para no sobrecontar). |
| D5 | **Ámbito de especialidades** | v1 incluye TODO el catálogo 403 (también apoyo diagnóstico: LABORATORIO, RAYOS X, ECOGRAFÍA...). El dropdown de especialidad ya permite acotarlo; excluirlos por defecto queda como knob futuro. |
| D6 | **Ranking de la bandeja** | `NumAtenciones DESC, Medico ASC`. Paginación server-side de **25**. |
| D7 | **Dropdowns de filtros** | Se cargan al montar el page con ventana fija de **últimos 12 meses** (estable y predecible). Si el especialista elegido no tuvo actividad en el rango buscado, el resumen devuelve 0 filas (empty-state claro). No se recargan al cambiar fechas. |
| D8 | **Cabecera multi-especialidad** | 1 fila por MÉDICO. Columna Especialidad = la **dominante** en el rango (más atenciones), con sufijo `(+N)` si tiene más. Médico que SOLO refirió (0 atenciones como tratante): entra con `NumAtenciones=0` y Especialidad NULL (front muestra "—"). |
| D9 | **Filtro por especialidad en el resumen** | `@ConsultorioId` restringe las ATENCIONES contadas y la membresía del médico. Las REFERENCIAS del médico NO se restringen por consultorio (el consultorio de una referencia es el DESTINO; el origen no se registra) — documentado en tooltip del front. |
| D10 | **Export Excel** | Client-side con SheetJS (patrón `excelHonorarios.ts`/`excelCuadreCaja.ts`, `xlsx@0.18.5` ya instalado). El export re-pide al API con `tamanio=0` (= sin paginar) para traer el dataset COMPLETO del filtro, no solo la página visible. Cap servidor 20,000 filas en los detalles (RAISERROR ≥50000 → 400 negocio). |

## 4. Evaluación eager vs lazy (D1) — por qué LAZY

**Eager (una sola llamada trae cabecera + todas las listas):**
25 médicos/página × detalle de ~200–7,000 atenciones/médico en un rango típico (jose.ramirez solo:
7,140 en 7 meses) = **50k–150k filas de detalle por búsqueda**, cada una con subquery de dx
concatenados (STUFF por fila) + LEFT JOIN cross-DB a `venta`. Coste estimado: decenas de segundos y
payloads de varios MB — para listas que en su mayoría NADIE abrirá.

**Lazy (elegido):**
- **Resumen**: agregación pura sobre índices hechos a medida (NC por `i_MedicoTratanteId` y por
  `i_ApplicantMedic`, ambos liderados por `d_InsertDate` — H8). Sin dx, sin filas de detalle.
  Objetivo <5s para un mes.
- **Detalle**: al click, UN médico + rango, paginado a 50 — el seek por fecha + filtro por médico
  reduce a cientos de filas; el STUFF de dx corre solo sobre la página. Objetivo <3s.
- **Cache cliente** por `(medicoId, desde, hasta, pagina)`: reabrir el modal no re-llama. Se
  invalida con cada "Buscar" nuevo.
- **Export**: es el único caso que pide el detalle completo (`tamanio=0`), y es una acción explícita
  del usuario, 1 médico a la vez, con cap de 20k filas.

## 5. Arquitectura (resumen de piezas)

| Capa | Pieza | Archivo |
|---|---|---|
| BD | 4 SPs `conta.sp_Especialistas_*` | `models-DB/script-conta/sp/25_especialistas.sql` (repo) + aplicar en prod |
| API | `EspecialistasController` + repo + DTOs | `Controllers/EspecialistasController.cs`, `Repositories/EspecialistasRepository.cs`, `Dtos.cs` |
| Front | page + 2 modales + excel helper + tipos/service/ruta | `pages/Contabilidad/Especialistas/Especialistas.tsx`, `components/especialistas/{ModalAtenciones,ModalReferencias}.tsx`, `components/especialistas/excelEspecialistas.ts` |

Sin DDL. Sin cambios en tablas. Sin escrituras.

## 6. Capa BD — `sp/25_especialistas.sql` (4 SPs, schema `conta` de `20505310072`)

Convenciones comunes a los 4 SPs (definirlas UNA vez y reusar):

```sql
-- Parámetros de fecha: @Desde DATE, @Hasta DATE (inclusive). Predicado canónico (H1+H8):
--   sc.d_InsertDate >= DATEADD(DAY,-3,@Desde) AND sc.d_InsertDate <  DATEADD(DAY,4,@Hasta)   -- seek del índice
--   AND s.d_InsertDate >= DATEADD(DAY,-3,@Desde) AND s.d_InsertDate < DATEADD(DAY,4,@Hasta)  -- ídem en service
--   AND s.d_ServiceDate >= @Desde AND s.d_ServiceDate < DATEADD(DAY,1,@Hasta)                -- fecha de negocio
-- Centinelas: <col> IS NOT NULL AND <col> NOT IN (-1,0,11)   -- para i_MedicoTratanteId e i_ApplicantMedic
-- Atención viva: s.i_IsDeleted = 0  (+ ISNULL(sc.i_IsDeleted,0)=0 en componentes)
-- Especialista: JOIN professional pr ON pr.v_PersonId = su.v_PersonId
--               AND ISNULL(pr.i_IsDeleted,0)=0 AND ISNULL(pr.v_ProfessionalCode,'') <> ''
-- Nombre: LTRIM(RTRIM(pe.v_FirstLastName+' '+ISNULL(pe.v_SecondLastName,'')+', '+pe.v_FirstName))
-- Especialidad: JOIN SigesoftDesarrollo_2.dbo.protocol p ON p.v_ProtocolId = s.v_ProtocolId
--               JOIN SigesoftDesarrollo_2.dbo.systemparameter sp403
--                    ON sp403.i_GroupId=403 AND sp403.i_ParameterId = p.i_Consultorio
-- Parse comprobante (primer token de v_ComprobantePago):
--   token  = LTRIM(RTRIM(LEFT(s.v_ComprobantePago, CHARINDEX('|', s.v_ComprobantePago + '|') - 1)))
--   serie  = LEFT(token, CHARINDEX('-',token)-1)
--   corr   = LTRIM(RTRIM(SUBSTRING(token, CHARINDEX('-',token)+1, 20)))
--   (guard: solo si CHARINDEX('-',token) > 0)
-- Join venta (LEFT, cross-DB):
--   LEFT JOIN [20505310072].dbo.venta v
--     ON v.v_SerieDocumento = serie COLLATE DATABASE_DEFAULT
--    AND v.v_CorrelativoDocumento = corr COLLATE DATABASE_DEFAULT
--   Venta viva: filtro de anulación de venta — usar LA MISMA columna/condición que ya usan los SPs
--   conta existentes (p.ej. sp_Honorarios_Analisis tokeniza v_ComprobantePago igual). VERIFICAR al
--   implementar el nombre exacto (i_Eliminado=0 según el spike); no inventar otro criterio.
-- Paginación: @Pagina INT=1, @Tamanio INT (0 = sin paginar/export). OFFSET/FETCH (SQL 2012 OK)
--   + columna TotalFilas = COUNT(*) OVER () en el SELECT paginado.
-- Los alias del SELECT son EL CONTRATO: los DTOs C# y tipos TS copian estos nombres LETRA POR LETRA.
```

### 6.1 `conta.sp_Especialistas_Filtros` — combos del card

`@Desde DATE = NULL, @Hasta DATE = NULL` → default: `@Hasta = hoy`, `@Desde = DATEADD(MONTH,-12,hoy)` (D7).

- **RS1 (especialidades con actividad):** `ConsultorioId (INT), Especialidad (NVARCHAR)` —
  DISTINCT de los pares médico-real×consultorio del rango, ordenado por Especialidad.
- **RS2 (especialistas):** `MedicoId, UserName, Medico, Colegiatura, ConsultorioId, Especialidad, NumAtenciones`
  — **1 fila por médico×consultorio** (el front agrupa client-side para la cascada). Solo
  tratantes reales colegiados (H2+H5), services vivos.

### 6.2 `conta.sp_Especialistas_Resumen` — bandeja principal paginada

`@Desde DATE, @Hasta DATE, @ConsultorioId INT = NULL, @MedicoId INT = NULL, @Pagina INT = 1, @Tamanio INT = 25`

Lógica (dos agregaciones + merge):

1. **CTE `aten`** — atenciones por tratante: componentes `i_IsRequiredId=1` con tratante real,
   service vivo y en rango; dedup a 1 tratante/service con
   `ROW_NUMBER() OVER (PARTITION BY sc.v_ServiceId ORDER BY sc.v_ServiceComponentId) = 1` (H2).
   Si `@ConsultorioId` no es NULL: `AND p.i_Consultorio = @ConsultorioId` (D9).
   Produce: `medico, NumAtenciones = COUNT(DISTINCT v_ServiceId)` + de paso la matriz
   `medico×consultorio×n` para la especialidad dominante (D8).
2. **CTE `refs`** — referencias por solicitante: componentes con `i_ApplicantMedic` real y
   `i_ApplicantMedic <> ISNULL(i_MedicoTratanteId,-999)` (D2), en rango. Agrupado a **servicio
   referido DISTINCT** por médico: `NumReferencias = COUNT(DISTINCT sc.v_ServiceId)`;
   `NumReferenciasEfectivas = COUNT(DISTINCT CASE WHEN <service vivo Y venta viva (H7/H10)> THEN sc.v_ServiceId END)`.
   SIN filtro de consultorio (D9).
3. **Merge FULL** de `aten` y `refs` por médico (un médico puede tener solo referencias, D8) +
   JOIN systemuser/person/professional (solo colegiados, H5) + especialidad dominante.
4. Si `@MedicoId` no es NULL: filtrar a ese médico.

**Resultset (contrato):**

```
MedicoId (INT) · UserName · Medico · Colegiatura · Especialidad (NULL si 0 atenciones) ·
NumEspecialidades (INT) · NumAtenciones (INT) · NumReferencias (INT) ·
NumReferenciasEfectivas (INT) · TotalFilas (INT)
```

`ORDER BY NumAtenciones DESC, Medico` (D6) + OFFSET/FETCH (`@Tamanio=0` → sin OFFSET, todo).

### 6.3 `conta.sp_Especialistas_Atenciones` — modal "Ver Atenciones"

`@MedicoId INT, @Desde DATE, @Hasta DATE, @ConsultorioId INT = NULL, @Pagina INT = 1, @Tamanio INT = 50`

Universo: services vivos del rango donde `@MedicoId` es el TRATANTE (componente requerido, dedup H2).
Por fila (un service):

- `ServiceId` (`s.v_ServiceId`), `FechaAtencion` (`s.d_ServiceDate`), `Consultorio` (sp403.v_Value1),
  `EstadoAtencion` (v_Value1 del grupo 125 por `s.i_ServiceStatusId`).
- `Paciente` — nombre desde la persona del service (`s.v_PersonId → person`; **VERIFICAR al
  implementar** el nombre exacto de la columna en `service`; si no existiera, omitir la columna
  sin bloquear el resto).
- `NroComprobante` (`serie + '-' + corr`, NULL si sin comprobante), `TipoComprobante`
  (CASE `v.i_IdTipoDocumento` 3→'BOLETA', 1→'FACTURA', else 'OTRO'), `MontoComprobante` (`v.d_Total`,
  NULL si sin venta) — LEFT JOIN (H7).
- `Diagnosticos` — concat SQL2012 (H9), patrón EXACTO probado:

```sql
STUFF((SELECT ' | ' + x.cie + ' ' + x.nm FROM (
         SELECT DISTINCT ds.v_CIE10Id cie, ds.v_Name nm
         FROM SigesoftDesarrollo_2.dbo.diagnosticrepository dr
         JOIN SigesoftDesarrollo_2.dbo.diseases ds ON ds.v_DiseasesId = dr.v_DiseasesId
         WHERE dr.v_ServiceId = s.v_ServiceId AND dr.i_IsDeleted = 0
           AND dr.i_FinalQualificationId IN (2,3)) x
       FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 3, '')
```

- `Referida` (BIT) — EXISTS componente del MISMO service con applicant real (D2) distinto del
  tratante del service; `ReferidoPor` — nombres DISTINCT de esos applicants concatenados con `' | '`
  (mismo patrón STUFF), NULL si `Referida=0`.
- `TotalFilas` = COUNT(*) OVER ().

`ORDER BY FechaAtencion DESC, ServiceId`. **Guard export:** si `@Tamanio=0` y el total > 20,000 →
`RAISERROR('El export supera 20,000 filas; acota el rango de fechas.',16,1)` con severidad de
negocio (el manejador global del API lo convierte en 400 `{message}`).

### 6.4 `conta.sp_Especialistas_Referencias` — modal "Ver Referencias"

`@MedicoId INT, @Desde DATE, @Hasta DATE, @Pagina INT = 1, @Tamanio INT = 50`

Universo: componentes-referencia de `@MedicoId` (D2) en rango, **agrupados a servicio referido
DISTINCT**. Por fila (un service referido):

```
ServiceId · FechaAtencion (d_ServiceDate del referido) · ConsultorioDestino (sp403 del referido) ·
ComponentesReferidos (concat DISTINCT de component.v_Name de los componentes que ESTE médico
  solicitó en ese service, patrón STUFF ' | ') ·
MedicoEjecutor (tratante del service referido, dedup H2; NULL si genérico/lab sin persona no-colegiada
  — mostrar el nombre de person aunque no sea colegiado, aquí NO se exige colegiatura al ejecutor) ·
Efectiva (BIT: service vivo + venta viva, D3) ·
NroComprobante · TipoComprobante · MontoComprobante (LEFT JOIN venta, H7) ·
TotalFilas
```

`ORDER BY FechaAtencion DESC, ServiceId`. Mismo guard de 20,000 filas en export.

### 6.5 Reglas de implementación BD

- Archivo repo: `models-DB/script-conta/sp/25_especialistas.sql` con los 4 SPs (patrón multi-SP de
  `sp/19`). SQL 2012 estricto: `IF EXISTS (SELECT... sys.procedures) DROP PROCEDURE` + `CREATE`.
- Aplicar en prod vía db-console y verificar `sys.procedures.modify_date` + `sys.sql_modules` (repo==prod).
- Probar cada SP con las cifras ancla H11 ANTES de pasar a F2 (esto es parte de F1, no de QA).
- PROHIBIDO: tocar `dbo`, escrituras de cualquier tipo, leer `systemuser.v_Password`.

## 7. Capa API — `EspecialistasController` (`api/conta/especialistas`)

- `[Authorize(Roles = "SA,CONTABILIDAD,GERENTE")]` a nivel controller (feature de solo lectura —
  mismo trío LECTURA que el NLQ).
- Endpoints (todos GET):

| Ruta | SP | Query params |
|---|---|---|
| `GET filtros` | `sp_Especialistas_Filtros` | `desde?`, `hasta?` (ISO date) |
| `GET resumen` | `sp_Especialistas_Resumen` | `desde`, `hasta` (obligatorios), `consultorioId?`, `medicoId?`, `pagina=1`, `tamanio=25` |
| `GET {medicoId:int}/atenciones` | `sp_Especialistas_Atenciones` | `desde`, `hasta`, `consultorioId?`, `pagina=1`, `tamanio=50` |
| `GET {medicoId:int}/referencias` | `sp_Especialistas_Referencias` | `desde`, `hasta`, `pagina=1`, `tamanio=50` |

- `filtros` usa `QueryMultipleAsync` (2 RS) → `{ especialidades: [...], especialistas: [...] }`.
- Dapper `commandTimeout: 60`. Validación: `desde <= hasta`, rango máx **366 días** → si excede,
  400 `{message}` (consistencia con el cap del export).
- **DTOs en `Dtos.cs`**: `EspecialistaFiltroEspecialidadDto`, `EspecialistaFiltroMedicoDto`,
  `EspecialistaResumenDto`, `EspecialistaAtencionDto`, `EspecialistaReferenciaDto` — propiedades con
  los nombres EXACTOS de los alias de §6 (gotcha Dapper: mapeo por nombre exacto, sin `[Column]`).
  `TotalFilas` viaja en cada fila; el controller lo eleva a `{ total, filas }` en la respuesta.
- Errores: el manejador global existente ya separa negocio (SqlException ≥50000 → 400 `{message}`)
  de infra (500 genérico) — el RAISERROR del cap de export cae ahí solo, no hacer nada especial.

## 8. Capa Front — page `/conta/especialistas`

### 8.1 Archivos

| Acción | Archivo |
|---|---|
| CREAR | `react-project/src/pages/Contabilidad/Especialistas/Especialistas.tsx` |
| CREAR | `react-project/src/pages/Contabilidad/components/especialistas/ModalAtenciones.tsx` |
| CREAR | `react-project/src/pages/Contabilidad/components/especialistas/ModalReferencias.tsx` |
| CREAR | `react-project/src/pages/Contabilidad/components/especialistas/excelEspecialistas.ts` |
| EDITAR | `App.tsx` (ruta `especialistas` bajo `/conta`), nav del módulo Contabilidad (entrada "Especialistas"), `contaTypes.ts` (tipos = contrato §6/§7), `ContabilidadService.ts` (4 métodos GET) |

### 8.2 Card de filtros

- Al montar: 1 llamada a `filtros` (sin params → últimos 12 meses, D7). Spinner en los combos.
- **Dropdown Especialidad** (RS1) → al elegir, el **dropdown Especialista** se filtra client-side
  del RS2 (pares médico×consultorio); opción "(todas)" / "(todos)". Elegir especialista SIN
  especialidad también es válido.
- **Desde/Hasta**: inputs date; default = mes actual usando **`todayLima()`** de `src/utils/fechas.ts`
  (CONVENCIÓN — jamás `toISOString().slice`). Validar desde ≤ hasta y rango ≤ 366 días antes de llamar.
- **Buscar**: llama `resumen` página 1; resetea la paginación y el cache de modales (D1).

### 8.3 Bandeja principal (paginada, 25)

Columnas: `Especialidad` (con sufijo `(+N)` si `NumEspecialidades>1`; "—" si NULL) · `UserName` ·
`Médico` · `Colegiatura` · `# Atenciones` · `# Referencias` · `# Ref. efectivas` (con `%` derivado
client-side) · `Acciones` (iconos "Ver Atenciones", "Ver Referencias" — deshabilitar "Ver
Atenciones" si `NumAtenciones=0` y "Ver Referencias" si `NumReferencias=0`).
Paginador server-side estándar del proyecto (total = `total` de la respuesta). Botón **"Exportar
Excel"** en el header de la card (D10). Tooltip en "# Referencias": "las referencias no se filtran
por especialidad (el consultorio registrado es el destino)" (D9).

### 8.4 Modales (lazy, D1)

- **ModalAtenciones** (`medicoId` + rango + consultorioId del filtro): tabla paginada 50 —
  `Fecha · Consultorio · Paciente · Estado · Nro Comprobante · Monto · Diagnósticos · ¿Referida? · Referido por`.
  Montos con `moneyPEN` de `src/utils/money.ts` (CONVENCIÓN); sin comprobante → "—".
  Diagnósticos: celda con ellipsis + title (texto completo al hover).
- **ModalReferencias** (`medicoId` + rango): tabla paginada 50 —
  `Fecha · Consultorio destino · Componentes referidos · Médico ejecutor · ¿Efectiva? · Nro Comprobante · Monto`.
  `¿Efectiva?` como badge (verde SI / gris NO).
- Ambos: título con nombre del médico + rango; botón "Exportar Excel"; estado de carga y de error
  (400 del cap de export → mostrar el `message` del API); **cache por `(medicoId, rango, pagina)`**
  en el estado del page, invalidado en cada Buscar.

### 8.5 Export Excel (D10) — `excelEspecialistas.ts`

Tres funciones puras (patrón SheetJS de `excelHonorarios.ts`: `book_new` + `aoa_to_sheet` +
`!cols` + `writeFile`; `xlsx@0.18.5` ya instalado, NO instalar nada):

1. `exportResumen(filas, filtros)` → `especialistas-resumen-<desde>_<hasta>.xlsx`
2. `exportAtenciones(filas, medico, filtros)` → `atenciones-<username>-<desde>_<hasta>.xlsx`
3. `exportReferencias(filas, medico, filtros)` → `referencias-<username>-<desde>_<hasta>.xlsx`

Cada export: fila de título + fila con los filtros aplicados (especialidad/especialista/rango) +
encabezados + datos. **Los datos se re-piden al API con `tamanio=0`** (dataset completo del filtro,
no la página visible); el botón muestra spinner mientras baja. Errores del cap 20k → toast con el
`message`. NO totalizar montos en el pie (D4 — boletas compartidas sobrecontarían).

### 8.6 Verificación front

`npx tsc --noEmit` (0 errores — hoy pasa limpio, mantenerlo) + `vite build` OK.

## 9. GATEs de QA (F4 — qa-tester, con este plan como casos de prueba)

| GATE | Verificación | Criterio de PASS |
|---|---|---|
| G0 | Stack vivo (P0): API 5090 arriba con `appsettings.Local.json`, Vite 5173 | ambos responden |
| G1 | Repo==prod: los 4 SPs en `sys.sql_modules` == `sp/25_especialistas.sql`; `modify_date` de hoy | idénticos |
| G2 | Contrato JSON: `resumen` y ambos detalles contra el API vivo — nombres de campo EXACTOS del §6 (case incluido), `{ total, filas }` presente | shape exacto |
| G3 | Cifras (jul-2026, H11): (a) Σ NumReferencias del resumen sin filtros ≈ agregado por servicio-distinto de los 12,898 comps (calcular el esperado con SQL directo y comparar EXACTO); (b) % efectivas global ≈ 89-90%; (c) en ModalAtenciones el service `N009-SR000804761` muestra `B004-00088446` / BOLETA / **195.00**; (d) `victor.oruna` GASTROENTEROLOGIA aparece con sus atenciones (ene-jul = 2,582 con el rango completo); (e) `jose.ramirez` sale con Especialidad "MEDICINA INTERNA (+1)" | al centavo / exacto |
| G4 | Autorización: GERENTE → 200 en los 4 endpoints (es LECTURA); token inválido → 401 | correcto |
| G5 | Validaciones negocio: `desde>hasta` → 400; rango >366 días → 400; export >20k filas → 400 con `{message}` legible en el front | correcto |
| G6 | Front: build limpio (tsc+vite); cascada especialidad→especialista; Buscar pagina y resetea cache; modales lazy con cache (reabrir NO re-llama — verificar en Network); export de las 3 listas abre .xlsx cuyos totales de filas == `total` del API | correcto |
| G7 | Performance: `resumen` de 1 mes < 5s; modales < 3s; export detalle de 1 mes < 15s | dentro de objetivo |
| G8 | Read-only: los 4 SPs no contienen INSERT/UPDATE/DELETE/EXEC de escritura; cero filas nuevas en `conta.*` tras la sesión de QA | limpio |

Sin datos de prueba que sembrar ni RESEED (lectura pura). Al cerrar la sesión: bajar 5090/5173.

## 10. Fases de ejecución

| Fase | Agente | Entregable | Depende de |
|---|---|---|---|
| F1 | **db-experto** | `sp/25_especialistas.sql` escrito, aplicado en prod, probado contra H11 (cifras ancla) | — |
| F2 | **backend-api** | Controller + Repository + DTOs + validaciones; probado con curl/Swagger contra los SPs | F1 (contrato §6) |
| F3 | **bi-frontend** | Page + modales + excel + ruta/nav/tipos/service; tsc+vite limpios | F1 (contrato §6 — puede ir EN PARALELO con F2, el contrato ya está fijado aquí) |
| F4 | **qa-tester** | GATEs G0–G8 con evidencia | F2+F3 integrados |
| F5 | **orquestador** | Commit único `feat(conta): page especialistas - atenciones y referencias por medico` (sp/25 + API + front + este plan) — **solo con OK explícito del usuario** | F4 verde |

## 11. Fuera de alcance / riesgos / deuda declarada

- **Fuera de alcance v1:** KPI de facturación por especialista con tubería/filtros de ventas (D4 —
  el monto es informativo); excluir apoyo diagnóstico por defecto (D5); hospitalización (sus dx
  viven desnormalizados en `dbo.hospitalizacion`, no en `diagnosticrepository` — este page es
  atención ambulatoria); export PDF.
- **Riesgos aceptados:** colegiaturas legacy sucias se muestran tal cual; ~3% de boletas compartidas
  entre services (D4); la especialidad es INFERIDA de la actividad (no hay maestra — H4), así que
  un médico nuevo sin atenciones no aparece en los combos.
- **Deuda futura (no bloquea):** si el page crece a histórico multi-año, evaluar materializar el
  resumen (tabla `conta` + tick del poller) en lugar del agregado on-the-fly.
- **Nota de memoria:** los hechos H1–H11 corrigen/amplían `dominio-clinico.md` (puente
  `v_ComprobantePago`, estados grupo 125, referencia efectiva, `i_ApplicantMedic` vivo, `especiality`
  vacía, consultorio≡especialidad 403). Al cierre del bloque, correr `continual-learning` con el
  digest de esta sesión — pendiente ya conocido del orquestador.

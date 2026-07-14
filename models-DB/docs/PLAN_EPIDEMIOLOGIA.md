# PLAN EJECUTOR — Módulo "Epidemiología" (Ficha Individual EPI + Dashboard Epidemiológico)

> Documento maestro para el ejecutor. Autocontenido. Cada fase tiene GATEs verificables.
> Toda la evidencia sale de producción (db-console, SOLO SELECT). Diseño cerrado; el ejecutor
> **no re-investiga**, construye. Si algo del contexto contradice la realidad, PARA y reporta al orquestador.

Fecha de diseño: **2026-07-14** · Diseñado tras 2 fases de investigación (`legacy-negocio`) + mejores
prácticas (sala situacional MINSA/CDC, dashboards de vigilancia OMS, canal endémico por cuartiles).

---

## 0. OBJETIVO Y ALCANCE

Nuevo item de sidebar **"Epidemiología"** → ruta `/conta/epidemiologia`. Una página con **2 tabs** que
comparten **el mismo card de filtros**:

- **TAB 1 — Ficha Individual EPI**: grid paginada (50) con las 25 columnas del formato DIRESA, una fila por
  atención, exportable a Excel (`FICHA INDIVIDUAL EPI.xlsx`).
- **TAB 2 — Dashboard Epidemiológico**: dashboard potente y profesional (12 gráficos + KPIs) basado en
  diagnósticos, agrupado por consultorio, capítulo CIE-10, grupo etario, sexo, médico, tiempo y geografía,
  con canal endémico e incidencia (casos nuevos).

**Todo se resuelve con Stored Procedures** (cross-DB a `SigesoftDesarrollo_2`, solo SELECT). Nada se calcula
en el front salvo el render de charts.

### Decisiones del usuario ya tomadas (NO re-preguntar)
1. **Procedencia** (col 20) = `person.v_BirthPlace` (proxy; el campo nativo `v_Procedencia` está 100% vacío).
2. **Dx de descarte** (EMO auto) **excluidos por default**; check "Incluir descartados" (`@IncluirDescartados`).
3. Grid TAB 1 muestra **todas** las atenciones del rango; check "Solo con diagnóstico" (`@SoloConDiagnostico`).
4. Filtro de fecha = **`service.d_ServiceDate`** (fecha de atención).
5. Ámbitos: **Todos / Asistencial / Ocupacional / Hospitalización**.

### Decisiones pendientes de confirmar por el usuario (el ejecutor las deja parametrizadas con el default indicado)
- **A**: ¿MTC (tipo 34, volumen ~0 en 2026) cuenta como Asistencial? → **default: sí, dentro de Asistencial.**
- **B**: Rol/visibilidad del módulo. → **default: visible a todo usuario conta autenticado** (dato clínico, no
  financiero). Si se quiere restringir, es una línea en `navItems`.
- **C**: "Inicio de síntomas" (cols 24/25): el sistema solo tiene texto libre relativo ('1 MES', ~20% cobertura).
  → **default: col 24 = texto TIEMPO DE ENFERMEDAD, col 25 = vacío.**

---

## 1. CONTEXTO VERIFICADO (evidencia de producción — NO re-investigar)

**Hallazgo estructural**: el dominio clínico vive en **`SigesoftDesarrollo_2`** (BD del desktop), NO en la BD
de ventas. Los SPs nuevos viven en schema **`conta`** y leen cross-DB con three-part naming
(`SigesoftDesarrollo_2.dbo.<tabla>`) — mismo patrón de "referencia lógica" ya usado en formas de pago,
cuentas bancarias y consultorios 403.

### 1.1 Tabla de atenciones — `SigesoftDesarrollo_2.dbo.service`
- 1 fila = 1 atención. PK `v_ServiceId` varchar(16) (`N009-SR########`). ~315k filas.
- **Fecha de atención = `d_ServiceDate`** (datetime2). Persona = `v_PersonId`. Protocolo = `v_ProtocolId`.
  Master service = `i_MasterServiceId`. Soft-delete = `i_IsDeleted=0` (SIEMPRE filtrar).
- **Ámbito** vía `protocol.i_MasterServiceTypeId` (padre en el árbol auto-referente `systemparameter` grupo 119):

  | `i_MasterServiceTypeId` | Línea | Mapea a `@Ambito` |
  |---|---|---|
  | 1 | EMPRESARIAL | **OCUPACIONAL** |
  | 9 | PARTICULAR | ASISTENCIAL |
  | 42 | SISOL (hojas 43–51) | ASISTENCIAL |
  | 11 | SEGUROS | ASISTENCIAL |
  | 34 | MTC (licencias) | ASISTENCIAL (decisión A) |

  - `OCUPACIONAL` = tipo 1. `ASISTENCIAL` = tipos 9,42,11,34. `TODOS` = sin filtro de tipo.
  - **HOSPITALIZACION** = `EXISTS (SELECT 1 FROM dbo.hospitalizacionservice hs WHERE hs.v_ServiceId = s.v_ServiceId)`.
    (Es subconjunto de PARTICULAR; 750 atenciones en 2026 H1; puente hosp↔service 1:1.)

### 1.2 Diagnósticos — `dbo.diagnosticrepository` + `dbo.diseases`
- `diagnosticrepository`: N filas por atención (`v_ServiceId`), FK lógica `v_DiseasesId` → `diseases`.
  `diseases.v_CIE10Id` = **código CIE10** (sin punto), `diseases.v_Name` = nombre local.
- **Calificación** `diagnosticrepository.i_FinalQualificationId` (grupo 138): 1 SIN CALIFICAR, **2 DEFINITIVO,
  3 PRESUNTIVO, 4 DESCARTADO**. `i_AutoManualId` (grupo 136): 1 AUTO, 2 MANUAL.
- **Regla de negocio crítica**: las plantillas EMO ocupacionales **auto-generan dx DESCARTADO** (29k en 2026).
  → **Default de TODO el módulo: `i_FinalQualificationId IN (2,3)`**. `@IncluirDescartados=1` agrega el 4.
- **`v_ComponentId` 100% poblado** en `diagnosticrepository` → dimensión "examen/formato que generó el dx"
  (`component.v_Name`). Drill-down secundario, opcional.
- ⚠️ Hay **pares (atención, enfermedad) duplicados** → la concatenación y los conteos deben usar **DISTINCT**.
- Ejemplo real múltiple (`N009-SR000794303`): `DOLOR PRECORDIAL (R072) | DOLOR DE PECHO (R522)` (con duplicado
  que DISTINCT elimina).

### 1.3 Paciente — `dbo.person` (PK clustered `v_PersonId`)
Calidad sobre los 17,336 pacientes atendidos ene-jun 2026: nacimiento 100%, sexo 100%, documento 99.99%,
distrito 99.99%, dirección 99.9%, nacionalidad 100%, etnia 99.6% (pero 'Mestizo' default masivo),
lugar de nacimiento 99.99%, **`v_Procedencia` 0% (muerta)**.
- Sexo `i_SexTypeId` → `systemparameter` grupo 100 (1 MASCULINO, 2 FEMENINO).
- Tipo doc `i_DocTypeId` → `datahierarchy` grupo 106 (1 DNI, 2 PASAPORTE, 3 LIC. CONDUCIR, 4 CARNET EXTRANJERÍA).
- Nacionalidad `v_Nacionalidad` = **texto libre con typos** ('PERUANA'/'PERUANO'/'PERUANO|'…). Exportar tal cual;
  para agregados normalizar `LIKE 'PERU%' → 'PERUANA'`.
- Etnia `i_EtniaRaza` → `systemparameter` grupo 401 (0 Mestizo default masivo). Baja confianza epidemiológica.
- **Edad NO almacenada — se calcula a la fecha de atención**:
  `DATEDIFF(YEAR, p.d_Birthdate, s.d_ServiceDate) - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, p.d_Birthdate, s.d_ServiceDate), p.d_Birthdate) > s.d_ServiceDate THEN 1 ELSE 0 END`
- **N° Historia Clínica = `person.v_DocNumber`** (convención del sistema; lo hace `GetListaAtencionesParaHistoria_SP`).
- Ubigeo `person.i_DepartmentId / i_ProvinceId / i_DistrictId` → `datahierarchy` grupo 113 (árbol dpto→prov→dist).
- País: **NO EXISTE** → constante `'PERU'`. Referencia (col 22): **NO EXISTE** → vacío.

### 1.4 Consultorio — `protocol.i_Consultorio` → `systemparameter` grupo 403 (48 consultorios)
- **Cobertura: 99.3% de las atenciones CON dx resuelven consultorio.** `service` NO tiene consultorio directo;
  va por el protocolo. Sin-consultorio ≈ hospitalización/SOP → **fallback por master service**:
  `CASE WHEN s.i_MasterServiceId=19 THEN 'HOSPITALIZACION' WHEN s.i_MasterServiceId=30 THEN 'SALA OPERACIONES' ELSE '(SIN CONSULTORIO)' END`.
- Top 2026 H1: LABORATORIO, OCUPACIONAL, GINECO OBSTETRICIA, MEDICINA INTERNA, CARDIOLOGIA, ECOGRAFÍA…

### 1.5 Médico que diagnostica — `dbo.servicecomponent.i_MedicoTratanteId` (65% de dx)
- `service.i_MedicoTratanteId` está **MUERTO** (0% 2026). El vivo es a nivel componente.
- Unión: `dr.v_ServiceId = sc.v_ServiceId AND dr.v_ComponentId = sc.v_ComponentId`, **acotando `sc.d_InsertDate`
  por el rango** (índice date-first). Nombre: `systemuser.i_SystemUserId → v_PersonId → person`.
- NO usar `dr.i_InsertUserId` (incluye cuentas genéricas: 'TRIAJE', digitadoras). El 35% sin médico → rótulo
  "(sin médico asignado)".

### 1.6 CIE-10 → Capítulos (derivable por rango; NO existe tabla de capítulos)
- Formato real: **sin punto**, MAYÚSCULAS, letra + dígitos. Long 3-4 = 99.86%; long 5 = códigos locales
  'U####' (0.14%). 1 numérico '893'. Anomalías → bucket "OTROS/LOCAL".
- Derivación SQL 2012: `letra = UPPER(LEFT(cie,1))`, `num = TRY_CONVERT(int, SUBSTRING(cie,2,2))` (TRY_CONVERT
  existe en 2012). Ver **tabla de capítulos en §4.1**.

### 1.7 Hospitalización — `dbo.hospitalizacion` (módulo completo)
- `d_FechaIngreso`, `d_FechaAlta`, dx ingreso/salida desnormalizados. Puente `hospitalizacionservice`
  (hosp↔atención) 1:1 en 2026 (750/750). **Col 14 "Fecha de Hospitalización" = `h.d_FechaIngreso` vía LEFT JOIN**
  (NULL si la atención no está hospitalizada). Estancia = `DATEDIFF(DAY, d_FechaIngreso, d_FechaAlta)`.

### 1.8 Grupos etarios MINSA (etapas de vida) — validados con masa en los 5 grupos (2026 H1, atenciones con dx)
Niño 0-11 (1,081) · Adolescente 12-17 (597) · Joven 18-29 (2,334) · Adulto 30-59 (5,862) · Adulto mayor 60+ (2,486).

### 1.9 Series temporales / incidencia — viables (medido en producción)
- Semana ISO `DATEPART(ISO_WEEK, d_ServiceDate)` disponible en 2012. 2024 y 2025 con **52/52 semanas sin huecos**
  → banda del canal endémico viable. Excluir/normalizar semanas partidas de año nuevo (mín 119 en 2024).
- **Incidencia (casos nuevos)** = par DISTINCT (persona, CIE10) del rango + `NOT EXISTS` de ese par antes del
  rango (cualquier fecha histórica). Ene-jun 2026: 17,821 pares → 14,425 nuevos (81%), **~3s** (no explota con
  el rango). Agrupar por `v_CIE10Id` (no `v_DiseasesId`). "Primera vez" = primera en historia registrada (~2018+).

### 1.10 Volumetría, índices y performance (SQL 2012 — reglas duras)
- `service` es HEAP; sus índices lideran por `d_InsertDate`, ninguno por `d_ServiceDate`. Con 315k filas el
  COUNT de 12 meses + join a protocol corre **<0.9s**. **NO se puede crear índice** (dbo solo SELECT).
- ⚠️ **`servicecomponentfields` / `servicecomponentfieldvalues` = 42.7M filas cada una**, índices **date-first**.
  Regla obligatoria: todo join a esa cadena **acotado por `d_InsertDate`** y aplicado **solo a filas ya paginadas**
  (OUTER APPLY post-paginación). Jamás al universo.
- Prototipos ejecutados (scratchpad, temporales): `proto_epi.sql` (ficha), `incidencia2.sql`/`incidencia6m.sql`.

---

## 2. REGLAS INVIOLABLES (todas las fases)
1. **`dbo` y `SigesoftDesarrollo_2`: SOLO SELECT.** Nunca ALTER/DROP/CREATE/INSERT/UPDATE/DELETE ni CREATE INDEX.
   Jamás leer `systemuser.v_Password`.
2. **SQL Server 2012**: sin STRING_AGG (usar `STUFF(... FOR XML PATH(''), TYPE).value('.','nvarchar(max)')`),
   sin `CREATE OR ALTER`, sin `DROP ... IF EXISTS`, sin OPENJSON/STRING_SPLIT/TRIM. `OFFSET/FETCH`,
   `COUNT(*) OVER()`, `DATEPART(ISO_WEEK,...)`, `TRY_CONVERT` SÍ existen. Ver `.claude/memory/reglas-sql2012.md`.
3. **Concatenación y conteos de dx con DISTINCT** (hay pares duplicados).
4. **Filtro de dx por default `i_FinalQualificationId IN (2,3)`**; `@IncluirDescartados=1` agrega 4.
5. **servicecomponent* acotado por `d_InsertDate`** y solo sobre filas ya paginadas.
6. **Rango de fechas medio-abierto**: `s.d_ServiceDate >= @Desde AND s.d_ServiceDate < DATEADD(DAY,1,@Hasta)`.
7. Los SPs de dashboard son **multi-resultset** (el front usa Dapper `QueryMultiple`; NUNCA `INSERT..EXEC`).
8. La BD es producción: **probar → evidenciar → limpiar** (los SPs son de solo lectura; no dejan residuo, pero
   toda prueba se documenta). Los objetos `conta.*` son nuestros (crear/alterar permitido).
9. **Sin despliegue a IIS** sin instrucción explícita del usuario.

---

## 3. ARQUITECTURA OBJETIVO

```
/conta/epidemiologia  (página React)
├── FiltroEpidemiologiaCard  (estado compartido, elevado a la página)
│     desde · hasta · ámbito · [incluirDescartados] · [soloConDx (solo TAB1)]
├── TAB 1  Ficha Individual EPI
│     grid paginada 50  ← GET /api/conta/epidemiologia/ficha
│     export xlsx        ← GET /api/conta/epidemiologia/ficha/export
└── TAB 2  Dashboard Epidemiológico
      KPIs + 12 charts    ← GET /api/conta/epidemiologia/dashboard
      canal endémico      ← GET /api/conta/epidemiologia/canal-endemico  (lazy)

API .NET conta
├── EpidemiologiaController  (Dapper + SPs)
└── EpidemiologiaRepository

BD conta (cross-DB SELECT a SigesoftDesarrollo_2)
├── conta.fn_Epi_DxBase        (iTVF: base per-dx con dimensiones)   ← keystone del dashboard
├── conta.sp_Epidemiologia_FichaIndividual   (TAB 1)
├── conta.sp_Epidemiologia_Dashboard         (TAB 2, multi-RS)
└── conta.sp_Epidemiologia_CanalEndemico     (TAB 2, lazy)
```

---

## 4. CAPA BD — contratos exactos

### 4.1 Tabla de capítulos CIE-10 (embebida en el CASE; el ejecutor la usa idéntica)

Derivación: `L = UPPER(LEFT(cie,1))`, `N = TRY_CONVERT(int, SUBSTRING(cie,2,2))`.

| Cap | Rango | Nombre | Regla |
|---|---|---|---|
| I | A00–B99 | Ciertas enfermedades infecciosas y parasitarias | L in (A,B) |
| II | C00–D48 | Neoplasias | L=C OR (L=D AND N<=48) |
| III | D50–D89 | Enfermedades de la sangre y órganos hematopoyéticos | L=D AND N>=50 |
| IV | E00–E90 | Endocrinas, nutricionales y metabólicas | L=E |
| V | F00–F99 | Trastornos mentales y del comportamiento | L=F |
| VI | G00–G99 | Sistema nervioso | L=G |
| VII | H00–H59 | Ojo y anexos | L=H AND N<=59 |
| VIII | H60–H95 | Oído y apófisis mastoides | L=H AND N>=60 |
| IX | I00–I99 | Sistema circulatorio | L=I |
| X | J00–J99 | Sistema respiratorio | L=J |
| XI | K00–K93 | Sistema digestivo | L=K |
| XII | L00–L99 | Piel y tejido subcutáneo | L=L |
| XIII | M00–M99 | Sistema osteomuscular y tejido conjuntivo | L=M |
| XIV | N00–N99 | Sistema genitourinario | L=N |
| XV | O00–O99 | Embarazo, parto y puerperio | L=O |
| XVI | P00–P96 | Afecciones originadas en periodo perinatal | L=P |
| XVII | Q00–Q99 | Malformaciones congénitas y anomalías cromosómicas | L=Q |
| XVIII | R00–R99 | Síntomas, signos y hallazgos anormales | L=R |
| XIX | S00–T98 | Traumatismos, envenenamientos y causas externas | L in (S,T) |
| XX | V01–Y98 | Causas externas de morbimortalidad | L in (V,W,X,Y) |
| XXI | Z00–Z99 | Factores que influyen en el estado de salud | L=Z |
| XXII | U00–U99 | Códigos para propósitos especiales | L=U |
| — | otros | Código local / no clasificado | resto (numéricos, N nulo) |

### 4.2 `conta.fn_Epi_DxBase(@Desde date, @Hasta date, @Ambito varchar(20), @IncluirDescartados bit)`  — iTVF (keystone)

Inline TVF (una sola SELECT, se inlinea en el plan). Devuelve **una fila por diagnóstico** (granularidad dx),
ya filtrada por rango+ámbito+calificación, con TODAS las dimensiones para el dashboard:

```
v_ServiceId, v_PersonId, d_ServiceDate,
CIE10 (v_CIE10Id), DiseaseName (v_Name),
CapNum (int I..XXII / NULL), CapNombre,
i_Consultorio, ConsultorioNombre (g.403 + fallback ms 19/30),
i_SexTypeId, SexoNombre (M/F), Edad (calculada a la atención), GrupoEtario (etapa de vida MINSA),
i_DepartmentId, i_ProvinceId, i_DistrictId, DistritoNombre (g.113),
i_MasterServiceTypeId (línea de negocio)
```
Predicado base (idéntico en TODOS lados): `s.i_IsDeleted=0` + rango medio-abierto sobre `d_ServiceDate`
+ ámbito (§1.1) + `dr.i_FinalQualificationId IN (2,3)` (o (2,3,4) si `@IncluirDescartados`).
> Nota: los conteos de atención en el dashboard usan `COUNT(DISTINCT v_ServiceId)`; los de dx `COUNT(*)` sobre
> pares DISTINCT (servicio,cie10) según cada RS. La iTVF NO deduplica pares; cada RS decide su grano.

### 4.3 `conta.sp_Epidemiologia_FichaIndividual`  — TAB 1

```
@Desde date, @Hasta date,
@Ambito varchar(20)='TODOS',           -- TODOS|ASISTENCIAL|OCUPACIONAL|HOSPITALIZACION
@Page int=1, @PageSize int=50,
@SoloConDiagnostico bit=0,             -- 1 = solo atenciones con dx (2,3)
@IncluirDescartados bit=0,
@Red varchar(100)='Diresa Cajamarca'   -- constante parametrizable (col 6)
```
**Grano = atención** (una fila por `v_ServiceId`), incluye atenciones sin dx si `@SoloConDiagnostico=0`.
Patrón obligatorio (validado en `proto_epi.sql`): **paginar primero solo las claves**
(`ORDER BY s.d_ServiceDate, s.v_ServiceId OFFSET (@Page-1)*@PageSize ROWS FETCH NEXT @PageSize ROWS ONLY`)
con `COUNT(*) OVER() AS TotalFilas`, y **recién después enriquecer** (person, ubigeo, dx concatenado, tiempo de
enfermedad por OUTER APPLY acotado). **Un solo resultset** con las 25 columnas + `TotalFilas`.

**Mapeo columna Excel → fuente** (ver §7.1). Diagnóstico (col 23):
`STUFF((SELECT ' | ' + d.v_Name + ' (' + d.v_CIE10Id + ')' FROM (SELECT DISTINCT ...) ... FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 3, '')`.

**Export**: el mismo SP con `@PageSize` grande (cap ~100,000) y `@Page=1`. El endpoint `/ficha/export` fuerza
ese modo. (Si el volumen del rango excede el cap, el API responde 413 con mensaje "acota el rango".)

### 4.4 `conta.sp_Epidemiologia_Dashboard`  — TAB 2 (multi-resultset)

```
@Desde date, @Hasta date, @Ambito varchar(20)='TODOS', @IncluirDescartados bit=0, @TopN int=20
```
Materializa la base una vez (`SELECT ... INTO #base FROM conta.fn_Epi_DxBase(...)`) y de ahí saca los
resultsets (evita reevaluar la iTVF 10 veces). Orden y forma EXACTOS (el front los lee por posición):

| RS | Nombre | Columnas | Grano / nota |
|---|---|---|---|
| RS0 | KPIs | TotalAtenciones, AtencionesConDx, PacientesUnicos, TotalDx, CasosNuevos, CasosRecurrentes, PctConDx, ConsultoriosActivos | 1 fila. TotalAtenciones = universo del rango+ámbito (incluye sin dx, query aparte); el resto sobre #base |
| RS1 | Incidencia por consultorio | ConsultorioNombre, NumDx, NumAtenciones, NumPacientes | `COUNT(DISTINCT ...)`, orden NumDx desc |
| RS2 | Top-N morbilidad | CIE10, DiseaseName, NumDx, NumPacientes, PctDelTotal | top @TopN por NumDx (pares distinct) |
| RS3 | Capítulos CIE-10 | CapNum, CapNombre, NumDx, NumPacientes | los 22 + otros |
| RS4 | Pirámide sexo×etapa | GrupoEtario, SexoNombre, NumPacientes | 5 etapas × 2 sexos |
| RS5 | Morbilidad por sexo | CIE10, DiseaseName, NumMasculino, NumFemenino, Total | top @TopN por Total |
| RS6 | Heatmap consultorio×capítulo | ConsultorioNombre, CapNum, CapNombre, NumDx | matriz (top consultorios × 22 cap) |
| RS7 | Tendencia semanal | AnioISO, SemanaISO, FechaInicioSemana, NumDx, NumAtenciones, NumCasosNuevos | serie del rango |
| RS8 | Top médicos | MedicoNombre, NumDx, NumPacientes | vía servicecomponent acotado; 35% → "(sin médico asignado)" |
| RS9 | Comorbilidad (pares) | Cie10A, NombreA, Cie10B, NombreB, NumAtenciones | self-join pares distinct; recomendado con ámbito asistencial |
| RS10 | Geografía | DistritoNombre, ProvinciaNombre, NumPacientes, NumDx | top distritos |

> Presupuesto medido: cada bloque subsegundo–3s; total estimado <8s. Si la latencia molesta, **RS con incidencia
> (RS0 CasosNuevos y RS7 NumCasosNuevos) se pueden mover a un endpoint propio** (documentado como opción B en §11).

### 4.5 `conta.sp_Epidemiologia_CanalEndemico`  — TAB 2 (lazy, se pide al abrir el chart)

```
@Anio int, @HastaSemana int=NULL, @Ambito varchar(20)='TODOS',
@Capitulo int=NULL, @Cie10 varchar(10)=NULL   -- filtro opcional: todo / un capítulo / un código
```
Construye la **banda histórica de los 2 años previos** por semana ISO (método mediana+cuartiles): para cada
semana ISO 1..53 calcula sobre los años `@Anio-1` y `@Anio-2` los casos/semana y de ahí **Q1, Mediana, Q3**;
overlay de la serie del `@Anio` actual. Zonas (clasificación estándar): `<Q1` éxito · `Q1–Mediana` seguridad ·
`Mediana–Q3` alarma · `>Q3` epidemia.
**RS**: `SemanaISO, Q1, Mediana, Q3, CasosActual, Zona`. (Excluir/normalizar semanas partidas de año nuevo.)

---

## 5. CATÁLOGO DE CHARTS — TAB 2 (dashboard potente y profesional)

Cada chart indica su RS, la pregunta epidemiológica que responde y el tipo de visualización. Todos respetan el
filtro compartido (fecha + ámbito). Diseño visual: paleta del proyecto (primario `#1E3A8A`, secundario
`#DC2626`), dark-mode aware, cards con título + subtítulo, loading skeletons, "sin datos" elegante.

**Fila KPIs (RS0)** — 6 tarjetas: Atenciones · Atenciones con dx (+%) · Pacientes únicos · Diagnósticos ·
Casos nuevos (incidencia) · Consultorios activos.

| # | Chart | RS | Viz | Pregunta |
|---|---|---|---|---|
| 1 | **Incidencia diagnóstica por consultorio** (pedido nº1 del usuario) | RS1 | Barras horizontales (top 15) | ¿Qué consultorios concentran la carga diagnóstica? |
| 2 | **Top 20 diagnósticos (morbilidad)** | RS2 | Barras horizontales | ¿Cuáles son las patologías más frecuentes? |
| 3 | **Distribución por capítulo CIE-10** | RS3 | Treemap (o donut) | ¿Cómo se reparte la morbilidad por gran grupo? |
| 4 | **Pirámide poblacional (sexo × etapa de vida)** | RS4 | Pirámide (barras divergentes M/F) | ¿Cómo es la estructura demográfica de los casos? |
| 5 | **Morbilidad diferencial por sexo** | RS5 | Barras divergentes (M izq / F der) | ¿Qué patologías difieren por sexo? |
| 6 | **Heatmap consultorio × capítulo** | RS6 | Heatmap (grid de intensidad) | ¿Qué grupos de patología atiende cada consultorio? |
| 7 | **Tendencia semanal de casos** | RS7 | Línea/área (dx, atenciones, nuevos) | ¿Cómo evoluciona la demanda en el tiempo? |
| 8 | **Canal endémico** | sp CanalEndemico | Líneas + bandas (4 zonas) | ¿El nivel actual está en zona de éxito/seguridad/alarma/epidemia? |
| 9 | **Casos nuevos vs recurrentes** | RS0/RS7 | Donut + mini-línea | ¿Cuánta es incidencia real vs prevalencia/recurrencia? |
| 10 | **Top médicos por diagnóstico** | RS8 | Barras horizontales | ¿Cómo se distribuye la actividad diagnóstica por médico? |
| 11 | **Comorbilidad (pares de dx)** | RS9 | Barras de pares (o chord simple) | ¿Qué diagnósticos co-ocurren? |
| 12 | **Distribución geográfica** | RS10 | Barras (top distritos) | ¿De dónde proceden los casos? |

> Layout sugerido: KPIs arriba; luego grid responsivo (2 col en desktop) priorizando 1→2→3→4; charts pesados
> (8 canal endémico, 6 heatmap) a ancho completo. Cada card con su propio estado de carga (el dashboard llega en
> un solo fetch; el canal endémico se pide aparte al hacer scroll/expandir).

---

## 6. CAPA API (.NET conta)

Nuevo `EpidemiologiaController` + `EpidemiologiaRepository` (Dapper). DTOs en `Models/Dtos.cs`.

| Método | Ruta | Auth | Notas |
|---|---|---|---|
| GET | `/api/conta/epidemiologia/ficha` | `[Authorize]` | query: desde,hasta,ambito,page,pageSize,soloConDx,incluirDescartados,red → `{ items:[25col], totalFilas, page, pageSize }` |
| GET | `/api/conta/epidemiologia/ficha/export` | `[Authorize]` | mismos filtros, sin page; devuelve todas las filas (cap 100k) para el xlsx. 413 si excede |
| GET | `/api/conta/epidemiologia/dashboard` | `[Authorize]` | query: desde,hasta,ambito,incluirDescartados,topN → objeto con kpis + 10 arrays (Dapper `QueryMultiple`) |
| GET | `/api/conta/epidemiologia/canal-endemico` | `[Authorize]` | query: anio,hastaSemana,ambito,capitulo?,cie10? → array de semanas |

- Validación: `desde<=hasta`, rango máximo (p.ej. 366 días) para proteger el export; ámbito ∈ conjunto válido.
- `System.Data.SqlClient`, `CommandType.StoredProcedure`, `commandTimeout` 60s (dashboard) / 120s (export).
- Reutilizar el patrón de otros repos conta (DTOs PascalCase, no camelCase).

---

## 7. CAPA FRONT (react-project)

### 7.1 Mapeo de las 25 columnas (TAB 1)
| # | Columna Excel | Fuente |
|---|---|---|
| 1 | Código Único | `service.v_ServiceId` |
| 2 | Fecha de Atención | `d_ServiceDate` (dd/MM/yyyy) |
| 3-5 | Ap. Paterno / Materno / Nombres | `person.v_FirstLastName / v_SecondLastName / v_FirstName` |
| 6 | RED | `@Red` ('Diresa Cajamarca') |
| 7 | Tipo Documento | `i_DocTypeId` → g.106 ('DNI'…) |
| 8 | Numero Documento | `person.v_DocNumber` |
| 9 | Fecha de Nacimiento | `person.d_Birthdate` |
| 10 | Sexo | `i_SexTypeId` → g.100 (M/F) |
| 11 | Nacionalidad | `person.v_Nacionalidad` (texto libre) |
| 12 | Etnia | `i_EtniaRaza` → g.401 |
| 13 | N° Historia Clínica | `person.v_DocNumber` |
| 14 | Fecha de Hospitalización | `hospitalizacion.d_FechaIngreso` (LEFT vía puente) |
| 15 | Edad | calculada a fecha de atención |
| 16 | País | 'PERU' |
| 17-19 | Dpto/Prov/Distrito | `i_DepartmentId/ProvinceId/DistrictId` → g.113 |
| 20 | Procedencia | `person.v_BirthPlace` (proxy — decisión usuario) |
| 21 | Dirección exacta | `person.v_AdressLocation` |
| 22 | Referencia | vacío (no existe) |
| 23 | Diagnostico | `v_Name (v_CIE10Id)` concatenado ' | ' DISTINCT, calificación (2,3) |
| 24 | Inicio de sintomas | texto 'TIEMPO DE ENFERMEDAD' (EMR, OUTER APPLY acotado; ~20%) |
| 25 | Inicio de sintomas (dup) | vacío |

### 7.2 Componentes
- **Ruta/menu**: agregar a `ContaLayout.tsx` navItems `{ to:'/conta/epidemiologia', label:'Epidemiología', icon: Activity }`
  (importar `Activity` de lucide-react). Registrar la ruta en el router del conta.
- **`Epidemiologia.tsx`** (página): tabs (patrón de tabs ya usado en el proyecto o `useState` simple) + el
  `FiltroEpidemiologiaCard` compartido con estado elevado.
- **`FiltroEpidemiologiaCard.tsx`**: desde, hasta (default: mes actual), ámbito (select), check incluirDescartados;
  el check "Solo con diagnóstico" se muestra solo en TAB 1.
- **TAB 1 `FichaIndividualTab.tsx`**: grid paginada (reusar el componente de grid/paginador existente del conta),
  botón "Exportar a Excel" (usar la MISMA librería xlsx que ya usa el front — verificar en `package.json`;
  probablemente `xlsx`/SheetJS; si no hay, el ejecutor propone una y lo confirma con el orquestador).
- **TAB 2 `DashboardEpidemiologicoTab.tsx`**: KPIs + 12 charts. **Librería de charts**: usar la que ya exista en
  `package.json` (verificar: recharts / chart.js / nivo). Si no hay ninguna, **recharts** (composable, cubre
  barras/línea/área/treemap/pie; pirámide = barras divergentes; heatmap = grid propio; canal endémico = ComposedChart
  Area+Line). El ejecutor confirma la elección con el orquestador antes de instalar.
- **Servicios**: extender `ContabilidadService.ts` con `epiFicha`, `epiFichaExport`, `epiDashboard`,
  `epiCanalEndemico`; tipos en `contaTypes.ts`.

---

## 8. FASES Y GATEs

### FASE 0 — Preparación (orquestador)
- Confirmar decisiones A/B/C (o aceptar defaults). GATE-0: defaults confirmados o ajustados.

### FASE 1 — BD (`db-experto`)
1. Crear `conta.fn_Epi_DxBase` (iTVF). **GATE-1.1**: devuelve filas coherentes para jun-2026 asistencial
   (spot-check vs los conteos de §1: MEDICINA INTERNA 551 dx, etc.).
2. Crear `conta.sp_Epidemiologia_FichaIndividual`. **GATE-1.2**: página 1 (50 filas) de jun-2026 con las 25
   columnas + TotalFilas correcto; diagnósticos concatenados con ' | ' y DISTINCT; una atención hospitalizada
   muestra Fecha de Hospitalización, una no-hospitalizada la muestra NULL. Verificar contra `FICHA INDIVIDUAL EPI.xlsx`.
3. Crear `conta.sp_Epidemiologia_Dashboard`. **GATE-1.3**: los 11 resultsets (RS0..RS10) salen con datos y en
   <8s; RS1 top consultorio = OCUPACIONAL/MEDICINA INTERNA/… (cuadra con §1.4); RS4 pirámide con los 5 grupos;
   RS0 CasosNuevos ≈ 74% en jun-2026 (cuadra con §1.9).
4. Crear `conta.sp_Epidemiologia_CanalEndemico`. **GATE-1.4**: para @Anio=2026, @Ambito=ASISTENCIAL devuelve
   semanas con Q1/Mediana/Q3 de 2024-2025 y CasosActual de 2026, Zona clasificada.
> Todos con `SET NOCOUNT ON`, sin residuo (solo lectura sobre legacy). Versionar en
> `models-DB/script-conta/{fn,sp}/1x_epidemiologia_*.sql`.

### FASE 2 — API (`backend-api`)
- `EpidemiologiaController` + `EpidemiologiaRepository` + DTOs + registro DI. **GATE-2**: build OK; los 4
  endpoints responden 200 con datos reales (probar con token SA); export respeta el cap; dashboard mapea los 11 RS.

### FASE 3 — Front (`bi-frontend`)
- Menu + ruta + página con tabs + filtro compartido + TAB 1 (grid+export) + TAB 2 (KPIs+charts). **GATE-3**:
  `npm run build` (Vite/TS) sin errores; el grid pagina y exporta; el dashboard renderiza los 12 charts con datos.

### FASE 4 — Integración y verificación visual (orquestador + usuario)
- Levantar stack, revisar TAB 1 contra el Excel y TAB 2 chart por chart. **GATE-4**: visto bueno del usuario.
- Commits temáticos `feat(conta): módulo epidemiología …` + (si el usuario lo pide) cierre `continual-learning`.

---

## 9. PROTOCOLOS DE PRUEBA (evidencia)
- **T-1 (ficha vs Excel)**: exportar jun-2026 asistencial y comparar 5 filas contra el layout de las 25 columnas.
- **T-2 (dx concatenado)**: la atención `N009-SR000794303` debe mostrar `DOLOR PRECORDIAL (R072) | DOLOR DE PECHO (R522)`
  sin duplicados.
- **T-3 (ámbito)**: contar atenciones jun-2026 por ámbito y cuadrar con §1.1 (ocupacional 564, etc.).
- **T-4 (descartados)**: con `@IncluirDescartados=0` vs `=1`, el # de dx ocupacionales sube ~29k/semestre (cuadra §1.2).
- **T-5 (consultorio)**: RS1 jun-2026 cuadra con la distribución de §1.4.
- **T-6 (incidencia)**: RS0 CasosNuevos/AtencionesConDx ≈ 74% jun-2026 (cuadra §1.9).
- **T-7 (canal endémico)**: una semana claramente alta de 2026 cae en zona alarma/epidemia; una baja en éxito/seguridad.
- **T-8 (performance)**: dashboard <8s, ficha pág 50 <3s, export 1 mes <10s (medir wall-clock).

## 10. ROLLBACK / LIMPIEZA
- Los SPs son de solo lectura sobre legacy → no dejan residuo en `dbo`/`SigesoftDesarrollo_2`.
- Objetos `conta.*` nuevos: si hay que revertir, `DROP` de los 4 objetos conta (son nuestros). Sin RESEED (no hay
  tablas de datos nuevas). El front/endpoints se revierten por git.

## 11. RIESGOS Y DECISIONES
- **R1 — Latencia del dashboard**: si >8s molesta, **Opción B**: separar incidencia (RS0.CasosNuevos, RS7.NumCasosNuevos)
  a `GET /epidemiologia/incidencia` lazy, y dejar el dashboard core <5s.
- **R2 — Datos de baja confianza**: nacionalidad (typos), etnia ('Mestizo' default masivo), procedencia (proxy
  birthplace). Mostrar tal cual en la ficha; en el dashboard NO se usan para cortes salvo etnia opcional.
- **R3 — Médico 65% cobertura**: rotular "(sin médico asignado)" el 35%; no inflar rankings.
- **R4 — Comorbilidad sesgada por EMO**: RS9 recomendado con ámbito asistencial; documentar la limitación en el chart.
- **R5 — servicecomponent 42.7M**: cualquier join (médico, tiempo de enfermedad) SIEMPRE acotado por `d_InsertDate`
  y post-paginación. Si un GATE muestra lentitud, revisar que el acote esté activo.
- **Decisiones pendientes**: A (MTC→asistencial, default sí), B (visibilidad, default todos), C (inicio síntomas,
  default texto libre + col 25 vacía).

## 12. CHECKLIST DEL EJECUTOR
- [ ] FASE 1: fn_Epi_DxBase + 3 SPs creados y con GATE-1.x verde (versionados).
- [ ] FASE 2: controller/repo/DTOs; 4 endpoints 200 con datos reales; GATE-2 verde.
- [ ] FASE 3: menu+ruta+página+tabs+filtro+grid+export+12 charts; `npm run build` OK; GATE-3 verde.
- [ ] FASE 4: verificación visual con el usuario; commits `feat(conta): …`.
- [ ] Reglas SQL 2012 y "dbo solo lectura" respetadas en todo momento.

---

## APÉNDICE — Artefactos de referencia
- Plantilla objetivo TAB 1: `D:\Download\FICHA INDIVIDUAL EPI.xlsx` (25 columnas, fila 2 = cabeceras).
- Prototipos de investigación (scratchpad, temporales): `proto_epi.sql`, `incidencia2.sql`, `incidencia6m.sql`.
- Memorias a actualizar al cierre (reglas nuevas descubiertas — para `continual-learning`):
  consultorio=`protocol.i_Consultorio`→g.403; médico=`servicecomponent.i_MedicoTratanteId`; HC=`person.v_DocNumber`;
  dx EMO descartado auto (calif 4/auto 1) se excluye; jerarquía servicios g.119 auto-referente (padres 1/9/11/34/42);
  dominio clínico en `SigesoftDesarrollo_2`; CIE10 sin punto → capítulos por rango; catálogos g.100/401/125/138/136
  (systemparameter) y g.106/113/403 (datahierarchy).
```

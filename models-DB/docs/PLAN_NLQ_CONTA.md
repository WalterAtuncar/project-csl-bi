# PLAN — Consulta a BD en lenguaje natural (NL2SQL) para el BI conta

> **Documento de implementación para ejecutor IA (Opus).** Autocontenido: decisiones del análisis
> previo, arquitectura objetivo, contratos exactos (BD → API → front), fases con GATEs verificables,
> rollback y reglas duras. Si algo contradice lo que ves en el código/BD vivo, **DETENTE y repórtalo
> al orquestador** — no improvises. Planificado: **2026-07-28** por Fable 5 (planificador).
> Ejecutor: **Opus** (protocolo Planificador/Ejecutor). Basado en el análisis profundo del módulo
> legacy `pages/ConsultasBI` (huérfano, no montado) y su reemplazo desde cero sobre el stack conta.
>
> ⚠️ **TRES PECADOS DEL LEGACY QUE ESTE PLAN NO REPITE (invariantes de diseño):**
> 1. **La API key de Anthropic JAMÁS toca el navegador.** Toda llamada a Claude vive en el API conta
>    (5090); la key va en `appsettings.Local.json` (GITIGNORADO). Cero `dangerouslyAllowBrowser`,
>    cero `CryptoService` de utilería, cero fallback de key en el fuente.
> 2. **El SQL generado por la IA NUNCA se ejecuta sin barrera.** Corre bajo un login SQL de MÍNIMO
>    PRIVILEGIO (`db_datareader`-only, DENY de escritura) y pasa por un VALIDADOR (SELECT-only, un
>    solo statement, sin DML/DDL/EXEC, TOP forzado, timeout). Doble defensa, capa app + capa BD.
> 3. **Las cifras financieras salen CORRECTAS por diseño.** La IA NO escribe SQL crudo sobre `dbo`
>    para dominios con reglas de negocio: compone sobre **vistas curadas `conta.v_nlq_*`** que ya
>    traen los filtros sagrados adentro. "Ojalá aplique los filtros" → "los filtros están garantizados".

---

## 0. Resumen y decisiones (del análisis — cerrar con el PO en F0)

Se construye un módulo NUEVO de consulta a BD en lenguaje natural, montado en el stack conta
(API .NET 6 en 5090 + React `/conta/*`), que reemplaza conceptualmente al legacy huérfano
`react-project/src/pages/ConsultasBI` (que **NO se toca ni se remonta**; queda como está, muerto).

Flujo objetivo: pregunta en español → cache (0 tokens si aplica) → retrieval de tablas del catálogo
curado → síntesis (solo las tablas relevantes + reglas) enviada a Claude → SQL → **validación** →
ejecución **read-only** → datos → chart → opción de **guardar** la consulta (nombre + descripción +
tipo de chart) para re-consultarla sin gastar tokens.

| # | Decisión | Valor (recomendación del planificador) | Estado |
|---|---|---|---|
| D1 | Dónde vive la orquestación IA | **100% en el API conta (5090)**, C#/.NET. Key en `appsettings.Local.json` (config `Nlq:AnthropicApiKey`, la coloca el PO). | Cerrada |
| D2 | Modelo de generación de SQL | **`claude-opus-4-8`** (importa la corrección y el dialecto SQL Server 2012). | Cerrada |
| D3 | "SLM"/tarea determinista (selección de tablas) | **`claude-haiku-4-5`** sobre el catálogo curado (nombres + 1 línea). Embeddings = v2. **NO** SLM en el navegador. | Cerrada |
| D4 | Ejecución del SQL generado | **Login `conta_nlq_reader`** (`db_datareader`-only) + validador. NUNCA `sa`. **El orquestador PREPARA el script; el PO lo APLICA** al servidor (F3). | **CERRADA (PO, 2026-07-28)** |
| D5 | Dónde viven descripciones/flags del catálogo | **Tablas `conta.nlq_*` + artefacto `.json` generado y versionado en git.** NO extended properties sobre `dbo`. | **CERRADA (PO, 2026-07-28)** |
| D6 | Alcance semántico v1 | **Ventas + Caja + Rentabilidad** (los tres dominios financieros). Clínico/exploratorio = v2. | **CERRADA (PO, 2026-07-28)** |
| D7 | Cache semántico v1 | **Normalización de plantilla** (lowercase, sin tildes, extracción de parámetros → clave). Embeddings vectoriales = v2. | Cerrada |
| D8 | Guardar consulta | Guarda **SQL + config chart + nombre + descripción + params + fingerprint de esquema**. Re-run = 0 tokens. | Cerrada |
| D9 | Rol de acceso | Nuevo permiso lector; **SA + CONTABILIDAD** ven/consultan; **guardar/borrar catálogo** = SA. GERENTE lector. | Cerrada |
| D10 | Feature flag | `Nlq:Enabled=false` por defecto (repo). Se prende por `appsettings.Local.json`/servidor. | Cerrada |

**Fuera de alcance v1:** embeddings/vector store; consultas de ESCRITURA (jamás); scheduling de reportes;
multi-idioma; dominio clínico/`SigesoftDesarrollo_2` exploratorio (solo se incluye lo mínimo si D6 lo pide);
SLM local offline; remontar o portar el legacy `ConsultasBI`.

---

## 1. Arquitectura objetivo (referencia del ejecutor)

### 1.1 Pipeline (todo server-side, en el API conta 5090)

```
Front /conta/consultas (ContaAuthProvider, ProtectedRoute, conta_token, recharts)
   │  POST /api/conta/nlq/preguntar { pregunta }
   ▼
NlqController → NlqService.PreguntarAsync
   │
   ├─ TIER 0  Cache
   │    ├─ ¿consulta GUARDADA que matchea? → devuelve su SQL (0 tokens)
   │    └─ cache semántico (plantilla normalizada) → SQL previo (0 tokens)
   │
   ├─ TIER 1  Retrieval (determinista, barato)  — NlqRetriever
   │    Haiku recibe {catálogo: nombre+descr de tablas/vistas ACTIVAS} + pregunta
   │    → devuelve { tablasRelevantes[], intencion, entidades{fechas,unidades,...} }
   │
   ├─ TIER 2  Generación SQL (el grueso)  — NlqGenerator
   │    prompt system = "experto SQL Server 2012 + reglas duras"
   │    prompt user   = SÍNTESIS del catálogo (SOLO tablas/vistas relevantes: DDL + descr +
   │                    join hints + reglas de negocio) + pregunta
   │    modelo = claude-opus-4-8, structured output { sql, tablasUsadas[], confianza, chartSugerido }
   │    prompt caching sobre el prefijo de esquema estable
   │
   ├─ TIER 3  Validación + Ejecución BLINDADA  — NlqValidator + NlqExecutor
   │    validador: SELECT-only, 1 statement, sin DML/DDL/EXEC/;, TOP forzado, allowlist de objetos
   │    ejecutor: conexión `conta_nlq_reader` (db_datareader-only), command timeout, cap de filas
   │    auto-corrección: si falla, re-inyecta el error a Opus (máx 2 reintentos), luego error limpio
   │    cache de resultado por (hash SQL + as-of); mes cerrado = eterno, abierto = TTL corto
   │
   └─ LOG  NlqLogger → conta.nlq_log (pregunta, sql, tokens, ms, filas, cacheHit, usuario, error)
   ▼
{ sql, columnas[], filas[][], chartSugerido, confianza, fuente, tokens }  → front → chart / guardar
```

### 1.2 Ubicación en el stack (archivos REALES, patrones a seguir)

- **API .NET 6** `SanLorenzoMicroservices/SanLorenzo.Contabilidad.Services/`:
  - `Controllers/NlqController.cs` (nuevo) — patrón de `EgresosController.cs`, `[Authorize(Roles=...)]`.
  - `Repositories/NlqRepository.cs` (nuevo) — Dapper + SPs, patrón de `EgresoRepository.cs`, usa `Infrastructure/Db.cs`.
  - `Infrastructure/` (nuevos): `AnthropicClient.cs` (cliente Claude), `NlqOptions.cs` (config/flag),
    `NlqReaderDb.cs` (conexión de SOLO LECTURA separada del `Db.cs` normal).
  - `Infrastructure/Nlq/` (nueva subcarpeta — el proyecto NO tiene carpeta `Services/`; se respeta el
    layering actual Controllers/Repositories/Infrastructure): `NlqService.cs`, `NlqRetriever.cs`,
    `NlqGenerator.cs`, `NlqValidator.cs`, `NlqExecutor.cs`, `NlqCache.cs`, `NlqPrompt.cs`,
    `NlqGuard.cs` (throttle/presupuesto — §4.7). Registrar en DI con lifetime `Scoped` (patrón de los
    repos existentes).
  - `Models/Dtos.cs` (extender) — DTOs NLQ (§3.3).
  - `appsettings.json` (placeholders + `Nlq:Enabled=false`) / `appsettings.Local.json` (secretos: key
    Anthropic + connstring `conta_nlq_reader`) — mismo patrón que `ConnectionStrings:conta` y `Jwt:Key`.
  - `Program.cs`/`Startup` — registrar servicios NLQ + `HttpClient` de Anthropic + hosted nada nuevo.
- **BD SQL 2012** `models-DB/script-conta/`:
  - `ddl/19_nlq_catalogo.sql` — tablas de catálogo + guardadas + cache + log (§2.1).
  - `ddl/20_nlq_semantic_views.sql` — vistas curadas `conta.v_nlq_*` (§2.2).
  - `sp/21_nlq.sql` — SPs de catálogo/guardadas/cache/log (§2.3).
  - Login `conta_nlq_reader` (script server-level aparte, aplicado con OK del PO — §2.4).
- **Front React** `react-project/src/`:
  - `pages/Contabilidad/Consultas/` (nueva) — patrón de otras páginas conta; recharts; `money.ts`/`todayLima.ts`.
  - `services/contabilidad/ContabilidadService.ts` (extender) — métodos NLQ; `contaTypes.ts` (extender) — tipos.
  - `App.tsx` — ruta `/conta/consultas` bajo `ProtectedRoute`/`ContaAuthProvider`.
  - ⚠️ **JAMÁS** `BaseApiService`/8183 ni `@anthropic-ai/sdk` en el front. Solo `ContabilidadService`→5090.

---

## 2. Modelo de datos nuevo (schema `conta`, ADITIVO — cero `dbo`)

> Todo lo de abajo es del schema `conta` (nuestro). SQL Server 2012: sin `CREATE OR ALTER`, sin
> `DROP ... IF EXISTS`, sin `STRING_SPLIT`/`TRIM`/`OPENJSON`. Idempotencia con `IF NOT EXISTS
> (SELECT ... FROM sys.objects/sys.columns ...)`. Verificar `modify_date` antes de portar SPs.

### 2.1 `ddl/19_nlq_catalogo.sql` — catálogo + guardadas + cache + log

- **`conta.nlq_tabla`** — universo consultable (el "descartar, no eliminar"):
  `i_IdNlqTabla INT IDENTITY PK`, `v_Base NVARCHAR(64)` (BD: `20505310072`/`SigesoftDesarrollo_2`),
  `v_Schema NVARCHAR(64)`, `v_Objeto NVARCHAR(128)`, `v_TipoObjeto CHAR(1)` (`T`abla/`V`ista),
  `v_Dominio NVARCHAR(40)` (ventas/caja/clinico/...), `b_Activa BIT NOT NULL DEFAULT 0`
  (**allowlist**: solo `b_Activa=1` es visible/ejecutable), `v_Descripcion NVARCHAR(500)`,
  `t_Fecha DATETIME DEFAULT GETDATE()`. Único `(v_Base,v_Schema,v_Objeto)`.
- **`conta.nlq_columna`** — descripción de props:
  `i_IdNlqColumna INT IDENTITY PK`, `i_IdNlqTabla INT` FK, `v_Columna NVARCHAR(128)`,
  `v_TipoDato NVARCHAR(64)`, `b_EsPk BIT`, `b_EsFk BIT`, `v_FkObjeto NVARCHAR(256) NULL`
  (destino `schema.tabla.columna`), `v_Descripcion NVARCHAR(500)`,
  `b_Sensible BIT DEFAULT 0` (**excluye p.ej. `systemuser.v_Password` — nunca al prompt ni al SELECT**).
  Único `(i_IdNlqTabla,v_Columna)`.
- **`conta.nlq_regla_negocio`** — filtros/reglas por dominio o tabla (los 4 filtros de ventas, CAJA vs
  RENTABILIDAD, exclusión de anuladas, etc.): `i_IdRegla INT IDENTITY PK`, `v_Dominio NVARCHAR(40)`,
  `v_Objeto NVARCHAR(128) NULL`, `v_Regla NVARCHAR(1000)` (texto que se inyecta al prompt),
  `b_Activa BIT DEFAULT 1`, `i_Orden INT`.
- **`conta.nlq_consulta_guardada`** — consultas guardadas por el usuario:
  `i_IdGuardada INT IDENTITY PK`, `v_Nombre NVARCHAR(120)`, `v_Descripcion NVARCHAR(500)`,
  `v_Sql NVARCHAR(MAX)`, `v_ChartTipo NVARCHAR(20)`, `v_ChartConfig NVARCHAR(MAX) NULL` (JSON),
  `v_Params NVARCHAR(MAX) NULL` (JSON — **contrato §3.5**: el SQL guardado usa parámetros nombrados
  Dapper `@p_*`, JAMÁS interpolación de strings),
  `v_FingerprintEsquema NVARCHAR(64)` (hash del catálogo activo al guardar → detecta drift; cómputo §4.7),
  `i_IdUsuario INT`, `v_Rol NVARCHAR(20)`, `b_Activa BIT DEFAULT 1`, `t_Fecha DATETIME DEFAULT GETDATE()`.
  **Ownership del borrado (por D9):** cada usuario borra SUS propias guardadas (`sp_Nlq_BorrarGuardada`
  valida `i_IdUsuario`); **SA** puede borrar cualquiera. `b_Activa=0` = borrado lógico (nunca DELETE físico).
- **`conta.nlq_cache_semantico`** — plantilla pregunta→SQL:
  `i_IdCacheSem INT IDENTITY PK`, `v_ClaveNorm NVARCHAR(400)` (pregunta normalizada/plantilla),
  `v_Hash CHAR(64)` (SHA-256 de la clave), `v_Sql NVARCHAR(MAX)`, `i_Hits INT DEFAULT 0`,
  `t_Ultima DATETIME`, `t_Fecha DATETIME DEFAULT GETDATE()`. Índice único en `v_Hash`.
- **`conta.nlq_cache_resultado`** — resultado por SQL + as-of:
  `i_IdCacheRes INT IDENTITY PK`, `v_HashSql CHAR(64)`, `v_AsOf NVARCHAR(20)` (p.ej. `2026-06` cerrado
  vs `hoy`), `v_Payload NVARCHAR(MAX)` (JSON columnas+filas), `t_Expira DATETIME NULL`
  (NULL = eterno, v2; v1 = `t_Fecha`+TTL), `t_Fecha DATETIME DEFAULT GETDATE()`. **Índice ÚNICO
  `(v_HashSql,v_AsOf)`** (una fila por llave → upsert limpio; R1 resuelto 2026-07-28).
- **`conta.nlq_log`** — auditoría/observabilidad:
  `i_IdLog BIGINT IDENTITY PK`, `v_Pregunta NVARCHAR(1000)`, `v_Sql NVARCHAR(MAX) NULL`,
  `i_TokensIn INT`, `i_TokensOut INT`, `i_Ms INT`, `i_Filas INT`, `v_Fuente NVARCHAR(20)`
  (`cache_guardada`/`cache_sem`/`generado`), `b_Error BIT`, `v_Error NVARCHAR(1000) NULL`,
  `i_IdUsuario INT`, `t_Fecha DATETIME DEFAULT GETDATE()`.

### 2.2 `ddl/20_nlq_semantic_views.sql` — capa semántica (la mejora #1)

Vistas curadas que YA aplican las reglas de negocio (el ejecutor VERIFICA sus cifras contra un cierre
verificado en el GATE de F2). Arrancar con **ventas + caja** (D6). Nombres sugeridos:
- `conta.v_nlq_ventas` — ventas facturadas **con los 4 filtros sagrados adentro** (i_Eliminado=0 +
  `i_ClienteEsAgente` + exclusión de series `('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')` +
  regla usuario 2036), columnas legibles renombradas (Fecha, Serie, Documento, Cliente, Unidad, Total…).
  **Fuente de verdad de las reglas: `modelo-negocio.md` §filtros de ventas — el ejecutor las porta
  VERIFICADAS, no de memoria.**
- `conta.v_nlq_caja` — tubería CAJA (cobranza/efectivo), separada de rentabilidad, con la unidad
  canónica (`tipocaja`/`tipocaja_clientetipo` 1..6), no bruto de `venta.d_Total`.
- `conta.v_nlq_rentabilidad` — devengado/rentabilidad (neto `d_Valor`, no bruto), con la lógica de
  consultorio/unidad canónica. **Reutilizar los SPs/funciones de rentabilidad existentes** (`sp/05`,
  `sp/10`, `sp/17`, `fn/14 fn_Dashboard_base`) como fuente de verdad — la vista NO re-deriva reglas.
- (v2) dominio clínico/`SigesoftDesarrollo_2` exploratorio, etc.

Cada vista se registra en `conta.nlq_tabla` con `v_TipoObjeto='V'`, `b_Activa=1`, dominio y descripción,
y sus columnas en `conta.nlq_columna`. **Para dominios con vista curada, las tablas `dbo` crudas de ese
dominio quedan `b_Activa=0`** (la IA compone sobre la vista, no sobre la tabla cruda).

> **F2 APLICADO Y VERDE (2026-07-28) — variantes portadas (verificadas, no inventadas):** las 3 vistas
> son porte fiel de funciones ya cuadradas — `v_nlq_ventas`←`fn_Rentabilidad_IngresosDetalleEx`/
> `fn_Dash_VentaBase`; `v_nlq_caja`←`fn_Dash_CobranzaBase` (importe BRUTO cobrado, sin los 4 filtros);
> `v_nlq_rentabilidad`←`fn_Rentabilidad_IngresosEx(@IncluirCredito=1)`+`fn_Rentabilidad_Gastos`
> reconciliadas como `sp_Rentabilidad_PorUnidad`. Decisiones: filtro ventas = **`ISNULL(i_Eliminado,0)=0`**
> (variante cuadrada, no `=0`); nombre de unidad = **`tipocaja.v_NombreTipoCaja`** (no `v_Descripcion`);
> cliente = solo `IdCliente` (join a `dbo.cliente` infla por RUCs duplicados → nombre por OUTER APPLY
> después); rentabilidad incluye crédito y lee el **% SISOL en vivo** (se mueve con el %, igual que la
> superficie fuente). Cuadre jun-2026: ventas 621,180.42 · caja 828,700.50 · rent ingresos 544,527.66 /
> gastos 65,958.20 (al centavo + per-unidad). **Cache de resultado no debe cachear el dominio
> rentabilidad con TTL largo si el % SISOL puede cambiar** (considerar en F5).

### 2.3 `sp/21_nlq.sql` — SPs (Dapper + SP, convención del proyecto)

Idempotentes (DROP/GO/CREATE). El SQL DINÁMICO generado por la IA **no** es un SP — se ejecuta por
Dapper bajo la conexión reader (§4.4). Los SPs son solo para catálogo/guardadas/cache/log:
- `conta.sp_Nlq_CatalogoSintesis(@Objetos NVARCHAR(MAX))` — dado un set de objetos (id o `schema.objeto`),
  devuelve tablas+columnas+reglas ACTIVAS para armar la síntesis del prompt. (Split de lista sin
  `STRING_SPLIT`: tabla temporal / XML / número-tabla — SQL 2012.)
- `conta.sp_Nlq_CatalogoLista()` — nombres+descr de objetos activos (para el retriever/Haiku).
- `conta.sp_Nlq_GuardarConsulta(...)` / `sp_Nlq_ListarGuardadas(@IdUsuario,@Rol)` /
  `sp_Nlq_ObtenerGuardada(@Id)` / `sp_Nlq_BorrarGuardada(@Id,@IdUsuario)`.
- `conta.sp_Nlq_CacheSemGet(@Hash)` / `sp_Nlq_CacheSemPut(...)` (upsert + `i_Hits++`).
- `conta.sp_Nlq_CacheResGet(@HashSql,@AsOf)` / `sp_Nlq_CacheResPut(...)`.
- `conta.sp_Nlq_LogInsert(...)`.
- `conta.sp_Nlq_CatalogoUpsert(...)` — usado por el build/seed de F2 (introspección → catálogo).

### 2.4 Login de mínimo privilegio (server-level — GATE de PO, F3)

Script aparte (no entra al repo con credenciales; el ejecutor lo prepara y **el PO lo aplica/decide**):
`conta_nlq_reader` con `db_datareader` en `20505310072` + `GRANT SELECT` acotado en
`SigesoftDesarrollo_2` (solo lo que el catálogo active), `DENY INSERT/UPDATE/DELETE/EXECUTE` global,
`DENY SELECT ON dbo.systemuser(v_Password)` (columna). La API usa este login **solo** para ejecutar el
SQL generado; el resto de la API sigue con su conexión normal. Connstring en `appsettings.Local.json`:
`ConnectionStrings:conta_nlq_reader`. **Este es el momento correcto para NO usar `sa`** (refuerza el
pendiente de rotación de `sa`).

---

## 3. Contratos exactos (BD → API → front)

### 3.1 Endpoints (todos `/api/conta/nlq/*`, `[Authorize]`, roles por D9)

| Método | Ruta | Rol | Request | Response |
|---|---|---|---|---|
| POST | `/api/conta/nlq/preguntar` | SA, CONTABILIDAD, GERENTE | `{ pregunta }` | `NlqRespuestaDto` |
| POST | `/api/conta/nlq/guardadas` | SA, CONTABILIDAD | `NlqGuardarDto` | `{ id }` |
| GET | `/api/conta/nlq/guardadas` | SA, CONTABILIDAD, GERENTE | — | `NlqGuardadaDto[]` |
| POST | `/api/conta/nlq/guardadas/{id}/ejecutar` | SA, CONTABILIDAD, GERENTE | `{ params? }` | `NlqDatosDto` |
| DELETE | `/api/conta/nlq/guardadas/{id}` | SA, CONTABILIDAD | — | `204` |
| GET | `/api/conta/nlq/catalogo` | SA | — | `NlqCatalogoDto` |
| POST | `/api/conta/nlq/catalogo/rebuild` | SA | — | `{ tablas, columnas }` |

Con `Nlq:Enabled=false` → todos devuelven **404** (o `501 Not Implemented`) — el módulo no existe hacia afuera.

### 3.2 Comportamiento clave por endpoint

- `preguntar`: corre el pipeline §1.1. **Nunca** ejecuta nada que no pase el validador. Si `confianza`
  es baja o el validador rechaza tras 2 auto-correcciones → `NlqRespuestaDto` con `error` legible y `sql`
  a la vista (para diagnóstico), sin filas. Siempre loguea.
- `guardadas/{id}/ejecutar`: toma el `v_Sql` guardado, lo **re-valida** (defensa), aplica `params`,
  ejecuta bajo reader, cachea resultado. **0 tokens.** Si `v_FingerprintEsquema` ≠ actual → advertencia
  "esta consulta puede estar desactualizada" (no bloquea, pero lo marca).

### 3.3 DTOs (en `Models/Dtos.cs`)

- `NlqRespuestaDto`: `Sql string`, `Columnas List<NlqColumnaDto>` (`Nombre`, `Tipo`, `Formato` —
  `money|date|int|pct|text`, para que el front formatee con `money.ts`/`todayLima` **sin adivinar**),
  `Filas List<List<object?>>`, `ChartSugerido string` (`bar|line|pie|scatter|kpi|tabla`),
  `Confianza decimal` (0..1), `Fuente string`, `TokensIn int`, `TokensOut int`, `Error string?`,
  `Advertencia string?` (p.ej. drift de esquema, confianza baja, cap de filas alcanzado).
- `NlqGuardarDto`: `Nombre`, `Descripcion`, `Sql`, `ChartTipo`, `ChartConfig string?`, `Params string?`.
- `NlqGuardadaDto`: `Id`, `Nombre`, `Descripcion`, `ChartTipo`, `Params string?`, `DesactualizadaFlag bool`.
- `NlqDatosDto`: `Columnas`, `Filas`, `ChartTipo`, `ChartConfig`.
- `NlqCatalogoDto`: resumen del catálogo activo (dominios, conteos) para la vista admin.

### 3.4 Tipos TS (en `services/contabilidad/contaTypes.ts`) y servicio

- Espejo 1:1 de los DTOs en **PascalCase** (el JSON de conta es PascalCase — `PropertyNamingPolicy=null`;
  así lo usa todo `contaTypes.ts`). Métodos en `ContabilidadService.ts`:
  `nlqPreguntar(pregunta)`, `nlqGuardar(dto)`, `nlqListarGuardadas()`, `nlqEjecutarGuardada(id, params)`,
  `nlqBorrarGuardada(id)`. Todos vía el cliente conta existente (5090, `conta_token`), no BaseApiService.

### 3.5 Contrato de parámetros de consultas guardadas (seguridad crítica)

`v_Params` es un JSON `[{ nombre, tipo, default, etiqueta }]` (`tipo` ∈ `date|month|int|text|list`).
El `v_Sql` guardado usa **placeholders nombrados** (`@p_fechaIni`, `@p_unidad`, …). Al ejecutar
`guardadas/{id}/ejecutar`, el `params` del request se **bindea con Dapper `DynamicParameters`
(parámetros de SQL Server), JAMÁS por interpolación/concatenación de strings** — esto cierra el vector
de inyección por la ruta de guardadas. Reglas: (a) todo `@p_*` del SQL debe tener param declarado en
`v_Params`; params sin placeholder correspondiente se ignoran; (b) `tipo=list` se bindea como tabla de
valores o `IN (@p...)` expandido por Dapper, nunca concatenado; (c) el SQL con params re-pasa por el
**validador** (§4.4) antes de ejecutar. El cache de resultado (§4.5) llavea por (hash del SQL final +
valores de params).

---

## 4. El pipeline NL2SQL (detalle de implementación .NET)

### 4.1 Cliente Anthropic (`Infrastructure/AnthropicClient.cs`)

- **Verificar primero** compatibilidad del SDK C# oficial (`Anthropic` NuGet) con **net6**. Si es
  compatible → usarlo. Si NO → `HttpClient` directo contra `https://api.anthropic.com/v1/messages`
  (headers `x-api-key`, `anthropic-version: 2023-06-01`, `content-type`), que es trivial y sin deps.
- Key desde `NlqOptions` (bind de `appsettings.Local.json`), **jamás** hardcodeada ni en `appsettings.json`.
- Modelos: `claude-opus-4-8` (generación), `claude-haiku-4-5` (retrieval). Structured outputs
  (`output_config.format` con json_schema) para forzar el shape de salida. `max_tokens` prudente,
  timeout amplio. Prompt caching (`cache_control`) sobre el prefijo estable del prompt de esquema.
- ⚠️ **Al escribir cualquier código Anthropic, cargar la skill `claude-api`** (IDs de modelo, params y
  drift de API — p.ej. `thinking:{type:"adaptive"}`, nada de `budget_tokens`, `output_config.format`).

### 4.2 Retriever (`NlqRetriever.cs`) — Tier 1

- Input: pregunta + `sp_Nlq_CatalogoLista()` (nombres + descr de objetos ACTIVOS).
- Haiku devuelve `{ objetos[], intencion, entidades }`. Si Haiku falla → fallback keyword/BM25 simple
  sobre el catálogo (no bloquea el pipeline). Nunca inventa objetos fuera del catálogo activo.

### 4.3 Generator + Prompt (`NlqGenerator.cs`, `NlqPrompt.cs`) — Tier 2

- `sp_Nlq_CatalogoSintesis(objetos)` → arma el bloque de esquema (DDL legible + descr + join hints +
  reglas de `nlq_regla_negocio`). System prompt = "experto SQL Server 2012" + reglas duras
  (SELECT-only; usar SOLO objetos provistos; para ventas/caja usar las vistas `v_nlq_*`; nada de
  `SELECT *`; TOP N por defecto). Opus 4.8 → structured output `{ sql, tablasUsadas[], confianza,
  chartSugerido }`. `chartSugerido` es una PISTA; el fallback determinista manda (§4.6).

### 4.4 Validator + Executor (`NlqValidator.cs`, `NlqExecutor.cs`, `NlqReaderDb.cs`) — Tier 3

- **Validator (obligatorio, corre SIEMPRE, también en guardadas):**
  1. Un solo statement (rechaza `;` que separe statements; permite `;` final).
  2. Debe empezar por `SELECT`/`WITH` (CTE). Rechaza `INSERT|UPDATE|DELETE|MERGE|DROP|ALTER|CREATE|
     TRUNCATE|EXEC|EXECUTE|GRANT|REVOKE|xp_|sp_` (regex + parseo defensivo).
  3. **Allowlist de objetos:** todo nombre de tabla/vista referenciado debe existir en `nlq_tabla`
     con `b_Activa=1`. Cualquier objeto fuera del allowlist → rechazo.
  4. Fuerza `TOP (@cap)` si no hay TOP (cap configurable, p.ej. 5000) y `SET LOCK_TIMEOUT`.
- **Executor:** ejecuta el SQL validado por Dapper sobre `NlqReaderDb` (**conexión `conta_nlq_reader`,
  read-only**), `CommandTimeout` acotado, cap de filas. Defensa en profundidad: aunque el validador
  fallara, la BD rechaza cualquier mutación por permisos.
- **Auto-corrección:** si el executor lanza error SQL, re-inyecta `{sql, error}` a Opus (máx **2**
  reintentos), re-valida cada intento. Tras el tope → error limpio al usuario + log.

### 4.5 Cache (`NlqCache.cs`) — Tier 0 + resultados

- **Semántico (v1, D7):** normaliza la pregunta (lower, sin tildes, colapsa espacios) y **extrae
  parámetros** (fechas, meses, unidades) a placeholders → clave-plantilla → SHA-256 →
  `sp_Nlq_CacheSemGet/Put`. ⚠️ La plantilla debe separar "ventas de enero" vs "ventas de febrero"
  (mismo SQL parametrizado, distinto param) para NO devolver cifras del mes equivocado.
- **Resultados:** llave = hash del SQL final (+ valores de params). **v1: TTL único configurable**
  (`Nlq:CacheResultadoTtlMin`, p.ej. 60 min) para TODO resultado — simple y sin ambigüedad.
  `sp_Nlq_CacheResGet/Put`.
  > **v2 (optimización, NO v1):** "mes cerrado = cache eterno" (`t_Expira=NULL`). Requiere una señal
  > EXPLÍCITA de periodo cerrado (param `as-of` de la consulta o una tabla `conta` de cierres) —
  > NO intentar deducir el mes parseando el SQL. Marcado como diferido a propósito.

### 4.6 Chart sugerido (determinista, `NlqService`)

Regla por forma del resultado (la pista de Opus es secundaria): 1 col texto + 1..n numérica → `bar`;
col fecha/tiempo + numérica → `line`; 2 numéricas → `scatter`; 1 fila/1 valor → `kpi`; categórica con
proporción → `pie`; si nada aplica → `tabla`.

### 4.7 Seguridad, abuso y robustez (`NlqGuard.cs` + reglas del validador)

- **Postura anti-inyección (regla mental):** la pregunta del usuario es TEXTO NO CONFIABLE. Puede
  contener instrucciones ("ignora tus reglas", "haz DROP…"). **La barrera NO es el LLM** (no se confía en
  que se auto-limite) sino el **validador + el login read-only** (§4.4). La pregunta se usa SOLO como
  contenido del prompt; **jamás** se concatena a SQL. En la auto-corrección se re-inyecta a Opus SOLO el
  texto del error SQL, **nunca filas de datos** (evita fuga de datos por el modelo en los reintentos).
- **Columnas sensibles:** las marcadas `b_Sensible=1` se excluyen de la síntesis del prompt **y** el
  validador rechaza cualquier SQL que las referencie — doble candado con el `DENY` del login sobre
  `v_Password`.
- **Suite adversarial del validador (OBLIGATORIA — tests unitarios, GATE F4):** un set FIJO de cadenas
  que TODAS deben ser rechazadas. Mínimo: statements apilados (`SELECT 1; DROP TABLE x`), DML oculto en
  comentario (`-- `, `/* */`), `SELECT … INTO`, `WITH x AS(…) INSERT/UPDATE`, `EXEC`/`sp_`/`xp_cmdshell`,
  `GRANT`/`REVOKE`, objeto fuera del allowlist, `UNION` que alcance columna `b_Sensible`, `WAITFOR DELAY`
  / `WAITFOR TIME` (DoS), separador de batch `GO`, y trucos de whitespace/unicode alrededor de keywords.
  El validador solo pasa si el statement es un único `SELECT`/`WITH…SELECT` contra objetos del allowlist.
- **Presupuesto y throttle (`NlqGuard`, cultura killswitch del proyecto):** por usuario, `Nlq:MaxPreguntasMin`
  (rate limit) y `Nlq:PresupuestoTokensDia` (tope diario de tokens Opus/Haiku). Excedido → **429** con
  mensaje claro; se loguea. Killswitch global = `Nlq:Enabled=false`. Los contadores salen de `nlq_log`.
- **Cómputo del fingerprint de esquema:** `SHA-256` de la lista **ordenada** de objetos activos
  (`v_Base|v_Schema|v_Objeto`) + sus columnas activas del catálogo. Se recalcula en cada `catalogo/rebuild`;
  al guardar una consulta se congela el valor; al ejecutar guardada se compara → `Advertencia` si difiere.
- **Turnos largos de Opus:** la generación puede tardar (efort alto). El endpoint `preguntar` usa timeout
  HTTP amplio del `HttpClient` de Anthropic y un tope duro (`Nlq:TimeoutGeneracionSeg`); el front muestra
  un estado de carga tolerante (spinner + "generando…") y **no** hace streaming (la key no toca el
  navegador). La ejecución del SQL tiene su propio `CommandTimeout` corto e independiente.

---

## 5. Front `/conta/consultas` (React)

- Página bajo `ProtectedRoute`/`ContaAuthProvider`, gate por rol (D9). Ruta en `App.tsx`.
- Input de pregunta → `nlqPreguntar` → tabla de resultados + chart (**recharts**, ya en package.json;
  NO gráficos hechos a mano) + SQL colapsable (confianza a la vista, construye confianza y caza
  alucinaciones). Botón **Guardar** → diálogo (nombre, descripción, tipo de chart) → `nlqGuardar`.
- Panel lateral de **consultas guardadas** (`nlqListarGuardadas`) → ejecutar (`nlqEjecutarGuardada`,
  0 tokens) / borrar. Marca visual si `desactualizadaFlag`.
- Convenciones obligatorias: fechas "hoy" con `todayLima()` (`utils/fechas.ts`); moneda con
  `utils/money.ts` (`money`/`moneyPEN`/`moneyDash`). Estados de carga/errores mapeando el
  `ValidationProblemDetails`/error del API. **Cero** `@anthropic-ai/sdk`, cero `BaseApiService`/8183.

---

## 6. Fases con GATEs (orden de ejecución — el orquestador verifica cada GATE)

- **F0 — Preparación & sign-off del PO.** Cerrar D4/D5/D6. Verificar en vivo (db-console, SOLO
  metadatos/SELECT) la vigencia del esquema de los dominios v1 (ventas/caja) y los objetos a activar.
  - **GATE F0:** PO aprueba (a) crear el login `conta_nlq_reader`, (b) descripciones en `conta.nlq_*`
    + artefacto git (no extended properties sobre `dbo`), (c) alcance v1 = ventas+caja.
- **F1 — DDL catálogo/guardadas/cache/log** (`ddl/19_nlq_catalogo.sql`, db-experto). Aplicar en prod,
  evidenciar. **GATE F1:** repo==prod (objetos creados), ADITIVO puro en `conta`, **cero DDL sobre `dbo`**.
- **F2 — Vistas semánticas + seed del catálogo** (`ddl/20_nlq_semantic_views.sql` + build/seed vía
  `sp_Nlq_CatalogoUpsert`). **GATE F2 (crítico, delegable a `qa-tester`):** las cifras de
  `conta.v_nlq_ventas` / `v_nlq_caja` / `v_nlq_rentabilidad` **cuadran al centavo** contra un cierre
  verificado (mes cerrado) y contra las superficies existentes (caja/rentabilidad ya cuadradas);
  las tablas `dbo` crudas de esos dominios quedan `b_Activa=0`; `v_Password` marcada `b_Sensible=1`.
- **F3 — Login reader + connstring** (script server-level; **PO aplica**). **GATE F3:** el login puede
  `SELECT` sobre los objetos activos; un `INSERT/UPDATE/DELETE` de prueba **FALLA por permisos**
  (evidenciar el rechazo); `SELECT v_Password` denegado.
- **F4 — API: módulo NLQ core** (Controller + Repository + servicios Nlq* + AnthropicClient + DTOs +
  options/flag + reader-db + `NlqGuard`). **GATE F4:** `dotnet build -c Release` limpio; **la suite
  adversarial §4.7 pasa 100% en verde** (todas las cadenas maliciosas rechazadas); rol-gating probado
  (GERENTE puede preguntar, no puede borrar guardadas → 403); throttle/presupuesto excedido → 429;
  key SOLO en `Local.json` (grep: 0 secretos en el repo); flag OFF → 404.
- **F5 — Guardadas + cache** (endpoints + SPs cache/guardadas + `NlqCache`). **GATE F5:** guardar y
  re-ejecutar una consulta = **0 tokens** (verificar en `nlq_log`); cache semántico de plantilla
  **separa** enero/febrero (no colisiona); re-validación en la ejecución de guardadas.
- **F6 — Front** (`pages/Contabilidad/Consultas` + service + types + ruta). **GATE F6:** `npx vite build`
  OK (tsc puede seguir roto por CobranzaDashboard — conocido; el build de Vite manda); guardas de rol;
  **grep del bundle: 0 `anthropic`, 0 `sk-ant`, 0 8183**; charts con recharts.
- **F7 — Observabilidad + auto-corrección + confianza** (log completo, loop de 2 reintentos, gating de
  confianza). **GATE F7:** una pregunta que produce SQL inválido **auto-corrige o falla limpio** (no
  crashea, loguea); `nlq_log` poblado con tokens/ms/fuente.
- **F8 — QA integración end-to-end + limpieza** (`qa-tester` protocolo P0–P5). **GATE F8:** stack vivo;
  contrato JSON vs API vivo; 3–5 preguntas reales de negocio devuelven cifras que cuadran; **RESEED**
  de cualquier dato de prueba (guardadas/cache/log de prueba borrados; catálogo real intacto).

**Paralelizable:** F4 (API core, contra un catálogo semilla mínimo) y el andamiaje del front F6 pueden
avanzar en paralelo una vez fijados los contratos (§3). F2 (vistas/cuadre) es prerequisito duro de F8.

---

## 7. Reglas duras / límites (aplican a todas las fases)

- **SQL Server 2012** — ver `reglas-sql2012.md` antes de escribir SQL. Portar SPs desde
  `sys.sql_modules` (prod puede adelantar al repo); actualizar el `.sql` tras aplicar.
- **NUNCA** `ALTER/DROP/CREATE INDEX` sobre `dbo`. `SigesoftDesarrollo_2`: SOLO SELECT; **jamás**
  `systemuser.v_Password` (marcada `b_Sensible=1` + `DENY` en el login).
- **Secretos** (key Anthropic + connstring reader) SOLO en `appsettings.Local.json` (GITIGNORADO).
  `appsettings.json` con placeholders + `Nlq:Enabled=false`. **Cero secretos en el fuente/commits.**
- La BD es **producción**: probar → evidenciar → **limpiar + RESEED** (al MAX vivo).
- Front: `vite build` (tsc conocido-roto); `money`/`todayLima` como únicas fuentes; recharts, no hand-rolled.
- **Nada de push/deploy** (IIS/ClickOnce/publish) sin instrucción explícita del usuario. Los commits los
  hace el orquestador al integrar (convención `feat(conta): ...`), no cada agente.
- Proyecto en modo **demo**: números de apertura/históricos los fija el usuario.

---

## 8. Rollback

- `Nlq:Enabled=false` (default del repo) → el módulo no existe hacia afuera (endpoints 404, ruta front
  oculta). Prender = solo en `Local.json`/servidor.
- Todos los objetos nuevos viven en `conta` (drop-safe; script de limpieza en `maintenance/`). El login
  `conta_nlq_reader` es revocable/borrable sin tocar nada más. Cero cambios en `dbo`, cero en el legacy
  `ConsultasBI`, cero en el resto del API/front → revertir = quitar los archivos nuevos + flag off.

---

## 9. Decisiones del PO — GATE F0 CERRADO (2026-07-28)

Las cuatro decisiones quedaron resueltas; el ejecutor NO debe re-preguntarlas:
1. **D4 — Login reader:** SÍ se crea `conta_nlq_reader`. **El orquestador prepara el script;
   el PO lo aplica** al servidor (F3). NUNCA `sa` para ejecutar el SQL generado.
2. **D5 — Descripciones/flags:** catálogo en `conta.nlq_*` + artefacto git. NO extended properties sobre `dbo`.
3. **D6 — Alcance v1:** **Ventas + Caja + Rentabilidad** (tres vistas semánticas). Clínico = v2.
4. **"SLM":** Haiku (v1) para selección de tablas; embeddings = v2. NO SLM en el navegador.

Nota operativa: la API key de Anthropic va en `Nlq:AnthropicApiKey` de `appsettings.Local.json`,
**colocada por el PO** (no se pega en chats ni se commitea).

---

## 10. Referencias

- Análisis del legacy y del rediseño (sesión 2026-07-28): pipeline, 3 pecados, mejora de vistas
  semánticas, modelo de costos.
- `modelo-negocio.md` (§filtros de ventas, CAJA vs RENTABILIDAD, unidades/`tipocaja`) — **fuente de las
  reglas que van a `v_nlq_*` y `nlq_regla_negocio`**; el ejecutor las porta VERIFICADAS.
- `api-conta.md` (endpoints/JWT/roles/secretos), `reglas-sql2012.md`, `frontend-react.md`
  (dos sesiones, ContaAuthProvider, convenciones `money`/`todayLima`), `infra-y-repos.md` (publish/IIS).
- Skill **`claude-api`** — obligatoria antes de escribir cualquier llamada a Claude (IDs de modelo,
  structured outputs, prompt caching, drift de API).
- Corrección de esquema aplicada 2026-07-28: grupo **403 (consultorios) vive en
  `SigesoftDesarrollo_2.dbo.systemparameter`** (48 filas), NO en `datahierarchy` — relevante si el
  catálogo v1/v2 incluye el dominio clínico.

# PLAN — Auditoría y optimización de latencia de los SPs del API BI (`conta.sp_*`)

> **Para el ejecutor (IA):** el usuario reporta LATENCIA en el front. Este plan audita **todos los SPs
> que invoca el API BI** (`SanLorenzo.Contabilidad.Services` — inventario completo en §3, extraído de
> los repositorios el 2026-07-29), mide cada uno, y optimiza **solo los que excedan umbral** ("si ya
> está optimizado, pasa al siguiente" — regla del PO). REGLA DE ORO: **cero cambios de contrato y
> cero cambios de cifras** — toda optimización debe probar equivalencia EXACTA (hash) antes de darse
> por buena. Cadena: **db-experto (F1 baseline → F2 optimización iterativa) → qa-tester (F3) →
> orquestador (F4 commit con OK del usuario)**.

Fecha: 2026-07-29 · Autor: Fable 5 (planificador) · Estado: **LISTO PARA EJECUTAR (espera "go")**

---

## 1. Objetivo y alcance

- **Alcance:** los ~99 SPs `conta.*` invocados por el API BI (§3). NO incluye el legacy 8183 ni
  SAMBHS. Los 3 `conta.tvp_*` son TIPOS de tabla (TVP), no SPs — se excluyen.
- **Objetivo:** cada SP de lectura user-facing dentro de umbral (§4); los que ya lo estén se marcan
  **YA OPTIMIZADO** con su medición como evidencia y se salta al siguiente.
- **Fuera de alcance (registrar en E4, NO aplicar):** cambios de front/API (caching, paralelismo,
  defaults de ventana), re-diseños de página, y cualquier cambio que altere el contrato o la semántica.

## 2. Restricciones duras (violarlas = FAIL)

1. **Equivalencia EXACTA**: tras optimizar un SP, el resultset con los mismos parámetros debe ser
   **idéntico fila a fila y columna a columna** (mismos alias, mismo orden de columnas y de RS).
   Método probado en este proyecto: **hash MD5 sobre fingerprint ordenado** de todas las filas
   (concatenación de columnas con separador, `ORDER BY` estable) — before vs after. El front/API NO
   se tocan.
2. **NUNCA** `CREATE INDEX`/DDL sobre tablas `dbo` ni sobre `SigesoftDesarrollo_2` (hecho de oro #1).
   Índices/estadísticas SOLO sobre objetos del schema `conta` (nuestras tablas: egreso,
   pago_honorario, nlq_*, etc.) si hicieran falta.
3. **SQL Server 2012** — ver `reglas-sql2012.md`.
4. **Hecho de oro #3:** los SPs a veces se cambian directo en la BD. ANTES de editar cada SP,
   comparar `sys.sql_modules` vs el `.sql` del repo (`modify_date`); si difieren, el de PROD manda —
   sincronizar el repo primero, luego optimizar. Tras cada cambio: repo==prod.
5. **iTVFs compartidas** (`fn_Rentabilidad_IngresosEx`/`fn_Rentabilidad_IngresosDetalleEx` — las
   comparten sp/10, sp/17 y la capa general; `fn_Dashboard_base`): tocarlas exige gate de equivalencia
   en **TODOS sus consumidores**, no solo el SP en revisión. Preferir no tocarlas.
6. **Anclas de negocio** que deben seguir exactas tras cualquier cambio (mes jun-2026, crédito ON):
   Rentabilidad `TotalGeneral = 544,527.66` · `SegurosNeto = 3,478.98` · `AsistencialNeto =
   278,397.77` · `SisolParticipacionClinica = 32,851.18`; Especialistas jul: ΣRef 1,029 / ΣEfect 918.
7. Producción: solo lectura sobre datos; los únicos cambios permitidos son DROP/CREATE de SPs `conta`
   (e índices `conta` si aplica). Cero datos de prueba (nada que limpiar).

## 3. Inventario completo (extraído de `Repositories/*.cs` 2026-07-29)

Clases: **[A]** lectura analítica user-facing → **revisión UNA A UNA obligatoria** · **[a]** lectura
liviana (combos/listas chicas) → medir en lote, optimizar solo si >2s · **[B]** escritura/CRUD → no
son la latencia de listas; medir wall-clock 1 vez, revisar solo si >1.5s · **[C]** infra/poller/cache
→ EXCLUIDOS de optimización (no son user-facing).

| Módulo (repo) | SP | Clase | Página front / uso | Baseline conocida |
|---|---|---|---|---|
| **Caja** | sp_Caja_CuadreDia | **A** | /conta/caja (cuadre día, 3 RS) | ? |
| | sp_Caja_Diaria | **A** | /conta/caja (serie del mes) | ? |
| | sp_Caja_FlujoConsolidado | **A** | /conta/flujo-consolidado (multi-RS) | ? |
| | sp_Caja_FlujoDetallado | **A** | /conta/flujo-consolidado (detallado) | ? |
| | sp_Caja_Indicadores | **A** | /conta/caja (cards) | ? |
| | sp_Caja_Ingresos / sp_Caja_Egresos | A† | **sin consumidor front** (dead endpoints) — baseline opcional, NO optimizar | — |
| | sp_Caja_FormasPago · sp_SaldoBanco_List | a | combos/saldos | ? |
| | sp_Caja_CerrarMes · ReabrirMes · SaldoCaja_SetApertura · SaldoBanco_Upsert | B | acciones | — |
| | sp_EgresoCaja_ConsistenciaRemediar | C | hook poller + endpoint manual | — |
| **Dashboard** | sp_Dashboard_Gerencial | **A** | /conta/dashboard (multi-RS) | ? |
| | sp_Dashboard_Contable | **A** | /conta/dashboard | ? |
| | sp_Dashboard_TiposCaja | a | chips unidades | ? |
| **Rentabilidad** | sp_Rentabilidad_General | **A** | /conta/rentabilidad (card grande) | ? |
| | sp_Rentabilidad_PorUnidad | **A** | ídem (sección Por Unidad) | ? |
| | sp_Rentabilidad_Ingresos · _Gastos | **A** | ídem (desgloses) | ? |
| | sp_Rentabilidad_Comparativa | **A** | ídem (serie anual — sospechoso: 12 meses × fn) | ? |
| | sp_Rentabilidad_PorConsultorio | **A** | ídem (3 cards + cuadre) | **2.9–5.3s** ⚠️ |
| | sp_Rentabilidad_OcupacionalPorEmpresa | **A** | ídem (sección Empresas) | ? |
| **Honorarios** | sp_Honorarios_Analisis | **A** | /conta/honorarios (análisis) | **~2.8s** (optimizado 07-19, re-medir) |
| | sp_PagoHonorario_List | **A** | ídem (bandeja pagos, 2 RS) | ? |
| | sp_Honorarios_Consultorios · _Medicos · _BuscarProfesional · sp_PagoHonorario_Get | a | combos/modal | ? |
| | sp_PagoHonorario_Insert · _Anular | B | acciones | — |
| **Especialistas** | sp_Especialistas_Filtros | **A** | /conta/especialistas (combos al montar) | **~7s** 🔴 el peor conocido |
| | sp_Especialistas_Resumen | A✅ | bandeja | 0.6–0.8s (verificado hoy) → skip |
| | sp_Especialistas_Atenciones | A✅ | modal | ~1s → skip |
| | sp_Especialistas_Referencias | A✅ | modal | 0.07–0.23s (fix hoy) → skip |
| **Epidemiología** | sp_Epidemiologia_Dashboard | **A** | /conta/epidemiologia (multi-RS, cross-DB) | ? |
| | sp_Epidemiologia_CanalEndemico | **A** | ídem | ? |
| | sp_Epidemiologia_FichaIndividual | **A** | ídem (búsqueda paciente) | ? |
| **Egresos/Compras** | sp_Egreso_List | **A** | /conta/egresos (bandeja paginada) | ? |
| | sp_Compra_List | **A** | integración compras | ? |
| | sp_Egreso_Get · sp_Compra_GetClasificacion · sp_CostoPersonal_List | a | modal/lista chica | ? |
| | sp_Egreso_Insert · Update · Pagar · Anular · CargaMasiva · sp_Compra_Clasificar · sp_CostoPersonal_Upsert · _Pagar | B | acciones | — |
| **SISOL** | sp_Sisol_List · sp_Sisol_Get | a | catálogos → tab % | ? |
| | sp_Sisol_Calcular · _Pagar | B | acciones | — |
| **NLQ** | sp_Nlq_CatalogoEsqueleto | **A** | corre en CADA consulta NLQ (retriever) | ? (la latencia NLQ la domina Anthropic — medir para separar) |
| | sp_Nlq_CatalogoDetalle | **A** | corre en cada consulta (generador) | ? |
| | sp_Nlq_ListarGuardadas · ObtenerGuardada · CatalogoLista | a | page consultas | ? |
| | sp_Nlq_GuardarConsulta · BorrarGuardada · ActualizarChart · CatalogoUpsert | B | acciones | — |
| | sp_Nlq_CacheSemGet/Put · CacheResGet/Put · LogInsert | C | cache/log interno | — |
| **Auth** | sp_Auth_LoginBiLookup | **A** | login (camino crítico — OJO: la latencia del login suele dominarla la llamada al legacy 8183, medir para separar) | ? |
| | sp_Auth_GetUsuario · LegacyBuscar · Rol_List · sp_Usuario_List · _CountActivos | a | /conta/usuarios | ? |
| | sp_Auth_Vincular · VinculoUpdate · RegistrarLogin · sp_Usuario_Insert/Update/SetPasswordHash | B/C | acciones/log | — |
| **Catálogos** | sp_CentroCosto_List · sp_TipoGasto_List · sp_Entidad_List · sp_Proveedor_List · sp_CuentaBancaria_List · sp_Config_List · sp_SisolParticipacion_List | a | /conta/catalogos + combos de egreso | ? |
| | los Insert/Update de catálogos | B | acciones | — |
| **Reconciliación** | sp_CajaRecon_Tick · _ReconciliarDia | C | poller (no user-facing) | — |

**Conteo clase A obligatoria: ~24 SPs** (3 de Especialistas ya verificados hoy → skip documentado).

## 4. Umbrales (define "ya optimizado" → skip)

| Tipo | Objetivo | Aceptable (skip) | Acción si excede |
|---|---|---|---|
| Lectura interactiva de página (bandejas, cards, cuadres) | ≤1.5s | **≤3s** | optimizar |
| Dashboards / analíticos mensuales (multi-RS) | ≤2s | **≤3s** | optimizar |
| Combos/filtros/listas chicas [a] | ≤1s | **≤2s** | optimizar |
| Export / detalle completo (`tamanio=0`) | — | **≤15s** | optimizar |
| Escrituras [B] | — | **≤1.5s** | revisar |

Medición canónica: **caliente** (2ª corrida) server-side; se anota también la fría. Parámetros
representativos: **jun-2026** (mes cerrado con data), **mar-2026** (mes pico), y para Especialistas
**jul-2026**; `@IncluirCredito=1`; paginaciones por defecto.

## 5. Metodología (F1 → F2, por SP)

### F1 — Inventario exacto + BASELINE (entregable E1, sin tocar nada)
Para CADA SP de clase A y a (los B solo wall-clock si es gratis):
1. **Ficha**: parámetros reales (`sys.parameters`), resultsets que emite (RS × columnas, del propio
   SP + DTO que lo mapea en `Dtos.cs`), página/endpoint consumidor, y `modify_date` vs repo
   (drift sí/no — restricción §2.4).
2. **Baseline**: tiempo frío/caliente server-side (db-console, `SET STATISTICS TIME ON`) con los
   parámetros de §4. Para 3-4 endpoints clave, medir TAMBIÉN el wall-clock del endpoint HTTP (curl
   con JWT) para separar costo SP vs API/serialización.
3. **Triage**: dentro de umbral → **YA OPTIMIZADO (skip)** con la cifra como evidencia. Fuera →
   entra a la cola de F2 **ordenada por (impacto de página × exceso sobre umbral)**.

> Prioridad inicial conocida (confirmar con baseline): 1º `sp_Especialistas_Filtros` (~7s),
> 2º `sp_Rentabilidad_PorConsultorio` (2.9–5.3s), 3º `sp_Rentabilidad_Comparativa` (sospechoso 12×fn),
> 4º `sp_Dashboard_Gerencial/Contable` (página de entrada), 5º `sp_Honorarios_Analisis` (re-medir),
> 6º Epidemiología (cross-DB).

### F2 — Optimización iterativa (solo la cola de F1)
Por cada SP de la cola, en orden:
1. Diagnóstico con **plan real** (`SET STATISTICS IO/TIME` + plan): identificar el operador caro.
2. Aplicar del **catálogo de técnicas probadas en este proyecto** (en este orden de preferencia):
   - **T1 — Cota de fecha en el líder del índice**: las tablas legacy grandes indexan por
     `d_InsertDate` (líder del clustered de `servicecomponent` 2.59M y de los NC de `service`).
     Toda subconsulta/join contra ellas debe acotar `d_InsertDate` (con buffer ±días) además de la
     fecha de negocio. *Precedente: sp_Especialistas_Referencias 26s→0.9s.*
   - **T2 — Eliminar subconsultas correlacionadas** contra tablas grandes (reescribir a JOIN/APPLY
     acotado o pre-materializar en #temp).
   - **T3 — Tokenización con tally table + equi-join** para `v_ComprobantePago` multi-token
     (*precedente: sp_Honorarios_Analisis 2026-07-19*), en lugar de LIKE/parse por fila.
   - **T4 — #temp con PK/índice** cuando alimenta joins grandes (heap sin stats → nested-loop malo);
     pre-agregar por venta ANTES de joins dimensionales.
   - **T5 — Podar trabajo**: columnas no consumidas por el DTO, TOP en diagnósticos, evitar
     re-ejecutar la misma fn/subquery N veces (calcular una vez a variable/#temp).
   - **T6 — Índice en tabla `conta`** (solo nuestras) si el plan lo pide — con DDL versionado en
     `script-conta/ddl/`.
   - **T7 — `OPTION(RECOMPILE)`** SOLO si se demuestra parameter sniffing (probar antes; en este
     proyecto ya se descartó una vez como no-causa).
   - **T8 — Cambios de comportamiento** (reducir ventana default de `sp_Especialistas_Filtros` de
     12 meses, materializar agregados a tabla `conta` + tick del poller): son **decisión de producto**
     → NO aplicar; documentar en E4 con la ganancia estimada y preguntar al PO.
3. **GATEs por SP (obligatorios los 3):**
   - **GE (equivalencia)**: hash MD5 del fingerprint completo before/after con los MISMOS parámetros
     (todos los RS del SP) → **IDÉNTICO**. Si el SP es no-determinista en el orden, fijar `ORDER BY`
     estable SOLO para la comparación (no cambiar el contrato).
   - **GP (perf)**: dentro de umbral §4 (anotar before/after).
   - **GR (repo==prod)**: `.sql` del repo actualizado y aplicado; `sys.sql_modules` == repo.
4. Si una técnica exige tocar una iTVF compartida (§2.5): GE sobre TODOS los consumidores o abortar
   y documentar en E4.

### F3 — qa-tester (verificación integral)
- Re-verificar las **anclas** de §2.6 vía API vivo (el orquestador levanta 5090).
- Para cada SP optimizado en F2: repetir GE de forma independiente (hash propio) + medir el endpoint.
- Spot-check de 3 páginas completas (Dashboard, Rentabilidad, Caja) contra los mismos números de antes.
- Reporte PASS/FAIL por SP con before/after.

### F4 — orquestador
Commit único `perf(conta): optimizacion de SPs del BI (baseline + fixes)` con los `.sql` tocados +
este plan — **solo con OK explícito del usuario**. Cierre de sesión: digest a `continual-learning`
(las técnicas nuevas que surjan van a `reglas-sql2012.md`/skill db-experto).

## 6. Entregables

- **E1** — Tabla-ficha completa (SP · params · emite · consumidor · drift · baseline frío/caliente ·
  veredicto dentro/fuera de umbral). Formato markdown, anexada al reporte de F1.
- **E2** — Por SP optimizado: diff aplicado, técnica(s) usada(s), before/after ms, hash GE, GR.
- **E3** — Lista de "YA OPTIMIZADO (skip)" con su medición como evidencia.
- **E4** — Recomendaciones NO aplicadas (front/API/producto): p.ej. caching de combos, paralelismo de
  llamadas en páginas, ventana default de Filtros, materialización de agregados. Con ganancia estimada.

## 7. Notas para el ejecutor

- El stack local lo levanta el ORQUESTADOR (API 5090 con `appsettings.Local.json`, Vite 5173);
  db-experto mide server-side vía db-console (`190.116.90.35,50198`), no necesita el API para F1/F2.
- `sp_Caja_Ingresos`/`sp_Caja_Egresos` no tienen consumidor front (dead endpoints documentados):
  NO gastar esfuerzo en optimizarlos.
- La latencia del **login** y del **NLQ** tienen componentes externos (legacy 8183 / API Anthropic):
  medir el SP para separar responsabilidades, pero no perseguir lo externo aquí.
- Nada de esto cambia contratos → **no hay fases de backend-api ni bi-frontend** en este plan.

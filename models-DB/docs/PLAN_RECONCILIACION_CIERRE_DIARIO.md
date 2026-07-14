# PLAN — Reconciliación automática de cierres de caja DIARIOS (poller conta)

**Estado:** APROBADO por el usuario (2026-07-13/14) — pendiente de ejecución.
**Ejecutor previsto:** orquestador (sesión Claude) delegando a `db-experto`, `backend-api`, `bi-frontend`.
**Decisiones selladas por el usuario:**
1. Hosting = **BackgroundService dentro del API conta** (`SanLorenzo.Contabilidad.Services`).
2. Piso demo = **2026-07-01** (nada anterior se toca jamás).
3. **Escritura automática en producción APROBADA**, condicionada a **Fase 0 en modo OBSERVACIÓN** antes de activar.
4. Política ante cambios retroactivos = **auto-curación auditada por huella** (no inmutabilidad manual).

---

## 0. Objetivo en una frase

Un poller en el API conta corre a las **09:00, 13:00, 17:00, 21:00 y 00:00 (hora Lima)** y mantiene
los cierres de caja del legacy (`dbo.cajamayor_*`) **reconciliados por DÍA**: cada corrida reconstruye
el día en curso; la de medianoche **cierra el día** que terminó; una **huella (fingerprint) de dos
niveles (día/mes)** detecta registros retroactivos/anulaciones sobre días ya cerrados y los
**auto-cura con auditoría**. Contabilidad llega a las 9am y encuentra el día anterior cerrado e
inyectado, sin intervención humana.

---

## 1. Contexto VERIFICADO (BD viva, 2026-07-13 — no confiar en memoria ni en .sql del repo)

Todo lo siguiente fue validado contra `sys.sql_modules` / `sys.indexes` / datos reales por db-experto:

| Hecho | Detalle |
|---|---|
| Modelo actual | `dbo.cajamayor_cierre` = 1 cabecera por MES (UNIQUE `UX_cajamayor_cierre_Periodo(n_Anio,n_Mes)`); `dbo.cajamayor_movimiento` cuelga por FK `FK_movimiento_cierre` **ON DELETE CASCADE** |
| Generadores vivos | `dbo.sp_CajaMayor_GenerarDesdeCobranzas` (ingresos; 1 fila por detalle → **fan-out legítimo**, existen repetidos exactos válidos) y `dbo.sp_CajaMayor_GenerarEgresosDesdeVentas` (egresos series `ECO/ECA/ECF/ECT/ECG/ECR`; 1 fila por venta). **Ambos INSERT-only, SIN guard anti-duplicado** |
| Sin unicidad en destino | `dbo.cajamayor_movimiento` no tiene índice único por origen (solo PK identity) → reejecutar generadores sobre la misma cabecera DUPLICA todo |
| Idempotencia actual | Solo la da la UI (`CajaMayorNew.tsx`): `sp_CajaMayor_Cierre_DeletePhysical` (cascade) + regenerar. **Ese camino DESTRUYE los movimientos manuales y de registro de compras** |
| Mes corriente | La UI no genera ingresos/egresos del mes en curso; delega en `sp_CajaMayor_RecalcularIncremental` **que NO existe en producción** (endpoint roto). Por eso julio-2026 está vacío |
| SPs `_incremental` del repo | `models-DB/script-cajamayor/sp/*_incremental.sql` **NUNCA se desplegaron y están ROTOS** (usan `CREATE OR ALTER` — inválido en SQL 2012 — y tablas `dbo.cobranzas/ventas` en plural que no existen). **PROHIBIDO usarlos como base**; portar lógica solo de las defs vivas |
| Código muerto front | `CierreCajaGrid.tsx` + `cajaService.createCajaMayor/prepararDatosCierreCaja` no existen en el service actual. La página viva es `react-project/src/pages/CajaMayor/CajaMayorNew.tsx` (~líneas 596-707) |
| Backend legacy | `SanLorenzoMicroservices/SanLorenzo.Core.Services/Data.Access/ImplementationsRepo/caja/CajaRepository.cs` mapea los endpoints legacy a estos SPs |
| Evidencia histórica | 0 duplicados por `(cierre, v_IdVenta)` en egresos de los 12 cierres existentes (jul-2025…jun-2026) |

**Los dos "cajas" del proyecto (no confundir):** este plan opera sobre la **caja mayor legacy**
(`dbo.cajamayor_*`, pantallas BI legacy). La page `/conta/caja` (Caja Diaria del módulo conta) lee su
propia tubería y NO se toca aquí.

---

## 2. Reglas inquebrantables para el ejecutor

1. **NUNCA** `ALTER/DROP/CREATE INDEX` sobre tablas `dbo`. Las tablas `cajamayor_*` son creadas por el
   BI pero viven en `dbo`: se les puede **insertar/borrar FILAS de datos** (práctica establecida),
   jamás DDL. Los objetos NUEVOS de este plan van todos en el schema **`conta`**.
2. **SQL Server 2012**: sin `CREATE OR ALTER`, sin `STRING_SPLIT`, sin `OPENJSON`, sin `TRIM`, sin
   `DROP ... IF EXISTS`; `HASHBYTES` limitado a 8000 bytes (por eso la huella usa
   `COUNT+SUM+CHECKSUM_AGG`, ver §6). Leer `.claude/memory/reglas-sql2012.md` antes de escribir SQL.
3. **Portar lógica SIEMPRE desde `sys.sql_modules`** (defs vivas), nunca desde los `.sql` del repo
   (hecho de oro #3). Al terminar, actualizar el `.sql` versionado para que refleje lo aplicado.
4. La BD es **producción**: probar → evidenciar → **limpiar** (DELETE + `DBCC CHECKIDENT ... RESEED`
   en tablas conta; en `dbo.cajamayor_*` limpiar por borrado de la cabecera de prueba, ver §9.2).
5. **PROHIBIDO insertar datos de prueba en tablas fuente legacy** (`dbo.cobranza`, `dbo.venta`, etc.).
   La simulación de deriva se hace perturbando el DESTINO (ver protocolo T-5).
6. **Piso demo `2026-07-01`**: ninguna query de reconciliación/huella/escritura puede tocar fechas
   anteriores. Junio-2026 hacia atrás pertenece a la carga histórica manual (pendiente aparte, runbook
   `LOG_EJECUCION_CONTA.md` §5).
7. Todo lo que escriba el poller debe ser **reproducible desde las fuentes** (derivación pura). Los
   movimientos manuales/registro de compras NO son derivables → jamás entran en el DELETE quirúrgico.

---

## 3. Arquitectura objetivo

```
API conta (SanLorenzo.Contabilidad.Services, net6)
 ├─ ReconciliacionHostedService (BackgroundService)
 │    horarios Lima: 09:00 13:00 17:00 21:00 00:00 · catch-up al arrancar · kill switch
 │    └─ ejecuta "Tick" → llama SPs conta vía Dapper (CommandTimeout 300s)
 ├─ POST /api/conta/caja/reconciliar        (rol SA — disparo manual, mismo camino)
 └─ GET  /api/conta/caja/reconciliacion/estado (roles lectura — últimas corridas + estados de día)

Schema conta (NUEVO, todo nuestro)
 ├─ conta.caja_reconciliacion_dia   (estado por FECHA + huella al cierre + totales congelados + versión)
 ├─ conta.caja_reconciliacion_log   (auditoría: 1 fila por corrida/acción con deltas)
 ├─ conta.sp_CajaRecon_Tick         (orquestador de una corrida; applock)
 ├─ conta.sp_CajaRecon_ReconciliarDia (rebuild quirúrgico de UNA fecha; transaccional)
 └─ conta.sp_CajaRecon_Huella       (huella fuente y huella persistido, por día o rango)

Destino (legacy, solo FILAS de datos)
 └─ dbo.cajamayor_cierre (cabecera mensual lazy) + dbo.cajamayor_movimiento (filas generadas del día)
```

### Máquina de estados por día

```
PENDIENTE ──(corrida)──► RECONCILIADO ──(primera corrida con fecha ya vencida)──► CERRADO
                              ▲  │ (re-reconciliación intra-día del día en curso)
                              └──┘
CERRADO ──(huella difiere)──► REABIERTO_AUTO ──(rebuild)──► CERRADO (n_Version+1, delta logueado)
```

**Regla de cierre (sin caso especial de medianoche):** en cada corrida, toda fecha `d < hoy(Lima)` con
estado ≠ CERRADO se reconcilia y se **cierra**; la fecha `d = hoy` se reconcilia y queda RECONCILIADO.
La corrida de las 00:00 cae ya en el día siguiente ⇒ el día que terminó califica como "pasado no
cerrado" y se cierra naturalmente. El catch-up (server caído, primer arranque) sale gratis de esta
regla: la primera corrida cierra TODOS los días pendientes desde el piso.

---

## 4. Especificación de datos (DDL conceptual — db-experto define tipos finales)

### 4.1 `conta.caja_reconciliacion_dia`
| Columna | Semántica |
|---|---|
| `d_Fecha date PK` | Día calendario (≥ 2026-07-01) |
| `v_Estado` | PENDIENTE / RECONCILIADO / CERRADO |
| `n_Version int` | Nº de cierres del día (1 = primero; se incrementa en cada auto-recierre) |
| `i_IdCajaMayorCierre` | FK lógica a la cabecera mensual dbo (sin FK física cross-schema si genera fricción; patrón referencia lógica) |
| `d_TotalIngresos, d_TotalEgresos, i_CntIngresos, i_CntEgresos` | Totales congelados al último cierre |
| `hf_Cnt, hf_Sum, hf_Chk` | Huella FUENTE al momento del último cierre (3 componentes, §6) |
| `t_UltimaReconciliacion, t_UltimoCierre, t_UltimaVerificacion` | Timestamps |

### 4.2 `conta.caja_reconciliacion_log`
| Columna | Semántica |
|---|---|
| `i_IdLog identity PK` | |
| `t_Inicio, t_Fin` | |
| `v_Origen` | POLLER / MANUAL / STARTUP_CATCHUP |
| `v_Modo` | OBSERVACION / ESCRITURA |
| `v_Accion` | TICK / RECONCILIAR_DIA / CIERRE_DIA / REAPERTURA_AUTO / BARRIDO_CORTO / BARRIDO_PROFUNDO |
| `d_Fecha (nullable)` | Día afectado (null para acciones globales) |
| `v_Resultado` | OK / OK_SIN_CAMBIOS / DERIVA_DETECTADA / ERROR / SKIPPED_LOCK |
| `v_Detalle nvarchar(max)` | Deltas: totales antes/después, conteos, huellas, mensaje de error. JSON-like en texto plano (SQL 2012 sin OPENJSON: lo consume el API, no SQL) |

---

## 5. Contratos de los SPs (comportamiento exigible; db-experto implementa)

### 5.1 `conta.sp_CajaRecon_ReconciliarDia @Fecha date, @Modo varchar(12)`
1. Valida `@Fecha >= '2026-07-01'` (si no, RAISERROR y sale). Valida `@Fecha <= hoy`.
2. `@Modo='OBSERVACION'`: calcula lo que haría (conteos/totales fuente vs persistido de esa fecha) y
   SOLO escribe en el log. **Cero escrituras en dbo.**
3. `@Modo='ESCRITURA'`, dentro de UNA transacción (`SET XACT_ABORT ON`):
   a. Upsert de la cabecera mensual del mes de `@Fecha` (reusar la lógica viva de
      `sp_CajaMayor_Cierre_CreateUpdate` — llamada o port; decide db-experto).
   b. **DELETE quirúrgico**: borra de `dbo.cajamayor_movimiento` SOLO las filas de esa fecha
      (`t_FechaMovimiento` del día) **cuyo marcador de origen sea de generación automática**
      (valores exactos = salida del GATE-0.1; los manuales y registro de compras se preservan).
   c. **INSERT día-scoped**: inserta ingresos (port de la CTE de `sp_CajaMayor_GenerarDesdeCobranzas`
      viva, filtrada a `@Fecha`) y egresos (port de `sp_CajaMayor_GenerarEgresosDesdeVentas` viva,
      filtrada a `@Fecha`), colgando de la cabecera del mes. Misma lógica de negocio,
      misma atribución `tipocaja_clientetipo` con su fallback.
   d. Recalcula totales/resumen del MES (llamar `dbo.sp_CajaMayor_RecalcularTotales` /
      `sp_CajaMayor_ResumenTipos` según corresponda) para que las pantallas legacy cuadren.
   e. Upsert en `conta.caja_reconciliacion_dia` (estado según regla §3, totales, huella fuente
      fresca, version si es recierre) + fila de log con deltas.
4. Manejo de errores: cualquier fallo → rollback total + log ERROR. El SP nunca deja un día a medias.

### 5.2 `conta.sp_CajaRecon_Huella @Desde date, @Hasta date`
Devuelve por día (y agregado del rango) los **pares** de huella:
- Huella FUENTE: derivada de las tablas origen con las MISMAS reglas de filtrado de los generadores.
- Huella PERSISTIDO: sobre `dbo.cajamayor_movimiento` de esa fecha, SOLO filas generadas.
Comparación válida = comparar los 3 componentes de cada lado (§6). Es un SP de SOLO LECTURA.

### 5.3 `conta.sp_CajaRecon_Tick @Modo varchar(12), @BarridoProfundo bit`
Orquestador de UNA corrida. Pasos:
1. `sp_getapplock` exclusivo, resource `'conta.caja_reconciliacion'`, timeout corto (ej. 5s).
   Si no lo obtiene → log `SKIPPED_LOCK` y sale limpio (otra corrida está en curso).
2. **Días pendientes**: toda fecha en `[max(piso, primer día no cerrado) .. hoy]` con estado ≠ CERRADO
   → `ReconciliarDia` cada una (los pasados quedan CERRADOS, hoy queda RECONCILIADO).
3. **Barrido corto** (siempre): `Huella` sobre los últimos 7 días CERRADOS; si algún día difiere →
   log `DERIVA_DETECTADA` + (`ESCRITURA`) `ReconciliarDia` de ese día (recierre auto, version+1).
4. **Barrido profundo** (`@BarridoProfundo=1`, corrida de 00:00): `Huella` agregada a nivel MES del
   mes corriente y el mes anterior (∩ ≥ piso). Si la huella mensual coincide → nada. Si difiere →
   drill-down por día del mes afectado y curar solo los días con diferencia.
5. Libera el applock. Log TICK con resumen (días tocados, curados, duración).

---

## 6. Definición EXACTA de la huella (2012-safe)

Por cada lado (FUENTE / PERSISTIDO) y por día:

```
hf_Cnt = COUNT(*)                      -- filas derivables del día
hf_Sum = SUM(monto)                    -- suma de montos del día (decimal, misma precisión ambos lados)
hf_Chk = CHECKSUM_AGG(BINARY_CHECKSUM(<columnas canónicas>))   -- independiente del orden
```

- **Columnas canónicas** (propuesta; GATE-0.4 las fija): identificadores de origen (id venta /
  id cobranza / nº doc), monto, fecha, forma de pago, flag de anulación. Deben ser **las mismas
  columnas conceptuales en ambos lados** para que la comparación sea válida.
- Huella de MES = los mismos 3 agregados sobre el rango del mes (no hash-of-hashes: más simple y
  igual de efectivo con estos volúmenes).
- **Limitación documentada:** cambios en el catálogo de atribución (`dbo.tipocaja_clientetipo`) no
  alteran la huella (la atribución no es parte de la identidad del hecho). Si se recalibra ese
  catálogo, hay que reconciliar manualmente los días afectados (endpoint manual).
- NO usar `HASHBYTES` sobre concatenaciones del día (límite 8000 bytes en SQL 2012).

---

## 7. Especificación del BackgroundService (backend-api)

### 7.1 Configuración (`appsettings.json`, overrideable por env vars)
```json
"Reconciliacion": {
  "Enabled": false,                    // KILL SWITCH — nace APAGADO
  "Modo": "Observacion",              // Observacion | Escritura
  "PisoFecha": "2026-07-01",
  "Horarios": ["09:00","13:00","17:00","21:00","00:00"],
  "TimeZone": "SA Pacific Standard Time",   // Lima en Windows; fallback America/Lima (TZConvert no: net6 en Windows usa id Windows)
  "VentanaBarridoCortoDias": 7,
  "CommandTimeoutSeconds": 300,
  "ReintentoMinutos": 5               // 1 reintento ante ERROR transitorio
}
```

### 7.2 Comportamiento del hosted service
- Al arrancar: espera ~30s (que el API esté sano) → **catch-up**: si la última corrida OK del log es
  anterior al último horario programado ya vencido → ejecuta un Tick (origen STARTUP_CATCHUP,
  `@BarridoProfundo=0`). Esto neutraliza reciclajes de IIS y caídas.
- Loop: calcula el próximo horario en TZ Lima, `Task.Delay` hasta entonces, ejecuta Tick.
  `@BarridoProfundo=1` SOLO cuando el horario disparado es el de `00:00`.
- `Enabled=false` ⇒ el servicio duerme (loguea 1 línea al arrancar y nada más).
- Excepciones: capturar TODO; log a `caja_reconciliacion_log` (vía SP o INSERT directo conta) +
  ILogger; 1 reintento a los `ReintentoMinutos`; jamás tumbar el host.
- Concurrencia: `SemaphoreSlim(1,1)` in-process ADEMÁS del applock del SP (cinturón y tirantes; el
  manual y el poller comparten camino).

### 7.3 Endpoints
- `POST /api/conta/caja/reconciliar` — `[Authorize(Roles="SA")]`. Body opcional
  `{ "fecha": "yyyy-MM-dd" | null, "barridoProfundo": bool }`. Sin fecha ⇒ Tick completo. Con fecha ⇒
  `ReconciliarDia` de esa fecha (≥ piso). Respeta `Modo` de config salvo override explícito
  `"modo": "Observacion"` (nunca permitir forzar Escritura por request si config = Observacion).
  Devuelve el resumen de la corrida (días tocados/curados, totales).
- `GET /api/conta/caja/reconciliacion/estado` — roles de lectura del módulo. Devuelve: últimas N
  corridas del log + estados de los últimos 35 días (`caja_reconciliacion_dia`) para el front.

---

## 8. Front (bi-frontend — alcance MÍNIMO)

1. **Indicador** en la page del módulo conta que corresponda (propuesta: card compacta en
   `/conta/caja` o badge en `ContaHeader`): "Reconciliación caja legacy: última corrida HH:mm — OK",
   con tooltip de días recerrados recientes (consume el endpoint estado). Diseño coherente con las
   convenciones del módulo (`frontend-react.md`).
2. **Neutralizar el camino destructivo legacy**: en `CajaMayorNew.tsx`, para periodos **≥ 2026-07**,
   deshabilitar el botón Generar/Crear cierre con tooltip "Los cierres desde jul-2026 se reconcilian
   automáticamente". Para periodos < piso queda operativo (lo usa la carga histórica). NO borrar
   código; comentario `[RECONCILIACION 2026-07]` con referencia a este plan.

---

## 9. Fases de ejecución (con agente, GATEs y protocolos de prueba)

> El orquestador verifica cada GATE personalmente (regla 3 de CLAUDE.md). No avanzar de fase con un
> GATE en rojo.

### FASE 0-A — GATEs de validación (db-experto, SOLO LECTURA)
- **GATE-0.1 Marcador de origen:** valores exactos que distinguen en `dbo.cajamayor_movimiento` las
  filas generadas (cobranzas / ventas-egreso) de las manuales y de registro de compras. Criterio de
  aceptación: una cláusula WHERE reproducible que seleccione el 100% de lo generado y 0% de lo manual
  (validar contra los 12 cierres existentes). Si NO existe marcador fiable ⇒ **STOP**, rediseñar
  (opciones: inferencia multi-columna; NO se permite ALTER en dbo).
- **GATE-0.2 Fecha de atribución:** qué columna fuente alimenta `t_FechaMovimiento` en cada generador
  (¿fecha del hecho o de registro?) y confirmar que el filtrado por día es determinista (sin
  ambigüedad de horas). Documentar la elección.
- **GATE-0.3 Firmas de los SPs vivos:** parámetros reales de `GenerarDesdeCobranzas`,
  `GenerarEgresosDesdeVentas`, `Cierre_CreateUpdate`, `RecalcularTotales`, `ResumenTipos`
  (de `sys.sql_modules`) para decidir llamada vs port.
- **GATE-0.4 Columnas canónicas + costo de huella:** fijar columnas de la huella (ambos lados) y
  medir el plan/costo de la query de huella mensual sobre las fuentes con los índices EXISTENTES
  (prohibido crear índices en dbo). Aceptación: huella de un mes < ~10s. Si es mayor: reducir ventana
  del barrido profundo o mover columnas; no crear índices.
- **GATE-0.5 Manuales en julio:** inventario de movimientos manuales/compras ya existentes en fechas
  ≥ piso (si los hay) para verificar preservación en las pruebas.

### FASE 1 — Objetos de BD (db-experto)
1. Crear `conta.caja_reconciliacion_dia`, `conta.caja_reconciliacion_log` (DDL en
   `models-DB/script-conta/ddl/`, numeración siguiente a la existente).
2. Crear `conta.sp_CajaRecon_Huella`, `conta.sp_CajaRecon_ReconciliarDia`, `conta.sp_CajaRecon_Tick`
   (archivo nuevo en `models-DB/script-conta/sp/`, aplicado vía db-console `--write --file`,
   DROP+CREATE idempotente, SQL 2012).
3. **Protocolo de prueba (producción, con limpieza total):**
   - **T-1 Observación pura:** `Tick @Modo='OBSERVACION'` → verifica: 0 escrituras en dbo
     (conteos antes/después idénticos), log poblado con lo que HARÍA para julio 1..hoy.
   - **T-2 Escritura de un día:** `ReconciliarDia '2026-07-01','ESCRITURA'` → cabecera julio creada,
     movimientos del 01-jul insertados. Evidencia: conteos y sumas vs queries directas a fuentes
     (misma lógica); huella fuente == huella persistido para esa fecha.
   - **T-3 Idempotencia:** re-ejecutar T-2 → mismos conteos/totales (0 duplicados), version estable,
     log OK_SIN_CAMBIOS o recierre limpio.
   - **T-4 Preservación de manuales:** insertar 1 movimiento manual de prueba en el 01-jul (vía SP
     manual existente) → `ReconciliarDia` de nuevo → el manual SIGUE; luego eliminar ese manual de
     prueba.
   - **T-5 Auto-curación (deriva simulada en DESTINO — NUNCA en fuentes legacy):** borrar a mano UNA
     fila generada del 01-jul → `Tick` con barrido → detecta huella distinta, recierra el día
     (version+1), fila restaurada, delta en log.
   - **T-6 Piso:** `ReconciliarDia '2026-06-30'` → RAISERROR, 0 efectos.
   - **Limpieza:** borrar la cabecera de julio de prueba (cascade limpia movimientos), TRUNCATE/DELETE
     + RESEED de las tablas conta nuevas. Evidencia de estado virgen (los datos definitivos de julio
     los creará la activación de la Fase 4, no las pruebas).
4. Actualizar los `.sql` versionados = lo aplicado en vivo.

### FASE 2 — API (backend-api)
1. Implementar config §7.1, hosted service §7.2, endpoints §7.3 (Dapper, mismo patrón del proyecto).
2. `Enabled=false` en el appsettings commiteado. Compilar (0 errores; warning NETSDK1138 esperado).
3. Pruebas locales (API 5090): endpoint manual en OBSERVACION contra la BD real; verificar log;
   simular horario cercano para ver el disparo del hosted service; kill switch on/off.
   Recordar liberar el puerto 5090 antes de compilar.

### FASE 3 — Front (bi-frontend)
Indicador + neutralización del botón legacy (§8). `npx tsc --noEmit` limpio + build Vite OK.

### FASE 4 — Observación y activación (orquestador + usuario)
1. Encender `Enabled=true, Modo=Observacion` en el entorno donde corra el API (dev 5090 mientras no
   exista IIS; ver Dependencias §10). Dejar correr ≥ 1 día completo de ticks.
2. Revisar el log con el usuario: días que poblaría, conteos vs pantallas legacy, ninguna mención a
   fechas < piso, duraciones.
3. Con el visto bueno del usuario: `Modo=Escritura`. La primera corrida hace el catch-up grande
   (julio 1 → hoy, cada día reconciliado y cerrado). Verificación final: totales de julio en las
   pantallas legacy (`ResumenTipos`) + huellas mes en verde + spot-check de 2-3 días contra fuentes.
4. Registrar el hito en `LOG_EJECUCION_CONTA.md` y cerrar sesión con `continual-learning`.

---

## 10. Dependencias y supuestos operativos

- **24/7 real requiere el despliegue IIS del API conta** (runbook `LOG_EJECUCION_CONTA.md` §6, puerto
  sugerido 8187) **con Application Initialization / AlwaysOn** (los app pools reciclan y duermen; sin
  esto el poller solo corre cuando alguien usa el API). Mientras tanto, el poller es válido en dev
  (5090) — el catch-up hace que las ventanas apagadas no pierdan nada, solo retrasan.
- Si en el futuro se prefiere desacoplar del API: plan B = SQL Server Agent (verificar edición del
  SQL 2012; Express no lo trae) ejecutando `conta.sp_CajaRecon_Tick` — los SPs ya quedan aptos.
- Zona horaria: Perú no tiene DST; usar el TZ id de Windows "SA Pacific Standard Time".

## 11. Riesgos y mitigaciones (resumen)

| Riesgo | Mitigación en este plan |
|---|---|
| Doble ejecución concurrente (poller + manual + Swagger) | applock en `Tick` + semáforo in-process; `SKIPPED_LOCK` logueado |
| Corridas perdidas (IIS recycle, caída) | catch-up por estado al arrancar y en cada tick |
| Registro retroactivo / anulación en día cerrado | huella corta (7d) por tick + profunda (mes actual+anterior) a las 00:00 + auto-curación versionada |
| Pérdida de movimientos manuales | DELETE quirúrgico por marcador (GATE-0.1) + prueba T-4 obligatoria |
| Tocar data demo histórica | piso 2026-07-01 validado en SP (RAISERROR) + prueba T-6 |
| Escritura automática incorrecta | Fase 0/4 en OBSERVACION + kill switch + log auditable con deltas |
| Fallo a mitad de un rebuild | transacción única por día con XACT_ABORT |
| Costo de huella sobre fuentes sin índices nuevos | GATE-0.4 mide antes de construir; ventanas ajustables por config |

## 12. Rollback

1. `Reconciliacion:Enabled=false` (efecto inmediato, sin redeploy si es env var).
2. Los datos generados son derivables: en el peor caso, borrar la cabecera del mes afectado (cascade)
   y regenerar con el propio poller, o dejar el último estado bueno.
3. Los objetos `conta.caja_recon*` pueden droppearse sin afectar nada legacy. `dbo` queda intacto
   (jamás recibió DDL).

## 13. Fuera de alcance (NO hacer en esta ejecución)

- Carga histórica de caja (< 2026-07-01) — pendiente aparte (§5 del LOG), la fija el usuario.
- Despliegue IIS en sí (runbook §6) — dependencia, no parte de este plan.
- Cambios al modelo mensual legacy (`cajamayor_cierre` sigue siendo el contenedor por mes).
- Reconciliación SISOL/farmacia (`recon_farmacia_sisol_2026.sql`) — dominio distinto.
- Migración de las pantallas legacy de caja al módulo conta.

## 14. Checklist final del orquestador (criterio de "terminado")

- [ ] GATE-0.1 … 0.5 en verde, documentados en este archivo (sección nueva "Resultados GATE-0").
- [ ] T-1 … T-6 ejecutados con evidencia y limpieza (transcripciones en LOG_EJECUCION_CONTA.md).
- [ ] `.sql` versionados == defs vivas (`modify_date` cotejado).
- [ ] Build API 0 errores; hosted service disparando en horarios; kill switch verificado.
- [ ] Front: indicador visible + botón legacy neutralizado ≥ jul-2026; tsc + build OK.
- [ ] Fase de observación revisada CON el usuario; activación de escritura autorizada por él en chat.
- [ ] Catch-up inicial de julio completado y cuadrado contra pantallas legacy.
- [ ] Commit(s) `feat(conta): ...` por el orquestador; memorias actualizadas vía `continual-learning`.

---

# RESULTADOS FASE 0-A — GATEs (verificados por el orquestador, 2026-07-14) · 5/5 VERDE

Ejecutado por db-experto (SOLO LECTURA, 0 escrituras, 0 DDL en dbo, piso respetado). Estas
conclusiones son **vinculantes** y refinan/clarifican §5 y §6.

| GATE | Veredicto | Resultado |
|---|---|---|
| 0.1 Marcador de origen | 🟢 | `v_Origen IN ('cobranzas','ventas-egreso')` caza 100% de lo generado y 0% de manual/compras, validado en los 12 cierres (94.630 filas, 0 falsos positivos). `sp_CajaMayor_InsertMovimientoManual` usa `v_Origen=@Origen` (default `'manual'`; el front usa `'manual'`,`'registro_compras'`,`'pago_de_medicos'`). `registro_compras` NO escribe en `cajamayor_movimiento`. |
| 0.2 Fecha de atribución | 🟢 | Ambos generadores: `t_FechaMovimiento = venta.t_InsertaFecha` (fecha de REGISTRO de la venta, timestamp real, NO la de cobranza ni emisión). Filtran por esa columna. Día determinista con `CONVERT(DATE,...)`. |
| 0.3 Firmas de SPs | 🟢 | Ver tabla abajo. Generadores son **cierre-scoped sin @Fecha** → PORTAR sus CTE. `ResumenTipos` LLAMAR al final (reemplaza `RecalcularTotales`). |
| 0.4 Huella + costo | 🟢 | Columnas canónicas fijadas (abajo). Costo huella de un mes ≈ 2–4 s (< 10 s) con índices EXISTENTES. |
| 0.5 Manuales ≥ piso | 🟢 | 0 movimientos manuales/compras en fechas ≥ 2026-07-01 (y 0 en toda la historia). Julio = lienzo limpio. |

### Firmas reales (GATE-0.3, de `sys.parameters`)
| SP | Parámetros (en orden) |
|---|---|
| `sp_CajaMayor_GenerarDesdeCobranzas` | `@IdCajaMayorCierre int, @InsertaIdUsuario int, @DefaultIdTipoCaja int` |
| `sp_CajaMayor_GenerarEgresosDesdeVentas` | `@IdCajaMayorCierre int, @InsertaIdUsuario int, @DefaultIdTipoCaja int` |
| `sp_CajaMayor_Cierre_CreateUpdate` | `@Anio nchar(4), @Mes nchar(2), @FechaInicio datetime, @FechaFin datetime, @Observaciones nvarchar(500), @InsertaIdUsuario int` |
| `sp_CajaMayor_RecalcularTotales` | `@IdCajaMayorCierre int, @ActualizaIdUsuario int` |
| `sp_CajaMayor_ResumenTipos` | `@IdCajaMayorCierre int, @ActualizaIdUsuario int` |

### Columnas canónicas de la huella (GATE-0.4)
`hf_Cnt=COUNT(*)`, `hf_Sum=SUM(monto)`, `hf_Chk=CHECKSUM_AGG(BINARY_CHECKSUM(v_IdVenta, monto, dia, ISNULL(i_IdFormaPago,-1)))`.
El triple cubre la debilidad XOR de `CHECKSUM_AGG`. Fuente vs persistido:
| Concepto | Persistido (`cajamayor_movimiento`) | Fuente (venta/detalle) |
|---|---|---|
| id hecho | `v_IdVenta` | `venta.v_IdVenta` |
| monto | `d_Total` | ingresos `ventadetalle.d_PrecioVenta` (por línea); egresos `SUM(d_PrecioVenta)` por venta |
| día | `CONVERT(DATE,t_FechaMovimiento)` | `CONVERT(DATE,venta.t_InsertaFecha)` |
| forma pago | `i_IdFormaPago` | ingresos `cobranzadetalle.i_IdFormaPago`; egresos NULL |
Anulación: no hay flag en el persistido; se detecta porque la venta anulada (`i_Eliminado=1`) desaparece de la huella FUENTE (los generadores filtran `=0`) → cambian Cnt/Sum/Chk → dispara recierre.

## REFINAMIENTOS VINCULANTES (obligatorios para FASE 1+)
1. **`v_Origen` PROPIO del poller:** las filas que inserte `sp_CajaRecon_ReconciliarDia` usan
   `v_Origen = 'recon-cobranzas'` (ingresos) y `'recon-egreso'` (egresos) — NO los strings del legacy.
   El DELETE quirúrgico y la huella-persistido key-ean por `v_Origen IN ('recon-cobranzas','recon-egreso')`.
   Esto aísla el poller del origen manual de texto libre y de las filas del camino UI legacy. (Julio es
   lienzo limpio → sin colisión con filas 'cobranzas'/'ventas-egreso' preexistentes de meses ≥ piso.)
2. **Portar, no llamar, los generadores:** `ReconciliarDia` porta los CTE de `GenerarDesdeCobranzas` y
   `GenerarEgresosDesdeVentas` añadiendo el predicado `CONVERT(DATE, V.t_InsertaFecha) = @Fecha`, y
   escribe con el `v_Origen` propio (refinamiento 1). Motivo: los SP vivos son month/cierre-scoped, sin
   @Fecha, con efectos colaterales (llaman ResumenTipos + emiten SELECT) e `INSERT..EXEC` interno.
3. **Cadena EXEC plano (sin INSERT..EXEC):** `Tick → ReconciliarDia → ResumenTipos`. `ResumenTipos`
   actualiza `cajamayor_cierre_tipocaja` + totales de cabecera → NO usar `RecalcularTotales`.
4. **Cabecera mensual lazy:** portar el upsert de `Cierre_CreateUpdate` (~10 líneas, upsert por
   `n_Anio/n_Mes`) dentro de `ReconciliarDia`, en EXEC plano.
5. **Barrido corto = UN rango [hoy-7, hoy]** (una sola pasada), no 7 queries de un día — porque
   `venta.t_InsertaFecha` NO tiene índice (hace scan de `venta`; los joins por `v_IdVenta` sí indexados).
6. **Supuesto operativo a documentar:** el reloj del servidor SQL está en hora Lima (`t_InsertaFecha`
   es hora local, no `datetimeoffset`); el poller usa TZ Lima → deben coincidir.
7. **Blindaje manual (Fase 3):** garantizar que la vía manual (`MovimientoManualModal`, input de origen
   editable en la page vieja `CajaMayor.tsx`) jamás emita `'recon-cobranzas'`/`'recon-egreso'`.

**Veredicto orquestador:** GATE 0.1–0.5 en verde. **Autorizado avanzar a FASE 1** con los 7 refinamientos incorporados.

---

# RESULTADOS FASE 1 — Objetos de BD (verificado por el orquestador, 2026-07-14) · COMPLETA

Aplicado en producción por db-experto. **0 DDL sobre dbo**; los 7 objetos nuevos viven en `conta`.
Archivos: `models-DB/script-conta/ddl/11_reconciliacion_caja.sql` y `sp/12_reconciliacion_caja.sql`
(== defs vivas, cotejado).

**Objetos creados (conta):** tablas `caja_reconciliacion_dia`, `caja_reconciliacion_log`; iTVF
`fn_CajaRecon_HuellaFuente`, `fn_CajaRecon_HuellaPersistido`; SP `sp_CajaRecon_Huella` (RS1 por día
fte-vs-per + `Coincide`, RS2 agregado), `sp_CajaRecon_ReconciliarDia @Fecha,@Modo`,
`sp_CajaRecon_Tick @Modo,@BarridoProfundo`.

**Firmas finales para FASE 2 (API):**
- `conta.sp_CajaRecon_Tick @Modo varchar(12), @BarridoProfundo bit`
- `conta.sp_CajaRecon_ReconciliarDia @Fecha date, @Modo varchar(12)`
- `conta.sp_CajaRecon_Huella @Desde date, @Hasta date`  (SOLO LECTURA; 2 resultsets)
- Estado para el front = SELECT sobre `conta.caja_reconciliacion_log` (últimas N) + `conta.caja_reconciliacion_dia` (últimos ~35 días).

**Pruebas T-1…T-6:** 6/6 🟢 (T-1 observación 0-escrituras · T-2 escritura huella fte==per, CERRADO v1
· T-3 idempotencia 0-dup versión estable · T-4 manual preservado · T-5 auto-curación recierre v2 ·
T-6 piso RAISERROR rechaza 2026-06-30). Cross-check: catch-up pobló julio 4.474 ing + 150 egr =
huella GATE-0.4.

**Semántica de versión (afinada en pruebas):** re-cierre idempotente (`@coincide=1`) NO sube
`n_Version`; solo la auto-curación por deriva (`@coincide=0`) lo incrementa +1.

**Estado virgen restaurado y verificado:** `dbo.cajamayor_movimiento`=94.630 (inicial),
`dbo.cajamayor_cierre`=12 (ids 22-33), 0 filas `recon-*`, 0 cierre julio, tablas conta vacías. Los
datos definitivos de julio los crea la ACTIVACIÓN (Fase 4), no las pruebas.

**Veredicto orquestador:** FASE 1 verde. **Autorizado avanzar a FASE 2** (API, `Enabled=false`).

---

# RESULTADOS FASE 2 — API BackgroundService (verificado, 2026-07-14) · COMPLETA

Build `-c Release` 0 errores (warn NETSDK1138 esperado). API detenido, puerto 5090 libre, `Enabled=false`.

**Archivos nuevos:** `Infrastructure/ReconciliacionOptions.cs`, `ReconciliacionScheduler.cs` (helpers TZ Lima),
`ReconciliacionRunner.cs` (singleton + `SemaphoreSlim(1,1)`), `ReconciliacionHostedService.cs`,
`Repositories/ReconciliacionRepository.cs`, `Controllers/CajaReconciliacionController.cs`.
**Modificados:** `appsettings.json` (bloque `Reconciliacion`, `Enabled:false`), `Models/Dtos.cs`, `Program.cs`.

**Endpoints (base `api/conta/caja`):**
- `POST /reconciliar` `[Roles=SA]` — body `{fecha?, barridoProfundo?, modo?}`. Sin fecha→Tick, con fecha→ReconciliarDia.
  Blindaje: nunca fuerza Escritura por request (verificado). Respuesta `ReconciliacionCorridaResponse{Modo,Origen,Fecha,BarridoProfundo,Corrida:ReconLogRow[]}`.
- `GET /reconciliacion/estado` `[Authorize]` — `?corridas=25&dias=35`. Respuesta `ReconEstadoResponse{Config,Corridas:ReconLogRow[],Dias:ReconDiaRow[]}`.

**Shapes para el front (PascalCase):**
- `ReconLogRow`: `i_IdLog,t_Inicio,t_Fin,v_Origen,v_Modo,v_Accion,d_Fecha,v_Resultado,v_Detalle,i_IdUsuario` (`v_Detalle`=texto JSON-like, parsear en front).
- `ReconDiaRow`: `d_Fecha,v_Estado,n_Version,i_IdCajaMayorCierre,d_TotalIngresos,d_TotalEgresos,i_CntIngresos,i_CntEgresos,hf_Cnt,hf_Sum,hf_Chk,t_UltimaReconciliacion,t_UltimoCierre,t_UltimaVerificacion`.
- `ReconConfigDto`: `Enabled,Modo,PisoFecha,Horarios[],TimeZone,ProximoHorarioUtc` (UTC→convertir en front).

**Pruebas locales:** 🟢 observación (`fteCnt:424,preCnt:0,coincide:0`, 0 escrituras dbo), Tick jul01-14, escalada Escritura bloqueada, estado 200, piso 400, sin token 401.

**Pendiente menor:** limpiar 25 filas OBSERVACION en `conta.caja_reconciliacion_log` (ids 1-25; 0 escrituras dbo)
antes de FASE 4 → db-experto: `DELETE` + `DBCC CHECKIDENT(...,RESEED,0)`.

**Veredicto orquestador:** FASE 2 verde. **Autorizado avanzar a FASE 3** (front: indicador + neutralizar botón legacy + blindaje refin. 7).

---

# RESULTADOS FASE 3 — Front (verificado, 2026-07-14) · COMPLETA

`npx tsc --noEmit` EXIT 0 · `npx vite build` EXIT 0.

**Archivos:** `contaTypes.ts` (+6 tipos DTO PascalCase), `ContabilidadService.ts` (+`reconciliacionEstado`,
`reconciliarCaja`), NUEVO `pages/Contabilidad/components/ReconciliacionCajaMayorCard.tsx` (indicador),
`pages/Contabilidad/CajaDiaria.tsx` (monta la card al tope de `/conta/caja`),
`pages/CajaMayor/CajaMayorNew.tsx` (neutraliza "Crear cierre" para periodos ≥ 202607; guard + botón
disabled + aviso; comentarios `[RECONCILIACION 2026-07]`), `components/CajaMayor/MovimientoManualModal.tsx`
y `pages/CajaMayor/CajaMayor.tsx` (blindaje refin. 7: bloquean `v_Origen` `recon-cobranzas`/`recon-egreso`).

**Indicador:** card "Reconciliación caja mayor (legacy)" en `/conta/caja` (rótulo explícito para no
confundir con la Caja Diaria conta) — badges Activo/Apagado + Observación/Escritura, última corrida
(hora local + resultado con color), próxima corrida (`ProximoHorarioUtc`→local), mini-lista de días
(`v_Estado`/versión/totales). Botón "Reconciliar ahora" solo `hasRole('SA')`.

**Veredicto orquestador:** FASE 3 verde. Código completo FASES 0-A→3. **FASE 4 (observación→activación)
PENDIENTE — requiere participación y autorización explícita del usuario en chat.**

---

# RESULTADOS FASE 4 — Observación y activación (orquestador + usuario, 2026-07-14) · COMPLETA

**4.1 Observación (0 escrituras).** API relanzado con `Reconciliacion__Enabled=true Modo=Observacion`.
El Tick de arranque simuló el catch-up de julio. Verificado: `preCnt=0` en todos los días,
`caja_reconciliacion_dia` vacía, `dbo` intacto (94.630 mov + 12 cierres). Lo que **poblaría** (dedup por
día único): **4.624 filas / S/235.518,82** en 14 días. NOTA: en OBSERVACION el barrido corto re-loguea los
últimos 7 días (persistido=0 ⇒ todo "parece" deriva) → 21 filas `RECONCILIAR_DIA` en el log; es artefacto
cosmético, **en Escritura NO ocurre** (confirmado abajo). El número real deduplicado (4.624) = GATE-0.4 = FASE 1.

**4.2 Autorización del usuario.** Explícita en chat ("Sí, escribir ahora") para pasar a `Modo=Escritura`.

**4.3 Escritura controlada.** API relanzado con `Enabled=false` (kill switch: poller dormido, sin catch-up
de arranque) + `Modo=Escritura` (el endpoint manual sí escribe: el controller solo permite override HACIA
Observacion, jamás fuerza Escritura desde el body ⇒ requiere config=ESCRITURA).
- **jul-01 aislado** (`POST reconciliar {fecha}`): `CIERRE_DIA→CERRADO v1`, `preCnt=0 postCnt=424`
  (416 ing S/24.947,10 + 8 egr S/595,00). Cierre real `dbo.cajamayor_cierre` id **35**. Huella VERDE
  (fuente `hf_Chk=-82202110` == persistido). **db-experto: 5/5 VERDE** — conteo real 424, deriva=0, cruce
  INDEPENDIENTE contra `dbo.venta/ventadetalle/cobranzadetalle` reproduce S/24.947,10+595,00 (lógica de
  derivación correcta), aislamiento total (0 filas recon en otra fecha), legacy intacto (94.630+424=95.054
  movimientos; 12 cierres legacy ids 22–33 suman 94.630, ninguno tocado).
- **Catch-up del resto** (`POST reconciliar {}`): jul-02…jul-13 `CERRADO v1`, jul-14 `RECONCILIADO`
  (0 filas, hoy), **jul-01 saltado** (idempotente). **`BARRIDO_CORTO→OK_SIN_CAMBIOS`** (0 deriva ⇒ 0
  re-cura; confirma que la inflación de observación era artefacto). Todos `pre=0`.

**4.4 Verificación final.** Estado persistido: **14/14 huellas VERDES**. Total = **4.624 filas /
S/235.518,82** (Ingresos 4.474 / 219.947,42 · Egresos 150 / 15.571,40) — **cuadra al céntimo** con
observación, GATE-0.4 y FASE 1.

**4.5 Poller ACTIVO.** API corriendo con `Enabled=true Modo=Escritura`. Log: `Poller ACTIVO` ·
`catch-up NO necesario` (sin re-escritura, `maxVersion` sigue en 1) · `Proximo tick 09:00 Lima`.
Horarios [09,13,17,21,00]. Kill switch `Reconciliacion:Enabled` operativo.

# ESTADO GLOBAL (2026-07-14) · TODAS LAS FASES COMPLETAS

FASES 0-A, 1, 2, 3, 4 = **COMPLETAS y verificadas**. Julio poblado en producción: `dbo.cajamayor_movimiento`
= **99.254** (94.630 legacy intactos + 4.624 recon de julio). Cierres = 12 legacy (ids 22–33, intactos) +
13 recon (jul-01..jul-13, ids desde 35). `conta.caja_reconciliacion_dia` = 14 días, todos VERDES (jul-14
RECONCILIADO con 0 filas). Total recon = 4.624 filas / S/235.518,82. Poller corriendo local en `Enabled=true Modo=Escritura` (escribe a la BD de producción).
**Pendiente operativo:** (a) decidir el default committeado de `appsettings.json` (`Enabled`/`Modo`) para el
eventual despliegue IIS — hoy el repo tiene `Enabled=false`; el instance en marcha usa override por env;
(b) commits `feat(conta)`; (c) cierre con `continual-learning`. NOTA: el poller local solo reconcilia
mientras el `dotnet` esté arriba; para 24/7 real requiere despliegue IIS (bajo instrucción explícita).

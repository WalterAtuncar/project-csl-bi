# ANÁLISIS DE BRECHAS v2 (replanteado) — Web BI + API vs SAMBHS (`feat/tipificacion-sobre-master`)

**Fecha:** 2026-07-25 · **Autor:** Fable 5 (planificador) · **v2:** replanteo tras correcciones del PO,
verificadas con evidencia (3 auditorías de seguimiento sobre front, diff SAMBHS y BD prod viva).
La v1 sobrestimó brechas por un modelo equivocado de paridad; esta versión la reemplaza.

---

## 1. El modelo correcto (corrección central del PO)

Hay **DOS universos de egresos, por diseño, cada uno con su canal dueño**:

| Universo | Canal dueño | Alcance | La web… |
|---|---|---|---|
| **A. Egresos de caja EC** (ventas doc 502 ECA y 504 ECF) | **SAMBHS** (tipifica T1 + registra compra T2, SQL directo a `conta`) | TODO ECA/ECF se tipifica y registra en compras desde SAMBHS | solo LEE (badges del cuadre de día) — **no reconcilia lo del SAM** |
| **B. Otros egresos** | **Web `/conta/egresos`** (`conta.egreso` vía `sp_Egreso_*`) | Egresos de otro tipo, con tipificación completa en el alta (tipo gasto, centro costo, receptor) | CRUD completo propio |

**No hay paridad que exigir entre canales.** La "brecha total de escritura web" de la v1 queda
descartada como brecha: es la arquitectura elegida.

---

## 2. Veredicto sobre cada corrección del PO (con evidencia)

### 2.1 "¿Falta el editar (PUT/PATCH) en ambos?" → **NO falta el PUT; lo que falta es el DELETE**

| Superficie | Crear | Editar (PUT) | Anular/quitar (DELETE) |
|---|---|---|---|
| Web egresos (`conta.egreso`) | ✅ con tipificación completa (`Egresos.tsx:154-165`) + carga Excel | ✅ **completo**: botón lápiz → `PUT /egresos` → `sp_Egreso_Update` (receptor, fecha, doc, centro costo, tipo gasto, montos, glosa) — regla de negocio: **solo POR_PAGAR** (`Egresos.tsx:196,462`) | ✅ anular con motivo + usuario auditado |
| Web honorarios | ✅ | ❌ (deliberado: anular + regenerar) | ✅ modal con motivo obligatorio |
| Web compras | ❌ (solo clasificar → egreso espejo; página fuera del nav) | ❌ clasificación **one-shot**, sin editar/deshacer | ❌ |
| SAMBHS T1 | ✅ | ✅ tipo de gasto in-place (`ActualizarTipificacion`); GASTO↔HONORARIO vía destipificar+retipificar con aviso | ❌ **no hay "quitar tipificación"** como acción de usuario (`Destipificar` solo interno) |
| SAMBHS T2 | ✅ | ✅ **modo corrección autodetectado**: `v_EstadoCompra='COMPLETO'` prellena y "puede corregirlo"; mismo SP upsert | ❌ **no hay "anular compra"** — solo pisarla con otra |

Matiz: en T1 el receptor de un GASTO no es editable (solo se corrige desde T2).

### 2.2 "Anular venta EC tipificada: filtrar `i_Eliminado=1` lo resuelve" → **para GASTO se resuelve SOLO (mejor aún: sin agregar filtros); el residuo real es HONORARIO**

Evidencia dura de prod:
- Las 6 superficies de egresos suman `cajamayor_movimiento.d_Total`, y el generador legacy regenera
  solo desde ventas vivas (`WHERE v.i_Eliminado = 0`, `sp_CajaMayor_GenerarEgresosDesdeVentas` línea
  54) + auto-healing del poller. **Verificación empírica: 822/822 ventas EC anuladas → 0 movimientos
  'E' remanentes.** El dinero de una EC anulada **ya desaparece de todas las superficies sin tocar
  nada** — agregar `AND i_Eliminado=0` sería redundante y costoso.
- **Residuo GASTO:** fila overlay ACTIVO huérfana — invisible e inocua para montos. Único ajuste con
  mérito (cosmético): el fallback de `sp_EgresoCaja_GetClasificacion` lee `venta.d_Total` sin filtrar
  anuladas → excluirlas o proyectar `VentaAnulada BIT`.
- **Residuo HONORARIO (el que el filtro NO resuelve):** `conta.pago_honorario` queda **PAGADO
  "fantasma"** y los servicios quedan **bloqueados para siempre** (`b_Anulado=0` → el Resolver los
  marca EsPagado y Tipificar los rechaza) — no se pueden volver a pagar ni por caja ni por web.
- **La remediación ya está construida y sin drift:** `sp_EgresoCaja_Consistencia` (detecta, hoy 0
  filas) + `sp_EgresoCaja_Destipificar` (revierte quirúrgico: pago→ANULADO, servicios liberados,
  overlay→ANULADO). **Falta solo el disparador**: paso del poller, job o botón/endpoint admin.

### 2.3 "Export Excel/PDF del cuadre solo es monto bruto" → **aceptado: decisión de producto, se retira como brecha.**

### 2.4 "ECF: todo ECA o ECF se tipifica desde SAMBHS" → **confirmado en el código** (gatea 502 y
504); queda solo una nota operativa: el flujo 504 **nunca se ha ejercitado** (config hoy
`Series="ECA"`) — hacer una prueba dirigida antes de habilitar la serie ECF.

### 2.5 "La web solo registra egresos de otro tipo, no reconcilia lo del SAM" → **confirmado**
(sección 1). Los hallazgos v1 "sin endpoints T1/T2" y "bandeja sin pantalla web" dejan de ser brechas
de paridad; la visibilidad de pendientes es una necesidad del lado SAMBHS (ver 3.3).

---

## 3. Lo que QUEDA como hallazgo real (replanteado)

### 3.1 SEGURIDAD — intacta de la v1, sigue siendo lo más grave del análisis

| # | Hallazgo | Evidencia |
|---|---|---|
| S1 | Credenciales `sa` de PROD versionadas y **pusheadas** en el BI | `appsettings.json:10`, commit `d6eec0a` |
| S2 | `_backup_*` commiteados en la rama SAMBHS con App.config con credenciales (~28.9k líneas, 93% del diff) | commit `86d21679` — **bloqueante de merge** |
| S3 | Poller committeado `Enabled=true` + `Modo=Escritura` → cualquier `dotnet run` local escribe a `dbo.cajamayor_*` de PROD | `appsettings.json:24-25` (contradice memoria) |
| S4 | `Jwt:Key` dev versionada sin override → forja de tokens SA | `appsettings.json:12-16` |
| S5 | SAMBHS conecta como `sa` (heredado); contención = validación de SPs | `sp/18:179` |
| S6 | CORS AllowAnyOrigin; login sin lockout | `Program.cs:37-38` |

Decisiones del usuario: rotar `sa`, secretos a env/user-secrets, poller ON u OFF.

### 3.2 SAMBHS — bloqueantes de merge (intactos) + faltantes reales
- **Bloqueante 1:** borrar `_backup_cierre_ciclo/` y `_backup_tipificacion/` de la rama.
- **Bloqueante 2:** modal sin salida en `frmTipificarEgreso` desde venta rápida con BD caída
  (Cancel del retry sin `this.Close()`) — fix de 1 línea.
- ALTA (antes del flag ON): edición HONORARIO no transaccional (`Destipificar`+`Tipificar` en 2
  conexiones sin TRAN).
- MEDIA: **faltan los DELETE** — "quitar tipificación" y "anular compra" (2.1); estado "tipificado"
  invisible en el grid de bandeja; SP síncrono por fila EC activada en hilo UI; `catch {}` silenciosos;
  sin permisos (cualquier usuario con flag ON).
- BAJA: cache estático tipo_gasto, `bool.TryParse` no acepta "1", `TryParseMonto` y separador de
  miles, coordenadas mágicas, `ApiBI` dormante.

### 3.3 Consistencia del universo caja (reemplaza al "hook de anulación" v1)
- **Disparador para `Consistencia`+`Destipificar`** (lo único que falta del ciclo de anulación):
  paso del poller, job o endpoint/botón admin. Cierra GASTO y el residuo grave HONORARIO por igual.
- Cosmético: fallback de `GetClasificacion` sin filtrar venta anulada.
- `sp_EgresoCaja_Bandeja` sigue huérfano: decidir si se convierte en la fuente del indicador
  "tipificado/pendiente" del grid SAMBHS, en una vista admin web, o se retira.

### 3.4 BD `conta` — integridad (intacta de la v1)
- ALTA: `sp_CostoPersonal_Upsert` permite editar montos ya PAGADOS; `sp_CostoPersonal_Pagar` acepta
  cualquier fecha (bug mayo→julio ya materializado; fix hoy solo en front). Remedio recomendado:
  sp/03 v2 (guard PAGADO + `EOMONTH` server-side + auditoría en Pagar + CHECK `n_Mes`) y RS2 PERSONAL
  del flujo agrupando por `n_Mes` (elimina el edge dic→ene).
- MEDIA: T2 no re-valida venta en dbo entre T1 y T2; carrera del upsert de entidad PERSONAL (cierre:
  unique filtrado por documento); upsert MEDICO dedupea por nombre.
- Sanidad confirmada: **cero drift en 13/13 SPs**, UX/UQ/FKs/CHECKs correctos, 0 huérfanos,
  RESEED impecable.

### 3.5 Web + API — deuda vigente (intacta de la v1, sin los ítems descartados)
- ALTA: bug UTC `today()` (desde las 19:00 Lima la fecha default es MAÑANA — egresos, honorarios,
  catálogos, SISOL); CostosPersonal blur-save con carrera y sin affordance (raíz de la confusión
  reportada).
- MEDIA: `FechaPago` sin validar en ninguna capa (par de 3.4); catálogos BD duplicados en constantes
  front (5 listas + secciones del flujo cerradas); `money` ×7; anulación de Egresos con
  `window.prompt` y default `'error de tipeo'` (unificar con el modal de Honorarios); API sin logging,
  `Connection Timeout=60000`, 0 DataAnnotations; manejador global expone internals.
- BAJA: dead code (ContaLogin, cajaIngresos/Egresos, soft-deletes), Compras one-shot y fuera del nav,
  endpoints sin consumidor (`saldos-banco` sin UI de captura), net6 EOL.

---

## 4. Descartado de la v1 (transparencia)

| Ítem v1 | Motivo del descarte |
|---|---|
| "Brecha total: web no puede tipificar T1/T2" | Por diseño: universo caja EC es del SAMBHS (modelo §1) |
| "Export cuadre pierde tipificación" | Decisión de producto: bruto ingreso/egreso |
| "ECF brecha de diseño" | En alcance y codificado; queda solo prueba dirigida pre-habilitación |
| "Falta PUT/PATCH" (sospecha a verificar) | PUT existe completo en web egresos y en SAMBHS T1/T2; el verbo ausente es DELETE (§2.1) |
| "Agregar filtros i_Eliminado en superficies" | Innecesario: cajamayor excluye anuladas en la fuente (822/822); el residuo real es HONORARIO y se cierra con el disparador de Consistencia (§2.2) |

---

## 5. Priorización v2 (propuesta — requiere OK para ejecutar)

| Fase | Contenido | Dueño |
|---|---|---|
| **P0 — Seguridad + merge** | Borrar `_backup_*`; fix modal (1 línea); decisiones: rotar `sa`, secretos a env, poller ON/OFF | orquestador + usuario |
| **P1 — Integridad BD** | sp/03 v2 (guard PAGADO, EOMONTH, auditoría, CHECK n_Mes) + flujo PERSONAL por `n_Mes`; unique filtrado entidad-documento | db-experto |
| **P2 — Ciclo de anulación caja** | Disparador Consistencia+Destipificar (job/poller/endpoint admin); fix fallback GetClasificacion; TRAN en edición HONORARIO SAMBHS | db + backend + SAMBHS |
| **P3 — UX/robustez** | `todayLima()` único; UX CostosPersonal (dirty-check, sin carrera); modal de motivo unificado; DELETE en SAMBHS (quitar tipificación / anular compra) e indicador "tipificado" en bandeja — según prioridad del usuario | bi-frontend + SAMBHS |
| **P4 — Housekeeping** | Dead code, catálogos, `money` único, logging API, timeouts, prueba dirigida ECF antes de habilitar la serie | todos |

## 6. Correcciones de memoria pendientes (corrida `continual-learning`)
- `api-conta.md`: poller NO "nace false" (repo `true`/`Escritura` desde `d6eec0a`); documentar
  `GET /caja/flujo-detallado`; explicitar el modelo de dos universos y que `sp_EgresoCaja_*` no tienen
  (ni requieren) endpoint.
- `modelo-negocio`: registrar las decisiones de producto de esta sesión: export cuadre = bruto;
  ECA y ECF ambos se tipifican desde SAMBHS; web = universo "otros egresos", sin reconciliar caja EC.
- `frontend-react.md`: cifra "50/50 llamadas" desactualizada.

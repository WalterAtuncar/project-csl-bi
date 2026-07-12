# PLAN — LOGIN UNIFICADO DEL BI (identidad legacy + autorización conta)

**Objetivo:** que los usuarios entren al BI con el **mismo usuario y contraseña del sistema desktop
(legacy)**, y que ese único login resuelva a la vez: (a) el `userData` legacy que las pantallas
actuales del BI necesitan, y (b) el JWT del API conta con su rol (SA/GERENTE/CONTABILIDAD) vía una
**tabla intermedia** que amarra el usuario legacy → rol conta. La tabla intermedia es además el
**whitelist**: no todos los usuarios del legacy entran al BI, solo los vinculados por el SA.

**Restricciones invariantes:** cero cambios al backend legacy (8183); cero `ALTER` sobre `dbo`
(el amarre vive en `conta`, que es nuestro schema); las llamadas actuales del front al API legacy
no cambian; el API conta conserva su JWT y autorización tal cual.

Relacionados: `PLAN_PLATAFORMA_FINANCIERA_CONTA.md` (plan maestro), `LOG_EJECUCION_CONTA.md`
(log de ejecución y GATEs previos).

---

## 1. HALLAZGOS VERIFICADOS (evidencia, 2026-07-11/12)

| # | Hallazgo | Evidencia |
|---|---|---|
| H1 | El API legacy (8183) **no valida token**: es abierto | `GET /api/Caja/caja-mayor/tipos-caja` y `GET /api/PagoMedicos/info` responden **200 con datos sin header Authorization** (y con token basura, igual) |
| H2 | El login legacy **no emite token** | Respuesta trae `"token":null`; `LoginResponse` del front no tiene campo token; `isAuthenticated=true` se pone client-side |
| H3 | `/Auth/Login` existe y valida input | `POST` con body vacío → 400. Payload real: `{nodeId, user, password}`; `nodeId=9` hardcodeado en `AuthService.ts` |
| H4 | El objeto que devuelve el legacy | `objModel`: `i_SystemUserId, v_UserName, i_RoleId, v_PersonId, i_RolVentaId, i_ProfesionId` |
| H5 | `systemuser` es consultable desde la conexión conta | Cross-DB `SigesoftDesarrollo_2.dbo.systemuser` (misma instancia). Columnas clave: `i_SystemUserId, v_UserName, v_PersonId, i_IsDeleted, i_SystemUserTypeId`. JOIN con `person` da nombre completo |
| H6 | Escala del padrón legacy | **93,201 usuarios activos** → la UI de cableado debe ser un buscador con filtro, jamás un combo |
| H7 | Colisión de username | Existe `sa` en legacy (`i_SystemUserId=11`) y `sa` LOCAL en conta → el endpoint debe definir orden de resolución |
| H8 | Dependencias internas de conta | `usuario_rol` tiene FK a `conta.usuario`; todos los SP de negocio auditan con el `IdUsuario` del JWT (`sub`) → **el usuario mapeado necesita fila en `conta.usuario`** |
| H9 | JWT conta | HS256, issuer `SanLorenzo.Contabilidad`, audience `SanLorenzo.BI`, 480 min (≈ las 8 h de sesión client-side del legacy: quedan alineadas) |

---

## 2. DECISIONES DE ARQUITECTURA

- **D1 — Orquestación en el backend conta (crítica de seguridad).** El legacy no devuelve ninguna
  prueba verificable de login (H2). Si el front orquestara (login legacy y luego "pedir token a
  conta por username"), cualquiera podría forjar la segunda llamada y llevarse un JWT. Por eso el
  login del BI es **un solo endpoint del API conta** (`/auth/login-bi`) que recibe las credenciales
  y **él mismo** llama server-to-server al `/Auth/Login` legacy. La contraseña transita, **nunca se
  almacena ni se loguea** en conta.
- **D2 — El amarre vive en `conta.usuario` extendida** (no en tabla separada). Por H8, el usuario
  mapeado necesita fila en `conta.usuario` (roles en `usuario_rol`, auditoría, `sub` del JWT). Se
  agregan columnas: `v_AuthOrigen ('LOCAL'|'LEGACY')`, `i_SystemUserIdLegacy`, `v_UsernameLegacy`.
  Para usuarios LEGACY, `v_PasswordHash = NULL` (no pueden loguear por la vía local). Todo lo ya
  construido (roles, auditoría, JWT, pantalla Usuarios) sigue intacto.
- **D3 — La clave del amarre es `i_SystemUserIdLegacy`, no el username.** El username legacy es
  editable en el desktop; el id es estable y el login legacy lo devuelve (H4). El username se
  guarda solo para mostrar. Índice ÚNICO filtrado sobre `i_SystemUserIdLegacy`.
- **D4 — Orden de resolución del login: LOCAL primero, luego LEGACY** (resuelve H7). Si el username
  coincide con un usuario LOCAL activo y el hash valida → entra como local (breakglass del `sa`).
  Si no, se delega al legacy. El `sa` local se **conserva**: si el 8183 está caído, el SA aún entra
  y administra.
- **D5 — Whitelist = vínculo.** Credenciales legacy válidas pero sin fila vinculada activa → `403`
  con mensaje claro ("sin acceso al BI"). Baja automática: si desactivan al usuario en el desktop,
  el legacy rechaza el login y su acceso BI muere solo.
- **D6 — El front guarda las DOS sesiones de un solo login.** La respuesta de `/auth/login-bi`
  incluye el objeto legacy **íntegro** (`LegacyUser`) → el front puebla `userData` (idéntico a hoy;
  las pantallas legacy como `CajaMayor.tsx` que leen `userData.systemUserId` no se tocan) **y**
  `conta_token`/`conta_user` → entra a `/conta/*` sin segundo login.

---

## 3. DISEÑO TÉCNICO

### 3.1 Modelo de datos (DDL — `script-conta/ddl/08_login_unificado.sql`)

```sql
-- conta es nuestro schema: ALTER permitido (la regla de no-ALTER es solo para dbo)
ALTER TABLE conta.usuario ADD v_AuthOrigen VARCHAR(10) NOT NULL
    CONSTRAINT DF_usuario_AuthOrigen DEFAULT 'LOCAL';
ALTER TABLE conta.usuario ADD i_SystemUserIdLegacy INT NULL;
ALTER TABLE conta.usuario ADD v_UsernameLegacy VARCHAR(50) NULL;

-- un usuario legacy solo puede estar vinculado una vez (índice único filtrado, SQL 2012 OK)
CREATE UNIQUE INDEX UX_usuario_SystemUserIdLegacy
    ON conta.usuario(i_SystemUserIdLegacy) WHERE i_SystemUserIdLegacy IS NOT NULL;

-- coherencia: LOCAL exige hash; LEGACY exige id legacy
ALTER TABLE conta.usuario ADD CONSTRAINT CK_usuario_Origen CHECK (
    (v_AuthOrigen = 'LOCAL'  AND v_PasswordHash IS NOT NULL)
 OR (v_AuthOrigen = 'LEGACY' AND i_SystemUserIdLegacy IS NOT NULL));
```

Los usuarios existentes (`sa`, `gerente`) quedan `LOCAL` por el DEFAULT — sin migración de datos.

### 3.2 Stored procedures (`script-conta/sp/09_login_unificado.sql`)

| SP | Rol | Descripción |
|---|---|---|
| `sp_Auth_LoginBiLookup` | interno | Dado `@SystemUserIdLegacy`, devuelve usuario conta activo + roles (para emitir JWT tras validar en legacy). Actualiza `t_UltimoLogin` |
| `sp_Auth_LegacyBuscar` | SA | `@Filtro` → TOP 20 de `systemuser` (i_IsDeleted=0) JOIN `person`, `LIKE` sobre username y nombre; devuelve flag `YaVinculado`. **Solo SELECT cross-DB — cero alteración del legacy** |
| `sp_Auth_Vincular` | SA | Crea fila `conta.usuario` origen LEGACY (`@SystemUserId,@Username,@Nombre,@Roles` CSV) + `usuario_rol` + auditoría. Si ya existe inactiva → reactiva. Duplicado activo → RAISERROR |
| `sp_Auth_VinculoUpdate` | SA | Cambia roles / activa-desactiva un vinculado + auditoría |
| `sp_Auth_Usuarios` (existente) | SA | Se extiende para devolver `v_AuthOrigen`, `v_UsernameLegacy` |

### 3.3 Contrato del API conta

**`POST /api/conta/auth/login-bi`** (anónimo) — body `{ "Username": "...", "Password": "..." }`

Flujo: ① lookup LOCAL (username + PBKDF2) → si valida, login local (respuesta sin `LegacyUser`).
② Si no, `POST {Legacy:BaseUrl}/Auth/Login` con `{nodeId: Legacy:NodeId, user, password}` y timeout
`Legacy:TimeoutSeconds`. ③ `status=1` → `sp_Auth_LoginBiLookup(i_SystemUserId)`.

| Caso | HTTP | Respuesta |
|---|---|---|
| OK (local o legacy vinculado) | 200 | `{ Token, IdUsuario, Username, Nombre, Roles[], LegacyUser: {i_SystemUserId, v_UserName, i_RoleId, v_PersonId, i_RolVentaId, i_ProfesionId} \| null }` |
| Credenciales inválidas | 401 | `{ message }` |
| Válidas pero sin vínculo activo | 403 | `{ message: "Credenciales válidas, pero sin acceso al BI. Solicite acceso al administrador." }` |
| Legacy no disponible (timeout/5xx) | 503 | `{ message: "Sistema de autenticación no disponible" }` |

**Endpoints SA** (JWT + `[Authorize(Roles="SA")]`):

- `GET  /api/conta/auth/legacy-usuarios?filtro=xxx` → `[{ i_SystemUserId, v_UserName, Nombre, YaVinculado }]` (mín. 3 caracteres)
- `POST /api/conta/auth/vincular` → `{ SystemUserId, Username, Nombre, Roles }`
- `PUT  /api/conta/auth/vincular` → `{ IdUsuario, Roles, Activo }`

**`appsettings.json`** (sección nueva):

```json
"Legacy": { "BaseUrl": "http://190.116.90.35:8183/api", "NodeId": 9, "TimeoutSeconds": 10 }
```

`LegacyAuthClient` = `HttpClient` tipado registrado con `AddHttpClient` (timeout de la config).
La contraseña jamás se escribe en logs ni en auditoría.

### 3.4 Flujo de secuencia (login unificado)

```
Usuario ──credenciales──> Front (Login.tsx)
Front ──POST /auth/login-bi──> API conta
  API conta: ¿LOCAL? ──sí──> valida PBKDF2 ──> JWT (sin LegacyUser)
             └─no──> POST /Auth/Login (legacy, server-to-server)
                       ├─ status=0 ──> 401
                       └─ status=1 ──> lookup vínculo (i_SystemUserId)
                                        ├─ sin vínculo ──> 403
                                        └─ vinculado ──> JWT conta + LegacyUser íntegro
Front: guarda userData(LegacyUser) + conta_token + conta_user
  → pantallas legacy usan userData (idéntico a hoy)
  → /conta/* usa conta_token (sin segundo login)
```

### 3.5 Front — archivos exactos a tocar

| Archivo | Cambio |
|---|---|
| `services/contabilidad/ContabilidadService.ts` | Método `loginBi(user, pass)`; tras 200 guarda `conta_token`/`conta_user` y devuelve `LegacyUser` |
| `services/contabilidad/contaTypes.ts` | Tipos `LoginBiResponse`, `LegacyUsuarioBusqueda` |
| `pages/Login/Login.tsx` | Llama `loginBi` en lugar de `authService.login`; con `LegacyUser` puebla `userData` (mismo shape actual); maneja 403/503 con mensajes claros |
| `services/AuthService.ts` | Se añade `saveUserDataFromLegacy(legacyUser)` público (el shape `UserData` no cambia) |
| `components/ProtectedRoute.tsx`, `hooks/useAuth.ts`, `utils/auth.ts` | **Sin cambios** (siguen leyendo `userData`) |
| `context/ContaAuthContext.tsx` | Sin cambios de contrato (lee `conta_token` ya sembrado) |
| `pages/Contabilidad/ContaLogin.tsx` | Queda como **breakglass** (login LOCAL directo, p. ej. `sa`) |
| `pages/Contabilidad/Usuarios.tsx` | Sección "Vincular usuario del sistema" (FASE 3) |

---

## 4. FASES

### FASE 0 — BD: DDL del amarre + SPs (≈ 0.5 día)
1. `ddl/08_login_unificado.sql` (§3.1) aplicado vía db-console.
2. `sp/09_login_unificado.sql` (§3.2) aplicado.
3. Prueba de SPs por db-console: `sp_Auth_LegacyBuscar('sali')` devuelve resultados con
   `YaVinculado=0`; `sp_Auth_Vincular` con un usuario de prueba → fila LEGACY + roles; re-vincular
   → RAISERROR; `sp_Auth_VinculoUpdate` desactiva; limpiar datos de prueba.

**GATE 0:** columnas + índice único + CHECK creados; `sa`/`gerente` intactos como LOCAL;
SPs probados y datos de prueba limpiados; **cero objetos nuevos fuera de `conta`**.

### FASE 1 — API conta: endpoint orquestador + endpoints SA (≈ 1 día)
1. `LegacyAuthClient` (HttpClient tipado + config `Legacy`).
2. `POST /auth/login-bi` con la resolución D4 y la matriz de respuestas §3.3.
3. `GET /auth/legacy-usuarios`, `POST/PUT /auth/vincular` (SA-only).
4. DTOs + repositorio (`AuthRepository`) + registro DI.

**GATE 1 (matriz curl):** ① `sa` local → 200 sin `LegacyUser`; ② usuario desktop vinculado → 200
con `LegacyUser` completo; ③ usuario desktop NO vinculado → 403; ④ clave mala → 401; ⑤ legacy
caído (BaseUrl inválida en un run de prueba) → 503; ⑥ `legacy-usuarios` con token GERENTE → 403;
⑦ la contraseña no aparece en ningún log.

### FASE 2 — Front: login unificado (≈ 0.5–1 día)
1. `loginBi` en `ContabilidadService` + tipos.
2. `Login.tsx`: una sola pantalla → puebla `userData` + sesión conta; mensajes específicos
   401/403/503.
3. `ContaLogin` queda como breakglass; opcional: banner "usar el login principal".
4. `npx vite build` limpio.

**GATE 2:** login con usuario desktop vinculado → entra al dashboard legacy (pantallas con
`userData.systemUserId` funcionan) **y** navega a `/conta/caja` sin re-login; usuario no vinculado
→ mensaje claro y no entra; `sa` sigue entrando por ContaLogin aunque el 8183 esté caído.

### FASE 3 — UI de cableado (pantalla Usuarios, SA-only) (≈ 0.5–1 día)
1. Buscador de usuarios legacy: debounce, mínimo 3 caracteres, TOP 20, muestra
   username + nombre + flag "ya vinculado" (H6: 93k usuarios → nunca combo).
2. Vincular: elegir rol(es) conta → guardar; editar roles / activar-desactivar vinculados.
3. La lista de usuarios muestra ahora columna Origen (LOCAL/LEGACY).

**GATE 3:** vincular un usuario real → puede loguear de inmediato con su clave del desktop;
duplicado manejado con mensaje; GERENTE/CONTABILIDAD no ven la sección (API y UI).

### FASE 4 — E2E, docs y rollout (≈ 0.5 día)
1. E2E con un usuario real del desktop (el SA lo vincula desde la UI).
2. **Rollout de usuarios actuales**: antes de publicar el front, el SA vincula a las personas que
   hoy usan el BI (si no, quedarían fuera por el whitelist — comportamiento deseado pero hay que
   secuenciarlo). Runbook corto para el SA en esta sección del LOG.
3. Actualizar `LOG_EJECUCION_CONTA.md` (sección login unificado) y README de `script-conta/`.
4. Commit + push.

**GATE 4 (aceptación global):**
- [ ] Un solo login con credenciales del desktop resuelve BI legacy + módulo conta.
- [ ] Whitelist operativo (no vinculado = no entra) y baja automática vía desktop verificada.
- [ ] `sa` breakglass funciona con el legacy caído.
- [ ] Cero cambios en backend legacy y cero `ALTER` sobre `dbo` (solo SELECT cross-DB).
- [ ] Contraseñas: nunca almacenadas ni logueadas en conta.
- [ ] Todo versionado y pusheado; scripts = producción.

---

## 5. SEGURIDAD (resumen)

- La contraseña viaja front→conta→legacy y **no se persiste ni loguea** en conta (revisar
  middleware de errores para que jamás serialice el body del login).
- Hoy el transporte es HTTP (igual que el flujo actual del front al 8183 — sin regresión);
  en producción: HTTPS al menos front→conta.
- El API legacy sigue **abierto** (H1) — agujero pre-existente, fuera del alcance de este plan;
  anotado para producción (gateway que valide el JWT conta o restricción de red).
- Rate-limiting del `login-bi`: opcional (el legacy no lo tiene); se puede añadir un
  lockout simple por username/IP en memoria si se desea endurecer.

## 6. CONTINGENCIA / ROLLBACK

- DDL es **aditivo** (columnas nullable + default): rollback funcional = publicar el front
  anterior (login legacy directo); no hay que revertir BD.
- El endpoint `login-bi` convive con `/auth/login` (LOCAL) — ContaLogin siempre disponible.
- Si el 8183 cambia de contrato/URL: solo se ajusta la sección `Legacy` de `appsettings`.

## 7. FUERA DE ALCANCE (explícito)

- Cerrar/autenticar el API legacy (8183).
- SSO con la aplicación desktop (no hay federación posible: el desktop valida contra su propia BD).
- Migración de los ~100 endpoints legacy al API conta (decisión previa: a futuro).
- HTTPS/certificados del despliegue.

## 7-bis. ESTADO DE EJECUCIÓN (2026-07-12)

| Fase | Estado | Commit | Notas |
|---|---|---|---|
| 0 — DDL + SPs | ✅ hecho | `408d378` | GATE 0 probado por db-console (buscar/vincular/lookup/duplicado/desactivar/reactivar); datos de prueba limpiados |
| 1 — API (login-bi, vincular) | ✅ hecho | `c023bec` | GATE 1: casos 1 (sa local 200), 4 (401), 5 (503 + breakglass), 6 (SA 200 / GERENTE 403), 7 (password no logueada) verificados por curl |
| 2 — Front login unificado | ✅ hecho | `9645e3e` | `loginBi` + `saveUserDataFromLegacy`; una sola pantalla; front compila |
| 3 — UI de cableado | ✅ hecho | `829f6b2` | Buscador + vincular en Usuarios (SA); columna Origen; fix toggle de roles (v_Nombre) |
| 4 — E2E + rollout + docs | 🔶 parcial | (este) | Docs actualizadas. Falta la E2E del happy-path con una credencial real del desktop y el rollout (vincular usuarios reales) — dependen del usuario |

### Pendiente (depende del usuario)

1. **E2E happy-path**: un usuario real del desktop vinculado por el SA debe (a) loguear en el BI con
   su clave del desktop, (b) entrar al dashboard legacy y (c) navegar a `/conta` sin re-login.
   Requiere UNA credencial real (usuario+clave del desktop) que solo el usuario tiene. Los casos que
   no requieren secreto ya se verificaron (GATE 1).
2. **Rollout**: el SA vincula desde la UI (Usuarios → Vincular usuario del sistema) a las personas
   que hoy usan el BI, **antes** de publicar el front nuevo (si no, quedan fuera por el whitelist —
   comportamiento deseado, pero hay que secuenciarlo). Decisión de negocio (quién entra, con qué rol).

## 8. RESUMEN DE FASES (tracking del ejecutor)

| Fase | Entregable | Dependencia | GATE |
|---|---|---|---|
| 0 | DDL amarre + SPs (`ddl/08`, `sp/09`) | — | SPs probados, cero fuera de conta |
| 1 | `login-bi` + endpoints SA en API conta | 0 | Matriz curl 7 casos |
| 2 | Login unificado en front | 1 | E2E dual (legacy + conta) sin re-login |
| 3 | UI cableado en Usuarios | 1 | Vincular usuario real y loguear |
| 4 | E2E + rollout + docs + push | 2,3 | Aceptación global |

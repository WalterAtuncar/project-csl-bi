# PLAN — Curación de la fuga "(SIN CLASIFICAR)" en Rentabilidad por Consultorio

**Fecha de diseño:** 2026-07-12 · **Estado:** APROBADO PARA EJECUCIÓN (aún no ejecutado)
**Base:** verificación en producción de la hipótesis del usuario (split por palote) + causa raíz
descubierta (caso probado CHAUPE), 2026-07-12. **Plan padre:** `PLAN_RENTABILIDAD_CONSULTORIO.md`
(ejecutado; este plan modifica SOLO el SP de esa feature).

---

## 0. Objetivo y alcance

Reducir la fila "(SIN CLASIFICAR)" del grupo **ASISTENCIAL** en `conta.sp_Rentabilidad_PorConsultorio`
de **54,562.58 (19.6% del grupo, jun-2026)** a **≤ 10,000 (< 3.6%)**, con 4 capas de rescate en
orden de certeza (determinista → heurística). **Solo cambia el SP (FASE única de BD): los shapes de
RS1/RS2, el endpoint y el front ya desplegados NO se tocan.**

Fuera de alcance (anotado en §6): el SIN CLASIFICAR **ocupacional** (contrato EDP "Campamento El
Galeno" — F001-00004133 y hermanas — **no tiene liquidación en Sigesoft**; no hay dato que lo
clasifique, es un lump-sum recurrente).

## 1. Hallazgos verificados (2026-07-12) — el ejecutor NO debe re-descubrir esto

### 1.1 Formato real de `service.v_ComprobantePago` (¡trampas medidas!)

- Campo **nchar padded (DATALENGTH=200)**, tokens separados por `' | '` y **con `' | '` final
  SIEMPRE, incluso con un solo token** (`'B004-00084325 | '`).
  ⚠️ `LIKE '%|%'` da 88% de falsos multi-token por ese pipe final.
- Distribución (services 2026-03→07): 1 token = 99.79% · 2 tokens = 42 · 3 tokens = 2.
  Ejemplo con RSL en pos 2: `'B003-00036714 | RSL-16533543 |'`.

### 1.2 Causa raíz de las garantías (hipótesis del usuario: parcialmente confirmada)

- El split multi-token SÍ rescata comprobantes en posición 2+ (`B004-00086340`, `RSL-16533172` →
  services de HOSPITALIZACIÓN): **4,444.65 = 8.1% de la fuga**. Hay que hacerlo (Capa 1) y además
  beneficia de paso al puente ocupacional.
- PERO las garantías/pagos parciales de paquetes quirúrgicos (serie **RSL**,
  `venta.i_IdTipoDocumento=506`) **NUNCA se escriben en `v_ComprobantePago`**: el desktop registra
  solo el comprobante de la **liquidación final**. Caso probado: garantía `RSL-16533176` (12-jun,
  paciente CHAUPE) → su service SR000796631 tiene `cp='RSL-16533203 |'` (la liquidación del 15-jun).
  Verificado en 2025–2026 completo: esas referencias no existen en el campo en NINGUNA posición.
  `hospitalizacion.v_Comprobantes` existe pero está vacío en 2026.
- **El puente que SÍ las encuentra es por PACIENTE** (Capa 3):
  `venta.v_IdCliente → dbo.cliente.v_NroDocIdentificacion → SigesoftDesarrollo_2.dbo.person.v_DocNumber
  → service.v_PersonId` (igualdad, service acotado ±15d): **80.8% del monto huérfano (35,143.48)
  tiene service de procedencia 'H' del mismo paciente en la ventana.**

### 1.3 SIN_CONSULTORIO (6,624.42)

Protocolos con `i_Consultorio` NULL de fábrica: **"SALA DE OPERACIONES AMBULATORIA"**
(PR000001650, PR000003866 — 25 ventas / 6,127.80, proc 'A') y 2 de emergencia (186.44, proc 'E').
El grupo 403 NO tiene "Sala de Operaciones"; el consumo del paquete quirúrgico se mapea a
**HOSPITALIZACION (46)**.

### 1.4 Composición del irreductible actual (43,493.51 tras Capa 1)

GARANTIA paquete 17,330.52 · PAGO de paquete 12,008.50 · PRODUCTOS E INSUMOS FARMACEUTICOS
HOSPITALARIOS (B003/F003) 9,586.39 · Prod./Serv. Hospitalización 899.15 · menudeo (tópico, RX,
labs; máx 1,305.08 baciloscopia) 3,668.95.

### 1.5 Ventana ±15d: NO ampliar

Desfases reales de los matches: −4 a 0 días (el comprobante se emite al alta). Ampliar no rescata
garantías (no están en el campo, punto).

---

## 2. Diseño: 4 capas de rescate EN ORDEN (determinista antes que heurística)

Aplican SOLO a la rama ASISTENCIAL, sobre lo que va quedando sin clasificar. Cada capa consume; la
siguiente ve el residuo. El ingreso sigue saliendo SIEMPRE de `ventadetalle.d_Valor`.

| Capa | Regla | Rescata (jun) | Va a |
|---|---|---|---|
| **1** | **Multi-token**: Puente A contra TODOS los tokens de `v_ComprobantePago` (no solo el 1º), dedup por token `rn=1`. Aplicarlo TAMBIÉN al puente A ocupacional (drop-in). | 4,444.65 | consultorio del protocolo (regla H incluida) |
| **2** | **SIN_CONSULTORIO por protocolo**: si matcheó service pero `i_Consultorio IS NULL` y (`v_Procedencia='H'` — ya existe — **o `pr.v_Name LIKE 'SALA DE OPERACIONES%'`**) → 'HOSPITALIZACION'. (Los 2 casos proc 'E' / 186.44 se dejan sin clasificar: inmateriales.) | 5,823.06 | HOSPITALIZACION |
| **3** | **Puente C por paciente (solo hospitalización)**: para ventas aún SIN_SERVICE, si el MISMO paciente (DNI vía cliente→person) tiene un service con `v_Procedencia='H'` en ±15d de la venta → 'HOSPITALIZACION'. Dedup: el service 'H' de fecha más cercana. NO intentar otros consultorios por paciente (ambiguo: un paciente puede tener lab + consulta el mismo día). | ~35,143.48 | HOSPITALIZACION |
| **4** | **Heurística por descripción (última red)**: residuo con `vd.v_DescripcionProducto` LIKE `'%GARANT%'` / `'%PAQUETE%'` / `'%HOSPITALIZA%'` / `'%HOSPITALAR%'` → 'HOSPITALIZACION'. Es la única capa no determinista — negocio la respalda (garantías de paquete quirúrgico y farmacia hospitalaria = episodio de hospitalización). | mayoría del resto | HOSPITALIZACION |

Residuo esperado tras las 4 capas: **~2,000–6,000** (menudeo de tópico/labs, p.ej. baciloscopia
1,305.08) — queda en "(SIN CLASIFICAR)" y visible en RS2, como hasta ahora.

## 3. FASE ÚNICA — Base de datos (ejecutor: db-experto)

### 3.1 Qué se modifica

SOLO `conta.sp_Rentabilidad_PorConsultorio` (DROP/CREATE; backup de la definición viva a
scratchpad antes). La iTVF `fn_Rentabilidad_IngresosDetalleEx` NO cambia. Actualizar el repo
`models-DB/script-conta/sp/10_rentabilidad_consultorio.sql` == producción. **RS1 y RS2 conservan
columnas y valores de dominio EXACTOS** (el backend/front desplegados dependen de ellos): los
motivos de RS2 siguen siendo 'SIN_SERVICE'|'SIN_CONSULTORIO'|'SIN_LIQUIDACION' para el residuo.

### 3.2 Tokenizador SQL 2012 (validado en producción — usar EXACTAMENTE este, con sus blindajes)

Materializar UNA VEZ en `#tok` (services acotados por la ventana ±15d; el SP ya usa temp tables):

```sql
SELECT s.v_ServiceId, s.v_ProtocolId, s.d_ServiceDate,
       LTRIM(RTRIM(SUBSTRING(x.cp, n.number,
         CASE WHEN CHARINDEX('|', x.cp+'|', CASE WHEN n.number<1 THEN 1 ELSE n.number END) >= n.number
              THEN CHARINDEX('|', x.cp+'|', CASE WHEN n.number<1 THEN 1 ELSE n.number END) - n.number
              ELSE 0 END))) AS token
FROM SigesoftDesarrollo_2.dbo.service s
CROSS APPLY (SELECT LTRIM(RTRIM(s.v_ComprobantePago)) COLLATE DATABASE_DEFAULT AS cp) x
JOIN master.dbo.spt_values n
  ON n.type='P' AND n.number >= 1 AND n.number <= LEN(x.cp)
 AND (n.number = 1 OR SUBSTRING(x.cp, CASE WHEN n.number<2 THEN 1 ELSE n.number-1 END, 1) = '|')
WHERE s.d_ServiceDate >= @svcIni AND s.d_ServiceDate < @svcFin
  AND ISNULL(s.i_IsDeleted,0)=0 AND s.v_ComprobantePago IS NOT NULL
  AND LTRIM(RTRIM(s.v_ComprobantePago)) <> ''
-- luego: filtrar token <> '' y dedup ROW_NUMBER() OVER (PARTITION BY token ORDER BY d_ServiceDate DESC, v_ServiceId DESC)
```

**Trampas que YA dolieron (no re-aprenderlas):**
1. El `CASE` de blindaje en CHARINDEX es OBLIGATORIO: sin él, SUBSTRING recibe longitud negativa y
   explota con "Invalid length parameter" **dependiendo del plan de ejecución** (a veces corre, a
   veces no).
2. NO contar pipes con `LEN(REPLACE(...))` (LEN ignora espacios finales y sobrecuenta) — si se
   necesita posición, usar DATALENGTH/2.
3. NO dejar el tokenizado como CTE re-evaluable (timeout >120s cuando se referencia N veces):
   materializar en `#tok` una sola vez.
4. JAMÁS `LIKE` cross-DB contra `v_ComprobantePago`.

### 3.3 Puente C (Capa 3) — esqueleto

```sql
-- Para ventas asistenciales aún sin clasificar tras capas 1-2:
SELECT v.v_IdVenta, s.v_ServiceId,
       ROW_NUMBER() OVER (PARTITION BY v.v_IdVenta
                          ORDER BY ABS(DATEDIFF(DAY, v.t_InsertaFecha, s.d_ServiceDate)), s.v_ServiceId DESC) AS rn
FROM #ventas_sin_clasificar v
JOIN dbo.cliente cl ON cl.v_IdCliente = v.v_IdCliente
JOIN SigesoftDesarrollo_2.dbo.person p
     ON p.v_DocNumber = cl.v_NroDocIdentificacion COLLATE DATABASE_DEFAULT
JOIN SigesoftDesarrollo_2.dbo.service s
     ON s.v_PersonId = p.v_PersonId AND ISNULL(s.i_IsDeleted,0) = 0
JOIN SigesoftDesarrollo_2.dbo.protocol pr
     ON pr.v_ProtocolId = s.v_ProtocolId AND pr.v_Procedencia = 'H'      -- SOLO hospitalización
WHERE s.d_ServiceDate >= DATEADD(DAY,-15,v.FechaVenta) AND s.d_ServiceDate < DATEADD(DAY,16,v.FechaVenta)
-- rn=1 → clasificar la venta como HOSPITALIZACION
```
(Verificar los nombres exactos de columnas de `dbo.cliente` en vivo; el puente por DNI fue validado
con datos: cliente.v_NroDocIdentificacion ↔ person.v_DocNumber.)

### 3.4 GATE — evidencia obligatoria (jun-2026, flag=1, salvo indicación)

| # | Prueba | Esperado |
|---|---|---|
| G1 | **GATE REY intacto**: SUM(RS1 todo) vs `fn_Rentabilidad_IngresosEx(2026,6,@flag)` para flag 1 y 0; y may-2026 | **Δ=0 al centavo** (las capas REDISTRIBUYEN, jamás crean/pierden ingreso) |
| G2 | TOTAL ASISTENCIAL | **278,397.77** sin cambio |
| G3 | "(SIN CLASIFICAR)" asistencial | **≤ 10,000** (desde 54,562.58; esperado ~2–6k) |
| G4 | Referencias del usuario clasificadas | `B004-00086340` y `RSL-16533172` (Capa 1), `RSL-16533210`/`RSL-16533280`/`F004-00010368` (Capa 2), `RSL-16533176` caso CHAUPE (Capa 3) → todas en HOSPITALIZACION; verificar que ya NO aparecen en RS2 |
| G5 | HOSPITALIZACION crece coherente | ≈ 56,682 + rescates (~100k; computar en vivo, es informativo) y ningún otro consultorio pierde monto |
| G6 | RS2 residual | Compuesto por farmacia hospitalaria B003/F003 residual y menudeo; motivos del dominio actual; TOP 50 sigue funcionando |
| G7 | Ocupacional | TOTAL 168,065.60 sin cambio; el multi-token no altera su clasificado (o lo mejora — reportar delta) |
| G8 | Performance | SP < 5s (hoy ~0.9s; el tokenizador y puente C están acotados) |
| G9 | Shape | RS1/RS2 columnas idénticas (el endpoint/front desplegados no se tocan); intocables sin bump de `modify_date` |

### 3.5 Verificación E2E (orquestador)

Reiniciar API NO es necesario (solo cambió el SP) — curl directo a
`/rentabilidad/por-consultorio?anio=2026&mes=6`: reconciliación Δ=0, SIN CLASIFICAR ≤10k, y las
referencias G4 ausentes del `SinClasificar`. Refresco visual de `/conta/rentabilidad` por el usuario.

## 4. Commit

`fix(conta): curacion de fuga sin-clasificar en rentabilidad por consultorio (multi-token, sala-ops, puente paciente, heuristica)`
— incluye `10_rentabilidad_consultorio.sql` + este PLAN. Registrar en `LOG_EJECUCION_CONTA.md`.

## 5. Anti-objetivos

- NO cambiar shape/dominios de RS1/RS2 (backend/front desplegados). NO tocar la iTVF ni ningún otro objeto.
- NO ampliar la ventana ±15d (verificado innecesario). NO Puente C hacia consultorios ≠ HOSPITALIZACION (ambiguo).
- NO aplicar capas al grupo OCUPACIONAL (su SIN CLASIFICAR es el EDP sin liquidación — irresoluble por datos, §6).
- NO crear/perder ingreso: toda capa redistribuye (G1 es sagrado). SQL 2012 estricto; Sigesoft/dbo SOLO SELECT.

## 6. Futuras (NO implementar)

- EDP "El Galeno" (ocupacional): requiere que el desktop registre liquidaciones por servicio, o una
  regla de negocio del usuario (p.ej. mapear ese contrato a un consultorio fijo).
- Los 2 casos proc 'E' (186.44) si negocio valida 'EMERGENCIA MEDICINA GENERAL' (grupo 403 id 47).
- Farmacia hospitalaria B003/F003 residual: evaluar si debe ser consultorio propio ("FARMACIA
  HOSPITALARIA") en vez de HOSPITALIZACION vía heurística.

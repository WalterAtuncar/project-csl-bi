# PLAN — Beneficiario del efectivo persistente (separar rendidor vs proveedor del comprobante)

**Fecha:** 2026-07-25 · **Ejecutor:** Opus (orquestador) · Contexto: schema `conta` (overlay aditivo), NO SAMBHS.

## 1. Problema / decisión (aprobada por el PO)

El egreso de caja tiene DOS roles distintos que hoy comparten un solo slot de receptor
(`i_IdProveedor` XOR `i_IdEntidad`):
1. **Quien recibió el efectivo** (rendidor — personal del sistema, momento T1). Control/rendición.
2. **El proveedor del comprobante** (momento T2, `RegistrarCompra`). Atribución contable/tributaria.

Al registrar la compra (T2) con un proveedor, `RegistrarCompra` hace `SET i_IdEntidad=@IdEntidad,
i_IdProveedor=@IdProveedor` → **sobrescribe** el receptor y la persona (rendidor) se pierde del overlay
(aunque siga en `dbo.venta.v_IdCliente`). **Decisión:** preservar ambos con un campo persistente
`i_IdBeneficiarioEfectivo` que se puebla en T1 y NUNCA se toca en T2.

## 2. Análisis de impacto (mapa de consumidores del overlay — verificado por grep)

| Objeto | Uso | Cambio |
|---|---|---|
| `sp_EgresoCaja_Tipificar` (sp/18) | INSERT overlay | **SÍ: poblar** `i_IdBeneficiarioEfectivo` |
| `sp_EgresoCaja_GetClasificacion` (sp/19) | lee p/form | **SÍ: exponer** `i_IdBeneficiarioEfectivo` + nombre |
| `sp_EgresoCaja_RegistrarCompra` (sp/19) | UPDATE receptor+compra | **NO** (no lo referencia → persiste). Verificar que sigue sin tocarlo. |
| `sp_EgresoCaja_ActualizarTipificacion` (sp/19) | UPDATE receptor | **NO** (no lo referencia → persiste) |
| `sp_EgresoCaja_Bandeja` (sp/19) | lista egresos | **SÍ (exposición):** nombre del beneficiario |
| `sp_Caja_CuadreDia` (sp/04, RS2 egresos) | LEFT JOIN overlay | **SÍ (exposición):** `Beneficiario` junto a `Receptor` |
| `sp/04` (otros RS), `sp_Rentabilidad*` (sp/05), `fn_Dashboard_base` (fn/14) | LEFT JOIN overlay (montos/centro) | **NO** (no hacen SELECT *; columna nullable no sumada → invariancia intacta). Verificar sin regresión. |

**Regla de oro:** el overlay RE-ETIQUETA, jamás cambia montos. La columna nueva es DOCUMENTAL/atributiva,
nunca entra a un SUM. Invariancia de las 6 superficies debe seguir al centavo.

## 3. Diseño

`i_IdBeneficiarioEfectivo INT NULL` en `conta.egreso_caja_clasificacion`, FK a `conta.entidad(i_IdEntidad)`
(la persona/rendidor = entidad `v_Tipo='PERSONAL'` derivada del beneficiario de la venta EC).
- **T1 (Tipificar):**
  - Rama GASTO: derivar SIEMPRE el beneficiario-persona de la venta (`dbo.cliente` por `v_IdCliente`,
    upsert entidad PERSONAL por documento — mismo helper de F1) y setear `i_IdBeneficiarioEfectivo`.
    El receptor (`i_IdEntidad`/`i_IdProveedor`) mantiene su lógica actual (si no hay receptor explícito,
    `i_IdEntidad` = ese mismo beneficiario, provisional).
  - Rama HONORARIO: `i_IdBeneficiarioEfectivo` = el médico (`@IdEnt`) — quien recibe el pago.
- **T2 (RegistrarCompra) y edición:** NO tocan `i_IdBeneficiarioEfectivo` → persiste. El receptor evoluciona
  a proveedor; el rendidor queda registrado aparte.

## 4. Fases (ejecución)

- **F1 — `ddl/17_beneficiario_efectivo.sql`** (db-experto): `ALTER TABLE conta.egreso_caja_clasificacion
  ADD i_IdBeneficiarioEfectivo INT NULL` (IF NOT EXISTS) + `FK_ecc_benefefectivo` → `conta.entidad`
  + índice de apoyo. Aplicar en prod, evidenciar.
- **F2 — `sp_EgresoCaja_Tipificar`** (db-experto, portar de sys.sql_modules): poblar la columna en GASTO
  (derivar beneficiario SIEMPRE) y HONORARIO (= médico). Refactor: derivar el beneficiario una sola vez
  y usarlo para (a) `i_IdBeneficiarioEfectivo` (siempre) y (b) receptor provisional (si no hay explícito).
- **F3 — `sp_EgresoCaja_GetClasificacion`**: += `i_IdBeneficiarioEfectivo` + `BeneficiarioNombre`
  (JOIN `conta.entidad`).
- **F4 — exposición:** `sp_EgresoCaja_Bandeja` += `Beneficiario`; `sp_Caja_CuadreDia` RS2 += `Beneficiario`
  (LEFT JOIN entidad por `i_IdBeneficiarioEfectivo`), invariante (rama overlay-vacío devuelve NULL).
- **F5 — web (opcional):** API `CuadreDiaEgresoDto += Beneficiario`; front muestra "Rendido por: X" junto
  al Receptor. (El SAMBHS ya muestra el beneficiario desde la venta; no requiere cambio.)
- **GATES:** (G1) T1 puebla `i_IdBeneficiarioEfectivo`; (G2) T2 cambia receptor a proveedor pero
  `i_IdBeneficiarioEfectivo` **persiste**; (G3) montos invariantes al centavo (6 superficies) antes/después;
  (G4) `RegistrarCompra`/`ActualizarTipificacion`/consumidores sin regresión; (G5) limpieza + RESEED.

## 5. Reglas duras

- SQL 2012; portar SPs de `sys.sql_modules` (prod puede adelantar al repo); actualizar el .sql tras aplicar.
- La BD es producción: probar → evidenciar → limpiar + RESEED al MAX vivo.
- Aditivo puro en `conta`; cero DDL sobre `dbo`; el overlay jamás cambia montos.
- Nada de push/deploy sin OK del usuario.

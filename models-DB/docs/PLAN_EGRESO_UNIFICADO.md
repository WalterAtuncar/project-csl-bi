# PLAN — Egreso unificado (proveedor + entidad, periodo, estado inicial) y soft delete de Compras

> **Para el ejecutor.** Cadena: `db-experto` (SP + catálogo + GATEs) → `backend-api` (endpoint
> proveedores + create extendido) → `bi-frontend` (modal unificado + sidebar). El orquestador
> verifica GATEs e integra. Leer antes: `.claude/memory/00-INDICE.md`, `modelo-negocio.md`
> (§Egresos), `reglas-sql2012.md`. Análisis de origen: conversación 2026-07-13 (validado por el
> usuario: "me parece que /conta/egresos debe registrar tanto el egreso como el registro de
> compras... quitamos el page de registro de compras del sidebar").

---

## 1. Objetivo

`/conta/egresos` se vuelve **el único punto de registro de salidas**:

1. El modal "Nuevo egreso" permite elegir el **receptor por tipo**: **PROVEEDOR**
   (`dbo.proveedores` — el caso "compra") o **ENTIDAD** (`conta.entidad` — asociados/convenios).
2. Se agrega **selector de periodo (año/mes)** que gobierna la fecha de documento (el periodo
   contable sigue DERIVADO de las fechas — ver D2).
3. Se agrega **estado inicial**: `POR_PAGAR` (default) o `PAGADO` (pide fecha de pago + forma
   de pago) — imprescindible para la carga histórica.
4. La página **Registro de Compras sale del sidebar** (soft delete, patrón rentabilidad-unidades);
   la bandeja de clasificación queda intacta en disco/BD para cuando exista el feed fiscal.
5. **El modal se hace MÁS ANCHO**: hay props con textos extensos (tipos de gasto, entidades) que
   hoy salen recortados (ver D6).

## 2. Datos duros que sustentan el diseño (producción, 2026-07-13)

- `dbo.registro_compras` = **0 filas** (el feed fiscal nunca se pobló); `conta.compra_ext` = 0;
  `conta.egreso` = 0 (demo); `dbo.proveedores` = **18** (incluye CLINICA CALIFORNIA sembrado).
- ⇒ quitar Compras del sidebar no rompe ningún flujo operativo real hoy.
- El modelo YA está preparado: `conta.egreso` tiene ambos receptores con
  `CK_egreso_receptor` (al menos uno); `sp_Egreso_Insert` y `sp_Egreso_Update` ya aceptan
  `@IdProveedor`; `sp_Egreso_Get` devuelve `e.*` (ids incluidos); `sp_Egreso_List` ya trae
  `Receptor` COALESCE(proveedor, entidad).

## 3. Decisiones de diseño (NO reabrir sin causa)

| # | Decisión | Porqué |
|---|---|---|
| **D1** | El discriminador es el **tipo de receptor** (PROVEEDOR/ENTIDAD), un toggle en el modal. En BD no cambia nada: mismos dos FKs, mismo CHECK. La UI fuerza exactamente uno (elegir uno limpia el otro). | El modelo ya lo soporta; "compra" = egreso a proveedor. |
| **D2** | **NO se agrega columna periodo** a `conta.egreso`. El periodo sigue derivado: rentabilidad = mes de `t_FechaDocumento`, caja = mes de `t_FechaPago`. El selector año/mes del modal es AYUDA DE CAPTURA: fija el rango permitido del date-input de documento (min/max = primer/último día del mes) y su default. | Dos verdades divergen; los motores (`sp_Caja_*`, `fn_Rentabilidad_Gastos`, flujo detallado) agrupan por MONTH() de esas fechas. Así "se sigue calculando bien por periodo" por construcción. |
| **D3** | Estado inicial via **`sp_Egreso_Insert` extendido** con params opcionales `@Estado NVARCHAR(15)='POR_PAGAR'`, `@FechaPago DATE=NULL`, `@IdFormaPago INT=NULL`, `@IdCuentaBancaria INT=NULL`. Defaults = comportamiento actual (retrocompatible). | `sp_Compra_Clasificar` llama a este SP con `INSERT INTO @out EXEC` — el contrato (params existentes posicionales + UN resultset `i_IdEgreso INT`) NO puede romperse. Extender con defaults al final es seguro. |
| **D4** | `PAGADO` al nacer exige `@FechaPago` (RAISERROR si falta; el CHECK `CK_egreso_pagado` respalda). `@IdFormaPago` opcional (paridad con `sp_Egreso_Pagar`), el front lo manda default EFECTIVO(1). La fecha de pago NO se restringe al periodo (crédito paga en otro mes); solo advertencia visual si difiere. | Máquina de estados intacta; histórico = todo nace pagado. |
| **D5** | Soft delete de Compras: fuera del menú `ContaLayout`, ruta `/conta/compras` → `<Navigate to="/conta/egresos" replace/>`, import comentado, `Compras.tsx` intacto con comentario SOFT-DELETE. **Endpoints y SPs de compras NO se tocan.** | Patrón ya validado (rentabilidad-unidades). La bandeja revive si aparece el feed PLE/SUNAT. |
| **D6** | **Modal más ancho**: `max-w-lg` (512px) → **`max-w-2xl`** (672px). Además: los ítems del `SearchableSelect` y los `<option>` largos llevan `title={label}` (tooltip nativo con el texto completo); el trigger conserva `truncate`. Si un label aún no cabe, se permite `whitespace-normal` en los ítems del panel (2 líneas) antes que recortar. | Textos como "MANTENIMIENTO ( reparac., mant.Eq., ascensores,instalaciones)" salen recortados a 512px. 672px + tooltip mitiga sin romper el grid de 2 columnas. |
| **D7** | Grid de egresos: nueva columna/badge **Tipo** (PROV/ENT). `sp_Egreso_List` se extiende con `CASE WHEN e.i_IdProveedor IS NOT NULL THEN 'PROVEEDOR' ELSE 'ENTIDAD' END AS TipoReceptor` (ALTER de SP conta, permitido). | Distinguir de un vistazo compras vs otros egresos en la tabla única. |
| **D8** | **Fix del modo Editar**: `sp_Egreso_Get` YA devuelve `i_IdEntidad/i_IdProveedor/i_IdCentroCosto/i_IdTipoGasto` — el front hoy los descarta y obliga a re-seleccionar (con el Guardar-disabled nuevo, molesta). `openEditar` debe prefillar esos ids. | Bug de UX preexistente que la validación de obligatorios volvió visible. |
| **D9** | Catálogo de proveedores: nuevo `conta.sp_Proveedor_List` (SELECT sobre `dbo.proveedores` — solo lectura de dbo, permitido) + `GET /proveedores`. Alta/edición de proveedores **fuera de alcance** v1 (18 filas; se agregan por SQL). | Lo mínimo para el toggle. |

## 4. FASE BD — `db-experto`

Archivo: `models-DB/script-conta/sp/03_egresos.sql` (Insert/List) y `02_catalogos.sql` (proveedores).
⚠️ Verificar `modify_date` de los SPs vivos ANTES de editar (pueden haber cambiado directo en BD).
Aplicar via db-console SOLO los objetos tocados; versionar en el mismo commit.

### 4.1 `conta.sp_Egreso_Insert` (ALTER — retrocompatible, D3/D4)

- Agregar AL FINAL de la firma: `@Estado NVARCHAR(15) = 'POR_PAGAR', @FechaPago DATE = NULL,
  @IdFormaPago INT = NULL, @IdCuentaBancaria INT = NULL`.
- Validaciones nuevas (antes del INSERT):
  ```sql
  IF @Estado NOT IN ('POR_PAGAR','PAGADO')
      BEGIN RAISERROR('Estado inicial invalido (POR_PAGAR|PAGADO).',16,1); RETURN; END
  IF @Estado = 'PAGADO' AND @FechaPago IS NULL
      BEGIN RAISERROR('Un egreso PAGADO requiere fecha de pago.',16,1); RETURN; END
  ```
- El INSERT pobla `v_Estado=@Estado`, y si PAGADO: `t_FechaPago=@FechaPago`,
  `i_IdFormaPago=@IdFormaPago`, `i_IdCuentaBancaria=@IdCuentaBancaria`.
- Auditoría: si nace PAGADO, detalle `CONCAT(@TipoDocumento,' PAGADO ',CONVERT(varchar,@FechaPago,23))`
  (un solo evento INSERT).
- **INVARIANTE**: el SP sigue devolviendo exactamente `SELECT @id AS i_IdEgreso` (un resultset,
  una columna) — `sp_Compra_Clasificar` depende de eso via `INSERT INTO @out EXEC`.
- Anti-duplicado existente NO se toca.

### 4.2 `conta.sp_Egreso_List` (ALTER menor, D7)

Agregar `TipoReceptor` al SELECT (CASE del D7). No cambiar filtros ni orden.

### 4.3 `conta.sp_Proveedor_List` (NUEVO, D9) — en `02_catalogos.sql`

```sql
CREATE PROCEDURE conta.sp_Proveedor_List @SoloActivos BIT = 1
AS BEGIN
    SET NOCOUNT ON;
    SELECT p.id_proveedor AS i_IdProveedor, p.ruc AS Ruc, p.razon_social AS RazonSocial
    FROM dbo.proveedores p
    WHERE (@SoloActivos = 0 OR p.activo = 1)
    ORDER BY p.razon_social;
END
```
Confirmar nombres reales de columnas de `dbo.proveedores` (sys.columns) — el seed usó
`ruc, razon_social, activo, fecha_registro`; ajustar si difieren. SOLO SELECT sobre dbo.

### 4.4 GATEs de BD (producción = probar → evidenciar → **LIMPIAR + RESEED**)

| GATE | Verificación | Criterio |
|---|---|---|
| **G1** | `EXEC sp_Egreso_Insert` SOLO con params viejos (path default) → nace POR_PAGAR, resultset `i_IdEgreso` único | comportamiento idéntico al actual (regresión D3) |
| **G2** | Insert con `@Estado='PAGADO', @FechaPago='2026-06-20', @IdProveedor=<id real>` → fila PAGADO con t_FechaPago; aparece en `sp_Caja_Diaria` jun día 20 (Egresos +monto), en `sp_Caja_CuadreDia` 2026-06-20 RS2 Origen='EGRESO CONTA', en `sp_Caja_FlujoDetallado` RS3 en la hoja del tipo usado, y `sp_Caja_FlujoConsolidado` suma en su sección | Δ = monto exacto en los 4 motores |
| **G3** | Insert `@Estado='PAGADO'` sin `@FechaPago` → RAISERROR; `@Estado='X'` → RAISERROR | error limpio, no fila |
| **G4** | Rentabilidad: verificar el criterio VIVO de `fn_Rentabilidad_Gastos` (¿incluye POR_PAGAR por devengado o solo PAGADO?) y documentar el hallazgo en el reporte — define la nota de UI del pie del modal | hallazgo registrado |
| **G5** | `sp_Proveedor_List` → 18 filas (o las reales), ordenadas | conteo real |
| **G6** | `sp_Egreso_List` devuelve `TipoReceptor` correcto para los egresos de prueba (uno PROV, uno ENT) | PROV/ENT correctos |
| **G-CLEAN** | Borrar TODOS los egresos de prueba + auditoría asociada y `DBCC CHECKIDENT ('conta.egreso', RESEED, <max o 0>)` — la BD es producción demo | `conta.egreso` vuelve a su estado previo (0 filas hoy) |

## 5. FASE API — `backend-api`

⚠️ Liberar puerto 5090 antes de compilar (Stop-Process del `dotnet run`).

1. **DTOs** (`Models/Dtos.cs`):
   - `ProveedorDto { i_IdProveedor int, Ruc string, RazonSocial string }`.
   - `EgresoCreate` (el DTO existente de crear): agregar `Estado string = "POR_PAGAR"`,
     `FechaPago DateTime?`, `IdFormaPago int?`, `IdCuentaBancaria int?`.
2. **Repos**: `CatalogoRepository` + método `Proveedores(bool soloActivos)` → `sp_Proveedor_List`.
   `EgresoRepository.Crear` pasa los 4 params nuevos al SP.
3. **Controllers**: `CatalogosController` → `[HttpGet("/api/conta/proveedores")]` (misma
   autorización de lectura que `/entidades`). `EgresosController.Crear` sin cambios de ruta.
4. **Verificación curl** (token demo `sa`/`Sa#2026Demo`):
   - `GET /proveedores` → 200, 18 filas.
   - `POST /egresos` con `{Estado:'PAGADO', FechaPago:'2026-06-20', IdProveedor:<id>, ...}` → 200
     y `GET /caja/cuadre-dia?fecha=2026-06-20` lo muestra en Egresos (Origen 'EGRESO CONTA').
   - `POST /egresos` PAGADO sin FechaPago → 400/500 con el mensaje del RAISERROR.
   - **Limpiar los egresos creados** (anular no basta para el cuadre demo: coordinar con
     db-experto el DELETE+RESEED final, o crear y borrar dentro de la misma fase BD).

## 6. FASE FRONT — `bi-frontend`

Archivos: `Egresos.tsx` (modal + grid), `ContaLayout.tsx` + `App.tsx` (soft delete Compras),
`ContabilidadService.ts` + `contaTypes.ts`. Reusar `SearchableSelect` (ya existe en
`components/SearchableSelect.tsx`).

### 6.1 Tipos + service
- `ProveedorRow { i_IdProveedor, Ruc, RazonSocial }`; `EgresoCreate` += `Estado`, `FechaPago?`,
  `IdFormaPago?`, `IdCuentaBancaria?`; `Egreso` (fila de lista) += `TipoReceptor`.
- `proveedores(soloActivos=true)` → GET `/proveedores`. `egresoCrear` manda los campos nuevos
  SOLO si no-default (Estado='POR_PAGAR' → no enviar; convención de eficiencia).

### 6.2 Modal "Nuevo egreso" (el grueso)

**Ancho (D6)**: en el componente `Modal` local, `max-w-lg` → `max-w-2xl`. Los ítems del
`SearchableSelect` y `<option>`s llevan `title` con el texto completo.

Layout del form (grid 2 cols se mantiene):
```
[Periodo: (Año) (Mes)]                    ← nuevo, fila 1 (2 selects compactos)
[Receptor: ( ) Proveedor  ( ) Entidad]    ← toggle segmented, fila 2, full
[SearchableSelect proveedor|entidad]      ← full; elegir uno LIMPIA el otro (D1)
[Fecha documento*]  [Tipo documento*]     ← date-input con min/max del periodo (D2)
[Serie-Numero]      [Condicion]
[Centro de costo*]  [Tipo de gasto*]      ← ambos con SearchableSelect (catalogos largos)
[Monto bruto*]      [IGV]
[Estado: (POR PAGAR | PAGADO)]            ← nuevo (solo en CREAR; en editar no se muestra)
[Fecha de pago*] [Forma de pago]          ← visibles SOLO si PAGADO; forma default EFECTIVO
[Cuenta bancaria (opcional)]              ← visible solo si PAGADO
[Glosa full]
```
- **Periodo**: default mes actual. Cambiarlo ajusta `min`/`max` del date-input de documento y
  su valor default (hoy si es el mes en curso; día 1 si no). `formValido` exige que
  FechaDocumento ∈ periodo.
- **Receptor**: estado local `tipoReceptor: 'PROVEEDOR' | 'ENTIDAD'`; setear `IdProveedor` o
  `IdEntidad` y null el otro. `formValido`: exactamente uno ≠ null.
- **Estado PAGADO**: `formValido` exige además `FechaPago`. Advertencia suave (texto ámbar, no
  bloqueo) si `FechaPago` cae fuera del periodo (D4). Forma de pago default 1 (EFECTIVO),
  reusar el catálogo `FORMAS_PAGO` ya presente en la página (modal pagar).
- Conservar TODA la validación de obligatorios existente (formValido + Guardar disabled).
- Nota del pie: mantener "Neto = Bruto − IGV…"; si Estado=PAGADO cambiarla a "Se crea PAGADO:
  impacta caja en la fecha de pago." (+ el hallazgo G4 sobre rentabilidad si aplica).

### 6.3 Fix Editar (D8)
`openEditar`: tomar de `egresoGet` los ids reales (`i_IdEntidad`, `i_IdProveedor`,
`i_IdCentroCosto`, `i_IdTipoGasto`) y prefillar el form + `tipoReceptor`. Eliminar el comentario
"se re-seleccionan". El selector de Estado NO aparece en editar (la transición es via Pagar).

### 6.4 Grid
Columna nueva "Tipo" con badge compacto: `PROV` (sky) / `ENT` (violet), de `TipoReceptor`.

### 6.5 Soft delete de Compras (D5)
- `ContaLayout.tsx`: quitar la entrada del menú (comentario SOFT-DELETE con cómo restaurar;
  ojo con el icono importado que quede sin uso — quitarlo del import o rompe `noUnusedLocals`).
- `App.tsx`: `<Route path="compras" element={<Navigate to="/conta/egresos" replace />} />`,
  import de `Compras` comentado con nota.
- `Compras.tsx`: intacto + comentario de cabecera "[SOFT-DELETE 2026-07-13] Bandeja fiscal sin
  feed (dbo.registro_compras=0). Restaurar cuando exista el feed PLE/SUNAT: ruta + navItem."

### 6.6 Verificación front
`npx tsc --noEmit` (0 errores) + `npx vite build` (verde). Revisar en el modal ancho que los
labels largos de tipo de gasto ya no se recortan (tooltip para los extremos).

## 7. E2E (orquestador)

1. Login demo → `/conta/egresos` → "Nuevo egreso": modal más ancho, periodo default, toggle
   receptor funciona (elegir proveedor limpia entidad y viceversa), Guardar disabled hasta
   completar obligatorios (+ fecha de pago si PAGADO).
2. Crear egreso PROVEEDOR + PAGADO (jun-2026) → aparece en grid con badge PROV; visible en
   `/conta/caja` (día + cuadre RS2) y `/conta/flujo-consolidado` (sección + hoja del detallado).
3. Crear egreso ENTIDAD + POR_PAGAR → badge ENT; NO impacta caja; indicador "Por pagar" sube.
4. Editar un POR_PAGAR → el form llega PREFILLADO (D8), Guardar habilitado sin re-seleccionar.
5. `/conta/compras` redirige a `/conta/egresos`; el sidebar ya no lista Compras.
6. **LIMPIEZA FINAL**: borrar los egresos de prueba + RESEED (coordinado con db-experto) —
   la demo debe quedar con `conta.egreso` como estaba.

## 8. Fuera de alcance (registrar)

- Alta/edición de proveedores desde la UI (18 filas; por SQL de momento).
- Cierre del hueco anti-duplicado inverso (clasificar compra cuya factura ya es egreso manual):
  documentado para cuando exista el feed fiscal — la bandeja está en soft delete.
- Validación de mes de caja CERRADO al pagar/nacer pagado (preexistente): regla operativa =
  cargar histórico antes de cerrar, o re-cerrar (el re-encadenado ya existe).
- Carga masiva Excel: sigue igual (POR_PAGAR); extenderla a estado/pago es v2.

## 9. Rollback

- BD: restaurar `sp_Egreso_Insert`/`sp_Egreso_List` desde git (ALTER de vuelta); DROP
  `sp_Proveedor_List`. Sin cambios de schema.
- API/Front: revert del commit. Compras vuelve al sidebar descomentando (instrucciones en los
  comentarios SOFT-DELETE).

## 10. Checklist de ejecución

- [ ] db-experto: confirmar columnas `dbo.proveedores` → ALTER Insert/List + sp_Proveedor_List
      → G1–G6 con cifras → **G-CLEAN (DELETE + RESEED)** → versionar 02/03_egresos.sql
- [ ] backend-api: liberar 5090 → DTOs + repos + GET /proveedores + create extendido + curls
- [ ] bi-frontend: tipos/service + modal (ancho D6, periodo D2, receptor D1, estado D4) +
      fix editar D8 + badge D7 + soft delete Compras D5 + tsc/build
- [ ] orquestador: E2E §7 + limpieza verificada + commit
      `feat(conta): egreso unificado (proveedor/entidad, periodo, estado inicial) + soft delete compras`
- [ ] orquestador: memoria (regla 5): actualizar `modelo-negocio.md` §Egresos (unificación,
      estado inicial, compras en soft delete) + hallazgo G4

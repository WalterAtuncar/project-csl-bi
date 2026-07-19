# PLAN — Honorarios médicos: liquidación separada CLÍNICA vs SISOL

> **Para el ejecutor (IA):** plan autocontenido — la investigación (BD + front) ya está hecha y
> verificada contra producción el 2026-07-18; los fragmentos de código citados son de la definición
> VIVA. Ejecuta por FASES en orden (BD → API → Front → QA). El schema `conta` es NUESTRO (módulo no
> lanzado: se puede alterar/limpiar); **`dbo` y `SigesoftDesarrollo_2` SOLO LECTURA, jamás DDL/DML**
> (ventas/cobranzas/atención son core intocable). SQL Server **2012** (sin CREATE OR ALTER — patrón
> DROP/GO/CREATE). Verificar front con `npx vite build` (NUNCA tsc). Sin commits (los hace el orquestador).

Fecha: 2026-07-18 · Autor: orquestador · Estado: **APROBADO para ejecutar**

---

## 1. Decisión del PO (contexto de negocio)

1. Los honorarios médicos se liquidan **tanto** por producción asistencial ("**Clínica**",
   `masterServiceType 9 = PARTICULAR`) **como** por producción **SISOL** (`42`) — por eso el SP
   original traía `IN (9,42)`. La exclusión de SISOL aplicada hoy (2026-07-18, solo-9) **se revierte**.
2. Pero la liquidación es **SEPARADA**: un pago de honorario es o-Clínica-o-SISOL, **nunca mixto**.
3. UI: **radio "Clínica" / "SISOL" ARRIBA de los KPI cards** del modal de análisis. Default:
   **Clínica**. El SP devuelve ambos tipos; el front agrupa client-side.
4. **Ruteo del egreso**: al liquidar Clínica el egreso va al centro **asistencial (CC-ASIS)**; al
   liquidar SISOL va al centro **SISOL (CC-SISOL)** → así cae en la caja/unidad correcta.
5. Cambio de modelo: la retribución a médicos SISOL se hace **por honorarios**, no por la
   "liquidación por porcentaje" como se pensó antes (ver §8 — decisión pendiente del PO sobre el
   módulo 30/70; NO tocarlo en este plan).

Nota previa: el pago de prueba PH-1 ya fue eliminado hoy (con RESEED a 0) — las tablas
`pago_honorario*` y `egreso` están **vacías**: el rediseño no arrastra histórico.

## 2. Diseño de datos (decisiones cerradas)

- **Columna nueva, NO tabla nueva**: `conta.pago_honorario.v_TipoProduccion NVARCHAR(10) NOT NULL
  DEFAULT 'CLINICA' CHECK IN ('CLINICA','SISOL')`. Un pago es mono-tipo → la marca va en cabecera.
- Valores canónicos del dominio (BD, API, front, en TODAS las capas): **`'CLINICA'` | `'SISOL'`**
  (labels de UI: "Clínica" / "SISOL").
- `tipo_gasto` sigue siendo **MED-HON (id 63)** para ambos: la separación la da el **centro de
  costo**, no el rubro (ambos deben caer en sección MEDICO del flujo). NO crear rubro nuevo.
- Centros (catálogo `conta.centro_costo` verificado): **CC-ASIS = 2 → tipocaja 1**;
  **CC-SISOL = 6 → tipocaja 3**. En los SPs resolver **por `v_Codigo`** (patrón `sp_Sisol_Pagar`),
  no por id hardcodeado.
- El anti-doble-pago existente (índice único filtrado sobre `pago_honorario_servicio.v_ServiceId`
  con `b_Anulado=0`) sirve sin cambios: un service es tipo 9 **o** 42 (disjunto por protocolo).

---

## FASE 1 — BD (db-experto). Archivos: `models-DB/script-conta/`

### 1.1 DDL — columna de tipo de producción
Nuevo archivo `ddl/` con el **siguiente número libre** (verificar carpeta; nominalmente
`13_honorarios_tipo_produccion.sql`), idempotente:
```sql
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('conta.pago_honorario') AND name='v_TipoProduccion')
    ALTER TABLE conta.pago_honorario
      ADD v_TipoProduccion NVARCHAR(10) NOT NULL
          CONSTRAINT DF_pago_hon_tipoprod DEFAULT 'CLINICA'
          CONSTRAINT CK_pago_hon_tipoprod CHECK (v_TipoProduccion IN ('CLINICA','SISOL'));
```

### 1.2 `conta.sp_Honorarios_Analisis` (repo `sp/11_pago_honorario.sql`) — revert + tipo
Tres cambios (prod == repo verificado hoy; la columna `UsuarioCajero` agregada hoy SE CONSERVA):
1. Línea 704 (CTE `ServiciosData`): `WHERE pr.i_MasterServiceTypeId = 9` →
   `WHERE (pr.i_MasterServiceTypeId = 9 or pr.i_MasterServiceTypeId = 42)` (**revert**).
2. En la lista SELECT de `ServiciosData` (junto a `pr.i_Consultorio AS 'ConsultorioId'`, ~línea 633):
   agregar `pr.i_MasterServiceTypeId as 'MasterTypeId',` (el alias `pr` NO es visible en el SELECT
   final — hay que propagarlo por el CTE).
3. En el SELECT final, **AL FINAL** (después de `UsuarioCajero`, ~línea 796):
   ```sql
   CASE S.MasterTypeId WHEN 9 THEN 'CLINICA' WHEN 42 THEN 'SISOL' END AS TipoProduccion
   ```
   Contrato: `TipoProduccion` puede ser **NULL** en filas sin service emparejado (solo con
   `@ConsultorioId` NULL/-1); esas filas no son pagables (sin `v_ServiceId`) y el front las excluye.

### 1.3 `conta.sp_PagoHonorario_Insert` (repo `sp/11`) — param, validación y ruteo
1. **Param nuevo AL FINAL** de la firma: `@TipoProduccion NVARCHAR(10) = 'CLINICA'`
   (retro-compatible). Validar temprano: si `@TipoProduccion NOT IN ('CLINICA','SISOL')` → RAISERROR.
2. **Check anti-mixto server-side** (paso nuevo antes de escribir; cross-DB SOLO SELECT — shape ya
   probado en vivo contra producción):
   ```sql
   DECLARE @tipoEsperado INT = CASE @TipoProduccion WHEN 'SISOL' THEN 42 ELSE 9 END;
   DECLARE @mixtos NVARCHAR(MAX) =
   ( SELECT STUFF((
       SELECT ', ' + x.v_ServiceId
       FROM ( SELECT DISTINCT sv.v_ServiceId
              FROM @Servicios sv
              LEFT JOIN SigesoftDesarrollo_2.dbo.service s
                     ON s.v_ServiceId = sv.v_ServiceId COLLATE DATABASE_DEFAULT
                    AND ISNULL(s.i_IsDeleted,0) = 0
              LEFT JOIN SigesoftDesarrollo_2.dbo.protocol pr
                     ON pr.v_ProtocolId = s.v_ProtocolId
              WHERE ISNULL(pr.i_MasterServiceTypeId,-1) <> @tipoEsperado ) x
       ORDER BY x.v_ServiceId
       FOR XML PATH(''), TYPE).value('.','NVARCHAR(MAX)'), 1, 2, '') );
   IF @mixtos IS NOT NULL AND LEN(@mixtos) > 0
   BEGIN RAISERROR('Servicios que no corresponden a la produccion %s: %s', 16, 1, @TipoProduccion, @mixtos); RETURN; END
   ```
   (Estricto a propósito: un service inexistente/borrado también falla — no se paga lo no verificable.)
3. **Ruteo del centro de costo** — reemplazar el hardcode `@IdCentroCosto = 2` del INSERT..EXEC a
   `sp_Egreso_Insert` (repo `sp/11` líneas ~292-299) por resolución por código:
   ```sql
   DECLARE @IdCentroCostoHon INT =
     ( SELECT i_IdCentroCosto FROM conta.centro_costo
       WHERE v_Codigo = CASE @TipoProduccion WHEN 'SISOL' THEN 'CC-SISOL' ELSE 'CC-ASIS' END
         AND b_Activo = 1 );
   IF @IdCentroCostoHon IS NULL
   BEGIN RAISERROR('Centro de costo no encontrado para %s', 16, 1, @TipoProduccion); RETURN; END
   ```
   y pasar `@IdCentroCosto = @IdCentroCostoHon`. Todo lo demás del egreso queda igual (MED-HON,
   serie PH-{id}, `@IdConsultorio` se mantiene también para SISOL — verificado: el 100% de los
   servicios 42 de 2026 tienen consultorio 403).
4. **Grabar el tipo**: incluir `v_TipoProduccion = @TipoProduccion` en el INSERT de la cabecera
   `pago_honorario`. (`_Anular` no cambia.)

### 1.4 `sp_PagoHonorario_List` y `sp_PagoHonorario_Get` — exponer el tipo
Agregar `v_TipoProduccion` **al final** del resultset de la lista y de la cabecera del Get
(aditivo, no rompe Dapper).

### 1.5 `conta.sp_Rentabilidad_PorConsultorio` — DIFERIDO (decisión PO 2026-07-18)
**NO se toca en este sprint.** El PO decidió (2026-07-18) diferir TODO lo de rentabilidad y liquidación
SISOL a otro sprint y **aceptar la contaminación temporal**. Contexto del bug aceptado (para el otro
sprint): el bloque **5b** (~líneas 365-378) mete a `#egr` TODO egreso con `i_IdConsultorio IS NOT NULL`
**sin filtrar centro** y lo resta al consultorio del grupo ASISTENCIAL. Como el catálogo 403 es
compartido (CARDIOLOGIA tiene producción 9 y 42), un honorario SISOL de un cardiólogo **restará en la
fila CARDIOLOGIA asistencial** de rentabilidad-por-consultorio. **Bug ACEPTADO y consciente** hasta el
sprint de rentabilidad/SISOL (fix pendiente: `AND e.i_IdCentroCosto = CC-ASIS` en el WHERE de 5b).
Ver §8. El ejecutor **NO** aplica este fix ahora.

### 1.6 Aplicación y verificación FASE 1
- Aplicar DDL + los 4 SPs a producción (db-console `--write --file`, batches idempotentes) y dejar
  los `.sql` del repo == producción (UTF-8 sin BOM). Antes de tocar cada SP: comparar viva vs repo.
- **Verificar** (EXEC reales):
  - Análisis Cardiología jun-2026 (`@ConsultorioId=6`): total **386 filas / Σ 24,194.50** de nuevo;
    por tipo: CLINICA **85 / 7,458.50** + SISOL **301 / 16,736.00**; columnas `UsuarioCajero` y
    `TipoProduccion` presentes; 0 tipos NULL (con consultorio fijo).
  - `sp_describe_first_result_set` de los SPs tocados → contrato final documentado para FASE 2.

---

## FASE 2 — API (backend-api). Proyecto `SanLorenzo.Contabilidad.Services`

DTOs en `Models/Dtos.cs` (Dapper mapea por nombre; JSON sin camelCase — nombres EXACTOS):
1. `AnalisisHonorarioRow` += `public string TipoProduccion { get; set; }` (**nullable de facto** —
   puede venir NULL en filas sin service; string sin required).
2. DTO del `POST /honorarios/pagos` (`HonorarioPagoCreate...`) += `public string TipoProduccion { get; set; }`
   con default `'CLINICA'` si viene vacío; **añadirlo a los parámetros** de la llamada Dapper al SP
   `sp_PagoHonorario_Insert` en `HonorariosRepository` (si no se agrega, el SP usaría su default y
   se perdería la selección del usuario — punto crítico).
3. DTO del item de lista (`HonorarioPagoListItem...`) y de la cabecera del Get += `v_TipoProduccion`
   (nombre exacto de la columna que expone el SP — confirmarlo con el contrato de FASE 1).
4. `dotnet build -c Debug` 0 errores (si la DLL está bloqueada por el API detached, compilar con
   `--output` redirigido; NO matar/reiniciar el API — lo hace el orquestador).

---

## FASE 3 — Front (bi-frontend). Anclajes verificados hoy en `GenerarPagoHonorarioModal.tsx`

### 3.1 Tipos (`services/contabilidad/contaTypes.ts`)
- `AnalisisHonorarioRow` += `TipoProduccion: 'CLINICA' | 'SISOL' | null;` (al final).
- `HonorarioPagoCreate` (~L701) += `TipoProduccion: 'CLINICA' | 'SISOL';`.
- `HonorarioPagoListItem` (~L580) y `HonorarioPagoCabecera` (~L658) += `v_TipoProduccion: string;`.

### 3.2 Modal — radio + filtro upstream (anclajes exactos)
- **Estado**: `const [tipoProduccion, setTipoProduccion] = useState<'CLINICA'|'SISOL'>('CLINICA')`
  junto a `rows`/`analizado` (~L63-65). Reset a `'CLINICA'` en el efecto de apertura (~L117-145) y
  dentro de `analizar()` (~L148-153, junto al reset de validación/selección/filtros).
- **Radio**: nuevo bloque JSX como **primer hijo** del fragment `{analizado && (<>` (entre ~L552 y el
  comentario `{/* ---- KPIs ---- */}` ~L553) — ARRIBA de los 3 KPI cards (~L554-558). Estilo:
  segmented control / 2 radios estilizados coherentes con el modal ("Clínica" checked default,
  "SISOL"). Al cambiar: `setTipoProduccion(t)` + resetear `selectedMedicos`, `selectedKeys`,
  `filtros` y la validación Excel (`limpiarValidacion()`, ~L384). NO resetear: `manualPercents`,
  `visaDiscountPercent`, `includeIgv`, datos de pago/comprobante.
- **Filtro upstream** (CLAVE — la cadena de memos): crear tras `analizar` (~L165):
  ```ts
  const rowsTipo = useMemo(() => rows.filter((r) => r.TipoProduccion === tipoProduccion), [rows, tipoProduccion]);
  ```
  y repuntar de `rows` → `rowsTipo` las dependencias de: `medicos` (~L168-190), `kpi` (~L193-197),
  `rowsDeMedicos` (~L200) y `selectedDetalles` (~L225-228). ⚠️ `selectedDetalles` filtra `rows`
  crudo — si no se repunta, "Registrar" sumaría servicios del tipo oculto (trampa #1).
  Filas con `TipoProduccion === null` quedan excluidas de ambos grupos (no pagables, sin ServiceId).
  **Jamás re-mapear `rows`** (las `_key` incluyen índice — deben quedar estables).
- **Cruce Excel**: `onExcelFile` (~L344, autoselección ~L365-370) debe cruzar contra `rowsTipo`
  (los comprobantes del otro tipo caen en "No se encuentra en el sistema") — trampa #2.
- KPIs, "Médicos (N)", `formasPagoOpts` y el resto se recalculan solos al colgar de `rowsTipo`.
  Sin columnas nuevas en las grids del modal → colSpans internos no cambian.

### 3.3 Payload y post-registro
- `registrar()` (~L388-471): incluir `TipoProduccion: tipoProduccion` en el body (~L428-442).
- `setResultado` (~L446-462): pasar el tipo al recibo si se agrega ahí (ver 3.4).

### 3.4 Página Honorarios + detalle + recibo
- `Honorarios.tsx`: columna/badge **"Tipo"** en la grid de pagos entre "Médico" y "Periodo"
  (thead ~L224-235; molde `estadoBadge` ~L24-27; **colSpan 9→10** en ~L238-239). Fuente:
  `v_TipoProduccion` del list item. Filtro por tipo en la lista: OPCIONAL (no bloqueante).
- Modal "Ver" detalle (~L281-386): `<Info label="Tipo producción" ...>` en la grilla (~L289-298),
  desde la cabecera del Get.
- `ReciboPDF.tsx`: `ReciboHonorarioData` += `TipoProduccion?: string | null` + un `infoItem`
  ("Producción: Clínica/SISOL") en la grilla (~L112-129). Poblarlo en los DOS callsites:
  `setResultado` del modal y `imprimir()` de `Honorarios.tsx` (~L118-137).

### 3.5 Verificación FASE 3
`npx vite build` 0 errores (warnings de chunks normales).

---

## FASE 4 — QA de integración (orquestador o qa-tester)

| GATE | Verificación |
|---|---|
| G1 | Análisis Cardiología jun vía API vivo: 386 filas totales; radio Clínica → KPIs 85 / S/ 7,458.50; radio SISOL → 301 / S/ 16,736.00. `UsuarioCajero` sigue presente. |
| G2 | Cambiar de radio limpia selección/filtros/validación; "Médicos (N)" y KPIs se recalculan; ningún servicio del tipo oculto entra al resumen de registro. |
| G3 | **E2E SISOL** (con limpieza): registrar un pago SISOL pequeño (1 servicio SISOL real de jun) → `pago_honorario.v_TipoProduccion='SISOL'`; egreso generado con centro **CC-SISOL (6)**; en `/conta/caja` cuadre del día del pago el egreso sale `Origen=EGRESO CONTA, Unidad=SISOL`. NOTA: rentabilidad NO se verifica este sprint (diferida, §1.5) — la contaminación de la línea asistencial es un bug aceptado; no marcarlo como fallo. |
| G4 | **E2E Clínica**: ídem con un servicio particular → egreso CC-ASIS, Unidad=ATENCION_ASISTENCIAL. |
| G5 | **Anti-mixto**: intentar registrar declarando CLINICA con un servicio SISOL en el TVP → RAISERROR con la lista de ofensores (el API lo traduce a error legible). |
| G6 | Lista de pagos muestra el badge Tipo; detalle y recibo muestran la producción. |
| G7 | **Limpieza total post-QA**: script en `maintenance/` (`2026-07-XX_test_honorarios_tipo_limpiar.sql`) que borre los pagos de prueba de G3/G4 (grafo completo: servicio→consultorio→comprobante→egreso→cabecera) + `DBCC CHECKIDENT ... RESEED` (patrón del cleanup PH-1 de hoy). Las tablas deben quedar en el estado pre-QA. |

---

## 8. Fuera de alcance + decisión PO pendiente (documentar, NO tocar)

- **DIFERIDO A OTRO SPRINT (decisión PO 2026-07-18): todo lo de rentabilidad y liquidación SISOL.**
  Este sprint es SOLO honorarios médicos (separación Clínica/SISOL + ruteo de egreso). En particular
  NO se aplica el fix §1.5. **Bug aceptado conscientemente**: los egresos de honorarios SISOL
  (centro CC-SISOL, con consultorio) restarán en la línea asistencial del consultorio en
  `sp_Rentabilidad_PorConsultorio` hasta el sprint de rentabilidad/SISOL. Carry-over para ese sprint:
  aplicar `AND e.i_IdCentroCosto = CC-ASIS` en el bloque 5b.
- **NO tocar el módulo `sisol_liquidacion` (30/70)** ni sus SPs (`sp_Sisol_Calcular/Pagar/...`).
  Estado actual: participación 30/70 vigente; liquidaciones jun (70%, foto vieja) y jul (30%)
  en CALCULADO, ninguna PAGADA, sin egresos.
- **Riesgo de doble conteo a resolver con el PO** antes de pagar liquidación y honorarios SISOL en
  el mismo mes: (a) si el 70% del Hospital ya incluyera el pago a médicos habría doble egreso — el
  modelo solo es coherente si los médicos SISOL cobran de la parte clínica (30%); (b)
  `sisol_liquidacion_especialista` (TVP % por médico, hoy solo informativo) representa la misma
  plata que el nuevo honorario SISOL — definir su rol (referencia/tope vs retiro) o retirarlo;
  (c) el carry-over "recalcular liquidación SISOL jun a 30/70" queda condicionado a esta decisión.
- NO cambia el cálculo del pago en el front (VISA −4%, ×0.82, cadena %): el PO no definió reglas
  distintas para SISOL — misma fórmula para ambos tipos (si luego cambia, es otra iteración).
- NO crear rubro `MED-HONS` (opcional futuro si el PO quiere fila propia en Flujo Detallado).

## 9. Reporte esperado del ejecutor (por fase)

1. Objetos/archivos tocados con diff-resumen; confirmación prod==repo por SP; `modify_date` nuevos.
2. Contratos finales (resultsets/DTOs/tipos TS) tal como quedaron.
3. Resultado de builds (`dotnet build`, `npx vite build`).
4. Estado de cada GATE G1–G7 con evidencia numérica; desviaciones justificadas.
5. Confirmación de limpieza (G7) y de **cero escritura en `dbo`/`SigesoftDesarrollo_2`**.

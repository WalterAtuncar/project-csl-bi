# PLAN — Rentabilidad por Consultorio (Asistencial / Ocupacional) + secciones en /conta/rentabilidad

**Fecha de diseño:** 2026-07-12 · **Estado:** APROBADO PARA EJECUCIÓN (aún no ejecutado)
**Base:** investigación profunda 2026-07-12 (legacy-negocio + db-experto, verificada al centavo contra producción).
**Documentos hermanos:** `PLAN_FILTRO_MEDIOS_PAGO.md`, `PLAN_TOGGLE_CREDITO_RENTABILIDAD.md` (ejecutados; mismo estilo de GATEs).

---

## 0. Objetivo y decisiones cerradas del usuario (C1–C8 — NO renegociar)

El gerente quiere ver la rentabilidad desglosada por **consultorio** (Medicina, Laboratorio,
Ginecología…) en **2 grupos: ASISTENCIAL y OCUPACIONAL**, en la página `/conta/rentabilidad`,
alimentada por **un solo filtro de cabecera** (año, mes, incluir-crédito).

| # | Decisión | Valor cerrado |
|---|---|---|
| C1 | Costo/margen | **v1 = SOLO INGRESOS por consultorio.** `component.r_BasePrice` NO es costo (es precio base de lista; a la empresa A se le pactó 28, a la B 20 — **el precio verdadero está en `servicecomponent.r_Price`**). No existe fuente de costo unitario → sin columna de costo/margen en v1. La UI subtitula "distribución de ingresos". |
| C2 | Dimensión por grupo | **ASISTENCIAL** → consultorio del protocolo (`protocol.i_Consultorio` → grupo **403**, la lista exacta del gerente). **OCUPACIONAL** → apertura por área de componentes (`component.i_CategoryId` → grupo **116**) prorrateando el paquete. |
| C3 | No clasificado | Fila **"(SIN CLASIFICAR)"** visible por grupo (nunca se pierde ingreso) + **resultset de diagnóstico** para investigar la fuga (~17% asistencial) y poder curarla después. Aceptado por ahora. |
| C4 | UI | En `/conta/rentabilidad`: debajo del gráfico → **sección "Rentabilidad por Unidad"**; debajo → **sección "Rentabilidad por Consultorio"** (2 bloques: Asistencial y Ocupacional). Un solo filtro de cabecera (año/mes/incluirCredito ya existente) llena las 3 secciones. |
| C5 | Grupos | Separación por **UNIDAD** (`i_ClienteEsAgente → tipocaja`, como PorUnidad): agente 1→OCUPACIONAL, 2/8/9→ASISTENCIAL. Verificado que coincide con el tipo de protocolo (100% / 99.3%). |
| C6 | Otras unidades | El SP calcula también **OTRAS_UNIDADES** (SISOL a % clínica vigente, FARMACIA, SEGUROS, MTC) como filas agregadas SIN desglose de consultorio — solo para que el total reconcilie con Rentabilidad General. La UI las muestra como una línea compacta de cuadre. |
| C7 | Crédito | Mismo predicado `@IncluirCredito` de siempre (grupo 41, excluye solo CREDITO). Consecuencia esperada y correcta: **con OFF, Ocupacional casi desaparece** (92.9% de su bruto es crédito). |
| C8 | Página existente | `/conta/rentabilidad-unidades` queda **intacta** (no se elimina ni modifica). |

---

## 1. Contexto verificado en producción (2026-07-12) — el ejecutor NO debe re-descubrir esto

### 1.1 Dónde vive la cadena clínica (¡en `SigesoftDesarrollo_2`, cross-DB!)

| Tabla (`SigesoftDesarrollo_2.dbo`) | Filas | Claves/columnas que usaremos |
|---|---|---|
| `protocol` | 6,413 | `v_ProtocolId`, **`i_Consultorio`** (→grupo 403), `v_Procedencia` char(1) (O/A/E/H/S/M), `i_IsDeleted` |
| `component` | 6,571 | `v_ComponentId`, `v_Name`, **`i_CategoryId`** (→grupo 116), `r_BasePrice` (lista, SOLO fallback de peso) |
| `service` (= la atención) | 328,386 | `v_ServiceId`, `v_ProtocolId`, `d_ServiceDate`, **`v_ComprobantePago`** nchar(200), **`v_NroLiquidacion`**, `i_IsDeleted` |
| `servicecomponent` | 2,577,796 | `v_ServiceId`, `v_ComponentId`, **`r_Price`** (precio pactado real — C1), `i_IsDeleted`. Índice CLUSTERED `(d_InsertDate, v_ServiceId)` |
| `liquidacion` | — | **`v_NroFactura`** ('F001-00004129') → `v_NroLiquidacion` → `service.v_NroLiquidacion` |
| `systemparameter` | 18,898 | grupo **403** = consultorios (48 valores, la lista del gerente); grupo **116** = categorías de componente (96 en uso) |

Rutas muertas (verificado — NO intentar): `venta.v_SigesoftServiceId` (vacío), `service.v_IdVentaCliente`
(vacío), `SigesoftDesarrollo_2..facturacion` (muerta 2016), `service.r_Costo` (NULL),
`servicespaid`/`HistorialPagoMedicos` (sin montos 2026), `vd.v_IdProductoDetalle` (producto genérico).

**REGLA DURA**: `SigesoftDesarrollo_2` es SOLO SELECT. Jamás `v_Password`. Cross-DB: usar
`COLLATE DATABASE_DEFAULT` en joins de texto. **JAMÁS `LIKE` cross-DB contra `v_ComprobantePago`
(se cuelga >120s)** — siempre igualdad por primer token (§1.2).

### 1.2 Los puentes venta ↔ Sigesoft (verificados; usarlos EXACTAMENTE así)

**Puente A — cabecera (rama ASISTENCIAL):** `venta.v_CorrelativoDocumentoFin` = primer token de
`service.v_ComprobantePago` (formato `'B004-00084540 |'`, nchar con padding y pipes). Cobertura:
99.97% de ventas jun con correlativo; 96.2% de ventas asistenciales matchean ≥1 service.
Esqueleto verificado (es el mismo del SP legacy `sp_PagoMedicoPorConsultorioCompleto`):

```sql
WITH svc AS (
  SELECT s.v_ServiceId, s.v_ProtocolId,
         LEFT(LTRIM(RTRIM(s.v_ComprobantePago)),
              CHARINDEX(' ', LTRIM(RTRIM(s.v_ComprobantePago)) + ' ') - 1) AS comp1,
         ROW_NUMBER() OVER (PARTITION BY LEFT(LTRIM(RTRIM(s.v_ComprobantePago)),
              CHARINDEX(' ', LTRIM(RTRIM(s.v_ComprobantePago)) + ' ') - 1)
              ORDER BY s.d_ServiceDate DESC, s.v_ServiceId DESC) AS rn      -- dedup: 3.2% de ventas tienen 2-4 services
  FROM SigesoftDesarrollo_2.dbo.service s
  WHERE s.d_ServiceDate >= DATEADD(DAY,-15,@ini) AND s.d_ServiceDate < DATEADD(DAY,15,@fin)  -- ventana ±15d OBLIGATORIA
    AND ISNULL(s.i_IsDeleted,0) = 0 AND s.v_ComprobantePago IS NOT NULL
)
... LEFT JOIN svc ON svc.comp1 = LTRIM(RTRIM(v.v_CorrelativoDocumentoFin)) COLLATE DATABASE_DEFAULT AND svc.rn = 1
```

**Puente B — liquidación (rama OCUPACIONAL, facturas EDP):**
`v.v_SerieDocumento+'-'+v.v_CorrelativoDocumento` = `liquidacion.v_NroFactura` →
`service.v_NroLiquidacion` (verificado: 1 liquidación = hasta 73 services). Además, las boletas
ocupacionales B00x matchean por el Puente A. Cobertura jun (mes corriente): ~53% del neto — la
factura grande del 25-jun aún no tiene liquidación registrada → **retroactivo** (§1.5).

### 1.3 Los catálogos de dimensión

- **Grupo 403 (consultorio del protocolo)** — 48 valores: MEDICINA GENERAL(1), MEDICINA INTERNA(2),
  CIRUGIA GENERAL(3), GINECO OBSTETRICIA(4), PEDIATRIA(5), CARDIOLOGIA(6), …, OCUPACIONAL(9),
  LABORATORIO(10), …, HOSPITALIZACION(46), HEMATOLOGÍA(48). Cobertura jun: 97.9% de services
  clasificados; los NULL son hospitalización/SOP → **regla: `pr.i_Consultorio IS NULL AND
  pr.v_Procedencia='H'` → 'HOSPITALIZACION'**; resto NULL → SIN CLASIFICAR.
- **Grupo 116 (categoría del componente)** — 96 en uso: LABORATORIO C, RAYOS X, MEDICINA,
  CARDIOLOGÍA - C, PSICOLOGÍA, OFTALMOLOGÍA, PSICOSENSOMETRICO, ESPIROMETRÍA, TRIAJE…
  Se usa SOLO para abrir el paquete ocupacional (C2).

### 1.4 Cifras ancla (INMUTABLES — facturado de meses cerrados, nivel NetoSinIGV)

| Jun-2026 | Neto |
|---|---|
| ASISTENCIAL (unidad tipocaja 1) | **278,397.77** |
| OCUPACIONAL (unidad tipocaja 2) | **168,065.60** |
| FARMACIA / SEGUROS / SISOL(sin %) | 61,734.13 / 3,478.98 / 109,503.94 |
| Total facturado | **621,180.42** |

Distribución orientativa asistencial jun (para validar plausibilidad, NO gate duro): LABORATORIO
37,493 · ECOGRAFÍA 16,192 · GASTRO 14,949 · TOMOGRAFIA 13,555 · GINECO 12,991 · OFTALMO 11,145 ·
MEDICINA GENERAL 10,474 · … · SIN CLASIFICAR ≈ 47,938 (17.2%). Ocupacional vía prorrateo:
LABORATORIO ~59% del paquete, luego RX, MEDICINA, CARDIOLOGÍA, PSICOSENSOMETRICO…

Crédito jun (bruto, grupo 41): OCUPACIONAL 92.9% CREDITO; ASISTENCIAL 0% crédito (91% contado + 9% depósito).

### 1.5 Realidades a rotular (aceptadas por el usuario, C3)

- **Fuga asistencial ~17%** (SIN SERVICE): certificados, ítems sin atención Sigesoft, matches fuera
  de ventana. El resultset 2 de diagnóstico (§3.4) existe para cazarla y curarla después.
- **Retroactividad ocupacional**: en el mes corriente ~47–53% del neto aún sin liquidación → cae en
  SIN CLASIFICAR y **se reclasifica solo** cuando la liquidación se registra (semanas después).
  Mismo fenómeno aceptado que el crédito/medios en caja.
- El % SISOL es editable en caliente → GATEs de totales con % se computan contra baseline vivo
  (igual que en `PLAN_TOGGLE_CREDITO_RENTABILIDAD.md` §1.4).

---

## 2. Arquitectura

```
/conta/rentabilidad  (UN filtro cabecera: año + mes + toggle crédito)
  ├─ sección 1 (existente): KPIs General + gráfico Comparativa
  ├─ sección 2 (nueva):  Rentabilidad por Unidad      ← GET /rentabilidad/por-unidad (endpoint EXISTENTE)
  └─ sección 3 (nueva):  Rentabilidad por Consultorio ← GET /rentabilidad/por-consultorio (NUEVO)
        └─ RentabilidadRepository.PorConsultorio (QueryMultiple: 2 resultsets)
             └─ conta.sp_Rentabilidad_PorConsultorio @Anio SMALLINT, @Mes TINYINT, @IncluirCredito BIT = 1  (NUEVO)
```

Objetos BD nuevos (archivo NUEVO `models-DB/script-conta/sp/10_rentabilidad_consultorio.sql`):
el SP y, si el ejecutor la necesita, una iTVF de detalle `conta.fn_Rentabilidad_IngresosDetalleEx`
(nivel línea con predicados EXACTOS del universo). **Nada existente se modifica en BD.**

---

## 3. FASE 1 — Base de datos (ejecutor: db-experto)

### 3.1 Universo (idéntico al canónico, nivel detalle)

Replicar los predicados EXACTOS de `conta.fn_Rentabilidad_IngresosEx` (leer su definición VIVA):
4 filtros canónicos + `vd.i_Eliminado=0` + dh41 crédito (`@IncluirCredito=1 OR
ISNULL(dh41.v_Value1,'')<>'CREDITO'`) + fecha `v.t_InsertaFecha` en el mes + unidad vía
`tipocaja_clientetipo`/`tipocaja`. GATE de auto-consistencia: la réplica a nivel línea DEBE
reproducir al centavo los netos por unidad de la fn (ya probado: 278,397.77 / 168,065.60 / etc.).

### 3.2 Rama ASISTENCIAL (unidad ATENCION_ASISTENCIAL)

1. Neto por venta = `SUM(vd.d_Valor)` agrupado por venta.
2. Puente A (§1.2, ventana ±15d, dedup `rn=1`) → `protocol.i_Consultorio` → etiqueta grupo 403.
3. Regla de rescate: `i_Consultorio IS NULL AND pr.v_Procedencia='H'` → 'HOSPITALIZACION'.
4. Sin match o sin consultorio → fila '(SIN CLASIFICAR)' del grupo (el neto NUNCA se descarta).

### 3.3 Rama OCUPACIONAL (unidad ATENCION_OCUPACIONAL)

1. Neto por venta = `SUM(vd.d_Valor)` (el total facturado REAL — la tubería no se toca).
2. Puentes: A (boletas) ∪ B (liquidación→services). Servicios del paquete → `servicecomponent`
   (`ISNULL(sc.i_IsDeleted,0)=0`, filtrar `s.d_ServiceDate >= DATEADD(MONTH,-12,@ini)` para
   aprovechar el clustered) → `component.i_CategoryId` → etiqueta grupo 116.
3. **Prorrateo anti-fan-out (obligatorio)**: peso = `ISNULL(NULLIF(sc.r_Price,0), c.r_BasePrice)`
   (C1: `sc.r_Price` es el precio pactado real; `r_BasePrice` solo fallback de peso).
   `IngresoComponente = NetoVenta * Peso / SUM(Peso) OVER (PARTITION BY venta)` → la suma por
   venta = neto exacto de la venta, inmune a duplicación (1 venta → hasta ~15k componentes).
4. Venta sin puente (EDP sin liquidación aún) → '(SIN CLASIFICAR)' del grupo.

### 3.4 Salida del SP (2 resultsets, shape NUEVO — no toca DTOs existentes)

**RS1 (la vista):** `Grupo NVARCHAR(20)` ('ASISTENCIAL'|'OCUPACIONAL'|'OTRAS_UNIDADES') ·
`Consultorio NVARCHAR(100)` (etiqueta 403/116, '(SIN CLASIFICAR)', o el nombre de unidad para
OTRAS) · `Ingresos DECIMAL(18,2)` · `PorcDelGrupo DECIMAL(9,2)` · `EsNoClasificado BIT` ·
`EsTotal BIT` (fila TOTAL por grupo). Orden: Grupo, EsTotal, Ingresos DESC.
OTRAS_UNIDADES (C6): una fila por unidad, SISOL a **NetoRentabilidad** (% clínica vigente,
misma subquery `porc` de la fn) para que el gran total == Ingresos de Rentabilidad General.

**RS2 (diagnóstico de la fuga, C3):** `Grupo` · `Motivo` ('SIN_SERVICE'|'SIN_CONSULTORIO'|
'SIN_LIQUIDACION') · `Referencia` (descripción de línea o serie-correlativo) · `Monto` — TOP 50
por monto DESC. Es la herramienta para curar la fuga del ~17% después.

### 3.5 Restricciones y lista negra

- SQL 2012 estricto (sin STRING_SPLIT/TRIM/CREATE OR ALTER; `LTRIM(RTRIM())`, CHARINDEX,
  ROW_NUMBER, SUM() OVER). Cero DDL/índices fuera de `conta`. `SigesoftDesarrollo_2` y `dbo`:
  SOLO SELECT.
- **NO tocar**: `fn_Rentabilidad_Ingresos(Ex)`, `fn_Rentabilidad_Gastos`, `fn_Rentabilidad_TotalesMes(Ex)`,
  ningún `sp_Rentabilidad_*` existente, `sp_Sisol_*`, `sp_Caja_*`, cierres.
- Objeto nuevo en archivo nuevo `10_rentabilidad_consultorio.sql` (patrón IF OBJECT_ID DROP / GO / CREATE),
  repo == producción al terminar.

### 3.6 GATE 1 (BD) — evidencia obligatoria

| # | Prueba (jun-2026 salvo indicación) | Esperado |
|---|---|---|
| 1.1 | **RECONCILIACIÓN (el gate rey)**: `SUM(Ingresos)` de RS1 (todo, incl. SIN CLASIFICAR y OTRAS) | == `SUM(NetoRentabilidad)` de `fn_Rentabilidad_IngresosEx(2026,6,@flag)` **al centavo**, para @flag=1 Y @flag=0 |
| 1.2 | TOTAL grupo ASISTENCIAL (flag=1) | **278,397.77** |
| 1.3 | TOTAL grupo OCUPACIONAL (flag=1) | **168,065.60** |
| 1.4 | Con `@IncluirCredito=0` | OCUPACIONAL se desploma (~7k de 168k — 92.9% era crédito); ASISTENCIAL apenas cambia |
| 1.5 | Plausibilidad asistencial | LABORATORIO ≈ 37.5k como top; SIN CLASIFICAR ≈ 17% del grupo (§1.4) |
| 1.6 | Plausibilidad ocupacional | LABORATORIO como top de lo clasificado; SIN_LIQUIDACION domina el RS2 ocupacional del mes corriente |
| 1.7 | Anti-fan-out | Para 3 ventas ocupacionales matcheadas elegidas al azar: `SUM(IngresoComponente)` por venta == neto exacto de la venta |
| 1.8 | Performance | SP completo < 5s (medido en investigación: 1.3–2.4s) |
| 1.9 | may-2026 (mes maduro) | Reconciliación 1.1 también exacta; SIN CLASIFICAR ocupacional notablemente menor que en jun (las liquidaciones ya llegaron) |
| 1.10 | Intocables | `modify_date` de todos los objetos de la lista negra SIN cambio; cero objetos nuevos fuera de `conta` |

---

## 4. FASE 2 — Backend API (ejecutor: backend-api)

> ⚠️ Liberar el puerto 5090 antes de compilar (Stop-Process); NO relanzar el server (lo hace el orquestador).

1. DTOs nuevos en `Models/Dtos.cs` (junto a los de rentabilidad):
```csharp
public class RentabilidadConsultorioRow
{
    public string Grupo { get; set; }
    public string Consultorio { get; set; }
    public decimal Ingresos { get; set; }
    public decimal PorcDelGrupo { get; set; }
    public bool EsNoClasificado { get; set; }
    public bool EsTotal { get; set; }
}
public class RentabilidadConsultorioDiagRow
{
    public string Grupo { get; set; }
    public string Motivo { get; set; }
    public string Referencia { get; set; }
    public decimal Monto { get; set; }
}
public class RentabilidadConsultorioResponse
{
    public List<RentabilidadConsultorioRow> Filas { get; set; } = new();
    public List<RentabilidadConsultorioDiagRow> SinClasificar { get; set; } = new();
}
```
2. Repo `RentabilidadRepository.cs`: `PorConsultorio(short anio, byte mes, bool incluirCredito)`
   con **`QueryMultiple`** (2 resultsets) → mapea a `RentabilidadConsultorioResponse`.
3. Controller: `[HttpGet("por-consultorio")]` en `RentabilidadController` con
   `anio, mes, [FromQuery] bool incluirCredito = true` (mismo estilo que por-unidad).
4. **GATE 2**: `dotnet build` 0 errores; runtime (orquestador): el JSON reproduce los números del
   GATE 1 (reconciliación, totales por grupo, flag OFF).

---

## 5. FASE 3 — Frontend (ejecutor: bi-frontend)

1. Tipos en `contaTypes.ts`: `RentabilidadConsultorioRow`, `RentabilidadConsultorioDiagRow`,
   `RentabilidadConsultorioResponse` (calcados del DTO, PascalCase).
2. Service: `rentabilidadPorConsultorio(anio, mes, incluirCredito?)` → GET
   `/rentabilidad/por-consultorio` (misma convención: solo enviar `incluirCredito=false` si OFF).
3. **`Rentabilidad.tsx` — el cambio central (C4):** el `load()` del filtro de cabecera pasa a un
   `Promise.all` de **4 llamadas**: `rentabilidadGeneral` + `rentabilidadComparativa` (existentes)
   + `rentabilidadPorUnidad` + `rentabilidadPorConsultorio` (todas con el MISMO
   año/mes/incluirCredito). Loading independiente por sección (spinners locales; la sección 1 no
   debe esperar a la 3).
4. **Sección 2 — "Rentabilidad por Unidad"** (debajo del gráfico): tabla compacta
   Unidad · Ingresos · Gastos · Resultado · Margen · Estado (mismos campos de
   `RentabilidadUnidadRow`; SIN el detalle expandible de gastos — para eso está la página
   dedicada, que queda intacta, C8). Respeta el comportamiento del toggle OFF ya existente
   (gastos rotulados, resultado atenuado — mismas reglas T3/T4 del plan del toggle).
5. **Sección 3 — "Rentabilidad por Consultorio"**: subtítulo "distribución de ingresos" (C1).
   Dos bloques lado a lado (grid responsive) — **ASISTENCIAL** y **OCUPACIONAL**: filas
   Consultorio · Ingresos · % del grupo, orden Ingresos DESC, fila '(SIN CLASIFICAR)' resaltada
   (ámbar) y fila TOTAL. Debajo, línea compacta de cuadre: "Otras unidades (SISOL al %, Farmacia,
   Seguros): S/ X — el gran total cuadra con el KPI Ingresos". Nota fija en el bloque Ocupacional:
   "el mes en curso puede tener monto sin clasificar hasta que lleguen las liquidaciones EDP".
   Colapsable "Ver detalle sin clasificar" → tabla del RS2 (Motivo · Referencia · Monto).
6. Estado: el filtro de cabecera EXISTENTE (año/mes/toggle crédito) es la única fuente — cero
   filtros nuevos, cero persistencia.
7. **GATE 3**: `npx tsc --noEmit` 0 errores; carga default (crédito ON) = sección 1 idéntica a hoy
   + secciones 2/3 pobladas; toggle OFF actualiza las 3 secciones coherentemente (Ocupacional del
   bloque consultorio casi desaparece — es correcto, C7).

---

## 6. Verificación E2E final (orquestador)

1. Reiniciar API; curls: reconciliación `por-consultorio` (suma total) vs `general.Ingresos`
   (mismo flag) al centavo; totales de grupo vs anclas §1.4; flag OFF.
2. Navegador `/conta/rentabilidad` jun-2026: las 3 secciones con un solo filtro; totales visibles
   cuadran entre secciones (TOTAL por unidad == KPI; gran total consultorios == KPI Ingresos).
3. Regresión: `/conta/rentabilidad-unidades` intacta; `sp_Sisol_*`/cierres sin bump.

## 7. Orden, responsables y commit

FASE 1 (db-experto, GATE 1) → FASES 2+3 en paralelo (contratos fijados aquí) → E2E (orquestador).
Commit integrador: `feat(conta): rentabilidad por consultorio asistencial/ocupacional en pagina rentabilidad`
(10_rentabilidad_consultorio.sql + API + front + este PLAN). Registrar en `LOG_EJECUCION_CONTA.md`.

## 8. Anti-objetivos (releer antes de codear)

- NO inventar costo/margen (C1: no existe fuente; `r_BasePrice` es lista, solo peso de prorrateo).
- NO usar `LIKE` cross-DB contra `v_ComprobantePago` (cuelga); NO omitir la ventana ±15d ni el dedup rn=1.
- NO atribuir ingreso desde `sc.r_Price` directamente (es dimensión/peso; el dinero SIEMPRE sale de `ventadetalle.d_Valor`).
- NO descartar ingreso no clasificado (SIN CLASIFICAR lo absorbe; reconciliación exacta o es bug).
- NO tocar objetos existentes de BD; NO modificar `/conta/rentabilidad-unidades`; NO agregar filtros nuevos de cabecera.
- NO gates duros sobre cifras que dependan del % SISOL sin baseline vivo (solo la reconciliación relativa).

## 9. Evolución futura anotada (NO implementar ahora)

- **Curar la fuga asistencial (~17%)** con el RS2: reglas nuevas (p.ej. certificados → consultorio
  fijo), corrección de catálogo (protocolos H sin i_Consultorio=46), ampliación de ventana.
- **Margen real por consultorio (v2)**: atribuir los egresos ECA/ECF (pagos a médicos) por
  consultorio reutilizando la lógica del legacy `sp_PagoMedicoPorConsultorioCompleto`, y/o el %
  de pago por consultorio (grupo 403 `v_Value2`, hoy 65 parejo) como costo teórico.
- `conta.consultorio_map` para agrupar las 96 categorías del grupo 116 en la vista gerencial.

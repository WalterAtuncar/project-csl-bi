-- =====================================================================
-- ddl/23 - NLQ v2 (RONDA "PLATA"): vista curada CROSS-DB que enlaza el
-- clinico (atencion/consultorio) con el financiero (venta/ingreso).
-- Dominio nuevo 'ingresos_clinicos'. Fecha: 2026-07-28.
--
-- conta.v_nlq_ingreso_consultorio: ingreso NETO devengado por CONSULTORIO
-- (y mes), grupos ASISTENCIAL (tipocaja=1) y SISOL (tipocaja=3). REUSA la
-- logica YA CUADRADA de conta.sp_Rentabilidad_PorConsultorio (sp/10):
--   * MONEY = universo canonico de conta.fn_Rentabilidad_IngresosDetalleEx
--     (4 filtros sagrados, credito INCLUIDO = @IncluirCredito=1), tipocaja IN(1,3),
--     NetoVenta = SUM(vd.d_Valor) por venta. INLINE (una vista no llama iTVF con
--     parametros); es identico al universo probado en v_nlq_rentabilidad.
--   * CONSULTORIO (dimension) = Puente A: service.v_ComprobantePago (lista
--     pipe '|') tokenizado ↔ venta.v_CorrelativoDocumentoFin, dedup rn=1 sobre
--     el token, protocol.i_Consultorio -> systemparameter g403 (nombre legible).
--     Capa 1 (Puente A) + Capa 2 (Procedencia 'H' / SALA DE OPERACIONES ->
--     'HOSPITALIZACION') del SP. El join service<->venta VIVE DENTRO de la vista;
--     NUNCA se expone crudo.
--
-- >>> AUTO-CUADRE VERIFICADO AL CENTAVO (@IncluirCredito=1) vs sp_Rentabilidad_
--     PorConsultorio RS3: may-2026 ASIST 319207.73 / SISOL 114159.35; jun-2026
--     ASIST 278397.77 / SISOL 109503.94. El TOTAL por (mes,Grupo) es invariante a
--     la clasificacion (LEFT JOIN venta-driven) -> cuadra por universo compartido. <<<
--
-- DECISIONES / matices (reportados al orquestador):
--   * SISOL a NETO PLENO (100%), NO el 30% clinica (decision D1 del SP por-
--     consultorio). DISTINTO de v_nlq_rentabilidad (que muestra SISOL al % clinica).
--   * Se OMITEN las Capas 3 y 4 del SP (rescate cliente->person->service 'H' en
--     +-15d, y heuristica por descripcion LIKE '%HOSPITALIZA%'...): solo mueven un
--     residuo de '(SIN CLASIFICAR)' a 'HOSPITALIZACION' y NO cambian el total. Por
--     eso el split HOSPITALIZACION/(SIN CLASIFICAR) puede diferir del SP; el TOTAL no.
--   * PISO DE ATENCIONES d_ServiceDate >= '2025-12-01' en la tokenizacion (= 15 dias
--     antes del periodo demo 2026, replica la ventana +-15d del SP para TODO 2026).
--     Es solo de PERFORMANCE (32s -> ~3s) y el TOTAL es INVARIANTE al piso (venta-
--     driven); solo acota la dimension consultorio a atenciones >= esa fecha (el demo
--     es 2026, sin atenciones previas relevantes). Si el demo se extiende, bajar el piso.
--   * Tally por LITERALES (nums, 128) en vez de master.dbo.spt_values -> el login
--     reader NO necesita permisos a master ni depende de visibilidad de metadata.
--   * Solo INGRESO (el nombre lo dice). Egresos por consultorio hoy = 0 (ningun
--     conta.egreso tiene i_IdConsultorio) -> se omiten; "mas rentable" ~ "mas ingreso".
--
-- ADITIVO schema conta, CERO dbo / CERO SigesoftDesarrollo_2 (solo SELECT).
-- SQL 2012. Idempotente (DROP VIEW / GO / CREATE). UTF-8 SIN BOM (ASCII).
-- =====================================================================

IF OBJECT_ID('conta.v_nlq_ingreso_consultorio','V') IS NOT NULL DROP VIEW conta.v_nlq_ingreso_consultorio;
GO
CREATE VIEW conta.v_nlq_ingreso_consultorio
AS
    WITH nums AS (
        -- Tally 1..128 por literales (v_ComprobantePago <= 100 chars). Sin acceso a objetos.
        SELECT TOP 128 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS number
        FROM (VALUES(1),(1),(1),(1),(1),(1),(1),(1),(1),(1),(1),(1)) a(x)
        CROSS JOIN (VALUES(1),(1),(1),(1),(1),(1),(1),(1),(1),(1),(1),(1)) b(x)
    ),
    ventas AS (
        -- Universo canonico (4 filtros sagrados, credito INCLUIDO), tipocaja IN(1,3), a nivel linea.
        SELECT
            YEAR(v.t_InsertaFecha)  AS Anio,
            MONTH(v.t_InsertaFecha) AS Mes,
            v.v_IdVenta,
            tcct.i_IdTipoCaja       AS IdUnidad,
            LTRIM(RTRIM(v.v_CorrelativoDocumentoFin)) COLLATE DATABASE_DEFAULT AS corrFin,
            vd.d_Valor              AS Neto
        FROM dbo.venta v
        JOIN dbo.ventadetalle vd
            ON vd.v_IdVenta = v.v_IdVenta AND ISNULL(vd.i_Eliminado,0) = 0
        LEFT JOIN dbo.tipocaja_clientetipo tcct
            ON tcct.i_ClienteEsAgente = v.i_ClienteEsAgente AND tcct.b_Activo = 1
        WHERE ISNULL(v.i_Eliminado,0) = 0
          AND v.i_ClienteEsAgente IS NOT NULL
          AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3,4))
          AND ISNULL(v.v_SerieDocumento,'') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')
          AND tcct.i_IdTipoCaja IN (1,3)
    ),
    vagg AS (
        -- 1 fila por venta (NetoVenta = SUM lineas). corrFin = clave Puente A.
        SELECT Anio, Mes, v_IdVenta, IdUnidad, corrFin,
               CAST(SUM(Neto) AS DECIMAL(18,2)) AS NetoVenta
        FROM ventas
        GROUP BY Anio, Mes, v_IdVenta, IdUnidad, corrFin
    ),
    svcbase AS (
        -- Atenciones con comprobante(s). Piso de performance (ver header): total invariante.
        SELECT s.v_ProtocolId, s.d_ServiceDate,
               LTRIM(RTRIM(s.v_ComprobantePago)) COLLATE DATABASE_DEFAULT AS cp
        FROM SigesoftDesarrollo_2.dbo.service s
        WHERE ISNULL(s.i_IsDeleted,0) = 0
          AND s.v_ComprobantePago IS NOT NULL
          AND LTRIM(RTRIM(s.v_ComprobantePago)) <> ''
          AND s.d_ServiceDate >= '2025-12-01'
    ),
    tok AS (
        -- Split de la lista pipe '|' en tokens (comprobantes). TokPrimario=1 = arranque.
        SELECT b.v_ProtocolId, b.d_ServiceDate,
            CAST(CASE WHEN n.number = 1 THEN 1 ELSE 0 END AS TINYINT) AS TokPrimario,
            LTRIM(RTRIM(SUBSTRING(b.cp, n.number,
                CASE WHEN CHARINDEX('|', b.cp + '|', CASE WHEN n.number < 1 THEN 1 ELSE n.number END) >= n.number
                     THEN CHARINDEX('|', b.cp + '|', CASE WHEN n.number < 1 THEN 1 ELSE n.number END) - n.number
                     ELSE 0 END)))
                COLLATE DATABASE_DEFAULT AS token
        FROM svcbase b
        JOIN nums n
            ON n.number >= 1 AND n.number <= LEN(b.cp)
           AND (n.number = 1 OR SUBSTRING(b.cp, CASE WHEN n.number < 2 THEN 1 ELSE n.number-1 END, 1) = '|')
    ),
    svcA AS (
        -- Dedup rn=1 por token (prefiere token primario, luego atencion mas reciente).
        SELECT token, i_Consultorio, v_Procedencia, EsSalaOps
        FROM (
            SELECT tk.token, pr.i_Consultorio,
                   LTRIM(RTRIM(pr.v_Procedencia)) COLLATE DATABASE_DEFAULT AS v_Procedencia,
                   CAST(CASE WHEN pr.v_Name LIKE 'SALA DE OPERACIONES%' THEN 1 ELSE 0 END AS TINYINT) AS EsSalaOps,
                   ROW_NUMBER() OVER (PARTITION BY tk.token
                                      ORDER BY tk.TokPrimario DESC, tk.d_ServiceDate DESC) AS rn
            FROM tok tk
            JOIN SigesoftDesarrollo_2.dbo.protocol pr ON pr.v_ProtocolId = tk.v_ProtocolId
            WHERE tk.token <> ''
        ) z
        WHERE z.rn = 1
    )
    SELECT
        va.Anio,
        va.Mes,
        CASE WHEN va.IdUnidad = 1 THEN 'ASISTENCIAL' ELSE 'SISOL' END           AS Grupo,
        CASE WHEN sv.token IS NULL THEN '(SIN CLASIFICAR)'
             WHEN sv.i_Consultorio IS NULL AND va.IdUnidad = 1
                  AND (sv.v_Procedencia = 'H' OR sv.EsSalaOps = 1) THEN 'HOSPITALIZACION'
             WHEN sv.i_Consultorio IS NULL THEN '(SIN CLASIFICAR)'
             ELSE ISNULL(sp.v_Value1,'(SIN CLASIFICAR)')
        END COLLATE DATABASE_DEFAULT                                            AS Consultorio,
        sv.i_Consultorio                                                        AS IdConsultorio,
        va.NetoVenta                                                            AS Ingresos,
        va.v_IdVenta                                                            AS IdVenta
    FROM vagg va
    LEFT JOIN svcA sv
        ON sv.token = va.corrFin AND va.corrFin <> ''
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp
        ON sp.i_GroupId = 403 AND sp.i_ParameterId = sv.i_Consultorio;
GO


-- #####################################################################
-- SEED del catalogo: registra la vista (b_Activa=1, dominio ingresos_clinicos).
-- Idempotente (NOT EXISTS). PK/FK NULL como las otras vistas curadas.
-- #####################################################################

-- 1) nlq_tabla
INSERT INTO conta.nlq_tabla (v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, b_Activa, v_Descripcion)
SELECT x.v_Base, x.v_Schema, x.v_Objeto, x.v_TipoObjeto, x.v_Dominio, 1, x.v_Descripcion
FROM (VALUES
    ('20505310072','conta','v_nlq_ingreso_consultorio','V','ingresos_clinicos',
     'Ingreso NETO devengado (sin IGV) por CONSULTORIO y mes; grupos ASISTENCIAL (tipocaja 1) y SISOL (tipocaja 3, a NETO PLENO 100%, no 30% clinica). El consultorio se resuelve por dentro (atencion->comprobante->venta->systemparameter 403); buckets HOSPITALIZACION y (SIN CLASIFICAR). Total por mes/grupo cuadra al centavo con sp_Rentabilidad_PorConsultorio. USAR PARA: ingreso por consultorio, consultorio mas rentable, asistencial vs SISOL.')
) x(v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, v_Descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_tabla t
    WHERE t.v_Base = x.v_Base AND t.v_Schema = x.v_Schema AND t.v_Objeto = x.v_Objeto);
GO

-- 2) nlq_columna
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='20505310072' AND v_Schema='conta' AND v_Objeto='v_nlq_ingreso_consultorio') t
CROSS JOIN (VALUES
    ('Anio','int','Anio de la venta (devengado, t_InsertaFecha).'),
    ('Mes','int','Mes 1..12 de la venta.'),
    ('Grupo','nvarchar(20)','ASISTENCIAL (tipocaja 1) o SISOL (tipocaja 3). Agrupa/filtra por Grupo.'),
    ('Consultorio','nvarchar(100)','Nombre del consultorio (systemparameter g403), o HOSPITALIZACION, o (SIN CLASIFICAR).'),
    ('IdConsultorio','int','Id del consultorio en systemparameter g403 (NULL si HOSPITALIZACION / no clasificado).'),
    ('Ingresos','decimal','Ingreso NETO devengado SIN IGV de la venta (SISOL a NETO PLENO 100%). Suma para el total del consultorio.'),
    ('IdVenta','nchar(16)','Id de la venta (grano = 1 fila por venta).')
) x(v_Columna, v_TipoDato, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 3) nlq_regla_negocio (dominio ingresos_clinicos)
INSERT INTO conta.nlq_regla_negocio (v_Dominio, v_Objeto, v_Regla, b_Activa, i_Orden)
SELECT x.v_Dominio, x.v_Objeto, x.v_Regla, 1, x.i_Orden
FROM (VALUES
    ('ingresos_clinicos','conta.v_nlq_ingreso_consultorio',
     'Ingreso por consultorio: usa SIEMPRE conta.v_nlq_ingreso_consultorio (el join atencion<->venta ya vive dentro; NUNCA cruces service con venta crudas). Ingresos = NETO devengado SIN IGV. Grupo = ASISTENCIAL (tipocaja 1) o SISOL (tipocaja 3); agrupa/filtra por Grupo y Consultorio, no por ids.', 1),
    ('ingresos_clinicos','conta.v_nlq_ingreso_consultorio',
     'SISOL aqui esta a NETO PLENO (100%), NO al 30% clinica (a diferencia de v_nlq_rentabilidad). El total por mes y Grupo cuadra al centavo con sp_Rentabilidad_PorConsultorio. HOSPITALIZACION y (SIN CLASIFICAR) son buckets de atenciones sin consultorio 403 resoluble.', 2)
) x(v_Dominio, v_Objeto, v_Regla, i_Orden)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_regla_negocio r
    WHERE r.v_Dominio = x.v_Dominio AND r.v_Regla = x.v_Regla);
GO

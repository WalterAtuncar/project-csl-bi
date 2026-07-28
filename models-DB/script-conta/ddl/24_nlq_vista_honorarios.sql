-- =====================================================================
-- ddl/24 - NLQ v2 (RONDA HONORARIOS): vista curada cross-DB de HONORARIO
-- NETO por defecto, por MEDICO / consultorio / mes. Dominio 'ingresos_clinicos'.
-- Fecha: 2026-07-28. PO opcion (A): medico DETERMINISTICO.
--
-- conta.v_nlq_honorarios: reproduce el NETO por defecto de la logica de pago de
-- honorarios (front legacy GenerarPagoHonorarioModal + sp_PagoHonorario_Insert),
-- sobre el MISMO universo que conta.sp_Honorarios_Analisis (sys.sql_modules,
-- modify_date 2026-07-19):
--   NETO por LINEA = (EFECTIVO? precio : VISA? precio*0.96 : 0) * 0.82
--   - precio = ventadetalle.d_Precio de la LINEA de venta emparejada al servicio.
--   - EFECTIVO/VISA por el CASE extformapago_t del SP (cd.i_IdFormaPago +
--     cd.i_IdTipoDocumentoRef, precedencia SIN PAGO/DEPOSITO/CREDITO/EGRESO).
--     Lineas que NO son EFECTIVO ni VISA aportan 0 (HonorarioNeto=0).
--   - VISA -4% (visaDiscountPercent=4) y x0.82 ("restar IGV") = DEFAULTS del front.
--     porcRef(65) es referencial (NO se aplica al monto); manualPercents vacio (factor 1).
--
-- >>> GATE AL CENTAVO (TOTAL, vs neto derivado del grid de sp_Honorarios_Analisis):
--     jun-2026 313860.37 ; may-2026 364392.87. El TOTAL por mes es INVARIANTE a la
--     atribucion de medico. <<<
--
-- MEDICO DETERMINISTICO (decision PO): servicecomponent, rn=1 ORDER BY
-- v_ServiceComponentId (estable/reproducible) -- NO el TOP-1 SIN ORDER del SP
-- (aleatorio). El TOTAL cuadra; el desglose por medico NO replica el del SP.
--
-- PERFORMANCE (cross-DB, aprendido en vivo): (1) el medico sale de servicecomponent
-- (~42M filas, indice date-first) via JOIN SET-BASED acotado por d_InsertDate>=piso
-- (NO OUTER APPLY -> el OUTER APPLY + GROUP BY hacia timeout: no empujaba el filtro
-- de mes). (2) piso de VENTA y de SERVICIO '2025-12-01'. (3) grano POR LINEA sin
-- GROUP BY interno -> el filtro externo Anio/Mes SI se empuja. Resultado: ~14s con
-- WHERE Anio/Mes (regla sembrada obliga a filtrar por periodo) + cache NLQ.
--
-- pago_honorario esta VACIA => HonorarioNeto es el neto POR-PAGAR calculado por
-- defecto, no pagos reales (mismo universo que el grid del SP, sin filtro de estado).
--
-- ADITIVO schema conta, CERO dbo / CERO SigesoftDesarrollo_2 (solo SELECT). SQL 2012.
-- Idempotente (DROP VIEW / GO / CREATE). UTF-8 SIN BOM (ASCII).
-- =====================================================================

IF OBJECT_ID('conta.v_nlq_honorarios','V') IS NOT NULL DROP VIEW conta.v_nlq_honorarios;
GO
CREATE VIEW conta.v_nlq_honorarios
AS
    WITH nums AS (
        SELECT TOP 128 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS number
        FROM (VALUES(1),(1),(1),(1),(1),(1),(1),(1),(1),(1),(1),(1)) a(x)
        CROSS JOIN (VALUES(1),(1),(1),(1),(1),(1),(1),(1),(1),(1),(1),(1)) b(x)
    ),
    V AS (
        -- Universo #V del SP (piso de venta 2025-12-01 para acotar), con forma de pago.
        SELECT
            YEAR(v.t_InsertaFecha)  AS Anio,
            MONTH(v.t_InsertaFecha) AS Mes,
            (v.v_SerieDocumento + '-' + v.v_CorrelativoDocumento) COLLATE DATABASE_DEFAULT AS Comprobante,
            CAST(vd.d_Precio AS DECIMAL(14,2)) AS precio,
            CASE WHEN v.d_Total = 0.00 THEN 'SIN PAGO'
                 WHEN v.i_IdCondicionPago = 5 THEN 'DEPOSITO'
                 WHEN cd.i_IdTipoDocumentoRef IS NULL THEN 'CREDITO'
                 WHEN v.v_SerieDocumento = 'ECS' THEN 'EGRESO'
                 WHEN cd.i_IdFormaPago = 9 AND cd.i_IdTipoDocumentoRef = -1 THEN 'DEPOSITO'
                 WHEN cd.i_IdFormaPago = 1 AND cd.i_IdTipoDocumentoRef = -1 THEN 'EFECTIVO SOLES'
                 WHEN cd.i_IdFormaPago = 2 AND cd.i_IdTipoDocumentoRef = 421 THEN 'VISA'
                 ELSE '- - -' END AS fp
        FROM dbo.venta v
        JOIN dbo.cliente c ON v.v_IdCliente = c.v_IdCliente
        LEFT JOIN dbo.ventadetalle vd ON v.v_IdVenta = vd.v_IdVenta AND vd.i_Eliminado = 0
        LEFT JOIN dbo.cobranzadetalle cd ON v.v_IdVenta = cd.v_IdVenta AND cd.i_Eliminado = 0
        JOIN dbo.systemuser sy ON v.i_InsertaIdUsuario = sy.i_SystemUserId
        WHERE v.i_Eliminado = 0
          AND v.i_IdTipoDocumento NOT IN (513, 500, 502)
          AND v.i_ClienteEsAgente <> 3
          AND v.t_InsertaFecha >= '2025-12-01'
          AND v.v_IdVenta NOT IN (
              'N001-ZQ000117673','N001-ZQ000117944','N001-ZQ000117950','N001-ZQ000118577',
              'N001-ZQ000118948','N001-ZQ000119229','N001-ZQ000119274','N001-ZQ000119499',
              'N001-ZQ000119735','N001-ZQ000120228','N001-ZQ000120308','N001-ZQ000120409',
              'N001-ZQ000120450','N001-ZQ000120522','N001-ZQ000120960','N001-ZQ000120968',
              'N001-ZQ000121051','N001-ZQ000121100','N001-ZQ000113070')
    ),
    Sbase AS (
        -- #S del SP: servicios pagables (masterType 9/42, con comprobante, calendar valido).
        SELECT
            s.v_ServiceId  COLLATE DATABASE_DEFAULT AS v_ServiceId,
            pr.i_Consultorio,
            LTRIM(RTRIM(s.v_ComprobantePago)) COLLATE DATABASE_DEFAULT AS cp,
            ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS rid
        FROM SigesoftDesarrollo_2.dbo.service s
        INNER JOIN SigesoftDesarrollo_2.dbo.protocol pr ON s.v_ProtocolId = pr.v_ProtocolId
        INNER JOIN SigesoftDesarrollo_2.dbo.person p ON s.v_PersonId = p.v_PersonId
        LEFT JOIN SigesoftDesarrollo_2.dbo.calendar cl ON s.v_ServiceId = cl.v_ServiceId
        WHERE (pr.i_MasterServiceTypeId = 9 OR pr.i_MasterServiceTypeId = 42)
          AND s.v_ComprobantePago IS NOT NULL
          AND s.d_ServiceDate >= '2025-12-01'
          AND cl.i_CalendarStatusId <> 3
          AND cl.i_IsDeleted = 0
    ),
    T AS (
        SELECT DISTINCT b.rid, b.v_ServiceId, b.i_Consultorio,
            LTRIM(RTRIM(SUBSTRING(b.cp, n.number, CHARINDEX('|', b.cp + '|', n.number) - n.number)))
                COLLATE DATABASE_DEFAULT AS tok
        FROM Sbase b
        JOIN nums n
            ON n.number <= LEN(b.cp)
           AND SUBSTRING('|' + b.cp, n.number, 1) = '|'
        WHERE LTRIM(RTRIM(SUBSTRING(b.cp, n.number, CHARINDEX('|', b.cp + '|', n.number) - n.number))) <> ''
    ),
    matched AS (
        -- 1 fila por LINEA de venta emparejada a un servicio. Neto por defecto por linea.
        SELECT V.Anio, V.Mes, T.v_ServiceId, T.i_Consultorio,
               CAST(
                   (CASE WHEN V.fp = 'EFECTIVO SOLES' THEN V.precio
                         WHEN V.fp = 'VISA'           THEN V.precio * 0.96
                         ELSE 0 END) * 0.82
               AS DECIMAL(18,6)) AS HonorarioNeto
        FROM V
        JOIN T ON V.Comprobante = T.tok
    ),
    scMed AS (
        -- Medico deterministico por servicio (servicecomponent acotado por d_InsertDate).
        SELECT v_ServiceId COLLATE DATABASE_DEFAULT AS v_ServiceId, i_MedicoTratanteId,
               ROW_NUMBER() OVER (PARTITION BY v_ServiceId ORDER BY v_ServiceComponentId) AS rn
        FROM SigesoftDesarrollo_2.dbo.servicecomponent
        WHERE d_InsertDate >= '2025-12-01'
    )
    SELECT
        m.Anio,
        m.Mes,
        syu.i_SystemUserId                                       AS IdMedico,
        ISNULL(pru.v_FirstLastName + ' ' + pru.v_SecondLastName + ', ' + pru.v_FirstName,
               'DE LA SOLIDARIDAD, HOSPITAL')                    AS Medico,
        ISNULL(sp.v_Value1 COLLATE DATABASE_DEFAULT, 'SIN CONSULTORIO') AS Consultorio,
        m.i_Consultorio                                          AS IdConsultorio,
        m.HonorarioNeto,
        m.v_ServiceId                                            AS v_ServiceId
    FROM matched m
    LEFT JOIN scMed sc ON sc.v_ServiceId = m.v_ServiceId AND sc.rn = 1
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemuser syu ON sc.i_MedicoTratanteId = syu.i_SystemUserId
    LEFT JOIN SigesoftDesarrollo_2.dbo.person pru ON syu.v_PersonId = pru.v_PersonId
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp
        ON sp.i_GroupId = 403 AND sp.i_ParameterId = m.i_Consultorio;
GO


-- #####################################################################
-- SEED del catalogo. Idempotente (NOT EXISTS). PK/FK NULL como las otras vistas.
-- #####################################################################

-- 1) nlq_tabla
INSERT INTO conta.nlq_tabla (v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, b_Activa, v_Descripcion)
SELECT x.v_Base, x.v_Schema, x.v_Objeto, x.v_TipoObjeto, x.v_Dominio, 1, x.v_Descripcion
FROM (VALUES
    ('20505310072','conta','v_nlq_honorarios','V','ingresos_clinicos',
     'Honorarios por MEDICO / consultorio / mes (1 fila por linea de venta emparejada). HonorarioNeto = neto CALCULADO por defecto (EFECTIVO pleno + VISA -4%, x0.82); SUMalo. pago_honorario VACIA -> es lo POR-PAGAR calculado, no pagos reales. Medico DETERMINISTICO (no replica el TOP-1 aleatorio del SP; el TOTAL si cuadra al centavo). FILTRA SIEMPRE por Anio/Mes (vista cara sin periodo). USAR PARA: honorarios por medico, cuanto se le paga a cada medico, honorarios por consultorio.')
) x(v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, v_Descripcion)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_tabla t
    WHERE t.v_Base = x.v_Base AND t.v_Schema = x.v_Schema AND t.v_Objeto = x.v_Objeto);
GO

-- 2) nlq_columna
INSERT INTO conta.nlq_columna (i_IdNlqTabla, v_Columna, v_TipoDato, v_Descripcion)
SELECT t.i_IdNlqTabla, x.v_Columna, x.v_TipoDato, x.v_Descripcion
FROM (SELECT i_IdNlqTabla FROM conta.nlq_tabla WHERE v_Base='20505310072' AND v_Schema='conta' AND v_Objeto='v_nlq_honorarios') t
CROSS JOIN (VALUES
    ('Anio','int','Anio de la venta/atencion (devengado). FILTRA SIEMPRE por este.'),
    ('Mes','int','Mes 1..12. FILTRA SIEMPRE por este (la vista es cara sin periodo).'),
    ('IdMedico','int','Id del medico (systemuser.i_SystemUserId); NULL si no resuelve.'),
    ('Medico','nvarchar(200)','Nombre del medico (apellidos, nombres desde person). Atribucion deterministica. Agrupa por este.'),
    ('Consultorio','nvarchar(200)','Consultorio (systemparameter g403) del servicio, o SIN CONSULTORIO.'),
    ('IdConsultorio','int','Id del consultorio en g403 (NULL si no resuelve).'),
    ('HonorarioNeto','decimal','Honorario NETO por defecto de la linea (efectivo pleno / VISA*0.96) * 0.82. 0 si la linea no es efectivo/visa. SUMar; cuadra al centavo con sp_Honorarios_Analisis.'),
    ('v_ServiceId','varchar(16)','Servicio/atencion emparejado. Grano = 1 fila por linea de venta. N de atenciones = COUNT(DISTINCT v_ServiceId).')
) x(v_Columna, v_TipoDato, v_Descripcion)
WHERE NOT EXISTS (SELECT 1 FROM conta.nlq_columna c WHERE c.i_IdNlqTabla=t.i_IdNlqTabla AND c.v_Columna=x.v_Columna);
GO

-- 3) nlq_regla_negocio (dominio ingresos_clinicos)
INSERT INTO conta.nlq_regla_negocio (v_Dominio, v_Objeto, v_Regla, b_Activa, i_Orden)
SELECT x.v_Dominio, x.v_Objeto, x.v_Regla, 1, x.i_Orden
FROM (VALUES
    ('ingresos_clinicos','conta.v_nlq_honorarios',
     'Honorarios por medico: usa conta.v_nlq_honorarios y FILTRA SIEMPRE por Anio y Mes (la vista es CARA sin filtro de periodo). HonorarioNeto = neto por defecto por linea (EFECTIVO pleno + VISA -4%, x0.82); SUMalo. Medico en la columna Medico; N atenciones = COUNT(DISTINCT v_ServiceId). Agrupa por Medico/Consultorio.', 3),
    ('ingresos_clinicos','conta.v_nlq_honorarios',
     'HonorarioNeto es lo POR-PAGAR calculado por defecto (pago_honorario vacia; no son pagos reales). Lineas que no son EFECTIVO ni VISA aportan 0. La atribucion de medico es determinista y el TOTAL por mes cuadra al centavo con sp_Honorarios_Analisis, pero el desglose por medico NO replica el TOP-1 aleatorio del SP.', 4)
) x(v_Dominio, v_Objeto, v_Regla, i_Orden)
WHERE NOT EXISTS (
    SELECT 1 FROM conta.nlq_regla_negocio r
    WHERE r.v_Dominio = x.v_Dominio AND r.v_Regla = x.v_Regla);
GO

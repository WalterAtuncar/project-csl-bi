-- =============================================================================
-- sp/25_especialistas.sql  -  Page /conta/especialistas
-- Atenciones y referencias por especialista. 4 SPs de SOLO LECTURA en schema
-- conta de 20505310072. Cruzan a SigesoftDesarrollo_2 (clinico) con three-part
-- naming + COLLATE DATABASE_DEFAULT en el join a dbo.venta (nchar<->varchar).
--
-- Hechos usados (PLAN_ESPECIALISTAS.md, verificados con data real 2026-07-29):
--   H1 fecha atencion = service.d_ServiceDate ; H2 tratante = servicecomponent
--   .i_MedicoTratanteId del componente i_IsRequiredId=1, dedup a 1/service por
--   menor v_ServiceComponentId ; H3 refiere = servicecomponent.i_ApplicantMedic ;
--   H4 especialidad INFERIDA protocol.i_Consultorio -> systemparameter g403 ;
--   H5 especialista = professional colegiado (v_ProfessionalCode<>'' e i_IsDeleted=0) ;
--   H7 puente atencion->boleta por service.v_ComprobantePago (1er token) -> venta ;
--   H8 acotar d_InsertDate en AMBAS tablas (buffer +-) + d_ServiceDate ;
--   H10 referencia efectiva = service vivo + venta viva.
--   Centinelas de medico: NOT IN (-1,0,11) y NOT NULL. Atencion viva: i_IsDeleted=0.
--   Anulacion de venta: v.i_Eliminado=0 (misma condicion que sp_Honorarios_Analisis).
-- SQL Server 2012: sin CREATE OR ALTER / STRING_SPLIT / TRIM ; OFFSET/FETCH OK ;
--   concat con STUFF+FOR XML PATH.
-- Los ALIAS del SELECT son EL CONTRATO para API/front. No renombrar.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) conta.sp_Especialistas_Filtros  - combos del card (2 resultsets)
-- ---------------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Especialistas_Filtros','P') IS NOT NULL DROP PROCEDURE conta.sp_Especialistas_Filtros;
GO
CREATE PROCEDURE conta.sp_Especialistas_Filtros
    @Desde DATE = NULL,
    @Hasta DATE = NULL,
    @IncAsistencial BIT = 1,   -- masterServiceType 9  PARTICULAR (casa asistencial / clinica)
    @IncSisol       BIT = 1,   -- masterServiceType 42 SISOL
    @IncSeguro      BIT = 1     -- masterServiceType 11 SEGUROS
AS
BEGIN
    SET NOCOUNT ON;

    IF @Hasta IS NULL SET @Hasta = CAST(GETDATE() AS DATE);
    IF @Desde IS NULL SET @Desde = DATEADD(MONTH, -12, @Hasta);

    DECLARE @scDesde DATETIME = DATEADD(DAY, -3, CAST(@Desde AS DATETIME));  -- seek d_InsertDate
    DECLARE @scHasta DATETIME = DATEADD(DAY,  4, CAST(@Hasta AS DATETIME));
    DECLARE @sdHasta DATETIME = DATEADD(DAY,  1, CAST(@Hasta AS DATETIME));  -- limite d_ServiceDate

    IF OBJECT_ID('tempdb..#mc') IS NOT NULL DROP TABLE #mc;

    -- Matriz medico x consultorio (tratante deduplicado H2), servicios vivos en rango.
    ;WITH sc_tr AS (
        SELECT sc.v_ServiceId, sc.i_MedicoTratanteId AS MedicoId,
               ROW_NUMBER() OVER (PARTITION BY sc.v_ServiceId ORDER BY sc.v_ServiceComponentId) AS rn
        FROM SigesoftDesarrollo_2.dbo.servicecomponent sc
        WHERE sc.i_IsRequiredId = 1
          AND sc.i_MedicoTratanteId IS NOT NULL AND sc.i_MedicoTratanteId NOT IN (-1,0,11)
          AND ISNULL(sc.i_IsDeleted,0) = 0
          AND sc.d_InsertDate >= @scDesde AND sc.d_InsertDate < @scHasta
    )
    -- Especialidad via LEFT (consultorios NULL/no-403 cuentan en el total pero no como especialidad).
    SELECT t.MedicoId, p.i_Consultorio AS ConsultorioId, sp403.v_Value1 AS Especialidad,
           COUNT(DISTINCT t.v_ServiceId) AS NumAtenciones
    INTO #mc
    FROM sc_tr t
    JOIN SigesoftDesarrollo_2.dbo.service  s ON s.v_ServiceId  = t.v_ServiceId
    JOIN SigesoftDesarrollo_2.dbo.protocol p ON p.v_ProtocolId = s.v_ProtocolId
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp403 ON sp403.i_GroupId = 403 AND sp403.i_ParameterId = p.i_Consultorio
    WHERE t.rn = 1
      AND s.i_IsDeleted = 0
      AND s.d_InsertDate  >= @scDesde AND s.d_InsertDate  < @scHasta
      AND s.d_ServiceDate >= @Desde   AND s.d_ServiceDate < @sdHasta
      -- Universo canonico: SOLO 9 asistencial / 42 SISOL / 11 SEGUROS (excluye 1 ocupacional, 34 MTC, etc.)
      AND ( (@IncAsistencial = 1 AND p.i_MasterServiceTypeId = 9)
         OR (@IncSisol       = 1 AND p.i_MasterServiceTypeId = 42)
         OR (@IncSeguro      = 1 AND p.i_MasterServiceTypeId = 11) )
    GROUP BY t.MedicoId, p.i_Consultorio, sp403.v_Value1;

    -- #dom: 1 fila por medico con su consultorio/especialidad DOMINANTE (mas atenciones) + TOTAL atenciones.
    IF OBJECT_ID('tempdb..#dom') IS NOT NULL DROP TABLE #dom;
    ;WITH totf AS (
        SELECT MedicoId, SUM(NumAtenciones) AS TotAten FROM #mc GROUP BY MedicoId
    ),
    espf AS (
        SELECT MedicoId, ConsultorioId, Especialidad, NumAtenciones,
               ROW_NUMBER() OVER (PARTITION BY MedicoId ORDER BY NumAtenciones DESC, Especialidad) AS rn
        FROM #mc WHERE Especialidad IS NOT NULL
    )
    SELECT e.MedicoId, e.ConsultorioId, e.Especialidad, tf.TotAten AS NumAtenciones
    INTO #dom
    FROM espf e
    JOIN totf tf ON tf.MedicoId = e.MedicoId
    WHERE e.rn = 1;

    -- RS1: especialidades DOMINANTES distintas (cada opcion del dropdown rinde >=1 especialista).
    SELECT DISTINCT d.ConsultorioId, d.Especialidad
    FROM #dom d
    JOIN SigesoftDesarrollo_2.dbo.systemuser   su ON su.i_SystemUserId = d.MedicoId
    JOIN SigesoftDesarrollo_2.dbo.professional pr ON pr.v_PersonId = su.v_PersonId
         AND ISNULL(pr.i_IsDeleted,0) = 0 AND ISNULL(pr.v_ProfessionalCode,'') <> ''
    ORDER BY d.Especialidad;

    -- RS2: 1 fila por ESPECIALISTA con su consultorio/especialidad DOMINANTE + total de atenciones.
    SELECT su.i_SystemUserId AS MedicoId,
           su.v_UserName     AS UserName,
           LTRIM(RTRIM(pe.v_FirstLastName + ' ' + ISNULL(pe.v_SecondLastName,'') + ', ' + ISNULL(pe.v_FirstName,''))) AS Medico,
           pr.v_ProfessionalCode AS Colegiatura,
           d.ConsultorioId,
           d.Especialidad,
           d.NumAtenciones
    FROM #dom d
    JOIN SigesoftDesarrollo_2.dbo.systemuser   su ON su.i_SystemUserId = d.MedicoId
    JOIN SigesoftDesarrollo_2.dbo.professional pr ON pr.v_PersonId = su.v_PersonId
         AND ISNULL(pr.i_IsDeleted,0) = 0 AND ISNULL(pr.v_ProfessionalCode,'') <> ''
    JOIN SigesoftDesarrollo_2.dbo.person       pe ON pe.v_PersonId = su.v_PersonId
    ORDER BY Medico;

    IF OBJECT_ID('tempdb..#dom') IS NOT NULL DROP TABLE #dom;
    IF OBJECT_ID('tempdb..#mc')  IS NOT NULL DROP TABLE #mc;
END
GO

-- ---------------------------------------------------------------------------
-- 2) conta.sp_Especialistas_Resumen  - bandeja principal paginada
-- ---------------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Especialistas_Resumen','P') IS NOT NULL DROP PROCEDURE conta.sp_Especialistas_Resumen;
GO
CREATE PROCEDURE conta.sp_Especialistas_Resumen
    @Desde DATE,
    @Hasta DATE,
    @ConsultorioId INT = NULL,
    @MedicoId INT = NULL,
    @Pagina INT = 1,
    @Tamanio INT = 25,
    @IncAsistencial BIT = 1,   -- 9 asistencial | 42 SISOL | 11 SEGUROS (universo canonico)
    @IncSisol       BIT = 1,
    @IncSeguro      BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina < 1 SET @Pagina = 1;
    IF @Tamanio < 0 SET @Tamanio = 0;

    DECLARE @scDesde DATETIME = DATEADD(DAY, -3, CAST(@Desde AS DATETIME));
    DECLARE @scHasta DATETIME = DATEADD(DAY,  4, CAST(@Hasta AS DATETIME));
    DECLARE @sdHasta DATETIME = DATEADD(DAY,  1, CAST(@Hasta AS DATETIME));
    DECLARE @Off   INT = CASE WHEN @Tamanio > 0 THEN (@Pagina - 1) * @Tamanio ELSE 0 END;
    DECLARE @Fetch INT = CASE WHEN @Tamanio > 0 THEN @Tamanio ELSE 2147483647 END;

    IF OBJECT_ID('tempdb..#mc')     IS NOT NULL DROP TABLE #mc;
    IF OBJECT_ID('tempdb..#refsvc') IS NOT NULL DROP TABLE #refsvc;

    -- Atenciones por medico x consultorio (tratante dedup H2, service vivo, D9 consultorio).
    ;WITH sc_tr AS (
        SELECT sc.v_ServiceId, sc.i_MedicoTratanteId AS MedicoId,
               ROW_NUMBER() OVER (PARTITION BY sc.v_ServiceId ORDER BY sc.v_ServiceComponentId) AS rn
        FROM SigesoftDesarrollo_2.dbo.servicecomponent sc
        WHERE sc.i_IsRequiredId = 1
          AND sc.i_MedicoTratanteId IS NOT NULL AND sc.i_MedicoTratanteId NOT IN (-1,0,11)
          AND ISNULL(sc.i_IsDeleted,0) = 0
          AND sc.d_InsertDate >= @scDesde AND sc.d_InsertDate < @scHasta
    )
    -- Especialidad via LEFT (incluye consultorios NULL/no-403: cuentan en NumAtenciones
    -- pero NO como especialidad -> evita inflar NumEspecialidades / el sufijo (+N)).
    SELECT t.MedicoId, p.i_Consultorio AS ConsultorioId, sp403.v_Value1 AS Especialidad,
           COUNT(DISTINCT t.v_ServiceId) AS NumAtenciones
    INTO #mc
    FROM sc_tr t
    JOIN SigesoftDesarrollo_2.dbo.service  s ON s.v_ServiceId  = t.v_ServiceId
    JOIN SigesoftDesarrollo_2.dbo.protocol p ON p.v_ProtocolId = s.v_ProtocolId
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp403 ON sp403.i_GroupId = 403 AND sp403.i_ParameterId = p.i_Consultorio
    WHERE t.rn = 1
      AND s.i_IsDeleted = 0
      AND s.d_InsertDate  >= @scDesde AND s.d_InsertDate  < @scHasta
      AND s.d_ServiceDate >= @Desde   AND s.d_ServiceDate < @sdHasta
      -- NOTA: #mc se computa sobre TODOS los consultorios (sin @ConsultorioId): el filtro de
      --       especialidad es de MEMBRESIA por especialidad DOMINANTE (mas abajo), no de scoping;
      --       los conteos mostrados son TOTALES del medico.
      -- Universo canonico (9/42/11)
      AND ( (@IncAsistencial = 1 AND p.i_MasterServiceTypeId = 9)
         OR (@IncSisol       = 1 AND p.i_MasterServiceTypeId = 42)
         OR (@IncSeguro      = 1 AND p.i_MasterServiceTypeId = 11) )
    GROUP BY t.MedicoId, p.i_Consultorio, sp403.v_Value1;

    -- Referencias: componente-referencia (D2), agrupado a servicio referido DISTINCT.
    -- Efectiva (H10/D3) = service vivo + venta viva. NO se filtra por consultorio (D9).
    ;WITH refcmp AS (
        SELECT DISTINCT sc.i_ApplicantMedic AS MedicoId, sc.v_ServiceId
        FROM SigesoftDesarrollo_2.dbo.servicecomponent sc
        WHERE sc.i_ApplicantMedic IS NOT NULL AND sc.i_ApplicantMedic NOT IN (-1,0,11)
          AND sc.i_ApplicantMedic <> ISNULL(sc.i_MedicoTratanteId, -999)
          AND ISNULL(sc.i_IsDeleted,0) = 0
          AND sc.d_InsertDate >= @scDesde AND sc.d_InsertDate < @scHasta
    )
    SELECT rc.MedicoId, rc.v_ServiceId,
           CASE WHEN s.i_IsDeleted = 0 AND v.v_SerieDocumento IS NOT NULL THEN 1 ELSE 0 END AS Efectiva
    INTO #refsvc
    FROM refcmp rc
    JOIN SigesoftDesarrollo_2.dbo.service s ON s.v_ServiceId = rc.v_ServiceId
         AND s.d_InsertDate  >= @scDesde AND s.d_InsertDate  < @scHasta
         AND s.d_ServiceDate >= @Desde   AND s.d_ServiceDate < @sdHasta
    -- Universo canonico por el masterServiceType del SERVICIO REFERIDO (9/42/11)
    JOIN SigesoftDesarrollo_2.dbo.protocol p ON p.v_ProtocolId = s.v_ProtocolId
         AND ( (@IncAsistencial = 1 AND p.i_MasterServiceTypeId = 9)
            OR (@IncSisol       = 1 AND p.i_MasterServiceTypeId = 42)
            OR (@IncSeguro      = 1 AND p.i_MasterServiceTypeId = 11) )
    OUTER APPLY (SELECT LTRIM(RTRIM(LEFT(s.v_ComprobantePago, CHARINDEX('|', s.v_ComprobantePago + '|') - 1))) AS token) tk
    OUTER APPLY (SELECT CASE WHEN CHARINDEX('-', tk.token) > 0 THEN LEFT(tk.token, CHARINDEX('-', tk.token) - 1) END AS serie,
                        CASE WHEN CHARINDEX('-', tk.token) > 0 THEN LTRIM(RTRIM(SUBSTRING(tk.token, CHARINDEX('-', tk.token) + 1, 20))) END AS corr) pc
    LEFT JOIN [20505310072].dbo.venta v
           ON v.v_SerieDocumento      = pc.serie COLLATE DATABASE_DEFAULT
          AND v.v_CorrelativoDocumento = pc.corr  COLLATE DATABASE_DEFAULT
          AND v.i_Eliminado = 0;

    -- Merge (medico con solo referencias entra igual, D8):
    --   tot   = total de atenciones del medico (DISTINCT services, TODOS los consultorios)
    --   esp   = solo especialidades reales (403) -> dominante + conteo (+N)
    ;WITH tot AS (
        SELECT MedicoId, SUM(NumAtenciones) AS TotAten
        FROM #mc GROUP BY MedicoId
    ),
    esp AS (
        SELECT MedicoId, ConsultorioId, Especialidad, NumAtenciones,
               ROW_NUMBER() OVER (PARTITION BY MedicoId ORDER BY NumAtenciones DESC, Especialidad) AS rn,
               COUNT(*)     OVER (PARTITION BY MedicoId) AS NumEspecialidades
        FROM #mc WHERE Especialidad IS NOT NULL
    ),
    domx AS (
        SELECT MedicoId, ConsultorioId AS DomConsultorio, Especialidad AS DomEspecialidad, NumEspecialidades
        FROM esp WHERE rn = 1
    ),
    refm AS (
        SELECT MedicoId,
               COUNT(DISTINCT v_ServiceId) AS NumReferencias,
               COUNT(DISTINCT CASE WHEN Efectiva = 1 THEN v_ServiceId END) AS NumReferenciasEfectivas
        FROM #refsvc GROUP BY MedicoId
    ),
    med AS (
        -- Membresia por especialidad DOMINANTE (decision PO):
        --   @ConsultorioId NULL (vista global, D8): todos los que atienden + puros-referidores.
        --   @ConsultorioId seteado: SOLO medicos cuya DOMINANTE = @ConsultorioId (puros-referidores fuera).
        -- Los conteos siempre son TOTALES del medico (tot/refm sin scoping por consultorio).
        SELECT t.MedicoId FROM tot t
        WHERE @ConsultorioId IS NULL
           OR EXISTS (SELECT 1 FROM domx d WHERE d.MedicoId = t.MedicoId AND d.DomConsultorio = @ConsultorioId)
        UNION
        SELECT MedicoId FROM refm WHERE @ConsultorioId IS NULL
    )
    SELECT
        su.i_SystemUserId AS MedicoId,
        su.v_UserName     AS UserName,
        LTRIM(RTRIM(pe.v_FirstLastName + ' ' + ISNULL(pe.v_SecondLastName,'') + ', ' + ISNULL(pe.v_FirstName,''))) AS Medico,
        pr.v_ProfessionalCode AS Colegiatura,
        dx.DomEspecialidad AS Especialidad,                         -- NULL si 0 atenciones 403 (D8)
        ISNULL(dx.NumEspecialidades, 0)       AS NumEspecialidades,
        ISNULL(tt.TotAten, 0)                 AS NumAtenciones,
        ISNULL(rf.NumReferencias, 0)          AS NumReferencias,
        ISNULL(rf.NumReferenciasEfectivas, 0) AS NumReferenciasEfectivas,
        COUNT(*) OVER () AS TotalFilas
    FROM med m
    JOIN SigesoftDesarrollo_2.dbo.systemuser   su ON su.i_SystemUserId = m.MedicoId
    JOIN SigesoftDesarrollo_2.dbo.professional pr ON pr.v_PersonId = su.v_PersonId
         AND ISNULL(pr.i_IsDeleted,0) = 0 AND ISNULL(pr.v_ProfessionalCode,'') <> ''   -- H5 colegiados
    JOIN SigesoftDesarrollo_2.dbo.person       pe ON pe.v_PersonId = su.v_PersonId
    LEFT JOIN tot  tt ON tt.MedicoId = m.MedicoId
    LEFT JOIN domx dx ON dx.MedicoId = m.MedicoId
    LEFT JOIN refm rf ON rf.MedicoId = m.MedicoId
    WHERE (@MedicoId IS NULL OR m.MedicoId = @MedicoId)
    ORDER BY NumAtenciones DESC, Medico                             -- D6
    OFFSET @Off ROWS FETCH NEXT @Fetch ROWS ONLY;

    IF OBJECT_ID('tempdb..#mc')     IS NOT NULL DROP TABLE #mc;
    IF OBJECT_ID('tempdb..#refsvc') IS NOT NULL DROP TABLE #refsvc;
END
GO

-- ---------------------------------------------------------------------------
-- 3) conta.sp_Especialistas_Atenciones  - modal "Ver Atenciones"
-- ---------------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Especialistas_Atenciones','P') IS NOT NULL DROP PROCEDURE conta.sp_Especialistas_Atenciones;
GO
CREATE PROCEDURE conta.sp_Especialistas_Atenciones
    @MedicoId INT,
    @Desde DATE,
    @Hasta DATE,
    @ConsultorioId INT = NULL,
    @Pagina INT = 1,
    @Tamanio INT = 50,
    @IncAsistencial BIT = 1,   -- 9 asistencial | 42 SISOL | 11 SEGUROS (universo canonico)
    @IncSisol       BIT = 1,
    @IncSeguro      BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina < 1 SET @Pagina = 1;
    IF @Tamanio < 0 SET @Tamanio = 0;

    DECLARE @scDesde DATETIME = DATEADD(DAY, -3, CAST(@Desde AS DATETIME));
    DECLARE @scHasta DATETIME = DATEADD(DAY,  4, CAST(@Hasta AS DATETIME));
    DECLARE @sdHasta DATETIME = DATEADD(DAY,  1, CAST(@Hasta AS DATETIME));
    DECLARE @Off   INT = CASE WHEN @Tamanio > 0 THEN (@Pagina - 1) * @Tamanio ELSE 0 END;
    DECLARE @Fetch INT = CASE WHEN @Tamanio > 0 THEN @Tamanio ELSE 2147483647 END;

    IF OBJECT_ID('tempdb..#base') IS NOT NULL DROP TABLE #base;

    -- Universo: services vivos del rango donde @MedicoId es el TRATANTE (dedup H2).
    ;WITH sc_tr AS (
        SELECT sc.v_ServiceId, sc.i_MedicoTratanteId AS MedicoId,
               ROW_NUMBER() OVER (PARTITION BY sc.v_ServiceId ORDER BY sc.v_ServiceComponentId) AS rn
        FROM SigesoftDesarrollo_2.dbo.servicecomponent sc
        WHERE sc.i_IsRequiredId = 1
          AND sc.i_MedicoTratanteId IS NOT NULL AND sc.i_MedicoTratanteId NOT IN (-1,0,11)
          AND ISNULL(sc.i_IsDeleted,0) = 0
          AND sc.d_InsertDate >= @scDesde AND sc.d_InsertDate < @scHasta
    )
    SELECT s.v_ServiceId, s.d_ServiceDate, s.v_PersonId, s.i_ServiceStatusId,
           s.v_ComprobantePago, p.i_Consultorio
    INTO #base
    FROM sc_tr t
    JOIN SigesoftDesarrollo_2.dbo.service  s ON s.v_ServiceId  = t.v_ServiceId
    JOIN SigesoftDesarrollo_2.dbo.protocol p ON p.v_ProtocolId = s.v_ProtocolId
    WHERE t.rn = 1 AND t.MedicoId = @MedicoId
      AND s.i_IsDeleted = 0
      AND s.d_InsertDate  >= @scDesde AND s.d_InsertDate  < @scHasta
      AND s.d_ServiceDate >= @Desde   AND s.d_ServiceDate < @sdHasta
      -- @ConsultorioId ya NO acota (decision PO: NumAtenciones = total del medico); el parametro
      -- se conserva por compatibilidad de firma pero el modal lista TODAS las atenciones del rango.
      -- Universo canonico (9/42/11)
      AND ( (@IncAsistencial = 1 AND p.i_MasterServiceTypeId = 9)
         OR (@IncSisol       = 1 AND p.i_MasterServiceTypeId = 42)
         OR (@IncSeguro      = 1 AND p.i_MasterServiceTypeId = 11) );

    DECLARE @Total INT = (SELECT COUNT(*) FROM #base);

    IF @Tamanio = 0 AND @Total > 20000
    BEGIN
        RAISERROR('El export supera 20,000 filas; acota el rango de fechas.', 16, 1);
        IF OBJECT_ID('tempdb..#base') IS NOT NULL DROP TABLE #base;
        RETURN;
    END

    SELECT
        b.v_ServiceId   AS ServiceId,
        b.d_ServiceDate AS FechaAtencion,
        sp403.v_Value1  AS Consultorio,
        sp125.v_Value1  AS EstadoAtencion,
        LTRIM(RTRIM(pe.v_FirstLastName + ' ' + ISNULL(pe.v_SecondLastName,'') + ', ' + ISNULL(pe.v_FirstName,''))) AS Paciente,
        CASE WHEN pc.serie IS NOT NULL AND pc.corr IS NOT NULL THEN pc.serie + '-' + pc.corr END AS NroComprobante,
        CASE WHEN v.v_SerieDocumento IS NULL THEN NULL
             WHEN v.i_IdTipoDocumento = 3 THEN 'BOLETA'
             WHEN v.i_IdTipoDocumento = 1 THEN 'FACTURA'
             ELSE 'OTRO' END AS TipoComprobante,
        v.d_Total AS MontoComprobante,
        STUFF((SELECT ' | ' + x.cie + ' ' + x.nm FROM (
                 SELECT DISTINCT ds.v_CIE10Id cie, ds.v_Name nm
                 FROM SigesoftDesarrollo_2.dbo.diagnosticrepository dr
                 JOIN SigesoftDesarrollo_2.dbo.diseases ds ON ds.v_DiseasesId = dr.v_DiseasesId
                 WHERE dr.v_ServiceId = b.v_ServiceId AND dr.i_IsDeleted = 0
                   AND dr.i_FinalQualificationId IN (2,3)) x
               FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 3, '') AS Diagnosticos,
        CASE WHEN EXISTS (
                 SELECT 1 FROM SigesoftDesarrollo_2.dbo.servicecomponent scr
                 WHERE scr.v_ServiceId = b.v_ServiceId
                   AND scr.i_ApplicantMedic IS NOT NULL AND scr.i_ApplicantMedic NOT IN (-1,0,11)
                   AND scr.i_ApplicantMedic <> ISNULL(scr.i_MedicoTratanteId, -999)
                   AND ISNULL(scr.i_IsDeleted,0) = 0
             ) THEN 1 ELSE 0 END AS Referida,
        STUFF((SELECT DISTINCT ' | ' + LTRIM(RTRIM(per2.v_FirstLastName + ' ' + ISNULL(per2.v_SecondLastName,'') + ', ' + ISNULL(per2.v_FirstName,'')))
               FROM SigesoftDesarrollo_2.dbo.servicecomponent scr2
               JOIN SigesoftDesarrollo_2.dbo.systemuser su2  ON su2.i_SystemUserId = scr2.i_ApplicantMedic
               JOIN SigesoftDesarrollo_2.dbo.person     per2 ON per2.v_PersonId = su2.v_PersonId
               WHERE scr2.v_ServiceId = b.v_ServiceId
                 AND scr2.i_ApplicantMedic IS NOT NULL AND scr2.i_ApplicantMedic NOT IN (-1,0,11)
                 AND scr2.i_ApplicantMedic <> ISNULL(scr2.i_MedicoTratanteId, -999)
                 AND ISNULL(scr2.i_IsDeleted,0) = 0
               FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 3, '') AS ReferidoPor,
        @Total AS TotalFilas
    FROM (
        SELECT * FROM #base
        ORDER BY d_ServiceDate DESC, v_ServiceId
        OFFSET @Off ROWS FETCH NEXT @Fetch ROWS ONLY
    ) b
    LEFT JOIN SigesoftDesarrollo_2.dbo.person pe ON pe.v_PersonId = b.v_PersonId
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp403 ON sp403.i_GroupId = 403 AND sp403.i_ParameterId = b.i_Consultorio
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp125 ON sp125.i_GroupId = 125 AND sp125.i_ParameterId = b.i_ServiceStatusId
    OUTER APPLY (SELECT LTRIM(RTRIM(LEFT(b.v_ComprobantePago, CHARINDEX('|', b.v_ComprobantePago + '|') - 1))) AS token) tk
    OUTER APPLY (SELECT CASE WHEN CHARINDEX('-', tk.token) > 0 THEN LEFT(tk.token, CHARINDEX('-', tk.token) - 1) END AS serie,
                        CASE WHEN CHARINDEX('-', tk.token) > 0 THEN LTRIM(RTRIM(SUBSTRING(tk.token, CHARINDEX('-', tk.token) + 1, 20))) END AS corr) pc
    LEFT JOIN [20505310072].dbo.venta v
           ON v.v_SerieDocumento      = pc.serie COLLATE DATABASE_DEFAULT
          AND v.v_CorrelativoDocumento = pc.corr  COLLATE DATABASE_DEFAULT
          AND v.i_Eliminado = 0
    ORDER BY FechaAtencion DESC, ServiceId;

    IF OBJECT_ID('tempdb..#base') IS NOT NULL DROP TABLE #base;
END
GO

-- ---------------------------------------------------------------------------
-- 4) conta.sp_Especialistas_Referencias  - modal "Ver Referencias"
-- ---------------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Especialistas_Referencias','P') IS NOT NULL DROP PROCEDURE conta.sp_Especialistas_Referencias;
GO
CREATE PROCEDURE conta.sp_Especialistas_Referencias
    @MedicoId INT,
    @Desde DATE,
    @Hasta DATE,
    @Pagina INT = 1,
    @Tamanio INT = 50,
    @IncAsistencial BIT = 1,   -- 9 asistencial | 42 SISOL | 11 SEGUROS (universo canonico, por el servicio referido)
    @IncSisol       BIT = 1,
    @IncSeguro      BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    IF @Pagina < 1 SET @Pagina = 1;
    IF @Tamanio < 0 SET @Tamanio = 0;

    DECLARE @scDesde DATETIME = DATEADD(DAY, -3, CAST(@Desde AS DATETIME));
    DECLARE @scHasta DATETIME = DATEADD(DAY,  4, CAST(@Hasta AS DATETIME));
    DECLARE @sdHasta DATETIME = DATEADD(DAY,  1, CAST(@Hasta AS DATETIME));
    DECLARE @Off   INT = CASE WHEN @Tamanio > 0 THEN (@Pagina - 1) * @Tamanio ELSE 0 END;
    DECLARE @Fetch INT = CASE WHEN @Tamanio > 0 THEN @Tamanio ELSE 2147483647 END;

    IF OBJECT_ID('tempdb..#refbase') IS NOT NULL DROP TABLE #refbase;

    -- Servicios referidos DISTINCT por @MedicoId (D2), en rango.
    ;WITH refcmp AS (
        SELECT DISTINCT sc.v_ServiceId
        FROM SigesoftDesarrollo_2.dbo.servicecomponent sc
        WHERE sc.i_ApplicantMedic = @MedicoId
          AND sc.i_ApplicantMedic <> ISNULL(sc.i_MedicoTratanteId, -999)
          AND ISNULL(sc.i_IsDeleted,0) = 0
          AND sc.d_InsertDate >= @scDesde AND sc.d_InsertDate < @scHasta
    )
    SELECT s.v_ServiceId, s.d_ServiceDate, s.i_IsDeleted, s.v_ComprobantePago, p.i_Consultorio
    INTO #refbase
    FROM refcmp rc
    JOIN SigesoftDesarrollo_2.dbo.service  s ON s.v_ServiceId  = rc.v_ServiceId
    JOIN SigesoftDesarrollo_2.dbo.protocol p ON p.v_ProtocolId = s.v_ProtocolId
    WHERE s.d_InsertDate  >= @scDesde AND s.d_InsertDate  < @scHasta
      AND s.d_ServiceDate >= @Desde   AND s.d_ServiceDate < @sdHasta
      -- Universo canonico por el masterServiceType del SERVICIO REFERIDO (9/42/11)
      AND ( (@IncAsistencial = 1 AND p.i_MasterServiceTypeId = 9)
         OR (@IncSisol       = 1 AND p.i_MasterServiceTypeId = 42)
         OR (@IncSeguro      = 1 AND p.i_MasterServiceTypeId = 11) );

    DECLARE @Total INT = (SELECT COUNT(*) FROM #refbase);

    IF @Tamanio = 0 AND @Total > 20000
    BEGIN
        RAISERROR('El export supera 20,000 filas; acota el rango de fechas.', 16, 1);
        IF OBJECT_ID('tempdb..#refbase') IS NOT NULL DROP TABLE #refbase;
        RETURN;
    END

    SELECT
        r.v_ServiceId   AS ServiceId,
        r.d_ServiceDate AS FechaAtencion,
        sp403.v_Value1  AS ConsultorioDestino,
        -- Componentes que ESTE medico solicito en el service referido, DISTINCT, concat con ' | '.
        -- Se EXCLUYE el ruido de estacion de triaje/intake (aparece en casi toda orden) y el
        -- informe de laboratorio. NULLIF garantiza NULL (no cadena vacia) si solo quedaba ruido.
        NULLIF(STUFF((SELECT DISTINCT ' | ' + LTRIM(RTRIM(cmp.v_Name))
               FROM SigesoftDesarrollo_2.dbo.servicecomponent scc
               JOIN SigesoftDesarrollo_2.dbo.component cmp ON cmp.v_ComponentId = scc.v_ComponentId
               WHERE scc.v_ServiceId = r.v_ServiceId
                 AND scc.d_InsertDate >= @scDesde AND scc.d_InsertDate < @scHasta   -- H8: seek del clustered (v_ServiceId no lidera ningun indice)
                 AND scc.i_ApplicantMedic = @MedicoId
                 AND scc.i_ApplicantMedic <> ISNULL(scc.i_MedicoTratanteId, -999)
                 AND ISNULL(scc.i_IsDeleted,0) = 0
                 AND cmp.v_Name NOT LIKE '%PUNTO CERO%'          -- triaje: entrada (ruido dominante)
                 AND cmp.v_Name NOT LIKE '%TRIAJE%'              -- triaje: TRIAJE - MANUAL
                 AND cmp.v_Name NOT LIKE '%FUNCIONES VITALES%'   -- triaje: funciones vitales
                 AND cmp.v_Name NOT LIKE '%ANTROPOMETR%'         -- triaje: antropometria (con/sin acento)
                 AND cmp.v_Name NOT LIKE '%HISTORIA CLINICA%'    -- triaje: historia clinica de intake
                 AND cmp.v_Name NOT LIKE '%INFORME%LABORATORIO%' -- informe de laboratorio
               FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 3, ''), '') AS ComponentesReferidos,
        ejec.MedicoEjecutor AS MedicoEjecutor,
        CASE WHEN r.i_IsDeleted = 0 AND v.v_SerieDocumento IS NOT NULL THEN 1 ELSE 0 END AS Efectiva,   -- D3
        CASE WHEN pc.serie IS NOT NULL AND pc.corr IS NOT NULL THEN pc.serie + '-' + pc.corr END AS NroComprobante,
        CASE WHEN v.v_SerieDocumento IS NULL THEN NULL
             WHEN v.i_IdTipoDocumento = 3 THEN 'BOLETA'
             WHEN v.i_IdTipoDocumento = 1 THEN 'FACTURA'
             ELSE 'OTRO' END AS TipoComprobante,
        v.d_Total AS MontoComprobante,
        @Total AS TotalFilas
    FROM (
        SELECT * FROM #refbase
        ORDER BY d_ServiceDate DESC, v_ServiceId
        OFFSET @Off ROWS FETCH NEXT @Fetch ROWS ONLY
    ) r
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp403 ON sp403.i_GroupId = 403 AND sp403.i_ParameterId = r.i_Consultorio
    OUTER APPLY (
        -- Ejecutor = tratante del service referido (dedup H2). NO se exige colegiatura.
        SELECT TOP 1 LTRIM(RTRIM(pex.v_FirstLastName + ' ' + ISNULL(pex.v_SecondLastName,'') + ', ' + ISNULL(pex.v_FirstName,''))) AS MedicoEjecutor
        FROM SigesoftDesarrollo_2.dbo.servicecomponent sct
        JOIN SigesoftDesarrollo_2.dbo.systemuser sux ON sux.i_SystemUserId = sct.i_MedicoTratanteId
        JOIN SigesoftDesarrollo_2.dbo.person     pex ON pex.v_PersonId = sux.v_PersonId
        WHERE sct.v_ServiceId = r.v_ServiceId
          AND sct.d_InsertDate >= @scDesde AND sct.d_InsertDate < @scHasta   -- H8: habilita seek del clustered
          AND sct.i_IsRequiredId = 1
          AND sct.i_MedicoTratanteId IS NOT NULL AND sct.i_MedicoTratanteId NOT IN (-1,0,11)
          AND ISNULL(sct.i_IsDeleted,0) = 0
        ORDER BY sct.v_ServiceComponentId
    ) ejec
    OUTER APPLY (SELECT LTRIM(RTRIM(LEFT(r.v_ComprobantePago, CHARINDEX('|', r.v_ComprobantePago + '|') - 1))) AS token) tk
    OUTER APPLY (SELECT CASE WHEN CHARINDEX('-', tk.token) > 0 THEN LEFT(tk.token, CHARINDEX('-', tk.token) - 1) END AS serie,
                        CASE WHEN CHARINDEX('-', tk.token) > 0 THEN LTRIM(RTRIM(SUBSTRING(tk.token, CHARINDEX('-', tk.token) + 1, 20))) END AS corr) pc
    LEFT JOIN [20505310072].dbo.venta v
           ON v.v_SerieDocumento      = pc.serie COLLATE DATABASE_DEFAULT
          AND v.v_CorrelativoDocumento = pc.corr  COLLATE DATABASE_DEFAULT
          AND v.i_Eliminado = 0
    ORDER BY FechaAtencion DESC, ServiceId;

    IF OBJECT_ID('tempdb..#refbase') IS NOT NULL DROP TABLE #refbase;
END
GO

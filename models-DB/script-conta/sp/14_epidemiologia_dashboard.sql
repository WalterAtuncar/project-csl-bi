-- =============================================================================
-- 14_epidemiologia_dashboard.sql
-- conta.sp_Epidemiologia_Dashboard  (TAB 2 - multi-resultset RS0..RS10)
--
-- Materializa la base per-dx UNA vez (#base = conta.fn_Epi_DxBase) y de ahi saca
-- 11 resultsets en ORDEN y FORMA EXACTOS (el front los lee por posicion):
--   RS0  KPIs
--   RS1  Incidencia por consultorio
--   RS2  Top-N morbilidad
--   RS3  Capitulos CIE-10
--   RS4  Piramide sexo x etapa de vida
--   RS5  Morbilidad diferencial por sexo
--   RS6  Heatmap consultorio x capitulo
--   RS7  Tendencia semanal (ISO)
--   RS8  Top medicos por diagnostico
--   RS9  Comorbilidad (pares de dx)
--   RS10 Geografia (distritos)
--
-- Granos: #dx = pares DISTINCT (servicio,cie10) -> conteos de dx (COUNT(*)); las
--   atenciones/pacientes usan COUNT(DISTINCT ...). Incidencia (#inc) = par (persona,
--   CIE10) del rango con NOT EXISTS historico (< @Desde), atribuido a su primera fecha.
-- servicecomponent (medico, RS8) ACOTADO por d_InsertDate. Cross-DB = SOLO SELECT.
-- =============================================================================

IF OBJECT_ID('conta.sp_Epidemiologia_Dashboard','P') IS NOT NULL
    DROP PROCEDURE conta.sp_Epidemiologia_Dashboard;
GO
CREATE PROCEDURE conta.sp_Epidemiologia_Dashboard
    @Desde              DATE,
    @Hasta              DATE,
    @Ambito             VARCHAR(20) = 'TODOS',
    @IncluirDescartados BIT         = 0,
    @TopN               INT         = 20
AS
BEGIN
    SET NOCOUNT ON;
    IF @TopN < 1 SET @TopN = 20;

    -- ---------- base per-dx (una sola evaluacion de la iTVF) ----------
    IF OBJECT_ID('tempdb..#base') IS NOT NULL DROP TABLE #base;
    SELECT * INTO #base FROM conta.fn_Epi_DxBase(@Desde,@Hasta,@Ambito,@IncluirDescartados);

    -- ---------- pares DISTINCT (servicio, cie10) con dimensiones [grano dx] ----------
    IF OBJECT_ID('tempdb..#dx') IS NOT NULL DROP TABLE #dx;
    SELECT
        v_ServiceId,
        MIN(v_PersonId)        AS v_PersonId,
        MIN(d_ServiceDate)     AS d_ServiceDate,
        CIE10,
        MIN(DiseaseName)       AS DiseaseName,
        MIN(CapNum)            AS CapNum,
        MIN(CapNombre)         AS CapNombre,
        MIN(ConsultorioNombre) AS ConsultorioNombre,
        MIN(SexoNombre)        AS SexoNombre,
        MIN(GrupoEtario)       AS GrupoEtario,
        MIN(i_ProvinceId)      AS i_ProvinceId,
        MIN(i_DistrictId)      AS i_DistrictId,
        MIN(DistritoNombre)    AS DistritoNombre
    INTO #dx
    FROM #base
    GROUP BY v_ServiceId, CIE10;

    -- ---------- incidencia: pares (persona, CIE10) nuevos + su primera fecha ----------
    IF OBJECT_ID('tempdb..#inc') IS NOT NULL DROP TABLE #inc;
    ;WITH pares AS (
        SELECT v_PersonId, CIE10, MIN(d_ServiceDate) AS FechaPrimera
        FROM #base GROUP BY v_PersonId, CIE10
    )
    SELECT p.v_PersonId, p.CIE10, p.FechaPrimera
    INTO #inc
    FROM pares p
    WHERE NOT EXISTS (
        SELECT 1
        FROM SigesoftDesarrollo_2.dbo.service s2
        JOIN SigesoftDesarrollo_2.dbo.diagnosticrepository dr2
            ON dr2.v_ServiceId = s2.v_ServiceId AND ISNULL(dr2.i_IsDeleted,0) = 0
           AND dr2.i_FinalQualificationId IN (2,3)
        JOIN SigesoftDesarrollo_2.dbo.diseases dis2
            ON dis2.v_DiseasesId = dr2.v_DiseasesId
        WHERE s2.v_PersonId = p.v_PersonId COLLATE DATABASE_DEFAULT
          AND dis2.v_CIE10Id COLLATE DATABASE_DEFAULT = p.CIE10
          AND ISNULL(s2.i_IsDeleted,0) = 0
          AND s2.d_ServiceDate < @Desde
    );

    -- =========================================================================
    -- RS0  KPIs
    -- =========================================================================
    DECLARE @TotalAtenciones INT;
    SELECT @TotalAtenciones = COUNT(DISTINCT s.v_ServiceId)
    FROM SigesoftDesarrollo_2.dbo.service s
    JOIN SigesoftDesarrollo_2.dbo.protocol pr ON pr.v_ProtocolId = s.v_ProtocolId
    WHERE ISNULL(s.i_IsDeleted,0) = 0
      AND s.d_ServiceDate >= @Desde AND s.d_ServiceDate < DATEADD(DAY,1,@Hasta)
      AND (
            @Ambito = 'TODOS'
         OR (@Ambito = 'OCUPACIONAL'     AND pr.i_MasterServiceTypeId = 1)
         OR (@Ambito = 'ASISTENCIAL'     AND pr.i_MasterServiceTypeId IN (9,42,11,34))
         OR (@Ambito = 'HOSPITALIZACION' AND EXISTS (
                SELECT 1 FROM SigesoftDesarrollo_2.dbo.hospitalizacionservice hs
                WHERE hs.v_ServiceId = s.v_ServiceId AND ISNULL(hs.i_IsDeleted,0) = 0))
          );

    DECLARE @AtencionesConDx INT = (SELECT COUNT(DISTINCT v_ServiceId) FROM #base);
    DECLARE @PacientesUnicos INT = (SELECT COUNT(DISTINCT v_PersonId) FROM #base);
    DECLARE @TotalDx         INT = (SELECT COUNT(*) FROM #dx);
    DECLARE @CasosNuevos     INT = (SELECT COUNT(*) FROM #inc);
    DECLARE @ParesTotal      INT = (SELECT COUNT(*) FROM (SELECT DISTINCT v_PersonId, CIE10 FROM #base) z);

    SELECT
        @TotalAtenciones                                     AS TotalAtenciones,
        @AtencionesConDx                                     AS AtencionesConDx,
        @PacientesUnicos                                     AS PacientesUnicos,
        @TotalDx                                             AS TotalDx,
        @CasosNuevos                                         AS CasosNuevos,
        (@ParesTotal - @CasosNuevos)                         AS CasosRecurrentes,
        CAST(CASE WHEN @TotalAtenciones = 0 THEN 0
                  ELSE 100.0 * @AtencionesConDx / @TotalAtenciones END AS DECIMAL(5,2)) AS PctConDx,
        (SELECT COUNT(DISTINCT ConsultorioNombre) FROM #base
          WHERE ConsultorioNombre <> '(SIN CONSULTORIO)')    AS ConsultoriosActivos;

    -- =========================================================================
    -- RS1  Incidencia por consultorio
    -- =========================================================================
    SELECT
        ConsultorioNombre,
        COUNT(*)                    AS NumDx,
        COUNT(DISTINCT v_ServiceId) AS NumAtenciones,
        COUNT(DISTINCT v_PersonId)  AS NumPacientes
    FROM #dx
    GROUP BY ConsultorioNombre
    ORDER BY NumDx DESC;

    -- =========================================================================
    -- RS2  Top-N morbilidad
    -- =========================================================================
    SELECT TOP (@TopN)
        CIE10,
        DiseaseName,
        COUNT(*)                   AS NumDx,
        COUNT(DISTINCT v_PersonId) AS NumPacientes,
        CAST(CASE WHEN @TotalDx = 0 THEN 0
                  ELSE 100.0 * COUNT(*) / @TotalDx END AS DECIMAL(5,2)) AS PctDelTotal
    FROM #dx
    GROUP BY CIE10, DiseaseName
    ORDER BY NumDx DESC;

    -- =========================================================================
    -- RS3  Capitulos CIE-10
    -- =========================================================================
    SELECT
        CapNum,
        CapNombre,
        COUNT(*)                   AS NumDx,
        COUNT(DISTINCT v_PersonId) AS NumPacientes
    FROM #dx
    GROUP BY CapNum, CapNombre
    ORDER BY NumDx DESC;

    -- =========================================================================
    -- RS4  Piramide sexo x etapa de vida (pacientes unicos)
    -- =========================================================================
    SELECT
        GrupoEtario,
        SexoNombre,
        COUNT(DISTINCT v_PersonId) AS NumPacientes
    FROM #base
    GROUP BY GrupoEtario, SexoNombre
    ORDER BY
        CASE GrupoEtario WHEN 'Nino' THEN 1 WHEN 'Adolescente' THEN 2 WHEN 'Joven' THEN 3
             WHEN 'Adulto' THEN 4 WHEN 'Adulto mayor' THEN 5 ELSE 6 END,
        SexoNombre;

    -- =========================================================================
    -- RS5  Morbilidad diferencial por sexo
    -- =========================================================================
    SELECT TOP (@TopN)
        CIE10,
        DiseaseName,
        SUM(CASE WHEN SexoNombre = 'M' THEN 1 ELSE 0 END) AS NumMasculino,
        SUM(CASE WHEN SexoNombre = 'F' THEN 1 ELSE 0 END) AS NumFemenino,
        COUNT(*)                                          AS Total
    FROM #dx
    GROUP BY CIE10, DiseaseName
    ORDER BY Total DESC;

    -- =========================================================================
    -- RS6  Heatmap consultorio x capitulo (top consultorios por carga)
    -- =========================================================================
    ;WITH topcons AS (
        SELECT TOP (@TopN) ConsultorioNombre
        FROM #dx
        WHERE ConsultorioNombre <> '(SIN CONSULTORIO)'
        GROUP BY ConsultorioNombre
        ORDER BY COUNT(*) DESC
    )
    SELECT
        d.ConsultorioNombre,
        d.CapNum,
        d.CapNombre,
        COUNT(*) AS NumDx
    FROM #dx d
    JOIN topcons t ON t.ConsultorioNombre = d.ConsultorioNombre
    GROUP BY d.ConsultorioNombre, d.CapNum, d.CapNombre
    ORDER BY d.ConsultorioNombre, d.CapNum;

    -- =========================================================================
    -- RS7  Tendencia semanal (ISO). Lunes de la semana = ancla @@DATEFIRST-independiente.
    -- =========================================================================
    ;WITH dxw AS (
        SELECT
            DATEADD(DAY, -((DATEDIFF(DAY,'19000101', d_ServiceDate)) % 7), CAST(d_ServiceDate AS DATE)) AS Lunes,
            v_ServiceId
        FROM #dx
    ),
    agg AS (
        SELECT Lunes, COUNT(*) AS NumDx, COUNT(DISTINCT v_ServiceId) AS NumAtenciones
        FROM dxw GROUP BY Lunes
    ),
    incw AS (
        SELECT
            DATEADD(DAY, -((DATEDIFF(DAY,'19000101', FechaPrimera)) % 7), CAST(FechaPrimera AS DATE)) AS Lunes,
            COUNT(*) AS NumCasosNuevos
        FROM #inc
        GROUP BY DATEADD(DAY, -((DATEDIFF(DAY,'19000101', FechaPrimera)) % 7), CAST(FechaPrimera AS DATE))
    )
    SELECT
        YEAR(DATEADD(DAY,3,a.Lunes))   AS AnioISO,
        DATEPART(ISO_WEEK, a.Lunes)    AS SemanaISO,
        a.Lunes                        AS FechaInicioSemana,
        a.NumDx,
        a.NumAtenciones,
        ISNULL(i.NumCasosNuevos,0)     AS NumCasosNuevos
    FROM agg a
    LEFT JOIN incw i ON i.Lunes = a.Lunes
    ORDER BY a.Lunes;

    -- =========================================================================
    -- RS8  Top medicos por diagnostico (servicecomponent ACOTADO por d_InsertDate).
    -- =========================================================================
    DECLARE @scIni DATETIME2 = DATEADD(DAY,-1,@Desde), @scFin DATETIME2 = DATEADD(DAY,9,@Hasta);

    ;WITH medbase AS (
        SELECT DISTINCT
            s.v_ServiceId COLLATE DATABASE_DEFAULT AS v_ServiceId,
            s.v_PersonId  COLLATE DATABASE_DEFAULT AS v_PersonId,
            dis.v_CIE10Id COLLATE DATABASE_DEFAULT AS CIE10,
            sc.i_MedicoTratanteId
        FROM SigesoftDesarrollo_2.dbo.service s
        JOIN SigesoftDesarrollo_2.dbo.protocol pr
            ON pr.v_ProtocolId = s.v_ProtocolId
        JOIN SigesoftDesarrollo_2.dbo.diagnosticrepository dr
            ON dr.v_ServiceId = s.v_ServiceId AND ISNULL(dr.i_IsDeleted,0) = 0
           AND ( dr.i_FinalQualificationId IN (2,3)
              OR (@IncluirDescartados = 1 AND dr.i_FinalQualificationId = 4) )
        JOIN SigesoftDesarrollo_2.dbo.diseases dis
            ON dis.v_DiseasesId = dr.v_DiseasesId
        LEFT JOIN SigesoftDesarrollo_2.dbo.servicecomponent sc
            ON sc.v_ServiceId  = dr.v_ServiceId
           AND sc.v_ComponentId = dr.v_ComponentId
           AND ISNULL(sc.i_IsDeleted,0) = 0
           AND sc.d_InsertDate >= @scIni AND sc.d_InsertDate < @scFin
        WHERE ISNULL(s.i_IsDeleted,0) = 0
          AND s.d_ServiceDate >= @Desde AND s.d_ServiceDate < DATEADD(DAY,1,@Hasta)
          AND (
                @Ambito = 'TODOS'
             OR (@Ambito = 'OCUPACIONAL'     AND pr.i_MasterServiceTypeId = 1)
             OR (@Ambito = 'ASISTENCIAL'     AND pr.i_MasterServiceTypeId IN (9,42,11,34))
             OR (@Ambito = 'HOSPITALIZACION' AND EXISTS (
                    SELECT 1 FROM SigesoftDesarrollo_2.dbo.hospitalizacionservice hs
                    WHERE hs.v_ServiceId = s.v_ServiceId AND ISNULL(hs.i_IsDeleted,0) = 0))
              )
    ),
    medname AS (
        SELECT
            mb.v_ServiceId, mb.v_PersonId, mb.CIE10,
            ISNULL(NULLIF(LTRIM(RTRIM(
                ISNULL(pm.v_FirstLastName,'') + ' ' + ISNULL(pm.v_SecondLastName,'') + ', ' + ISNULL(pm.v_FirstName,'')
            )), ', '), '(sin medico asignado)') COLLATE DATABASE_DEFAULT AS MedicoNombre
        FROM medbase mb
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemuser su
            ON su.i_SystemUserId = mb.i_MedicoTratanteId AND ISNULL(su.i_IsDeleted,0) = 0
        LEFT JOIN SigesoftDesarrollo_2.dbo.person pm
            ON pm.v_PersonId = su.v_PersonId
    )
    SELECT TOP (@TopN)
        MedicoNombre,
        COUNT(*)                   AS NumDx,
        COUNT(DISTINCT v_PersonId) AS NumPacientes
    FROM (SELECT DISTINCT v_ServiceId, v_PersonId, CIE10, MedicoNombre FROM medname) u
    GROUP BY MedicoNombre
    ORDER BY NumDx DESC;

    -- =========================================================================
    -- RS9  Comorbilidad (pares de dx que co-ocurren en la misma atencion)
    -- =========================================================================
    SELECT TOP (@TopN)
        a.CIE10       AS Cie10A,
        a.DiseaseName AS NombreA,
        b.CIE10       AS Cie10B,
        b.DiseaseName AS NombreB,
        COUNT(DISTINCT a.v_ServiceId) AS NumAtenciones
    FROM #dx a
    JOIN #dx b ON b.v_ServiceId = a.v_ServiceId AND a.CIE10 < b.CIE10
    GROUP BY a.CIE10, a.DiseaseName, b.CIE10, b.DiseaseName
    ORDER BY NumAtenciones DESC;

    -- =========================================================================
    -- RS10 Geografia (top distritos). Se agrupa por NOMBRE (no por i_DistrictId/
    -- i_ProvinceId): el ubigeo legacy a veces guarda en i_ProvinceId el id del
    -- departamento, y agrupar por id partiria un mismo distrito en varias filas.
    -- =========================================================================
    ;WITH geo AS (
        SELECT
            d.DistritoNombre,
            prov.ProvinciaNombre,
            d.v_PersonId
        FROM #dx d
        OUTER APPLY (
            SELECT dhProv.v_Value1 COLLATE DATABASE_DEFAULT AS ProvinciaNombre
            FROM SigesoftDesarrollo_2.dbo.datahierarchy dhProv
            WHERE dhProv.i_GroupId = 113 AND dhProv.i_ItemId = d.i_ProvinceId
              AND ISNULL(dhProv.i_IsDeleted,0) = 0
        ) prov
    )
    SELECT TOP (@TopN)
        DistritoNombre,
        ProvinciaNombre,
        COUNT(DISTINCT v_PersonId) AS NumPacientes,
        COUNT(*)                   AS NumDx
    FROM geo
    GROUP BY DistritoNombre, ProvinciaNombre
    ORDER BY NumPacientes DESC;
END
GO

-- =============================================================================
-- 13_epidemiologia_ficha.sql
-- conta.sp_Epidemiologia_FichaIndividual  (TAB 1 - Ficha Individual EPI, formato DIRESA)
--
-- Grano = ATENCION (una fila por v_ServiceId). Incluye atenciones sin dx si
-- @SoloConDiagnostico=0. Un unico resultset: 25 columnas + TotalFilas.
--
-- Patron obligatorio (§4.3): PAGINAR PRIMERO solo las claves (service) con
--   COUNT(*) OVER() AS TotalFilas y OFFSET/FETCH, y RECIEN DESPUES enriquecer.
-- El "tiempo de enfermedad" (col 24) sale de la cadena EMR (42.7M filas c/u):
--   servicecomponent -> servicecomponentfields -> servicecomponentfieldvalues,
--   ACOTADA por d_InsertDate a la ventana de fechas de la pagina (los indices son
--   date-first; no hay indice por id) y aplicada SOLO a las filas ya paginadas.
--   Se materializa set-based en #te (una pasada) en vez de OUTER APPLY correlado.
-- Modo export: @PageSize grande (cap 100000), @Page=1.
-- Cross-DB SigesoftDesarrollo_2 = SOLO SELECT; texto con COLLATE DATABASE_DEFAULT.
-- =============================================================================

IF OBJECT_ID('conta.sp_Epidemiologia_FichaIndividual','P') IS NOT NULL
    DROP PROCEDURE conta.sp_Epidemiologia_FichaIndividual;
GO
CREATE PROCEDURE conta.sp_Epidemiologia_FichaIndividual
    @Desde              DATE,
    @Hasta              DATE,
    @Ambito             VARCHAR(20)  = 'TODOS',   -- TODOS|ASISTENCIAL|OCUPACIONAL|HOSPITALIZACION
    @Page               INT          = 1,
    @PageSize           INT          = 50,
    @SoloConDiagnostico BIT          = 0,
    @IncluirDescartados BIT          = 0,
    @Red                VARCHAR(100) = 'Diresa Cajamarca'
AS
BEGIN
    SET NOCOUNT ON;

    IF @Page < 1 SET @Page = 1;
    IF @PageSize < 1 SET @PageSize = 50;
    IF @PageSize > 100000 SET @PageSize = 100000;   -- cap export

    -- -----------------------------------------------------------------------
    -- 1) Paginar SOLO las claves (grano atencion) + TotalFilas (pre-paginacion).
    -- -----------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#keys') IS NOT NULL DROP TABLE #keys;
    SELECT
        s.v_ServiceId  COLLATE DATABASE_DEFAULT AS v_ServiceId,
        s.v_PersonId   COLLATE DATABASE_DEFAULT AS v_PersonId,
        s.d_ServiceDate,
        s.i_MasterServiceId,
        COUNT(*) OVER() AS TotalFilas
    INTO #keys
    FROM SigesoftDesarrollo_2.dbo.service s
    JOIN SigesoftDesarrollo_2.dbo.protocol pr
        ON pr.v_ProtocolId = s.v_ProtocolId
    WHERE ISNULL(s.i_IsDeleted,0) = 0
      AND s.d_ServiceDate >= @Desde
      AND s.d_ServiceDate <  DATEADD(DAY,1,@Hasta)
      AND (
            @Ambito = 'TODOS'
         OR (@Ambito = 'OCUPACIONAL'     AND pr.i_MasterServiceTypeId = 1)
         OR (@Ambito = 'ASISTENCIAL'     AND pr.i_MasterServiceTypeId IN (9,42,11,34))
         OR (@Ambito = 'HOSPITALIZACION' AND EXISTS (
                SELECT 1 FROM SigesoftDesarrollo_2.dbo.hospitalizacionservice hs
                WHERE hs.v_ServiceId = s.v_ServiceId AND ISNULL(hs.i_IsDeleted,0) = 0))
          )
      AND ( @SoloConDiagnostico = 0 OR EXISTS (
                SELECT 1 FROM SigesoftDesarrollo_2.dbo.diagnosticrepository dr
                WHERE dr.v_ServiceId = s.v_ServiceId AND ISNULL(dr.i_IsDeleted,0) = 0
                  AND ( dr.i_FinalQualificationId IN (2,3)
                     OR (@IncluirDescartados = 1 AND dr.i_FinalQualificationId = 4) )) )
    ORDER BY s.d_ServiceDate, s.v_ServiceId
    OFFSET (@Page - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    -- -----------------------------------------------------------------------
    -- 2) Tiempo de enfermedad (col 24) - cadena EMR acotada por d_InsertDate a la
    --    ventana de la pagina, set-based, solo sobre las claves ya paginadas.
    -- -----------------------------------------------------------------------
    DECLARE @winIni DATETIME2, @winFin DATETIME2;
    SELECT @winIni = DATEADD(DAY,-1, MIN(d_ServiceDate)),
           @winFin = DATEADD(DAY, 8, MAX(d_ServiceDate))
    FROM #keys;

    IF OBJECT_ID('tempdb..#te') IS NOT NULL DROP TABLE #te;
    ;WITH emr AS (
        SELECT
            sc.v_ServiceId COLLATE DATABASE_DEFAULT AS v_ServiceId,
            scfv.v_Value1,
            ROW_NUMBER() OVER (PARTITION BY sc.v_ServiceId
                               ORDER BY scf.d_InsertDate DESC) AS rn
        FROM SigesoftDesarrollo_2.dbo.servicecomponent sc
        JOIN SigesoftDesarrollo_2.dbo.servicecomponentfields scf
            ON scf.v_ServiceComponentId = sc.v_ServiceComponentId
           AND scf.v_ComponentFieldId IN ('N009-MF000002939','N009-MF000007364','N009-MF000007606')
           AND ISNULL(scf.i_IsDeleted,0) = 0
           AND scf.d_InsertDate >= @winIni AND scf.d_InsertDate < @winFin
        JOIN SigesoftDesarrollo_2.dbo.servicecomponentfieldvalues scfv
            ON scfv.v_ServiceComponentFieldsId = scf.v_ServiceComponentFieldsId
           AND ISNULL(scfv.i_IsDeleted,0) = 0
           AND scfv.d_InsertDate >= @winIni AND scfv.d_InsertDate < @winFin
           AND LTRIM(RTRIM(ISNULL(scfv.v_Value1,''))) <> ''
        WHERE ISNULL(sc.i_IsDeleted,0) = 0
          AND sc.d_InsertDate >= @winIni AND sc.d_InsertDate < @winFin
          AND EXISTS (SELECT 1 FROM #keys k WHERE k.v_ServiceId = sc.v_ServiceId COLLATE DATABASE_DEFAULT)
    )
    SELECT v_ServiceId,
           LTRIM(RTRIM(v_Value1)) COLLATE DATABASE_DEFAULT AS TiempoEnf
    INTO #te
    FROM emr
    WHERE rn = 1;

    -- -----------------------------------------------------------------------
    -- 3) Enriquecer las 50 filas paginadas -> 25 columnas + TotalFilas.
    -- -----------------------------------------------------------------------
    SELECT
        k.v_ServiceId                                                   AS CodigoUnico,           -- 1
        CAST(k.d_ServiceDate AS DATE)                                   AS FechaAtencion,         -- 2
        p.v_FirstLastName  COLLATE DATABASE_DEFAULT                     AS ApellidoPaterno,       -- 3
        p.v_SecondLastName COLLATE DATABASE_DEFAULT                     AS ApellidoMaterno,       -- 4
        p.v_FirstName      COLLATE DATABASE_DEFAULT                     AS Nombres,               -- 5
        @Red                                                            AS Red,                   -- 6
        dh106.v_Value1     COLLATE DATABASE_DEFAULT                     AS TipoDocumento,         -- 7
        p.v_DocNumber      COLLATE DATABASE_DEFAULT                     AS NumeroDocumento,       -- 8
        CAST(p.d_Birthdate AS DATE)                                     AS FechaNacimiento,       -- 9
        CASE p.i_SexTypeId WHEN 1 THEN 'M' WHEN 2 THEN 'F' ELSE '' END  AS Sexo,                  -- 10
        p.v_Nacionalidad   COLLATE DATABASE_DEFAULT                     AS Nacionalidad,          -- 11
        sp401.v_Value1     COLLATE DATABASE_DEFAULT                     AS Etnia,                 -- 12
        p.v_DocNumber      COLLATE DATABASE_DEFAULT                     AS HistoriaClinica,       -- 13
        hosp.d_FechaIngreso                                             AS FechaHospitalizacion,  -- 14
        CASE WHEN p.d_Birthdate IS NULL THEN NULL ELSE
            DATEDIFF(YEAR, p.d_Birthdate, k.d_ServiceDate)
            - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, p.d_Birthdate, k.d_ServiceDate), p.d_Birthdate) > k.d_ServiceDate
                   THEN 1 ELSE 0 END END                                AS Edad,                  -- 15
        'PERU'                                                          AS Pais,                  -- 16
        dhDep.v_Value1     COLLATE DATABASE_DEFAULT                     AS Departamento,          -- 17
        dhProv.v_Value1    COLLATE DATABASE_DEFAULT                     AS Provincia,             -- 18
        dhDist.v_Value1    COLLATE DATABASE_DEFAULT                     AS Distrito,              -- 19
        p.v_BirthPlace     COLLATE DATABASE_DEFAULT                     AS Procedencia,           -- 20
        p.v_AdressLocation COLLATE DATABASE_DEFAULT                     AS DireccionExacta,       -- 21
        CAST('' AS VARCHAR(1))                                          AS Referencia,            -- 22
        dx.Diagnostico                                                  AS Diagnostico,           -- 23
        te.TiempoEnf                                                    AS InicioSintomas,        -- 24
        CAST('' AS VARCHAR(1))                                          AS InicioSintomasDup,     -- 25
        k.TotalFilas                                                    AS TotalFilas
    FROM #keys k
    LEFT JOIN SigesoftDesarrollo_2.dbo.person p
        ON p.v_PersonId = k.v_PersonId COLLATE DATABASE_DEFAULT
    LEFT JOIN SigesoftDesarrollo_2.dbo.datahierarchy dh106
        ON dh106.i_GroupId = 106 AND dh106.i_ItemId = p.i_DocTypeId AND ISNULL(dh106.i_IsDeleted,0) = 0
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp401
        ON sp401.i_GroupId = 401 AND sp401.i_ParameterId = p.i_EtniaRaza
    LEFT JOIN SigesoftDesarrollo_2.dbo.datahierarchy dhDep
        ON dhDep.i_GroupId = 113 AND dhDep.i_ItemId = p.i_DepartmentId AND ISNULL(dhDep.i_IsDeleted,0) = 0
    LEFT JOIN SigesoftDesarrollo_2.dbo.datahierarchy dhProv
        ON dhProv.i_GroupId = 113 AND dhProv.i_ItemId = p.i_ProvinceId AND ISNULL(dhProv.i_IsDeleted,0) = 0
    LEFT JOIN SigesoftDesarrollo_2.dbo.datahierarchy dhDist
        ON dhDist.i_GroupId = 113 AND dhDist.i_ItemId = p.i_DistrictId AND ISNULL(dhDist.i_IsDeleted,0) = 0
    LEFT JOIN #te te
        ON te.v_ServiceId = k.v_ServiceId
    OUTER APPLY (
        SELECT TOP 1 h.d_FechaIngreso
        FROM SigesoftDesarrollo_2.dbo.hospitalizacionservice hs
        JOIN SigesoftDesarrollo_2.dbo.hospitalizacion h
            ON h.v_HopitalizacionId = hs.v_HopitalizacionId AND ISNULL(h.i_IsDeleted,0) = 0
        WHERE hs.v_ServiceId = k.v_ServiceId COLLATE DATABASE_DEFAULT
          AND ISNULL(hs.i_IsDeleted,0) = 0
        ORDER BY h.d_FechaIngreso
    ) hosp
    OUTER APPLY (
        SELECT STUFF((
            SELECT ' | ' + z.v_Name + ' (' + z.v_CIE10Id + ')'
            FROM (
                SELECT DISTINCT
                    dis.v_CIE10Id COLLATE DATABASE_DEFAULT AS v_CIE10Id,
                    dis.v_Name    COLLATE DATABASE_DEFAULT AS v_Name
                FROM SigesoftDesarrollo_2.dbo.diagnosticrepository dr
                JOIN SigesoftDesarrollo_2.dbo.diseases dis
                    ON dis.v_DiseasesId = dr.v_DiseasesId
                WHERE dr.v_ServiceId = k.v_ServiceId COLLATE DATABASE_DEFAULT
                  AND ISNULL(dr.i_IsDeleted,0) = 0
                  AND ( dr.i_FinalQualificationId IN (2,3)
                     OR (@IncluirDescartados = 1 AND dr.i_FinalQualificationId = 4) )
            ) z
            ORDER BY z.v_CIE10Id
            FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 3, '')
    ) dx(Diagnostico)
    ORDER BY k.d_ServiceDate, k.v_ServiceId;
END
GO

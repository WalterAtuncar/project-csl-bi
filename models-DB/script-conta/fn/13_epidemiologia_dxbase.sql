-- =============================================================================
-- 13_epidemiologia_dxbase.sql
-- conta.fn_Epi_DxBase  (iTVF keystone del modulo Epidemiologia)
--
-- Devuelve UNA fila por diagnostico (grano dr), ya filtrada por rango + ambito +
-- calificacion, con TODAS las dimensiones del dashboard. Lee cross-DB (SOLO SELECT)
-- de SigesoftDesarrollo_2. NO deduplica pares (servicio,cie10): cada RS decide su grano.
--
-- Predicado base (identico en todo el modulo):
--   s.i_IsDeleted=0
--   + rango medio-abierto:  d_ServiceDate >= @Desde  AND  < DATEADD(DAY,1,@Hasta)
--   + ambito (protocol.i_MasterServiceTypeId):
--        OCUPACIONAL      = 1
--        ASISTENCIAL      = 9,42,11,34   (34=MTC, decision A: cuenta como asistencial)
--        HOSPITALIZACION  = EXISTS hospitalizacionservice
--        TODOS            = sin filtro de tipo
--   + calificacion dr.i_FinalQualificationId IN (2,3)  (o (2,3,4) si @IncluirDescartados=1)
--
-- Consultorio: protocol.i_Consultorio -> systemparameter grupo 403 (v_Value1);
--   fallback por master service (19=HOSPITALIZACION, 30=SALA OPERACIONES) o (SIN CONSULTORIO).
-- Edad: calculada a la fecha de atencion (person.d_Birthdate). GrupoEtario: etapas de vida MINSA.
-- Capitulo CIE-10: derivado por rango (letra + 2 digitos), tabla del plan (§4.1).
-- Ubigeo (g.113): dpto/prov/dist son i_ItemId globalmente unicos -> lookup directo por i_ItemId.
-- Texto cross-DB devuelto con COLLATE DATABASE_DEFAULT (evita conflictos aguas abajo).
-- SQL Server 2012 estricto (TRY_CONVERT, CROSS APPLY VALUES; sin CREATE OR ALTER).
-- =============================================================================

IF OBJECT_ID('conta.fn_Epi_DxBase','IF') IS NOT NULL
    DROP FUNCTION conta.fn_Epi_DxBase;
GO
CREATE FUNCTION conta.fn_Epi_DxBase
    (@Desde DATE, @Hasta DATE, @Ambito VARCHAR(20), @IncluirDescartados BIT)
RETURNS TABLE
AS
RETURN (
    SELECT
        s.v_ServiceId  COLLATE DATABASE_DEFAULT AS v_ServiceId,
        s.v_PersonId   COLLATE DATABASE_DEFAULT AS v_PersonId,
        s.d_ServiceDate,
        dis.v_CIE10Id  COLLATE DATABASE_DEFAULT AS CIE10,
        dis.v_Name     COLLATE DATABASE_DEFAULT AS DiseaseName,
        cap.CapNum,
        CAST(CASE cap.CapNum
            WHEN 1  THEN 'Ciertas enfermedades infecciosas y parasitarias'
            WHEN 2  THEN 'Neoplasias'
            WHEN 3  THEN 'Enfermedades de la sangre y organos hematopoyeticos'
            WHEN 4  THEN 'Endocrinas, nutricionales y metabolicas'
            WHEN 5  THEN 'Trastornos mentales y del comportamiento'
            WHEN 6  THEN 'Sistema nervioso'
            WHEN 7  THEN 'Ojo y anexos'
            WHEN 8  THEN 'Oido y apofisis mastoides'
            WHEN 9  THEN 'Sistema circulatorio'
            WHEN 10 THEN 'Sistema respiratorio'
            WHEN 11 THEN 'Sistema digestivo'
            WHEN 12 THEN 'Piel y tejido subcutaneo'
            WHEN 13 THEN 'Sistema osteomuscular y tejido conjuntivo'
            WHEN 14 THEN 'Sistema genitourinario'
            WHEN 15 THEN 'Embarazo, parto y puerperio'
            WHEN 16 THEN 'Afecciones originadas en periodo perinatal'
            WHEN 17 THEN 'Malformaciones congenitas y anomalias cromosomicas'
            WHEN 18 THEN 'Sintomas, signos y hallazgos anormales'
            WHEN 19 THEN 'Traumatismos, envenenamientos y causas externas'
            WHEN 20 THEN 'Causas externas de morbimortalidad'
            WHEN 21 THEN 'Factores que influyen en el estado de salud'
            WHEN 22 THEN 'Codigos para propositos especiales'
            ELSE 'Codigo local / no clasificado'
        END AS VARCHAR(80)) COLLATE DATABASE_DEFAULT AS CapNombre,
        pr.i_Consultorio,
        CAST(CASE
            WHEN pr.i_Consultorio IS NOT NULL AND sp403.v_Value1 IS NOT NULL THEN sp403.v_Value1
            WHEN s.i_MasterServiceId = 19 THEN 'HOSPITALIZACION'
            WHEN s.i_MasterServiceId = 30 THEN 'SALA OPERACIONES'
            ELSE '(SIN CONSULTORIO)'
        END AS VARCHAR(100)) COLLATE DATABASE_DEFAULT AS ConsultorioNombre,
        p.i_SexTypeId,
        CAST(CASE p.i_SexTypeId WHEN 1 THEN 'M' WHEN 2 THEN 'F' ELSE '' END AS VARCHAR(1)) COLLATE DATABASE_DEFAULT AS SexoNombre,
        ed.Edad,
        CAST(CASE
            WHEN ed.Edad IS NULL THEN '(Sin edad)'
            WHEN ed.Edad <= 11 THEN 'Nino'
            WHEN ed.Edad <= 17 THEN 'Adolescente'
            WHEN ed.Edad <= 29 THEN 'Joven'
            WHEN ed.Edad <= 59 THEN 'Adulto'
            ELSE 'Adulto mayor'
        END AS VARCHAR(20)) COLLATE DATABASE_DEFAULT AS GrupoEtario,
        p.i_DepartmentId,
        p.i_ProvinceId,
        p.i_DistrictId,
        dh113.v_Value1 COLLATE DATABASE_DEFAULT AS DistritoNombre,
        pr.i_MasterServiceTypeId
    FROM SigesoftDesarrollo_2.dbo.service s
    JOIN SigesoftDesarrollo_2.dbo.protocol pr
        ON pr.v_ProtocolId = s.v_ProtocolId
    JOIN SigesoftDesarrollo_2.dbo.diagnosticrepository dr
        ON dr.v_ServiceId = s.v_ServiceId AND ISNULL(dr.i_IsDeleted,0) = 0
    JOIN SigesoftDesarrollo_2.dbo.diseases dis
        ON dis.v_DiseasesId = dr.v_DiseasesId
    LEFT JOIN SigesoftDesarrollo_2.dbo.person p
        ON p.v_PersonId = s.v_PersonId
    LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp403
        ON sp403.i_GroupId = 403 AND sp403.i_ParameterId = pr.i_Consultorio
    LEFT JOIN SigesoftDesarrollo_2.dbo.datahierarchy dh113
        ON dh113.i_GroupId = 113 AND dh113.i_ItemId = p.i_DistrictId AND ISNULL(dh113.i_IsDeleted,0) = 0
    CROSS APPLY (SELECT
            UPPER(LEFT(dis.v_CIE10Id,1)) AS L,
            TRY_CONVERT(INT, SUBSTRING(dis.v_CIE10Id,2,2)) AS N) x
    CROSS APPLY (SELECT CASE
            WHEN x.L IN ('A','B') THEN 1
            WHEN x.L = 'C' OR (x.L = 'D' AND x.N <= 48) THEN 2
            WHEN x.L = 'D' AND x.N >= 50 THEN 3
            WHEN x.L = 'E' THEN 4
            WHEN x.L = 'F' THEN 5
            WHEN x.L = 'G' THEN 6
            WHEN x.L = 'H' AND x.N <= 59 THEN 7
            WHEN x.L = 'H' AND x.N >= 60 THEN 8
            WHEN x.L = 'I' THEN 9
            WHEN x.L = 'J' THEN 10
            WHEN x.L = 'K' THEN 11
            WHEN x.L = 'L' THEN 12
            WHEN x.L = 'M' THEN 13
            WHEN x.L = 'N' THEN 14
            WHEN x.L = 'O' THEN 15
            WHEN x.L = 'P' THEN 16
            WHEN x.L = 'Q' THEN 17
            WHEN x.L = 'R' THEN 18
            WHEN x.L IN ('S','T') THEN 19
            WHEN x.L IN ('V','W','X','Y') THEN 20
            WHEN x.L = 'Z' THEN 21
            WHEN x.L = 'U' THEN 22
            ELSE NULL
        END AS CapNum) cap
    CROSS APPLY (SELECT
            DATEDIFF(YEAR, p.d_Birthdate, s.d_ServiceDate)
            - CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, p.d_Birthdate, s.d_ServiceDate), p.d_Birthdate) > s.d_ServiceDate
                   THEN 1 ELSE 0 END AS Edad) ed
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
      AND ( dr.i_FinalQualificationId IN (2,3)
         OR (@IncluirDescartados = 1 AND dr.i_FinalQualificationId = 4) )
);
GO

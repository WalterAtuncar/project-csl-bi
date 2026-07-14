-- =============================================================================
-- 15_epidemiologia_canal_endemico.sql
-- conta.sp_Epidemiologia_CanalEndemico  (TAB 2 - canal endemico, lazy)
--
-- Corredor endemico por semana ISO: banda historica de los 2 anios previos
-- (@Anio-1, @Anio-2) + overlay del anio actual (@Anio) + zona de riesgo.
--   "Casos" = pares DISTINCT (servicio, cie10) por semana (evento diagnostico),
--   filtrables por ambito y, opcional, un capitulo (@Capitulo) o un codigo (@Cie10).
--   Banda con 2 anios: Q1 = MIN, Mediana = promedio, Q3 = MAX de los 2 valores
--   semanales (incluyendo ceros de semanas sin casos). Con mas anios el mismo
--   esquema se generaliza; con 2 es la simplificacion estandar del corredor.
--   Semanas 1..52 (2024 y 2025 tienen 52/52 sin huecos; se evita la 53 partida).
-- Zonas (clasificacion estandar):
--   CasosActual < Q1            -> Exito
--   Q1 <= CasosActual < Mediana -> Seguridad
--   Mediana <= CasosActual <= Q3-> Alarma
--   CasosActual > Q3            -> Epidemia
-- Cross-DB SigesoftDesarrollo_2 = SOLO SELECT.
-- =============================================================================

IF OBJECT_ID('conta.sp_Epidemiologia_CanalEndemico','P') IS NOT NULL
    DROP PROCEDURE conta.sp_Epidemiologia_CanalEndemico;
GO
CREATE PROCEDURE conta.sp_Epidemiologia_CanalEndemico
    @Anio        INT,
    @HastaSemana INT         = NULL,
    @Ambito      VARCHAR(20) = 'TODOS',
    @Capitulo    INT         = NULL,
    @Cie10       VARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @maxW INT = 52;

    -- ---------- conteo por (anio, semana ISO): pares DISTINCT (servicio, cie10) ----------
    IF OBJECT_ID('tempdb..#cnt') IS NOT NULL DROP TABLE #cnt;
    ;WITH dxraw AS (
        SELECT DISTINCT
            s.v_ServiceId,
            dis.v_CIE10Id COLLATE DATABASE_DEFAULT AS CIE10,
            -- Anio ISO (evita "semanas partidas de anio nuevo"): anio del jueves de
            -- la semana = YEAR( lunes-ancla + 3 dias ). Lunes @@DATEFIRST-independiente.
            YEAR(DATEADD(DAY, 3,
                 DATEADD(DAY, -((DATEDIFF(DAY,'19000101', s.d_ServiceDate)) % 7),
                         CAST(s.d_ServiceDate AS DATE)))) AS Anio,
            DATEPART(ISO_WEEK, s.d_ServiceDate) AS SemanaISO
        FROM SigesoftDesarrollo_2.dbo.service s
        JOIN SigesoftDesarrollo_2.dbo.protocol pr
            ON pr.v_ProtocolId = s.v_ProtocolId
        JOIN SigesoftDesarrollo_2.dbo.diagnosticrepository dr
            ON dr.v_ServiceId = s.v_ServiceId AND ISNULL(dr.i_IsDeleted,0) = 0
           AND dr.i_FinalQualificationId IN (2,3)
        JOIN SigesoftDesarrollo_2.dbo.diseases dis
            ON dis.v_DiseasesId = dr.v_DiseasesId
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
        WHERE ISNULL(s.i_IsDeleted,0) = 0
          -- rango con pequeno buffer para capturar los dias de borde ISO de cada anio.
          AND s.d_ServiceDate >= DATEADD(DAY,-4, DATEFROMPARTS(@Anio-2,1,1))
          AND s.d_ServiceDate <  DATEFROMPARTS(@Anio+1,1,8)
          AND (
                @Ambito = 'TODOS'
             OR (@Ambito = 'OCUPACIONAL'     AND pr.i_MasterServiceTypeId = 1)
             OR (@Ambito = 'ASISTENCIAL'     AND pr.i_MasterServiceTypeId IN (9,42,11,34))
             OR (@Ambito = 'HOSPITALIZACION' AND EXISTS (
                    SELECT 1 FROM SigesoftDesarrollo_2.dbo.hospitalizacionservice hs
                    WHERE hs.v_ServiceId = s.v_ServiceId AND ISNULL(hs.i_IsDeleted,0) = 0))
              )
          AND (@Cie10    IS NULL OR dis.v_CIE10Id COLLATE DATABASE_DEFAULT = @Cie10)
          AND (@Capitulo IS NULL OR cap.CapNum = @Capitulo)
    )
    SELECT Anio, SemanaISO, COUNT(*) AS Casos
    INTO #cnt
    FROM dxraw
    WHERE SemanaISO BETWEEN 1 AND @maxW
    GROUP BY Anio, SemanaISO;

    -- ---------- @HastaSemana por default = ultima semana con data del anio actual ----------
    IF @HastaSemana IS NULL
        SET @HastaSemana = ISNULL((SELECT MAX(SemanaISO) FROM #cnt WHERE Anio = @Anio), @maxW);
    IF @HastaSemana < 1     SET @HastaSemana = 1;
    IF @HastaSemana > @maxW SET @HastaSemana = @maxW;

    -- ---------- banda (2 anios previos, con ceros) + overlay actual + zona ----------
    ;WITH semanas AS (
        SELECT n.number AS SemanaISO
        FROM master.dbo.spt_values n
        WHERE n.type = 'P' AND n.number BETWEEN 1 AND @HastaSemana
    ),
    histpair AS (
        SELECT sm.SemanaISO, y.Anio, ISNULL(c.Casos,0) AS Casos
        FROM semanas sm
        CROSS JOIN (VALUES (@Anio-1),(@Anio-2)) y(Anio)
        LEFT JOIN #cnt c ON c.SemanaISO = sm.SemanaISO AND c.Anio = y.Anio
    ),
    band AS (
        SELECT SemanaISO,
            MIN(Casos)                                        AS Q1,
            CAST(AVG(CAST(Casos AS DECIMAL(10,2))) AS DECIMAL(10,2)) AS Mediana,
            MAX(Casos)                                        AS Q3
        FROM histpair
        GROUP BY SemanaISO
    )
    SELECT
        b.SemanaISO,
        b.Q1,
        b.Mediana,
        b.Q3,
        ISNULL(cur.Casos,0) AS CasosActual,
        CAST(CASE
            WHEN ISNULL(cur.Casos,0) <  b.Q1      THEN 'Exito'
            WHEN ISNULL(cur.Casos,0) <  b.Mediana THEN 'Seguridad'
            WHEN ISNULL(cur.Casos,0) <= b.Q3      THEN 'Alarma'
            ELSE 'Epidemia'
        END AS VARCHAR(12)) AS Zona
    FROM band b
    LEFT JOIN #cnt cur ON cur.SemanaISO = b.SemanaISO AND cur.Anio = @Anio
    ORDER BY b.SemanaISO;
END
GO

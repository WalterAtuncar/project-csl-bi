ALTER PROCEDURE [dbo].[sp_PagoMedicoPorConsultorioCompleto]
    @i_Consultorio INT,
    @d_FechaInicio DATETIME,
    @d_FechaFin DATETIME
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- TABLA TEMPORAL: COMPONENTES DE SERVICIOS POR CONSULTORIO Y RANGO DE FECHA
    -- =============================================
    CREATE TABLE #TempServiciosMedicoConsultorio (
        v_ServiceId VARCHAR(50),
        v_ServiceComponentId VARCHAR(50),
        d_ServiceDate DATETIME,
        v_PersonId VARCHAR(50),
        v_ComprobantePago VARCHAR(500),
        v_PrimerComprobante VARCHAR(100),
        i_Consultorio INT,
        i_MedicoTratanteId INT
    );

    INSERT INTO #TempServiciosMedicoConsultorio
    SELECT DISTINCT
        sr.v_ServiceId,
        sc.v_ServiceComponentId,
        sr.d_ServiceDate,
        sr.v_PersonId,
        sr.v_ComprobantePago,
        CASE
            WHEN CHARINDEX('|', sr.v_ComprobantePago) > 0
                THEN LTRIM(RTRIM(SUBSTRING(sr.v_ComprobantePago, 1, CHARINDEX('|', sr.v_ComprobantePago) - 1)))
            ELSE LTRIM(RTRIM(sr.v_ComprobantePago))
        END AS v_PrimerComprobante,
        pr.i_Consultorio,
        sc.i_MedicoTratanteId
    FROM [dbo].[service] sr
    INNER JOIN [dbo].[protocol] pr ON sr.v_ProtocolId = pr.v_ProtocolId
    INNER JOIN [dbo].[servicecomponent] sc ON sr.v_ServiceId = sc.v_ServiceId
    WHERE pr.i_Consultorio = @i_Consultorio
      AND sr.i_ServiceStatusId = 3
      AND sr.d_ServiceDate BETWEEN @d_FechaInicio AND @d_FechaFin
      AND sr.v_ComprobantePago IS NOT NULL
      AND LTRIM(RTRIM(sr.v_ComprobantePago)) <> '';

    -- =============================================
    -- TABLA TEMPORAL FINAL: SERVICIOS ÚNICOS CON DATOS DE VENTAS
    -- =============================================
    CREATE TABLE #TempServiciosConVentasConsultorio (
        v_ServiceId VARCHAR(50),
        d_ServiceDate DATETIME,
        v_PersonId VARCHAR(50),
        v_ComprobantePago VARCHAR(500),
        v_PrimerComprobante VARCHAR(100),
        d_Total DECIMAL(18,2),
        i_Consultorio INT,
        i_MedicoTratanteId INT,
        TotalComponentsPagados INT,
        TotalComponents INT
    );

    INSERT INTO #TempServiciosConVentasConsultorio
    SELECT
        tsm.v_ServiceId,
        tsm.d_ServiceDate,
        tsm.v_PersonId,
        tsm.v_ComprobantePago,
        tsm.v_PrimerComprobante,
        ISNULL(vt.d_Total, 0) AS d_Total,
        tsm.i_Consultorio,
        tsm.i_MedicoTratanteId,
        (SELECT COUNT(*)
         FROM #TempServiciosMedicoConsultorio tsm2
         INNER JOIN [dbo].[servicespaiddetails] spd ON tsm2.v_ServiceId = spd.v_ServiceId
         WHERE spd.i_IsDeleted = 0 AND tsm2.v_ServiceId = tsm.v_ServiceId) AS TotalComponentsPagados,
        (SELECT COUNT(*)
         FROM #TempServiciosMedicoConsultorio tsm3
         WHERE tsm3.v_ServiceId = tsm.v_ServiceId) AS TotalComponents
    FROM (
        SELECT DISTINCT v_ServiceId, d_ServiceDate, v_PersonId, v_ComprobantePago, v_PrimerComprobante, i_Consultorio, i_MedicoTratanteId
        FROM #TempServiciosMedicoConsultorio
    ) tsm
    LEFT JOIN [20505310072].[dbo].[venta] vt ON vt.v_CorrelativoDocumentoFin = tsm.v_PrimerComprobante
    WHERE tsm.v_PrimerComprobante IS NOT NULL;

    -- =============================================
    -- PRIMER RESULTSET: CABECERA - LISTA DE MÉDICOS DEL CONSULTORIO CON TOTALES
    -- =============================================
    SELECT
        tsv.i_MedicoTratanteId AS MedicoId,
        pp.v_FirstName + ', ' + pp.v_FirstLastName + ' ' + pp.v_SecondLastName AS NombreMedico,
        sp.v_Value1 AS EspecialidadMedico,

        COUNT(tsv.v_ServiceId) AS TotalServiciosGenerados,
        SUM(tsv.d_Total) AS MontoTotalGenerado,

        SUM(CASE WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN 1 ELSE 0 END) AS ServiciosPagados,
        SUM(CASE WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN tsv.d_Total ELSE 0 END) AS MontoYaPagado,
        SUM(CASE WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN (tsv.d_Total * CAST(sp.v_Value2 AS DECIMAL(5,2)) / 100) ELSE 0 END) AS PagoYaRealizado,

        SUM(CASE WHEN tsv.TotalComponentsPagados < tsv.TotalComponents THEN 1 ELSE 0 END) AS ServiciosPendientes,

        MIN(tsv.d_ServiceDate) AS PrimerServicio,
        MAX(tsv.d_ServiceDate) AS UltimoServicio,
        @d_FechaInicio AS FechaInicio,
        @d_FechaFin AS FechaFin,
        GETDATE() AS FechaCalculo,

        CASE
            WHEN SUM(CASE WHEN tsv.TotalComponentsPagados < tsv.TotalComponents THEN 1 ELSE 0 END) = 0 THEN 'COMPLETAMENTE PAGADO'
            WHEN SUM(CASE WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN 1 ELSE 0 END) = 0 THEN 'PENDIENTE TOTAL'
            ELSE 'PARCIALMENTE PAGADO'
        END AS EstadoGeneral
    FROM #TempServiciosConVentasConsultorio tsv
    INNER JOIN [dbo].[systemparameter] sp ON @i_Consultorio = sp.i_ParameterId AND sp.i_GroupId = 403
    INNER JOIN [dbo].[systemuser] su ON tsv.i_MedicoTratanteId = su.i_SystemUserId
    INNER JOIN [dbo].[person] pp ON su.v_PersonId = pp.v_PersonId
    WHERE tsv.d_Total > 0
    GROUP BY tsv.i_MedicoTratanteId, pp.v_FirstName, pp.v_FirstLastName, pp.v_SecondLastName, sp.v_Value1;

    -- =============================================
    -- SEGUNDO RESULTSET: DETALLE - SERVICIOS ÚNICOS CON ESTADO DE PAGO (COMPROBANTES)
    -- =============================================
    SELECT
        NULL AS v_ServiceComponentId,
        tsv.v_ServiceId,
        tsv.d_ServiceDate,
        pp2.v_FirstName + ', ' + pp2.v_FirstLastName + ' ' + pp2.v_SecondLastName AS Paciente,
        CASE
            WHEN CHARINDEX('|', tsv.v_ComprobantePago) > 0
                THEN LTRIM(RTRIM(SUBSTRING(tsv.v_ComprobantePago, 1, CHARINDEX('|', tsv.v_ComprobantePago) - 1)))
            ELSE LTRIM(RTRIM(tsv.v_ComprobantePago))
        END AS v_ComprobantePago,
        tsv.d_Total AS PrecioServicio,
        tsv.i_MedicoTratanteId AS MedicoId,
        CAST(sp.v_Value2 AS DECIMAL(5,2)) AS PorcentajeMedico,
        tsv.d_Total * CAST(sp.v_Value2 AS DECIMAL(5,2)) / 100 AS PagoMedico,

        CASE
            WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN 'PAGADO'
            WHEN tsv.TotalComponentsPagados > 0 THEN 'PARCIAL'
            ELSE 'POR PAGAR'
        END AS EstadoPago,

        (SELECT MAX(spp.d_PayDate)
         FROM #TempServiciosMedicoConsultorio tsm
         INNER JOIN [dbo].[servicespaiddetails] spd ON tsm.v_ServiceId = spd.v_ServiceId
         INNER JOIN [dbo].[servicespaid] spp ON spd.i_PaidId = spp.i_PaidId
         WHERE spd.i_IsDeleted = 0 AND tsm.v_ServiceId = tsv.v_ServiceId) AS FechaPago,

        ROW_NUMBER() OVER (ORDER BY tsv.d_ServiceDate, tsv.v_ServiceId) AS NumeroLinea,

        CASE
            WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN 1
            ELSE 0
        END AS EsPagado,

        CONVERT(VARCHAR(10), tsv.d_ServiceDate, 103) AS FechaServicioFormateada,
        'S/ ' + CONVERT(VARCHAR(20), CAST(tsv.d_Total AS MONEY), 1) AS PrecioServicioFormateado,
        'S/ ' + CONVERT(VARCHAR(20), CAST(tsv.d_Total * CAST(sp.v_Value2 AS DECIMAL(5,2)) / 100 AS MONEY), 1) AS PagoMedicoFormateado,

        CASE
            WHEN (SELECT MAX(spp.d_PayDate)
                  FROM #TempServiciosMedicoConsultorio tsm
                  INNER JOIN [dbo].[servicespaiddetails] spd ON tsm.v_ServiceId = spd.v_ServiceId
                  INNER JOIN [dbo].[servicespaid] spp ON spd.i_PaidId = spp.i_PaidId
                  WHERE spd.i_IsDeleted = 0 AND tsm.v_ServiceId = tsv.v_ServiceId) IS NOT NULL
            THEN CONVERT(VARCHAR(10), (SELECT MAX(spp.d_PayDate)
                                       FROM #TempServiciosMedicoConsultorio tsm
                                       INNER JOIN [dbo].[servicespaiddetails] spd ON tsm.v_ServiceId = spd.v_ServiceId
                                       INNER JOIN [dbo].[servicespaid] spp ON spd.i_PaidId = spp.i_PaidId
                                       WHERE spd.i_IsDeleted = 0 AND tsm.v_ServiceId = tsv.v_ServiceId), 103)
            ELSE NULL
        END AS FechaPagoFormateada,

        CASE
            WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN 'success'
            WHEN tsv.TotalComponentsPagados > 0 THEN 'info'
            ELSE 'warning'
        END AS ColorEstado,

        CASE
            WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN 'fa-check-circle'
            WHEN tsv.TotalComponentsPagados > 0 THEN 'fa-clock-half'
            ELSE 'fa-clock'
        END AS IconoEstado,

        (SELECT SUM(spd.r_Pagado)
         FROM #TempServiciosMedicoConsultorio tsm
         INNER JOIN [dbo].[servicespaiddetails] spd ON tsm.v_ServiceId = spd.v_ServiceId
         WHERE spd.i_IsDeleted = 0 AND tsm.v_ServiceId = tsv.v_ServiceId) AS MontoPagadoReal,

        (SELECT AVG(spd.r_Porcentaje)
         FROM #TempServiciosMedicoConsultorio tsm
         INNER JOIN [dbo].[servicespaiddetails] spd ON tsm.v_ServiceId = spd.v_ServiceId
         WHERE spd.i_IsDeleted = 0 AND tsm.v_ServiceId = tsv.v_ServiceId) AS PorcentajePagadoReal

    FROM #TempServiciosConVentasConsultorio tsv
    INNER JOIN [dbo].[systemparameter] sp ON @i_Consultorio = sp.i_ParameterId AND sp.i_GroupId = 403
    INNER JOIN [dbo].[person] pp2 ON tsv.v_PersonId = pp2.v_PersonId
    WHERE tsv.d_Total > 0
    ORDER BY tsv.d_ServiceDate, tsv.v_ServiceId;

    -- =============================================
    -- LIMPIEZA
    -- =============================================
    DROP TABLE #TempServiciosMedicoConsultorio;
    DROP TABLE #TempServiciosConVentasConsultorio;
END;
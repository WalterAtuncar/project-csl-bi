BEGIN TRAN

IF OBJECT_ID(N'dbo.sp_PagoMedicoPorConsultorioCompleto', N'P') IS NOT NULL
    EXEC('DROP PROCEDURE dbo.sp_PagoMedicoPorConsultorioCompleto');
GO

CREATE PROCEDURE [dbo].[sp_PagoMedicoPorConsultorioCompleto]
    @i_Consultorio INT,
    @d_FechaInicio DATETIME,
    @d_FechaFin DATETIME
AS
BEGIN
    SET NOCOUNT ON;

    IF OBJECT_ID('tempdb..#TempServiciosMedicoConsultorio') IS NOT NULL DROP TABLE #TempServiciosMedicoConsultorio;
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

    ;WITH sc_first AS (
        SELECT
            sc.v_ServiceId,
            sc.v_ServiceComponentId,
            sc.v_ComponentId,
            sc.i_MedicoTratanteId,
            ROW_NUMBER() OVER (
                PARTITION BY sc.v_ServiceId
                ORDER BY COALESCE(sc.d_InsertDate, '1900-01-01'), sc.v_ServiceComponentId
            ) AS rn
        FROM dbo.servicecomponent sc
        INNER JOIN dbo.service sr ON sc.v_ServiceId = sr.v_ServiceId
        INNER JOIN dbo.component cc ON sc.v_ComponentId = cc.v_ComponentId
        WHERE sr.d_ServiceDate >= @d_FechaInicio
          AND sr.d_ServiceDate <= @d_FechaFin
          AND cc.r_BasePrice > 0
    )
    INSERT INTO #TempServiciosMedicoConsultorio
    SELECT DISTINCT
        sr.v_ServiceId,
        scf.v_ServiceComponentId,
        sr.d_ServiceDate,
        sr.v_PersonId,
        sr.v_ComprobantePago,
        CASE WHEN CHARINDEX('|', sr.v_ComprobantePago) > 0
             THEN LTRIM(RTRIM(SUBSTRING(sr.v_ComprobantePago, 1, CHARINDEX('|', sr.v_ComprobantePago) - 1)))
             ELSE LTRIM(RTRIM(sr.v_ComprobantePago)) END AS v_PrimerComprobante,
        pr.i_Consultorio,
        scf.i_MedicoTratanteId
    FROM dbo.service sr
    INNER JOIN dbo.protocol pr ON sr.v_ProtocolId = pr.v_ProtocolId
    INNER JOIN sc_first scf ON scf.v_ServiceId = sr.v_ServiceId AND scf.rn = 1
    INNER JOIN dbo.component cc ON cc.v_ComponentId = scf.v_ComponentId
    WHERE pr.i_Consultorio = @i_Consultorio
      AND sr.i_ServiceStatusId = 3
      AND sr.d_ServiceDate BETWEEN @d_FechaInicio AND @d_FechaFin
      AND LTRIM(RTRIM(COALESCE(sr.v_ComprobantePago, ''))) <> ''
      AND cc.r_BasePrice > 0;

    IF OBJECT_ID('tempdb..#AggServiciosPago') IS NOT NULL DROP TABLE #AggServiciosPago;
    CREATE TABLE #AggServiciosPago (
        v_ServiceId VARCHAR(50) PRIMARY KEY,
        TotalComponents INT,
        TotalComponentsPagados INT,
        FechaPago DATETIME
    );

    INSERT INTO #AggServiciosPago (v_ServiceId, TotalComponents, TotalComponentsPagados, FechaPago)
    SELECT
        tsm.v_ServiceId,
        COUNT(*) AS TotalComponents,
        SUM(CASE WHEN spd.i_IsDeleted = 0 THEN 1 ELSE 0 END) AS TotalComponentsPagados,
        MAX(spp.d_PayDate) AS FechaPago
    FROM #TempServiciosMedicoConsultorio tsm
    LEFT JOIN dbo.servicespaiddetails spd ON tsm.v_ServiceId = spd.v_ServiceId
    LEFT JOIN dbo.servicespaid spp ON spd.i_PaidId = spp.i_PaidId
    GROUP BY tsm.v_ServiceId;

    IF OBJECT_ID('tempdb..#TempServiciosConVentasConsultorio') IS NOT NULL DROP TABLE #TempServiciosConVentasConsultorio;
    CREATE TABLE #TempServiciosConVentasConsultorio (
        v_ServiceId VARCHAR(50) PRIMARY KEY,
        d_ServiceDate DATETIME,
        v_PersonId VARCHAR(50),
        v_ComprobantePago VARCHAR(500),
        v_PrimerComprobante VARCHAR(100),
        d_Total DECIMAL(18,2),
        i_Consultorio INT,
        i_MedicoTratanteId INT,
        TotalComponentsPagados INT,
        TotalComponents INT,
        FechaPago DATETIME,
        i_IdFormaPago INT NULL,
        FormaPagoName NVARCHAR(100) NULL
    );

    INSERT INTO #TempServiciosConVentasConsultorio
    SELECT
        b.v_ServiceId,
        b.d_ServiceDate,
        b.v_PersonId,
        b.v_ComprobantePago,
        b.v_PrimerComprobante,
        ISNULL(vt.d_Total, 0) AS d_Total,
        b.i_Consultorio,
        b.i_MedicoTratanteId,
        ap.TotalComponentsPagados,
        ap.TotalComponents,
        ap.FechaPago,
        cd.i_IdFormaPago,
        dh.v_Value1 AS FormaPagoName
    FROM (
        SELECT DISTINCT v_ServiceId, d_ServiceDate, v_PersonId, v_ComprobantePago, v_PrimerComprobante, i_Consultorio, i_MedicoTratanteId
        FROM #TempServiciosMedicoConsultorio
    ) b
    LEFT JOIN #AggServiciosPago ap ON ap.v_ServiceId = b.v_ServiceId
    LEFT JOIN [20505310072].[dbo].[venta] vt ON vt.v_CorrelativoDocumentoFin = b.v_PrimerComprobante
    LEFT JOIN [20505310072].[dbo].[cobranzadetalle] cd ON cd.v_IdVenta = vt.v_IdVenta AND cd.i_Eliminado = 0
    LEFT JOIN [20505310072].[dbo].[datahierarchy] dh ON dh.i_GroupId = 46 AND dh.i_ItemId = cd.i_IdFormaPago
    WHERE b.v_PrimerComprobante IS NOT NULL;

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
    INNER JOIN dbo.systemparameter sp ON @i_Consultorio = sp.i_ParameterId AND sp.i_GroupId = 403
    INNER JOIN dbo.systemuser su ON tsv.i_MedicoTratanteId = su.i_SystemUserId
    INNER JOIN dbo.person pp ON su.v_PersonId = pp.v_PersonId
    WHERE tsv.d_Total > 0
    GROUP BY tsv.i_MedicoTratanteId, pp.v_FirstName, pp.v_FirstLastName, pp.v_SecondLastName, sp.v_Value1;

    SELECT
        NULL AS v_ServiceComponentId,
        tsv.v_ServiceId,
        tsv.d_ServiceDate,
        p.v_FirstName + ', ' + p.v_FirstLastName + ' ' + p.v_SecondLastName AS Paciente,
        REPLACE(
          REPLACE(
            LTRIM(RTRIM(
              CASE WHEN CHARINDEX('|', tsv.v_ComprobantePago) > 0
                   THEN SUBSTRING(tsv.v_ComprobantePago, 1, CHARINDEX('|', tsv.v_ComprobantePago) - 1)
                   ELSE tsv.v_ComprobantePago
              END
            )),
            CHAR(9), ''
          ),
          ' ', ''
        ) AS v_ComprobantePago,
        tsv.d_Total AS PrecioServicio,
        tsv.i_MedicoTratanteId AS MedicoId,
        CAST(sp.v_Value2 AS DECIMAL(5,2)) AS PorcentajeMedico,
        tsv.d_Total * CAST(sp.v_Value2 AS DECIMAL(5,2)) / 100 AS PagoMedico,
        CASE
            WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN 'PAGADO'
            WHEN tsv.TotalComponentsPagados > 0 THEN 'PARCIAL'
            ELSE 'POR PAGAR'
        END AS EstadoPago,
        tsv.FechaPago,
        tsv.i_IdFormaPago AS IdFormaPago,
        tsv.FormaPagoName AS FormaPagoName,
        ROW_NUMBER() OVER (ORDER BY tsv.d_ServiceDate, tsv.v_ServiceId) AS NumeroLinea,
        CASE WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN 1 ELSE 0 END AS EsPagado,
        CONVERT(VARCHAR(10), tsv.d_ServiceDate, 103) AS FechaServicioFormateada,
        'S/ ' + CONVERT(VARCHAR(20), CAST(tsv.d_Total AS MONEY), 1) AS PrecioServicioFormateado,
        'S/ ' + CONVERT(VARCHAR(20), CAST(tsv.d_Total * CAST(sp.v_Value2 AS DECIMAL(5,2)) / 100 AS MONEY), 1) AS PagoMedicoFormateado,
        CASE WHEN tsv.FechaPago IS NOT NULL THEN CONVERT(VARCHAR(10), tsv.FechaPago, 103) ELSE NULL END AS FechaPagoFormateada,
        CASE
            WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN 'success'
            WHEN tsv.TotalComponentsPagados > 0 THEN 'info'
            ELSE 'warning'
        END AS ColorEstado,
        CASE
            WHEN tsv.TotalComponentsPagados = tsv.TotalComponents AND tsv.TotalComponents > 0 THEN 'fa-check-circle'
            WHEN tsv.TotalComponentsPagados > 0 THEN 'fa-clock-half'
            ELSE 'fa-clock'
        END AS IconoEstado
    FROM #TempServiciosConVentasConsultorio tsv
    INNER JOIN dbo.systemparameter sp ON @i_Consultorio = sp.i_ParameterId AND sp.i_GroupId = 403
    INNER JOIN dbo.person p ON tsv.v_PersonId = p.v_PersonId
    WHERE tsv.d_Total > 0
    ORDER BY tsv.d_ServiceDate, tsv.v_ServiceId;

    DROP TABLE #TempServiciosMedicoConsultorio;
    DROP TABLE #AggServiciosPago;
    DROP TABLE #TempServiciosConVentasConsultorio;
END
GO

-- Prueba rápida (ajuste a su rango):
-- EXEC dbo.sp_PagoMedicoPorConsultorioCompleto 6, '2025-10-01T00:00:00.000', '2025-10-31T23:59:59.999';

ROLLBACK TRAN

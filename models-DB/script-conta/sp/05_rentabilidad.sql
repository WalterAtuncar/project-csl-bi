-- =====================================================================
-- FASE 4 - Rentabilidad (devengado). SQL Server 2012.
--   Ingresos: ventas netas sin IGV (dbo.ventadetalle.d_Valor) por unidad,
--             mismos filtros del cierre; ajuste SISOL por % vigente.
--   Gastos:   egreso DEVENGADO por t_FechaDocumento (estado <> ANULADO) neto de
--             IGV + costo de personal del periodo; centro -> unidad por ancestro.
-- Se usan funciones inline (iTVF) para evitar INSERT..EXEC anidado y poder
-- componer general/por-unidad/comparativa.
-- =====================================================================

-- ---------------------------------------------------------------------
-- iTVF: ingresos de rentabilidad por unidad (con ajuste SISOL)
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.fn_Rentabilidad_Ingresos','IF') IS NOT NULL DROP FUNCTION conta.fn_Rentabilidad_Ingresos;
GO
CREATE FUNCTION conta.fn_Rentabilidad_Ingresos (@Anio SMALLINT, @Mes TINYINT)
RETURNS TABLE
AS
RETURN (
    WITH ventas AS (
        SELECT tcct.i_IdTipoCaja, tc.v_NombreTipoCaja AS Unidad,
               vd.d_Valor AS Neto, vd.d_Igv AS IGV, vd.d_PrecioVenta AS Bruto
        FROM dbo.venta v
        JOIN dbo.ventadetalle vd ON vd.v_IdVenta=v.v_IdVenta AND ISNULL(vd.i_Eliminado,0)=0
        LEFT JOIN dbo.tipocaja_clientetipo tcct ON tcct.i_ClienteEsAgente=v.i_ClienteEsAgente AND tcct.b_Activo=1
        LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja=tcct.i_IdTipoCaja
        WHERE ISNULL(v.i_Eliminado,0)=0
          AND v.t_InsertaFecha >= DATEFROMPARTS(@Anio,@Mes,1)
          AND v.t_InsertaFecha <  DATEADD(MONTH,1,DATEFROMPARTS(@Anio,@Mes,1))
          AND v.i_ClienteEsAgente IS NOT NULL
          AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3,4))
          AND ISNULL(v.v_SerieDocumento,'') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR','TFM','THM')
    ),
    porc AS (
        SELECT ISNULL((SELECT TOP 1 d_PorcClinica FROM conta.sisol_participacion
                       WHERE t_VigenciaDesde <= DATEFROMPARTS(@Anio,@Mes,1)
                         AND (t_VigenciaHasta IS NULL OR t_VigenciaHasta >= DATEFROMPARTS(@Anio,@Mes,1))
                       ORDER BY t_VigenciaDesde DESC), 100) AS PorcClinica
    )
    SELECT
        v.i_IdTipoCaja,
        ISNULL(v.Unidad,'SIN UNIDAD') AS Unidad,
        SUM(v.Bruto) AS BrutoConIGV,
        SUM(v.IGV) AS IGV,
        SUM(v.Neto) AS NetoSinIGV,
        CASE WHEN v.Unidad='SISOL' THEN p.PorcClinica ELSE 100 END AS PorcClinica,
        CASE WHEN v.Unidad='SISOL' THEN CAST(SUM(v.Neto) * p.PorcClinica/100 AS DECIMAL(18,2)) ELSE SUM(v.Neto) END AS NetoRentabilidad,
        CASE WHEN v.Unidad='SISOL' THEN CAST(SUM(v.Neto) * (100-p.PorcClinica)/100 AS DECIMAL(18,2)) ELSE 0 END AS ParticipacionHospital
    FROM ventas v CROSS JOIN porc p
    GROUP BY v.i_IdTipoCaja, v.Unidad, p.PorcClinica
);
GO

-- ---------------------------------------------------------------------
-- iTVF: gastos de rentabilidad por unidad (devengado). Centro -> unidad por ancestro.
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.fn_Rentabilidad_Gastos','IF') IS NOT NULL DROP FUNCTION conta.fn_Rentabilidad_Gastos;
GO
CREATE FUNCTION conta.fn_Rentabilidad_Gastos (@Anio SMALLINT, @Mes TINYINT)
RETURNS TABLE
AS
RETURN (
    WITH walk AS (
        SELECT c.i_IdCentroCosto AS origen, c.i_IdPadre, c.i_IdTipoCaja
        FROM conta.centro_costo c
        UNION ALL
        SELECT w.origen, p.i_IdPadre, p.i_IdTipoCaja
        FROM walk w JOIN conta.centro_costo p ON p.i_IdCentroCosto = w.i_IdPadre
        WHERE w.i_IdTipoCaja IS NULL
    ),
    mapc AS (
        SELECT origen AS i_IdCentroCosto, MAX(i_IdTipoCaja) AS i_IdTipoCaja
        FROM walk GROUP BY origen
    ),
    gastos AS (
        -- Se excluye la participacion Hospital SISOL (egreso ligado a una liquidacion):
        -- rentabilidad ya cuenta solo el % clinica como ingreso; contarla seria doble penalizacion.
        SELECT e.i_IdCentroCosto, e.d_MontoNeto AS Monto
        FROM conta.egreso e
        WHERE e.v_Estado <> 'ANULADO'
          AND e.t_FechaDocumento >= DATEFROMPARTS(@Anio,@Mes,1)
          AND e.t_FechaDocumento <  DATEADD(MONTH,1,DATEFROMPARTS(@Anio,@Mes,1))
          AND NOT EXISTS (SELECT 1 FROM conta.sisol_liquidacion sl WHERE sl.i_IdEgresoHospital = e.i_IdEgreso)
        UNION ALL
        SELECT cpm.i_IdCentroCosto, cpm.d_Monto
        FROM conta.costo_personal_mensual cpm
        WHERE cpm.n_Anio=@Anio AND cpm.n_Mes=@Mes
    )
    SELECT
        m.i_IdTipoCaja,
        ISNULL(tc.v_NombreTipoCaja,'ADMINISTRACION') AS Unidad,
        g.i_IdCentroCosto,
        cc.v_Nombre AS CentroCosto,
        SUM(g.Monto) AS Gasto
    FROM gastos g
    LEFT JOIN mapc m ON m.i_IdCentroCosto = g.i_IdCentroCosto
    LEFT JOIN dbo.tipocaja tc ON tc.i_IdTipoCaja = m.i_IdTipoCaja
    LEFT JOIN conta.centro_costo cc ON cc.i_IdCentroCosto = g.i_IdCentroCosto
    GROUP BY m.i_IdTipoCaja, tc.v_NombreTipoCaja, g.i_IdCentroCosto, cc.v_Nombre
);
GO

-- ---------------------------------------------------------------------
-- iTVF: totales generales de un mes (para componer comparativa sin INSERT..EXEC)
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.fn_Rentabilidad_TotalesMes','IF') IS NOT NULL DROP FUNCTION conta.fn_Rentabilidad_TotalesMes;
GO
CREATE FUNCTION conta.fn_Rentabilidad_TotalesMes (@Anio SMALLINT, @Mes TINYINT)
RETURNS TABLE
AS
RETURN (
    SELECT
        ISNULL((SELECT SUM(NetoRentabilidad) FROM conta.fn_Rentabilidad_Ingresos(@Anio,@Mes)),0) AS Ingresos,
        ISNULL((SELECT SUM(Gasto) FROM conta.fn_Rentabilidad_Gastos(@Anio,@Mes)),0) AS Gastos
);
GO

-- ---------------------------------------------------------------------
-- SPs expuestos (thin wrappers + agregaciones)
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Rentabilidad_Ingresos','P') IS NOT NULL DROP PROCEDURE conta.sp_Rentabilidad_Ingresos;
GO
CREATE PROCEDURE conta.sp_Rentabilidad_Ingresos @Anio SMALLINT, @Mes TINYINT
AS
BEGIN SET NOCOUNT ON; SELECT * FROM conta.fn_Rentabilidad_Ingresos(@Anio,@Mes) ORDER BY Unidad; END
GO

IF OBJECT_ID('conta.sp_Rentabilidad_Gastos','P') IS NOT NULL DROP PROCEDURE conta.sp_Rentabilidad_Gastos;
GO
CREATE PROCEDURE conta.sp_Rentabilidad_Gastos @Anio SMALLINT, @Mes TINYINT
AS
BEGIN SET NOCOUNT ON; SELECT * FROM conta.fn_Rentabilidad_Gastos(@Anio,@Mes) ORDER BY Unidad, CentroCosto; END
GO

IF OBJECT_ID('conta.sp_Rentabilidad_General','P') IS NOT NULL DROP PROCEDURE conta.sp_Rentabilidad_General;
GO
CREATE PROCEDURE conta.sp_Rentabilidad_General @Anio SMALLINT, @Mes TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @rentMin DECIMAL(9,2) = ISNULL(TRY_CONVERT(DECIMAL(9,2),(SELECT v_Valor FROM conta.config WHERE v_Clave='SEMAFORO_RENTABLE_MIN')),15);
    DECLARE @bajoMin DECIMAL(9,2) = ISNULL(TRY_CONVERT(DECIMAL(9,2),(SELECT v_Valor FROM conta.config WHERE v_Clave='SEMAFORO_BAJO_MIN')),0);
    DECLARE @ing DECIMAL(18,2), @gas DECIMAL(18,2);
    SELECT @ing = Ingresos, @gas = Gastos FROM conta.fn_Rentabilidad_TotalesMes(@Anio,@Mes);
    DECLARE @res DECIMAL(18,2) = @ing - @gas;
    DECLARE @margen DECIMAL(9,2) = CASE WHEN @ing <> 0 THEN CAST(@res*100.0/@ing AS DECIMAL(9,2)) ELSE 0 END;
    SELECT @ing AS Ingresos, @gas AS Gastos, @res AS Resultado, @margen AS MargenPorc,
           CASE WHEN @margen >= @rentMin THEN 'RENTABLE'
                WHEN @margen >= @bajoMin THEN 'BAJO_MARGEN'
                ELSE 'PERDIDA' END AS Semaforo,
           @rentMin AS RentableMin, @bajoMin AS BajoMin;
END
GO

IF OBJECT_ID('conta.sp_Rentabilidad_PorUnidad','P') IS NOT NULL DROP PROCEDURE conta.sp_Rentabilidad_PorUnidad;
GO
CREATE PROCEDURE conta.sp_Rentabilidad_PorUnidad @Anio SMALLINT, @Mes TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @rentMin DECIMAL(9,2) = ISNULL(TRY_CONVERT(DECIMAL(9,2),(SELECT v_Valor FROM conta.config WHERE v_Clave='SEMAFORO_RENTABLE_MIN')),15);
    DECLARE @bajoMin DECIMAL(9,2) = ISNULL(TRY_CONVERT(DECIMAL(9,2),(SELECT v_Valor FROM conta.config WHERE v_Clave='SEMAFORO_BAJO_MIN')),0);

    DECLARE @u TABLE (i_IdTipoCaja INT, Unidad NVARCHAR(60), Ingresos DECIMAL(18,2), Gastos DECIMAL(18,2));
    INSERT INTO @u (i_IdTipoCaja, Unidad, Ingresos, Gastos)
    SELECT COALESCE(ig.i_IdTipoCaja, ga.i_IdTipoCaja), COALESCE(ig.Unidad, ga.Unidad),
           ISNULL(ig.Ingresos,0), ISNULL(ga.Gastos,0)
    FROM (SELECT i_IdTipoCaja, Unidad, SUM(NetoRentabilidad) AS Ingresos FROM conta.fn_Rentabilidad_Ingresos(@Anio,@Mes) WHERE i_IdTipoCaja IS NOT NULL GROUP BY i_IdTipoCaja, Unidad) ig
    FULL OUTER JOIN (SELECT i_IdTipoCaja, Unidad, SUM(Gasto) AS Gastos FROM conta.fn_Rentabilidad_Gastos(@Anio,@Mes) WHERE i_IdTipoCaja IS NOT NULL GROUP BY i_IdTipoCaja, Unidad) ga
        ON ga.i_IdTipoCaja = ig.i_IdTipoCaja;

    DECLARE @admin DECIMAL(18,2) = ISNULL((SELECT SUM(Gasto) FROM conta.fn_Rentabilidad_Gastos(@Anio,@Mes) WHERE i_IdTipoCaja IS NULL),0);
    DECLARE @totIng DECIMAL(18,2) = ISNULL((SELECT SUM(NetoRentabilidad) FROM conta.fn_Rentabilidad_Ingresos(@Anio,@Mes)),0);
    DECLARE @totGas DECIMAL(18,2) = ISNULL((SELECT SUM(Gasto) FROM conta.fn_Rentabilidad_Gastos(@Anio,@Mes)),0);

    SELECT i_IdTipoCaja, Unidad, Ingresos, Gastos, (Ingresos-Gastos) AS Resultado,
           CASE WHEN Ingresos<>0 THEN CAST((Ingresos-Gastos)*100.0/Ingresos AS DECIMAL(9,2)) ELSE 0 END AS MargenPorc,
           CASE WHEN Ingresos=0 THEN 'SIN_INGRESO'
                WHEN (Ingresos-Gastos)*100.0/Ingresos >= @rentMin THEN 'RENTABLE'
                WHEN (Ingresos-Gastos)*100.0/Ingresos >= @bajoMin THEN 'BAJO_MARGEN'
                ELSE 'PERDIDA' END AS Semaforo,
           CAST(0 AS BIT) AS EsTotal, CAST(0 AS BIT) AS EsAdministracion
    FROM @u
    UNION ALL
    SELECT NULL, 'ADMINISTRACION', 0, @admin, -@admin, 0, 'NEUTRO', CAST(0 AS BIT), CAST(1 AS BIT)
    UNION ALL
    SELECT NULL, 'TOTAL', @totIng, @totGas, (@totIng-@totGas),
           CASE WHEN @totIng<>0 THEN CAST((@totIng-@totGas)*100.0/@totIng AS DECIMAL(9,2)) ELSE 0 END,
           'TOTAL', CAST(1 AS BIT), CAST(0 AS BIT)
    ORDER BY EsTotal, EsAdministracion, Unidad;
END
GO

IF OBJECT_ID('conta.sp_Rentabilidad_Comparativa','P') IS NOT NULL DROP PROCEDURE conta.sp_Rentabilidad_Comparativa;
GO
CREATE PROCEDURE conta.sp_Rentabilidad_Comparativa @Anio SMALLINT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @serie TABLE (Mes TINYINT, Ingresos DECIMAL(18,2), Gastos DECIMAL(18,2));
    DECLARE @m TINYINT = 1;
    WHILE @m <= 12
    BEGIN
        INSERT INTO @serie (Mes, Ingresos, Gastos)
        SELECT @m, Ingresos, Gastos FROM conta.fn_Rentabilidad_TotalesMes(@Anio,@m);
        SET @m += 1;
    END

    DECLARE @mesesTrans TINYINT = CASE WHEN @Anio < YEAR(GETDATE()) THEN 12
                                       WHEN @Anio > YEAR(GETDATE()) THEN 0
                                       ELSE CAST(MONTH(GETDATE())-1 AS TINYINT) END;
    DECLARE @bTrim BIT = CASE WHEN @mesesTrans/3 >= 2 THEN 1 ELSE 0 END;
    DECLARE @bSem  BIT = CASE WHEN @mesesTrans >= 12 THEN 1 ELSE 0 END;

    SELECT Mes, Ingresos, Gastos, (Ingresos-Gastos) AS Resultado,
           CASE WHEN Ingresos<>0 THEN CAST((Ingresos-Gastos)*100.0/Ingresos AS DECIMAL(9,2)) ELSE 0 END AS MargenPorc,
           @bTrim AS TrimestralActiva, @bSem AS SemestralActiva
    FROM @serie ORDER BY Mes;

    SELECT ((Mes-1)/3)+1 AS Trimestre, SUM(Ingresos) AS Ingresos, SUM(Gastos) AS Gastos, SUM(Ingresos)-SUM(Gastos) AS Resultado
    FROM @serie GROUP BY (Mes-1)/3 ORDER BY Trimestre;

    SELECT ((Mes-1)/6)+1 AS Semestre, SUM(Ingresos) AS Ingresos, SUM(Gastos) AS Gastos, SUM(Ingresos)-SUM(Gastos) AS Resultado
    FROM @serie GROUP BY (Mes-1)/6 ORDER BY Semestre;
END
GO

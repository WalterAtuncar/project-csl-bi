-- =====================================================================
-- FASE 1 (Reconciliacion caja legacy diaria) - Funciones de huella + SPs del poller.
-- SQL Server 2012. Patron idempotente IF OBJECT_ID DROP / GO / CREATE.
-- Plan: models-DB/docs/PLAN_RECONCILIACION_CIERRE_DIARIO.md (5, 6, RESULTADOS FASE 0-A, 7 refinamientos).
--
-- Objetos:
--   conta.fn_CajaRecon_HuellaFuente(@Desde,@Hasta)     iTVF: huella FUENTE por dia (ingresos+egresos)
--   conta.fn_CajaRecon_HuellaPersistido(@Desde,@Hasta) iTVF: huella PERSISTIDO por dia (filas recon-*)
--   conta.sp_CajaRecon_Huella @Desde,@Hasta            SOLO LECTURA: pares FUENTE vs PERSISTIDO
--   conta.sp_CajaRecon_ReconciliarDia @Fecha,@Modo     OBSERVACION=log / ESCRITURA=rebuild quirurgico del dia
--   conta.sp_CajaRecon_Tick @Modo,@BarridoProfundo     orquestador: applock + pendientes + barridos
--
-- REFINAMIENTOS VINCULANTES aplicados:
--  1. v_Origen PROPIO del poller: 'recon-cobranzas' (I) y 'recon-egreso' (E). DELETE quirurgico y
--     huella-persistido key-ean por esos dos valores (aisla del origen manual y del camino UI legacy).
--  2. PORTAR (no llamar) los CTE de los generadores vivos, day-scoped con CONVERT(DATE,t_InsertaFecha)=@Fecha.
--  3. Cadena EXEC plano (sin INSERT..EXEC): Tick->ReconciliarDia->ResumenTipos. NO RecalcularTotales.
--  4. Cabecera mensual lazy: upsert portado de Cierre_CreateUpdate.
--  5. Barrido corto = UN rango [hoy-7,hoy]; huella con iTVF (2 scans de venta, sin indice en t_InsertaFecha).
--  6. Supuesto: reloj del servidor SQL en hora Lima (t_InsertaFecha es hora local, no datetimeoffset).
--  7. Piso demo 2026-07-01: enforced en ReconciliarDia (RAISERROR) y en las iTVF (floor duro).
--
-- Huella canonica (GATE-0.4): COUNT, SUM(monto), CHECKSUM_AGG(BINARY_CHECKSUM(idVenta,monto,dia,formaPago,tipo)).
-- CONVERTs identicos en ambos lados: v_IdVenta nchar(32)->NVARCHAR(100); monto->DECIMAL(18,2) (replica el
-- redondeo al persistir en d_Total); dia->DATE; formaPago->INT (ISNULL -1); tipo->INT (1=I,2=E).
-- =====================================================================


-- =====================================================================
-- 1) fn_CajaRecon_HuellaFuente  (iTVF) - huella FUENTE por dia
--    Ingresos: mirror sp_CajaMayor_GenerarDesdeCobranzas (1 fila por ventadetalle).
--    Egresos : mirror sp_CajaMayor_GenerarEgresosDesdeVentas (1 fila por venta, serie EC*).
-- =====================================================================
IF OBJECT_ID('conta.fn_CajaRecon_HuellaFuente','IF') IS NOT NULL DROP FUNCTION conta.fn_CajaRecon_HuellaFuente;
GO
CREATE FUNCTION conta.fn_CajaRecon_HuellaFuente (@Desde DATE, @Hasta DATE)
RETURNS TABLE
AS
RETURN
(
    SELECT x.dia AS d_Fecha,
           COUNT(*)              AS hf_Cnt,
           SUM(x.monto)          AS hf_Sum,
           CHECKSUM_AGG(x.rowchk) AS hf_Chk
    FROM (
        -- INGRESOS (por ventadetalle)
        SELECT
            CONVERT(DATE, V.t_InsertaFecha) AS dia,
            CONVERT(DECIMAL(18,2), ISNULL(VD.d_PrecioVenta,0)) AS monto,
            BINARY_CHECKSUM(
                CONVERT(NVARCHAR(100), ISNULL(V.v_IdVenta,N'')),
                CONVERT(DECIMAL(18,2), ISNULL(VD.d_PrecioVenta,0)),
                CONVERT(DATE, V.t_InsertaFecha),
                CONVERT(INT, ISNULL(CD.i_IdFormaPago,-1)),
                CONVERT(INT, 1)
            ) AS rowchk
        FROM dbo.venta V
        INNER JOIN dbo.ventadetalle VD
            ON V.v_IdVenta = VD.v_IdVenta AND ISNULL(VD.i_Eliminado,0)=0
        LEFT JOIN dbo.cobranzadetalle CD
            ON CD.v_IdVenta = V.v_IdVenta
        LEFT JOIN dbo.datahierarchy DH
            ON DH.i_GroupId = 41 AND DH.i_ItemId = V.i_IdCondicionPago
        LEFT JOIN dbo.datahierarchy DH2
            ON DH2.i_GroupId = 46 AND DH2.i_ItemId = CD.i_IdFormaPago
        WHERE V.i_Eliminado = 0
          AND V.t_InsertaFecha >= '2026-07-01'
          AND V.t_InsertaFecha >= @Desde
          AND V.t_InsertaFecha <  DATEADD(DAY,1,@Hasta)
          AND V.i_ClienteEsAgente IS NOT NULL
          AND (V.i_InsertaIdUsuario <> 2036 OR V.i_ClienteEsAgente IN (3,4))
          AND ISNULL(V.v_SerieDocumento,'') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR')
          AND ISNULL(V.v_SerieDocumento,'') NOT IN ('TFM','THM')
          AND (
                (DH.v_Value1 = 'CONTADO' AND DH2.v_Value1 = 'EFECTIVO SOLES')
             OR (DH.v_Value1 = 'CREDITO')
             OR (DH.v_Value1 = 'CONTADO' AND ISNULL(DH2.v_Value1,'') <> 'EFECTIVO SOLES')
             OR (DH.v_Value1 IN ('CHEQUE','DEPOSITO'))
          )

        UNION ALL

        -- EGRESOS (por venta, agrupado)
        SELECT
            g.dia,
            g.monto,
            BINARY_CHECKSUM(
                CONVERT(NVARCHAR(100), ISNULL(g.v_IdVenta,N'')),
                g.monto,
                g.dia,
                CONVERT(INT, -1),
                CONVERT(INT, 2)
            ) AS rowchk
        FROM (
            SELECT
                v.v_IdVenta AS v_IdVenta,
                CONVERT(DATE, v.t_InsertaFecha) AS dia,
                CONVERT(DECIMAL(18,2), SUM(ISNULL(vd.d_PrecioVenta,0))) AS monto
            FROM dbo.venta v
            INNER JOIN dbo.ventadetalle vd
                ON v.v_IdVenta = vd.v_IdVenta AND ISNULL(vd.i_Eliminado,0)=0
            WHERE v.i_Eliminado = 0
              AND v.t_InsertaFecha >= '2026-07-01'
              AND v.t_InsertaFecha >= @Desde
              AND v.t_InsertaFecha <  DATEADD(DAY,1,@Hasta)
              AND v.v_SerieDocumento IN ('ECO','ECA','ECF','ECT','ECG','ECR')
              AND v.i_ClienteEsAgente IS NOT NULL
              AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3,4))
            GROUP BY v.v_IdVenta, CONVERT(DATE, v.t_InsertaFecha)
        ) g
    ) x
    GROUP BY x.dia
);
GO


-- =====================================================================
-- 2) fn_CajaRecon_HuellaPersistido (iTVF) - huella PERSISTIDO por dia (SOLO filas recon-*)
-- =====================================================================
IF OBJECT_ID('conta.fn_CajaRecon_HuellaPersistido','IF') IS NOT NULL DROP FUNCTION conta.fn_CajaRecon_HuellaPersistido;
GO
CREATE FUNCTION conta.fn_CajaRecon_HuellaPersistido (@Desde DATE, @Hasta DATE)
RETURNS TABLE
AS
RETURN
(
    SELECT
        CONVERT(DATE, m.t_FechaMovimiento) AS d_Fecha,
        COUNT(*) AS hp_Cnt,
        SUM(CONVERT(DECIMAL(18,2), m.d_Total)) AS hp_Sum,
        CHECKSUM_AGG(
            BINARY_CHECKSUM(
                CONVERT(NVARCHAR(100), ISNULL(m.v_IdVenta,N'')),
                CONVERT(DECIMAL(18,2), m.d_Total),
                CONVERT(DATE, m.t_FechaMovimiento),
                CONVERT(INT, ISNULL(m.i_IdFormaPago,-1)),
                CONVERT(INT, CASE WHEN LTRIM(RTRIM(m.v_TipoMovimiento)) = 'I' THEN 1 ELSE 2 END)
            )
        ) AS hp_Chk
    FROM dbo.cajamayor_movimiento m
    WHERE m.v_Origen IN ('recon-cobranzas','recon-egreso')
      AND m.t_FechaMovimiento >= '2026-07-01'
      AND m.t_FechaMovimiento >= @Desde
      AND m.t_FechaMovimiento <  DATEADD(DAY,1,@Hasta)
    GROUP BY CONVERT(DATE, m.t_FechaMovimiento)
);
GO


-- =====================================================================
-- 3) sp_CajaRecon_Huella  (SOLO LECTURA) - pares FUENTE vs PERSISTIDO por dia + agregado
-- =====================================================================
IF OBJECT_ID('conta.sp_CajaRecon_Huella','P') IS NOT NULL DROP PROCEDURE conta.sp_CajaRecon_Huella;
GO
CREATE PROCEDURE conta.sp_CajaRecon_Huella
    @Desde DATE,
    @Hasta DATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Piso DATE = '2026-07-01';
    IF @Desde < @Piso SET @Desde = @Piso;
    IF @Hasta < @Desde SET @Hasta = @Desde;

    -- RS1: por dia
    SELECT
        COALESCE(f.d_Fecha, p.d_Fecha) AS d_Fecha,
        ISNULL(f.hf_Cnt,0) AS fte_Cnt, ISNULL(f.hf_Sum,0) AS fte_Sum, f.hf_Chk AS fte_Chk,
        ISNULL(p.hp_Cnt,0) AS per_Cnt, ISNULL(p.hp_Sum,0) AS per_Sum, p.hp_Chk AS per_Chk,
        CASE WHEN ISNULL(f.hf_Cnt,0)=ISNULL(p.hp_Cnt,0)
              AND ISNULL(f.hf_Sum,0)=ISNULL(p.hp_Sum,0)
              AND ISNULL(f.hf_Chk,0)=ISNULL(p.hp_Chk,0)
             THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS Coincide
    FROM conta.fn_CajaRecon_HuellaFuente(@Desde,@Hasta) f
    FULL OUTER JOIN conta.fn_CajaRecon_HuellaPersistido(@Desde,@Hasta) p
        ON p.d_Fecha = f.d_Fecha
    ORDER BY d_Fecha;

    -- RS2: agregado del rango
    SELECT
        @Desde AS Desde, @Hasta AS Hasta,
        (SELECT ISNULL(SUM(hf_Cnt),0) FROM conta.fn_CajaRecon_HuellaFuente(@Desde,@Hasta))     AS fte_Cnt,
        (SELECT ISNULL(SUM(hf_Sum),0) FROM conta.fn_CajaRecon_HuellaFuente(@Desde,@Hasta))     AS fte_Sum,
        (SELECT ISNULL(SUM(hp_Cnt),0) FROM conta.fn_CajaRecon_HuellaPersistido(@Desde,@Hasta)) AS per_Cnt,
        (SELECT ISNULL(SUM(hp_Sum),0) FROM conta.fn_CajaRecon_HuellaPersistido(@Desde,@Hasta)) AS per_Sum;
END
GO


-- =====================================================================
-- 4) sp_CajaRecon_ReconciliarDia  - rebuild quirurgico de UNA fecha
-- =====================================================================
IF OBJECT_ID('conta.sp_CajaRecon_ReconciliarDia','P') IS NOT NULL DROP PROCEDURE conta.sp_CajaRecon_ReconciliarDia;
GO
CREATE PROCEDURE conta.sp_CajaRecon_ReconciliarDia
    @Fecha             DATE,
    @Modo              NVARCHAR(12),
    @IdUsuario         INT = 1,
    @Origen            NVARCHAR(20) = 'MANUAL',
    @DefaultIdTipoCaja INT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Piso DATE = '2026-07-01';
    DECLARE @Hoy  DATE = CONVERT(DATE, GETDATE());
    DECLARE @t0   DATETIME = GETDATE();

    IF @Modo IS NULL OR @Modo NOT IN ('OBSERVACION','ESCRITURA')
    BEGIN RAISERROR('Modo invalido (OBSERVACION|ESCRITURA).',16,1); RETURN; END

    IF @Fecha < @Piso
    BEGIN
        DECLARE @msgPiso NVARCHAR(200) = N'Fecha ' + CONVERT(VARCHAR(10),@Fecha,120)
            + N' anterior al piso demo 2026-07-01. Operacion rechazada.';
        RAISERROR(@msgPiso,16,1); RETURN;
    END
    IF @Fecha > @Hoy
    BEGIN RAISERROR('No se puede reconciliar una fecha futura.',16,1); RETURN; END

    -- Huella FUENTE del dia y PERSISTIDO (pre)
    DECLARE @fteCnt INT=0, @fteSum DECIMAL(18,2)=0, @fteChk INT=NULL;
    DECLARE @preCnt INT=0, @preSum DECIMAL(18,2)=0, @preChk INT=NULL;
    SELECT @fteCnt=hf_Cnt, @fteSum=hf_Sum, @fteChk=hf_Chk FROM conta.fn_CajaRecon_HuellaFuente(@Fecha,@Fecha);
    SELECT @preCnt=hp_Cnt, @preSum=hp_Sum, @preChk=hp_Chk FROM conta.fn_CajaRecon_HuellaPersistido(@Fecha,@Fecha);

    DECLARE @coincide BIT = CASE WHEN ISNULL(@fteCnt,0)=ISNULL(@preCnt,0)
                                  AND ISNULL(@fteSum,0)=ISNULL(@preSum,0)
                                  AND ISNULL(@fteChk,0)=ISNULL(@preChk,0)
                                 THEN 1 ELSE 0 END;
    DECLARE @priorEst NVARCHAR(15) = (SELECT v_Estado FROM conta.caja_reconciliacion_dia WHERE d_Fecha=@Fecha);
    DECLARE @resultado NVARCHAR(20) = CASE WHEN @priorEst IS NULL THEN 'OK'
                                           WHEN @coincide=1 THEN 'OK_SIN_CAMBIOS'
                                           ELSE 'DERIVA_DETECTADA' END;
    DECLARE @detalle NVARCHAR(MAX) = N'{"fecha":"'+CONVERT(VARCHAR(10),@Fecha,120)
        +N'","fteCnt":'+CONVERT(VARCHAR,@fteCnt)+N',"fteSum":'+CONVERT(VARCHAR,@fteSum)
        +N',"preCnt":'+CONVERT(VARCHAR,@preCnt)+N',"preSum":'+CONVERT(VARCHAR,@preSum)
        +N',"coincide":'+CONVERT(VARCHAR,@coincide)+N'}';

    -- MODO OBSERVACION: solo log, 0 escrituras en dbo / dia
    IF @Modo='OBSERVACION'
    BEGIN
        INSERT INTO conta.caja_reconciliacion_log (t_Inicio,t_Fin,v_Origen,v_Modo,v_Accion,d_Fecha,v_Resultado,v_Detalle,i_IdUsuario)
        VALUES (@t0,GETDATE(),@Origen,'OBSERVACION','RECONCILIAR_DIA',@Fecha,@resultado,@detalle,@IdUsuario);
        RETURN;
    END

    -- MODO ESCRITURA
    BEGIN TRY
        BEGIN TRAN;

        -- a) Cabecera mensual lazy (port de sp_CajaMayor_Cierre_CreateUpdate)
        DECLARE @AnioN NCHAR(4) = CONVERT(NCHAR(4), YEAR(@Fecha));
        DECLARE @MesN  NCHAR(2) = RIGHT('0'+CONVERT(VARCHAR(2), MONTH(@Fecha)), 2);
        DECLARE @MesIni DATETIME = DATEADD(DAY, 1-DAY(@Fecha), CONVERT(DATETIME, CONVERT(DATE,@Fecha)));
        DECLARE @MesFin DATETIME = DATEADD(SECOND,-1, DATEADD(DAY,1, CONVERT(DATETIME, EOMONTH(@Fecha))));
        DECLARE @IdCierre INT = (SELECT i_IdCajaMayorCierre FROM dbo.cajamayor_cierre WHERE n_Anio=@AnioN AND n_Mes=@MesN);
        IF @IdCierre IS NULL
        BEGIN
            INSERT INTO dbo.cajamayor_cierre
                (n_Anio,n_Mes,t_FechaInicio,t_FechaFin,d_SaldoInicialTotal,d_TotalIngresosTotal,d_TotalEgresosTotal,d_SaldoFinalTotal,i_EstadoCierre,v_Observaciones,i_InsertaIdUsuario,t_InsertaFecha)
            VALUES
                (@AnioN,@MesN,@MesIni,@MesFin,0,0,0,0,1,N'Reconciliacion automatica conta',@IdUsuario,GETDATE());
            SET @IdCierre = SCOPE_IDENTITY();
        END

        -- b) DELETE quirurgico: SOLO filas recon-* de esa fecha (preserva manuales/compras/legacy)
        DELETE FROM dbo.cajamayor_movimiento
         WHERE i_IdCajaMayorCierre = @IdCierre
           AND CONVERT(DATE, t_FechaMovimiento) = @Fecha
           AND v_Origen IN ('recon-cobranzas','recon-egreso');

        -- c1) INSERT ingresos day-scoped (port CTE de GenerarDesdeCobranzas; v_Origen='recon-cobranzas')
        ;WITH VentasIngreso AS (
            SELECT
                V.v_IdVenta, V.v_SerieDocumento, V.v_CorrelativoDocumento, V.t_InsertaFecha, V.i_ClienteEsAgente,
                VD.d_PrecioVenta AS d_Total, VD.d_Valor AS d_Subtotal, VD.d_Igv AS d_IGV, VD.v_DescripcionProducto,
                DH.v_Value1 AS CONDICION, DH2.v_Value1 AS TIPO, CD.i_IdFormaPago
            FROM dbo.venta V
            INNER JOIN dbo.ventadetalle VD ON V.v_IdVenta=VD.v_IdVenta AND ISNULL(VD.i_Eliminado,0)=0
            LEFT JOIN dbo.cobranzadetalle CD ON CD.v_IdVenta=V.v_IdVenta
            LEFT JOIN dbo.datahierarchy DH ON DH.i_GroupId=41 AND DH.i_ItemId=V.i_IdCondicionPago
            LEFT JOIN dbo.datahierarchy DH2 ON DH2.i_GroupId=46 AND DH2.i_ItemId=CD.i_IdFormaPago
            WHERE V.i_Eliminado=0
              AND CONVERT(DATE, V.t_InsertaFecha) = @Fecha
              AND V.i_ClienteEsAgente IS NOT NULL
              AND (V.i_InsertaIdUsuario <> 2036 OR V.i_ClienteEsAgente IN (3,4))
              AND ISNULL(V.v_SerieDocumento,'') NOT IN ('ECO','ECA','ECF','ECT','ECG','ECR')
              AND ISNULL(V.v_SerieDocumento,'') NOT IN ('TFM','THM')
        )
        INSERT INTO dbo.cajamayor_movimiento
            (i_IdCajaMayorCierre,i_IdTipoCaja,v_TipoMovimiento,v_ConceptoMovimiento,d_Subtotal,d_IGV,d_Total,i_IdFormaPago,t_FechaMovimiento,v_Observaciones,v_Origen,v_CodigoDocumento,v_SerieDocumento,v_NumeroDocumento,v_IdVenta,i_InsertaIdUsuario,t_InsertaFecha)
        SELECT
            @IdCierre,
            COALESCE(tcct.i_IdTipoCaja, @DefaultIdTipoCaja),
            'I',
            LEFT(ISNULL(vi.v_DescripcionProducto,'Ingreso venta'),350),
            ISNULL(vi.d_Subtotal,0), ISNULL(vi.d_IGV,0), ISNULL(vi.d_Total,0),
            vi.i_IdFormaPago,
            vi.t_InsertaFecha,
            CASE
                WHEN vi.CONDICION='CONTADO' AND vi.TIPO='EFECTIVO SOLES' THEN 'Contado Efectivo'
                WHEN vi.CONDICION='CREDITO' THEN 'Credito'
                WHEN (vi.CONDICION='CONTADO' AND ISNULL(vi.TIPO,'')<>'EFECTIVO SOLES') OR vi.CONDICION IN ('CHEQUE','DEPOSITO')
                    THEN 'No Efectivo - ' + ISNULL(vi.TIPO, vi.CONDICION)
                ELSE 'Otro - ' + ISNULL(vi.CONDICION,'Sin condicion')
            END,
            'recon-cobranzas',
            ISNULL(vi.v_SerieDocumento,''),
            ISNULL(vi.v_SerieDocumento,''),
            ISNULL(vi.v_SerieDocumento,'') + '-' + ISNULL(vi.v_CorrelativoDocumento,''),
            ISNULL(vi.v_IdVenta,''),
            @IdUsuario, GETDATE()
        FROM VentasIngreso vi
        LEFT JOIN dbo.tipocaja_clientetipo tcct
            ON tcct.i_ClienteEsAgente = vi.i_ClienteEsAgente AND tcct.b_Activo = 1
        WHERE (
              (vi.CONDICION='CONTADO' AND vi.TIPO='EFECTIVO SOLES')
           OR (vi.CONDICION='CREDITO')
           OR (vi.CONDICION='CONTADO' AND ISNULL(vi.TIPO,'')<>'EFECTIVO SOLES')
           OR (vi.CONDICION IN ('CHEQUE','DEPOSITO'))
        );

        -- c2) INSERT egresos day-scoped (port de GenerarEgresosDesdeVentas; v_Origen='recon-egreso')
        ;WITH VentasEgreso AS (
            SELECT
                v.v_IdVenta, v.v_SerieDocumento, v.v_CorrelativoDocumento, v.t_InsertaFecha, v.i_ClienteEsAgente,
                SUM(ISNULL(vd.d_PrecioVenta,0)) AS d_TotalEgreso,
                STUFF((SELECT ' | ' + ISNULL(REPLACE(d2.v_DescripcionProducto, CHAR(31), ''), '')
                         FROM dbo.ventadetalle d2
                        WHERE d2.v_IdVenta = v.v_IdVenta AND ISNULL(d2.i_Eliminado,0)=0
                        ORDER BY d2.t_InsertaFecha FOR XML PATH(''), TYPE).value('.','NVARCHAR(MAX)'),1,3,'') AS v_ConceptosDetalle
            FROM dbo.venta v
            INNER JOIN dbo.ventadetalle vd ON v.v_IdVenta=vd.v_IdVenta AND ISNULL(vd.i_Eliminado,0)=0
            WHERE v.i_Eliminado=0
              AND CONVERT(DATE, v.t_InsertaFecha) = @Fecha
              AND v.v_SerieDocumento IN ('ECO','ECA','ECF','ECT','ECG','ECR')
              AND v.i_ClienteEsAgente IS NOT NULL
              AND (v.i_InsertaIdUsuario <> 2036 OR v.i_ClienteEsAgente IN (3,4))
            GROUP BY v.v_IdVenta, v.v_SerieDocumento, v.v_CorrelativoDocumento, v.t_InsertaFecha, v.i_ClienteEsAgente
        )
        INSERT INTO dbo.cajamayor_movimiento
            (i_IdCajaMayorCierre,i_IdTipoCaja,v_TipoMovimiento,v_ConceptoMovimiento,d_Subtotal,d_IGV,d_Total,t_FechaMovimiento,v_Observaciones,v_Origen,v_CodigoDocumento,v_SerieDocumento,v_NumeroDocumento,v_IdVenta,i_InsertaIdUsuario,t_InsertaFecha)
        SELECT
            @IdCierre,
            COALESCE(tcct.i_IdTipoCaja, @DefaultIdTipoCaja),
            'E',
            LEFT(COALESCE(ve.v_ConceptosDetalle, 'Egreso ' + ISNULL(ve.v_SerieDocumento,'')),350),
            0, 0, ISNULL(ve.d_TotalEgreso,0),
            ve.t_InsertaFecha,
            'Egreso serie ' + ISNULL(ve.v_SerieDocumento,''),
            'recon-egreso',
            ISNULL(ve.v_SerieDocumento,''),
            ISNULL(ve.v_SerieDocumento,''),
            ISNULL(ve.v_SerieDocumento,'') + '-' + ISNULL(ve.v_CorrelativoDocumento,''),
            ISNULL(ve.v_IdVenta,''),
            @IdUsuario, GETDATE()
        FROM VentasEgreso ve
        LEFT JOIN dbo.tipocaja_clientetipo tcct
            ON tcct.i_ClienteEsAgente = ve.i_ClienteEsAgente AND tcct.b_Activo = 1;

        -- d) Recalcular resumen/totales del MES (EXEC plano; ResumenTipos actualiza tipocaja + cabecera)
        EXEC dbo.sp_CajaMayor_ResumenTipos @IdCajaMayorCierre=@IdCierre, @ActualizaIdUsuario=@IdUsuario;

        -- e) Huella FUENTE fresca (post) + totales del dia (solo filas recon-*)
        DECLARE @postCnt INT=0, @postSum DECIMAL(18,2)=0, @postChk INT=NULL;
        SELECT @postCnt=hf_Cnt, @postSum=hf_Sum, @postChk=hf_Chk FROM conta.fn_CajaRecon_HuellaFuente(@Fecha,@Fecha);

        DECLARE @ingCnt INT=0, @ingSum DECIMAL(18,2)=0, @egrCnt INT=0, @egrSum DECIMAL(18,2)=0;
        SELECT @ingCnt=COUNT(*), @ingSum=ISNULL(SUM(d_Total),0)
          FROM dbo.cajamayor_movimiento
         WHERE i_IdCajaMayorCierre=@IdCierre AND CONVERT(DATE,t_FechaMovimiento)=@Fecha AND v_Origen='recon-cobranzas';
        SELECT @egrCnt=COUNT(*), @egrSum=ISNULL(SUM(d_Total),0)
          FROM dbo.cajamayor_movimiento
         WHERE i_IdCajaMayorCierre=@IdCierre AND CONVERT(DATE,t_FechaMovimiento)=@Fecha AND v_Origen='recon-egreso';

        -- estado + version (regla seccion 3)
        DECLARE @newEstado NVARCHAR(15) = CASE WHEN @Fecha < @Hoy THEN 'CERRADO' ELSE 'RECONCILIADO' END;
        DECLARE @priorVer INT = (SELECT n_Version FROM conta.caja_reconciliacion_dia WHERE d_Fecha=@Fecha);
        DECLARE @priorEst2 NVARCHAR(15) = (SELECT v_Estado FROM conta.caja_reconciliacion_dia WHERE d_Fecha=@Fecha);
        -- n_Version = nro de CIERRES reales del dia. Un re-cierre IDEMPOTENTE (sin deriva, @coincide=1)
        -- NO incrementa; solo la auto-curacion por deriva (@coincide=0) sube +1.
        DECLARE @newVer INT = CASE
            WHEN @newEstado='RECONCILIADO' THEN ISNULL(@priorVer,0)
            WHEN @newEstado='CERRADO' AND ISNULL(@priorEst2,'')='CERRADO' AND @coincide=1 THEN ISNULL(@priorVer,0)
            WHEN @newEstado='CERRADO' AND ISNULL(@priorEst2,'')='CERRADO' AND @coincide=0 THEN ISNULL(@priorVer,0)+1
            ELSE 1 END;

        -- f) Upsert conta.caja_reconciliacion_dia
        IF @priorEst2 IS NULL
            INSERT INTO conta.caja_reconciliacion_dia
                (d_Fecha,v_Estado,n_Version,i_IdCajaMayorCierre,d_TotalIngresos,d_TotalEgresos,i_CntIngresos,i_CntEgresos,hf_Cnt,hf_Sum,hf_Chk,t_UltimaReconciliacion,t_UltimoCierre,t_UltimaVerificacion,i_InsertaIdUsuario,t_InsertaFecha)
            VALUES
                (@Fecha,@newEstado,@newVer,@IdCierre,@ingSum,@egrSum,@ingCnt,@egrCnt,@postCnt,@postSum,@postChk,GETDATE(),
                 CASE WHEN @newEstado='CERRADO' THEN GETDATE() ELSE NULL END, GETDATE(), @IdUsuario, GETDATE());
        ELSE
            UPDATE conta.caja_reconciliacion_dia
               SET v_Estado=@newEstado, n_Version=@newVer, i_IdCajaMayorCierre=@IdCierre,
                   d_TotalIngresos=@ingSum, d_TotalEgresos=@egrSum, i_CntIngresos=@ingCnt, i_CntEgresos=@egrCnt,
                   hf_Cnt=@postCnt, hf_Sum=@postSum, hf_Chk=@postChk,
                   t_UltimaReconciliacion=GETDATE(),
                   t_UltimoCierre = CASE WHEN @newEstado='CERRADO' THEN GETDATE() ELSE t_UltimoCierre END,
                   t_UltimaVerificacion=GETDATE(),
                   i_ActualizaIdUsuario=@IdUsuario, t_ActualizaFecha=GETDATE()
             WHERE d_Fecha=@Fecha;

        -- log de la accion
        DECLARE @accion NVARCHAR(30) = CASE
            WHEN ISNULL(@priorEst2,'')='CERRADO' AND @coincide=0 THEN 'REAPERTURA_AUTO'
            WHEN @newEstado='CERRADO' AND ISNULL(@priorEst2,'')<>'CERRADO' THEN 'CIERRE_DIA'
            ELSE 'RECONCILIAR_DIA' END;
        DECLARE @detalle2 NVARCHAR(MAX) = N'{"fecha":"'+CONVERT(VARCHAR(10),@Fecha,120)
            +N'","estado":"'+@newEstado+N'","version":'+CONVERT(VARCHAR,@newVer)
            +N',"preCnt":'+CONVERT(VARCHAR,@preCnt)+N',"postCnt":'+CONVERT(VARCHAR,@postCnt)
            +N',"ingCnt":'+CONVERT(VARCHAR,@ingCnt)+N',"egrCnt":'+CONVERT(VARCHAR,@egrCnt)
            +N',"ingSum":'+CONVERT(VARCHAR,@ingSum)+N',"egrSum":'+CONVERT(VARCHAR,@egrSum)
            +N',"fteCnt":'+CONVERT(VARCHAR,@postCnt)+N',"fteChk":'+ISNULL(CONVERT(VARCHAR,@postChk),'null')+N'}';
        INSERT INTO conta.caja_reconciliacion_log (t_Inicio,t_Fin,v_Origen,v_Modo,v_Accion,d_Fecha,v_Resultado,v_Detalle,i_IdUsuario)
        VALUES (@t0,GETDATE(),@Origen,'ESCRITURA',@accion,@Fecha,@resultado,@detalle2,@IdUsuario);

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 ROLLBACK TRAN;
        DECLARE @em NVARCHAR(4000) = ERROR_MESSAGE();
        INSERT INTO conta.caja_reconciliacion_log (t_Inicio,t_Fin,v_Origen,v_Modo,v_Accion,d_Fecha,v_Resultado,v_Detalle,i_IdUsuario)
        VALUES (@t0,GETDATE(),@Origen,'ESCRITURA','RECONCILIAR_DIA',@Fecha,'ERROR',@em,@IdUsuario);
        RAISERROR(@em,16,1);
    END CATCH
END
GO


-- =====================================================================
-- 5) sp_CajaRecon_Tick  - orquestador de UNA corrida
-- =====================================================================
IF OBJECT_ID('conta.sp_CajaRecon_Tick','P') IS NOT NULL DROP PROCEDURE conta.sp_CajaRecon_Tick;
GO
CREATE PROCEDURE conta.sp_CajaRecon_Tick
    @Modo            NVARCHAR(12),
    @BarridoProfundo BIT = 0,
    @IdUsuario       INT = 1,
    @Origen          NVARCHAR(20) = 'POLLER'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Piso DATE = '2026-07-01';
    DECLARE @Hoy  DATE = CONVERT(DATE, GETDATE());
    DECLARE @t0   DATETIME = GETDATE();
    DECLARE @rc   INT;

    IF @Modo IS NULL OR @Modo NOT IN ('OBSERVACION','ESCRITURA')
    BEGIN RAISERROR('Modo invalido (OBSERVACION|ESCRITURA).',16,1); RETURN; END

    -- 1) applock exclusivo (owner Session => independiente de transacciones)
    EXEC @rc = sp_getapplock @Resource='conta.caja_reconciliacion', @LockMode='Exclusive', @LockOwner='Session', @LockTimeout=5000;
    IF @rc < 0
    BEGIN
        INSERT INTO conta.caja_reconciliacion_log (t_Inicio,t_Fin,v_Origen,v_Modo,v_Accion,v_Resultado,v_Detalle,i_IdUsuario)
        VALUES (@t0,GETDATE(),@Origen,@Modo,'TICK','SKIPPED_LOCK',N'{"applock":'+CONVERT(VARCHAR,@rc)+N'}',@IdUsuario);
        RETURN;
    END

    BEGIN TRY
        DECLARE @tocados INT=0, @curadosC INT=0, @curadosP INT=0;
        DECLARE @d DATE, @dd DATE;

        -- 2) Dias pendientes desde el piso: pasados -> CERRADO, hoy -> RECONCILIADO
        SET @d = @Piso;
        WHILE @d <= @Hoy
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM conta.caja_reconciliacion_dia WHERE d_Fecha=@d AND v_Estado='CERRADO')
            BEGIN
                EXEC conta.sp_CajaRecon_ReconciliarDia @Fecha=@d, @Modo=@Modo, @IdUsuario=@IdUsuario, @Origen=@Origen;
                SET @tocados = @tocados + 1;
            END
            SET @d = DATEADD(DAY,1,@d);
        END

        -- 3) Barrido corto = UN rango [hoy-7, hoy] (clamp piso); cura dias con huella distinta
        DECLARE @desdeC DATE = CASE WHEN DATEADD(DAY,-7,@Hoy) < @Piso THEN @Piso ELSE DATEADD(DAY,-7,@Hoy) END;
        DECLARE @difC TABLE (d_Fecha DATE PRIMARY KEY);
        INSERT INTO @difC (d_Fecha)
        SELECT COALESCE(f.d_Fecha,p.d_Fecha)
        FROM conta.fn_CajaRecon_HuellaFuente(@desdeC,@Hoy) f
        FULL OUTER JOIN conta.fn_CajaRecon_HuellaPersistido(@desdeC,@Hoy) p ON p.d_Fecha=f.d_Fecha
        WHERE ISNULL(f.hf_Cnt,0)<>ISNULL(p.hp_Cnt,0)
           OR ISNULL(f.hf_Sum,0)<>ISNULL(p.hp_Sum,0)
           OR ISNULL(f.hf_Chk,0)<>ISNULL(p.hp_Chk,0);

        DECLARE @nDifC INT = (SELECT COUNT(*) FROM @difC);
        INSERT INTO conta.caja_reconciliacion_log (t_Inicio,t_Fin,v_Origen,v_Modo,v_Accion,v_Resultado,v_Detalle,i_IdUsuario)
        VALUES (@t0,GETDATE(),@Origen,@Modo,'BARRIDO_CORTO',
                CASE WHEN @nDifC>0 THEN 'DERIVA_DETECTADA' ELSE 'OK_SIN_CAMBIOS' END,
                N'{"desde":"'+CONVERT(VARCHAR(10),@desdeC,120)+N'","hasta":"'+CONVERT(VARCHAR(10),@Hoy,120)+N'","dias_distintos":'+CONVERT(VARCHAR,@nDifC)+N'}',
                @IdUsuario);

        WHILE EXISTS (SELECT 1 FROM @difC)
        BEGIN
            SELECT TOP 1 @dd = d_Fecha FROM @difC ORDER BY d_Fecha;
            EXEC conta.sp_CajaRecon_ReconciliarDia @Fecha=@dd, @Modo=@Modo, @IdUsuario=@IdUsuario, @Origen=@Origen;
            DELETE FROM @difC WHERE d_Fecha=@dd;
            SET @curadosC = @curadosC + 1;
        END

        -- 4) Barrido profundo (mes actual + anterior, ∩ >= piso)
        IF @BarridoProfundo = 1
        BEGIN
            DECLARE @desdeP DATE = DATEADD(DAY, 1-DAY(@Hoy), DATEADD(MONTH,-1,@Hoy)); -- primer dia del mes anterior
            IF @desdeP < @Piso SET @desdeP = @Piso;
            DECLARE @difP TABLE (d_Fecha DATE PRIMARY KEY);
            INSERT INTO @difP (d_Fecha)
            SELECT COALESCE(f.d_Fecha,p.d_Fecha)
            FROM conta.fn_CajaRecon_HuellaFuente(@desdeP,@Hoy) f
            FULL OUTER JOIN conta.fn_CajaRecon_HuellaPersistido(@desdeP,@Hoy) p ON p.d_Fecha=f.d_Fecha
            WHERE ISNULL(f.hf_Cnt,0)<>ISNULL(p.hp_Cnt,0)
               OR ISNULL(f.hf_Sum,0)<>ISNULL(p.hp_Sum,0)
               OR ISNULL(f.hf_Chk,0)<>ISNULL(p.hp_Chk,0);

            DECLARE @nDifP INT = (SELECT COUNT(*) FROM @difP);
            INSERT INTO conta.caja_reconciliacion_log (t_Inicio,t_Fin,v_Origen,v_Modo,v_Accion,v_Resultado,v_Detalle,i_IdUsuario)
            VALUES (@t0,GETDATE(),@Origen,@Modo,'BARRIDO_PROFUNDO',
                    CASE WHEN @nDifP>0 THEN 'DERIVA_DETECTADA' ELSE 'OK_SIN_CAMBIOS' END,
                    N'{"desde":"'+CONVERT(VARCHAR(10),@desdeP,120)+N'","hasta":"'+CONVERT(VARCHAR(10),@Hoy,120)+N'","dias_distintos":'+CONVERT(VARCHAR,@nDifP)+N'}',
                    @IdUsuario);

            WHILE EXISTS (SELECT 1 FROM @difP)
            BEGIN
                SELECT TOP 1 @dd = d_Fecha FROM @difP ORDER BY d_Fecha;
                EXEC conta.sp_CajaRecon_ReconciliarDia @Fecha=@dd, @Modo=@Modo, @IdUsuario=@IdUsuario, @Origen=@Origen;
                DELETE FROM @difP WHERE d_Fecha=@dd;
                SET @curadosP = @curadosP + 1;
            END
        END

        -- 5) Liberar lock + log TICK
        EXEC sp_releaseapplock @Resource='conta.caja_reconciliacion', @LockOwner='Session';
        INSERT INTO conta.caja_reconciliacion_log (t_Inicio,t_Fin,v_Origen,v_Modo,v_Accion,v_Resultado,v_Detalle,i_IdUsuario)
        VALUES (@t0,GETDATE(),@Origen,@Modo,'TICK','OK',
                N'{"tocados":'+CONVERT(VARCHAR,@tocados)+N',"curados_corto":'+CONVERT(VARCHAR,@curadosC)+N',"curados_profundo":'+CONVERT(VARCHAR,@curadosP)+N',"barrido_profundo":'+CONVERT(VARCHAR,@BarridoProfundo)+N'}',
                @IdUsuario);
    END TRY
    BEGIN CATCH
        DECLARE @em2 NVARCHAR(4000) = ERROR_MESSAGE();
        BEGIN TRY EXEC sp_releaseapplock @Resource='conta.caja_reconciliacion', @LockOwner='Session'; END TRY BEGIN CATCH END CATCH
        INSERT INTO conta.caja_reconciliacion_log (t_Inicio,t_Fin,v_Origen,v_Modo,v_Accion,v_Resultado,v_Detalle,i_IdUsuario)
        VALUES (@t0,GETDATE(),@Origen,@Modo,'TICK','ERROR',@em2,@IdUsuario);
        RAISERROR(@em2,16,1);
    END CATCH
END
GO

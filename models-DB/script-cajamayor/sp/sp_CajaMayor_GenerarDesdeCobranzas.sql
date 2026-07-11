-- =====================================================================
-- Version en PRODUCCION desde 2026-05-31 (extraida del servidor el 2026-07-11).
-- Reescrito para replicar la logica del cierre de caja diario de
-- Facturacion_New (query "cadenaSA" de frmCierreCajaDiario.cs):
-- suma ventadetalle.d_PrecioVenta, filtra por venta.t_InsertaFecha y
-- clasifica por datahierarchy grupos 41 (condicion) y 46 (forma de pago).
-- =====================================================================
ALTER PROCEDURE [dbo].[sp_CajaMayor_GenerarDesdeCobranzas]
    @IdCajaMayorCierre INT,
    @InsertaIdUsuario  INT,
    @DefaultIdTipoCaja INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @FechaInicio DATETIME, @FechaFin DATETIME;
        SELECT @FechaInicio = t_FechaInicio, @FechaFin = t_FechaFin
          FROM dbo.cajamayor_cierre
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre;

        IF @FechaInicio IS NULL OR @FechaFin IS NULL
        BEGIN
            RAISERROR('El cierre no existe o no tiene rango de fechas definido.', 16, 1);
        END

        -- ============================================================
        -- INGRESOS: Replica exacta de la query cadenaSA del .NET
        --
        -- .NET hace: venta -> ventadetalle -> cliente -> cobranzadetalle -> datahierarchy
        -- Suma: ventadetalle.d_PrecioVenta
        -- Clasifica por:
        --   datahierarchy(GroupId=41) = CONDICION (CONTADO, CREDITO, CHEQUE, DEPOSITO...)
        --   datahierarchy(GroupId=46) = TIPO (EFECTIVO SOLES, VISA, MASTERCARD...)
        --
        -- Excluye: series EC*, TFM, THM + user 2036 + tipo 3,10
        --
        -- Categorias de ingreso .NET:
        --   CONTADO EFECTIVO: CONDICION='CONTADO' AND TIPO='EFECTIVO SOLES'
        --   CREDITO:          CONDICION='CREDITO'
        --   NO EFECTIVO:      (CONDICION='CONTADO' AND TIPO<>'EFECTIVO SOLES')
        --                     OR CONDICION IN ('CHEQUE','DEPOSITO')
        -- ============================================================
        ;WITH VentasIngreso AS (
            SELECT
                V.v_IdVenta,
                V.v_SerieDocumento,
                V.v_CorrelativoDocumento,
                V.t_InsertaFecha,
                V.i_ClienteEsAgente,
                VD.d_PrecioVenta AS d_Total,
                VD.d_Valor AS d_Subtotal,
                VD.d_Igv AS d_IGV,
                VD.v_DescripcionProducto,
                DH.v_Value1 AS CONDICION,     -- datahierarchy GroupId=41 (condicion pago)
                DH2.v_Value1 AS TIPO,         -- datahierarchy GroupId=46 (forma pago)
                CD.i_IdFormaPago
            FROM [dbo].[venta] V
            INNER JOIN [dbo].[ventadetalle] VD
                ON V.v_IdVenta = VD.v_IdVenta
                AND ISNULL(VD.i_Eliminado, 0) = 0
            -- .NET NO filtra i_Eliminado en cobranzadetalle (LEFT JOIN sin filtro)
            LEFT JOIN [dbo].[cobranzadetalle] CD
                ON CD.v_IdVenta = V.v_IdVenta
            LEFT JOIN [dbo].[datahierarchy] DH
                ON DH.i_GroupId = 41
                AND DH.i_ItemId = V.i_IdCondicionPago
            LEFT JOIN [dbo].[datahierarchy] DH2
                ON DH2.i_GroupId = 46
                AND DH2.i_ItemId = CD.i_IdFormaPago
            WHERE V.i_Eliminado = 0
              -- Fecha: usar t_InsertaFecha como .NET, normalizar ignorando hora
              AND V.t_InsertaFecha >= CAST(@FechaInicio AS DATE)
              AND V.t_InsertaFecha < DATEADD(DAY, 1, CAST(@FechaFin AS DATE))
              -- Exclusiones del .NET
              AND V.i_ClienteEsAgente IS NOT NULL
              AND V.i_ClienteEsAgente NOT IN (3, 10)
              AND V.i_InsertaIdUsuario != 2036
              -- Excluir series de egreso y series especiales (como .NET)
              AND ISNULL(V.v_SerieDocumento, '') NOT IN ('ECO', 'ECA', 'ECF', 'ECT', 'ECG', 'ECR')
              AND ISNULL(V.v_SerieDocumento, '') NOT IN ('TFM', 'THM')
        )
        INSERT INTO dbo.cajamayor_movimiento (
            i_IdCajaMayorCierre,
            i_IdTipoCaja,
            v_TipoMovimiento,
            v_ConceptoMovimiento,
            d_Subtotal,
            d_IGV,
            d_Total,
            i_IdFormaPago,
            t_FechaMovimiento,
            v_Observaciones,
            v_Origen,
            v_CodigoDocumento,
            v_SerieDocumento,
            v_NumeroDocumento,
            v_IdVenta,
            i_InsertaIdUsuario,
            t_InsertaFecha
        )
        SELECT
            @IdCajaMayorCierre,
            COALESCE(tcct.i_IdTipoCaja, @DefaultIdTipoCaja),
            'I',  -- Ingreso
            LEFT(ISNULL(vi.v_DescripcionProducto, 'Ingreso venta'), 350),
            ISNULL(vi.d_Subtotal, 0),
            ISNULL(vi.d_IGV, 0),
            ISNULL(vi.d_Total, 0),
            vi.i_IdFormaPago,
            vi.t_InsertaFecha,
            -- Observacion indica la clasificacion .NET
            CASE
                WHEN vi.CONDICION = 'CONTADO' AND vi.TIPO = 'EFECTIVO SOLES'
                    THEN 'Contado Efectivo'
                WHEN vi.CONDICION = 'CREDITO'
                    THEN 'Credito'
                WHEN (vi.CONDICION = 'CONTADO' AND ISNULL(vi.TIPO,'') <> 'EFECTIVO SOLES')
                  OR vi.CONDICION IN ('CHEQUE', 'DEPOSITO')
                    THEN 'No Efectivo - ' + ISNULL(vi.TIPO, vi.CONDICION)
                ELSE 'Otro - ' + ISNULL(vi.CONDICION, 'Sin condicion')
            END,
            'cobranzas',  -- mantener mismo origen para compatibilidad
            ISNULL(vi.v_SerieDocumento, ''),
            ISNULL(vi.v_SerieDocumento, ''),
            ISNULL(vi.v_SerieDocumento, '') + '-' + ISNULL(vi.v_CorrelativoDocumento, ''),
            ISNULL(vi.v_IdVenta, ''),
            @InsertaIdUsuario,
            GETDATE()
        FROM VentasIngreso vi
        LEFT JOIN dbo.tipocaja_clientetipo tcct
            ON tcct.i_ClienteEsAgente = vi.i_ClienteEsAgente
            AND tcct.b_Activo = 1
        -- Solo incluir registros que el .NET incluiria como ingreso:
        -- CONTADO EFECTIVO, CREDITO, o NO EFECTIVO
        WHERE (
            -- Contado Efectivo
            (vi.CONDICION = 'CONTADO' AND vi.TIPO = 'EFECTIVO SOLES')
            -- Credito
            OR (vi.CONDICION = 'CREDITO')
            -- No Efectivo (contado con otra forma de pago, o cheque/deposito)
            OR (vi.CONDICION = 'CONTADO' AND ISNULL(vi.TIPO, '') <> 'EFECTIVO SOLES')
            OR (vi.CONDICION IN ('CHEQUE', 'DEPOSITO'))
        );

        -- Recalcular resumen por tipo (consumir resultset para no interferir)
        DECLARE @ResumenTipos TABLE (
            IdCajaMayorCierre INT,
            IdTipoCaja INT,
            SaldoInicial DECIMAL(18,4),
            TotalIngresos DECIMAL(18,4),
            TotalEgresos DECIMAL(18,4),
            SaldoFinal DECIMAL(18,4)
        );
        INSERT INTO @ResumenTipos
        EXEC dbo.sp_CajaMayor_ResumenTipos
            @IdCajaMayorCierre = @IdCajaMayorCierre,
            @ActualizaIdUsuario = @InsertaIdUsuario;

        -- Resultado para verificacion
        SELECT TOP (50) *
          FROM dbo.cajamayor_movimiento
         WHERE i_IdCajaMayorCierre = @IdCajaMayorCierre
           AND v_Origen = 'cobranzas'
         ORDER BY i_IdMovimiento DESC;

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
    END CATCH
END

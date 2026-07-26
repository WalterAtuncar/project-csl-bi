-- =====================================================================
-- sp/20 - Remediacion automatica de consistencia del overlay de egresos EC.
-- Origen: auditoria db-experto 2026-07-25 (brecha MEDIA 4: la anulacion de una
-- venta EC posterior a la tipificacion dejaba residuo en conta: overlay ACTIVO
-- huerfano y, en HONORARIO, pago_honorario PAGADO con servicios bloqueados).
-- SQL Server 2012. Idempotente IF OBJECT_ID DROP / GO / CREATE.
--
--   sp_EgresoCaja_ConsistenciaRemediar (escritura; detecta + des-tipifica)
--
-- DISENO:
-- - La DETECCION replica INLINE la logica de sp_EgresoCaja_Consistencia
--   (overlay ACTIVO cuya venta esta i_Eliminado=1 en dbo). NO se hace
--   INSERT..EXEC del detector: la regla es una sola linea y el detector de
--   lectura sigue existiendo por separado para diagnostico.
-- - La REMEDIACION reutiliza conta.sp_EgresoCaja_Destipificar (rollback
--   quirurgico ya probado: overlay->ANULADO; si HONORARIO: pago->ANULADO +
--   servicios liberados b_Anulado=1 + auditoria). Se captura su resultset con
--   INSERT..EXEC: PERMITIDO en SQL2012 porque Destipificar NO usa INSERT..EXEC
--   internamente (la restriccion es que no se puede ANIDAR INSERT..EXEC).
--   Para una fila ACTIVO su RS es siempre (Anulado, i_IdClasificacion, i_IdPago).
-- - TRY/CATCH POR FILA: una falla no aborta el resto (cada Destipificar es
--   atomico por si mismo con su propia transaccion).
-- - Idempotente: 0 filas detectadas -> RS vacio, no-op limpio.
-- - CERO escritura sobre dbo (solo SELECT a dbo.venta).
-- =====================================================================
IF OBJECT_ID('conta.sp_EgresoCaja_ConsistenciaRemediar','P') IS NOT NULL DROP PROCEDURE conta.sp_EgresoCaja_ConsistenciaRemediar;
GO
CREATE PROCEDURE conta.sp_EgresoCaja_ConsistenciaRemediar
    @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1) Deteccion (inline, misma regla que sp_EgresoCaja_Consistencia).
    DECLARE @pend TABLE (seq INT IDENTITY(1,1) PRIMARY KEY, v_IdVenta NCHAR(16), v_TipoEgreso NVARCHAR(20));
    INSERT INTO @pend (v_IdVenta, v_TipoEgreso)
    SELECT ov.v_IdVenta, ov.v_TipoEgreso
    FROM conta.egreso_caja_clasificacion ov
    JOIN dbo.venta v ON LTRIM(RTRIM(v.v_IdVenta)) = ov.v_IdVenta COLLATE DATABASE_DEFAULT
    WHERE ov.v_Estado = 'ACTIVO' AND ISNULL(v.i_Eliminado, 0) = 1;

    -- 2) Remediacion fila a fila.
    DECLARE @res TABLE (v_IdVenta NCHAR(16), TipoEgreso NVARCHAR(20), resultado NVARCHAR(400));
    DECLARE @cap TABLE (Anulado INT, i_IdClasificacion INT, i_IdPago INT);
    DECLARE @i INT = 1, @n INT = (SELECT COUNT(*) FROM @pend);
    DECLARE @vid NCHAR(16), @tipo NVARCHAR(20);

    WHILE @i <= @n
    BEGIN
        SELECT @vid = v_IdVenta, @tipo = v_TipoEgreso FROM @pend WHERE seq = @i;
        BEGIN TRY
            -- Re-chequeo ACTIVO justo antes de remediar: si otro proceso ya lo anulo, el
            -- early-return de Destipificar devuelve un RS de 1 columna (rompe el INSERT..EXEC
            -- de 3 columnas) -> se registra la carrera benigna sin llamar.
            IF NOT EXISTS (SELECT 1 FROM conta.egreso_caja_clasificacion
                           WHERE v_IdVenta = @vid AND v_Estado = 'ACTIVO')
                INSERT INTO @res VALUES (@vid, @tipo, 'YA_NO_ACTIVO');
            ELSE
            BEGIN
                DELETE FROM @cap;
                INSERT INTO @cap (Anulado, i_IdClasificacion, i_IdPago)
                EXEC conta.sp_EgresoCaja_Destipificar @vid, @IdUsuario, 'CONSISTENCIA: venta anulada';

                IF EXISTS (SELECT 1 FROM @cap WHERE Anulado = 1)
                    INSERT INTO @res VALUES (@vid, @tipo, 'DESTIPIFICADO');
                ELSE
                    INSERT INTO @res VALUES (@vid, @tipo, 'YA_NO_ACTIVO');
            END
        END TRY
        BEGIN CATCH
            INSERT INTO @res VALUES (@vid, @tipo, 'ERROR: ' + LEFT(ERROR_MESSAGE(), 380));
        END CATCH
        SET @i = @i + 1;
    END

    -- 3) RS de salida: filas remediadas (vacio = no habia nada que remediar).
    SELECT v_IdVenta, TipoEgreso, resultado FROM @res ORDER BY v_IdVenta;
END
GO

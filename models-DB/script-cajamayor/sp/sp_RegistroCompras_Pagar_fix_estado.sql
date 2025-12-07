-- Ajuste: permitir cambio de estado Pagado <-> Por Pagar
-- Reglas:
-- - @Estado = '1' -> marcar Pagado y setear fecha_pago (@FechaPago si viene, sino GETDATE())
-- - @Estado = '0' -> marcar Por Pagar y limpiar fecha_pago (NULL)

CREATE OR ALTER PROCEDURE [dbo].[sp_RegistroCompras_Pagar]
    @IdRegistroCompra INT,
    @FechaPago DATETIME = NULL,
    @Estado NVARCHAR(1) = NULL,
    @Serie NVARCHAR(20) = NULL,
    @Numero NVARCHAR(20) = NULL,
    @ActualizaIdUsuario INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Now DATETIME = GETDATE();
    DECLARE @NewEstado NVARCHAR(1);
    DECLARE @NewFechaPago DATETIME = NULL;

    IF (@Estado IS NULL)
    BEGIN
        -- Comportamiento previo: sólo pagado con fecha
        SET @NewEstado = '1';
        SET @NewFechaPago = ISNULL(@FechaPago, @Now);
    END
    ELSE IF (@Estado = '1')
    BEGIN
        SET @NewEstado = '1';
        SET @NewFechaPago = ISNULL(@FechaPago, @Now);
    END
    ELSE
    BEGIN
        SET @NewEstado = '0';
        SET @NewFechaPago = NULL;
    END

    UPDATE rc
       SET rc.estado = @NewEstado,
           rc.fecha_pago = @NewFechaPago,
           rc.serie = COALESCE(@Serie, rc.serie),
           rc.numero = COALESCE(@Numero, rc.numero),
           rc.actualiza_id_usuario = @ActualizaIdUsuario,
           rc.actualiza_fecha = @Now
     FROM dbo.registro_compras rc
     WHERE rc.id_registro_compra = @IdRegistroCompra;

    -- También actualizar el movimiento vinculado si hay serie/número
    IF (@Serie IS NOT NULL OR @Numero IS NOT NULL)
    BEGIN
        DECLARE @MovId INT;
        SELECT @MovId = rc.id_movimiento_egreso FROM dbo.registro_compras rc WHERE rc.id_registro_compra = @IdRegistroCompra;
        IF (@MovId IS NOT NULL)
        BEGIN
            UPDATE m SET
                m.v_SerieDocumento = COALESCE(@Serie, m.v_SerieDocumento),
                m.v_NumeroDocumento = COALESCE(@Numero, m.v_NumeroDocumento),
                m.i_ActualizaIdUsuario = @ActualizaIdUsuario,
                m.t_ActualizaFecha = @Now
            FROM dbo.cajamayor_movimiento m
            WHERE m.i_IdMovimiento = @MovId;
        END
    END

    SELECT id_registro_compra AS IdRegistroCompra,
           estado AS Estado,
           fecha_pago AS FechaPago,
           serie AS Serie,
           numero AS Numero,
           actualiza_id_usuario AS ActualizaIdUsuario,
           actualiza_fecha AS ActualizaFecha
      FROM dbo.registro_compras
     WHERE id_registro_compra = @IdRegistroCompra;
END

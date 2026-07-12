-- =====================================================================
-- FASE 5 - Modulo SISOL: liquidacion y pago (genera egreso Hospital). SQL 2012.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Calcular liquidacion del mes (venta neta SISOL x % vigente).
-- Especialistas se alimentan por TVP (% de cada medico sobre part. clinica).
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Sisol_Calcular','P') IS NOT NULL DROP PROCEDURE conta.sp_Sisol_Calcular;
GO
CREATE PROCEDURE conta.sp_Sisol_Calcular
    @Anio SMALLINT, @Mes TINYINT, @Especialistas conta.tvp_sisol_especialista READONLY, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF EXISTS (SELECT 1 FROM conta.sisol_liquidacion WHERE n_Anio=@Anio AND n_Mes=@Mes AND v_Estado='PAGADO')
    BEGIN RAISERROR('La liquidacion del periodo ya esta PAGADA; no se puede recalcular.', 16, 1); RETURN; END

    DECLARE @ini DATE = DATEFROMPARTS(@Anio,@Mes,1);
    DECLARE @neta DECIMAL(18,2) = ISNULL((SELECT NetoSinIGV FROM conta.fn_Rentabilidad_Ingresos(@Anio,@Mes) WHERE Unidad='SISOL'),0);
    DECLARE @porc DECIMAL(5,2) = ISNULL((
        SELECT TOP 1 d_PorcClinica FROM conta.sisol_participacion
        WHERE t_VigenciaDesde <= @ini AND (t_VigenciaHasta IS NULL OR t_VigenciaHasta >= @ini)
        ORDER BY t_VigenciaDesde DESC), 70);
    DECLARE @clinica DECIMAL(18,2) = CAST(@neta * @porc/100 AS DECIMAL(18,2));
    DECLARE @hospital DECIMAL(18,2) = @neta - @clinica;   -- suman exacto la venta neta

    DECLARE @id INT;
    BEGIN TRAN;
        IF EXISTS (SELECT 1 FROM conta.sisol_liquidacion WHERE n_Anio=@Anio AND n_Mes=@Mes)
        BEGIN
            UPDATE conta.sisol_liquidacion
            SET d_VentaNeta=@neta, d_PorcClinica=@porc, d_ParticipacionClinica=@clinica, d_ParticipacionHospital=@hospital,
                i_ActualizaIdUsuario=@IdUsuario, t_ActualizaFecha=GETDATE()
            WHERE n_Anio=@Anio AND n_Mes=@Mes;
            SELECT @id = i_IdLiquidacion FROM conta.sisol_liquidacion WHERE n_Anio=@Anio AND n_Mes=@Mes;
        END
        ELSE
        BEGIN
            INSERT INTO conta.sisol_liquidacion (n_Anio, n_Mes, d_VentaNeta, d_PorcClinica, d_ParticipacionClinica, d_ParticipacionHospital, i_InsertaIdUsuario)
            VALUES (@Anio, @Mes, @neta, @porc, @clinica, @hospital, @IdUsuario);
            SET @id = SCOPE_IDENTITY();
        END

        DELETE FROM conta.sisol_liquidacion_especialista WHERE i_IdLiquidacion=@id;
        INSERT INTO conta.sisol_liquidacion_especialista (i_IdLiquidacion, v_IdMedico, v_NombreMedico, d_BaseCalculo, d_Porcentaje, d_Monto)
        SELECT @id, e.v_IdMedico, e.v_NombreMedico, @clinica, e.d_Porcentaje,
               CAST(@clinica * e.d_Porcentaje/100 AS DECIMAL(18,2))
        FROM @Especialistas e;
    COMMIT TRAN;

    EXEC conta.sp_Auditoria_Insert 'conta.sisol_liquidacion', @id, 'CALCULAR', 'Liquidacion SISOL', @IdUsuario;
    SELECT @id AS i_IdLiquidacion;
END
GO

-- ---------------------------------------------------------------------
-- Pagar liquidacion: genera el egreso Hospital PAGADO (fluye a caja).
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Sisol_Pagar','P') IS NOT NULL DROP PROCEDURE conta.sp_Sisol_Pagar;
GO
CREATE PROCEDURE conta.sp_Sisol_Pagar @IdLiquidacion INT, @FechaPago DATE, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @anio SMALLINT, @mes TINYINT, @hospital DECIMAL(18,2), @estado NVARCHAR(15), @egr INT;
    SELECT @anio=n_Anio, @mes=n_Mes, @hospital=d_ParticipacionHospital, @estado=v_Estado, @egr=i_IdEgresoHospital
    FROM conta.sisol_liquidacion WHERE i_IdLiquidacion=@IdLiquidacion;

    IF @anio IS NULL BEGIN RAISERROR('Liquidacion no encontrada.', 16, 1); RETURN; END
    IF @estado='PAGADO' OR @egr IS NOT NULL
    BEGIN RAISERROR('La liquidacion ya fue pagada (egreso Hospital ya existe).', 16, 1); RETURN; END

    DECLARE @idHosp INT = (SELECT i_IdEntidad FROM conta.entidad WHERE v_Nombre='HOSPITAL DE LA SOLIDARIDAD');
    DECLARE @idTipo INT = (SELECT i_IdTipoGasto FROM conta.tipo_gasto WHERE v_Codigo='SISOL-HOSP');
    DECLARE @idCentro INT = (SELECT i_IdCentroCosto FROM conta.centro_costo WHERE v_Codigo='CC-SISOL');
    DECLARE @fdoc DATE = EOMONTH(DATEFROMPARTS(@anio,@mes,1));
    DECLARE @glosa NVARCHAR(300) = CONCAT('Participacion Hospital SISOL ', @anio, '-', RIGHT('0'+CAST(@mes AS varchar),2));

    DECLARE @out TABLE (i_IdEgreso INT);
    INSERT INTO @out
    EXEC conta.sp_Egreso_Insert @IdEntidad=@idHosp, @FechaDocumento=@fdoc, @TipoDocumento='LIQUIDACION',
         @IdCentroCosto=@idCentro, @IdTipoGasto=@idTipo, @MontoBruto=@hospital, @IGV=0, @Glosa=@glosa, @IdUsuario=@IdUsuario;
    DECLARE @idEgreso INT = (SELECT TOP 1 i_IdEgreso FROM @out);

    EXEC conta.sp_Egreso_Pagar @IdEgreso=@idEgreso, @FechaPago=@FechaPago, @IdFormaPago=NULL, @IdCuentaBancaria=NULL, @IdUsuario=@IdUsuario;

    UPDATE conta.sisol_liquidacion
    SET v_Estado='PAGADO', i_IdEgresoHospital=@idEgreso, t_FechaPago=@FechaPago,
        i_ActualizaIdUsuario=@IdUsuario, t_ActualizaFecha=GETDATE()
    WHERE i_IdLiquidacion=@IdLiquidacion;
    UPDATE conta.sisol_liquidacion_especialista SET v_Estado='PAGADO' WHERE i_IdLiquidacion=@IdLiquidacion;

    EXEC conta.sp_Auditoria_Insert 'conta.sisol_liquidacion', @IdLiquidacion, 'PAGAR', @glosa, @IdUsuario;
    SELECT @idEgreso AS i_IdEgresoHospital;
END
GO

-- ---------------------------------------------------------------------
-- Listar / obtener liquidaciones
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.sp_Sisol_List','P') IS NOT NULL DROP PROCEDURE conta.sp_Sisol_List;
GO
CREATE PROCEDURE conta.sp_Sisol_List @Anio SMALLINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i_IdLiquidacion, n_Anio, n_Mes, d_VentaNeta, d_PorcClinica, d_ParticipacionClinica,
           d_ParticipacionHospital, v_Estado, t_FechaPago, i_IdEgresoHospital
    FROM conta.sisol_liquidacion WHERE n_Anio=@Anio ORDER BY n_Mes;
END
GO

IF OBJECT_ID('conta.sp_Sisol_Get','P') IS NOT NULL DROP PROCEDURE conta.sp_Sisol_Get;
GO
CREATE PROCEDURE conta.sp_Sisol_Get @Anio SMALLINT, @Mes TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i_IdLiquidacion, n_Anio, n_Mes, d_VentaNeta, d_PorcClinica, d_ParticipacionClinica,
           d_ParticipacionHospital, v_Estado, t_FechaPago, i_IdEgresoHospital
    FROM conta.sisol_liquidacion WHERE n_Anio=@Anio AND n_Mes=@Mes;

    SELECT esp.i_Id, esp.v_IdMedico, esp.v_NombreMedico, esp.d_BaseCalculo, esp.d_Porcentaje, esp.d_Monto, esp.v_Estado
    FROM conta.sisol_liquidacion_especialista esp
    JOIN conta.sisol_liquidacion l ON l.i_IdLiquidacion=esp.i_IdLiquidacion
    WHERE l.n_Anio=@Anio AND l.n_Mes=@Mes ORDER BY esp.d_Monto DESC;
END
GO

-- =====================================================================
-- sp/23 - conta.sp_Emr_RefreshResultado @Desde,@Hasta - refresco incremental
-- del snapshot conta.emr_resultado (ddl/26). Fecha: 2026-07-28.
--
-- Lee la cadena EMR service -> servicecomponent -> servicecomponentfields ->
-- servicecomponentfieldvalues -> componentfield, ACOTADA por d_InsertDate (usa el
-- clustered index date-first -> eficiente), filtrada a la whitelist conta.emr_campo
-- (b_Activo=1), con TRY_CONVERT(DECIMAL, v_Value1) como ValorNum (descarta no-numerico).
-- Resuelve fecha por service.d_ServiceDate, consultorio (g403) y medico del examen
-- (servicecomponent.i_MedicoTratanteId, deterministico 1:1 por el value).
--
-- IDEMPOTENTE por VENTANA de d_ServiceDate: DELETE de [@Desde,@Hasta] por
-- d_ServiceDate + reinsert. El acceso a la fuente usa un buffer de +10 dias en
-- d_InsertDate (valores insertados poco despues de la atencion) pero SOLO inserta
-- servicios con d_ServiceDate en [@Desde,@Hasta] -> DELETE e INSERT alineados.
--
-- Cross-DB SOLO SELECT a SigesoftDesarrollo_2; jamas v_Password. Escribe conta
-- (conexion normal, NO el reader). ASCII, SQL 2012.
-- =====================================================================

IF OBJECT_ID('conta.sp_Emr_RefreshResultado','P') IS NOT NULL DROP PROCEDURE conta.sp_Emr_RefreshResultado;
GO
CREATE PROCEDURE conta.sp_Emr_RefreshResultado
    @Desde DATE,
    @Hasta DATE
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Desde IS NULL OR @Hasta IS NULL OR @Desde > @Hasta
    BEGIN RAISERROR('Rango invalido (@Desde/@Hasta).', 16, 1); RETURN; END

    DECLARE @finEx  DATE      = DATEADD(DAY, 1, @Hasta);               -- exclusivo por d_ServiceDate
    DECLARE @fvHasta DATETIME2 = DATEADD(DAY, 11, CAST(@Hasta AS DATETIME2)); -- buffer d_InsertDate (+10d)
    DECLARE @fvDesde DATETIME2 = CAST(@Desde AS DATETIME2);

    BEGIN TRY
        BEGIN TRAN;

        -- Idempotencia: limpia el rango por d_ServiceDate (mismo criterio que el INSERT).
        DELETE FROM conta.emr_resultado
        WHERE d_ServiceDate >= @Desde AND d_ServiceDate < @finEx;

        INSERT INTO conta.emr_resultado
            (v_ServiceId, Anio, Mes, IdConsultorio, Consultorio, IdMedico, Medico,
             v_ComponentFieldId, Campo, ValorNum, d_ServiceDate)
        SELECT
            s.v_ServiceId COLLATE DATABASE_DEFAULT,
            YEAR(s.d_ServiceDate),
            MONTH(s.d_ServiceDate),
            pr.i_Consultorio,
            ISNULL(sp403.v_Value1 COLLATE DATABASE_DEFAULT, 'SIN CONSULTORIO'),
            syu.i_SystemUserId,
            (pru.v_FirstLastName + ' ' + pru.v_SecondLastName + ', ' + pru.v_FirstName),
            ec.v_ComponentFieldId,
            ec.v_Campo,
            TRY_CONVERT(DECIMAL(18,6), LTRIM(RTRIM(fv.v_Value1))),
            CAST(s.d_ServiceDate AS DATE)
        FROM SigesoftDesarrollo_2.dbo.servicecomponentfieldvalues fv
        JOIN SigesoftDesarrollo_2.dbo.servicecomponentfields scf
            ON scf.v_ServiceComponentFieldsId = fv.v_ServiceComponentFieldsId
           AND scf.d_InsertDate >= @fvDesde AND scf.d_InsertDate < @fvHasta
        JOIN conta.emr_campo ec
            ON ec.v_ComponentFieldId = scf.v_ComponentFieldId COLLATE DATABASE_DEFAULT
           AND ec.b_Activo = 1
        JOIN SigesoftDesarrollo_2.dbo.servicecomponent sc
            ON sc.v_ServiceComponentId = scf.v_ServiceComponentId
           AND sc.d_InsertDate >= @fvDesde AND sc.d_InsertDate < @fvHasta
        JOIN SigesoftDesarrollo_2.dbo.service s
            ON s.v_ServiceId = sc.v_ServiceId
           AND s.d_ServiceDate >= @Desde AND s.d_ServiceDate < @finEx
           AND ISNULL(s.i_IsDeleted, 0) = 0
        JOIN SigesoftDesarrollo_2.dbo.protocol pr
            ON pr.v_ProtocolId = s.v_ProtocolId
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemparameter sp403
            ON sp403.i_GroupId = 403 AND sp403.i_ParameterId = pr.i_Consultorio
        LEFT JOIN SigesoftDesarrollo_2.dbo.systemuser syu
            ON syu.i_SystemUserId = sc.i_MedicoTratanteId
        LEFT JOIN SigesoftDesarrollo_2.dbo.person pru
            ON pru.v_PersonId = syu.v_PersonId
        WHERE fv.d_InsertDate >= @fvDesde AND fv.d_InsertDate < @fvHasta
          AND ISNULL(fv.i_IsDeleted, 0) = 0
          AND TRY_CONVERT(DECIMAL(18,6), LTRIM(RTRIM(fv.v_Value1))) IS NOT NULL;

        DECLARE @n INT = @@ROWCOUNT;
        COMMIT TRAN;

        SELECT @n AS filas_insertadas;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;
        DECLARE @em NVARCHAR(2048) = ERROR_MESSAGE(), @es INT = ERROR_SEVERITY(), @est INT = ERROR_STATE();
        RAISERROR(@em, @es, @est);
    END CATCH
END
GO

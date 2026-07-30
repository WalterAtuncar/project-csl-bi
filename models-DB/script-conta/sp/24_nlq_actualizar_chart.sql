-- =====================================================================
-- sp/24 - NLQ: actualizar SOLO el tipo de grafico de una consulta guardada.
-- Plan: models-DB/docs/PLAN_NLQ_CONTA.md. Fecha: 2026-07-28.
--
-- ADITIVO schema conta, CERO dbo, REVERSIBLE. SQL Server 2012. Idempotente:
-- IF OBJECT_ID(...,'P') IS NOT NULL DROP PROCEDURE / GO / CREATE PROCEDURE.
-- UTF-8 SIN BOM (ASCII). Opera sobre conta.nlq_consulta_guardada (ddl/19).
--
-- MISMO guard de propiedad que sp_Nlq_BorrarGuardada (sp/21 #6): solo el dueno
-- (i_IdUsuario = @IdUsuario) o un SA (@EsSA = 1), y solo si la fila esta activa
-- (b_Activa = 1). Toca UNICAMENTE v_ChartTipo (NO v_ChartConfig). Devuelve UNA
-- fila con UN entero (@@ROWCOUNT): la API lo lee con QueryFirstOrDefault<int>
-- (0 = no existe / no autorizado). SET NOCOUNT ON como el resto de la familia.
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_ActualizarChart','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_ActualizarChart;
GO
CREATE PROCEDURE conta.sp_Nlq_ActualizarChart
    @Id        INT,
    @IdUsuario INT,
    @EsSA      BIT = 0,
    @ChartTipo NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.nlq_consulta_guardada
    SET v_ChartTipo = @ChartTipo
    WHERE i_IdGuardada = @Id
      AND b_Activa = 1
      AND (@EsSA = 1 OR i_IdUsuario = @IdUsuario);
    SELECT @@ROWCOUNT AS Afectadas;
END
GO

/*
  SP: sp_CajaMayor_Cierre_Exists
  Descripción: Valida si existe un cierre de Caja Mayor para el período Año/Mes.
  Política: BEGIN TRAN + ROLLBACK por defecto (cambio a COMMIT manual).
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRAN;

-- Usar CREATE OR ALTER para evitar DROP + GO y mantener la transacción limpia
CREATE OR ALTER PROCEDURE dbo.sp_CajaMayor_Cierre_Exists
    @Anio INT,
    @Mes  INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @AnioN NCHAR(4) = CONVERT(NCHAR(4), @Anio);

    SELECT TOP 1
        [Exists] = CAST(1 AS BIT),
        IdCajaMayorCierre = cmc.i_IdCajaMayorCierre,
        Anio = @Anio,
        Mes  = @Mes
    FROM dbo.cajamayor_cierre cmc
    WHERE cmc.n_Anio = @AnioN
      AND (
            -- Compatibilidad con formatos de mes: '09', '9 ', ' 9'
            cmc.n_Mes = RIGHT('0' + CONVERT(NCHAR(2), @Mes), 2)
            OR TRY_CONVERT(INT, cmc.n_Mes) = @Mes
      );

    IF @@ROWCOUNT = 0
    BEGIN
        SELECT CAST(0 AS BIT) AS [Exists], NULL AS IdCajaMayorCierre, @Anio AS Anio, @Mes AS Mes;
    END
END
PRINT N'sp_CajaMayor_Cierre_Exists creado.';

/* Por política, mantener ROLLBACK por defecto. Cambiar a COMMIT manualmente si está conforme. */
--ROLLBACK TRAN;
COMMIT TRAN;
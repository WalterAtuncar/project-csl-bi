/*
Recrear TYPE ServicesPaidDetailsType para permitir NULL en r_Price, r_Porcentaje, r_Pagado.
Nota: SQL Server no permite ALTER TYPE para columnas; se debe DROP y CREATE.
Ejecutar manualmente con BEGIN TRAN / ROLLBACK por defecto.
*/

BEGIN TRAN
IF TYPE_ID(N'dbo.ServicesPaidDetailsType') IS NOT NULL
    DROP TYPE [dbo].[ServicesPaidDetailsType];

CREATE TYPE [dbo].[ServicesPaidDetailsType] AS TABLE
(
    [v_ServiceComponentId] NVARCHAR(50) NULL,
    [r_Price] FLOAT NULL,
    [r_Porcentaje] FLOAT NULL,
    [r_Pagado] FLOAT NULL
);

/* Validación opcional */
-- DECLARE @t dbo.ServicesPaidDetailsType;
-- INSERT INTO @t(v_ServiceComponentId, r_Price, r_Porcentaje, r_Pagado) VALUES ('SVC-1', NULL, NULL, NULL);
-- SELECT * FROM @t;

ROLLBACK TRAN


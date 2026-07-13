-- =====================================================================
-- MIGRACION 09 - Deprecar conta.cuenta_bancaria; leer las cuentas del
-- catalogo real de tesoreria del legacy dbo.documento (solo bancos,
-- i_Naturaleza=3). Mismo patron que conta.sp_Caja_FormasPago sobre
-- dbo.datahierarchy (grupo 46). SQL Server 2012.
--
-- Plan: models-DB/docs/PLAN_CUENTAS_BANCARIAS_LEGACY.md
--
-- La tabla conta.cuenta_bancaria (3 filas sembradas INTERBANK/BCP/BBVA
-- "POR-DEFINIR") tenia 0 referencias reales (0 egresos, 0 saldos). Se
-- retira su CRUD y se convierte el catalogo en un espejo de solo lectura
-- del legacy. dbo.documento y el schema conta viven en la MISMA BD
-- (20505310072): el SELECT a dbo es lectura permitida; NO se altera dbo.
--
-- Esta migracion es de una sola vez (forward). Fuente canonica de los SPs
-- repunteados: sp/02_catalogos.sql (sp_CuentaBancaria_List) y
-- sp/04_caja_motor.sql (sp_SaldoBanco_List). Se replican aqui completos
-- solo para aplicar la migracion sin re-desplegar esos archivos enteros
-- (evita bumpear modify_date de SPs no relacionados).
-- =====================================================================

-- 1) Retirar las 2 FKs que apuntaban a conta.cuenta_bancaria (idempotente).
--    ALTER/DROP sobre tablas del schema conta (nuestro) - permitido.
IF EXISTS (SELECT 1 FROM sys.foreign_keys
           WHERE name = 'FK__egreso__i_IdCuen__286DEFE4'
             AND parent_object_id = OBJECT_ID('conta.egreso'))
    ALTER TABLE conta.egreso DROP CONSTRAINT FK__egreso__i_IdCuen__286DEFE4;
GO

IF EXISTS (SELECT 1 FROM sys.foreign_keys
           WHERE name = 'FK__saldo_ban__i_IdC__4AC307E8'
             AND parent_object_id = OBJECT_ID('conta.saldo_banco_mensual'))
    ALTER TABLE conta.saldo_banco_mensual DROP CONSTRAINT FK__saldo_ban__i_IdC__4AC307E8;
GO

-- 2) Repuntar sp_CuentaBancaria_List al catalogo legacy dbo.documento.
--    Misma forma de salida (contrato CuentaBancariaRow). @SoloActivos se
--    conserva por compatibilidad de firma (todas las filas son vigentes).
IF OBJECT_ID('conta.sp_CuentaBancaria_List','P') IS NOT NULL DROP PROCEDURE conta.sp_CuentaBancaria_List;
GO
CREATE PROCEDURE conta.sp_CuentaBancaria_List @SoloActivos BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
      d.i_CodigoDocumento                                      AS i_IdCuentaBancaria,
      LTRIM(RTRIM(d.v_Nombre))                                 AS v_Banco,
      LTRIM(RTRIM(ISNULL(d.v_Siglas,'')))                      AS v_NroCuenta,   -- codigo corto de tesoreria (BCS/BC$/BLN...)
      CASE WHEN d.v_Siglas LIKE '%$%' THEN 'USD' ELSE 'PEN' END AS v_Moneda,     -- MN->PEN, ME/$->USD
      CAST(1 AS BIT)                                           AS b_Activo
    FROM dbo.documento d
    WHERE d.i_UsadoTesoreria = 1
      AND ISNULL(d.i_Eliminado,0) = 0
      AND d.i_Naturaleza = 3
    ORDER BY d.v_Nombre;
END
GO

-- 3) Repuntar sp_SaldoBanco_List al mismo catalogo legacy (antes leia
--    FROM conta.cuenta_bancaria). Contrato de columnas identico; ahora
--    i_IdCuentaBancaria = dbo.documento.i_CodigoDocumento. saldo_banco_mensual
--    conserva su columna i_IdCuentaBancaria (ya sin FK).
IF OBJECT_ID('conta.sp_SaldoBanco_List','P') IS NOT NULL DROP PROCEDURE conta.sp_SaldoBanco_List;
GO
CREATE PROCEDURE conta.sp_SaldoBanco_List @Anio SMALLINT, @Mes TINYINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT sb.i_Id, sb.n_Anio, sb.n_Mes,
           d.i_CodigoDocumento                                      AS i_IdCuentaBancaria,
           LTRIM(RTRIM(d.v_Nombre))                                 AS v_Banco,
           LTRIM(RTRIM(ISNULL(d.v_Siglas,'')))                      AS v_NroCuenta,
           CASE WHEN d.v_Siglas LIKE '%$%' THEN 'USD' ELSE 'PEN' END AS v_Moneda,
           sb.d_SaldoSoles, sb.d_SaldoDolares
    FROM dbo.documento d
    LEFT JOIN conta.saldo_banco_mensual sb
      ON sb.i_IdCuentaBancaria = d.i_CodigoDocumento AND sb.n_Anio = @Anio AND sb.n_Mes = @Mes
    WHERE d.i_UsadoTesoreria = 1
      AND ISNULL(d.i_Eliminado,0) = 0
      AND d.i_Naturaleza = 3
    ORDER BY d.v_Nombre;
END
GO

-- 4) Retirar el CRUD ya sin uso (el catalogo es de solo lectura).
IF OBJECT_ID('conta.sp_CuentaBancaria_Insert','P') IS NOT NULL DROP PROCEDURE conta.sp_CuentaBancaria_Insert;
GO
IF OBJECT_ID('conta.sp_CuentaBancaria_Update','P') IS NOT NULL DROP PROCEDURE conta.sp_CuentaBancaria_Update;
GO

-- 5) Soltar la tabla deprecada (0 filas, sin FKs tras el paso 1, sin SPs
--    que la referencien tras los pasos 2-4).
IF OBJECT_ID('conta.cuenta_bancaria','U') IS NOT NULL DROP TABLE conta.cuenta_bancaria;
GO

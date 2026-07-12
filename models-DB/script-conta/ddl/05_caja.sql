-- =====================================================================
-- FASE 3 - Motor de caja: saldos encadenados y saldos bancarios. SQL 2012.
-- =====================================================================

IF OBJECT_ID('conta.saldo_caja','U') IS NULL
CREATE TABLE conta.saldo_caja (
    i_Id                 INT IDENTITY(1,1) PRIMARY KEY,
    n_Anio               SMALLINT NOT NULL,
    n_Mes                TINYINT NOT NULL,
    d_SaldoInicial       DECIMAL(18,2) NOT NULL DEFAULT 0,   -- digitado solo en el primer periodo
    d_MontoInicialNeto   DECIMAL(18,2) NOT NULL DEFAULT 0,   -- ajuste apertura pre-2026 (resp. 21)
    d_IngresosCaja       DECIMAL(18,2) NOT NULL DEFAULT 0,   -- materializado al cerrar
    d_EgresosCaja        DECIMAL(18,2) NOT NULL DEFAULT 0,
    d_OtrosIngresos      DECIMAL(18,2) NOT NULL DEFAULT 0,
    d_SaldoFinal         DECIMAL(18,2) NOT NULL DEFAULT 0,
    b_Cerrado            BIT NOT NULL DEFAULT 0,
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha     DATETIME NULL,
    CONSTRAINT UQ_saldo_caja UNIQUE (n_Anio, n_Mes)
);

IF OBJECT_ID('conta.saldo_banco_mensual','U') IS NULL
CREATE TABLE conta.saldo_banco_mensual (
    i_Id                 INT IDENTITY(1,1) PRIMARY KEY,
    n_Anio               SMALLINT NOT NULL,
    n_Mes                TINYINT NOT NULL,
    i_IdCuentaBancaria   INT NOT NULL REFERENCES conta.cuenta_bancaria(i_IdCuentaBancaria),
    d_SaldoSoles         DECIMAL(18,2) NOT NULL DEFAULT 0,
    d_SaldoDolares       DECIMAL(18,2) NOT NULL DEFAULT 0,
    i_ActualizaIdUsuario INT NULL,
    t_ActualizaFecha     DATETIME NULL,
    CONSTRAINT UQ_saldo_banco UNIQUE (n_Anio, n_Mes, i_IdCuentaBancaria)
);

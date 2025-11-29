BEGIN TRAN;

DECLARE @Periodo nchar(4) = '2025';
DECLARE @MonedaSoles int = 1;
DECLARE @Usuario int = 1;

DECLARE @GLCuentaBCP  varchar(50) = '10410101';
DECLARE @GLCuentaBBVA varchar(50) = '10410201';

IF NOT EXISTS (SELECT 1 FROM dbo.asientocontable WITH (NOLOCK)
               WHERE ISNULL(i_Eliminado,0) = 0 AND v_NroCuenta = @GLCuentaBCP)
BEGIN
    INSERT INTO dbo.asientocontable (
        v_NroCuenta, v_Periodo, i_LongitudJerarquica, v_NombreCuenta,
        i_Naturaleza, i_IdentificaCtaBancos, i_Imputable, i_IdMoneda,
        i_EsActivo, i_Eliminado, i_InsertaIdUsuario, t_InsertaFecha
    )
    VALUES (
        @GLCuentaBCP, @Periodo, LEN(@GLCuentaBCP), 'Cuenta corriente BCP MN',
        1, 1, 1, @MonedaSoles,
        1, 0, @Usuario, GETDATE()
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.asientocontable WITH (NOLOCK)
               WHERE ISNULL(i_Eliminado,0) = 0 AND v_NroCuenta = @GLCuentaBBVA)
BEGIN
    INSERT INTO dbo.asientocontable (
        v_NroCuenta, v_Periodo, i_LongitudJerarquica, v_NombreCuenta,
        i_Naturaleza, i_IdentificaCtaBancos, i_Imputable, i_IdMoneda,
        i_EsActivo, i_Eliminado, i_InsertaIdUsuario, t_InsertaFecha
    )
    VALUES (
        @GLCuentaBBVA, @Periodo, LEN(@GLCuentaBBVA), 'Cuenta corriente BBVA MN',
        1, 1, 1, @MonedaSoles,
        1, 0, @Usuario, GETDATE()
    );
END;

SELECT v_NroCuenta, v_NombreCuenta, i_IdMoneda, v_Periodo, i_IdentificaCtaBancos
FROM dbo.asientocontable
WHERE v_NroCuenta IN (@GLCuentaBCP, @GLCuentaBBVA);

ROLLBACK TRAN;
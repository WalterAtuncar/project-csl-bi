-- Formas de pago: identificar Depósito
SELECT dh.i_ItemId, dh.v_Value1
FROM dbo.datahierarchy dh WITH (NOLOCK)
WHERE dh.i_GroupId = 46 AND UPPER(dh.v_Value1) LIKE '%DEPOS%';

-- Monedas utilizadas en plan de cuentas
SELECT DISTINCT ISNULL(i_IdMoneda, -1) AS i_IdMoneda
FROM dbo.asientocontable WITH (NOLOCK)
WHERE i_IdMoneda IS NOT NULL;

-- Estructura del plan: muestra cuentas del grupo 10
SELECT TOP 50 i_IdCuenta, v_NroCuenta, v_NombreCuenta,
       i_Naturaleza, i_Imputable, i_IdentificaCtaBancos,
       i_IdMoneda, v_Periodo
FROM dbo.asientocontable WITH (NOLOCK)
WHERE v_NroCuenta LIKE '10%'
ORDER BY v_NroCuenta;

-- Vista previa de enrutamiento (sin actualizar)
DECLARE @GLCuentaBBVA varchar(50) = '10410201';
DECLARE @GLCuentaBCP  varchar(50) = '10410101';

WITH Deposito AS (
  SELECT dh.i_ItemId
  FROM dbo.datahierarchy dh WITH (NOLOCK)
  WHERE dh.i_GroupId = 46 AND UPPER(dh.v_Value1) LIKE '%DEPOS%'
)
SELECT TOP 100
  t.v_IdTesoreria,
  t.v_IdCobranza,
  cd.i_IdFormaPago,
  fp.v_Value1      AS FormaPago,
  t.v_NroCuentaCajaBanco AS CuentaGL_Actual,
  CASE WHEN cd.i_IdFormaPago IN (SELECT i_ItemId FROM Deposito)
       THEN @GLCuentaBCP ELSE @GLCuentaBBVA END AS CuentaGL_Nueva
FROM dbo.tesoreria t
JOIN dbo.cobranzadetalle cd ON cd.v_IdCobranza = t.v_IdCobranza
LEFT JOIN dbo.datahierarchy fp ON fp.i_GroupId = 46 AND fp.i_ItemId = cd.i_IdFormaPago
WHERE ISNULL(t.i_Eliminado,0) = 0
ORDER BY t.t_FechaRegistro DESC;
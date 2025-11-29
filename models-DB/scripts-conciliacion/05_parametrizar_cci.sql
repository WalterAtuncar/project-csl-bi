BEGIN TRAN;

-- GroupId reservado para cuentas bancarias (verificado libre)
-- Inserta parámetros con NroCuenta físico, CCI y GL relacionados
INSERT INTO dbo.systemparameter (i_GroupId, i_ParameterId, v_Value1, v_Value2, v_Field, v_Description)
VALUES (700, 1, 'BCP CTA CTE SOLES', '245-1810834-0-98|002-245-001810834098-97|1041101', 'NRO_CUENTA|CCI|GL', 'Cuenta bancaria BCP MN');

INSERT INTO dbo.systemparameter (i_GroupId, i_ParameterId, v_Value1, v_Value2, v_Field, v_Description)
VALUES (700, 2, 'BBVA CTA CTE SOLES', '0011-0277100100054539|011-277-000100054539-10|1071301', 'NRO_CUENTA|CCI|GL', 'Cuenta bancaria BBVA MN');

-- Validación rápida
SELECT i_GroupId, i_ParameterId, v_Value1, v_Value2, v_Field, v_Description
FROM dbo.systemparameter
WHERE i_GroupId = 700
ORDER BY i_ParameterId;

ROLLBACK TRAN; -- Cambiar a COMMIT TRAN cuando se valide
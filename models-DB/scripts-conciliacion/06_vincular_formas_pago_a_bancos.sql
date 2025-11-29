BEGIN TRAN;

DECLARE @UserId INT = 1;           -- Ajustar si deseas auditar con otro usuario
DECLARE @DocBCPMN INT = 201;       -- BANCO CREDITO MN
DECLARE @DocBBVAMN INT = 210;      -- BANCO CONTINENTAL (BBVA) MN

-- Previsualización antes del cambio
SELECT r.i_IdFormaPago, dh.v_Value1 AS FormaPago,
       r.i_CodigoDocumento AS DocActual,
       d.v_Nombre AS NombreDoc, d.v_NroCuenta AS CuentaGL
FROM dbo.relacionformapagodocumento r
LEFT JOIN dbo.datahierarchy dh ON dh.i_GroupId = 46 AND dh.i_ItemId = r.i_IdFormaPago
LEFT JOIN dbo.documento d ON d.i_CodigoDocumento = r.i_CodigoDocumento
WHERE r.i_IdFormaPago IN (2,3,6,9)
ORDER BY r.i_IdFormaPago;

-- Reubicar VISA, MASTERCARD y CHEQUE a BBVA MN
UPDATE r
SET r.i_CodigoDocumento = @DocBBVAMN,
    r.i_ActualizaIdUsuario = @UserId,
    r.t_ActualizaFecha = GETDATE()
FROM dbo.relacionformapagodocumento r
WHERE r.i_IdFormaPago IN (2,3,6)
  AND ISNULL(r.i_CodigoDocumento, -1) <> @DocBBVAMN;

-- Vincular DEPÓSITO a BCP MN (upsert)
IF EXISTS (SELECT 1 FROM dbo.relacionformapagodocumento WHERE i_IdFormaPago = 9)
BEGIN
    UPDATE r SET
        r.i_CodigoDocumento = @DocBCPMN,
        r.i_ActualizaIdUsuario = @UserId,
        r.t_ActualizaFecha = GETDATE()
    FROM dbo.relacionformapagodocumento r
    WHERE r.i_IdFormaPago = 9;
END
ELSE
BEGIN
    INSERT INTO dbo.relacionformapagodocumento
        (i_IdFormaPago, i_CodigoDocumento, i_InsertaIdUsuario, t_InsertaFecha)
    VALUES (9, @DocBCPMN, @UserId, GETDATE());
END

-- Vista previa del resultado
SELECT r.i_IdFormaPago, dh.v_Value1 AS FormaPago,
       r.i_CodigoDocumento AS DocAsignado,
       d.v_Nombre AS NombreDoc, d.v_NroCuenta AS CuentaGL
FROM dbo.relacionformapagodocumento r
LEFT JOIN dbo.datahierarchy dh ON dh.i_GroupId = 46 AND dh.i_ItemId = r.i_IdFormaPago
LEFT JOIN dbo.documento d ON d.i_CodigoDocumento = r.i_CodigoDocumento
WHERE r.i_IdFormaPago IN (2,3,6,9)
ORDER BY r.i_IdFormaPago;

ROLLBACK TRAN; -- Cambiar a COMMIT TRAN para aplicar
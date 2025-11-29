BEGIN TRAN;

-- Actualiza nombres de documentos bancarios con el número físico de cuenta
UPDATE dbo.documento
SET v_Nombre = 'BANCO CREDITO MN 245-1810834-0-98'
WHERE i_CodigoDocumento = 201;

UPDATE dbo.documento
SET v_Nombre = 'BANCO CONTINENTAL MN 0011-0277100100054539'
WHERE i_CodigoDocumento = 210;

-- Vista previa
SELECT i_CodigoDocumento, v_Nombre, v_NroCuenta
FROM dbo.documento
WHERE i_CodigoDocumento IN (201, 210);

ROLLBACK TRAN; -- Cambiar a COMMIT TRAN cuando se valide
BEGIN TRAN;

DECLARE @GLCuentaBBVA varchar(50) = '10410201';
DECLARE @GLCuentaBCP  varchar(50) = '10410101';
DECLARE @UserId       int         = 1;

WITH Deposito AS (
  SELECT dh.i_ItemId
  FROM dbo.datahierarchy dh WITH (NOLOCK)
  WHERE dh.i_GroupId = 46 AND UPPER(dh.v_Value1) LIKE '%DEPOS%'
)
UPDATE t
SET t.v_NroCuentaCajaBanco = CASE WHEN EXISTS (
                                        SELECT 1
                                        FROM dbo.cobranzadetalle cd
                                        WHERE cd.v_IdCobranza = t.v_IdCobranza
                                          AND cd.i_IdFormaPago IN (SELECT i_ItemId FROM Deposito)
                                    )
                                  THEN @GLCuentaBCP ELSE @GLCuentaBBVA END,
    t.i_ActualizaIdUsuario = @UserId,
    t.t_ActualizaFecha     = GETDATE()
FROM dbo.tesoreria t
WHERE ISNULL(t.i_Eliminado,0) = 0
  AND t.v_IdCobranza IS NOT NULL;

SELECT COUNT(*) AS CantidadActualizadas
FROM dbo.tesoreria t
WHERE ISNULL(t.i_Eliminado,0)=0
  AND t.v_IdCobranza IS NOT NULL
  AND t.t_ActualizaFecha >= DATEADD(minute,-5,GETDATE());

ROLLBACK TRAN;
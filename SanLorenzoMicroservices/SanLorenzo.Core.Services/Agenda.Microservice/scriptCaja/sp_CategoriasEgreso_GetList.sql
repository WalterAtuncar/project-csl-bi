/*
  Catálogo: Categorías de Egreso
  Endpoint: GET /api/Caja/caja-mayor/categorias-egreso?groupId=XXX

  Este SP devuelve un catálogo genérico con las columnas esperadas por el backend:
    - Key (int): identificador único de la categoría
    - ParentKeyId (int, null): identificador del grupo/familia padre
    - Value1 (nvarchar): nombre de la categoría
    - Value2 (nvarchar, opcional): descripción adicional

  NOTA: Ajustar la fuente de datos (tabla o vista) a la estructura real del modelo.
*/

CREATE OR ALTER PROCEDURE [dbo].[sp_CategoriasEgreso_GetList]
  @GroupId INT
AS
BEGIN
  SET NOCOUNT ON;

  -- TODO: Reemplazar [dbo].[vw_CategoriasEgreso] por la tabla/vista real
  SELECT
    Key,
    ParentKeyId,
    Value1,
    Value2
  FROM [dbo].[vw_CategoriasEgreso]
  WHERE ParentKeyId = @GroupId
  ORDER BY ISNULL(Value1, ''), Key;
END
GO
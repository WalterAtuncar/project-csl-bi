-- =============================================
-- Author:      Sistema
-- Create date: 2025
-- Description: Busca proveedores por RUC o Razón Social (autocomplete)
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_Proveedores_Buscar]
    @Termino NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 20
        id_proveedor AS IdProveedor,
        ruc AS Ruc,
        razon_social AS RazonSocial,
        direccion AS Direccion,
        email AS Email,
        activo AS Activo,
        fecha_registro AS FechaRegistro
    FROM proveedores
    WHERE activo = 1
      AND (
          ruc LIKE '%' + @Termino + '%'
          OR razon_social LIKE '%' + @Termino + '%'
      )
    ORDER BY razon_social;
END;
GO

-- =============================================
-- Author:      Sistema
-- Create date: 2025
-- Description: Inserta un nuevo proveedor con datos mínimos
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_Proveedores_Insert]
    @Ruc NVARCHAR(15),
    @RazonSocial NVARCHAR(200),
    @Direccion NVARCHAR(300),
    @Email NVARCHAR(100) = NULL,
    @InsertaIdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdProveedor INT;
    DECLARE @Now DATETIME = GETDATE();

    -- Verificar si ya existe el RUC
    IF EXISTS (SELECT 1 FROM proveedores WHERE ruc = @Ruc)
    BEGIN
        -- Si existe, retornar el existente
        SELECT
            id_proveedor AS IdProveedor,
            ruc AS Ruc,
            razon_social AS RazonSocial,
            direccion AS Direccion,
            email AS Email,
            activo AS Activo,
            fecha_registro AS FechaRegistro
        FROM proveedores
        WHERE ruc = @Ruc;
        RETURN;
    END

    -- Insertar nuevo proveedor
    INSERT INTO proveedores (
        ruc,
        razon_social,
        direccion,
        email,
        activo,
        fecha_registro
    )
    VALUES (
        @Ruc,
        @RazonSocial,
        @Direccion,
        @Email,
        1,
        @Now
    );

    SET @IdProveedor = SCOPE_IDENTITY();

    -- Retornar el proveedor insertado
    SELECT
        id_proveedor AS IdProveedor,
        ruc AS Ruc,
        razon_social AS RazonSocial,
        direccion AS Direccion,
        email AS Email,
        activo AS Activo,
        fecha_registro AS FechaRegistro
    FROM proveedores
    WHERE id_proveedor = @IdProveedor;
END;
GO

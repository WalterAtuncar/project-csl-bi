-- =====================================================================
-- FASE 1 - Helpers: auditoria y roles. SQL Server 2012. Batches separados por GO.
-- =====================================================================

IF OBJECT_ID('conta.sp_Auditoria_Insert','P') IS NOT NULL DROP PROCEDURE conta.sp_Auditoria_Insert;
GO
CREATE PROCEDURE conta.sp_Auditoria_Insert
    @Tabla NVARCHAR(80), @IdRegistro NVARCHAR(40), @Accion NVARCHAR(20),
    @Detalle NVARCHAR(MAX) = NULL, @IdUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO conta.auditoria (v_Tabla, v_IdRegistro, v_Accion, v_Detalle, i_IdUsuario)
    VALUES (@Tabla, @IdRegistro, @Accion, @Detalle, @IdUsuario);
END
GO

IF OBJECT_ID('conta.sp_Rol_List','P') IS NOT NULL DROP PROCEDURE conta.sp_Rol_List;
GO
CREATE PROCEDURE conta.sp_Rol_List
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i_IdRol, v_Nombre FROM conta.rol ORDER BY i_IdRol;
END
GO

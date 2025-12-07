/*
Actualiza el SP [dbo].[sp_ListarPagosMedicos] para que el nombre mostrado
provenga de la tabla de proveedores (razón social), dado que ahora
sp.i_MedicoTratanteId almacena el Id del proveedor.

Se mantiene el alias "NombreMedico" por compatibilidad con DTOs existentes.
*/

BEGIN TRAN

IF OBJECT_ID(N'dbo.sp_ListarPagosMedicos', N'P') IS NOT NULL
    EXEC('DROP PROCEDURE dbo.sp_ListarPagosMedicos');

GO

CREATE PROCEDURE [dbo].[sp_ListarPagosMedicos]
    @i_MedicoTratanteId INT = NULL,
    @d_FechaInicio DATETIME = NULL,
    @d_FechaFin DATETIME = NULL,
    @i_IncludeDeleted BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    /*
      Nota: Ajustar la tabla/BD de proveedores según su entorno.
      Si proveedores está en la misma BD que servicespaid, use [dbo].[proveedor].
      Si está en 20505310072 (como en otros módulos), mantenga el prefijo.
    */

    SELECT 
        sp.i_PaidId,
        sp.d_PayDate,
        sp.i_MedicoTratanteId,
        COALESCE(p.razonSocial, '—') AS NombreMedico,
        sp.r_PagadoTotal,
        sp.v_Comprobante,
        sp.i_IsDeleted,
        COUNT(spd.i_PaidDetailId) AS TotalServicios,
        FORMAT(sp.r_PagadoTotal, 'C', 'es-PE') AS TotalFormateado,
        FORMAT(sp.d_PayDate, 'dd/MM/yyyy') AS FechaPagoFormateada,
        CASE WHEN sp.i_IsDeleted = 1 THEN 'ELIMINADO' ELSE 'ACTIVO' END AS Estado
    FROM dbo.servicespaid sp
    LEFT JOIN [20505310072].[dbo].[proveedor] p ON p.idProveedor = sp.i_MedicoTratanteId
    LEFT JOIN dbo.servicespaiddetails spd ON sp.i_PaidId = spd.i_PaidId AND spd.i_IsDeleted = 0
    WHERE (@i_MedicoTratanteId IS NULL OR sp.i_MedicoTratanteId = @i_MedicoTratanteId)
      AND (@d_FechaInicio IS NULL OR sp.d_PayDate >= @d_FechaInicio)
      AND (@d_FechaFin IS NULL OR sp.d_PayDate <= @d_FechaFin)
      AND (@i_IncludeDeleted = 1 OR sp.i_IsDeleted = 0)
    GROUP BY sp.i_PaidId, sp.d_PayDate, sp.i_MedicoTratanteId, p.razonSocial,
             sp.r_PagadoTotal, sp.v_Comprobante, sp.i_IsDeleted
    ORDER BY sp.d_PayDate DESC;
END
GO

/* Validación opcional
-- EXEC dbo.sp_ListarPagosMedicos NULL, '2025-08-01', '2025-12-05', 0;
*/

ROLLBACK TRAN

/*
  Script: 03_seed_tipocaja_clientetipo.sql
  Descripción: Seed de mapeo `venta.i_ClienteEsAgente` → `tipocaja.i_IdTipoCaja`.
               Usa el SP `sp_TipoCaja_ClienteTipo_Upsert` (compatible SQL Server 2012).
  Política: BEGIN TRAN + ROLLBACK por defecto; aplicar COMMIT manual tras revisar.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRAN;

DECLARE @UsuarioId INT = 1; -- Ajustar al usuario que realiza la configuración

-- Resolver IDs reales de tipocaja por nombre (según catálogo mostrado)
DECLARE @IdAsistencial  INT;
DECLARE @IdEmpresarial  INT; -- En catálogo: ATENCION_OCUPACIONAL (equivalente Empresarial)
DECLARE @IdFarmacia     INT;
DECLARE @IdSeguros      INT;
DECLARE @IdMTC          INT;
DECLARE @IdSISOL        INT;

SELECT @IdAsistencial = i_IdTipoCaja
  FROM dbo.tipocaja
 WHERE UPPER(RTRIM(LTRIM(v_NombreTipoCaja))) = 'ATENCION_ASISTENCIAL' AND ISNULL(i_Estado,1) = 1;

SELECT @IdEmpresarial = i_IdTipoCaja
  FROM dbo.tipocaja
 WHERE UPPER(RTRIM(LTRIM(v_NombreTipoCaja))) IN ('ATENCION_OCUPACIONAL','EMPRESARIAL') AND ISNULL(i_Estado,1) = 1;

SELECT @IdFarmacia = i_IdTipoCaja
  FROM dbo.tipocaja
 WHERE UPPER(RTRIM(LTRIM(v_NombreTipoCaja))) = 'FARMACIA' AND ISNULL(i_Estado,1) = 1;

SELECT @IdSeguros = i_IdTipoCaja
  FROM dbo.tipocaja
 WHERE UPPER(RTRIM(LTRIM(v_NombreTipoCaja))) = 'SEGUROS' AND ISNULL(i_Estado,1) = 1;

SELECT @IdMTC = i_IdTipoCaja
  FROM dbo.tipocaja
 WHERE UPPER(RTRIM(LTRIM(v_NombreTipoCaja))) = 'MTC' AND ISNULL(i_Estado,1) = 1;

SELECT @IdSISOL = i_IdTipoCaja
  FROM dbo.tipocaja
 WHERE UPPER(RTRIM(LTRIM(v_NombreTipoCaja))) = 'SISOL' AND ISNULL(i_Estado,1) = 1;

-- Colisión del código 1 (Empresarial vs MTC): elegir política organizacional.
-- Por defecto, se mapea a Empresarial (ATENCION_OCUPACIONAL). Cambiar a @IdMTC si corresponde.
DECLARE @IdParaCliente1 INT = @IdEmpresarial; -- Cambiar a @IdMTC si 1 debe ser MTC

/* Seed por rangos solicitados */
-- Asistencial IN (2,8,9)
EXEC dbo.sp_TipoCaja_ClienteTipo_Upsert @i_ClienteEsAgente=2,  @i_IdTipoCaja=@IdAsistencial, @b_Activo=1, @i_UsuarioId=@UsuarioId;
EXEC dbo.sp_TipoCaja_ClienteTipo_Upsert @i_ClienteEsAgente=8,  @i_IdTipoCaja=@IdAsistencial, @b_Activo=1, @i_UsuarioId=@UsuarioId;
EXEC dbo.sp_TipoCaja_ClienteTipo_Upsert @i_ClienteEsAgente=9,  @i_IdTipoCaja=@IdAsistencial, @b_Activo=1, @i_UsuarioId=@UsuarioId;

-- Farmacia IN (3,4)
EXEC dbo.sp_TipoCaja_ClienteTipo_Upsert @i_ClienteEsAgente=3,  @i_IdTipoCaja=@IdFarmacia,    @b_Activo=1, @i_UsuarioId=@UsuarioId;
EXEC dbo.sp_TipoCaja_ClienteTipo_Upsert @i_ClienteEsAgente=4,  @i_IdTipoCaja=@IdFarmacia,    @b_Activo=1, @i_UsuarioId=@UsuarioId;

-- Empresarial/MTC IN (1)
EXEC dbo.sp_TipoCaja_ClienteTipo_Upsert @i_ClienteEsAgente=1,  @i_IdTipoCaja=@IdParaCliente1, @b_Activo=1, @i_UsuarioId=@UsuarioId;

-- MTC IN (7)
EXEC dbo.sp_TipoCaja_ClienteTipo_Upsert @i_ClienteEsAgente=7,  @i_IdTipoCaja=@IdMTC,         @b_Activo=1, @i_UsuarioId=@UsuarioId;

-- Seguros IN (5,6)
EXEC dbo.sp_TipoCaja_ClienteTipo_Upsert @i_ClienteEsAgente=5,  @i_IdTipoCaja=@IdSeguros,      @b_Activo=1, @i_UsuarioId=@UsuarioId;
EXEC dbo.sp_TipoCaja_ClienteTipo_Upsert @i_ClienteEsAgente=6,  @i_IdTipoCaja=@IdSeguros,      @b_Activo=1, @i_UsuarioId=@UsuarioId;

-- SISOL IN (10)
EXEC dbo.sp_TipoCaja_ClienteTipo_Upsert @i_ClienteEsAgente=10, @i_IdTipoCaja=@IdSISOL,        @b_Activo=1, @i_UsuarioId=@UsuarioId;

/* Revisión del resultado */
SELECT *
  FROM dbo.tipocaja_clientetipo
 ORDER BY i_ClienteEsAgente;

/* Por política, mantener ROLLBACK por defecto. Aplique COMMIT manualmente si está conforme. */
-- COMMIT TRAN; -- ← quite este comentario para aplicar cambios
ROLLBACK TRAN;
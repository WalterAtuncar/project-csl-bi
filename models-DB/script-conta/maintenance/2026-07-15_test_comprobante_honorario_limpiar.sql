-- =====================================================================
-- MANTENIMIENTO (_limpiar) - Revierte los pagos de prueba del comprobante de honorarios.
-- Restaura el estado INICIAL de esta sesion: PH-1 (pago real 1, egreso 1, servicios 1-5) INTACTO.
-- Identifica los pagos de prueba por sus servicios ficticios TEST-% (PH-1 usa N009-SR* reales).
-- Baseline capturado 2026-07-15: pago=1, cons=1, serv=5, egreso=1, comprobante=0, auditoria=10092.
-- Auditoria: solo borra las filas de esta prueba (i_IdAuditoria > 10092 de pago/egreso de prueba);
-- las filas historicas 74/77/84 (egreso ids reusados) NO se tocan.
-- =====================================================================

SET XACT_ABORT ON;

DECLARE @testPagos TABLE (i_IdPago INT);
INSERT INTO @testPagos
SELECT DISTINCT i_IdPago FROM conta.pago_honorario_servicio WHERE v_ServiceId LIKE 'TEST-%';

DECLARE @testEgresos TABLE (i_IdEgreso INT);
INSERT INTO @testEgresos
SELECT i_IdEgreso FROM conta.pago_honorario_consultorio
WHERE i_IdPago IN (SELECT i_IdPago FROM @testPagos) AND i_IdEgreso IS NOT NULL;

BEGIN TRAN;
    -- Auditoria de la prueba (pago/egreso de prueba, por encima del baseline 10092).
    DELETE FROM conta.auditoria
    WHERE i_IdAuditoria > 10092
      AND ( (v_Tabla = 'conta.pago_honorario' AND v_IdRegistro IN (SELECT CAST(i_IdPago AS NVARCHAR(20)) FROM @testPagos))
         OR (v_Tabla = 'conta.egreso'         AND v_IdRegistro IN (SELECT CAST(i_IdEgreso AS NVARCHAR(20)) FROM @testEgresos)) );

    DELETE FROM conta.comprobante_honorario      WHERE i_IdPago IN (SELECT i_IdPago FROM @testPagos);
    DELETE FROM conta.pago_honorario_consultorio WHERE i_IdPago IN (SELECT i_IdPago FROM @testPagos);
    DELETE FROM conta.pago_honorario_servicio    WHERE i_IdPago IN (SELECT i_IdPago FROM @testPagos);
    DELETE FROM conta.egreso                      WHERE i_IdEgreso IN (SELECT i_IdEgreso FROM @testEgresos);
    DELETE FROM conta.pago_honorario              WHERE i_IdPago IN (SELECT i_IdPago FROM @testPagos);
COMMIT TRAN;

-- Restaurar identidades al baseline inicial (PH-1 preservado).
DBCC CHECKIDENT('conta.comprobante_honorario',      RESEED, 0);
DBCC CHECKIDENT('conta.pago_honorario_servicio',    RESEED, 5);
DBCC CHECKIDENT('conta.pago_honorario_consultorio', RESEED, 1);
DBCC CHECKIDENT('conta.pago_honorario',             RESEED, 1);
DBCC CHECKIDENT('conta.egreso',                     RESEED, 1);
DBCC CHECKIDENT('conta.auditoria',                  RESEED, 10092);

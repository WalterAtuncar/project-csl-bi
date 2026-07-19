-- =====================================================================
-- LIMPIEZA de dato de PRUEBA - Pago de honorarios PH-1 (schema conta).
-- Fecha: 2026-07-18
-- Contexto: PH-1 (id=1, medico "SOTO GAMARRA, MICHAEL", CARDIOLOGIA, PAGADO,
--   S/52.48) es residuo de prueba generado con servicios SISOL. Bajo la regla
--   nueva (going-forward SISOL EXCLUIDO del analisis de honorarios: cambio de 1
--   linea en conta.sp_Honorarios_Analisis, MasterServiceTypeId=9 unicamente),
--   este pago no debe existir. Se elimina por completo (cabecera + derivados) y
--   se reinician identidades (RESEED) para que el proximo pago real vuelva a PH-1.
--
-- Evidencia previa (SELECT, verificada en PRODUCCION antes de correr esto):
--   * conta.pago_honorario:              1 fila  -> i_IdPago = 1 (UNICO pago; Min=Max=1)
--                                          SOTO GAMARRA, MICHAEL | PAGADO | TotalPago 52.48 | entidad 1013
--   * conta.pago_honorario_consultorio:  1 fila  -> i_Id = 1  (CARDIOLOGIA / 6, i_IdEgreso = 1)
--   * conta.pago_honorario_servicio:     5 filas -> i_Id 1..5 (todas de PH-1, consultorio 6, b_Anulado=0)
--   * conta.comprobante_honorario:       0 filas (PH-1 se pago SIN comprobante tributario)
--   * conta.egreso:                      1 fila  -> i_IdEgreso = 1 (serie 'PH-1', HONORARIO,
--                                          tipo_gasto MED-HON/63, CC 2, PAGADO, S/52.48, consultorio 6)
--   Egreso 1 = UNICO egreso de toda conta.egreso y NO referenciado por compra_ext (0) ni por
--   sisol_liquidacion.i_IdEgresoHospital (0): borrado seguro, sin egreso huerfano en caja/rentabilidad.
--
--   FUERA DE ALCANCE (no se tocan; mismo criterio que 2026-07-14_cleanup_PH-6.sql):
--     * conta.entidad id 1013 (SOTO GAMARRA, MICHAEL - MEDICO): catalogo reutilizable; el proximo
--       pago real lo re-usa via upsert por v_Nombre. Sin FK/impacto en caja/rentabilidad.
--     * conta.auditoria ids 10086/10087 (PH-1 actual, 2026-07-15) y 73/75/76/78 (ciclo E2E previo
--       2026-07-13): LOG append-only. Precedente del proyecto: el cleanup de PH-6 tambien dejo el
--       log intacto. Sin FK; no genera huerfano en caja/rentabilidad.
--
-- FRONTERA dbo: TODO lo borrado es schema conta. dbo NO se toca. El egreso PH-1 tiene
--   i_IdProveedor NULL (pago sin comprobante) -> ni siquiera engancha la FK saliente a dbo.proveedores.
--
-- Orden FK-seguro (hijos primero):
--   1) pago_honorario_consultorio (referencia egreso + pago_honorario)
--   2) pago_honorario_servicio    (referencia pago_honorario)
--   3) comprobante_honorario      (referencia pago_honorario; 0 filas -> defensivo)
--   4) egreso                     (ya sin referenciadores)
--   5) pago_honorario             (cabecera, ya sin referenciadores)
--
-- RESEED (tras el borrado las 4 tablas de honorarios/egreso quedan VACIAS -> arranque LIMPIO desde 1):
--   PH-1 era el UNICO pago y el UNICO egreso. Como no sobrevive ningun pago/egreso real, se reinician
--   todas a 0 (seed_inicial-1) -> proximo id = 1 en cada una. La serie del egreso deriva de PH-<idPago>,
--   asi que el proximo pago rendera de nuevo como PH-1. (No hay otros egresos -> reseed 0 correcto;
--   si existieran egresos no-PH-1, NO se reiniciaria egreso a 0.)
-- =====================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @c1 INT = 0, @c2 INT = 0, @c3 INT = 0, @c4 INT = 0, @c5 INT = 0;

-- Guarda 0: PH-1 debe existir y ser el residuo esperado (evita correr en un estado inesperado).
IF NOT EXISTS (SELECT 1 FROM conta.pago_honorario
               WHERE i_IdPago = 1 AND v_MedicoNombre = 'SOTO GAMARRA, MICHAEL' AND d_TotalPago = 52.48)
BEGIN
    RAISERROR('ABORTADO: PH-1 no coincide con el residuo esperado (id=1 / SOTO GAMARRA, MICHAEL / 52.48).', 16, 1);
    RETURN;
END

BEGIN TRAN;

    -- Capturar el/los egreso(s) ligados a los consultorios del pago 1 (antes de borrar el puente).
    DECLARE @egresos TABLE (id INT);
    INSERT INTO @egresos (id)
        SELECT i_IdEgreso FROM conta.pago_honorario_consultorio
        WHERE i_IdPago = 1 AND i_IdEgreso IS NOT NULL;

    -- 1) Puente por consultorio (referencia egreso y pago).
    DELETE FROM conta.pago_honorario_consultorio WHERE i_IdPago = 1;
    SET @c1 = @@ROWCOUNT;

    -- 2) Servicios pagados del pago 1.
    DELETE FROM conta.pago_honorario_servicio WHERE i_IdPago = 1;
    SET @c2 = @@ROWCOUNT;

    -- 3) Comprobante tributario (0 filas para PH-1; defensivo).
    DELETE FROM conta.comprobante_honorario WHERE i_IdPago = 1;
    SET @c3 = @@ROWCOUNT;

    -- 4) Egreso(s) espejo capturados, doble-guarda por serie + tipo de gasto MED-HON.
    DELETE FROM conta.egreso
    WHERE i_IdEgreso IN (SELECT id FROM @egresos)
      AND v_SerieNumero = 'PH-1'
      AND i_IdTipoGasto = 63;
    SET @c4 = @@ROWCOUNT;

    -- 5) Cabecera del pago.
    DELETE FROM conta.pago_honorario WHERE i_IdPago = 1;
    SET @c5 = @@ROWCOUNT;

    -- Guarda final: el grafo debe quedar vacio antes de reseed a 0.
    IF (SELECT COUNT(*) FROM conta.pago_honorario) <> 0
       OR (SELECT COUNT(*) FROM conta.pago_honorario_consultorio) <> 0
       OR (SELECT COUNT(*) FROM conta.pago_honorario_servicio) <> 0
       OR (SELECT COUNT(*) FROM conta.egreso) <> 0
    BEGIN
        ROLLBACK TRAN;
        RAISERROR('ABORTADO: quedan filas inesperadas tras el borrado; no se hace RESEED.', 16, 1);
        RETURN;
    END

COMMIT TRAN;

-- RESEED de identidades (tablas vacias tras el borrado -> arranque limpio desde 1).
DBCC CHECKIDENT ('conta.pago_honorario',             RESEED, 0) WITH NO_INFOMSGS;  -- proximo = PH-1
DBCC CHECKIDENT ('conta.pago_honorario_consultorio', RESEED, 0) WITH NO_INFOMSGS;  -- proximo id = 1
DBCC CHECKIDENT ('conta.pago_honorario_servicio',    RESEED, 0) WITH NO_INFOMSGS;  -- proximo id = 1
DBCC CHECKIDENT ('conta.egreso',                     RESEED, 0) WITH NO_INFOMSGS;  -- proximo id = 1 (unico egreso era PH-1)

-- Evidencia: filas borradas por tabla.
SELECT @c1 AS del_consultorio, @c2 AS del_servicio, @c3 AS del_comprobante,
       @c4 AS del_egreso, @c5 AS del_pago;

-- =====================================================================
-- FASE 0 - Seeds. Idempotente (WHERE NOT EXISTS por clave natural). SQL 2012.
-- Usuario de auditoria de siembra = 1 (sa legacy).
-- =====================================================================

-- ---------- Roles ----------
INSERT INTO conta.rol (v_Nombre)
SELECT v FROM (VALUES ('SA'),('GERENTE'),('CONTABILIDAD')) s(v)
WHERE NOT EXISTS (SELECT 1 FROM conta.rol r WHERE r.v_Nombre = s.v);

-- ---------- Usuario inicial sa (hash PENDIENTE; el API lo fija en el bootstrap) ----------
INSERT INTO conta.usuario (v_Username, v_PasswordHash, v_NombreCompleto, i_InsertaIdUsuario)
SELECT 'sa', 'PENDIENTE', 'Super Administrador', 1
WHERE NOT EXISTS (SELECT 1 FROM conta.usuario u WHERE u.v_Username = 'sa');

INSERT INTO conta.usuario_rol (i_IdUsuario, i_IdRol)
SELECT u.i_IdUsuario, r.i_IdRol
FROM conta.usuario u CROSS JOIN conta.rol r
WHERE u.v_Username = 'sa' AND r.v_Nombre = 'SA'
  AND NOT EXISTS (SELECT 1 FROM conta.usuario_rol ur WHERE ur.i_IdUsuario = u.i_IdUsuario AND ur.i_IdRol = r.i_IdRol);

-- ---------- Config semaforo ----------
INSERT INTO conta.config (v_Clave, v_Valor, v_Descripcion)
SELECT c, v, d FROM (VALUES
    ('SEMAFORO_RENTABLE_MIN','15','Margen % minimo para estado RENTABLE'),
    ('SEMAFORO_BAJO_MIN','0','Margen % minimo para estado BAJO_MARGEN (debajo = PERDIDA)')
) s(c,v,d)
WHERE NOT EXISTS (SELECT 1 FROM conta.config cf WHERE cf.v_Clave = s.c);

-- ---------- SISOL 70/30 vigente desde 2026-01-01 ----------
INSERT INTO conta.sisol_participacion (d_PorcClinica, d_PorcHospital, t_VigenciaDesde, t_VigenciaHasta, i_InsertaIdUsuario)
SELECT 70, 30, '2026-01-01', NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM conta.sisol_participacion);

-- ---------- Centros de costo raiz (cableado a unidad via i_IdTipoCaja) ----------
INSERT INTO conta.centro_costo (i_IdPadre, v_Codigo, v_Nombre, i_IdTipoCaja, i_InsertaIdUsuario)
SELECT NULL, cod, nom, caja, 1
FROM (VALUES
    ('ADM',      'ADMINISTRACION',       CAST(NULL AS INT)),
    ('CC-ASIS',  'ATENCION ASISTENCIAL', 1),
    ('CC-OCUP',  'ATENCION OCUPACIONAL', 2),
    ('CC-FARM',  'FARMACIA',             6),
    ('CC-SEG',   'SEGUROS',              5),
    ('CC-SISOL', 'SISOL',                3)
) s(cod, nom, caja)
WHERE NOT EXISTS (SELECT 1 FROM conta.centro_costo cc WHERE cc.v_Codigo = s.cod);

-- ---------- Tipos de gasto: nodos raiz (secciones del flujo) ----------
INSERT INTO conta.tipo_gasto (i_IdPadre, v_Codigo, v_Nombre, v_SeccionFlujo, i_InsertaIdUsuario)
SELECT NULL, cod, nom, sec, 1
FROM (VALUES
    ('PERSONAL',       'GASTOS DE PERSONAL',                    'PERSONAL'),
    ('ADMIN',          'GASTOS ADMINISTRATIVOS',                'ADMIN'),
    ('MEDICO',         'GASTOS MEDICOS',                        'MEDICO'),
    ('TRIBUTOS',       'TRIBUTOS CORRIENTES + AFP',             'TRIBUTOS'),
    ('RENTA',          'IMPUESTO A LA RENTA + PARTICIPACIONES', 'RENTA'),
    ('INVERSION',      'EGRESOS DE INVERSION',                  'INVERSION'),
    ('FINANCIAMIENTO', 'EGRESOS DE FINANCIAMIENTO',             'FINANCIAMIENTO'),
    ('OTROS_EGR',      'OTROS EGRESOS',                         'OTROS_EGRESOS'),
    ('OTROS_ING',      'OTROS INGRESOS',                        'OTROS_INGRESOS')
) s(cod, nom, sec)
WHERE NOT EXISTS (SELECT 1 FROM conta.tipo_gasto tg WHERE tg.v_Codigo = s.cod);

-- ---------- Tipos de gasto: rubros hijos (resuelven padre por codigo) ----------
INSERT INTO conta.tipo_gasto (i_IdPadre, v_Codigo, v_Nombre, i_InsertaIdUsuario)
SELECT p.i_IdTipoGasto, s.cod, s.nom, 1
FROM (VALUES
    -- PERSONAL
    ('PERSONAL','PERS-REM','REMUNERACIONES'),
    ('PERSONAL','PERS-GRA','GRATIFICACIONES'),
    ('PERSONAL','PERS-CTS','CTS'),
    ('PERSONAL','PERS-UTI','UTILIDADES'),
    ('PERSONAL','PERS-BEN','BENEFICIOS SOCIALES'),
    ('PERSONAL','PERS-ADI','PERSONAL ADICIONAL'),
    -- GASTOS ADMINISTRATIVOS
    ('ADMIN','ADM-TRA','TRANSPORTE Y VIAJES (PASAJES, VIATICOS)'),
    ('ADMIN','ADM-CAP','CAPACITACION'),
    ('ADMIN','ADM-ATP','ATENCIONES AL PERSONAL (EVENTOS, FESTIVIDADES)'),
    ('ADMIN','ADM-HEC','HONORARIOS ESPECIALISTAS CLINICA'),
    ('ADMIN','ADM-HEO','HONORARIOS ESPECIALISTAS OCUPACIONAL'),
    ('ADMIN','ADM-HES','HONORARIOS ESPECIALISTAS SISOL'),
    ('ADMIN','ADM-HLE','HONORARIOS LEGALES'),
    ('ADMIN','ADM-HCO','HONORARIOS CONTABLES'),
    ('ADMIN','ADM-MAN','MANTENIMIENTO'),
    ('ADMIN','ADM-SPU','SERVICIOS PUBLICOS (AGUA, LUZ, INTERNET, TELEFONIA)'),
    ('ADMIN','ADM-MKT','MARKETING Y PUBLICIDAD'),
    ('ADMIN','ADM-REP','GASTOS DE REPRESENTACION'),
    ('ADMIN','ADM-SUS','SUSCRIPCIONES Y CERTIFICADOS'),
    ('ADMIN','ADM-SOF','SUMINISTROS OFICINA'),
    ('ADMIN','ADM-SLI','SUMINISTROS LIMPIEZA'),
    ('ADMIN','ADM-SEG','SEGUROS'),
    ('ADMIN','ADM-FLE','FLETES'),
    ('ADMIN','ADM-IZI','IZIPAY - OPENPAY'),
    ('ADMIN','ADM-OTR','OTROS GASTOS ADMINISTRATIVOS'),
    -- GASTOS MEDICOS
    ('MEDICO','MED-SUM','SUMINISTROS MEDICOS (MEDICINAS, MATERIAL MEDICO)'),
    ('MEDICO','MED-INS','INSUMOS MEDICOS'),
    ('MEDICO','MED-ALQ','ALQUILER EQUIPOS MEDICOS'),
    ('MEDICO','MED-LAB','GASTOS DE LABORATORIO'),
    ('MEDICO','MED-AMB','GASTOS DE AMBULANCIA'),
    ('MEDICO','MED-SEM','SERVICIOS ESPECIALIDADES MEDICAS'),
    ('MEDICO','MED-ALI','SERVICIOS ALIMENTACION PACIENTES'),
    ('MEDICO','MED-ASI','GASTOS ASISTENCIALES'),
    ('MEDICO','MED-OCU','GASTOS OCUPACIONALES'),
    ('MEDICO','MED-SIS','GASTOS SISOL'),
    -- TRIBUTOS
    ('TRIBUTOS','TRI-IMP','IMPUESTOS'),
    ('TRIBUTOS','TRI-AFP','AFP'),
    -- RENTA
    ('RENTA','REN-IR','IMPUESTO A LA RENTA'),
    ('RENTA','REN-PAR','PARTICIPACIONES'),
    -- INVERSION
    ('INVERSION','INV-AF','CAPEX ACTIVO FIJO'),
    ('INVERSION','INV-INF','CAPEX INFRAESTRUCTURA'),
    -- FINANCIAMIENTO
    ('FINANCIAMIENTO','FIN-INT','AMORTIZACION DEUDA INTERBANK'),
    ('FINANCIAMIENTO','FIN-BCP','AMORTIZACION DEUDA BCP'),
    ('FINANCIAMIENTO','FIN-BBVA','AMORTIZACION DEUDA BBVA'),
    ('FINANCIAMIENTO','FIN-ITF','GASTOS BANCARIOS / ITF'),
    -- OTROS EGRESOS
    ('OTROS_EGR','OEG-ASO','PAGO ASOCIADOS'),
    ('OTROS_EGR','OEG-CON','PAGO CONVENIOS'),
    ('OTROS_EGR','OEG-SIS','OTROS SISOL'),
    ('OTROS_EGR','OEG-CAL','TRANSFERENCIAS A CALIFORNIA'),
    -- OTROS INGRESOS
    ('OTROS_ING','OIN-CAL','TRANSFERENCIAS DE CALIFORNIA')
) s(padcod, cod, nom)
JOIN conta.tipo_gasto p ON p.v_Codigo = s.padcod
WHERE NOT EXISTS (SELECT 1 FROM conta.tipo_gasto tg WHERE tg.v_Codigo = s.cod);

-- ---------- Cuentas bancarias ----------
INSERT INTO conta.cuenta_bancaria (v_Banco, v_NroCuenta, v_Moneda, i_InsertaIdUsuario)
SELECT b, 'POR-DEFINIR', 'PEN', 1
FROM (VALUES ('INTERBANK'),('BCP'),('BBVA')) s(b)
WHERE NOT EXISTS (SELECT 1 FROM conta.cuenta_bancaria cb WHERE cb.v_Banco = s.b);

-- ---------- Entidades (asociados y convenios) ----------
INSERT INTO conta.entidad (v_Nombre, v_Tipo, i_InsertaIdUsuario)
SELECT n, t, 1
FROM (VALUES
    ('BIOMEDICINE','ASOCIADO'),
    ('DRIMAGEN','ASOCIADO'),
    ('CONVENIO ATRIZ','CONVENIO'),
    ('CONVENIO MEDIALFA','CONVENIO'),
    ('CONVENIO ROSALES','CONVENIO')
) s(n,t)
WHERE NOT EXISTS (SELECT 1 FROM conta.entidad e WHERE e.v_Nombre = s.n);

-- ---------- California como proveedor (respuesta 16). INSERT en dbo permitido (no ALTER). ----------
INSERT INTO dbo.proveedores (ruc, razon_social, activo, fecha_registro)
SELECT 'POR-DEFINIR-CAL', 'CLINICA CALIFORNIA', 1, GETDATE()
WHERE NOT EXISTS (SELECT 1 FROM dbo.proveedores p WHERE p.razon_social = 'CLINICA CALIFORNIA');

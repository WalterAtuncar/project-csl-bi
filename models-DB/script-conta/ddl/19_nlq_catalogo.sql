-- =====================================================================
-- ddl/19 - NLQ (consulta en lenguaje natural) - Catalogo + guardadas +
-- cache + log. Modulo NL2SQL del BI conta.
-- Plan: models-DB/docs/PLAN_NLQ_CONTA.md (seccion 2.1, columna por columna).
-- Fecha: 2026-07-28. Fase F1.
--
-- ADITIVO schema conta, CERO dbo, NO APLICADO AUN (lo aplica el orquestador
-- tras el OK del PO). SQL Server 2012: sin CREATE OR ALTER, sin DROP ... IF
-- EXISTS, sin OPENJSON / STRING_SPLIT / TRIM. IDEMPOTENTE: cada objeto
-- envuelto en IF OBJECT_ID(...) IS NULL / IF NOT EXISTS (sys.indexes/sys.columns).
-- Separadores GO. Archivo UTF-8 SIN BOM (ASCII puro, sin tildes, como el resto
-- de los ddl del schema conta).
--
-- Las 7 tablas (todas schema conta):
--   1) nlq_tabla            - universo consultable (allowlist b_Activa)
--   2) nlq_columna          - descripcion de columnas (+ b_Sensible)
--   3) nlq_regla_negocio    - filtros/reglas por dominio o tabla (prompt)
--   4) nlq_consulta_guardada- consultas guardadas por el usuario
--   5) nlq_cache_semantico  - plantilla pregunta -> SQL (0 tokens)
--   6) nlq_cache_resultado  - resultado por (hash SQL + as-of)
--   7) nlq_log              - auditoria / observabilidad
--
-- FKs fisicas: SOLO conta->conta (nlq_columna.i_IdNlqTabla -> nlq_tabla). Las
-- referencias a objetos dbo/SigesoftDesarrollo_2 en nlq_tabla/nlq_columna son
-- TEXTO (v_Base/v_Schema/v_Objeto/v_Columna) -> NO hay FK cross-DB, NO se toca
-- ningun modify_date de dbo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) conta.nlq_tabla - universo consultable (descartar, no eliminar).
--    b_Activa=1 = allowlist visible/ejecutable. Unico (v_Base,v_Schema,v_Objeto).
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.nlq_tabla','U') IS NULL
BEGIN
    CREATE TABLE conta.nlq_tabla (
        i_IdNlqTabla   INT IDENTITY(1,1) NOT NULL,
        v_Base         NVARCHAR(64)  NOT NULL,   -- 20505310072 | SigesoftDesarrollo_2
        v_Schema       NVARCHAR(64)  NOT NULL,   -- dbo | conta
        v_Objeto       NVARCHAR(128) NOT NULL,   -- nombre de tabla/vista
        v_TipoObjeto   CHAR(1)       NOT NULL,   -- 'T' tabla | 'V' vista
        v_Dominio      NVARCHAR(40)  NULL,       -- ventas | caja | clinico | ...
        b_Activa       BIT           NOT NULL CONSTRAINT DF_nlq_tabla_activa DEFAULT 0,
        v_Descripcion  NVARCHAR(500) NULL,
        t_Fecha        DATETIME      NOT NULL CONSTRAINT DF_nlq_tabla_fecha DEFAULT GETDATE(),
        CONSTRAINT PK_nlq_tabla PRIMARY KEY (i_IdNlqTabla),
        CONSTRAINT CK_nlq_tabla_tipoobj CHECK (v_TipoObjeto IN ('T','V'))
    );
END
GO
-- Unico logico del objeto (Base+Schema+Objeto). Las 3 cols son NOT NULL.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_nlq_tabla_objeto' AND object_id=OBJECT_ID('conta.nlq_tabla'))
    CREATE UNIQUE INDEX UX_nlq_tabla_objeto ON conta.nlq_tabla (v_Base, v_Schema, v_Objeto);
GO
-- Apoyo: retriever / catalogo lista consultan por activas (+dominio).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_nlq_tabla_activa' AND object_id=OBJECT_ID('conta.nlq_tabla'))
    CREATE INDEX IX_nlq_tabla_activa ON conta.nlq_tabla (b_Activa, v_Dominio);
GO

-- ---------------------------------------------------------------------
-- 2) conta.nlq_columna - descripcion de columnas. b_Sensible=1 excluye
--    p.ej. systemuser.v_Password (nunca al prompt ni al SELECT).
--    FK a nlq_tabla. Unico (i_IdNlqTabla, v_Columna).
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.nlq_columna','U') IS NULL
BEGIN
    CREATE TABLE conta.nlq_columna (
        i_IdNlqColumna INT IDENTITY(1,1) NOT NULL,
        i_IdNlqTabla   INT           NOT NULL,
        v_Columna      NVARCHAR(128) NOT NULL,
        v_TipoDato     NVARCHAR(64)  NULL,
        b_EsPk         BIT           NOT NULL CONSTRAINT DF_nlq_columna_espk DEFAULT 0,
        b_EsFk         BIT           NOT NULL CONSTRAINT DF_nlq_columna_esfk DEFAULT 0,
        v_FkObjeto     NVARCHAR(256) NULL,       -- destino schema.tabla.columna
        v_Descripcion  NVARCHAR(500) NULL,
        b_Sensible     BIT           NOT NULL CONSTRAINT DF_nlq_columna_sensible DEFAULT 0,
        CONSTRAINT PK_nlq_columna PRIMARY KEY (i_IdNlqColumna),
        CONSTRAINT FK_nlq_columna_tabla FOREIGN KEY (i_IdNlqTabla)
            REFERENCES conta.nlq_tabla (i_IdNlqTabla)
    );
END
GO
-- Unico (tabla, columna). El i_IdNlqTabla lider sirve tambien al join de la FK.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_nlq_columna_tabla_col' AND object_id=OBJECT_ID('conta.nlq_columna'))
    CREATE UNIQUE INDEX UX_nlq_columna_tabla_col ON conta.nlq_columna (i_IdNlqTabla, v_Columna);
GO

-- ---------------------------------------------------------------------
-- 3) conta.nlq_regla_negocio - filtros/reglas por dominio o tabla (los 4
--    filtros de ventas, CAJA vs RENTABILIDAD, exclusion de anuladas, ...).
--    v_Regla es texto que se inyecta al prompt.
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.nlq_regla_negocio','U') IS NULL
BEGIN
    CREATE TABLE conta.nlq_regla_negocio (
        i_IdRegla   INT IDENTITY(1,1) NOT NULL,
        v_Dominio   NVARCHAR(40)   NOT NULL,   -- ventas | caja | ...
        v_Objeto    NVARCHAR(128)  NULL,       -- NULL = aplica a todo el dominio
        v_Regla     NVARCHAR(1000) NOT NULL,   -- texto inyectado al prompt
        b_Activa    BIT            NOT NULL CONSTRAINT DF_nlq_regla_activa DEFAULT 1,
        i_Orden     INT            NOT NULL CONSTRAINT DF_nlq_regla_orden DEFAULT 0,
        CONSTRAINT PK_nlq_regla_negocio PRIMARY KEY (i_IdRegla)
    );
END
GO
-- Apoyo: sintesis de reglas activas por dominio, ordenadas.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_nlq_regla_dom' AND object_id=OBJECT_ID('conta.nlq_regla_negocio'))
    CREATE INDEX IX_nlq_regla_dom ON conta.nlq_regla_negocio (v_Dominio, b_Activa, i_Orden);
GO

-- ---------------------------------------------------------------------
-- 4) conta.nlq_consulta_guardada - consultas guardadas por el usuario.
--    Borrado logico (b_Activa=0), ownership por i_IdUsuario (SA borra cualquiera).
--    v_Sql usa params nombrados Dapper @p_* (jamas interpolacion) - contrato 3.5.
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.nlq_consulta_guardada','U') IS NULL
BEGIN
    CREATE TABLE conta.nlq_consulta_guardada (
        i_IdGuardada          INT IDENTITY(1,1) NOT NULL,
        v_Nombre              NVARCHAR(120)  NOT NULL,
        v_Descripcion         NVARCHAR(500)  NULL,
        v_Sql                 NVARCHAR(MAX)  NOT NULL,
        v_ChartTipo           NVARCHAR(20)   NULL,       -- bar|line|pie|scatter|kpi|tabla
        v_ChartConfig         NVARCHAR(MAX)  NULL,       -- JSON
        v_Params              NVARCHAR(MAX)  NULL,       -- JSON [{nombre,tipo,default,etiqueta}]
        v_FingerprintEsquema  NVARCHAR(64)   NULL,       -- hash del catalogo activo al guardar (drift)
        i_IdUsuario           INT            NOT NULL,
        v_Rol                 NVARCHAR(20)   NULL,
        b_Activa              BIT            NOT NULL CONSTRAINT DF_nlq_guardada_activa DEFAULT 1,
        t_Fecha               DATETIME       NOT NULL CONSTRAINT DF_nlq_guardada_fecha DEFAULT GETDATE(),
        CONSTRAINT PK_nlq_consulta_guardada PRIMARY KEY (i_IdGuardada)
    );
END
GO
-- Apoyo: sp_Nlq_ListarGuardadas(@IdUsuario,@Rol) lista las activas del usuario.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_nlq_guardada_usuario' AND object_id=OBJECT_ID('conta.nlq_consulta_guardada'))
    CREATE INDEX IX_nlq_guardada_usuario ON conta.nlq_consulta_guardada (i_IdUsuario, b_Activa);
GO

-- ---------------------------------------------------------------------
-- 5) conta.nlq_cache_semantico - plantilla pregunta normalizada -> SQL.
--    v_Hash = SHA-256 de la clave normalizada. Unico v_Hash (0 tokens si matchea).
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.nlq_cache_semantico','U') IS NULL
BEGIN
    CREATE TABLE conta.nlq_cache_semantico (
        i_IdCacheSem INT IDENTITY(1,1) NOT NULL,
        v_ClaveNorm  NVARCHAR(400) NOT NULL,   -- pregunta normalizada / plantilla
        v_Hash       CHAR(64)      NOT NULL,   -- SHA-256 de la clave
        v_Sql        NVARCHAR(MAX) NOT NULL,
        i_Hits       INT           NOT NULL CONSTRAINT DF_nlq_cachesem_hits DEFAULT 0,
        t_Ultima     DATETIME      NULL,
        t_Fecha      DATETIME      NOT NULL CONSTRAINT DF_nlq_cachesem_fecha DEFAULT GETDATE(),
        CONSTRAINT PK_nlq_cache_semantico PRIMARY KEY (i_IdCacheSem)
    );
END
GO
-- Indice UNICO en v_Hash (llave de lookup del cache semantico).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_nlq_cachesem_hash' AND object_id=OBJECT_ID('conta.nlq_cache_semantico'))
    CREATE UNIQUE INDEX UX_nlq_cachesem_hash ON conta.nlq_cache_semantico (v_Hash);
GO

-- ---------------------------------------------------------------------
-- 6) conta.nlq_cache_resultado - resultado por (hash SQL + as-of).
--    t_Expira NULL = eterno (mes cerrado). Indice (v_HashSql, v_AsOf).
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.nlq_cache_resultado','U') IS NULL
BEGIN
    CREATE TABLE conta.nlq_cache_resultado (
        i_IdCacheRes INT IDENTITY(1,1) NOT NULL,
        v_HashSql    CHAR(64)      NOT NULL,   -- SHA-256 del SQL final (+ valores de params)
        v_AsOf       NVARCHAR(20)  NOT NULL,   -- p.ej. 2026-06 (cerrado) | hoy
        v_Payload    NVARCHAR(MAX) NOT NULL,   -- JSON columnas + filas
        t_Expira     DATETIME      NULL,       -- NULL = eterno (mes cerrado)
        t_Fecha      DATETIME      NOT NULL CONSTRAINT DF_nlq_cacheres_fecha DEFAULT GETDATE(),
        CONSTRAINT PK_nlq_cache_resultado PRIMARY KEY (i_IdCacheRes)
    );
END
GO
-- Indice UNICO de lookup por (hash del SQL, as-of): una sola fila por llave de
-- cache -> upsert limpio en sp/21 (R1 resuelto por el orquestador 2026-07-28).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='UX_nlq_cacheres_hash_asof' AND object_id=OBJECT_ID('conta.nlq_cache_resultado'))
    CREATE UNIQUE INDEX UX_nlq_cacheres_hash_asof ON conta.nlq_cache_resultado (v_HashSql, v_AsOf);
GO

-- ---------------------------------------------------------------------
-- 7) conta.nlq_log - auditoria / observabilidad. PK BIGINT (alto volumen).
--    Los contadores de throttle/presupuesto (4.7) salen de aqui (por usuario/dia).
-- ---------------------------------------------------------------------
IF OBJECT_ID('conta.nlq_log','U') IS NULL
BEGIN
    CREATE TABLE conta.nlq_log (
        i_IdLog     BIGINT IDENTITY(1,1) NOT NULL,
        v_Pregunta  NVARCHAR(1000) NOT NULL,
        v_Sql       NVARCHAR(MAX)  NULL,
        i_TokensIn  INT            NOT NULL CONSTRAINT DF_nlq_log_tokin  DEFAULT 0,
        i_TokensOut INT            NOT NULL CONSTRAINT DF_nlq_log_tokout DEFAULT 0,
        i_Ms        INT            NOT NULL CONSTRAINT DF_nlq_log_ms     DEFAULT 0,
        i_Filas     INT            NOT NULL CONSTRAINT DF_nlq_log_filas  DEFAULT 0,
        v_Fuente    NVARCHAR(20)   NULL,       -- cache_guardada | cache_sem | generado
        b_Error     BIT            NOT NULL CONSTRAINT DF_nlq_log_error  DEFAULT 0,
        v_Error     NVARCHAR(1000) NULL,
        i_IdUsuario INT            NOT NULL,
        t_Fecha     DATETIME       NOT NULL CONSTRAINT DF_nlq_log_fecha  DEFAULT GETDATE(),
        CONSTRAINT PK_nlq_log PRIMARY KEY (i_IdLog)
    );
END
GO
-- Apoyo: contadores de rate-limit / presupuesto por usuario + dia.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_nlq_log_usuario_fecha' AND object_id=OBJECT_ID('conta.nlq_log'))
    CREATE INDEX IX_nlq_log_usuario_fecha ON conta.nlq_log (i_IdUsuario, t_Fecha)
        INCLUDE (i_TokensIn, i_TokensOut);
GO

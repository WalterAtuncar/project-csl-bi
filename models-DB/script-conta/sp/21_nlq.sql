-- =====================================================================
-- sp/21 - NLQ: SPs de catalogo / guardadas / cache / log (Fase F5 modelo).
-- Plan: models-DB/docs/PLAN_NLQ_CONTA.md (2.3). Fecha: 2026-07-28.
--
-- ADITIVO schema conta, CERO dbo, REVERSIBLE. SQL Server 2012. Idempotente:
-- IF OBJECT_ID(...,'P') IS NOT NULL DROP PROCEDURE / GO / CREATE PROCEDURE.
-- UTF-8 SIN BOM (ASCII). Usa las tablas de F1 (ddl/19) y el seed/vistas de F2 (ddl/20).
--
-- IMPORTANTE: estos SPs son SOLO para catalogo/guardadas/cache/log. El SQL
-- DINAMICO generado por el LLM NO es un SP: lo ejecuta la API por Dapper bajo el
-- login de solo-lectura conta_nlq_reader (F3). Split de CSV sin STRING_SPLIT
-- (nodos XML, SQL 2012). Upsert de cache_resultado se apoya en el indice UNICO
-- UX_nlq_cacheres_hash_asof (ddl/19, R1 resuelto). Todos SET NOCOUNT ON.
-- =====================================================================


-- =====================================================================
-- 1) sp_Nlq_CatalogoLista - objetos ACTIVOS (para retriever/Haiku + allowlist).
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_CatalogoLista','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_CatalogoLista;
GO
CREATE PROCEDURE conta.sp_Nlq_CatalogoLista
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i_IdNlqTabla, v_Base, v_Schema, v_Objeto, v_Dominio, v_Descripcion
    FROM conta.nlq_tabla
    WHERE b_Activa = 1
    ORDER BY v_Dominio, v_Objeto;
END
GO


-- =====================================================================
-- 2) sp_Nlq_CatalogoDetalle @Objetos - dado un CSV de v_Objeto, 3 resultsets:
--    RS1 tablas activas que matchean; RS2 columnas NO sensibles; RS3 reglas
--    activas por dominio (ordenadas por i_Orden). La API arma el prompt.
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_CatalogoDetalle','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_CatalogoDetalle;
GO
CREATE PROCEDURE conta.sp_Nlq_CatalogoDetalle
    @Objetos NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Split CSV -> nodos XML (escapa &,<,> antes de partir por coma). Tolerante a espacios.
    DECLARE @x XML = CONVERT(XML,
        '<i>' + REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(ISNULL(@Objetos,''), '&', '&amp;'),
                        '<', '&lt;'),
                    '>', '&gt;'),
                ',', '</i><i>') + '</i>');

    DECLARE @obj TABLE (v_Objeto NVARCHAR(128) NOT NULL);
    INSERT INTO @obj (v_Objeto)
    SELECT DISTINCT LTRIM(RTRIM(t.n.value('.', 'NVARCHAR(128)')))
    FROM @x.nodes('/i') t(n)
    WHERE LTRIM(RTRIM(t.n.value('.', 'NVARCHAR(128)'))) <> '';

    -- Tablas activas que matchean (materializadas para reusar en los 3 RS).
    DECLARE @tab TABLE (i_IdNlqTabla INT PRIMARY KEY, v_Dominio NVARCHAR(40) NULL);
    INSERT INTO @tab (i_IdNlqTabla, v_Dominio)
    SELECT nt.i_IdNlqTabla, nt.v_Dominio
    FROM conta.nlq_tabla nt
    JOIN @obj o ON o.v_Objeto = nt.v_Objeto
    WHERE nt.b_Activa = 1;

    -- RS1: tablas
    SELECT nt.i_IdNlqTabla, nt.v_Base, nt.v_Schema, nt.v_Objeto, nt.v_TipoObjeto, nt.v_Dominio, nt.v_Descripcion
    FROM conta.nlq_tabla nt
    JOIN @tab t ON t.i_IdNlqTabla = nt.i_IdNlqTabla
    ORDER BY nt.v_Dominio, nt.v_Objeto;

    -- RS2: columnas NO sensibles
    SELECT c.i_IdNlqTabla, c.v_Columna, c.v_TipoDato, c.v_Descripcion, c.b_EsPk, c.b_EsFk, c.v_FkObjeto
    FROM conta.nlq_columna c
    JOIN @tab t ON t.i_IdNlqTabla = c.i_IdNlqTabla
    WHERE c.b_Sensible = 0
    ORDER BY c.i_IdNlqTabla, c.i_IdNlqColumna;

    -- RS3: reglas activas de los dominios pedidos
    SELECT r.i_IdRegla, r.v_Dominio, r.v_Objeto, r.v_Regla, r.i_Orden
    FROM conta.nlq_regla_negocio r
    WHERE r.b_Activa = 1
      AND r.v_Dominio IN (SELECT v_Dominio FROM @tab WHERE v_Dominio IS NOT NULL)
    ORDER BY r.v_Dominio, r.i_Orden;
END
GO


-- =====================================================================
-- 3) sp_Nlq_GuardarConsulta - INSERT de una consulta guardada. Devuelve Id.
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_GuardarConsulta','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_GuardarConsulta;
GO
CREATE PROCEDURE conta.sp_Nlq_GuardarConsulta
    @Nombre             NVARCHAR(120),
    @Descripcion        NVARCHAR(500)  = NULL,
    @Sql                NVARCHAR(MAX),
    @ChartTipo          NVARCHAR(20)   = NULL,
    @ChartConfig        NVARCHAR(MAX)  = NULL,
    @Params             NVARCHAR(MAX)  = NULL,
    @FingerprintEsquema NVARCHAR(64)   = NULL,
    @IdUsuario          INT,
    @Rol                NVARCHAR(20)   = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO conta.nlq_consulta_guardada
        (v_Nombre, v_Descripcion, v_Sql, v_ChartTipo, v_ChartConfig, v_Params, v_FingerprintEsquema, i_IdUsuario, v_Rol)
    VALUES
        (@Nombre, @Descripcion, @Sql, @ChartTipo, @ChartConfig, @Params, @FingerprintEsquema, @IdUsuario, @Rol);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS Id;
END
GO


-- =====================================================================
-- 4) sp_Nlq_ListarGuardadas @IdUsuario,@EsSA - activas del usuario (SA = todas).
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_ListarGuardadas','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_ListarGuardadas;
GO
CREATE PROCEDURE conta.sp_Nlq_ListarGuardadas
    @IdUsuario INT,
    @EsSA      BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i_IdGuardada AS Id, v_Nombre, v_Descripcion, v_ChartTipo, v_Params, v_FingerprintEsquema
    FROM conta.nlq_consulta_guardada
    WHERE b_Activa = 1
      AND (@EsSA = 1 OR i_IdUsuario = @IdUsuario)
    ORDER BY t_Fecha DESC, i_IdGuardada DESC;
END
GO


-- =====================================================================
-- 5) sp_Nlq_ObtenerGuardada @Id - fila completa (incl. v_Sql) si b_Activa=1.
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_ObtenerGuardada','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_ObtenerGuardada;
GO
CREATE PROCEDURE conta.sp_Nlq_ObtenerGuardada
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i_IdGuardada AS Id, v_Nombre, v_Descripcion, v_Sql, v_ChartTipo, v_ChartConfig,
           v_Params, v_FingerprintEsquema, i_IdUsuario, v_Rol, t_Fecha
    FROM conta.nlq_consulta_guardada
    WHERE i_IdGuardada = @Id AND b_Activa = 1;
END
GO


-- =====================================================================
-- 6) sp_Nlq_BorrarGuardada @Id,@IdUsuario,@EsSA - borrado LOGICO (b_Activa=0)
--    solo si es dueno o SA. Devuelve filas afectadas.
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_BorrarGuardada','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_BorrarGuardada;
GO
CREATE PROCEDURE conta.sp_Nlq_BorrarGuardada
    @Id        INT,
    @IdUsuario INT,
    @EsSA      BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.nlq_consulta_guardada
    SET b_Activa = 0
    WHERE i_IdGuardada = @Id
      AND b_Activa = 1
      AND (@EsSA = 1 OR i_IdUsuario = @IdUsuario);
    SELECT @@ROWCOUNT AS Afectadas;
END
GO


-- =====================================================================
-- 7) sp_Nlq_CacheSemGet @Hash - fila del cache semantico si existe.
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_CacheSemGet','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_CacheSemGet;
GO
CREATE PROCEDURE conta.sp_Nlq_CacheSemGet
    @Hash CHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 i_IdCacheSem AS Id, v_ClaveNorm, v_Hash, v_Sql, i_Hits, t_Ultima, t_Fecha
    FROM conta.nlq_cache_semantico
    WHERE v_Hash = @Hash;
END
GO


-- =====================================================================
-- 8) sp_Nlq_CacheSemPut @ClaveNorm,@Hash,@Sql - upsert por v_Hash (unico).
--    Existe -> i_Hits+=1, t_Ultima=GETDATE(). No existe -> INSERT (hits=0).
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_CacheSemPut','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_CacheSemPut;
GO
CREATE PROCEDURE conta.sp_Nlq_CacheSemPut
    @ClaveNorm NVARCHAR(400),
    @Hash      CHAR(64),
    @Sql       NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.nlq_cache_semantico
    SET i_Hits = i_Hits + 1, t_Ultima = GETDATE()
    WHERE v_Hash = @Hash;

    IF @@ROWCOUNT = 0
        INSERT INTO conta.nlq_cache_semantico (v_ClaveNorm, v_Hash, v_Sql, i_Hits, t_Ultima)
        VALUES (@ClaveNorm, @Hash, @Sql, 0, GETDATE());
END
GO


-- =====================================================================
-- 9) sp_Nlq_CacheResGet @HashSql,@AsOf - payload si existe y NO expirado.
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_CacheResGet','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_CacheResGet;
GO
CREATE PROCEDURE conta.sp_Nlq_CacheResGet
    @HashSql CHAR(64),
    @AsOf    NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i_IdCacheRes AS Id, v_HashSql, v_AsOf, v_Payload, t_Expira, t_Fecha
    FROM conta.nlq_cache_resultado
    WHERE v_HashSql = @HashSql AND v_AsOf = @AsOf
      AND (t_Expira IS NULL OR t_Expira > GETDATE());
END
GO


-- =====================================================================
-- 10) sp_Nlq_CacheResPut @HashSql,@AsOf,@Payload,@TtlMin - upsert por el UNICO
--     (v_HashSql,v_AsOf). t_Expira = ahora+@TtlMin si @TtlMin>0, else NULL (eterno).
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_CacheResPut','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_CacheResPut;
GO
CREATE PROCEDURE conta.sp_Nlq_CacheResPut
    @HashSql CHAR(64),
    @AsOf    NVARCHAR(20),
    @Payload NVARCHAR(MAX),
    @TtlMin  INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Expira DATETIME = CASE WHEN @TtlMin > 0 THEN DATEADD(MINUTE, @TtlMin, GETDATE()) ELSE NULL END;

    UPDATE conta.nlq_cache_resultado
    SET v_Payload = @Payload, t_Expira = @Expira, t_Fecha = GETDATE()
    WHERE v_HashSql = @HashSql AND v_AsOf = @AsOf;

    IF @@ROWCOUNT = 0
        INSERT INTO conta.nlq_cache_resultado (v_HashSql, v_AsOf, v_Payload, t_Expira)
        VALUES (@HashSql, @AsOf, @Payload, @Expira);
END
GO


-- =====================================================================
-- 11) sp_Nlq_LogInsert - registro de auditoria/observabilidad. Devuelve Id.
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_LogInsert','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_LogInsert;
GO
CREATE PROCEDURE conta.sp_Nlq_LogInsert
    @Pregunta   NVARCHAR(1000),
    @Sql        NVARCHAR(MAX)  = NULL,
    @TokensIn   INT            = 0,
    @TokensOut  INT            = 0,
    @Ms         INT            = 0,
    @Filas      INT            = 0,
    @Fuente     NVARCHAR(20)   = NULL,
    @Error      BIT            = 0,
    @ErrorTexto NVARCHAR(1000) = NULL,
    @IdUsuario  INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO conta.nlq_log
        (v_Pregunta, v_Sql, i_TokensIn, i_TokensOut, i_Ms, i_Filas, v_Fuente, b_Error, v_Error, i_IdUsuario)
    VALUES
        (@Pregunta, @Sql, ISNULL(@TokensIn,0), ISNULL(@TokensOut,0), ISNULL(@Ms,0), ISNULL(@Filas,0),
         @Fuente, ISNULL(@Error,0), @ErrorTexto, @IdUsuario);
    SELECT CAST(SCOPE_IDENTITY() AS BIGINT) AS Id;
END
GO


-- =====================================================================
-- 12) sp_Nlq_CatalogoUpsert - upsert por (v_Base,v_Schema,v_Objeto). Usado por
--     el endpoint catalogo/rebuild (introspeccion -> catalogo). Devuelve Id.
-- =====================================================================
IF OBJECT_ID('conta.sp_Nlq_CatalogoUpsert','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_CatalogoUpsert;
GO
CREATE PROCEDURE conta.sp_Nlq_CatalogoUpsert
    @Base        NVARCHAR(64),
    @Schema      NVARCHAR(64),
    @Objeto      NVARCHAR(128),
    @TipoObjeto  CHAR(1),
    @Dominio     NVARCHAR(40)  = NULL,
    @Activa      BIT,
    @Descripcion NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE conta.nlq_tabla
    SET v_TipoObjeto = @TipoObjeto, v_Dominio = @Dominio, b_Activa = @Activa, v_Descripcion = @Descripcion
    WHERE v_Base = @Base AND v_Schema = @Schema AND v_Objeto = @Objeto;

    IF @@ROWCOUNT = 0
        INSERT INTO conta.nlq_tabla (v_Base, v_Schema, v_Objeto, v_TipoObjeto, v_Dominio, b_Activa, v_Descripcion)
        VALUES (@Base, @Schema, @Objeto, @TipoObjeto, @Dominio, @Activa, @Descripcion);

    SELECT i_IdNlqTabla AS Id
    FROM conta.nlq_tabla
    WHERE v_Base = @Base AND v_Schema = @Schema AND v_Objeto = @Objeto;
END
GO

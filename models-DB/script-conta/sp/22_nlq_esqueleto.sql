-- =====================================================================
-- sp/22 - NLQ v2: conta.sp_Nlq_CatalogoEsqueleto (retriever PK/FK).
-- Plan: NLQ v2 dominio clinico (FASE B-SLICE, TAREA 3). Fecha: 2026-07-28.
--
-- ADITIVO schema conta, CERO dbo, REVERSIBLE. SQL Server 2012. Idempotente:
-- IF OBJECT_ID(...,'P') IS NOT NULL DROP PROCEDURE / GO / CREATE PROCEDURE.
-- UTF-8 SIN BOM (ASCII). SET NOCOUNT ON.
--
-- Devuelve el "esqueleto relacional" LIGERO de cada objeto ACTIVO del catalogo:
-- una fila por objeto con sus PKs y FKs concatenadas. Es lo que el retriever
-- manda a Haiku (barato) SIN mandar todas las columnas: primero el modelo elige
-- objetos con este esqueleto y luego se pide el detalle (sp_Nlq_CatalogoDetalle).
--
-- Concatenacion SQL 2012: FOR XML PATH('') + STUFF (no hay STRING_AGG). Se usa
-- ...,TYPE).value('.','NVARCHAR(MAX)') para NO escapar el '->' de los FKs
-- (sin TYPE, el '>' saldria como &gt;). Orden estable por i_IdNlqColumna.
-- Las 3 vistas curadas (v_nlq_*) no tienen PK/FK meta -> PKs/FKs = NULL (ok).
-- =====================================================================

IF OBJECT_ID('conta.sp_Nlq_CatalogoEsqueleto','P') IS NOT NULL DROP PROCEDURE conta.sp_Nlq_CatalogoEsqueleto;
GO
CREATE PROCEDURE conta.sp_Nlq_CatalogoEsqueleto
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        nt.v_Base,
        nt.v_Schema,
        nt.v_Objeto,
        nt.v_Dominio,
        nt.v_Descripcion,
        -- PKs: columnas PK concatenadas (', ' separador), ordenadas.
        STUFF((
            SELECT ', ' + c.v_Columna
            FROM conta.nlq_columna c
            WHERE c.i_IdNlqTabla = nt.i_IdNlqTabla AND c.b_EsPk = 1
            ORDER BY c.i_IdNlqColumna
            FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '')  AS PKs,
        -- FKs: 'col->ref' solo de columnas con b_EsFk=1, concatenadas.
        STUFF((
            SELECT ', ' + c.v_Columna + '->' + ISNULL(c.v_FkObjeto, '?')
            FROM conta.nlq_columna c
            WHERE c.i_IdNlqTabla = nt.i_IdNlqTabla AND c.b_EsFk = 1
            ORDER BY c.i_IdNlqColumna
            FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '')  AS FKs
    FROM conta.nlq_tabla nt
    WHERE nt.b_Activa = 1
    ORDER BY nt.v_Dominio, nt.v_Objeto;
END
GO

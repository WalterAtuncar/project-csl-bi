-- =====================================================================
-- Schema dedicado para la plataforma de gestion financiera (contabilidad).
-- Todo lo nuevo del proyecto BI vive aqui; NUNCA se altera dbo (legacy).
-- Compatible con SQL Server 2012.
-- =====================================================================
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'conta')
    EXEC('CREATE SCHEMA conta');

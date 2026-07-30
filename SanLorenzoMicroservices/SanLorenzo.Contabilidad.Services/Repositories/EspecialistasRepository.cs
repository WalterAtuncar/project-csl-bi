using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    /// <summary>
    /// Page /conta/especialistas: actividad de especialistas (atenciones y referencias).
    /// Solo lectura cross-DB (SigesoftDesarrollo_2 + 20505310072) via 4 SP conta.sp_Especialistas_*.
    /// Toda la logica vive en los SP; aqui solo se mapea (Dapper, CommandType.StoredProcedure).
    /// commandTimeout: 60 (agregaciones sobre 2.59M filas). Patron sync = EpidemiologiaRepository.
    /// </summary>
    public class EspecialistasRepository
    {
        private readonly Db _db;
        public EspecialistasRepository(Db db) => _db = db;

        private const int CmdTimeout = 60;

        // ---- Combos del card (conta.sp_Especialistas_Filtros): 2 resultsets ----
        public (List<EspecialistaFiltroEspecialidadDto> Especialidades,
                List<EspecialistaFiltroMedicoDto> Especialistas) Filtros(
            DateTime? desde, DateTime? hasta, bool incAsistencial, bool incSisol, bool incSeguro)
        {
            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_Especialistas_Filtros",
                new
                {
                    Desde = desde,
                    Hasta = hasta,
                    IncAsistencial = incAsistencial,
                    IncSisol = incSisol,
                    IncSeguro = incSeguro
                },
                commandType: CommandType.StoredProcedure, commandTimeout: CmdTimeout);

            var especialidades = multi.Read<EspecialistaFiltroEspecialidadDto>().AsList();  // RS1
            var especialistas  = multi.Read<EspecialistaFiltroMedicoDto>().AsList();         // RS2
            return (especialidades, especialistas);
        }

        // ---- Bandeja principal paginada (conta.sp_Especialistas_Resumen). TotalFilas por fila. ----
        public (int Total, List<EspecialistaResumenDto> Filas) Resumen(
            DateTime desde, DateTime hasta, int? consultorioId, int? medicoId, int pagina, int tamanio,
            bool incAsistencial, bool incSisol, bool incSeguro)
        {
            using var cn = _db.Open();
            var filas = cn.Query<EspecialistaResumenDto>("conta.sp_Especialistas_Resumen", new
            {
                Desde = desde,
                Hasta = hasta,
                ConsultorioId = consultorioId,
                MedicoId = medicoId,
                Pagina = pagina,
                Tamanio = tamanio,
                IncAsistencial = incAsistencial,
                IncSisol = incSisol,
                IncSeguro = incSeguro
            }, commandType: CommandType.StoredProcedure, commandTimeout: CmdTimeout).AsList();

            var total = filas.Count > 0 ? filas[0].TotalFilas : 0;
            return (total, filas);
        }

        // ---- Modal "Ver Atenciones" (conta.sp_Especialistas_Atenciones). ----
        public (int Total, List<EspecialistaAtencionDto> Filas) Atenciones(
            int medicoId, DateTime desde, DateTime hasta, int? consultorioId, int pagina, int tamanio,
            bool incAsistencial, bool incSisol, bool incSeguro)
        {
            using var cn = _db.Open();
            var filas = cn.Query<EspecialistaAtencionDto>("conta.sp_Especialistas_Atenciones", new
            {
                MedicoId = medicoId,
                Desde = desde,
                Hasta = hasta,
                ConsultorioId = consultorioId,
                Pagina = pagina,
                Tamanio = tamanio,
                IncAsistencial = incAsistencial,
                IncSisol = incSisol,
                IncSeguro = incSeguro
            }, commandType: CommandType.StoredProcedure, commandTimeout: CmdTimeout).AsList();

            var total = filas.Count > 0 ? filas[0].TotalFilas : 0;
            return (total, filas);
        }

        // ---- Modal "Ver Referencias" (conta.sp_Especialistas_Referencias). ----
        public (int Total, List<EspecialistaReferenciaDto> Filas) Referencias(
            int medicoId, DateTime desde, DateTime hasta, int pagina, int tamanio,
            bool incAsistencial, bool incSisol, bool incSeguro)
        {
            using var cn = _db.Open();
            var filas = cn.Query<EspecialistaReferenciaDto>("conta.sp_Especialistas_Referencias", new
            {
                MedicoId = medicoId,
                Desde = desde,
                Hasta = hasta,
                Pagina = pagina,
                Tamanio = tamanio,
                IncAsistencial = incAsistencial,
                IncSisol = incSisol,
                IncSeguro = incSeguro
            }, commandType: CommandType.StoredProcedure, commandTimeout: CmdTimeout).AsList();

            var total = filas.Count > 0 ? filas[0].TotalFilas : 0;
            return (total, filas);
        }
    }
}

using System.Data;
using Dapper;
using Contabilidad.Infrastructure;
using Contabilidad.Models;

namespace Contabilidad.Repositories
{
    public class HonorariosRepository
    {
        private readonly Db _db;
        public HonorariosRepository(Db db) => _db = db;

        // ---- Catalogos / analisis (lectura cross-DB) ----

        public IEnumerable<ConsultorioHonorarioDto> Consultorios()
        {
            using var cn = _db.Open();
            return cn.Query<ConsultorioHonorarioDto>("conta.sp_Honorarios_Consultorios",
                commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<MedicoHonorarioDto> Medicos(int? consultorioId)
        {
            using var cn = _db.Open();
            return cn.Query<MedicoHonorarioDto>("conta.sp_Honorarios_Medicos",
                new { ConsultorioId = consultorioId }, commandType: CommandType.StoredProcedure);
        }

        public IEnumerable<ProfesionalDto> BuscarProfesional(string texto)
        {
            using var cn = _db.Open();
            return cn.Query<ProfesionalDto>("conta.sp_Honorarios_BuscarProfesional",
                new { Texto = texto }, commandType: CommandType.StoredProcedure);
        }

        // Cross-DB PESADA: command timeout amplio (>= 180s).
        public IEnumerable<AnalisisHonorarioRow> Analisis(int? consultorioId, DateTime desde, DateTime hasta)
        {
            using var cn = _db.Open();
            return cn.Query<AnalisisHonorarioRow>("conta.sp_Honorarios_Analisis",
                new { ConsultorioId = consultorioId, Desde = desde, Hasta = hasta },
                commandType: CommandType.StoredProcedure, commandTimeout: 180);
        }

        // ---- Pagos ----

        public (int Total, List<PagoHonorarioListRow> Items) ListPagos(
            DateTime? desde, DateTime? hasta, int? medicoId, bool incluirAnulados, int page, int pageSize)
        {
            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_PagoHonorario_List", new
            {
                Desde = desde, Hasta = hasta, MedicoId = medicoId,
                IncluirAnulados = incluirAnulados, Page = page, PageSize = pageSize
            }, commandType: CommandType.StoredProcedure);
            var total = multi.ReadFirst<int>();
            var items = multi.Read<PagoHonorarioListRow>().AsList();
            return (total, items);
        }

        public PagoHonorarioDetalle GetPago(int idPago)
        {
            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_PagoHonorario_Get",
                new { IdPago = idPago }, commandType: CommandType.StoredProcedure);
            var cabecera = multi.ReadFirstOrDefault<PagoHonorarioCabecera>();
            if (cabecera == null) return null;
            var consultorios = multi.Read<PagoHonorarioConsultorioRow>().AsList();
            var servicios = multi.Read<PagoHonorarioServicioRow>().AsList();
            return new PagoHonorarioDetalle
            {
                Cabecera = cabecera,
                Consultorios = consultorios,
                Servicios = servicios
            };
        }

        public PagoHonorarioCreateResult CrearPago(PagoHonorarioCreateRequest r, int idUsuario)
        {
            // TVP: columnas EN EL ORDEN de conta.tvp_pago_honorario_servicio.
            var tabla = new DataTable();
            tabla.Columns.Add("v_ServiceId", typeof(string));
            tabla.Columns.Add("i_IdConsultorio", typeof(int));
            tabla.Columns.Add("d_Precio", typeof(decimal));
            tabla.Columns.Add("d_Porc", typeof(decimal));
            tabla.Columns.Add("d_Pagado", typeof(decimal));
            foreach (var s in r.Servicios ?? new List<PagoHonorarioServicioInput>())
                tabla.Rows.Add(
                    (object)s.ServiceId ?? DBNull.Value,
                    s.IdConsultorio,
                    (object)s.Precio ?? DBNull.Value,
                    (object)s.Porc ?? DBNull.Value,
                    (object)s.Pagado ?? DBNull.Value);

            var p = new DynamicParameters();
            p.Add("@MedicoId", r.MedicoId);
            p.Add("@MedicoNombre", r.MedicoNombre);
            p.Add("@Desde", r.Desde);
            p.Add("@Hasta", r.Hasta);
            p.Add("@PorcMedico", r.PorcMedico);
            p.Add("@FechaPago", r.FechaPago);
            p.Add("@IdFormaPago", r.IdFormaPago);
            p.Add("@IdCuentaBancaria", r.IdCuentaBancaria);
            p.Add("@Glosa", r.Glosa);
            p.Add("@TotalServicios", r.TotalServicios);
            p.Add("@TotalPago", r.TotalPago);
            p.Add("@Servicios", tabla.AsTableValuedParameter("conta.tvp_pago_honorario_servicio"));
            p.Add("@IdUsuario", idUsuario);

            using var cn = _db.Open();
            using var multi = cn.QueryMultiple("conta.sp_PagoHonorario_Insert", p,
                commandType: CommandType.StoredProcedure);
            var idPago = multi.ReadFirst<int>();                                  // RS1 {i_IdPago}
            var consultorios = multi.Read<PagoHonorarioConsultorioRow>().AsList(); // RS2 consultorios + egresos
            return new PagoHonorarioCreateResult { i_IdPago = idPago, Consultorios = consultorios };
        }

        public int AnularPago(int idPago, string motivo, int idUsuario)
        {
            using var cn = _db.Open();
            return cn.QueryFirstOrDefault<int>("conta.sp_PagoHonorario_Anular",
                new { IdPago = idPago, Motivo = motivo, IdUsuario = idUsuario },
                commandType: CommandType.StoredProcedure);
        }
    }
}

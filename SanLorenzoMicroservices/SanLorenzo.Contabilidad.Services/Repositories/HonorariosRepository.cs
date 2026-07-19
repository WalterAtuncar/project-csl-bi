using System.Data;
using System.Data.SqlClient;
using System.Text.RegularExpressions;
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
            // RS4 (nuevo): comprobante tributario -> 0 o 1 fila. null si el pago no tiene comprobante.
            var comprobante = multi.ReadFirstOrDefault<PagoHonorarioComprobanteRow>();
            return new PagoHonorarioDetalle
            {
                Cabecera = cabecera,
                Consultorios = consultorios,
                Servicios = servicios,
                Comprobante = comprobante
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

            // --- Comprobante tributario (16 params nuevos del SP; obligatorio, validado en el controller) ---
            var c = r.Comprobante;
            p.Add("@TipoComprobante", c?.TipoComprobante);
            p.Add("@IdProveedor", c?.IdProveedor);
            p.Add("@RucEmisor", c?.RucEmisor);
            p.Add("@RazonSocialEmisor", c?.RazonSocialEmisor);
            p.Add("@Serie", c?.Serie);
            p.Add("@Numero", c?.Numero);
            p.Add("@FechaEmision", c?.FechaEmision);
            p.Add("@FechaVencimiento", c?.FechaVencimiento);
            p.Add("@Moneda", string.IsNullOrWhiteSpace(c?.Moneda) ? "PEN" : c.Moneda.Trim());
            p.Add("@TipoCambio", c?.TipoCambio ?? 1m);
            p.Add("@AplicaRetencion", c?.AplicaRetencion ?? false);
            p.Add("@AplicaDetraccion", c?.AplicaDetraccion ?? false);
            p.Add("@PorcDetraccion", c?.PorcDetraccion);
            p.Add("@MontoDetraccion", c?.MontoDetraccion);
            p.Add("@ConstanciaDetraccion", c?.ConstanciaDetraccion);
            p.Add("@ObservacionesComprobante", c?.Observaciones);

            // Tipo de produccion (ord 30 del SP, @TipoProduccion nvarchar(10) = 'CLINICA'):
            // rutea el egreso a CC-ASIS (CLINICA) o CC-SISOL (SISOL). Sin este param el SP usaria su
            // default y se perderia la seleccion del usuario. Normalizado a 'CLINICA' si viene null/vacio.
            p.Add("@TipoProduccion",
                string.IsNullOrWhiteSpace(r.TipoProduccion) ? "CLINICA" : r.TipoProduccion.Trim().ToUpperInvariant());

            using var cn = _db.Open();
            try
            {
                using var multi = cn.QueryMultiple("conta.sp_PagoHonorario_Insert", p,
                    commandType: CommandType.StoredProcedure);
                var idPago = multi.ReadFirst<int>();                                  // RS1 {i_IdPago}
                var consultorios = multi.Read<PagoHonorarioConsultorioRow>().AsList(); // RS2 consultorios + egresos
                return new PagoHonorarioCreateResult { i_IdPago = idPago, Consultorios = consultorios };
            }
            // Red de seguridad: si el SP no dedupea y el indice unico rechaza un servicio ya pagado,
            // el error crudo de SQL sube ininteligible. El 'when' filtra SOLO ese caso: cualquier otro
            // SqlException (incluido el RAISERROR amistoso "Servicios ya pagados..." con Number 50000)
            // propaga sin tocar y lo maneja el middleware global como hasta ahora.
            catch (SqlException ex) when (EsDuplicadoServicioActivo(ex))
            {
                throw new ContaBusinessException(MensajeServiciosYaPagados(ex));
            }
        }

        // El indice unico conta.pago_honorario_servicio.UX_pago_hon_serv_activo impide pagar
        // dos veces el mismo servicio activo. 2601 = violacion de indice unico, 2627 = de constraint unico.
        private static bool EsDuplicadoServicioActivo(SqlException ex)
        {
            if (ex.Number != 2601 && ex.Number != 2627) return false;
            var msg = ex.Message ?? string.Empty;
            return msg.IndexOf("UX_pago_hon_serv_activo", StringComparison.OrdinalIgnoreCase) >= 0
                || msg.IndexOf("pago_honorario_servicio", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        // Construye el mensaje que el front espera: contiene "ya pagad" (matchea /ya pagad/i) y
        // termina en ": id1, id2" con los serviceIds ofensores extraidos de los parentesis del SqlException
        // ("... El valor de la clave duplicada es (N009-SR000795019)."). Si no logra parsear, mensaje claro igual.
        private static string MensajeServiciosYaPagados(SqlException ex)
        {
            var ids = Regex.Matches(ex.Message ?? string.Empty, @"\(([^)]+)\)")
                .Cast<Match>()
                .Select(m => m.Groups[1].Value.Trim())
                .Where(v => v.Length > 0)
                .Distinct()
                .ToList();

            return ids.Count > 0
                ? "Servicios ya pagados: " + string.Join(", ", ids)
                : "Uno o mas servicios ya pagados no pueden registrarse nuevamente.";
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

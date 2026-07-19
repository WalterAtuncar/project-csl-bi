using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Contabilidad.Repositories;

namespace Contabilidad.Controllers
{
    /// <summary>
    /// Pagina Dashboard (tabs Gerencial y Contable). Solo lectura; toda la logica vive en los SP
    /// conta.sp_Dashboard_*. Autorizacion: [Authorize] sin rol especifico (D2: cualquier usuario
    /// conta autenticado, GERENTE incluido). El middleware global traduce SqlException/RAISERROR -> 400.
    /// </summary>
    [ApiController]
    [Route("api/conta/dashboard")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly DashboardRepository _repo;
        public DashboardController(DashboardRepository repo) => _repo = repo;

        private const int RangoMaximoDias = 730;   // 2 anios (limite del plan)
        // CSV de ids de tipo de caja: solo digitos y comas (el SP filtra con CSV+LIKE).
        private static readonly Regex TiposCajaRegex = new(@"^[0-9,]+$", RegexOptions.Compiled);

        // Valida rango de fechas + normaliza tiposCaja. Devuelve error != null si algo falla;
        // tiposCajaNorm queda con el CSV a pasar al SP (null = TODOS).
        private IActionResult ValidarParams(DateTime desde, DateTime hasta, string tiposCaja,
            out string tiposCajaNorm)
        {
            tiposCajaNorm = null;
            if (desde.Year <= 1 || hasta.Year <= 1)
                return BadRequest(new { message = "Los parametros 'desde' y 'hasta' son requeridos (formato yyyy-MM-dd)." });
            if (desde.Date > hasta.Date)
                return BadRequest(new { message = "'desde' no puede ser mayor que 'hasta'." });
            if ((hasta.Date - desde.Date).TotalDays + 1 > RangoMaximoDias)
                return BadRequest(new { message = $"El rango no puede exceder {RangoMaximoDias} dias. Acote el periodo." });

            if (!string.IsNullOrWhiteSpace(tiposCaja))
            {
                var csv = tiposCaja.Trim();
                if (!TiposCajaRegex.IsMatch(csv))
                    return BadRequest(new { message = "'tiposCaja' invalido. Debe ser un CSV de ids numericos, p.ej. '1,3,6'." });
                tiposCajaNorm = csv;   // se pasa TAL CUAL al SP
            }
            return null;
        }

        // ---- Catalogo de checkboxes (catalog-driven, D1) ----
        [HttpGet("tipos-caja")]
        public IActionResult TiposCaja()
        {
            return Ok(_repo.TiposCaja());
        }

        // ---- TAB 1: Dashboard Gerencial (10 bloques en un fetch) ----
        [HttpGet("gerencial")]
        public IActionResult Gerencial(
            [FromQuery] DateTime desde, [FromQuery] DateTime hasta,
            [FromQuery] string tiposCaja = null)
        {
            var error = ValidarParams(desde, hasta, tiposCaja, out var tiposCajaNorm);
            if (error != null) return error;

            // Contenedor con propiedades PascalCase = claves JSON literales (PropertyNamingPolicy=null):
            // { Kpis, TendenciaMensual[], SerieDiaria[], MixUnidad[], MixMensual[], MediosPago[],
            //   Waterfall[], TopEgresos[], CxcUnidad[], HeatmapCobranza[] }
            return Ok(_repo.Gerencial(desde, hasta, tiposCajaNorm));
        }

        // ---- TAB 2: Dashboard Contable (12 bloques en un fetch) ----
        [HttpGet("contable")]
        public IActionResult Contable(
            [FromQuery] DateTime desde, [FromQuery] DateTime hasta,
            [FromQuery] string tiposCaja = null)
        {
            var error = ValidarParams(desde, hasta, tiposCaja, out var tiposCajaNorm);
            if (error != null) return error;

            // { Kpis, IngresosVsEgresos[], CobranzasMedioMes[], ComposicionGastos[], EvolucionCxc[],
            //   CxcUnidad[], CxpAging[], IgvMensual[], PlanillaMes[], SaldosBancarios[],
            //   HonorariosConsultorio[], SisolLiquidaciones[] }
            return Ok(_repo.Contable(desde, hasta, tiposCajaNorm));
        }
    }
}

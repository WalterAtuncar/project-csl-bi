using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.gerencia
{
    public class LiquidacionFiltrosRequest
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public string CCosto { get; set; }
        public string NroLiquidacion { get; set; }
        public string Facturacion { get; set; }
        public string Customer { get; set; }
        public string Employer { get; set; }
        public string Working { get; set; }
    }

    public class LiquidacionFiltrosEmpresaRequest
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public string NroLiquidacion { get; set; }
        public string Facturacion { get; set; }
    }

    public class LiquidacionFiltrosEmpresaFechas
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
    }

    public class FiltroFechaInicioFechaFin
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
    }


    public class FiltroDxFrecuente
    {
        public string Dxname { get; set; }
        public int CategoriaId { get; set; }
    }

    public class FiltroBusquedaMSVentasFarmacia
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public int? tipo { get; set; }
    }
}

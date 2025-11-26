using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.atencionmedica
{
    public class FiltroBusquedaMSRequest
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public DateTime FechaInicioRet2Meses { get; set; }
    }
    public class FiltroBusquedaMSRequestSISOL
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public DateTime FechaInicioRetard { get; set; }
    }

    public class FiltroBusquedaMSRequestSISOL2
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public int AgenteBusqueda { get; set; }
    }


    public class FiltroBusquedaMSVentas
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public DateTime FechaInicioRetard { get; set; }
        public string PacienteDni { get; set; }
        public int? TipoVenta { get; set; }
        public string Comprobante { get; set; }


    }

    public class FiltroBusquedaMSVentas2
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public DateTime FechaInicioRetard { get; set; }
        public string PacienteDni { get; set; }
        public int? TipoVenta { get; set; }
        public string Comprobante { get; set; }

        public int? MedicoTto { get; set; }
        public int? Consultorio { get; set; }
        public int? EstProtocoloAtencion { get; set; }
        public string CampañaText { get; set; }
        public string FiltAlt { get; set; }


    }
    public class FiltroBusquedaMSEgresos
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public int? TipoVenta { get; set; }
        public string dni { get; set; }
    }

    public class FiltroBusquedaMSVentasAll
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public string PacienteDni { get; set; }
        public string Comprobante { get; set; }


    }

    public class FiltroBusquedaFechasMSRequest
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
    }
}

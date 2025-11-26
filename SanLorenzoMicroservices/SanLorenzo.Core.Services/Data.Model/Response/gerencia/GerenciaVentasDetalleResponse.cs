using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.gerencia
{
    public class GerenciaVentasDetalleResponse
    {        public decimal TotalGrupo { get; set; }
        public int CantidadGrupo { get; set; }

        public string Venta { get; set; }
        public string Serie { get; set; }
        public string Correlativo { get; set; }
        public string Cliente { get; set; }
        public decimal Total { get; set; }
        public string Descripcion { get; set; }
        public int Cantidad { get; set; }
        public decimal PrecioU { get; set; }
        public decimal PrecioV { get; set; }
        public DateTime FechaEmision { get; set; }
        public string Condicion { get; set; }
        public string Tipo { get; set; }
        public string Usuario1 { get; set; }
        public string Servicio { get; set; }
        public string Paciente { get; set; }
        public DateTime FechaServicio { get; set; }
        public string Comprobante { get; set; }
        public string Usuario2 { get; set; }
        public string Value1 { get; set; }
        public string Value2 { get; set; }
        public string Value3 { get; set; }

        public string Protocolo { get; set; }


        public List<GerenciaVentasDetalleVent> ListaVentas { get; set; }
    }

    public class GerenciaVentasDetalleVent
    {
        public string Venta { get; set; }
        public string Serie { get; set; }
        public string Correlativo { get; set; }
        public string Cliente { get; set; }
        public decimal Total { get; set; }
        public DateTime FechaEmision { get; set; }
        public string Condicion { get; set; }
        public string Tipo { get; set; }
        public string Usuario1 { get; set; }
        public string Servicio { get; set; }
        public string Paciente { get; set; }
        public DateTime FechaServicio { get; set; }
        public string Value1 { get; set; }
        public string Value2 { get; set; }


        public List<ListaVentaDetalle> ListaDetalle { get; set; }
    }

    public class ListaVentaDetalle
    {
        public string Descripcion { get; set; }
        public int Cantidad { get; set; }
        public decimal PrecioU { get; set; }
        public decimal PrecioV { get; set; }
        public string Usuario2 { get; set; }
    }

    public class FiltroBusquedaMS
    {
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public DateTime FechaInicioRet2Meses { get; set; }
    }
}

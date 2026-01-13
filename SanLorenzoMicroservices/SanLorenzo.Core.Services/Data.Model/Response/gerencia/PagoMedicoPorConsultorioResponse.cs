using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.gerencia
{
    public class PagoMedicoPorConsultorioResponse
    {
        // Campos de VENTA
        public string idVenta { get; set; }
        public string docTypeCliente { get; set; }
        public string docNumberCliente { get; set; }
        public string cliente { get; set; }
        public string ubigeoCliente { get; set; }
        public string direccionCliente { get; set; }
        public string formaPagoName { get; set; }
        public string serie { get; set; }
        public string numero { get; set; }
        public string fechaPago { get; set; }
        public decimal? monto { get; set; }
        public string usuarioVenta { get; set; }
        public decimal? precioServicio { get; set; }
        public decimal? cantidad { get; set; }
        public decimal? montoPagadoReal { get; set; }
        public string codigo_td { get; set; }
        public string nombreServicio { get; set; }
        public int? tieneatencion { get; set; }
        public string v_ComprobantePago { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public decimal? total { get; set; }
        public int? estado { get; set; }
        public string motivo { get; set; }
        public string idVentaDetalle { get; set; }
        public string TipCaj { get; set; }

        // Campos de SERVICIO (pueden ser NULL)
        public string v_ServiceId { get; set; }
        public string docTypePaciente { get; set; }
        public string docNumberPaciente { get; set; }
        public string apPaternoPaciente { get; set; }
        public string apMaternoPaciente { get; set; }
        public string nombresPaciente { get; set; }
        public string fechaNacimientoPaciente { get; set; }
        public string generoPaciente { get; set; }
        public string ubigeoPaciente { get; set; }
        public string direccionPaciente { get; set; }
        public string telefonoPaciente { get; set; }
        public string correoPaciente { get; set; }
        public string seguroPaciente { get; set; }
        public string estadoCivilPaciente { get; set; }
        public string nombreApoderado { get; set; }
        public string contactoApoderado { get; set; }
        public string fechaServicioFormateada { get; set; }
        public string ComprobanteAt { get; set; }
        public string usuarioVenta2 { get; set; }
        public int? medicoId { get; set; }
        public string nombreMedico { get; set; }
        public string v_ServiceComponentId { get; set; }  // ID del componente de servicio
        public string nombreProtocolo { get; set; }
        public string especialidadMedico { get; set; }
        public string consultorio { get; set; }
        public string tipoServicio { get; set; }
        public int? edadPaciente { get; set; }
        public int? idMedicoSolicita { get; set; }
        public string nombreMedicoSolicita { get; set; }
        public string especialidadSolicita { get; set; }
        public string marketing { get; set; }
        public string marketingOtros { get; set; }
        public string v_NroDocMed { get; set; }
        public string dxNombre { get; set; }
        public string dxCie10 { get; set; }
        public string dxEst { get; set; }
        public string tipoProtocolo { get; set; }
        public int? examenesRec { get; set; }
        public int? farmRec { get; set; }
        public string personId { get; set; }
        public int? consultorioId { get; set; }
        public int? tipoProtocoloId { get; set; }
        public string tipoProtocoloName { get; set; }
        public string tipoProtocoloCode { get; set; }
        public int? esPagado { get; set; }
    }
}

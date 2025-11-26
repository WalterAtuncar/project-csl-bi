using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.atencionmedica
{
    public class ServiceGridJerarquizadaList
    {
        public ServiceGridJerarquizadaList()
        {
            Diagnosticos = new BindingList<DiagnosticRepositoryJerarquizada>();
        }
        public bool b_FechaEntrega { get; set; }
        public DateTime? d_FechaEntrega { get; set; }
        public string v_ServiceId { get; set; }
        public string v_Pacient { get; set; }
        public string v_PersonId { get; set; }
        public string v_ServiceStatusName { get; set; }
        public int? i_ServiceStatusId { get; set; }
        public string v_AptitudeStatusName { get; set; }
        public string v_OrganizationName { get; set; }
        public string v_LocationName { get; set; }
        public string v_ProtocolId { get; set; }
        public string v_ProtocolName { get; set; }
        public string v_ComponentId { get; set; }
        public int i_LineStatusId { get; set; }
        public string v_DiagnosticRepositoryId { get; set; }
        public string v_DiseasesName { get; set; }
        public DateTime? d_ExpirationDateDiagnostic { get; set; }
        public string v_Recommendation { get; set; }
        public int? i_ServiceId { get; set; }
        public DateTime? d_ServiceDate { get; set; }
        public string v_PacientDocument { get; set; }
        public int? i_ServiceTypeId { get; set; }
        public string v_CustomerOrganizationId { get; set; }
        public string v_CustomerLocationId { get; set; }
        public int? i_MasterServiceId { get; set; }
        public int? i_AptitudeStatusId { get; set; }
        public int? i_EsoTypeId { get; set; }
        public int? i_IsDeleted { get; set; }
        public string v_CreationUser { get; set; }
        public string v_UpdateUser { get; set; }
        public DateTime? d_CreationDate { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public int? i_StatusLiquidation { get; set; }
        public object Liq { get; set; }
        public string v_MasterServiceName { get; set; }
        public string v_EsoTypeName { get; set; }
        public string CIE10 { get; set; }
        public BindingList<DiagnosticRepositoryJerarquizada> Diagnosticos { get; set; }
        public DateTime? d_FechaNacimiento { get; set; }
        public string NroPoliza { get; set; }
        public string Moneda { get; set; }
        public string NroFactura { get; set; }
        public decimal? Valor { get; set; }
        public int? i_FinalQualificationId { get; set; }
        public int? i_ServiceComponentStatusId { get; set; }
        public string v_Restriccion { get; set; }
        public decimal? d_Deducible { get; set; }
        public int? i_IsDeletedDx { get; set; }
        public byte[] LogoEmpresaPropietaria { get; set; }
        public string v_TelephoneNumber { get; set; }
        public int? i_IsDeletedRecomendaciones { get; set; }
        public int? i_IsDeletedRestricciones { get; set; }

        public int i_age { get; set; }
        public DateTime? d_BirthDate { get; set; }

        public string UsuarioMedicina { get; set; }

        public string CompMinera { get; set; }
        public string Tercero { get; set; }
        public int item { get; set; }
        public int? i_ApprovedUpdateUserId { get; set; }
        public string v_DocNumber { get; set; }

        public string UsuarioCrea { get; set; }
        public string TipoServicio { get; set; }
        public string TipoServicioMaster { get; set; }
        public string TipoServicioESO { get; set; }
        public string v_MedicoTratante { get; set; }
        public string v_Consultorio { get; set; }
        public int? v_ConsultorioId { get; set; }
        public string Fecha { get; set; }
        public DateTime? Fecha_ { get; set; }

        public int? Edad { get; set; }
        public string ESPECIALIDAD_MEDICA { get; set; }

        public string v_ComprobantePago { get; set; }

        public string Rx_DCM { get; set; }
        public string Rx_JPG { get; set; }
        public string Rx_PDF { get; set; }
        public string Esp { get; set; }
        public string Ekg { get; set; }
        public string Facturacion { get; set; }

        public string CIE_10 { get; set; }
        public string Diagnostico { get; set; }

        public string Value1 { get; set; }
        public string Value2 { get; set; }
        public string Value3 { get; set; }
        public string Value4 { get; set; }
        public string Value5 { get; set; }

        public int? Id_Mkt { get; set; }
        public string Val_Mkt { get; set; }

        public int? Id_Med_Sol_Ext { get; set; }
        public string Val_Med_Sol_Ext { get; set; }
        public int? Id_VendedorExterno { get; set; }
        public string Val_VendedorExterno { get; set; }
        public int? Id_Establecimiento { get; set; }
        public string Val_Establecimiento { get; set; }

        public string ComprobanteServicio { get; set; }
        public string TotalVenta { get; set; }
        public decimal? Venta { get; set; }
        public decimal TotalComponentes { get; set; }

        public string USER_AUDITA { get; set; }
        public string ESTADO_AUDIT { get; set; }


    }

    public class DiagnosticRepositoryJerarquizada
    {
        public string v_DiseasesName { get; set; }
        public string v_RecomendationsName { get; set; }
        public string v_RestricctionName { get; set; }
    }
}

using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.organization
{
    public class protocol
    {
        [ExplicitKey]
        public string v_ProtocolId { get; set; }
        public string v_Name { get; set; }
        public string v_EmployerOrganizationId { get; set; }
        public string v_EmployerLocationId { get; set; }
        public int? i_EsoTypeId { get; set; }
        public string v_GroupOccupationId { get; set; }
        public string v_CustomerOrganizationId { get; set; }
        public string v_CustomerLocationId { get; set; }
        public string v_NombreVendedor { get; set; }
        public string v_WorkingOrganizationId { get; set; }
        public string v_WorkingLocationId { get; set; }
        public string v_CostCenter { get; set; }
        public int? i_MasterServiceTypeId { get; set; }
        public int? i_MasterServiceId { get; set; }
        public int? i_HasVigency { get; set; }
        public int? i_ValidInDays { get; set; }
        public int? i_IsActive { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public string v_AseguradoraOrganizationId { get; set; }
        public string v_ComentaryUpdate { get; set; }
        public double? r_PriceFactor { get; set; }
        public double? r_MedicineDiscount { get; set; }
        public double? r_HospitalBedPrice { get; set; }
        public double? r_ClinicDiscount { get; set; }
        public double? r_DiscountExam { get; set; }
        public int? i_Consultorio { get; set; }
        public string v_Procedencia { get; set; }
        public decimal? d_PrecioConsulta { get; set; }
        public decimal? d_DescuentoLaboratorio { get; set; }
        public decimal? d_DescuentoRayosX { get; set; }
        public decimal? d_DescuentoEcografias { get; set; }
        public decimal? d_DescuentoFarmacia { get; set; }
        public decimal? d_DescuentoOdontologia { get; set; }
        public decimal? d_CamaHosp { get; set; }
        public decimal? d_SalaOperaciones { get; set; }
        public decimal? d_PrecioAmbulancia { get; set; }
    }
}

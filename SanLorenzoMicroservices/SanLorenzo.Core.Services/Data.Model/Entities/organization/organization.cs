using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.organization
{
    public class organization
    {
        [ExplicitKey]
        public string v_OrganizationId { get; set; }
        public int? i_OrganizationTypeId { get; set; }
        public int? i_SectorTypeId { get; set; }
        public string v_SectorName { get; set; }
        public string v_SectorCodigo { get; set; }
        public string v_IdentificationNumber { get; set; }
        public string v_Name { get; set; }
        public string v_Address { get; set; }
        public string v_PhoneNumber { get; set; }
        public string v_Mail { get; set; }
        public string v_ContacName { get; set; }
        public string v_Contacto { get; set; }
        public string v_EmailContacto { get; set; }
        public string v_Observation { get; set; }
        public int? i_NumberQuotasOrganization { get; set; }
        public int? i_NumberQuotasMen { get; set; }
        public int? i_NumberQuotasWomen { get; set; }
        public int? i_DepartmentId { get; set; }
        public int? i_ProvinceId { get; set; }
        public int? i_DistrictId { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public byte[] b_Image { get; set; }
        public string v_ContactoMedico { get; set; }
        public string v_EmailMedico { get; set; }
        public decimal? r_Factor { get; set; }
        public decimal? r_FactorMed { get; set; }
        public string v_ComentaryUpdate { get; set; }
    }
}

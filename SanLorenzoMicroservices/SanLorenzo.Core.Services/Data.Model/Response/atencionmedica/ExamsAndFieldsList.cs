using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.atencionmedica
{
    public class ExamsAndFieldsList
    {
        public List<ComponentListN> ListMissingExamenesNames { get; set; }
        public List<recomendation> recomendations { get; set; }
        public List<restriction> restrcition { get; set; }
        public List<values> values { get; set; }
        public List<fields> fields { get; set; }
        public List<components> componentes { get; set; }

        public ExamsAndFieldsList()
        {
            ListMissingExamenesNames = new List<ComponentListN>();
            recomendations = new List<recomendation>();
            restrcition = new List<restriction>();
            values = new List<values>();
            fields = new List<fields>();
            componentes = new List<components>();
        }
    }

    public class ComponentListN
    {
        public string v_ComponentId { get; set; }
        public string v_CategoryName { get; set; }
        public string v_ServiceComponentId { get; set; }
        public string v_ComponentIdConct { get; set; }
    }

    public class recomendation
    {
        public string v_RecommendationId { get; set; }
        public string v_ServiceId { get; set; }
        public string v_DiagnosticRepositoryId { get; set; }
        public string v_ComponentId { get; set; }
        public string v_MasterRecommendationId { get; set; }

        public string v_MasterRecommendationRestrictionId { get; set; }

        public int? i_RecordStatus { get; set; }
        public int? i_RecordType { get; set; }

        public int? i_IsDeleted { get; set; }
        public string v_CreationUser { get; set; }
        public string v_UpdateUser { get; set; }
        public DateTime? d_CreationDate { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public string v_ComponentFieldValuesRecommendationId { get; set; }
        public string v_ComponentFieldValuesId { get; set; }
        public string v_RecommendationName { get; set; }
        public int i_Item { get; set; }
        public string v_DiseasesId { get; set; }
    }

    public class restriction
    {
        public string v_RestrictionId { get; set; }
        public string v_RestrictionByDiagnosticId { get; set; }
        public string v_DiagnosticRepositoryId { get; set; }
        public string v_ServiceId { get; set; }
        public string v_ComponentId { get; set; }
        public string v_MasterRestrictionId { get; set; }
        public int? i_RecordStatus { get; set; }
        public int? i_RecordType { get; set; }
        public int? i_ItemId { get; set; }
        public int? i_IsDeleted { get; set; }
        public string v_CreationUser { get; set; }
        public string v_UpdateUser { get; set; }
        public DateTime? d_CreationDate { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public DateTime? d_StartDateRestriction { get; set; }
        public DateTime? d_EndDateRestriction { get; set; }
        public string v_ComponentFieldValuesRestrictionId { get; set; }
        public string v_ComponentFieldValuesId { get; set; }
        public string v_RestrictionName { get; set; }
        public int i_Item { get; set; }
        public string v_DiseasesId { get; set; }
    }

    public class values
    {
        public string v_ComponentFieldValuesId { get; set; }
        public string v_ComponentFieldsId { get; set; }
        public string v_AnalyzingValue1 { get; set; }
        public string v_AnalyzingValue2 { get; set; }
        public int i_OperatorId { get; set; }
        public string v_Recommendation { get; set; }
        public int i_Cie10Id { get; set; }
        public string v_Restriction { get; set; }
        public string v_LegalStandard { get; set; }
        public int? i_IsAnormal { get; set; }
        public int? i_ValidationMonths { get; set; }
        public string v_ComponentId { get; set; }
        public string v_DiseasesId { get; set; }
        public string v_DiseasesName { get; set; }  
        public string v_CIE10 { get; set; }
        public List<recomendation> Recomendations { get; set; }
        public List<restriction> Restrictions { get; set; }
        public int? i_GenderId { get; set; }
    }

    public class fields
    {
        public string v_ComponentFieldId { get; set; }
        public string v_ComponentId { get; set; }
        public string v_Group { get; set; }
        public string v_TextLabel { get; set; }
        public int i_LabelWidth { get; set; }
        public string v_DefaultText { get; set; }
        public int i_ControlId { get; set; }
        public int i_GroupId { get; set; }
        public int i_ItemId { get; set; }
        public int i_ControlWidth { get; set; }
        public int i_HeightControl { get; set; }
        public int i_MaxLenght { get; set; }
        public int i_IsRequired { get; set; }
        public string v_IsRequired { get; set; }
        public int i_IsCalculate { get; set; }
        public int i_Order { get; set; }
        public int i_MeasurementUnitId { get; set; }
        public Single r_ValidateValue1 { get; set; }
        public Single r_ValidateValue2 { get; set; }
        public int i_Column { get; set; }
        public int? i_HasAutomaticDxId { get; set; }
        public string v_HasAutomaticDxComponentFieldsId { get; set; }
        public string v_MeasurementUnitName { get; set; }       
        public int i_IsSourceFieldToCalculate { get; set; }       
        public string v_SourceFieldToCalculateId1 { get; set; }       
        public string v_SourceFieldToCalculateId2 { get; set; }       
        public string v_TargetFieldOfCalculateId { get; set; }
        public string v_Formula { get; set; }
        public string v_FormulaChild { get; set; }
        public string v_SourceFieldToCalculateJoin { get; set; }
        public int i_IsDeleted { get; set; }
        public string v_CreationUser { get; set; }
        public string v_UpdateUser { get; set; }
        public DateTime? d_CreationDate { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public List<fields> Values { get; set; }
        public List<TargetFieldOfCalculate> TargetFieldOfCalculateId { get; set; }
        public List<Formulate> Formula { get; set; }
        public int? i_RecordStatus { get; set; }
        public int? i_RecordType { get; set; }
        public string v_ComponentName { get; set; }
        public int? i_NroDecimales { get; set; }
        public int? i_ReadOnly { get; set; }
        public int? i_Enabled { get; set; }
    }
    public class TargetFieldOfCalculate
    {
        public string v_TargetFieldOfCalculateId { get; set; }
    }

    public class Formulate
    {
        public string v_Formula { get; set; }
        public string v_TargetFieldOfCalculateId { get; set; }
    }

    public class components
    {
        public string v_ComponentId { get; set; }
        public string v_Name { get; set; }
        public string v_ServiceComponentId { get; set; }
        public int? i_CategoryId { get; set; }
        public string v_CategoryName { get; set; }

        public int? i_ComponentTypeId { get; set; }
        public float? r_BasePrice { get; set; }
        public int? i_UIIsVisibleId { get; set; }

        public int i_IsDeleted { get; set; }
        public string v_CreationUser { get; set; }
        public string v_UpdateUser { get; set; }
        public DateTime? d_CreationDate { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public string[] componentsId { get; set; }

        // jerarquia

        public List<fields> Fields { get; set; }

        public int? i_Index { get; set; }

        public int? i_GroupedComponentId { get; set; }
        public string v_GroupedComponentName { get; set; }
        public int i_IsGroupedComponent { get; set; }
        public List<components> GroupedComponentsName { get; set; }
        public string v_ComponentCopyId { get; set; }
        public int? i_ServiceComponentStatusId { get; set; }
    }
}

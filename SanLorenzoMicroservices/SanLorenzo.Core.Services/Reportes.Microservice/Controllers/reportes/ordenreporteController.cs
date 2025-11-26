using Business.Logic.IContractsBL.reportes;
using Data.Model;
using Data.Model.Request.calendar;
using Data.Model.Request.reportes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Reportes.Microservice.Controllers.reportes
{
    [Route("api/ordenreporte")]
    [ApiController]
    public class ordenreporteController : ControllerBase
    {
        private IOrdenreporteLogic _ordenreporte;
        public ResponseDTO _ResponseDTO;
        public ordenreporteController(IOrdenreporteLogic ordenreporte)
        {
            _ordenreporte = ordenreporte;
        }

        [HttpGet]
        public IActionResult GetList()
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetList()));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("{id}")]
        public IActionResult GetById(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetById(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        //first  controller
        [HttpGet]
        [Route("GetServiceReport/{id}")]
        public IActionResult GetServiceReport(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceReport(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetAptitudeCertificateRefactNew/{id}")]
        public IActionResult GetAptitudeCertificateRefactNew(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetAptitudeCertificateRefactNew(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetAptitudeCertificateRefactNew2/{id}")]
        public IActionResult GetAptitudeCertificateRefactNew2(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetAptitudeCertificateRefactNew2(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetAptitudeCertificateRefactNew3/{id}")]
        public IActionResult GetAptitudeCertificateRefactNew3(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetAptitudeCertificateRefactNew3(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportOsteoCoimalache")]
        public IActionResult GetReportOsteoCoimalache([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportOsteoCoimalache(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetValoresComponente")]
        public IActionResult GetValoresComponente([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetValoresComponente(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportToxicologico")]
        public IActionResult GetReportToxicologico([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportToxicologico(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("DevolverComponentesConcatenados/{id}")]
        public IActionResult DevolverComponentesConcatenados(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.DevolverComponentesConcatenados(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetDevolverComponentesLaboratorioConcatenados")]
        public IActionResult GetDevolverComponentesLaboratorioConcatenados([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDevolverComponentesLaboratorioConcatenados(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetReportConsentimiento/{id}")]
        public IActionResult GetReportConsentimiento(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportConsentimiento(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ObtenerIdsParaImportacionExcel")]
        public IActionResult ObtenerIdsParaImportacionExcel([FromBody] filtroServicioYCategoriaRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.ObtenerIdsParaImportacionExcel(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetInfoMedicalCenter/{id}")]
        public IActionResult GetInfoMedicalCenter(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetInfoMedicalCenter(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetValoresComponentesUserControl")]
        public IActionResult GetValoresComponentesUserControl([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetValoresComponentesUserControl(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportOsteoMuscularNuevo")]
        public IActionResult GetReportOsteoMuscularNuevo([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportOsteoMuscularNuevo(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetRecomendationByServiceIdAndComponentConcatec")]
        public IActionResult GetRecomendationByServiceIdAndComponentConcatec([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetRecomendationByServiceIdAndComponentConcatec(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetDisgnosticsCIE10ByServiceIdAndComponentConcatec")]
        public IActionResult GetDisgnosticsCIE10ByServiceIdAndComponentConcatec([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDisgnosticsCIE10ByServiceIdAndComponentConcatec(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ValoresComponenteOdontograma1")]
        public IActionResult ValoresComponenteOdontograma1([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.ValoresComponenteOdontograma1(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ReporteOsteomuscular")]
        public IActionResult ReporteOsteomuscular([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.ReporteOsteomuscular(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetMusculoEsqueletico")]
        public IActionResult GetMusculoEsqueletico([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetMusculoEsqueletico(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetCAPE/{id}")]
        public IActionResult GetCAPE(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetCAPE(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetConcatenateRecommendationByService_New_2/{id}")]
        public IActionResult GetConcatenateRecommendationByService_New_2(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetConcatenateRecommendationByService_New_2(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetConcatenateRestrictionByServiceConcatecDx/{id}")]
        public IActionResult GetConcatenateRestrictionByServiceConcatecDx(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetConcatenateRestrictionByServiceConcatecDx(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetReportHistoriaOcupacional/{id}")]
        public IActionResult GetReportHistoriaOcupacional(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportHistoriaOcupacional(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportFuncionesVitales")]
        public IActionResult GetReportFuncionesVitales([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportFuncionesVitales(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportAntropometria")]
        public IActionResult GetReportAntropometria([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportAntropometria(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetAlturaEstructural")]
        public IActionResult GetAlturaEstructural([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetAlturaEstructural(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportEstudioElectrocardiografico")]
        public IActionResult GetReportEstudioElectrocardiografico([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportEstudioElectrocardiografico(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetDiagnosticByServiceIdAndComponent")]
        public IActionResult GetDiagnosticByServiceIdAndComponent([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDiagnosticByServiceIdAndComponent(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetRecommendationByServiceIdAndComponent")]
        public IActionResult GetRecommendationByServiceIdAndComponent([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetRecommendationByServiceIdAndComponent(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportElectroGold")]
        public IActionResult GetReportElectroGold([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportElectroGold(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetValoresComponenteOdontograma")]
        public IActionResult GetValoresComponenteOdontograma([FromBody] filtroServicioComponentePathRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetValoresComponenteOdontograma(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetValoresComponenteOdontogramaValue1")]
        public IActionResult GetValoresComponenteOdontogramaValue1([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetValoresComponenteOdontogramaValue1(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetValoresComponenteOdontogramaAusente")]
        public IActionResult GetValoresComponenteOdontogramaAusente([FromBody] filtroServicioComponentePathRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetValoresComponenteOdontogramaAusente(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetListValueComponent/{id}")]
        public IActionResult GetListValueComponent(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetListValueComponent(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportOdontograma")]
        public IActionResult GetReportOdontograma([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportOdontograma(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetDiagnosticRepositoryByComponent1")]
        public IActionResult GetDiagnosticRepositoryByComponent1([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDiagnosticRepositoryByComponent1(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetDiagnosticRepositoryByComponent2")]
        public IActionResult GetDiagnosticRepositoryByComponent2([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDiagnosticRepositoryByComponent2(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetDiagnosticRepositoryByComponent3")]
        public IActionResult GetDiagnosticRepositoryByComponent3([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDiagnosticRepositoryByComponent3(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportAudiometria")]
        public IActionResult GetReportAudiometria([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportAudiometria(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetDiagnosticByServiceIdAndCategoryId")]
        public IActionResult GetDiagnosticByServiceIdAndCategoryId([FromBody] filtroServicioYCategoriaRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDiagnosticByServiceIdAndCategoryId(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("ConcatenateRecomendacionesByCategoria")]
        public IActionResult ConcatenateRecomendacionesByCategoria([FromBody] filtroServicioYCategoriaRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.ConcatenateRecomendacionesByCategoria(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetFichaPsicologicaOcupacional/{id}")]
        public IActionResult GetFichaPsicologicaOcupacional(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetFichaPsicologicaOcupacional(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }


        [HttpPost]
        [Route("GetReportRadiologico")]
        public IActionResult GetReportRadiologico([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportRadiologico(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportInformeRadiografico")]
        public IActionResult GetReportInformeRadiografico([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportInformeRadiografico(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetObtenerFirmaMedicoExamen")]
        public IActionResult GetObtenerFirmaMedicoExamen([FromBody] filtroServiceComponentComponent obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetObtenerFirmaMedicoExamen(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportCuestionarioNordico")]
        public IActionResult GetReportCuestionarioNordico([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportCuestionarioNordico(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetCAPSD/{id}")]
        public IActionResult GetCAPSD(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetCAPSD(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetConcatenateRecommendation/{id}")]
        public IActionResult GetConcatenateRecommendation(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetConcatenateRecommendation(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetHistoriaClinicaPsicologica")]
        public IActionResult GetHistoriaClinicaPsicologica([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetHistoriaClinicaPsicologica(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReporteLumboSaca")]
        public IActionResult GetReporteLumboSaca([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReporteLumboSaca(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportCocainaMarihuana")]
        public IActionResult GetReportCocainaMarihuana([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportCocainaMarihuana(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetAudiometriaCoimolache")]
        public IActionResult GetAudiometriaCoimolache([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetAudiometriaCoimolache(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetPacientReportEPS/{id}")]
        public IActionResult GetPacientReportEPS(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetPacientReportEPS(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetHistoryReport/{id}")]
        public IActionResult GetHistoryReport(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetHistoryReport(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetFamilyMedicalAntecedentsReport/{id}")]
        public IActionResult GetFamilyMedicalAntecedentsReport(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetFamilyMedicalAntecedentsReport(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetPersonMedicalHistoryReport/{id}")]
        public IActionResult GetPersonMedicalHistoryReport(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetPersonMedicalHistoryReport(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetNoxiousHabitsReport/{id}")]
        public IActionResult GetNoxiousHabitsReport(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetNoxiousHabitsReport(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetValoresExamenComponete")]
        public IActionResult GetValoresExamenComponete([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetValoresExamenComponete(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetDiagnosticForAudiometria")]
        public IActionResult GetDiagnosticForAudiometria([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDiagnosticForAudiometria(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceDisgnosticsReports/{id}")]
        public IActionResult GetServiceDisgnosticsReports(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceDisgnosticsReports(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetConcatenateRestriction/{id}")]
        public IActionResult GetConcatenateRestriction(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetConcatenateRestriction(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceRecommendationByServiceId/{id}")]
        public IActionResult GetServiceRecommendationByServiceId(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceRecommendationByServiceId(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceComponentsReportC/{id}")]
        public IActionResult GetServiceComponentsReportC(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceComponentsReportC(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetValoresComponenteAMC")]
        public IActionResult GetValoresComponenteAMC([FromBody] filtroServicioYCategoriaRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetValoresComponenteAMC(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceComponentsReport_New312/{id}")]
        public IActionResult GetServiceComponentsReport_New312(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceComponentsReport_New312(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetServiceComponentDiagnosticsReport")]
        public IActionResult GetServiceComponentDiagnosticsReport([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceComponentDiagnosticsReport(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceShort/{id}")]
        public IActionResult GetServiceShort(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceShort(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetAnamnesisReport")]
        public IActionResult GetAnamnesisReport([FromBody] filtroServiceComponentComponent obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetAnamnesisReport(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceComponentConclusionesDxServiceIdReport/{id}")]
        public IActionResult GetServiceComponentConclusionesDxServiceIdReport(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceComponentConclusionesDxServiceIdReport(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }







        [HttpGet]
        [Route("GetServiceRecommendationByDiagnosticRepositoryIdReport/{id}")]
        public IActionResult GetServiceRecommendationByDiagnosticRepositoryIdReport(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceRecommendationByDiagnosticRepositoryIdReport(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceRestrictionByDiagnosticRepositoryIdReport/{id}")]
        public IActionResult GetServiceRestrictionByDiagnosticRepositoryIdReport(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceRestrictionByDiagnosticRepositoryIdReport(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetDoctoPhisicalExam")]
        public IActionResult GetDoctoPhisicalExam([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDoctoPhisicalExam(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }


        [HttpGet]
        [Route("GetServiceComponentConclusionesDxServiceIdReport_TODOS/{id}")]
        public IActionResult GetServiceComponentConclusionesDxServiceIdReport_TODOS(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceComponentConclusionesDxServiceIdReport_TODOS(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetRestrictionByServiceId/{id}")]
        public IActionResult GetRestrictionByServiceId(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetRestrictionByServiceId(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetValoresComponente_ObservadoAMC")]
        public IActionResult GetValoresComponente_ObservadoAMC([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetValoresComponente_ObservadoAMC(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetNombreMedicoLab/{id}")]
        public IActionResult GetNombreMedicoLab(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetNombreMedicoLab(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
        [HttpGet]
        [Route("GetNombreEmpresaLab/{id}")]
        public IActionResult GetNombreEmpresaLab(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetNombreEmpresaLab(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("DevolverDatosPaciente/{id}")]
        public IActionResult DevolverDatosPaciente(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.DevolverDatosPaciente(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetDevolverDatosUsuarioGraboExamen")]
        public IActionResult GetDevolverDatosUsuarioGraboExamen([FromBody] filtroServicioYCategoriaRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDevolverDatosUsuarioGraboExamen(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("AntecedentesOcupacionales/{id}")]
        public IActionResult AntecedentesOcupacionales(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.AntecedentesOcupacionales(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("AntecedentesmEDICOS/{id}")]
        public IActionResult AntecedentesmEDICOS(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.AntecedentesmEDICOS(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetFirmaMedicos/{id}")]
        public IActionResult GetFirmaMedicos(int id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetFirmaMedicos(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetInformacion_OtrosExamenes_MS/{id}")]
        public IActionResult GetInformacion_OtrosExamenes_MS(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetInformacion_OtrosExamenes_MS(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetPacientReportEPSFirmaMedicoOcupacional/{id}")]
        public IActionResult GetPacientReportEPSFirmaMedicoOcupacional(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetPacientReportEPSFirmaMedicoOcupacional(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetListRecommendationByServiceIdAndComponent")]
        public IActionResult GetListRecommendationByServiceIdAndComponent([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetListRecommendationByServiceIdAndComponent(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetDevolverAptitud/{id}")]
        public IActionResult GetDevolverAptitud(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDevolverAptitud(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetHistoryReportA/{id}")]
        public IActionResult GetHistoryReportA(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetHistoryReportA(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetHistoryReportB/{id}")]
        public IActionResult GetHistoryReportB(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetHistoryReportB(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetLogoEmpresa/{id}")]
        public IActionResult GetLogoEmpresa(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetLogoEmpresa(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetInformacion_Laboratorio/{id}")]
        public IActionResult GetInformacion_Laboratorio(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetInformacion_Laboratorio(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetInformacion_OtrosExamenes_New/{id}")]
        public IActionResult GetInformacion_OtrosExamenes_New(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetInformacion_OtrosExamenes_New(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceComponentsReport_NewLab_1/{id}")]
        public IActionResult GetServiceComponentsReport_NewLab_1(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceComponentsReport_NewLab_1(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceComponentsReport_NewLab_2/{id}")]
        public IActionResult GetServiceComponentsReport_NewLab_2(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceComponentsReport_NewLab_2(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetDevolverAntecedentesPersonales/{id}")]
        public IActionResult GetDevolverAntecedentesPersonales(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetDevolverAntecedentesPersonales(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetAptitudMedicoServicio/{id}")]
        public IActionResult GetAptitudMedicoServicio(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetAptitudMedicoServicio(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetInfoMedicalCenterN/{id}")]
        public IActionResult GetInfoMedicalCenterN(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetInfoMedicalCenterN(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpGet]
        [Route("GetServiceComponentsReportSC/{id}")]
        public IActionResult GetServiceComponentsReportSC(string id)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceComponentsReportSC(id)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetServiceComponentsReport_DxList")]
        public IActionResult GetServiceComponentsReport_DxList([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetServiceComponentsReport_DxList(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

        [HttpPost]
        [Route("GetReportCuestionarioEspirometria_ALL")]
        public IActionResult GetReportCuestionarioEspirometria_ALL([FromBody] filtroServicioComponenteRequest obj)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                return Ok(_ResponseDTO.Success(_ResponseDTO, _ordenreporte.GetReportCuestionarioEspirometria_ALL(obj)));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }

    }
}

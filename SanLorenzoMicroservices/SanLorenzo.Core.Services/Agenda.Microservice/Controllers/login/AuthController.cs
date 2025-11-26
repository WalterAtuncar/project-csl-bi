using Data.Model;
using Data.Model.Request.login;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Business.Logic.IContractsBL.person;

namespace Agenda.Microservice.Controllers.login
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private ISystemUserLogic _systemUserLogic;
        public ResponseDTO _ResponseDTO;
        public AuthController(ISystemUserLogic systemUserLogic)
        {
            _systemUserLogic = systemUserLogic;
        }

        [HttpPost]
        [Route("Login")]
        public IActionResult Login([FromBody] UserLogin request)
        {
            _ResponseDTO = new ResponseDTO();
            try
            {
                var response = _systemUserLogic.login(request);
                return Ok(_ResponseDTO.Success(_ResponseDTO, response));
            }
            catch (Exception e)
            {
                return BadRequest(_ResponseDTO.Failed(_ResponseDTO, e.Message));
            }
        }
    }
}

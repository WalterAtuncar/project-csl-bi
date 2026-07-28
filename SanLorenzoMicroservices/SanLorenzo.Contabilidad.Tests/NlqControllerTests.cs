using System.Threading;
using System.Threading.Tasks;
using Contabilidad.Controllers;
using Contabilidad.Infrastructure;
using Contabilidad.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Contabilidad.Tests
{
    /// <summary>GATE F4: con Nlq:Enabled=false todos los endpoints responden 404 (killswitch).</summary>
    public class NlqControllerTests
    {
        private static NlqController ControllerConFlag(bool enabled)
        {
            // service/repo null: con el flag OFF el 404 sale ANTES de tocarlos.
            return new NlqController(
                service: null,
                repo: null,
                opt: Options.Create(new NlqOptions { Enabled = enabled }),
                log: NullLogger<NlqController>.Instance);
        }

        [Fact]
        public async Task Preguntar_con_flag_off_devuelve_404()
        {
            var ctrl = ControllerConFlag(false);
            var r = await ctrl.Preguntar(new NlqPreguntarRequest { Pregunta = "ventas de enero" }, CancellationToken.None);
            Assert.IsType<NotFoundResult>(r);
        }

        [Fact]
        public void Catalogo_con_flag_off_devuelve_404()
        {
            var ctrl = ControllerConFlag(false);
            Assert.IsType<NotFoundResult>(ctrl.Catalogo());
        }

        [Fact]
        public void ListarGuardadas_con_flag_off_devuelve_404()
        {
            var ctrl = ControllerConFlag(false);
            Assert.IsType<NotFoundResult>(ctrl.ListarGuardadas());
        }
    }
}

using System;
using Contabilidad.Infrastructure;
using Contabilidad.Infrastructure.Nlq;
using Xunit;

namespace Contabilidad.Tests
{
    /// <summary>
    /// GATE F4: throttle por usuario (MaxPreguntasMin) + presupuesto diario de tokens (PresupuestoTokensDia).
    /// Reloj inyectado para determinismo (sin sleeps).
    /// </summary>
    public class NlqGuardTests
    {
        private sealed class Reloj
        {
            public DateTime Ahora = new DateTime(2026, 7, 28, 10, 0, 0, DateTimeKind.Utc);
            public Func<DateTime> Fn => () => Ahora;
        }

        [Fact]
        public void Throttle_bloquea_al_superar_el_maximo_por_minuto()
        {
            var reloj = new Reloj();
            var guard = new NlqGuard(new NlqOptions { MaxPreguntasMin = 3, PresupuestoTokensDia = 0 }, reloj.Fn);

            guard.AdmitirPregunta(7);
            guard.AdmitirPregunta(7);
            guard.AdmitirPregunta(7);
            Assert.Throws<NlqLimiteExcedidoException>(() => guard.AdmitirPregunta(7));

            // Otro usuario no se ve afectado.
            guard.AdmitirPregunta(99);
        }

        [Fact]
        public void Throttle_se_libera_al_pasar_la_ventana()
        {
            var reloj = new Reloj();
            var guard = new NlqGuard(new NlqOptions { MaxPreguntasMin = 2 }, reloj.Fn);

            guard.AdmitirPregunta(7);
            guard.AdmitirPregunta(7);
            Assert.Throws<NlqLimiteExcedidoException>(() => guard.AdmitirPregunta(7));

            reloj.Ahora = reloj.Ahora.AddSeconds(61);
            guard.AdmitirPregunta(7);   // ya no lanza
        }

        [Fact]
        public void Throttle_deshabilitado_si_max_es_cero()
        {
            var guard = new NlqGuard(new NlqOptions { MaxPreguntasMin = 0 });
            for (int i = 0; i < 50; i++) guard.AdmitirPregunta(1);   // no lanza nunca
        }

        [Fact]
        public void Presupuesto_diario_bloquea_al_agotarse()
        {
            var reloj = new Reloj();
            var guard = new NlqGuard(new NlqOptions { PresupuestoTokensDia = 1000, MaxPreguntasMin = 0 }, reloj.Fn);

            guard.VerificarPresupuesto(7);           // 0 consumido: OK
            guard.RegistrarConsumo(7, 400, 300);     // 700
            guard.VerificarPresupuesto(7);           // 700 < 1000: OK
            guard.RegistrarConsumo(7, 200, 200);     // 1100 >= 1000
            Assert.Throws<NlqLimiteExcedidoException>(() => guard.VerificarPresupuesto(7));
            Assert.Equal(1100L, guard.TokensConsumidosHoy(7));
        }

        [Fact]
        public void Presupuesto_se_reinicia_al_cambiar_de_dia()
        {
            var reloj = new Reloj();
            var guard = new NlqGuard(new NlqOptions { PresupuestoTokensDia = 1000 }, reloj.Fn);

            guard.RegistrarConsumo(7, 900, 200);     // 1100 hoy
            Assert.Throws<NlqLimiteExcedidoException>(() => guard.VerificarPresupuesto(7));

            reloj.Ahora = reloj.Ahora.AddDays(1);
            Assert.Equal(0L, guard.TokensConsumidosHoy(7));
            guard.VerificarPresupuesto(7);           // dia nuevo: OK
        }
    }
}

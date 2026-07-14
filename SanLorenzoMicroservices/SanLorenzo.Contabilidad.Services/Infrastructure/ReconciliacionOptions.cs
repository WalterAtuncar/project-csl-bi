namespace Contabilidad.Infrastructure
{
    /// <summary>
    /// Configuracion del poller de reconciliacion de caja legacy (seccion "Reconciliacion" de appsettings).
    /// Overrideable por env vars con el patron Reconciliacion__Enabled, Reconciliacion__Modo, etc.
    /// KILL SWITCH: Enabled nace en false.
    /// </summary>
    public class ReconciliacionOptions
    {
        public bool Enabled { get; set; } = false;
        public string Modo { get; set; } = "Observacion";           // Observacion | Escritura
        public string PisoFecha { get; set; } = "2026-07-01";
        // Sin inicializador por defecto: el binder de config concatena arrays con el default (duplicaria
        // los horarios). Viene de appsettings; si faltara, el scheduler cae a su set por defecto interno.
        public string[] Horarios { get; set; }
        public string TimeZone { get; set; } = "SA Pacific Standard Time";  // Lima en Windows
        public int VentanaBarridoCortoDias { get; set; } = 7;
        public int CommandTimeoutSeconds { get; set; } = 300;
        public int ReintentoMinutos { get; set; } = 5;
    }
}

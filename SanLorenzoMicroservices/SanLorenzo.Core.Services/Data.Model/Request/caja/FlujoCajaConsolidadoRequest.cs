using System.Collections.Generic;

namespace Data.Model.Request.caja
{
    public class FlujoCajaConsolidadoRequest
    {
        public int Anio { get; set; }
        // Array opcional: una, varias o ninguna (todas) unidades de negocio
        public List<int> IdsTipoCaja { get; set; } = new List<int>();
        // 'I' ingresos, 'E' egresos, null ambos
        public string TipoMovimiento { get; set; }
    }
}
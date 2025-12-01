using System.Collections.Generic;

namespace Data.Model.Request.caja
{
    public class FlujoCajaDetalladoRequest
    {
        public int Anio { get; set; }
        // Lista opcional de tipos de caja (si vacía o null, se toman todos)
        public List<int> IdsTipoCaja { get; set; } = new List<int>();
        // 'I' ingresos, 'E' egresos, null ambos
        public string TipoMovimiento { get; set; }
    }
}
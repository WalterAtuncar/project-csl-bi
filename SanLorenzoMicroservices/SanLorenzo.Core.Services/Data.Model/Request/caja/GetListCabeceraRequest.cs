using System;

namespace Data.Model.Request.caja
{
    public class GetListCabeceraRequest
    {
        public string Anio { get; set; }
        public string Mes { get; set; }
        public byte? EstadoCierre { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }
}
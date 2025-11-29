using System;

namespace Data.Model.Response.caja
{
    public class DeleteCajaMayorCierreResponse
    {
        public int IdCajaMayorCierre { get; set; }
        public int RowsAffected { get; set; }
        public string Mensaje { get; set; }
    }
}
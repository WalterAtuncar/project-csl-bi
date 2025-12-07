namespace Data.Model.Request.caja
{
    public class DeleteRegistroComprasRequest
    {
        public int IdRegistroCompra { get; set; }
        public int IdCajaMayorCierre { get; set; }
        public int EliminaIdUsuario { get; set; }
    }
}

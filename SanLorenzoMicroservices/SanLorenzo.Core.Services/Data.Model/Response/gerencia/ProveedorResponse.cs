using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.gerencia
{
    public class ProveedorResponse
    {
        public string v_IdProveedor { get; set; }
        public string v_RazonSocial { get; set; }
        public string v_RUC { get; set; }
        public string v_Direccion { get; set; }
        public string v_Representante { get; set; }
        public string v_Celular { get; set; }
        public string v_Email { get; set; }
        public int? i_Activo { get; set; }


        public int? i_Eliminado { get; set; }
        public int? i_InsertaIdUsuario { get; set; }
        public DateTime t_InsertaFecha { get; set; }
        public int? i_ActualizaIdUsuario { get; set; }
        public DateTime t_ActualizaFecha { get; set; }
        public string v_HistActualizacioones { get; set; }
        public string v_Observaciones { get; set; }
    }
}

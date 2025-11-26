using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Response.gerencia
{
    public class MarcaResponse
    {
        public string v_IdMarca { get; set; }
        public string v_CodInterno { get; set; }
        public string v_Descripcion { get; set; }
        public int? i_Eliminado { get; set; }
        public int? i_InsertaIdUsuario { get; set; }
        public DateTime t_InsertaFecha { get; set; }
        public int? i_ActualizaIdUsuario { get; set; }
        public DateTime t_ActualizaFecha { get; set; }
        public string v_HistActualizacioones { get; set; }
        public string v_Observaciones { get; set; }
    }
}

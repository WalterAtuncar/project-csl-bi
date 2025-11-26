using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Request.calendar
{
    public class calendarListRequest
    {
        public string? nroDoc { get; set; }
        public string? fi { get; set; }
        public string? ff { get; set; }
        public int? servicio { get; set; }
        public int? modalidad { get; set; }
        public int? cola { get; set; }
        public int? vip { get; set; }
        public int? estadoCita { get; set; }
        public string? paciente { get; set; }
    }
}

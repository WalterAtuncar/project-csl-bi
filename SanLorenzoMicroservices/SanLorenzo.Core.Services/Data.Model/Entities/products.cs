using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities
{
    public class products
    {
        [ExplicitKey]
        public long ProductId { get; set; }
        public string Name { get; set; }
        public string StatusName { get; set; }
        public int? Stock { get; set; }
        public string Description { get; set; }
        public decimal? Price { get; set; }
        public decimal? Discount { get; set; }
        public decimal? FinalPrice { get; set; }
        public int? CategoryID { get; set; }
        public DateTime? CreateDate { get; set; }
        public DateTime? LastUpdated { get; set; }
    }
}

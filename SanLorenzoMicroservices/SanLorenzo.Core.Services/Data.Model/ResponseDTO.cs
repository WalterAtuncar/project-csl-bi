using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model
{
    public class ResponseDTO
    {
        public int status { get; set; }
        public string description { get; set; }
        public object objModel { get; set; }
        public string token { get; set; }
        public object objPaginated { get; set; }

        public ResponseDTO Success(ResponseDTO obj, object objModel, object? objPaginated = null, int? totalRows = null)
        {
            obj.description = "Transaction Sucessfully";
            obj.status = 1;
            obj.objModel = objModel;
            obj.token = token;
            if (objPaginated != null && totalRows.HasValue) 
            {
                obj.objPaginated = Create(objPaginated, totalRows.Value);
            }            
            return obj;
        }

        private object Create(object objPaginated, int value)
        {
            if (objPaginated == null) return null;
            
            // Obtener page y pageSize del objeto paginado usando reflection
            var type = objPaginated.GetType();
            var pageProp = type.GetProperty("Page") ?? type.GetProperty("page");
            var pageSizeProp = type.GetProperty("PageSize") ?? type.GetProperty("pageSize");
            
            int page = 1;
            int pageSize = 10;
            
            if (pageProp != null && pageProp.GetValue(objPaginated) != null)
                page = Convert.ToInt32(pageProp.GetValue(objPaginated));
                
            if (pageSizeProp != null && pageSizeProp.GetValue(objPaginated) != null)
                pageSize = Convert.ToInt32(pageSizeProp.GetValue(objPaginated));
            
            int totalPages = (int)Math.Ceiling((double)value / pageSize);
            
            return new
            {
                totalRows = value,
                page = page,
                pageSize = pageSize,
                totalPages = totalPages,
                hasPreviousPage = page > 1,
                hasNextPage = page < totalPages
            };
        }

        public ResponseDTO Failed(ResponseDTO obj, string e)
        {

            obj.description = e;
            obj.status = 0;
            return obj;
        }
    }
}

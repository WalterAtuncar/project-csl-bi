using Dapper.Contrib.Extensions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Data.Model.Entities.person
{
    public class multimediafile
    {
        [ExplicitKey]
        public string v_MultimediaFileId { get; set; }
        public string v_PersonId { get; set; }
        public string v_FileName { get; set; }
        public byte[] b_File { get; set; }
        public byte[] b_ThumbnailFile { get; set; }
        public string v_Comment { get; set; }
        public int? i_IsDeleted { get; set; }
        public int? i_InsertUserId { get; set; }
        public DateTime? d_InsertDate { get; set; }
        public int? i_UpdateUserId { get; set; }
        public DateTime? d_UpdateDate { get; set; }
        public string v_ComentaryUpdate { get; set; }
    }
}

using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class InspectionTask
{
    public int Taskid { get; set; }

    public int Projectid { get; set; }

    public int Templateid { get; set; }

    /// <summary>
    /// 1、进行中/2、完成/3、未开始
    /// </summary>
    public int Status { get; set; }

    public string? TaskNo { get; set; }

    public int? Assigneduserid { get; set; }

    public DateTime? Completetime { get; set; }

    public int Productid { get; set; }
}

using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class Task
{
    public int Taskid { get; set; }

    public int? Projectid { get; set; }

    public int? Templateid { get; set; }

    /// <summary>
    /// 进行中/完成/未开始
    /// </summary>
    public string? Status { get; set; }

    public string? TaskNo { get; set; }

    public int? Assigneduserid { get; set; }

    public DateTime? Completetime { get; set; }

    public int? Productid { get; set; }
}

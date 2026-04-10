using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class Project
{
    public int Projectid { get; set; }

    public string? Projectname { get; set; }

    public int? Companyid { get; set; }

    public int? Managerid { get; set; }

    public int? Assigneduserid { get; set; }

    /// <summary>
    /// 1. 进行中
    /// 2. 已完成
    /// 3. 已关闭
    /// </summary>
    public int Projectstatus { get; set; }

    public DateOnly Createdate { get; set; }
}

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

    public int Productid { get; set; }

    /// <summary>
    /// 1、设备检测
    /// 2、外围检测
    /// </summary>
    public int Inspectiontype { get; set; }

    public bool Ifdel { get; set; }

    public string? Assignedusername { get; set; }

    public int Version { get; set; }

    public DateTime? DownloadedAt { get; set; }

    public DateTime? LocalUpdatedAt { get; set; }

    public string? DownloadDeviceName { get; set; }
}

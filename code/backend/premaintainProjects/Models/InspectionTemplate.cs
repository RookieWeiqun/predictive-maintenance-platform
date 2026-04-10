using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

/// <summary>
/// 外围和设备检测的模板
/// </summary>
public partial class InspectionTemplate
{
    public int Templateid { get; set; }

    public string? Name { get; set; }

    public string? Productcategory { get; set; }

    public string? Description { get; set; }

    /// <summary>
    /// 1、设备检测
    /// 2、外围检测
    /// </summary>
    public int Inspectiontype { get; set; }

    public string? Mlfb { get; set; }

    public DateOnly? Createdate { get; set; }
}

using System;
using System.Collections.Generic;

namespace premaintainProjects.Models;

public partial class Taskitem
{
    public Guid Itemid { get; set; }

    public int? Taskid { get; set; }

    public string? Taskname { get; set; }

    public string? Categorypath { get; set; }

    public string? Taskresult { get; set; }

    public bool Isnormal { get; set; }

    public bool Isrecheck { get; set; }

    public DateTime Createtime { get; set; }

    /// <summary>
    /// 1.pending 待执行。任务包刚下发或尚未填写结果时使用。
    /// 2.
    /// completed 已执行并已填写结果。
    /// 
    /// 3.skipped 本次现场决定跳过该项，但该项原本是计划中的标准检查项。
    /// 4. not_applicable 该项对当前设备或现场不适用。
    /// 5.
    /// recheck_required 已执行，但需要后续复检或二次确认。
    /// </summary>
    public short ExecutionStatus { get; set; }

    public DateTime? Updatetime { get; set; }

    /// <summary>
    /// 1. system_generated
    /// 2.manual_added
    /// </summary>
    public short SourceType { get; set; }

    public string? RenderSchemaJson { get; set; }

    public int? Inspectionitemid { get; set; }

    public string? Recommendedrules { get; set; }

    public string? Recommendationcontent { get; set; }

    public string? Hiddenhazardcontent { get; set; }

    public string? Maintenanceinstructions { get; set; }

    public string? Displaycondition { get; set; }

    public string? Operationguide { get; set; }

    public int SortOrder { get; set; }
}

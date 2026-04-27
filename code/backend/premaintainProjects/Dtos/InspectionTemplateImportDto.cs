using Microsoft.EntityFrameworkCore;
using premaintainProjects.Controllers;
using premaintainProjects.Models;
using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Text.Json;

namespace premaintainProjects.Dtos { 
/// <summary>
/// 完整导入模板请求DTO
/// </summary>
public class ImportInspectionTemplateDto
{
    [Required(ErrorMessage = "模板名称不能为空")]
    public string Name { get; set; }

    public string? ProductCategory { get; set; }
    public string? Description { get; set; }
    public int InspectionType { get; set; } = 1;
    public string? Mlfb { get; set; }

    /// <summary>
    /// 递归分类列表（顶层分类parent_id=0）
    /// </summary>
    [Required(ErrorMessage = "至少需要一个分类")]
    public List<InspectionCategoryImportDto> Categories { get; set; } = new();
}

/// <summary>
/// 递归分类导入DTO
/// </summary>
public class InspectionCategoryImportDto
{
    [Required(ErrorMessage = "分类名称不能为空")]
    public string Name { get; set; }

    public int SortOrder { get; set; } = 1;

    /// <summary>
    /// 子分类（递归）
    /// </summary>
    public List<InspectionCategoryImportDto> Children { get; set; } = new();

    /// <summary>
    /// 当前分类下的检查项（强制至少一个）
    /// </summary>
    [Required(ErrorMessage = "每个分类必须包含至少一个检查项")]
    [MinLength(1, ErrorMessage = "每个分类必须包含至少一个检查项")]
    public List<InspectionItemImportDto> Items { get; set; } = new();
}

/// <summary>
/// 检查项导入DTO
/// </summary>
public class InspectionItemImportDto
{
    [Required(ErrorMessage = "检查项名称不能为空")]
    public string Name { get; set; }

    public string? ValueType { get; set; } = "number";
    public string? RuleType { get; set; } = "number_range";

    /// <summary>
    /// 阈值（JSON对象/字符串，自动处理为JSONB）
    /// </summary>
    /// // 前端可传：null / "" / {} / [] / 数字 / 字符串
    public object? Threshold { get; set; }

    public int SortOrder { get; set; } = 1;
    public string? Priority { get; set; }
}

public class InspectionTaskDetailDto
{
    public InspectionTask Task { get; set; } = null!;
    public List<TaskitemDetailDto> Taskitems { get; set; } = new();
}

    public class UploadAttachmentDto
    {
        public Guid Itemid { get; set; }
        public IFormFile file { get; set; } = null!;
    }

    public class TaskitemDetailDto
    {
        public Guid Itemid { get; set; }

        public int? Taskid { get; set; }

        public string? Taskname { get; set; }

        public string? Categorypath { get; set; }

        public string? Taskresult { get; set; }

        public bool Isnormal { get; set; }

        public bool Isrecheck { get; set; }

        public string? Photopath { get; set; }

        public DateTime? Createtime { get; set; }

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

        public DateTime Updatetime { get; set; }

        public int Version { get; set; }

        /// <summary>
        /// 1. system_generated
        /// 2.manual_added
        /// </summary>
        public short SourceType { get; set; }

        public string? RenderSchemaJson { get; set; }

        public int? Inspectionitemid { get; set; }

        public string? AssignedUserName { get; set; }

        public string? DownloadDeviceName { get; set; }

        public string? DownloadedAt { get; set; }

        public string? LocalUpdatedAt { get; set; }
        public List<Attachment> Attachments { get; set; } = new();
    }
}
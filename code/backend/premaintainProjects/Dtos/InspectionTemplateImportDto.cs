using System.ComponentModel.DataAnnotations;
using System.Text.Json;

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

public partial class InspectionTask4Equipment
{
    public int Projectid { get; set; }

    public int Templateid { get; set; }

    /// <summary>
    /// 1、进行中/2、完成/3、未开始
    /// </summary>
    public int Status { get; set; }

    public string? TaskNo { get; set; }

    public int? Assigneduserid { get; set; }

    public int Equipmentid { get; set; }

    /// <summary>
    /// 1、设备检测
    /// 2、外围检测
    /// </summary>
    public int Inspectiontype { get; set; }
}
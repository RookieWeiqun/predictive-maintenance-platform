using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.EntityFrameworkCore;
using premaintainProjects.Models;
using System.Reflection;

namespace premaintainProjects.Services;

public class ReportService
{
    private readonly PredictiveMaintenancePlatformContext _context;
    private readonly IWebHostEnvironment _env;

    public ReportService(PredictiveMaintenancePlatformContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }

    public async Task<string> GenerateProjectReportAsync(int projectId)
    {
        var project = await _context.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Projectid == projectId);

        if (project == null)
            throw new InvalidOperationException("项目不存在");

        var company = await _context.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Companyid == project.Companyid);

        var projectEquipments = await _context.ProjectEquipments
            .AsNoTracking()
            .Where(pe => pe.Projectid == projectId && pe.Ifdel != true)
            .ToListAsync();

        var equipmentIds = projectEquipments
            .Select(x => x.Equipmentid)
            .Distinct()
            .ToList();

        var equipments = await _context.Equipments
            .AsNoTracking()
            .Where(e => equipmentIds.Contains(e.Equipid))
            .ToDictionaryAsync(e => e.Equipid);

        var products = await _context.Products
            .AsNoTracking()
            .Where(p => p.Equipid.HasValue && equipmentIds.Contains(p.Equipid.Value))
            .ToListAsync();

        var reportEquipments = projectEquipments
            .Where(pe => equipments.ContainsKey(pe.Equipmentid))
            .Select(pe =>
            {
                var equipment = equipments[pe.Equipmentid];

                return new ReportEquipmentDto
                {
                    Peid = pe.Peid,
                    Equipmentid = pe.Equipmentid,
                    ElectricRoom = GetStringProperty(equipment, "Electricroom", "ElectricRoom"),
                    EquipmentName = GetStringProperty(equipment, "Equipmentname", "EquipmentName", "Name"),
                    Mlfb = GetStringProperty(equipment, "Mlfb"),
                    Department = GetStringProperty(equipment, "Department"),
                    EquipmentNumber = GetStringProperty(equipment, "Equipmentnumber", "EquipmentNumber"),
                    Products = products
                        .Where(p => p.Equipid.HasValue && p.Equipid.Value == pe.Equipmentid)
                        .Select(p => new ReportProductDto
                        {
                            Productid = p.Productid,
                            Serialno = p.Serialno
                        })
                        .ToList()
                };
            })
            .ToList();

        var productCount = products.Count;
        var equipmentCount = projectEquipments.Count;
        var taskCount = await _context.InspectionTasks
            .AsNoTracking()
            .CountAsync(x => x.Projectid == projectId && x.Ifdel != true);

        var templatePath = Path.Combine(_env.ContentRootPath, "Reports", "reportTemplate.docx");
        if (!File.Exists(templatePath))
            throw new FileNotFoundException("报告模板不存在", templatePath);

        var projectName = GetStringProperty(project, "Projectname", "ProjectName", "Name");
        var companyName = company == null ? string.Empty : GetStringProperty(company, "Companyname", "CompanyName", "Name");
        var factory = GetStringProperty(project, "Description");

        await using var fileStream = new FileStream(templatePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        using var memoryStream = new MemoryStream();
        await fileStream.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        using (var wordDoc = WordprocessingDocument.Open(memoryStream, true))
        {
            var mainPart = wordDoc.MainDocumentPart
                ?? throw new InvalidOperationException("Word 模板缺少 MainDocumentPart");

            var document = mainPart.Document;
            var body = document.Body
                ?? throw new InvalidOperationException("Word 模板缺少 Body");

            ReplacePlaceholder(document, "{{ProjectName}}", projectName);
            ReplacePlaceholder(document, "{{CompanyName}}", companyName);
            ReplacePlaceholder(document, "{{companyname}}", companyName);
            ReplacePlaceholder(document, "{{Createdate}}", project.Createdate.ToString("yyyy-MM-dd"));
            ReplacePlaceholder(document, "{{EquipmentCount}}", equipmentCount.ToString());
            ReplacePlaceholder(document, "{{ProductCount}}", productCount.ToString());
            ReplacePlaceholder(document, "{{TaskCount}}", taskCount.ToString());
            ReplacePlaceholder(document, "{{factory}}", factory);

            foreach (var eq in reportEquipments)
            {
                body.Append(CreateEmptyParagraph());
                body.Append(CreateTextParagraph($"{companyName}公司{factory}车间西门子驱动装置维护清单", true));
                body.Append(CreateEquipmentTable(eq));
            }

            document.Save();
        }

        var fileName = $"项目报告_{projectId}_{DateTime.Now:yyyyMMddHHmmss}.docx";

        var reportDirectory = Path.GetDirectoryName(templatePath)
            ?? throw new InvalidOperationException("无法获取模板目录");

        var outputPath = Path.Combine(reportDirectory, fileName);

        await File.WriteAllBytesAsync(outputPath, memoryStream.ToArray());

        return outputPath;
    }

    private static void ReplacePlaceholder(Document document, string placeholder, string value)
    {
        foreach (var text in document.Descendants<Text>())
        {
            if (text.Text.Contains(placeholder, StringComparison.Ordinal))
            {
                text.Text = text.Text.Replace(placeholder, value ?? string.Empty, StringComparison.Ordinal);
            }
        }
    }

    private static Paragraph CreateEmptyParagraph()
    {
        return new Paragraph(new Run(new Text("")));
    }

    private static Paragraph CreateTextParagraph(string text, bool bold = false)
    {
        var runProperties = new RunProperties();
        if (bold)
            runProperties.Append(new Bold());

        return new Paragraph(
            new Run(
                runProperties,
                new Text(text ?? string.Empty) { Space = SpaceProcessingModeValues.Preserve }
            ));
    }

    private static Table CreateEquipmentTable(ReportEquipmentDto eq)
    {
        var table = new Table();

        var props = new TableProperties(
            new TableBorders(
                new TopBorder { Val = BorderValues.Single, Size = 4 },
                new BottomBorder { Val = BorderValues.Single, Size = 4 },
                new LeftBorder { Val = BorderValues.Single, Size = 4 },
                new RightBorder { Val = BorderValues.Single, Size = 4 },
                new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4 },
                new InsideVerticalBorder { Val = BorderValues.Single, Size = 4 }
            )
        );

        table.AppendChild(props);

        table.Append(
            CreateRow("序号", "电气室", "设备名称", "设备型号", "序列号", "所属部门", "设备编号")
        );

        if (eq.Products.Count == 0)
        {
            table.Append(
                CreateRow(
                    "1",
                    eq.ElectricRoom,
                    eq.EquipmentName,
                    eq.Mlfb,
                    string.Empty,
                    eq.Department,
                    eq.EquipmentNumber)
            );
        }
        else
        {
            for (int i = 0; i < eq.Products.Count; i++)
            {
                var product = eq.Products[i];
                table.Append(
                    CreateRow(
                        (i + 1).ToString(),
                        eq.ElectricRoom,
                        eq.EquipmentName,
                        eq.Mlfb,
                        product.Serialno,
                        eq.Department,
                        eq.EquipmentNumber)
                );
            }
        }

        return table;
    }

    private static TableRow CreateRow(params string?[] values)
    {
        var row = new TableRow();

        foreach (var value in values)
        {
            row.Append(
                new TableCell(
                    new Paragraph(
                        new Run(
                            new Text(value ?? string.Empty)
                            {
                                Space = SpaceProcessingModeValues.Preserve
                            }
                        )
                    )
                )
            );
        }

        return row;
    }

    private static string GetStringProperty(object source, params string[] propertyNames)
    {
        foreach (var name in propertyNames)
        {
            var prop = source.GetType().GetProperty(
                name,
                BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

            if (prop != null)
            {
                var value = prop.GetValue(source);
                return value?.ToString() ?? string.Empty;
            }
        }

        return string.Empty;
    }
}

public class ReportEquipmentDto
{
    public int Peid { get; set; }
    public int Equipmentid { get; set; }
    public string? ElectricRoom { get; set; }
    public string? EquipmentName { get; set; }
    public string? Mlfb { get; set; }
    public string? Department { get; set; }
    public string? EquipmentNumber { get; set; }
    public List<ReportProductDto> Products { get; set; } = new();
}

public class ReportProductDto
{
    public int Productid { get; set; }
    public string? Serialno { get; set; }
}
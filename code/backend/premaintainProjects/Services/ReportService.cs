using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.EntityFrameworkCore;
using premaintainProjects.Models;
using System.Text.Json;
using A = DocumentFormat.OpenXml.Drawing;
using DW = DocumentFormat.OpenXml.Drawing.Wordprocessing;
using PIC = DocumentFormat.OpenXml.Drawing.Pictures;

namespace premaintainProjects.Services;

public class ReportService
{
    private readonly PredictiveMaintenancePlatformContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly ServiceTools _serviceTools;
    private const string FullTableWidth = "5000";

    public ReportService(PredictiveMaintenancePlatformContext context, IWebHostEnvironment env, ServiceTools serviceTools)
    {
        _context = context;
        _env = env;
        _serviceTools = serviceTools;
    }


    public async Task<string> GenerateProjectReportAsync(int projectId)
    {
        var project = await _context.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Projectid == projectId);

        if (project == null)
            throw new InvalidOperationException("项目不存在");


        Report report = await _context.Reports
            .FirstOrDefaultAsync(r => r.Projectid == projectId)
            ?? new Report
            {
                Projectid = projectId,
                Createdate = DateOnly.FromDateTime(DateTime.Now)
            };

        if (report.Reportid == 0)
        {
            _context.Reports.Add(report);
        }

        var company = await _context.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Companyid == project.Companyid);

        var projectEquipments = await _context.ProjectEquipments
            .AsNoTracking()
            .Where(x => x.Projectid == projectId && x.Ifdel == false)
            .ToListAsync();

        var equipmentIds = projectEquipments
            .Select(x => x.Equipmentid)
            .Distinct()
            .ToList();

        var equipments = await _context.Equipments
            .AsNoTracking()
            .Where(x => equipmentIds.Contains(x.Equipid))
            .ToDictionaryAsync(x => x.Equipid);

        var products = await _context.Products
            .AsNoTracking()
            .Where(x => x.Equipid.HasValue && equipmentIds.Contains(x.Equipid.Value))
            .ToListAsync();

        var productDict = products.ToDictionary(x => x.Productid, x => x);

        var tasks = await _context.InspectionTasks
            .AsNoTracking()
            .Where(x => x.Projectid == projectId && x.Ifdel == false)
            .ToListAsync();

        var taskIds = tasks
            .Select(x => x.Taskid)
            .Distinct()
            .ToList();

        var taskitems = await _context.Taskitems
            .AsNoTracking()
            .Where(x => x.Taskid.HasValue && taskIds.Contains(x.Taskid.Value))
            .OrderBy(x => x.Taskid)
            .ThenBy(x => x.Categorypath)
            .ThenBy(x => x.Taskname)
            .ToListAsync();

        var taskitemIds = taskitems
            .Select(x => x.Itemid)
            .Distinct()
            .ToList();

        var attachments = await _context.Attachments
            .AsNoTracking()
            .Where(x => taskitemIds.Contains(x.Taskitemid))
            .ToListAsync();

        var reportEquipments = projectEquipments
            .Where(pe => equipments.ContainsKey(pe.Equipmentid))
            .GroupBy(pe => pe.Equipmentid)
            .Select(g => g.OrderBy(x => x.Peid).First())
            .Select(pe =>
            {
                var equipment = equipments[pe.Equipmentid];

                return new ReportEquipmentDto
                {
                    Peid = pe.Peid,
                    Equipmentid = pe.Equipmentid,
                    Factory = equipment.Factory,
                    ElectricRoom = equipment.Electricroom,
                    Workshop = equipment.Workshop,
                    Mlfb = equipment.Mlfb,
                    Products = products
                        .Where(p => p.Equipid.HasValue && p.Equipid.Value == pe.Equipmentid)
                        .GroupBy(p => p.Productid)
                        .Select(g => g.First())
                        .Select(p => new ReportProductDto
                        {
                            Productid = p.Productid,
                            Serialno = p.Serialno,
                            EquipmentName = p.Equipmentname,
                            Department = p.Department,
                            EquipmentNumber = p.Equipmentnumber
                        })
                        .ToList()
                };
            })
            .ToList();


        var detailGroups = tasks
            .Where(t => productDict.ContainsKey(t.Productid))
            .SelectMany(task =>
            {
                var product = productDict[task.Productid];
                if (!product.Equipid.HasValue || !equipments.ContainsKey(product.Equipid.Value))
                    return Enumerable.Empty<(string ElectricRoom, string? EquipmentName, string? EquipmentNumber, string? Factory, string CategoryPath, ReportDetailRowDto Row)>();

                var equipment = equipments[product.Equipid.Value];

                return taskitems
                    .Where(i => i.Taskid == task.Taskid)
                    .Select(item => (
                        ElectricRoom: equipment.Electricroom ?? string.Empty,
                        EquipmentName: product.Equipmentname,
                        EquipmentNumber: product.Equipmentnumber,
                        Factory: equipment.Factory,
                        CategoryPath: item.Categorypath ?? string.Empty,
                        Row: new ReportDetailRowDto
                        {
                            TaskName = item.Taskname ?? string.Empty,
                            ResultState = GetJsonValue(item.Taskresult, "resultState"),
                            Value = GetJsonValue(item.Taskresult, "value"),
                            HiddenHazardContent = GetJsonValue(item.Taskresult, "hiddenhazardcontent", "hiddenHazardContent"),
                            MaintenanceInstructions = GetJsonValue(item.Taskresult, "maintenanceinstructions", "maintenanceInstructions"),
                            Remarks = GetJsonValue(item.Taskresult, "remarks"),
                            HazardResolved = GetJsonValue(item.Taskresult, "hazardResolved")
                        }));
            })
            .GroupBy(x => new
            {
                x.ElectricRoom,
                x.EquipmentName,
                x.EquipmentNumber,
                x.Factory,
                x.CategoryPath
            })
            .Select(g => new ReportDetailGroupDto
            {
                ElectricRoom = g.Key.ElectricRoom,
                EquipmentName = g.Key.EquipmentName,
                EquipmentNumber = g.Key.EquipmentNumber,
                Factory = g.Key.Factory,
                CategoryPath = g.Key.CategoryPath,
                Rows = g.Select(x => x.Row)
                    .DistinctBy(r => new
                    {
                        r.TaskName,
                        r.ResultState,
                        r.Value,
                        r.HiddenHazardContent,
                        r.MaintenanceInstructions,
                        r.Remarks
                    })
                    .ToList()
            })
            .OrderBy(x => x.ElectricRoom)
            .ThenBy(x => x.EquipmentName)
            .ThenBy(x => x.EquipmentNumber)
            .ThenBy(x => x.CategoryPath)
            .ToList();

        var outerDetailGroups = tasks
            .Where(t => t.Inspectiontype == 2 && t.Productid == 0)
            .SelectMany(task =>
                taskitems
                    .Where(i => i.Taskid == task.Taskid)
                    .Select(item => (
                        DownloadDeviceName: task.DownloadDeviceName ?? string.Empty,
                        CategoryPath: item.Categorypath ?? string.Empty,
                        Row: new ReportDetailRowDto
                        {
                            TaskName = item.Taskname ?? string.Empty,
                            ResultState = GetJsonValue(item.Taskresult, "resultState"),
                            Value = GetJsonValue(item.Taskresult, "value"),
                            HiddenHazardContent = GetJsonValue(item.Taskresult, "hiddenhazardcontent", "hiddenHazardContent"),
                            MaintenanceInstructions = GetJsonValue(item.Taskresult, "maintenanceinstructions", "maintenanceInstructions"),
                            Remarks = GetJsonValue(item.Taskresult, "remarks"),
                            HazardResolved = GetJsonValue(item.Taskresult, "hazardResolved")
                        }))
            )
            .GroupBy(x => new
            {
                x.DownloadDeviceName,
                x.CategoryPath
            })
            .Select(g => new ReportDetailGroupDto
            {
                ElectricRoom = "外围检测",
                EquipmentName = g.Key.DownloadDeviceName,
                EquipmentNumber = string.Empty,
                Factory = string.Empty,
                CategoryPath = g.Key.CategoryPath,
                Rows = g.Select(x => x.Row)
                    .DistinctBy(r => new
                    {
                        r.TaskName,
                        r.ResultState,
                        r.Value,
                        r.HiddenHazardContent,
                        r.MaintenanceInstructions,
                        r.Remarks
                    })
                    .ToList()
            })
            .OrderBy(x => x.EquipmentName)
            .ThenBy(x => x.CategoryPath)
            .ToList();



        var failResults = tasks
            .Where(t => productDict.ContainsKey(t.Productid))
            .SelectMany(task =>
            {
                var product = productDict[task.Productid];
                if (!product.Equipid.HasValue || !equipments.ContainsKey(product.Equipid.Value))
                    return Enumerable.Empty<ReportFailResultDto>();

                var equipment = equipments[product.Equipid.Value];

                return taskitems
                    .Where(i => i.Taskid == task.Taskid)
                    .Select(item => new
                    {
                        Item = item,
                        ResultState = GetJsonValue(item.Taskresult, "resultState")
                    })
                    .Where(x => string.Equals(x.ResultState, "abnormal", StringComparison.OrdinalIgnoreCase))
                    .Select(x =>
                    {
                        var itemAttachments = attachments
                            .Where(a => a.Taskitemid == x.Item.Itemid)
                            .Select(a => new
                            {
                                Path = ResolveAttachmentPath(a.Filepath),
                                FileName = a.Filename
                            })
                            .Where(a => !string.IsNullOrWhiteSpace(a.Path))
                            .DistinctBy(a => a.Path)
                            .Take(4)
                            .ToList();

                        while (itemAttachments.Count < 4)
                        {
                            itemAttachments.Add(new
                            {
                                Path = string.Empty,
                                FileName = string.Empty
                            });
                        }

                        return new ReportFailResultDto
                        {
                            ElectricRoom = equipment.Electricroom,
                            EquipmentName = product.Equipmentname,
                            Factory = equipment.Factory,
                            Mlfb = equipment.Mlfb,
                            EquipmentNumber = product.Equipmentnumber,
                            Serialno = product.Serialno,
                            CategoryPath = x.Item.Categorypath ?? string.Empty,
                            TaskName = x.Item.Taskname ?? string.Empty,
                            Value = GetJsonValue(x.Item.Taskresult, "value"),
                            Resolution = GetResolutionText(x.Item.Taskresult),
                            ActionTaken = GetJsonValue(x.Item.Taskresult, "actionTaken"),
                            HazardResolved = GetJsonValue(x.Item.Taskresult, "hazardResolved"),
                            RecommendationContent = GetJsonValue(x.Item.Taskresult, "recommendationContent"),
                            Photo1 = itemAttachments[0].Path,
                            Photo2 = itemAttachments[1].Path,
                            Photo3 = itemAttachments[2].Path,
                            Photo4 = itemAttachments[3].Path,
                            Photo1Name = itemAttachments[0].FileName,
                            Photo2Name = itemAttachments[1].FileName,
                            Photo3Name = itemAttachments[2].FileName,
                            Photo4Name = itemAttachments[3].FileName
                        };
                    });
            })
            .DistinctBy(x => new
            {
                x.ElectricRoom,
                x.EquipmentName,
                x.Factory,
                x.Mlfb,
                x.EquipmentNumber,
                x.Serialno,
                x.CategoryPath,
                x.TaskName,
                x.Value,
                x.Resolution,
                x.HazardResolved,
                x.RecommendationContent,
                x.ActionTaken
            })
            .ToList();

        var outerFailResults = tasks
    .Where(t => t.Inspectiontype == 2 && t.Productid == 0)
    .SelectMany(task =>
        taskitems
            .Where(i => i.Taskid == task.Taskid)
            .Select(item => new
            {
                Task = task,
                Item = item,
                ResultState = GetJsonValue(item.Taskresult, "resultState")
            })
            .Where(x => string.Equals(x.ResultState, "abnormal", StringComparison.OrdinalIgnoreCase))
            .Select(x =>
            {
                var itemAttachments = attachments
                    .Where(a => a.Taskitemid == x.Item.Itemid)
                    .Select(a => new
                    {
                        Path = ResolveAttachmentPath(a.Filepath),
                        FileName = a.Filename
                    })
                    .Where(a => !string.IsNullOrWhiteSpace(a.Path))
                    .DistinctBy(a => a.Path)
                    .Take(4)
                    .ToList();

                while (itemAttachments.Count < 4)
                {
                    itemAttachments.Add(new
                    {
                        Path = string.Empty,
                        FileName = string.Empty
                    });
                }

                return new ReportFailResultDto
                {
                    DownloadDeviceName = x.Task.DownloadDeviceName,
                    CategoryPath = x.Item.Categorypath ?? string.Empty,
                    TaskName = x.Item.Taskname ?? string.Empty,
                    Value = GetJsonValue(x.Item.Taskresult, "value"),
                    HazardResolved = GetJsonValue(x.Item.Taskresult, "hazardResolved"),
                    ActionTaken = GetJsonValue(x.Item.Taskresult, "actionTaken"),
                    RecommendationContent = GetJsonValue(x.Item.Taskresult, "recommendationContent"),
                    Photo1 = itemAttachments[0].Path,
                    Photo2 = itemAttachments[1].Path,
                    Photo3 = itemAttachments[2].Path,
                    Photo4 = itemAttachments[3].Path,
                    Photo1Name = itemAttachments[0].FileName,
                    Photo2Name = itemAttachments[1].FileName,
                    Photo3Name = itemAttachments[2].FileName,
                    Photo4Name = itemAttachments[3].FileName
                };
            }))
    .DistinctBy(x => new
    {
        x.DownloadDeviceName,
        x.CategoryPath,
        x.TaskName,
        x.Value,
        x.HazardResolved,
        x.ActionTaken,
        x.RecommendationContent
    })
    .ToList();

        var reportsRoot = Path.Combine(_env.ContentRootPath, "Reports");
        Directory.CreateDirectory(reportsRoot);

        var templatePath = Path.Combine(reportsRoot, "reportTemplate.docx");

        if (!File.Exists(templatePath))
            throw new FileNotFoundException($"报告模板不存在：{templatePath}", templatePath);

        var projectName = project.Projectname ?? string.Empty;
        var companyName = company?.Companyname ?? string.Empty;

        var leadEngineer = await GetUserNameByIdAsync(project.Assigneduserid) ?? string.Empty;
        var siemensContact = await GetUserNameByIdAsync(project.Managerid) ?? string.Empty;

        await using var fileStream = new FileStream(templatePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        using var memoryStream = new MemoryStream();
        await fileStream.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        var abnormalCount = taskitems.Count(x =>
            string.Equals(
                GetJsonValue(x.Taskresult, "resultState"),
                "abnormal",
                StringComparison.OrdinalIgnoreCase));

        var normalCount = taskitems.Count(x =>
            string.Equals(
                GetJsonValue(x.Taskresult, "resultState"),
                "normal",
                StringComparison.OrdinalIgnoreCase));

        var totalCount = abnormalCount + normalCount;

        using (var wordDoc = WordprocessingDocument.Open(memoryStream, true))
        {
            var mainPart = wordDoc.MainDocumentPart
                ?? throw new InvalidOperationException("Word 模板缺少 MainDocumentPart");

            var document = mainPart.Document ?? throw new InvalidOperationException("Word 模板缺少 Document");

            ReplacePlaceholder(document, "{$projectname}", projectName ?? "");
            ReplacePlaceholder(document, "{$city}", project.City ?? "");
            ReplacePlaceholder(document, "{$companyname}", companyName ?? "");
            ReplacePlaceholder(document, "{$Createdate}", project.Createdate.ToString("yyyy-MM-dd"));
            ReplacePlaceholder(document, "{$serviceId}", project.Serviceid?.ToString()??"");
            ReplacePlaceholder(document, "{$customerContact}", project.Customercontact?.ToString()??"");
            ReplacePlaceholder(document, "{$siemensContact}", siemensContact);
            ReplacePlaceholder(document, "{$startDate}", project.Createdate.ToString("yyyy-MM-dd"));
            ReplacePlaceholder(document, "{$endDate}", project.Enddate?.ToString("yyyy-MM-dd") ??"");
            ReplacePlaceholder(document, "{$reportCreateDate}", report.Createdate.ToString("yyyy-MM-dd"));
            ReplacePlaceholder(document, "{$leadEngineer}", leadEngineer);
            ReplacePlaceholder(document, "{$SummaryDescription}", report.Summarydescription ?? string.Empty);
            ReplacePlaceholder(document, "{$SparePartsRecommendation}", report.Sparepartsrecommendation ?? string.Empty);

            ReplacePlaceholder(document, "{$total}", totalCount.ToString());
            ReplacePlaceholder(document, "{$abnormal}", abnormalCount.ToString());
            ReplacePlaceholder(document, "{$normal}", normalCount.ToString());

            var maintainElements = new List<OpenXmlElement>();
            foreach (var eq in reportEquipments)
            {
                maintainElements.Add(CreateEmptyParagraph());
                maintainElements.Add(CreateTextParagraph($"{companyName}公司{eq.Factory}{eq.Workshop}西门子驱动装置维护清单", true));
                maintainElements.Add(CreateEquipmentTable(eq));
            }
            maintainElements.Add(CreatePageBreakParagraph());
          
            ReplacePlaceholderWithElements(document, "{$maintainList}", maintainElements);

            var detailElements = new List<OpenXmlElement>();
            var detailIndex = 1;

            // 设备检测明细
            foreach (var group in detailGroups)
            {
                detailElements.Add(CreateEmptyParagraph());
                detailElements.Add(CreateHeading2Paragraph(
                    $"6.{detailIndex} {group.ElectricRoom}>>{group.EquipmentName}>>{group.EquipmentNumber}"));
                detailElements.Add(CreateDetailTable(group));
                detailIndex++;
            }

            // 外围检测明细，继续沿用 6.x 编号
            foreach (var group in outerDetailGroups)
            {
                detailElements.Add(CreateEmptyParagraph());
                detailElements.Add(CreateHeading2Paragraph(
                    $"6.{detailIndex} 外围检测>>{group.EquipmentName}"));
                detailElements.Add(CreateDetailTable(group));
                detailIndex++;
            }

            ReplacePlaceholderWithElements(document, "{$detailList}", detailElements);

            var resolvedElements = new List<OpenXmlElement>();
            var unResolvedElements = new List<OpenXmlElement>();
            foreach (var item in failResults)
            {
                if (item.HazardResolved == "true")
                {
                    resolvedElements.Add(CreateResolvedFailResultTable(item, item?.Factory ?? "", mainPart));
                    resolvedElements.Add(CreateEmptyParagraph());
                }
                else
                {
                    unResolvedElements.Add(CreateUnresolvedFailResultTable(item, item?.Factory ?? "", mainPart));
                    unResolvedElements.Add(CreateEmptyParagraph());
                }
            }

            ReplacePlaceholderWithElements(document, "{$resolvedProblems}", resolvedElements);
            ReplacePlaceholderWithElements(document, "{$unresolvedProblems}", unResolvedElements);

            var outerInspectionElements = new List<OpenXmlElement>();
            foreach (var item in outerFailResults)
            {
                outerInspectionElements.Add(CreateOuterInspectionFailResultTable(item, mainPart));
                outerInspectionElements.Add(CreateEmptyParagraph());
            }

            ReplacePlaceholderWithElements(document, "{$outerInspectionProblems}", outerInspectionElements);

            ReplacePlaceholder(document, "abnormal", "异常");
            ReplacePlaceholder(document, "normal", "正常");

            document.Save();
        }

        var fileName = $"项目报告_{projectId}_{DateTime.Now:yyyyMMddHHmmss}.docx";
        var outputPath = Path.Combine(reportsRoot, fileName);

        await File.WriteAllBytesAsync(outputPath, memoryStream.ToArray());

        report.Path = outputPath;
        await _context.SaveChangesAsync();

        return outputPath;
    }

    private string ResolveAttachmentPath(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return string.Empty;

        if (Path.IsPathRooted(path))
            return path;

        var normalized = path.TrimStart('\\', '/');
        var fullPath = Path.Combine(_env.ContentRootPath, normalized);

        if (File.Exists(fullPath))
            return fullPath;

        var attachPath = Path.Combine(_env.ContentRootPath, "Attach", Path.GetFileName(path));
        return File.Exists(attachPath) ? attachPath : string.Empty;
    }

    private async Task<string?> GetUserNameByIdAsync(int? userId)
    {
        if (!userId.HasValue)
            return null;

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Userid == userId.Value);

        return user?.Username;
    }

    private static string GetResolutionText(string? json)
    {
        var hazardResolvedText = GetJsonValue(json, "hazardResolved");
        var hazardResolved = bool.TryParse(hazardResolvedText, out var parsed) && parsed;

        return hazardResolved
            ? GetJsonValue(json, "actionTaken")
            : GetJsonValue(json, "recommendationContent");
    }

    private static Table CreateResolvedFailResultTable(ReportFailResultDto item, string factory, MainDocumentPart mainPart)
    {
        var table = CreateBaseTable(3);

        table.Append(CreateSpanRow($"{factory}车间隐患以及解决措施", 3, true));

        table.Append(
            CreateFailThreeColumnRowStart(
                item.ElectricRoom,
                $"设备名称:{item.EquipmentName}",
                $"设备型号:{item.Mlfb}")
        );

        table.Append(
            CreateFailThreeColumnRowContinue(
                $"设备编号:{item.EquipmentNumber}",
                $"序列号:{item.Serialno}")
        );

        table.Append(
        CreateFailRightSpanRowContinue(
        $"检测项目：{item.CategoryPath}",
        $"问题描述：{item.TaskName} : {item.Value}",
        string.Empty)
        );

        table.Append(
            CreateFailRightSpanRowContinue(
                "问题处理说明：",
                item.ActionTaken,
                string.Empty)
        );

        table.Append(CreateFailPhotoRow(mainPart, item.Photo1, item.Photo1Name, item.Photo2, item.Photo2Name));
        table.Append(CreateFailPhotoRow(mainPart, item.Photo3, item.Photo3Name, item.Photo4, item.Photo4Name));

        return table;
    }


    private static Table CreateUnresolvedFailResultTable(ReportFailResultDto item, string factory, MainDocumentPart mainPart)
    {
        var table = CreateBaseTable(3);

        table.Append(CreateSpanRow($"{factory}车间隐患以及解决措施", 3, true));

        table.Append(
            CreateFailThreeColumnRowStart(
                item.ElectricRoom,
                $"设备名称:{item.EquipmentName}",
                $"设备型号:{item.Mlfb}")
        );

        table.Append(
            CreateFailThreeColumnRowContinue(
                $"设备编号:{item.EquipmentNumber}",
                $"序列号:{item.Serialno}")
        );

        table.Append(
        CreateFailRightSpanRowContinue(
        $"检测项目：{item.CategoryPath}",
        $"问题描述：{item.TaskName} : {item.Value}",
        string.Empty)
        );

        table.Append(
            CreateFailRightSpanRowContinue(
                $"隐患说明及建议：{item.RecommendationContent}",
                string.Empty,string.Empty)
        );

        table.Append(CreateFailPhotoRow(mainPart, item.Photo1, item.Photo1Name, item.Photo2, item.Photo2Name));
        table.Append(CreateFailPhotoRow(mainPart, item.Photo3, item.Photo3Name, item.Photo4, item.Photo4Name));

        return table;
    }


    private static Table CreateOuterInspectionFailResultTable(ReportFailResultDto item, MainDocumentPart mainPart)
    {
        var table = CreateBaseTable(3);

        table.Append(CreateSpanRow("外围检测隐患及解决措施", 3, true));

        table.Append(
            CreateFailThreeColumnRowStart(
                item.DownloadDeviceName,
                $"检测项目：{item.CategoryPath}",
                string.Empty)
        );

        table.Append(
            CreateFailRightSpanRowContinue(
                "问题描述：",
                $"{item.TaskName} : {item.Value}",
                string.Empty)
        );

        var hazardResolved = string.Equals(item.HazardResolved, "true", StringComparison.OrdinalIgnoreCase);

        table.Append(
            CreateFailRightSpanRowContinue(
                hazardResolved ? "问题处理说明：" : "隐患说明及建议：",
                hazardResolved ? item.ActionTaken : item.RecommendationContent,
                string.Empty)
        );
       /*
        table.Append(
            CreateFailThreeColumnRowContinue(
                "照片1：",
                "照片2：")
        );
       */
        table.Append(CreateFailPhotoRow(mainPart, item.Photo1, item.Photo1Name, item.Photo2, item.Photo2Name));
        /*
        table.Append(
            CreateFailThreeColumnRowContinue(
                "照片3：",
                "照片4：")
        );*/
        table.Append(CreateFailPhotoRow(mainPart, item.Photo3, item.Photo3Name, item.Photo4, item.Photo4Name));

        return table;
    }


    private static TableRow CreateFailThreeColumnRowStart(string? left, string? middle, string? right)
    {
        return new TableRow(
            CreateMergedLeftCell(left, true),
            CreateNormalCell(middle),
            CreateNormalCell(right)
        );
    }

    private static TableRow CreateFailThreeColumnRowContinue(string? middle, string? right)
    {
        return new TableRow(
            CreateMergedLeftCell(null, false),
            CreateNormalCell(middle),
            CreateNormalCell(right)
        );
    }

    private static TableRow CreateFailRightSpanRowContinue(string? title, string? line1, string? line2)
    {
        return new TableRow(
            CreateMergedLeftCell(null, false),
            new TableCell(
                new TableCellProperties(
                    new GridSpan { Val = 2 }
                ),
                new Paragraph(
                    new Run(new Text(SanitizeOpenXmlText(title ?? string.Empty))),
                    new Run(new Break()),
                    new Run(new Text(SanitizeOpenXmlText(line1 ?? string.Empty))),
                    new Run(new Break()),
                    new Run(new Text(SanitizeOpenXmlText(line2 ?? string.Empty)))
                )
            )
        );
    }

    private static TableRow CreateFailPhotoRow(
        MainDocumentPart mainPart,
        string? photo1Path,
        string? photo1Name,
        string? photo2Path,
        string? photo2Name)
    {
        const string photoCellWidth = "3600";

        return new TableRow(
            CreateMergedLeftCell(null, false),
            CreateImageCell(photo1Path, photo1Name, mainPart, photoCellWidth),
            CreateImageCell(photo2Path, photo2Name, mainPart, photoCellWidth)
        );
    }

    private static TableCell CreateImageCell(
    string? imagePath,
    string? fileName,
    MainDocumentPart mainPart,
    string cellWidth)
    {
        var cell = new TableCell(
            new TableCellProperties(
                new TableCellWidth { Type = TableWidthUnitValues.Dxa, Width = cellWidth },
                new TableCellVerticalAlignment { Val = TableVerticalAlignmentValues.Center }
            )
        );

        var paragraph = new Paragraph(
            new ParagraphProperties(
                new Justification { Val = JustificationValues.Center }
            )
        );

        if (!string.IsNullOrWhiteSpace(imagePath) && File.Exists(imagePath))
        {
            paragraph.Append(
                new Run(
                    CreateImageDrawing(mainPart, imagePath, 2100000L, 1575000L)
                )
            );

            if (!string.IsNullOrWhiteSpace(fileName))
            {
                paragraph.Append(new Run(new Break()));
                paragraph.Append(
                    new Run(
                        new Text(SanitizeOpenXmlText(fileName))
                        {
                            Space = SpaceProcessingModeValues.Preserve
                        }
                    )
                );
            }
        }
        else
        {
            paragraph.Append(new Run(new Text(string.Empty)));
        }

        cell.Append(paragraph);
        return cell;
    }

    private static Drawing CreateImageDrawing(MainDocumentPart mainPart, string imagePath, long widthEmus, long heightEmus)
    {
        var imagePartType = GetImagePartType(imagePath);
        var imagePart = mainPart.AddImagePart(imagePartType);

        using (var stream = File.OpenRead(imagePath))
        {
            imagePart.FeedData(stream);
        }

        var relationshipId = mainPart.GetIdOfPart(imagePart);
        var elementId = (UInt32Value)(uint)Math.Abs(Guid.NewGuid().GetHashCode());

        return new Drawing(
            new DW.Inline(
                new DW.Extent { Cx = widthEmus, Cy = heightEmus },
                new DW.EffectExtent
                {
                    LeftEdge = 0L,
                    TopEdge = 0L,
                    RightEdge = 0L,
                    BottomEdge = 0L
                },
                new DW.DocProperties
                {
                    Id = elementId,
                    Name = Path.GetFileName(imagePath)
                },
                new DW.NonVisualGraphicFrameDrawingProperties(
                    new A.GraphicFrameLocks { NoChangeAspect = true }
                ),
                new A.Graphic(
                    new A.GraphicData(
                        new PIC.Picture(
                            new PIC.NonVisualPictureProperties(
                                new PIC.NonVisualDrawingProperties
                                {
                                    Id = elementId,
                                    Name = Path.GetFileName(imagePath)
                                },
                                new PIC.NonVisualPictureDrawingProperties()
                            ),
                            new PIC.BlipFill(
                                new A.Blip { Embed = relationshipId },
                                new A.Stretch(new A.FillRectangle())
                            ),
                            new PIC.ShapeProperties(
                                new A.Transform2D(
                                    new A.Offset { X = 0L, Y = 0L },
                                    new A.Extents { Cx = widthEmus, Cy = heightEmus }
                                ),
                                new A.PresetGeometry(new A.AdjustValueList())
                                {
                                    Preset = A.ShapeTypeValues.Rectangle
                                }
                            )
                        )
                    )
                    { Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture" }
                )
            )
        );
    }

    private static PartTypeInfo GetImagePartType(string imagePath)
    {
        return Path.GetExtension(imagePath).ToLowerInvariant() switch
        {
            ".png" => ImagePartType.Png,
            ".jpg" => ImagePartType.Jpeg,
            ".jpeg" => ImagePartType.Jpeg,
            ".gif" => ImagePartType.Gif,
            ".bmp" => ImagePartType.Bmp,
            ".tif" => ImagePartType.Tiff,
            ".tiff" => ImagePartType.Tiff,
            _ => ImagePartType.Jpeg
        };
    }

    private static TableCell CreateMergedLeftCell(string? text, bool isFirstCell)
    {
        return new TableCell(
            new TableCellProperties(
                new TableCellWidth { Type = TableWidthUnitValues.Dxa, Width = "1800" },
                new VerticalMerge { Val = isFirstCell ? MergedCellValues.Restart : MergedCellValues.Continue },
                new TableCellVerticalAlignment { Val = TableVerticalAlignmentValues.Top }
            ),
            new Paragraph(
                new Run(
                    new Text(isFirstCell ? SanitizeOpenXmlText(text) : string.Empty)
                    {
                        Space = SpaceProcessingModeValues.Preserve
                    }
                )
            )
        );
    }

    private static TableCell CreateNormalCell(string? text)
    {
        return new TableCell(
            new Paragraph(
                new Run(
                    new Text(SanitizeOpenXmlText(text))
                    {
                        Space = SpaceProcessingModeValues.Preserve
                    }
                )
            )
        );
    }

    private static Paragraph CreatePageBreakParagraph()
    {
        return new Paragraph(
            new Run(
                new Break { Type = BreakValues.Page }
            )
        );
    }

    private static void ReplacePlaceholderWithElements(
     Document document,
     string placeholder,
     IEnumerable<OpenXmlElement> elements)
    {
        var paragraph = document
            .Descendants<Paragraph>()
            .FirstOrDefault(p => p.InnerText.Contains(placeholder, StringComparison.Ordinal));

        if (paragraph == null)
            return;

        var parent = paragraph.Parent;
        if (parent == null)
            return;

        var elementList = elements?.ToList() ?? new List<OpenXmlElement>();

        if (elementList.Count == 0)
        {
            parent.InsertBefore(CreateEmptyParagraph(), paragraph);
            paragraph.Remove();
            return;
        }

        foreach (var element in elementList)
        {
            parent.InsertBefore(element.CloneNode(true), paragraph);
        }

        paragraph.Remove();
    }

    private static void ReplacePlaceholder(Document document, string placeholder, string value)
    {
        var safeValue = SanitizeOpenXmlText(value);

        var paragraphs = document.Descendants<Paragraph>().ToList();

        foreach (var paragraph in paragraphs)
        {
            var paragraphText = paragraph.InnerText;
            if (!paragraphText.Contains(placeholder, StringComparison.OrdinalIgnoreCase))
                continue;

            var replacedText = paragraphText.Replace(
                placeholder,
                safeValue,
                StringComparison.OrdinalIgnoreCase);

            paragraph.RemoveAllChildren<Run>();
            paragraph.AppendChild(
                new Run(
                    new Text(replacedText)
                    {
                        Space = SpaceProcessingModeValues.Preserve
                    }));
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
                new Text(SanitizeOpenXmlText(text))
                {
                    Space = SpaceProcessingModeValues.Preserve
                }
            ));
    }

    private static Paragraph CreateHeading2Paragraph(string text)
    {
        return new Paragraph(
            new ParagraphProperties(
                new OutlineLevel { Val = 1 },
                new SpacingBetweenLines { Before = "120", After = "120" }
            ),
            new Run(
                new RunProperties(
                    new Bold(),
                    new FontSize { Val = "28" }
                ),
                new Text(SanitizeOpenXmlText(text))
                {
                    Space = SpaceProcessingModeValues.Preserve
                }
            )
        );
    }

    private static Table CreateDetailTable(ReportDetailGroupDto group)
    {
        var table = CreateBaseTable(4);

        table.Append(CreateSpanRow(group.CategoryPath ?? string.Empty, 4));

        table.Append(CreateHeaderRow(
            "检查项", "测试结果", "检测值", "备注"));

        if (group.Rows.Count == 0)
        {
            table.Append(CreateRow("", "", "", ""));
        }
        else
        {
            foreach (var row in group.Rows)
            {
                table.Append(
                    CreateRow(
                        row.TaskName,
                        row.ResultState,
                        row.Value,
                        row.Remarks)
                );
            }
        }

        var hiddenHazardText = BuildSummaryLines(
            group.Rows,
            r => r.HiddenHazardContent);

        var maintenanceText = BuildSummaryLines(
            group.Rows,
            r => r.MaintenanceInstructions);

        table.Append(CreateSpanRow($"问题隐患说明：{hiddenHazardText}", 4));
        table.Append(CreateSpanRow($"维护与优化建议：{maintenanceText}", 4));

        return table;
    }

    private static string BuildSummaryLines(
    IEnumerable<ReportDetailRowDto> rows,
    Func<ReportDetailRowDto, string?> selector)
    {
        var lines = rows
            .Select(r => new
            {
                r.TaskName,
                Content = selector(r)
            })
            .Where(x => !string.IsNullOrWhiteSpace(x.Content))
            .Select(x => $"{x.TaskName}：{x.Content}")
            .ToList();

        return lines.Count == 0
            ? string.Empty
            : string.Join(Environment.NewLine, lines);
    }

    private static TableRow CreateSpanRow(string text, int span, bool bold = false)
    {
        return new TableRow(
            new TableCell(
                new TableCellProperties(
                    new GridSpan { Val = span }
                ),
                new Paragraph(
                    new Run(
                        bold ? new RunProperties(new Bold()) : new RunProperties(),
                        new Text(SanitizeOpenXmlText(text))
                        {
                            Space = SpaceProcessingModeValues.Preserve
                        }
                    )
                )
            )
        );
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
                            new Text(SanitizeOpenXmlText(value))
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

    private static string GetJsonValue(string? json, params string[] propertyNames)
    {
        if (string.IsNullOrWhiteSpace(json))
            return string.Empty;

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.ValueKind == JsonValueKind.String)
            {
                var innerJson = root.GetString();
                if (string.IsNullOrWhiteSpace(innerJson))
                    return string.Empty;

                using var innerDoc = JsonDocument.Parse(innerJson);
                return ReadJsonProperty(innerDoc.RootElement, propertyNames);
            }

            return ReadJsonProperty(root, propertyNames);
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string ReadJsonProperty(JsonElement root, params string[] propertyNames)
    {
        if (root.ValueKind != JsonValueKind.Object)
            return string.Empty;

        foreach (var propertyName in propertyNames)
        {
            foreach (var property in root.EnumerateObject())
            {
                if (!string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                    continue;

                var value = property.Value;

                return value.ValueKind switch
                {
                    JsonValueKind.Null => string.Empty,
                    JsonValueKind.String => value.GetString() ?? string.Empty,
                    JsonValueKind.True => "true",
                    JsonValueKind.False => "false",
                    _ => value.ToString()
                };
            }
        }

        return string.Empty;
    }

    private static Table CreateBaseTable(int columnCount)
    {
        var table = new Table();

        table.AppendChild(
            new TableProperties(
                new TableWidth
                {
                    Type = TableWidthUnitValues.Pct,
                    Width = FullTableWidth
                },
                new TableLayout
                {
                    Type = TableLayoutValues.Fixed
                },
                new TableJustification
                {
                    Val = TableRowAlignmentValues.Center
                },
                new TableBorders(
                    new TopBorder { Val = BorderValues.Single, Size = 4 },
                    new BottomBorder { Val = BorderValues.Single, Size = 4 },
                    new LeftBorder { Val = BorderValues.Single, Size = 4 },
                    new RightBorder { Val = BorderValues.Single, Size = 4 },
                    new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4 },
                    new InsideVerticalBorder { Val = BorderValues.Single, Size = 4 }
                )
            )
        );

        var grid = new TableGrid();
        var columnWidth = (9000 / Math.Max(columnCount, 1)).ToString();

        for (int i = 0; i < columnCount; i++)
        {
            grid.Append(new GridColumn { Width = columnWidth });
        }

        table.Append(grid);
        return table;
    }

    private static Table CreateBaseTable(params int[] columnWidths)
    {
        var table = new Table();

        table.AppendChild(
            new TableProperties(
                new TableWidth
                {
                    Type = TableWidthUnitValues.Pct,
                    Width = FullTableWidth
                },
                new TableLayout
                {
                    Type = TableLayoutValues.Fixed
                },
                new TableJustification
                {
                    Val = TableRowAlignmentValues.Center
                },
                new TableBorders(
                    new TopBorder { Val = BorderValues.Single, Size = 4 },
                    new BottomBorder { Val = BorderValues.Single, Size = 4 },
                    new LeftBorder { Val = BorderValues.Single, Size = 4 },
                    new RightBorder { Val = BorderValues.Single, Size = 4 },
                    new InsideHorizontalBorder { Val = BorderValues.Single, Size = 4 },
                    new InsideVerticalBorder { Val = BorderValues.Single, Size = 4 }
                )
            )
        );

        var grid = new TableGrid();
        foreach (var width in columnWidths)
        {
            grid.Append(new GridColumn { Width = width.ToString() });
        }

        table.Append(grid);
        return table;
    }

    private static TableCell CreateHeaderCell(string? value, bool noWrap = false)
    {
        var properties = new TableCellProperties(
            new Shading
            {
                Val = ShadingPatternValues.Clear,
                Color = "auto",
                Fill = "DDEBF7"
            }
        );

        if (noWrap)
        {
            properties.Append(new NoWrap());
        }

        return new TableCell(
            properties,
            new Paragraph(
                new Run(
                    new RunProperties(new Bold()),
                    new Text(SanitizeOpenXmlText(value))
                    {
                        Space = SpaceProcessingModeValues.Preserve
                    }
                )
            )
        );
    }

    private static TableRow CreateHeaderRow(params string?[] values)
    {
        var row = new TableRow();

        foreach (var value in values)
        {
            row.Append(CreateHeaderCell(value));
        }

        return row;
    }

    private static Table CreateEquipmentTable(ReportEquipmentDto eq)
    {
        // 第一列更窄，第二列更宽
        var table = CreateBaseTable(650, 1900, 1500, 1400, 1300, 1200, 1050);

        var headerRow = new TableRow(
            CreateHeaderCell("序号", noWrap: true),
            CreateHeaderCell("电气室"),
            CreateHeaderCell("设备名称"),
            CreateHeaderCell("设备型号"),
            CreateHeaderCell("序列号"),
            CreateHeaderCell("所属部门"),
            CreateHeaderCell("设备编号")
        );

        table.Append(headerRow);

        if (eq.Products.Count == 0)
        {
            table.Append(
                CreateRow(
                    "1",
                    eq.ElectricRoom,
                    string.Empty,
                    eq.Mlfb,
                    string.Empty,
                    string.Empty,
                    string.Empty)
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
                        product.EquipmentName,
                        eq.Mlfb,
                        product.Serialno,
                        product.Department,
                        product.EquipmentNumber)
                );
            }
        }

        return table;
    }

    private static string SanitizeOpenXmlText(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        var chars = value.Where(IsValidXmlChar);
        return new string(chars.ToArray());
    }

    private static bool IsValidXmlChar(char c)
    {
        return c == 0x9
            || c == 0xA
            || c == 0xD
            || (c >= 0x20 && c <= 0xD7FF)
            || (c >= 0xE000 && c <= 0xFFFD);
    }
}

public class ReportProductDto
{
    public int Productid { get; set; }
    public string? Serialno { get; set; }
    public string? EquipmentName { get; set; }
    public string? Department { get; set; }
    public string? EquipmentNumber { get; set; }
}


public class ReportDetailRowDto
{
    public string? TaskName { get; set; }
    public string? ResultState { get; set; }
    public string? Value { get; set; }
    public string? HiddenHazardContent { get; set; }
    public string? MaintenanceInstructions { get; set; }
    public string? Remarks { get; set; }
    public string? HazardResolved { get; set; } = null;
}

public class ReportEquipmentDto
{
    public int Peid { get; set; }
    public int Equipmentid { get; set; }

    public string? Workshop { get; set; }
    public string? ElectricRoom { get; set; }
    public string? Factory { get; set; }
    public string? Mlfb { get; set; }
    public List<ReportProductDto> Products { get; set; } = new();
}

public class ReportDetailGroupDto
{
    public string? ElectricRoom { get; set; }
    public string? Factory { get; set; }
    public string? EquipmentName { get; set; }
    public string? EquipmentNumber { get; set; }
    public string? CategoryPath { get; set; }
    public List<ReportDetailRowDto> Rows { get; set; } = new();
}

public class ReportFailResultDto
{
    public string? ElectricRoom { get; set; }
    public string? Factory { get; set; }
    public string? EquipmentName { get; set; }
    public string? Mlfb { get; set; }
    public string? EquipmentNumber { get; set; }
    public string? Serialno { get; set; }
    public string? CategoryPath { get; set; }
    public string? TaskName { get; set; }
    public string? Value { get; set; }
    public string? Resolution { get; set; }   

    public string? HazardResolved { get; set; }

    public string? RecommendationContent { get; set; }
    public string? DownloadDeviceName { get; set; }

    public string? ActionTaken { get; set; }
    public string? Photo1 { get; set; }
    public string? Photo2 { get; set; }
    public string? Photo3 { get; set; }
    public string? Photo4 { get; set; }
    public string? Photo1Name { get; set; }
    public string? Photo2Name { get; set; }
    public string? Photo3Name { get; set; }
    public string? Photo4Name { get; set; }
}
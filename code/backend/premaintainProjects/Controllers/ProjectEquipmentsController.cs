using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using premaintainProjects.Models;
using static premaintainProjects.Models.otherModels;
using Microsoft.Extensions.Logging;
using premaintainProjects.Services;

namespace premaintainProjects.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProjectEquipmentsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<ProjectEquipmentsController> _logger;
        private readonly ServiceTools _serviceTools;
        public ProjectEquipmentsController(PredictiveMaintenancePlatformContext context, ILogger<ProjectEquipmentsController> logger, ServiceTools serviceTools)
        {
            _context = context;
            _logger = logger;
            _serviceTools = serviceTools;
        }

        // GET: api/ProjectEquipments
        [HttpGet]
        public async Task<IActionResult> GetProjectEquipments()
        {
            var list = await _context.ProjectEquipments.ToListAsync();
            _logger.LogInformation("获取所有项目设备，数量：{Count}", list.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = list, msg = "" });
        }

        // GET: api/ProjectEquipments/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetProjectEquipment(int id)
        {
            var item = await _context.ProjectEquipments.FindAsync(id);
            if (item == null)
            {
                _logger.LogWarning("未找到项目设备，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取项目设备，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = item, msg = "" });
        }

        // GET: api/ProjectEquipments/ByProject/{projectid}
        [HttpGet("ByProject/{projectid}")]
        public async Task<IActionResult> GetEquipmentsByProject(int projectid)
        {
            var equipments = await _context.ProjectEquipments
                .Where(e => e.Projectid == projectid)
                .ToListAsync();

            _logger.LogInformation("按项目ID检索设备，ProjectId：{ProjectId}，数量：{Count}", projectid, equipments.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = equipments, msg = "" });
        }

        // PUT: api/ProjectEquipments
        [HttpPut]
        public async Task<IActionResult> PutProjectEquipment(ProjectEquipment projectEquipment)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var existing = await _context.ProjectEquipments.FindAsync(projectEquipment.Peid);
                if (existing == null)
                {
                    _logger.LogWarning("更新失败，项目设备不存在，ID：{Id}", projectEquipment.Peid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }

                // 保留旧值，用于删除旧任务
                var oldProjectId = existing.Projectid;
                var oldTemplateId = existing.Templateid;
                var oldEquipmentId = existing.Equipmentid;

                // 更新项目设备关系
                existing.Projectid = projectEquipment.Projectid;
                existing.Equipmentid = projectEquipment.Equipmentid;
                existing.Templateid = projectEquipment.Templateid;
                existing.Ifdel = projectEquipment.Ifdel;

                await _context.SaveChangesAsync();

                // 校验设备
                var equipment = await _context.Equipments.FindAsync(existing.Equipmentid);
                if (equipment == null)
                {
                    await transaction.RollbackAsync();
                    _logger.LogWarning("更新项目设备失败，设备不存在，EquipmentId：{EquipmentId}", existing.Equipmentid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "设备不存在" });
                }

                // 旧设备产品，用于删除旧任务
                var oldProductIds = await _context.Products
                    .Where(p => p.Equipid == oldEquipmentId)
                    .Select(p => p.Productid)
                    .ToListAsync();

                // 新设备产品
                var productIds = await _context.Products
                    .Where(p => p.Equipid == existing.Equipmentid)
                    .Select(p => p.Productid)
                    .ToListAsync();

                // 如果新设备还没产品，则自动补齐
                if (equipment.Number.HasValue && equipment.Number.Value > 0)
                {
                    var products = new List<Product>();

                    for (int i = 0; i < equipment.Number.Value-productIds.Count; i++)
                    {
                        products.Add(new Product
                        {
                            Equipid = equipment.Equipid,
                            Mlfb = equipment.Mlfb,
                            Serialno = null
                        });
                    }

                    _context.Products.AddRange(products);
                    await _context.SaveChangesAsync();

                    productIds = await _context.Products
                        .Where(p => p.Equipid == existing.Equipmentid)
                        .Select(p => p.Productid)
                        .ToListAsync();
                }

                // 校验模板
                var template = await _context.InspectionTemplates.FindAsync(existing.Templateid);
                if (template == null)
                {
                    await transaction.RollbackAsync();
                    _logger.LogWarning("更新项目设备失败，模板不存在，TemplateId：{TemplateId}", existing.Templateid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "未匹配到巡检模板" });
                }

                // 删除旧任务
                if (oldProductIds.Count > 0)
                {
                    var oldTasks = await _context.InspectionTasks
                        .Where(t =>
                            t.Projectid == oldProjectId &&
                            t.Templateid == oldTemplateId &&
                            oldProductIds.Contains(t.Productid))
                        .ToListAsync();

                    if (oldTasks.Count > 0)
                    {
                        _context.InspectionTasks.RemoveRange(oldTasks);
                        await _context.SaveChangesAsync();
                    }
                }

                // 生成新任务
                var tasks = new List<InspectionTask>();

                foreach (var productId in productIds)
                {
                    tasks.Add(new InspectionTask
                    {
                        Taskid = 0,
                        Projectid = existing.Projectid,
                        Templateid = template.Templateid,
                        Productid = productId,
                        Status = 1,
                        Assigneduserid = null,
                        TaskNo = await _serviceTools.GenerateTaskNoAsync(),
                        Inspectiontype = template.Inspectiontype,
                        Ifdel = false,
                         Assignedusername= null,
                         DownloadDeviceName = null,
                         DownloadedAt= null,
                         LocalUpdatedAt= null,
                         Version = 1
                    });
                }

                _context.InspectionTasks.AddRange(tasks);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                _logger.LogInformation("更新项目设备成功，ID：{Id}，同步生成任务数量：{Count}", existing.Peid, tasks.Count);
                return new JsonResult(new { code = ResponseCode.成功, data = existing.Peid, msg = "" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "更新项目设备失败，ID：{Id}", projectEquipment.Peid);
                return new JsonResult(new { code = ResponseCode.操作失败, data = (object)null, msg = "更新失败" });
            }
        }

        // POST: api/ProjectEquipments
        [HttpPost]
        public async Task<IActionResult> PostProjectEquipment(ProjectEquipment projectEquipment)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                projectEquipment.Peid = 0;
                _context.ProjectEquipments.Add(projectEquipment);
                await _context.SaveChangesAsync();

                var equipment = await _context.Equipments.FindAsync(projectEquipment.Equipmentid);

                if (equipment == null)
                {
                    await transaction.RollbackAsync();
                    _logger.LogWarning("新增项目设备失败，设备不存在，EquipmentId：{EquipmentId}", projectEquipment.Equipmentid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "设备不存在" });
                }

                var productIds = await _context.Products
                    .Where(p => p.Equipid == projectEquipment.Equipmentid)
                    .Select(p => p.Productid)
                    .ToListAsync();
                
                
                    if (equipment.Number.HasValue && equipment.Number.Value > 0 && productIds.Count < equipment.Number.Value)
                    {
                        var products = new List<Product>();

                        for (int i = productIds.Count; i < equipment.Number.Value; i++)
                        {
                            products.Add(new Product
                            {
                                Equipid = equipment.Equipid,
                                Mlfb = equipment.Mlfb,
                                Serialno = null
                            });
                        }
                        _context.Products.AddRange(products);
                        await _context.SaveChangesAsync();
                        productIds = await _context.Products
                             .Where(p => p.Equipid == projectEquipment.Equipmentid)
                             .Select(p => p.Productid)
                             .ToListAsync();
                    }                               

                var template = await _context.InspectionTemplates.FindAsync(projectEquipment.Templateid);

                if (template == null)
                {
                    await transaction.RollbackAsync();
                    _logger.LogWarning("新增项目设备失败，未匹配到模板，templateId：{TemplateId}", projectEquipment.Templateid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "未匹配到巡检模板" });
                }

                var tasks = new List<InspectionTask>();

                
                    foreach (var productId in productIds)
                    {
                        tasks.Add(new InspectionTask
                        {
                            Taskid = 0,
                            Projectid = projectEquipment.Projectid,
                            Templateid = template.Templateid,
                            Productid = productId,
                            Status = 1,
                            Assigneduserid = null,
                            TaskNo = await _serviceTools.GenerateTaskNoAsync(),
                            Inspectiontype = template.Inspectiontype,
                            Ifdel = false,
                             Assignedusername = null,
                              Version = 1,
                               DownloadedAt = null,
                                LocalUpdatedAt = null,
                                 DownloadDeviceName = null

                        });
                    }
                

                _context.InspectionTasks.AddRange(tasks);
                await _context.SaveChangesAsync();

                var inspectionItems = await _context.InspectionItems
                        .Where(x => x.Templateid == template.Templateid)
                        .OrderBy(x => x.SortOrder)
                        .ToListAsync();

                var categoryPathMap = await BuildCategoryPathMapAsync(template.Templateid);

                var taskitems = new List<Taskitem>();

                foreach (var task in tasks)
                {
                    foreach (var inspectionItem in inspectionItems)
                    {
                        taskitems.Add(new Taskitem
                        {
                            Itemid = Guid.NewGuid(),
                            Taskid = task.Taskid,
                            Inspectionitemid = inspectionItem.Itemid,
                            Taskname = inspectionItem.Name,
                            Categorypath = inspectionItem.Categoryid.HasValue &&
                                           categoryPathMap.ContainsKey(inspectionItem.Categoryid.Value)
                                ? categoryPathMap[inspectionItem.Categoryid.Value]
                                : null,
                            Taskresult = null,
                            Isnormal = true,
                            Isrecheck = false,
                            Createtime = _serviceTools.NowInChina(),
                            ExecutionStatus = 1,
                            Updatetime = _serviceTools.NowInChina(),
                            SourceType = 1
                        });
                    }
                }

                _context.Taskitems.AddRange(taskitems);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("新增项目设备成功，ID：{Id}，同步生成任务数量：{Count}", projectEquipment.Peid, tasks.Count);
                return new JsonResult(new { code = ResponseCode.成功, data = projectEquipment.Peid, msg = "" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "新增项目设备失败");
                return new JsonResult(new { code = ResponseCode.操作失败, data = (object)null, msg = "新增失败" });
            }
        }

        // DELETE: api/ProjectEquipments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProjectEquipment(int id)
        {
            var item = await _context.ProjectEquipments.FindAsync(id);
            if (item == null)
            {
                _logger.LogWarning("删除失败，项目设备不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.ProjectEquipments.Remove(item);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除项目设备成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool ProjectEquipmentExists(int id)
        {
            return _context.ProjectEquipments.Any(e => e.Peid == id);
        }

        private async Task<Dictionary<int, string>> BuildCategoryPathMapAsync(int templateId)
        {
            var categories = await _context.InspectionCategories
                .Where(x => x.Templateid == templateId)
                .OrderBy(x => x.SortOrder)
                .ToListAsync();

            var dict = categories.ToDictionary(x => x.Categoryid, x => x);
            var result = new Dictionary<int, string>();

            string BuildPath(int categoryId)
            {
                if (result.ContainsKey(categoryId))
                    return result[categoryId];

                var current = dict[categoryId];

                if (current.ParentId == 0 || !dict.ContainsKey(current.ParentId))
                {
                    result[categoryId] = current.Name ?? string.Empty;
                    return result[categoryId];
                }

                var parentPath = BuildPath(current.ParentId);
                result[categoryId] = $"{parentPath}/{current.Name}";
                return result[categoryId];
            }

            foreach (var category in categories)
            {
                BuildPath(category.Categoryid);
            }

            return result;
        }
    }
}
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using premaintainProjects.Dtos;
using premaintainProjects.Models;
using premaintainProjects.Services;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using static premaintainProjects.Models.otherModels;

namespace premaintainProjects.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InspectionTasksController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<InspectionTasksController> _logger;
        private readonly ServiceTools _serviceTools;

        public InspectionTasksController(
            PredictiveMaintenancePlatformContext context,
            ILogger<InspectionTasksController> logger,
            ServiceTools serviceTools)
        {
            _context = context;
            _logger = logger;
            _serviceTools = serviceTools;
        }

        // GET: api/InspectionTasks
        [HttpGet]
        public async Task<IActionResult> GetInspectionTasks()
        {
            var tasks = await _context.InspectionTasks.AsNoTracking().ToListAsync();
            _logger.LogInformation("获取所有巡检任务，数量：{Count}", tasks.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = tasks.Select(ToViewDto), msg = "" });
        }

        // GET: api/InspectionTasks/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetInspectionTask(int id)
        {
            

            var task = await _context.InspectionTasks
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Taskid == id);

            if (task == null)
            {
                _logger.LogWarning("未找到巡检任务，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取巡检任务，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = ToViewDto(task), msg = "" });
        }

        // GET: api/InspectionTasks/Search?projectid=1&templateid=2&productid=3
        [HttpGet("Search")]
        public async Task<IActionResult> SearchInspectionTasks(
            [FromQuery] int? projectid,
            [FromQuery] int? templateid,
            [FromQuery] int? productid)
        {
            var query = _context.InspectionTasks.AsQueryable();

            if (projectid.HasValue)
                query = query.Where(t => t.Projectid == projectid.Value);

            if (templateid.HasValue)
                query = query.Where(t => t.Templateid == templateid.Value);

            if (productid.HasValue)
                query = query.Where(t => t.Productid == productid.Value);

            var tasks = await query.ToListAsync();

            _logger.LogInformation(
                "多条件检索巡检任务，Projectid：{Projectid}，Templateid：{Templateid}，Productid：{Productid}，数量：{Count}",
                projectid, templateid, productid, tasks.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = tasks.Select(ToViewDto), msg = "" });
        }

        [HttpPut]
        public async Task<IActionResult> PutInspectionTask(InspectionTask inspectionTask)
        {
            var existingTask = await _context.InspectionTasks.FindAsync(inspectionTask.Taskid);
            if (existingTask == null)
            {
                _logger.LogWarning("更新失败，巡检任务不存在，ID：{Id}", inspectionTask.Taskid);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            existingTask.Projectid = inspectionTask.Projectid;
            existingTask.Templateid = inspectionTask.Templateid;
            existingTask.Productid = inspectionTask.Productid;
            existingTask.Status = inspectionTask.Status;
            existingTask.TaskNo = inspectionTask.TaskNo;
            existingTask.Assigneduserid = inspectionTask.Assigneduserid;
            existingTask.Inspectiontype = inspectionTask.Inspectiontype;
            existingTask.Ifdel = inspectionTask.Ifdel;
            existingTask.Version = inspectionTask.Version;
            existingTask.Assignedusername = inspectionTask.Assignedusername;
            existingTask.DownloadedAt = _serviceTools.NormalizeChinaTime(inspectionTask.DownloadedAt);
            existingTask.LocalUpdatedAt = _serviceTools.NormalizeChinaTime(inspectionTask.LocalUpdatedAt);         
            existingTask.DownloadDeviceName = inspectionTask.DownloadDeviceName;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                _logger.LogError("更新巡检任务时发生并发异常，ID：{Id}", inspectionTask.Taskid);
                throw;
            }

            _logger.LogInformation("更新巡检任务成功，ID：{Id}，版本：{Version}", inspectionTask.Taskid, inspectionTask.Version);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionTask.Taskid, msg = "" });
        }       


        [HttpPut("{id}/detail")]
        public async Task<IActionResult> PutInspectionTaskDetail([FromBody] UpdateInspectionTaskDetailDto dto)
        {

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var existingTask = await _context.InspectionTasks.FindAsync(dto.Task.Taskid);
                if (existingTask == null)
                {
                    _logger.LogWarning("整单更新失败，巡检任务不存在，ID：{Id}", dto.Task.Taskid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                /*
                if (dto.Task.Version != existingTask.Version + 1)
                {
                    _logger.LogWarning("整单更新失败，版本冲突，ID：{Id}，当前版本：{CurrentVersion}，提交版本：{SubmitVersion}",
                        dto.Task.Taskid, existingTask.Version, dto.Task.Version);

                    return new JsonResult(new
                    {
                        code = ResponseCode.参数无效,
                        data = (object)null,
                        msg = "版本冲突"
                    });
                }*/

                // 更新 task 主表
                existingTask.Projectid = dto.Task.Projectid;
                existingTask.Templateid = dto.Task.Templateid;
                existingTask.Productid = dto.Task.Productid;
                existingTask.Status = dto.Task.Status;
                existingTask.TaskNo = dto.Task.TaskNo;
                existingTask.Assigneduserid = dto.Task.Assigneduserid;
                existingTask.Inspectiontype = dto.Task.Inspectiontype;
                existingTask.Ifdel = dto.Task.Ifdel;
                existingTask.Version = dto.Task.Version;
                existingTask.Assignedusername = dto.Task.Assignedusername;
                existingTask.DownloadedAt = _serviceTools.NormalizeChinaTime(dto.Task.DownloadedAt);
                existingTask.LocalUpdatedAt = _serviceTools.NormalizeChinaTime(dto.Task.LocalUpdatedAt);
                existingTask.DownloadDeviceName = dto.Task.DownloadDeviceName;

                // 取现有 items
                var existingItems = await _context.Taskitems
                    .Where(x => x.Taskid == dto.Task.Taskid)
                    .ToListAsync();

                var existingItemMap = existingItems.ToDictionary(x => x.Itemid, x => x);
                var inputItems = dto.Taskitems ?? new List<Taskitem>();

                // 传入中已有ID
                var inputIds = inputItems
                    .Where(x => x.Itemid != Guid.Empty)
                    .Select(x => x.Itemid)
                    .ToHashSet();

                // 删除被移除的 items + 其附件
                var deletedItems = existingItems
                    .Where(x => !inputIds.Contains(x.Itemid))
                    .ToList();

                if (deletedItems.Count > 0)
                {
                    var deletedIds = deletedItems.Select(x => x.Itemid).ToList();

                    var attachments = await _context.Attachments
                        .Where(x => deletedIds.Contains(x.Taskitemid))
                        .ToListAsync();

                    if (attachments.Count > 0)
                    {
                        _context.Attachments.RemoveRange(attachments);
                    }

                    _context.Taskitems.RemoveRange(deletedItems);
                }

                // 新增 / 更新 items
                foreach (var input in inputItems)
                {
                    if (input.Itemid != Guid.Empty && existingItemMap.TryGetValue(input.Itemid, out var existingItem))
                    {
                        existingItem.Inspectionitemid = input.Inspectionitemid;
                        existingItem.Taskname = input.Taskname;
                        existingItem.Categorypath = input.Categorypath;
                        existingItem.Taskresult = input.Taskresult;
                        existingItem.Isnormal = input.Isnormal;
                        existingItem.Isrecheck = input.Isrecheck;
                        existingItem.ExecutionStatus = input.ExecutionStatus;
                        existingItem.Updatetime = _serviceTools.NowInChina();
                        existingItem.SourceType = input.SourceType;
                        existingItem.Taskid = input.Taskid;

                    }
                    else
                    {
                        var newItem = new Taskitem
                        {
                            Itemid = Guid.NewGuid(),
                            Taskid = dto.Task.Taskid,
                            Inspectionitemid = input.Inspectionitemid,
                            Taskname = input.Taskname,
                            Categorypath = input.Categorypath,
                            Taskresult = input.Taskresult,
                            Isnormal = input.Isnormal,
                            Isrecheck = input.Isrecheck,
                            Createtime = _serviceTools.NowInChina(),
                            ExecutionStatus = input.ExecutionStatus,
                            Updatetime = _serviceTools.NowInChina(),
                            SourceType = input.SourceType,
                        };
                        _context.Taskitems.Add(newItem);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("整单更新巡检任务成功，ID：{Id}", dto.Task.Taskid);
                return new JsonResult(new { code = ResponseCode.成功, data = dto.Task.Taskid, msg = "" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "整单更新巡检任务失败，ID：{Id}", dto.Task.Taskid);
                return new JsonResult(new
                {
                    code = ResponseCode.操作失败,
                    data = (object)null,
                    msg = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        // POST: api/InspectionTasks
        [HttpPost]
        public async Task<IActionResult> PostInspectionTask(InspectionTask inspectionTask)
        {
            inspectionTask.Taskid = 0; // 强制让数据库分配主键
            inspectionTask.Version = 1; // 初始版本号
            inspectionTask.DownloadedAt = _serviceTools.NormalizeChinaTime(inspectionTask.DownloadedAt);
            inspectionTask.LocalUpdatedAt = _serviceTools.NormalizeChinaTime(inspectionTask.LocalUpdatedAt);
            _context.InspectionTasks.Add(inspectionTask);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增巡检任务成功，ID：{Id}", inspectionTask.Taskid);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionTask.Taskid, msg = "" });
        }

        [HttpGet("{id}/detailnoattach")]
        public async Task<IActionResult> GetInspectionTasks(int id)
        {
            var task = await _context.InspectionTasks.FindAsync(id);
            if (task == null)
            {
                _logger.LogWarning("未找到巡检任务详情，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            var taskitems = await _context.Taskitems
                .Where(x => x.Taskid == id)
                .ToListAsync();

            var itemIds = taskitems.Select(x => x.Itemid).ToList();

            var attachments = await _context.Attachments
                .Where(x => itemIds.Contains(x.Taskitemid))
                .ToListAsync();

            foreach (var item in taskitems)
            {
                await _serviceTools.RefreshRenderSchemaAsync(item);
            }

            var taskitemList = taskitems.Select(item => new Taskitem
            {
                Itemid = item.Itemid,
                Taskid = item.Taskid,
                Inspectionitemid = item.Inspectionitemid,
                Taskname = item.Taskname,
                Categorypath = item.Categorypath,
                Taskresult = item.Taskresult,
                Isnormal = item.Isnormal,
                Isrecheck = item.Isrecheck,
                Createtime = _serviceTools.NormalizeChinaTime(item.Createtime),
                ExecutionStatus = item.ExecutionStatus,
                Updatetime = _serviceTools.NormalizeChinaTime(item.Updatetime),
                SourceType = item.SourceType,
                RenderSchemaJson = item.RenderSchemaJson,                
                Displaycondition = item.Displaycondition,
                Hiddenhazardcontent = item.Hiddenhazardcontent,
                Maintenanceinstructions = item.Maintenanceinstructions,
                Recommendationcontent = item.Recommendationcontent,
                Recommendedrules = item.Recommendedrules
            }).ToList();

            var data = new UpdateInspectionTaskDetailDto
            {
                Task = task,
                Taskitems = taskitemList
            };

            _logger.LogInformation("获取巡检任务详情成功，ID：{Id}，任务项数量：{Count}", id, taskitemList.Count);
            return new JsonResult(new { code = ResponseCode.成功, data, msg = "" });
        }

        [HttpGet("{id}/detail")]
        public async Task<IActionResult> GetInspectionTaskDetail(int id)
        {
            var task = await _context.InspectionTasks.FindAsync(id);
            if (task == null)
            {
                _logger.LogWarning("未找到巡检任务详情，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            var taskitems = await _context.Taskitems
                .Where(x => x.Taskid == id)
                .ToListAsync();

            var itemIds = taskitems.Select(x => x.Itemid).ToList();

            var attachments = await _context.Attachments
                .Where(x => itemIds.Contains(x.Taskitemid))
                .ToListAsync();

            foreach (var item in taskitems)
            {
                await _serviceTools.RefreshRenderSchemaAsync(item);
            }

            var taskitemDtos = taskitems.Select(item => new TaskitemDetailDto
            {
                Itemid = item.Itemid,
                Taskid = item.Taskid,
                Inspectionitemid = item.Inspectionitemid,
                Taskname = item.Taskname,
                Categorypath = item.Categorypath,
                Taskresult = item.Taskresult,
                Isnormal = item.Isnormal,
                Isrecheck = item.Isrecheck,
                Createtime = _serviceTools.NormalizeChinaTime(item.Createtime),
                ExecutionStatus = item.ExecutionStatus,
                Updatetime = _serviceTools.NormalizeChinaTime(item.Updatetime?? DateTime.Now),
                SourceType = item.SourceType,
                RenderSchemaJson = item.RenderSchemaJson,
                Displaycondition =item.Displaycondition,
                Hiddenhazardcontent = item.Hiddenhazardcontent,
                Maintenanceinstructions = item.Maintenanceinstructions,
                Recommendationcontent = item.Recommendationcontent,
                Recommendedrules = item.Recommendedrules,
                
                
                Attachments = attachments
                    .Where(a => a.Taskitemid == item.Itemid)
                    .ToList()
            }).ToList();

            var data = new InspectionTaskDetailDto
            {
                Task = task,
                Taskitems = taskitemDtos
            };

            _logger.LogInformation("获取巡检任务详情成功，ID：{Id}，任务项数量：{Count}", id, taskitemDtos.Count);
            return new JsonResult(new { code = ResponseCode.成功, data, msg = "" });
        }

        // DELETE: api/InspectionTasks/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInspectionTask(int id)
        {
            var task = await _context.InspectionTasks.FindAsync(id);
            if (task == null)
            {
                _logger.LogWarning("删除失败，巡检任务不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.InspectionTasks.Remove(task);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除巡检任务成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool InspectionTaskExists(int id)
        {
            return _context.InspectionTasks.Any(e => e.Taskid == id);
        }



        private InspectionTask ToViewDto(InspectionTask task) => new()
        {
            Taskid = task.Taskid,
            Projectid = task.Projectid,
            Templateid = task.Templateid,
            Productid = task.Productid,
            Status = task.Status,
            TaskNo = task.TaskNo,
            Assigneduserid = task.Assigneduserid,
            Inspectiontype = task.Inspectiontype,
            Ifdel = task.Ifdel,
            Assignedusername = task.Assignedusername,
            Version = task.Version,
            DownloadedAt = _serviceTools.NormalizeChinaTime(task.DownloadedAt),
            LocalUpdatedAt = _serviceTools.NormalizeChinaTime(task.LocalUpdatedAt),
            DownloadDeviceName = task.DownloadDeviceName,
        };
    }
}
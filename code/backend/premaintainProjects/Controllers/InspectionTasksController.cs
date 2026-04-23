using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using premaintainProjects.Dtos;
using premaintainProjects.Models;
using premaintainProjects.Services;
using System;
using System.Collections.Generic;
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
            var tasks = await _context.InspectionTasks.ToListAsync();
            _logger.LogInformation("获取所有巡检任务，数量：{Count}", tasks.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = tasks, msg = "" });
        }

        // GET: api/InspectionTasks/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetInspectionTask(int id)
        {
            var task = await _context.InspectionTasks.FindAsync(id);
            if (task == null)
            {
                _logger.LogWarning("未找到巡检任务，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取巡检任务，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = task, msg = "" });
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

            return new JsonResult(new { code = ResponseCode.成功, data = tasks, msg = "" });
        }

        // PUT: api/InspectionTasks
        [HttpPut]
        public async Task<IActionResult> PutInspectionTask(InspectionTask inspectionTask)
        {
            _context.Entry(inspectionTask).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!InspectionTaskExists(inspectionTask.Taskid))
                {
                    _logger.LogWarning("更新失败，巡检任务不存在，ID：{Id}", inspectionTask.Taskid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新巡检任务时发生并发异常，ID：{Id}", inspectionTask.Taskid);
                    throw;
                }
            }

            _logger.LogInformation("更新巡检任务成功，ID：{Id}", inspectionTask.Taskid);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionTask.Taskid, msg = "" });
        }

        [HttpPut("UpdateTasklist")]
        public async Task<IActionResult> BatchUpdateInspectionTasks([FromBody] List<InspectionTask> tasks)
        {
            if (tasks == null || tasks.Count == 0)
            {
                return new JsonResult(new { code = ResponseCode.参数无效, data = (object)null, msg = "参数不能为空" });
            }

            var ids = tasks.Select(x => x.Taskid).ToList();
            var existingTasks = await _context.InspectionTasks
                .Where(x => ids.Contains(x.Taskid))
                .ToListAsync();

            foreach (var existing in existingTasks)
            {
                var input = tasks.FirstOrDefault(x => x.Taskid == existing.Taskid);
                if (input == null) continue;

                existing.Projectid = input.Projectid;
                existing.Templateid = input.Templateid;
                existing.Productid = input.Productid;
                existing.Status = input.Status;
                existing.TaskNo = input.TaskNo;
                existing.Assigneduserid = input.Assigneduserid;
                existing.Inspectiontype = input.Inspectiontype;
                existing.Ifdel = input.Ifdel;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("批量更新巡检任务成功，数量：{Count}", existingTasks.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = ids, msg = "" });
        }

        // POST: api/InspectionTasks
        [HttpPost]
        public async Task<IActionResult> PostInspectionTask(InspectionTask inspectionTask)
        {
            inspectionTask.Taskid = 0; // 强制让数据库分配主键
            _context.InspectionTasks.Add(inspectionTask);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增巡检任务成功，ID：{Id}", inspectionTask.Taskid);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionTask.Taskid, msg = "" });
        }

        // GET: api/InspectionTasks/{id}/detail
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

            foreach (var item in taskitems)
            {
                await _serviceTools.RefreshRenderSchemaAsync(item);
            }            

            var data = new InspectionTaskDetailDto
            {
                Task = task,
                Taskitems = taskitems
            };

            _logger.LogInformation("获取巡检任务详情成功，ID：{Id}，任务项数量：{Count}", id, taskitems.Count);
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

        private async Task FillRenderSchemaAsync(List<Taskitem> taskitems)
        {
            foreach (var item in taskitems)
            {
                item.RenderSchemaJson = await _serviceTools.BuildRenderSchemaJsonAsync(item.Inspectionitemid);
            }
        }
    }
}
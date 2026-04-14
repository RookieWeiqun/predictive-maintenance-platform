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

namespace premaintainProjects.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InspectionTasksController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<InspectionTasksController> _logger;

        public InspectionTasksController(PredictiveMaintenancePlatformContext context, ILogger<InspectionTasksController> logger)
        {
            _context = context;
            _logger = logger;
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
    }
}
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

        [HttpPut("batch")]
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

        // POST: api/InspectionTasks/equipment
        [HttpPost("equipment")]
        public async Task<IActionResult> PostInspectionTask4Equipment(InspectionTask4Equipment inspectionTask4Equipment)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var productIds = await _context.Products
                    .Where(p => p.Equipid == inspectionTask4Equipment.Equipmentid)
                    .Select(p => p.Productid)
                    .ToListAsync();

                if (productIds.Count == 0)
                {
                    _logger.LogWarning("未找到设备对应的产品，EquipmentId：{EquipmentId}", inspectionTask4Equipment.Equipmentid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "未找到设备对应的产品" });
                }

                var inspectionTasks = productIds.Select(productId => new InspectionTask
                {
                    Taskid = 0,
                    Projectid = inspectionTask4Equipment.Projectid,
                    Templateid = inspectionTask4Equipment.Templateid,
                    Status = inspectionTask4Equipment.Status,
                    TaskNo = inspectionTask4Equipment.TaskNo,
                    Assigneduserid = inspectionTask4Equipment.Assigneduserid,
                    Productid = productId,
                    Inspectiontype = inspectionTask4Equipment.Inspectiontype,
                    Ifdel = false
                }).ToList();

                _context.InspectionTasks.AddRange(inspectionTasks);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("按设备批量新增巡检任务成功，EquipmentId：{EquipmentId}，数量：{Count}",
                    inspectionTask4Equipment.Equipmentid, inspectionTasks.Count);

                return new JsonResult(new
                {
                    code = ResponseCode.成功,
                    data = inspectionTasks.Select(x => x.Taskid).ToList(),
                    msg = ""
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "按设备批量新增巡检任务失败，EquipmentId：{EquipmentId}", inspectionTask4Equipment.Equipmentid);
                return new JsonResult(new { code = ResponseCode.操作失败, data = (object)null, msg = "操作失败" });
            }
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
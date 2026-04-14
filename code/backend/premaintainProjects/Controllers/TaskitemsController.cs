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
    public class TaskitemsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<TaskitemsController> _logger;

        public TaskitemsController(PredictiveMaintenancePlatformContext context, ILogger<TaskitemsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Taskitems
        [HttpGet]
        public async Task<IActionResult> GetTaskitems()
        {
            var items = await _context.Taskitems.ToListAsync();
            _logger.LogInformation("获取所有任务项，数量：{Count}", items.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = items, msg = "" });
        }

        // GET: api/Taskitems/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTaskitem(int id)
        {
            var item = await _context.Taskitems.FindAsync(id);
            if (item == null)
            {
                _logger.LogWarning("未找到任务项，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取任务项，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = item, msg = "" });
        }

        // GET: api/Taskitems/ByTask/{taskid}
        [HttpGet("ByTask/{taskid}")]
        public async Task<IActionResult> GetTaskitemsByTaskId(int taskid)
        {
            var items = await _context.Taskitems
                .Where(t => t.Taskid == taskid)
                .ToListAsync();

            _logger.LogInformation("按Taskid检索任务项，Taskid：{Taskid}，数量：{Count}", taskid, items.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = items, msg = "" });
        }

        // PUT: api/Taskitems
        [HttpPut]
        public async Task<IActionResult> PutTaskitem(Taskitem taskitem)
        {
            _context.Entry(taskitem).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TaskitemExists(taskitem.Itemid))
                {
                    _logger.LogWarning("更新失败，任务项不存在，ID：{Id}", taskitem.Itemid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新任务项时发生并发异常，ID：{Id}", taskitem.Itemid);
                    throw;
                }
            }

            _logger.LogInformation("更新任务项成功，ID：{Id}", taskitem.Itemid);
            return new JsonResult(new { code = ResponseCode.成功, data = taskitem.Itemid, msg = "" });
        }

        // POST: api/Taskitems
        [HttpPost]
        public async Task<IActionResult> PostTaskitem(Taskitem taskitem)
        {
            taskitem.Itemid = 0; // 强制让数据库分配主键
            _context.Taskitems.Add(taskitem);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增任务项成功，ID：{Id}", taskitem.Itemid);
            return new JsonResult(new { code = ResponseCode.成功, data = taskitem.Itemid, msg = "" });
        }

        // DELETE: api/Taskitems/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTaskitem(int id)
        {
            var item = await _context.Taskitems.FindAsync(id);
            if (item == null)
            {
                _logger.LogWarning("删除失败，任务项不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.Taskitems.Remove(item);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除任务项成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool TaskitemExists(int id)
        {
            return _context.Taskitems.Any(e => e.Itemid == id);
        }
    }
}
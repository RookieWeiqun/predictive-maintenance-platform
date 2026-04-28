using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Build.Framework;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using premaintainProjects.Models;
using premaintainProjects.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using static premaintainProjects.Models.otherModels;

namespace premaintainProjects.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaskitemsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<TaskitemsController> _logger;
        private readonly ServiceTools _serviceTools;

        public TaskitemsController(PredictiveMaintenancePlatformContext context, ILogger<TaskitemsController> logger, ServiceTools serviceTools)
        {
            _context = context;
            _logger = logger;
            _serviceTools = serviceTools;
        }

        // GET: api/Taskitems
        [HttpGet]
        public async Task<IActionResult> GetTaskitems()
        {
            var items = await _context.Taskitems.ToListAsync();

            foreach (var item in items)
            {
                await _serviceTools.RefreshRenderSchemaAsync(item);
            }

            _logger.LogInformation("获取所有任务项，数量：{Count}", items.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = items, msg = "" });
        }

        // GET: api/Taskitems/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTaskitem(Guid id)
        {
            var item = await _context.Taskitems.FindAsync(id);
            if (item == null)
            {
                _logger.LogWarning("未找到任务项，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            await _serviceTools.RefreshRenderSchemaAsync(item);

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

            foreach (var item in items)
            {                
                await _serviceTools.RefreshRenderSchemaAsync(item);
            }

            _logger.LogInformation("按Taskid检索任务项，Taskid：{Taskid}，数量：{Count}", taskid, items.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = items, msg = "" });
        }

        // PUT: api/Taskitems
        [HttpPut]
        public async Task<IActionResult> PutTaskitem(Taskitem taskitem)
        {
            var existing = await _context.Taskitems.FindAsync(taskitem.Itemid);
            if (existing == null)
            {
                _logger.LogWarning("更新失败，任务项不存在，ID：{Id}", taskitem.Itemid);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            existing.Taskid = taskitem.Taskid;
            existing.Taskname = taskitem.Taskname;
            existing.Categorypath = taskitem.Categorypath;
            existing.Taskresult = taskitem.Taskresult;
            existing.Isnormal = taskitem.Isnormal;
            existing.Isrecheck = taskitem.Isrecheck;
            existing.ExecutionStatus = taskitem.ExecutionStatus;
            existing.SourceType = taskitem.SourceType;
            existing.Inspectionitemid = taskitem.Inspectionitemid;
            existing.Updatetime = DateTime.Now;
            existing.Createtime = taskitem.Createtime;
            existing.Itemid = taskitem.Itemid;            

            //  await _serviceTools.RefreshRenderSchemaAsync(existing);

            await _context.SaveChangesAsync();

            _logger.LogInformation("更新任务项成功，ID：{Id}", existing.Itemid);
            return new JsonResult(new { code = ResponseCode.成功, data = existing.Itemid, msg = "" });
        }

        [HttpPost]
        public async Task<IActionResult> PostTaskitem(Taskitem taskitem)
        {
            taskitem.Itemid = Guid.NewGuid();
            taskitem.Createtime = DateTime.Now;
            taskitem.Updatetime = DateTime.Now;

            
        //    await _serviceTools.RefreshRenderSchemaAsync(taskitem);

            _context.Taskitems.Add(taskitem);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增任务项成功，ID：{Id}", taskitem.Itemid);
            return new JsonResult(new { code = ResponseCode.成功, data = taskitem.Itemid, msg = "" });
        }

        // DELETE: api/Taskitems/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTaskitem(Guid id)
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

        private bool TaskitemExists(Guid id)
        {
            return _context.Taskitems.Any(e => e.Itemid == id);
        }

    }
}
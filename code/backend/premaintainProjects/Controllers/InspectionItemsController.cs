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
    public class InspectionItemsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<InspectionItemsController> _logger;

        public InspectionItemsController(PredictiveMaintenancePlatformContext context, ILogger<InspectionItemsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/InspectionItems
        [HttpGet]
        public async Task<IActionResult> GetInspectionItems()
        {
            var items = await _context.InspectionItems.ToListAsync();
            _logger.LogInformation("获取所有巡检项，数量：{Count}", items.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = items, msg = "" });
        }

        // GET: api/InspectionItems/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetInspectionItem(int id)
        {
            var item = await _context.InspectionItems.FindAsync(id);
            if (item == null)
            {
                _logger.LogWarning("未找到巡检项，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取巡检项，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = item, msg = "" });
        }

        // GET: api/InspectionItems/Search?templateid=1&categoryid=2
        [HttpGet("Search")]
        public async Task<IActionResult> SearchItems(
            [FromQuery] int? templateid,
            [FromQuery] int? categoryid)
        {
            if (!templateid.HasValue || !categoryid.HasValue)
            {
                _logger.LogWarning("检索巡检项时参数不完整，Templateid：{Templateid}，Categoryid：{Categoryid}", templateid, categoryid);
                return new JsonResult(new { code = ResponseCode.参数无效, data = (object)null, msg = "templateid和categoryid必须同时提供" });
            }

            var items = await _context.InspectionItems
                .Where(i => i.Templateid == templateid.Value && i.Categoryid == categoryid.Value)
                .OrderBy(i => i.SortOrder)
                .ToListAsync();

            _logger.LogInformation(
                "按Templateid和Categoryid检索巡检项并排序，Templateid：{Templateid}，Categoryid：{Categoryid}，数量：{Count}",
                templateid, categoryid, items.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = items, msg = "" });
        }

        // PUT: api/InspectionItems
        [HttpPut]
        public async Task<IActionResult> PutInspectionItem(InspectionItem inspectionItem)
        {
            _context.Entry(inspectionItem).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!InspectionItemExists(inspectionItem.Itemid))
                {
                    _logger.LogWarning("更新失败，巡检项不存在，ID：{Id}", inspectionItem.Itemid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新巡检项时发生并发异常，ID：{Id}", inspectionItem.Itemid);
                    throw;
                }
            }

            _logger.LogInformation("更新巡检项成功，ID：{Id}", inspectionItem.Itemid);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionItem.Itemid, msg = "" });
        }

        // POST: api/InspectionItems
        [HttpPost]
        public async Task<IActionResult> PostInspectionItem(InspectionItem inspectionItem)
        {
            inspectionItem.Itemid = 0; // 强制让数据库分配主键
            _context.InspectionItems.Add(inspectionItem);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增巡检项成功，ID：{Id}", inspectionItem.Itemid);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionItem.Itemid, msg = "" });
        }

        // DELETE: api/InspectionItems/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInspectionItem(int id)
        {
            var item = await _context.InspectionItems.FindAsync(id);
            if (item == null)
            {
                _logger.LogWarning("删除失败，巡检项不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.InspectionItems.Remove(item);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除巡检项成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool InspectionItemExists(int id)
        {
            return _context.InspectionItems.Any(e => e.Itemid == id);
        }
    }
}
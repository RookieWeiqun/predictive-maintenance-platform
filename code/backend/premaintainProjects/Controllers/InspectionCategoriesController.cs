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
    public class InspectionCategoriesController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<InspectionCategoriesController> _logger;

        public InspectionCategoriesController(PredictiveMaintenancePlatformContext context, ILogger<InspectionCategoriesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/InspectionCategories
        [HttpGet]
        public async Task<IActionResult> GetInspectionCategories()
        {
            var categories = await _context.InspectionCategories.ToListAsync();
            _logger.LogInformation("获取所有巡检分类，数量：{Count}", categories.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = categories, msg = "" });
        }

        // GET: api/InspectionCategories/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetInspectionCategory(int id)
        {
            var category = await _context.InspectionCategories.FindAsync(id);
            if (category == null)
            {
                _logger.LogWarning("未找到巡检分类，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取巡检分类，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = category, msg = "" });
        }

        [HttpGet("Search")]
        public async Task<IActionResult> SearchCategories(
            [FromQuery] int? templateid,
            [FromQuery] int? parentid)
        {
            if (!templateid.HasValue || !parentid.HasValue)
            {
                _logger.LogWarning("检索巡检分类时参数不完整，Templateid：{Templateid}，Parentid：{Parentid}", templateid, parentid);
                return new JsonResult(new { code = ResponseCode.参数无效, data = (object)null, msg = "templateid和parentid必须同时提供" });
            }

            var categories = await _context.InspectionCategories
                .Where(c => c.Templateid == templateid.Value && c.Categoryid == parentid.Value).OrderBy(c => c.SortOrder)
                .ToListAsync();

            _logger.LogInformation(
                "多条件检索巡检分类，Templateid：{Templateid}，Parentid：{Parentid}，数量：{Count}",
                templateid, parentid, categories.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = categories, msg = "" });
        }

        // PUT: api/InspectionCategories
        [HttpPut]
        public async Task<IActionResult> PutInspectionCategory(InspectionCategory inspectionCategory)
        {
            _context.Entry(inspectionCategory).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!InspectionCategoryExists(inspectionCategory.Categoryid))
                {
                    _logger.LogWarning("更新失败，巡检分类不存在，ID：{Id}", inspectionCategory.Categoryid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新巡检分类时发生并发异常，ID：{Id}", inspectionCategory.Categoryid);
                    throw;
                }
            }

            _logger.LogInformation("更新巡检分类成功，ID：{Id}", inspectionCategory.Categoryid);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionCategory.Categoryid, msg = "" });
        }

        // POST: api/InspectionCategories
        [HttpPost]
        public async Task<IActionResult> PostInspectionCategory(InspectionCategory inspectionCategory)
        {
            inspectionCategory.Categoryid = 0; // 强制让数据库分配主键
            _context.InspectionCategories.Add(inspectionCategory);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增巡检分类成功，ID：{Id}", inspectionCategory.Categoryid);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionCategory.Categoryid, msg = "" });
        }

        // DELETE: api/InspectionCategories/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInspectionCategory(int id)
        {
            var category = await _context.InspectionCategories.FindAsync(id);
            if (category == null)
            {
                _logger.LogWarning("删除失败，巡检分类不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.InspectionCategories.Remove(category);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除巡检分类成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool InspectionCategoryExists(int id)
        {
            return _context.InspectionCategories.Any(e => e.Categoryid == id);
        }
    }
}
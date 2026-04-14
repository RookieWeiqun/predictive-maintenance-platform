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
    public class InspectionTemplatesController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<InspectionTemplatesController> _logger;

        public InspectionTemplatesController(PredictiveMaintenancePlatformContext context, ILogger<InspectionTemplatesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/InspectionTemplates
        [HttpGet]
        public async Task<IActionResult> GetInspectionTemplates()
        {
            var templates = await _context.InspectionTemplates.ToListAsync();
            _logger.LogInformation("获取所有巡检模板，数量：{Count}", templates.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = templates, msg = "" });
        }

        // GET: api/InspectionTemplates/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetInspectionTemplate(int id)
        {
            var template = await _context.InspectionTemplates.FindAsync(id);
            if (template == null)
            {
                _logger.LogWarning("未找到巡检模板，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取巡检模板，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = template, msg = "" });
        }
        // GET: api/InspectionTemplates/Search?inspectiontype=1&productcategory=xxx&mlfb=yyy
        [HttpGet("Search")]
        public async Task<IActionResult> SearchTemplates(
            [FromQuery] int? inspectiontype,
            [FromQuery] string? productcategory,
            [FromQuery] string? mlfb)
        {
            var query = _context.InspectionTemplates.AsQueryable();

            if (inspectiontype.HasValue)
                query = query.Where(t => t.Inspectiontype == inspectiontype.Value);

            if (!string.IsNullOrEmpty(productcategory))
                query = query.Where(t => t.Productcategory == productcategory);

            if (!string.IsNullOrEmpty(mlfb))
                query = query.Where(t => t.Mlfb == mlfb);

            var templates = await query.ToListAsync();

            _logger.LogInformation(
                "多条件检索巡检模板，Inspectiontype：{Inspectiontype}，Productcategory：{Productcategory}，MLFB：{Mlfb}，数量：{Count}",
                inspectiontype, productcategory, mlfb, templates.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = templates, msg = "" });
        }

        // PUT: api/InspectionTemplates
        [HttpPut]
        public async Task<IActionResult> PutInspectionTemplate(InspectionTemplate inspectionTemplate)
        {
            _context.Entry(inspectionTemplate).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!InspectionTemplateExists(inspectionTemplate.Templateid))
                {
                    _logger.LogWarning("更新失败，巡检模板不存在，ID：{Id}", inspectionTemplate.Templateid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新巡检模板时发生并发异常，ID：{Id}", inspectionTemplate.Templateid);
                    throw;
                }
            }

            _logger.LogInformation("更新巡检模板成功，ID：{Id}", inspectionTemplate.Templateid);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionTemplate.Templateid, msg = "" });
        }

        // POST: api/InspectionTemplates
        [HttpPost]
        public async Task<IActionResult> PostInspectionTemplate(InspectionTemplate inspectionTemplate)
        {
            inspectionTemplate.Templateid = 0; // 强制让数据库分配主键
            _context.InspectionTemplates.Add(inspectionTemplate);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增巡检模板成功，ID：{Id}", inspectionTemplate.Templateid);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionTemplate.Templateid, msg = "" });
        }

        // DELETE: api/InspectionTemplates/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInspectionTemplate(int id)
        {
            var template = await _context.InspectionTemplates.FindAsync(id);
            if (template == null)
            {
                _logger.LogWarning("删除失败，巡检模板不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.InspectionTemplates.Remove(template);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除巡检模板成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool InspectionTemplateExists(int id)
        {
            return _context.InspectionTemplates.Any(e => e.Templateid == id);
        }
    }
}
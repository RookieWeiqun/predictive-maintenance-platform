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
    public class ReportsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(PredictiveMaintenancePlatformContext context, ILogger<ReportsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Reports
        [HttpGet]
        public async Task<IActionResult> GetReports()
        {
            var reports = await _context.Reports.ToListAsync();
            _logger.LogInformation("获取所有报告，数量：{Count}", reports.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = reports, msg = "" });
        }

        // GET: api/Reports/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetReport(int id)
        {
            var report = await _context.Reports.FindAsync(id);
            if (report == null)
            {
                _logger.LogWarning("未找到报告，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取报告，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = report, msg = "" });
        }

        // GET: api/Reports/ByProject/{projectid}
        [HttpGet("ByProject/{projectid}")]
        public async Task<IActionResult> GetReportsByProject(int projectid)
        {
            var reports = await _context.Reports
                .Where(r => r.Projectid == projectid)
                .ToListAsync();

            _logger.LogInformation("按项目ID检索报告，ProjectId：{ProjectId}，数量：{Count}", projectid, reports.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = reports, msg = "" });
        }

        // PUT: api/Reports
        [HttpPut]
        public async Task<IActionResult> PutReport(Report report)
        {
            _context.Entry(report).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ReportExists(report.Reportid))
                {
                    _logger.LogWarning("更新失败，报告不存在，ID：{Id}", report.Reportid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新报告时发生并发异常，ID：{Id}", report.Reportid);
                    throw;
                }
            }

            _logger.LogInformation("更新报告成功，ID：{Id}", report.Reportid);
            return new JsonResult(new { code = ResponseCode.成功, data = report.Reportid, msg = "" });
        }

        // POST: api/Reports
        [HttpPost]
        public async Task<IActionResult> PostReport(Report report)
        {
            report.Reportid = 0; // 强制让数据库分配主键
            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增报告成功，ID：{Id}", report.Reportid);
            return new JsonResult(new { code = ResponseCode.成功, data = report.Reportid, msg = "" });
        }

        // DELETE: api/Reports/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReport(int id)
        {
            var report = await _context.Reports.FindAsync(id);
            if (report == null)
            {
                _logger.LogWarning("删除失败，报告不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.Reports.Remove(report);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除报告成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool ReportExists(int id)
        {
            return _context.Reports.Any(e => e.Reportid == id);
        }
    }
}
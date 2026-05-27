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
    public class ProjectsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<ProjectsController> _logger;

        public ProjectsController(PredictiveMaintenancePlatformContext context, ILogger<ProjectsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Projects
        [HttpGet]
        public async Task<IActionResult> GetProjects()
        {
            var projects = await _context.Projects.Where(p => p.Ifdel != true).ToListAsync();
            _logger.LogInformation("获取所有项目，数量：{Count}", projects.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = projects, msg = "" });
        }

        // GET: api/Projects/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetProject(int id)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null)
            {
                _logger.LogWarning("未找到项目，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取项目，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = project, msg = "" });
        }
        // GET: api/Projects/Search?companyid=1&assigneduserid=2
        [HttpGet("Search")]
        public async Task<IActionResult> SearchProjects(
            [FromQuery] int? companyid,
            [FromQuery] int? assigneduserid)
        {
            var query = _context.Projects.Where(p => p.Ifdel != true).AsQueryable();

            if (companyid.HasValue)
                query = query.Where(p => p.Companyid == companyid.Value);

            if (assigneduserid.HasValue)
                query = query.Where(p => p.Assigneduserid == assigneduserid.Value);

            var projects = await query.ToListAsync();

            _logger.LogInformation(
                "按Companyid和Assigneduserid检索项目，Companyid：{Companyid}，Assigneduserid：{Assigneduserid}，数量：{Count}",
                companyid, assigneduserid, projects.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = projects, msg = "" });
        }

        // PUT: api/Projects
        [HttpPut]
        public async Task<IActionResult> PutProject(Project project)
        {
            _context.Entry(project).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProjectExists(project.Projectid))
                {
                    _logger.LogWarning("更新失败，项目不存在，ID：{Id}", project.Projectid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新项目时发生并发异常，ID：{Id}", project.Projectid);
                    throw;
                }
            }

            _logger.LogInformation("更新项目成功，ID：{Id}", project.Projectid);
            return new JsonResult(new { code = ResponseCode.成功, data = project.Projectid, msg = "" });
        }

        // POST: api/Projects
        [HttpPost]
        public async Task<IActionResult> PostProject(Project project)
        {
            project.Projectid = 0; // 强制让数据库分配主键
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增项目成功，ID：{Id}", project.Projectid);
            return new JsonResult(new { code = ResponseCode.成功, data = project.Projectid, msg = "" });
        }

        // DELETE: api/Projects/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(int id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            var project = await _context.Projects.FindAsync(id);
            if (project == null)
            {
                _logger.LogWarning("删除失败，项目不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            // 项目逻辑删除
            project.Ifdel = true;

            // 下面这些表需要先确认模型里都有 Ifdel 字段
            var inspectionTasks = await _context.InspectionTasks
                .Where(x => x.Projectid == id)
                .ToListAsync();
            inspectionTasks.ForEach(x => x.Ifdel = true);

            var projectEquipments = await _context.ProjectEquipments
                .Where(x => x.Projectid == id)
                .ToListAsync();
            projectEquipments.ForEach(x => x.Ifdel = true);

            var reports = await _context.Reports
                .Where(x => x.Projectid == id)
                .ToListAsync();
            reports.ForEach(x => x.Ifdel = true);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation("删除项目成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool ProjectExists(int id)
        {
            return _context.Projects.Any(e => e.Projectid == id);
        }
    }
}
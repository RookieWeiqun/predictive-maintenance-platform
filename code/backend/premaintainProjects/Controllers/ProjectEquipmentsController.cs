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
    public class ProjectEquipmentsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<ProjectEquipmentsController> _logger;

        public ProjectEquipmentsController(PredictiveMaintenancePlatformContext context, ILogger<ProjectEquipmentsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/ProjectEquipments
        [HttpGet]
        public async Task<IActionResult> GetProjectEquipments()
        {
            var list = await _context.ProjectEquipments.ToListAsync();
            _logger.LogInformation("获取所有项目设备，数量：{Count}", list.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = list, msg = "" });
        }

        // GET: api/ProjectEquipments/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetProjectEquipment(int id)
        {
            var item = await _context.ProjectEquipments.FindAsync(id);
            if (item == null)
            {
                _logger.LogWarning("未找到项目设备，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取项目设备，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = item, msg = "" });
        }

        // GET: api/ProjectEquipments/ByProject/{projectid}
        [HttpGet("ByProject/{projectid}")]
        public async Task<IActionResult> GetEquipmentsByProject(int projectid)
        {
            var equipments = await _context.ProjectEquipments
                .Where(e => e.Projectid == projectid)
                .ToListAsync();

            _logger.LogInformation("按项目ID检索设备，ProjectId：{ProjectId}，数量：{Count}", projectid, equipments.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = equipments, msg = "" });
        }

        // PUT: api/ProjectEquipments
        [HttpPut]
        public async Task<IActionResult> PutProjectEquipment(ProjectEquipment projectEquipment)
        {
            _context.Entry(projectEquipment).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProjectEquipmentExists(projectEquipment.Peid))
                {
                    _logger.LogWarning("更新失败，项目设备不存在，ID：{Id}", projectEquipment.Peid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新项目设备时发生并发异常，ID：{Id}", projectEquipment.Peid);
                    throw;
                }
            }

            _logger.LogInformation("更新项目设备成功，ID：{Id}", projectEquipment.Peid);
            return new JsonResult(new { code = ResponseCode.成功, data = projectEquipment.Peid, msg = "" });
        }

        // POST: api/ProjectEquipments
        [HttpPost]
        public async Task<IActionResult> PostProjectEquipment(ProjectEquipment projectEquipment)
        {
            projectEquipment.Peid = 0; // 强制让数据库分配主键
            _context.ProjectEquipments.Add(projectEquipment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增项目设备成功，ID：{Id}", projectEquipment.Peid);
            return new JsonResult(new { code = ResponseCode.成功, data = projectEquipment.Peid, msg = "" });
        }

        // DELETE: api/ProjectEquipments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProjectEquipment(int id)
        {
            var item = await _context.ProjectEquipments.FindAsync(id);
            if (item == null)
            {
                _logger.LogWarning("删除失败，项目设备不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.ProjectEquipments.Remove(item);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除项目设备成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool ProjectEquipmentExists(int id)
        {
            return _context.ProjectEquipments.Any(e => e.Peid == id);
        }
    }
}
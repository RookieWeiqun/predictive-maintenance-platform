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
    public class EquipmentsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<EquipmentsController> _logger;

        public EquipmentsController(PredictiveMaintenancePlatformContext context, ILogger<EquipmentsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Equipments
        [HttpGet]
        public async Task<IActionResult> GetEquipments()
        {
            var equipments = await _context.Equipments.ToListAsync();
            _logger.LogInformation("获取所有设备，数量：{Count}", equipments.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = equipments, msg = "" });
        }

        // GET: api/Equipments/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetEquipment(int id)
        {
            var equipment = await _context.Equipments.FindAsync(id);
            if (equipment == null)
            {
                _logger.LogWarning("未找到设备，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取设备，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = equipment, msg = "" });
        }

        // GET: api/Equipments/ByCompany/{companyid}
        [HttpGet("ByCompany/{companyid}")]
        public async Task<IActionResult> GetEquipmentsByCompany(int companyid)
        {
            var equipments = await _context.Equipments
                .Where(e => e.Companyid == companyid)
                .ToListAsync();

            _logger.LogInformation("按公司ID检索设备，CompanyId：{CompanyId}，数量：{Count}", companyid, equipments.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = equipments, msg = "" });
        }

        // PUT: api/Equipments
        [HttpPut]
        public async Task<IActionResult> PutEquipment(Equipment equipment)
        {
            _context.Entry(equipment).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!EquipmentExists(equipment.Equipid))
                {
                    _logger.LogWarning("更新失败，设备不存在，ID：{Id}", equipment.Equipid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新设备时发生并发异常，ID：{Id}", equipment.Equipid);
                    throw;
                }
            }

            _logger.LogInformation("更新设备成功，ID：{Id}", equipment.Equipid);
            return new JsonResult(new { code = ResponseCode.成功, data = equipment.Equipid, msg = "" });
        }

        // POST: api/Equipments
        [HttpPost]
        public async Task<IActionResult> PostEquipment(Equipment equipment)
        {
            equipment.Equipid = 0; // 强制让数据库分配主键
            _context.Equipments.Add(equipment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增设备成功，ID：{Id}", equipment.Equipid);
            return new JsonResult(new { code = ResponseCode.成功, data = equipment.Equipid, msg = "" });
        }

        // DELETE: api/Equipments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEquipment(int id)
        {
            var equipment = await _context.Equipments.FindAsync(id);
            if (equipment == null)
            {
                _logger.LogWarning("删除失败，设备不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.Equipments.Remove(equipment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除设备成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool EquipmentExists(int id)
        {
            return _context.Equipments.Any(e => e.Equipid == id);
        }
    }
}
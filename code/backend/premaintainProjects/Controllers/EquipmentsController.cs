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

        [HttpPut]
        public async Task<IActionResult> PutEquipment(Equipment equipment)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var existingEquipment = await _context.Equipments.FindAsync(equipment.Equipid);
                if (existingEquipment == null)
                {
                    _logger.LogWarning("更新失败，设备不存在，ID：{Id}", equipment.Equipid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }

                var oldCount = existingEquipment.Number ?? 0;
                var newCount = equipment.Number ?? 0;

                existingEquipment.Companyid = equipment.Companyid;
                existingEquipment.Factory = equipment.Factory;
                existingEquipment.Workshop = equipment.Workshop;
                existingEquipment.Productcategory = equipment.Productcategory;
                existingEquipment.Productgroup = equipment.Productgroup;
                existingEquipment.Number = equipment.Number;
                existingEquipment.Mlfb = equipment.Mlfb;
                existingEquipment.Electricroom = equipment.Electricroom;

                await _context.SaveChangesAsync();

                if (newCount > oldCount)
                {
                    var addCount = newCount - oldCount;
                    var products = new List<Product>();

                    for (int i = 0; i < addCount; i++)
                    {
                        products.Add(new Product
                        {
                            Equipid = existingEquipment.Equipid,
                            Mlfb = existingEquipment.Mlfb,
                            Serialno = null
                        });
                    }

                    _context.Products.AddRange(products);
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                _logger.LogInformation("更新设备成功，ID：{Id}，产品数量由 {OldCount} 变为 {NewCount}", existingEquipment.Equipid, oldCount, newCount);
                return new JsonResult(new { code = ResponseCode.成功, data = existingEquipment.Equipid, msg = "" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "更新设备失败，ID：{Id}", equipment.Equipid);
                return new JsonResult(new { code = ResponseCode.操作失败, data = (object)null, msg = "更新失败" });
            }
        }
        // POST: api/Equipments
        [HttpPost]
        public async Task<IActionResult> PostEquipment(Equipment equipment)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                equipment.Equipid = 0;
                _context.Equipments.Add(equipment);
                await _context.SaveChangesAsync();

                if (equipment.Number.HasValue && equipment.Number.Value > 0)
                {
                    var products = new List<Product>();

                    for (int i = 0; i < equipment.Number.Value; i++)
                    {
                        products.Add(new Product
                        {
                            Equipid = equipment.Equipid,
                            Mlfb = equipment.Mlfb,
                            Serialno = null
                        });
                    }

                    _context.Products.AddRange(products);
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                _logger.LogInformation("新增设备成功，ID：{Id}，同步生成产品数量：{Count}",
                    equipment.Equipid, equipment.Number ?? 0);

                return new JsonResult(new { code = ResponseCode.成功, data = equipment.Equipid, msg = "" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "新增设备失败");
                return new JsonResult(new { code = ResponseCode.操作失败, data = (object)null, msg = "新增失败" });
            }
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
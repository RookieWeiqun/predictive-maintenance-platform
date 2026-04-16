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
    public class ProductsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<ProductsController> _logger;

        public ProductsController(PredictiveMaintenancePlatformContext context, ILogger<ProductsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Products
        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _context.Products.ToListAsync();
            _logger.LogInformation("获取所有产品，数量：{Count}", products.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = products, msg = "" });
        }

        // GET: api/Products/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                _logger.LogWarning("未找到产品，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取产品，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = product, msg = "" });
        }

        // GET: api/Products/Search?equipmentid=1&mlfb=xxx&serialno=yyy
        [HttpGet("Search")]
        public async Task<IActionResult> SearchProducts(
            [FromQuery] int? equipmentid,
            [FromQuery] string? mlfb,
            [FromQuery] string? serialno)
        {
            var query = _context.Products.AsQueryable();

            if (equipmentid.HasValue)
                query = query.Where(p => p.Equipid == equipmentid.Value);

            if (!string.IsNullOrEmpty(mlfb))
                query = query.Where(p => p.Mlfb == mlfb);

            if (!string.IsNullOrEmpty(serialno))
                query = query.Where(p => p.Serialno == serialno);

            var products = await query.ToListAsync();

            _logger.LogInformation(
                "多条件检索产品，Equipmentid：{Equipmentid}，Mlfb：{Mlfb}，Serialno：{Serialno}，数量：{Count}",
                equipmentid, mlfb, serialno, products.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = products, msg = "" });
        }

        // PUT: api/Products
        [HttpPut]
        public async Task<IActionResult> PutProduct(Product product)
        {
            _context.Entry(product).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProductExists(product.Productid))
                {
                    _logger.LogWarning("更新失败，产品不存在，ID：{Id}", product.Productid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新产品时发生并发异常，ID：{Id}", product.Productid);
                    throw;
                }
            }

            _logger.LogInformation("更新产品成功，ID：{Id}", product.Productid);
            return new JsonResult(new { code = ResponseCode.成功, data = product.Productid, msg = "" });
        }

        // POST: api/Products
        [HttpPost]
        public async Task<IActionResult> PostProduct(Product product)
        {
            product.Productid = 0; // 强制让数据库分配主键
            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增产品成功，ID：{Id}", product.Productid);
            return new JsonResult(new { code = ResponseCode.成功, data = product.Productid, msg = "" });
        }

        // DELETE: api/Products/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                _logger.LogWarning("删除失败，产品不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除产品成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool ProductExists(int id)
        {
            return _context.Products.Any(e => e.Productid == id);
        }
    }
}
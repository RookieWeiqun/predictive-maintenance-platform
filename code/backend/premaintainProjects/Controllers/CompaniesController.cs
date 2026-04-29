using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using premaintainProjects.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using static premaintainProjects.Models.otherModels;

namespace premaintainProjects.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CompaniesController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<CompaniesController> _logger;

        public CompaniesController(PredictiveMaintenancePlatformContext context, ILogger<CompaniesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Companies
        [HttpGet]
        public async Task<IActionResult> GetCompanies()
        {
            var companies = await _context.Companies.ToListAsync();
            return new JsonResult(new { code = ResponseCode.成功, data = companies, msg = "" });
        }

        // GET: api/Companies/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCompany(int id)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null)
            {
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            return new JsonResult(new { code = ResponseCode.成功, data = company, msg = "" });
        }

        // PUT: api/Companies/5
        [HttpPut]
        public async Task<IActionResult> PutCompany(Company company)
        {

            _context.Entry(company).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!CompanyExists(company.Companyid))
                {
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    throw;
                }
            }

            return new JsonResult(new { code = ResponseCode.成功, data = company.Companyid, msg = "" });
        }

        // POST: api/Companies
        [HttpPost]
        public async Task<IActionResult> PostCompany(Company company)
        {
            company.Companyid = 0; // 强制让数据库分配主键
            _context.Companies.Add(company);
            await _context.SaveChangesAsync();

            return new JsonResult(new { code = ResponseCode.成功, data = company.Companyid, msg = "" });
        }

        // DELETE: api/Companies/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCompany(int id)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null)
            {
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.Companies.Remove(company);
            await _context.SaveChangesAsync();

            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool CompanyExists(int id)
        {
            return _context.Companies.Any(e => e.Companyid == id);
        }

        // GET: api/Companies/SearchByCreditCode?creditcode=xxx
        [HttpGet("SearchByCreditCode")]
        public async Task<IActionResult> SearchByCreditCode([FromQuery] string creditcode)
        {
            if (string.IsNullOrWhiteSpace(creditcode))
            {
                return new JsonResult(new
                {
                    code = ResponseCode.参数无效,
                    data = (object)null,
                    msg = "creditcode不能为空"
                });
            }

            var company = await _context.Companies
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CreditCode == creditcode);

            if (company == null)
            {
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object)null,
                    msg = "记录不存在"
                });
            }

            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = company,
                msg = ""
            });
        }
    }
}

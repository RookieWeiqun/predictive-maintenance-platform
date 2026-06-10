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
    public class UsersController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<UsersController> _logger;

        public UsersController(PredictiveMaintenancePlatformContext context, ILogger<UsersController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users.ToListAsync();
            _logger.LogInformation("获取所有用户，数量：{Count}", users.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = users, msg = "" });
        }

        // GET: api/Users/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                _logger.LogWarning("未找到用户，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取用户，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = user, msg = "" });
        }

        // GET: api/Users/ByCompany/{companyid}
        [HttpGet("ByCompany/{companyid}")]
        public async Task<IActionResult> GetUsersByCompany(int companyid)
        {
            var users = await _context.Users
                .Where(u => u.Companyid == companyid)
                .ToListAsync();

            _logger.LogInformation("按公司ID检索用户，CompanyId：{CompanyId}，数量：{Count}", companyid, users.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = users, msg = "" });
        }

        // PUT: api/Users/5
        [HttpPut]
        public async Task<IActionResult> PutUser(User user)
        {
            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserExists(user.Userid))
                {
                    _logger.LogWarning("更新失败，用户不存在，ID：{Id}", user.Userid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新用户时发生并发异常，ID：{Id}", user.Userid);
                    throw;
                }
            }

            _logger.LogInformation("更新用户成功，ID：{Id}", user.Userid);
            return new JsonResult(new { code = ResponseCode.成功, data = user.Userid, msg = "" });
        }

        // POST: api/Users
        [HttpPost]
        public async Task<IActionResult> PostUser(User user)
        {
            user.Userid = 0; // 强制让数据库分配主键
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增用户成功，ID：{Id}", user.Userid);
            return new JsonResult(new { code = ResponseCode.成功, data = user.Userid, msg = "" });
        }

        // DELETE: api/Users/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                _logger.LogWarning("删除失败，用户不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除用户成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool UserExists(int id)
        {
            return _context.Users.Any(e => e.Userid == id);
        }
    }
}
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using premaintainProjects.Models;
using static premaintainProjects.Models.otherModels;

namespace premaintainProjects.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RolesController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<RolesController> _logger;

        public RolesController(PredictiveMaintenancePlatformContext context, ILogger<RolesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Roles
        [HttpGet]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _context.Roles.ToListAsync();
            _logger.LogInformation("获取所有角色，数量：{Count}", roles.Count);

            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = roles,
                msg = ""
            });
        }

        // GET: api/Roles/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRole(int id)
        {
            var role = await _context.Roles.FindAsync(id);

            if (role == null)
            {
                _logger.LogWarning("未找到角色，ID：{Id}", id);
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object?)null,
                    msg = "记录不存在"
                });
            }

            _logger.LogInformation("获取角色成功，ID：{Id}", id);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = role,
                msg = ""
            });
        }

        // PUT: api/Roles
        [HttpPut]
        public async Task<IActionResult> PutRole(Role role)
        {
            var existing = await _context.Roles.FindAsync(role.Roleid);
            if (existing == null)
            {
                _logger.LogWarning("更新角色失败，角色不存在，ID：{Id}", role.Roleid);
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object?)null,
                    msg = "记录不存在"
                });
            }

            _context.Entry(existing).CurrentValues.SetValues(role);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (!RoleExists(role.Roleid))
                {
                    _logger.LogWarning("更新角色失败，角色不存在，ID：{Id}", role.Roleid);
                    return new JsonResult(new
                    {
                        code = ResponseCode.记录不存在,
                        data = (object?)null,
                        msg = "记录不存在"
                    });
                }

                _logger.LogError(ex, "更新角色时发生并发异常，ID：{Id}", role.Roleid);
                throw;
            }

            _logger.LogInformation("更新角色成功，ID：{Id}", role.Roleid);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = role.Roleid,
                msg = ""
            });
        }

        // POST: api/Roles
        [HttpPost]
        public async Task<IActionResult> PostRole(Role role)
        {
            role.Roleid = 0;
            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增角色成功，ID：{Id}", role.Roleid);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = role.Roleid,
                msg = ""
            });
        }

        // DELETE: api/Roles/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRole(int id)
        {
            var role = await _context.Roles.FindAsync(id);
            if (role == null)
            {
                _logger.LogWarning("删除角色失败，角色不存在，ID：{Id}", id);
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object?)null,
                    msg = "记录不存在"
                });
            }

            _context.Roles.Remove(role);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除角色成功，ID：{Id}", id);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = id,
                msg = ""
            });
        }

        private bool RoleExists(int id)
        {
            return _context.Roles.Any(e => e.Roleid == id);
        }
    }
}
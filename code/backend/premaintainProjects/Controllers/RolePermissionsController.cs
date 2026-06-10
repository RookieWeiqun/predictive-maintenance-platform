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
    public class RolePermissionsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<RolePermissionsController> _logger;

        public RolePermissionsController(
            PredictiveMaintenancePlatformContext context,
            ILogger<RolePermissionsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/RolePermissions
        [HttpGet]
        public async Task<IActionResult> GetRolePermissions()
        {
            var rolePermissions = await _context.RolePermissions.ToListAsync();
            _logger.LogInformation("获取所有角色权限，数量：{Count}", rolePermissions.Count);

            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = rolePermissions,
                msg = ""
            });
        }

        // GET: api/RolePermissions/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRolePermission(int id)
        {
            var rolePermission = await _context.RolePermissions.FindAsync(id);

            if (rolePermission == null)
            {
                _logger.LogWarning("未找到角色权限，ID：{Id}", id);
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object?)null,
                    msg = "记录不存在"
                });
            }

            _logger.LogInformation("获取角色权限成功，ID：{Id}", id);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = rolePermission,
                msg = ""
            });
        }

        // PUT: api/RolePermissions
        [HttpPut]
        public async Task<IActionResult> PutRolePermission(RolePermission rolePermission)
        {
            var existing = await _context.RolePermissions.FindAsync(rolePermission.Rpid);
            if (existing == null)
            {
                _logger.LogWarning("更新角色权限失败，记录不存在，ID：{Id}", rolePermission.Rpid);
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object?)null,
                    msg = "记录不存在"
                });
            }

            _context.Entry(existing).CurrentValues.SetValues(rolePermission);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (!RolePermissionExists(rolePermission.Rpid))
                {
                    _logger.LogWarning("更新角色权限失败，记录不存在，ID：{Id}", rolePermission.Rpid);
                    return new JsonResult(new
                    {
                        code = ResponseCode.记录不存在,
                        data = (object?)null,
                        msg = "记录不存在"
                    });
                }

                _logger.LogError(ex, "更新角色权限时发生并发异常，ID：{Id}", rolePermission.Rpid);
                throw;
            }

            _logger.LogInformation("更新角色权限成功，ID：{Id}", rolePermission.Rpid);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = rolePermission.Rpid,
                msg = ""
            });
        }

        /*
        // GET: api/RolePermissions/ByRole/5
        [HttpGet("ByRole/{roleid}")]
        public async Task<IActionResult> GetRolePermissionsByRole(int roleid)
        {
            var rolePermissions = await _context.RolePermissions
                .Where(x => x.Roleid == roleid)
                .ToListAsync();

            _logger.LogInformation("按角色查询角色权限，RoleId：{RoleId}，数量：{Count}", roleid, rolePermissions.Count);

            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = rolePermissions,
                msg = ""
            });
        }
        */
        // GET: api/RolePermissions/ByRoleWithNames/5
        [HttpGet("ByRoleWithNames/{roleid}")]
        public async Task<IActionResult> GetRolePermissionsByRoleWithNames(int roleid)
        {
            var data = await (
                from rp in _context.RolePermissions
                join r in _context.Roles on rp.Roleid equals r.Roleid
                join p in _context.Permissions on rp.Permissionid equals p.Permissionid
                where rp.Roleid == roleid
                select new
                {
                    rp.Rpid,
                    rp.Roleid,
                    RoleName = r.Rolename,
                    rp.Permissionid,
                    PermissionName = p.Permission1,
                    p.Path,
                    p.Type,
                    p.Icon,
                    p.Sort
                })
                .ToListAsync();

            _logger.LogInformation("按角色查询角色权限及名称，RoleId：{RoleId}，数量：{Count}", roleid, data.Count);

            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data,
                msg = ""
            });
        }


        // POST: api/RolePermissions
        [HttpPost]
        public async Task<IActionResult> PostRolePermission(RolePermission rolePermission)
        {
            rolePermission.Rpid = 0;
            _context.RolePermissions.Add(rolePermission);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增角色权限成功，ID：{Id}", rolePermission.Rpid);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = rolePermission.Rpid,
                msg = ""
            });
        }

        // DELETE: api/RolePermissions/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRolePermission(int id)
        {
            var rolePermission = await _context.RolePermissions.FindAsync(id);
            if (rolePermission == null)
            {
                _logger.LogWarning("删除角色权限失败，记录不存在，ID：{Id}", id);
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object?)null,
                    msg = "记录不存在"
                });
            }

            _context.RolePermissions.Remove(rolePermission);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除角色权限成功，ID：{Id}", id);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = id,
                msg = ""
            });
        }

        private bool RolePermissionExists(int id)
        {
            return _context.RolePermissions.Any(e => e.Rpid == id);
        }
    }
}
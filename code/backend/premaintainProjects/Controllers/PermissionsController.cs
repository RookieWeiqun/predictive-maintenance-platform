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
    public class PermissionsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<PermissionsController> _logger;

        public PermissionsController(
            PredictiveMaintenancePlatformContext context,
            ILogger<PermissionsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/Permissions
        [HttpGet]
        public async Task<IActionResult> GetPermissions()
        {
            var permissions = await _context.Permissions.ToListAsync();
            _logger.LogInformation("获取所有权限，数量：{Count}", permissions.Count);

            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = permissions,
                msg = ""
            });
        }

        // GET: api/Permissions/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPermission(int id)
        {
            var permission = await _context.Permissions.FindAsync(id);

            if (permission == null)
            {
                _logger.LogWarning("未找到权限，ID：{Id}", id);
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object?)null,
                    msg = "记录不存在"
                });
            }

            _logger.LogInformation("获取权限成功，ID：{Id}", id);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = permission,
                msg = ""
            });
        }

        // PUT: api/Permissions
        [HttpPut]
        public async Task<IActionResult> PutPermission(Permission permission)
        {
            var existing = await _context.Permissions.FindAsync(permission.Permissionid);
            if (existing == null)
            {
                _logger.LogWarning("更新权限失败，权限不存在，ID：{Id}", permission.Permissionid);
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object?)null,
                    msg = "记录不存在"
                });
            }

            _context.Entry(existing).CurrentValues.SetValues(permission);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                if (!PermissionExists(permission.Permissionid))
                {
                    _logger.LogWarning("更新权限失败，权限不存在，ID：{Id}", permission.Permissionid);
                    return new JsonResult(new
                    {
                        code = ResponseCode.记录不存在,
                        data = (object?)null,
                        msg = "记录不存在"
                    });
                }

                _logger.LogError(ex, "更新权限时发生并发异常，ID：{Id}", permission.Permissionid);
                throw;
            }

            _logger.LogInformation("更新权限成功，ID：{Id}", permission.Permissionid);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = permission.Permissionid,
                msg = ""
            });
        }

        // POST: api/Permissions
        [HttpPost]
        public async Task<IActionResult> PostPermission(Permission permission)
        {
            permission.Permissionid = 0;
            _context.Permissions.Add(permission);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增权限成功，ID：{Id}", permission.Permissionid);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = permission.Permissionid,
                msg = ""
            });
        }

        // DELETE: api/Permissions/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePermission(int id)
        {
            var permission = await _context.Permissions.FindAsync(id);
            if (permission == null)
            {
                _logger.LogWarning("删除权限失败，权限不存在，ID：{Id}", id);
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object?)null,
                    msg = "记录不存在"
                });
            }

            _context.Permissions.Remove(permission);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除权限成功，ID：{Id}", id);
            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = id,
                msg = ""
            });
        }

        private bool PermissionExists(int id)
        {
            return _context.Permissions.Any(e => e.Permissionid == id);
        }
    }
}
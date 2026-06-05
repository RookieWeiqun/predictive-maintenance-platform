using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using premaintainProjects.Models;
using static premaintainProjects.Models.otherModels;

namespace premaintainProjects.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<AuthController> _logger;
        private readonly PredictiveMaintenancePlatformContext _context;

        public AuthController(
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory,
            ILogger<AuthController> logger,
            PredictiveMaintenancePlatformContext context)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _context = context;
        }

        [HttpGet("ReadOneIdCode")]
        public async Task<IActionResult> ReadOneIdCode([FromQuery] string code)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                _logger.LogWarning("OneID登录失败，code为空");
                return new JsonResult(new
                {
                    code = ResponseCode.参数无效,
                    data = (object?)null,
                    msg = "code不能为空"
                });
            }

            var redirectUrl = _configuration["OneId:RedirectUrl"];
            var clientId = _configuration["OneId:ClientId"];
            var clientSecret = _configuration["OneId:ClientSecret"];
            var tokenEndpoint = _configuration["OneId:TokenEndpoint"];
            var scope = _configuration["OneId:Scope"] ?? "openid phone email profile user:ciam:commonapi";

            var form = new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["scope"] = scope,
                ["code"] = code,
                ["redirect_uri"] = redirectUrl ?? "",
                ["client_id"] = clientId ?? "",
                ["client_secret"] = clientSecret ?? ""
            };

            var client = _httpClientFactory.CreateClient();
            var response = await client.PostAsync(tokenEndpoint, new FormUrlEncodedContent(form));
            var result = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("OneID换token响应：{Result}", result);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OneID换token失败，StatusCode：{StatusCode}", response.StatusCode);
                return new JsonResult(new
                {
                    code = ResponseCode.操作失败,
                    data = (object?)null,
                    msg = "换取token失败"
                });
            }

            using var doc = JsonDocument.Parse(result);
            var root = doc.RootElement;

            JsonElement dataElement;
            if (root.TryGetProperty("success", out var successElement))
            {
                var success = successElement.ValueKind == JsonValueKind.True ||
                              (successElement.ValueKind == JsonValueKind.String &&
                               string.Equals(successElement.GetString(), "true", StringComparison.OrdinalIgnoreCase));

                if (!success || !root.TryGetProperty("data", out dataElement))
                {
                    _logger.LogWarning("OneID换token返回success=false");
                    return new JsonResult(new
                    {
                        code = ResponseCode.操作失败,
                        data = (object?)null,
                        msg = "换取token失败"
                    });
                }
            }
            else
            {
                dataElement = root;
            }

            var idToken = dataElement.TryGetProperty("id_token", out var idTokenEl)
                ? idTokenEl.GetString()
                : null;

            if (string.IsNullOrWhiteSpace(idToken))
            {
                _logger.LogWarning("OneID返回中缺少id_token");
                return new JsonResult(new
                {
                    code = ResponseCode.操作失败,
                    data = (object?)null,
                    msg = "id_token为空"
                });
            }

            var claims = new JwtSecurityTokenHandler().ReadJwtToken(idToken).Claims;

            var phoneNumber = claims.FirstOrDefault(c => c.Type == "phone_number")?.Value?.Trim() ?? "";
            var name = claims.FirstOrDefault(c => c.Type == "name")?.Value?.Trim() ?? "";
            var email = claims.FirstOrDefault(c => c.Type == "email")?.Value?.Trim() ?? "";
            var externalId = claims.FirstOrDefault(c => c.Type == "external_id")?.Value?.Trim() ?? "";

            var reg = new Regex(@"^Z\d{3}[0-9A-Z]{4}", RegexOptions.IgnoreCase);
            var gid = reg.IsMatch(externalId) ? externalId.ToUpper() : "";

            if (string.IsNullOrWhiteSpace(gid) && string.IsNullOrWhiteSpace(phoneNumber))
            {
                _logger.LogWarning("OneID登录成功，但GID和手机号都为空");
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object?)null,
                    msg = "未找到可匹配的本地用户标识"
                });
            }

            var localUser = await FindLocalUserAsync(gid, phoneNumber);
            if (localUser == null)
            {
                _logger.LogWarning("OneID登录成功，但本地未匹配到用户，GID：{GID}，Mobile：{Mobile}", gid, phoneNumber);
                return new JsonResult(new
                {
                    code = ResponseCode.记录不存在,
                    data = (object?)null,
                    msg = "本地用户不存在"
                });
            }

            if (!string.IsNullOrWhiteSpace(email) &&
                !string.Equals(localUser.Email, email, StringComparison.OrdinalIgnoreCase))
            {
                localUser.Email = email;
                await _context.SaveChangesAsync();
            }

            var roleName = await GetRoleNameAsync(localUser.Role);
            var companyName = await GetCompanyNameAsync(localUser.Companyid);

            var oneIdUser = new OneIdUserInfoDto
            {
                Userid = localUser.Userid,
                Name = string.IsNullOrWhiteSpace(localUser.Username) ? name : localUser.Username,
                Mobile = localUser.Mobile,
                Email = localUser.Email,
                GID = localUser.Gid,
                Roleid = localUser.Role,
                RoleName = roleName,
                Companyid = localUser.Companyid ?? 0,
                Companyname = companyName
            };

            _logger.LogInformation(
                "OneID登录成功，本地用户匹配成功，UserId：{UserId}，Name：{Name}，GID：{GID}，Mobile：{Mobile}，RoleId：{RoleId}，RoleName：{RoleName}，CompanyId：{CompanyId}，CompanyName：{CompanyName}",
                oneIdUser.Userid,
                oneIdUser.Name,
                oneIdUser.GID,
                oneIdUser.Mobile,
                oneIdUser.Roleid,
                oneIdUser.RoleName,
                oneIdUser.Companyid,
                oneIdUser.Companyname);

            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = oneIdUser,
                msg = ""
            });
        }

        private async Task<User?> FindLocalUserAsync(string gid, string phoneNumber)
        {
            if (!string.IsNullOrWhiteSpace(gid))
            {
                return await _context.Users
                    .FirstOrDefaultAsync(x => x.Gid == gid);
            }

            return await _context.Users
                .FirstOrDefaultAsync(x => x.Mobile == phoneNumber);
        }

        private async Task<string?> GetRoleNameAsync(int? roleId)
        {
            if (!roleId.HasValue)
                return null;

            return await _context.Roles
                .AsNoTracking()
                .Where(x => x.Roleid == roleId.Value)
                .Select(x => x.Rolename)
                .FirstOrDefaultAsync();
        }

        private async Task<string?> GetCompanyNameAsync(int? companyId)
        {
            if (!companyId.HasValue || companyId.Value <= 0)
                return null;

            return await _context.Companies
                .AsNoTracking()
                .Where(x => x.Companyid == companyId.Value)
                .Select(x => x.Companyname)
                .FirstOrDefaultAsync();
        }
    }

    public class OneIdUserInfoDto
    {
        public int Userid { get; set; }
        public string? Name { get; set; }
        public string? Mobile { get; set; }
        public string? Email { get; set; }
        public string? GID { get; set; }
        public int? Roleid { get; set; }
        public string? RoleName { get; set; }
        public int Companyid { get; set; }
        public string? Companyname { get; set; }
    }
}
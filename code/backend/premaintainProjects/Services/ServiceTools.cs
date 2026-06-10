using Microsoft.EntityFrameworkCore;
using premaintainProjects.Models;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace premaintainProjects.Services
{
    public class ServiceTools
    {
        private readonly PredictiveMaintenancePlatformContext _context;

        public ServiceTools(PredictiveMaintenancePlatformContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateTaskNoAsync()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

            for (int attempt = 0; attempt < 20; attempt++)
            {
                var randomBytes = new byte[10];
                RandomNumberGenerator.Fill(randomBytes);

                var codeChars = new char[12];
                codeChars[4] = '-';
                codeChars[9] = '-';

                int[] positions = { 0, 1, 2, 3, 5, 6, 7, 8, 10, 11 };

                for (int i = 0; i < positions.Length; i++)
                {
                    codeChars[positions[i]] = chars[randomBytes[i] % chars.Length];
                }

                var taskNo = new string(codeChars);

                var exists = await _context.InspectionTasks.AnyAsync(t => t.TaskNo == taskNo);
                if (!exists)
                {
                    return taskNo;
                }
            }

            throw new InvalidOperationException("无法生成唯一任务号");
        }


        public async Task<string?> BuildRenderSchemaJsonAsync(int? inspectionItemId)
        {
            if (!inspectionItemId.HasValue)
                return null;

            var inspectionItem = await _context.InspectionItems
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Itemid == inspectionItemId.Value);

            if (inspectionItem == null)
                return null;

            JsonNode? thresholdNode = null;
            if (!string.IsNullOrWhiteSpace(inspectionItem.Threshold))
            {
                thresholdNode = JsonNode.Parse(inspectionItem.Threshold);
            }

            return JsonSerializer.Serialize(new
            {
                value_type = inspectionItem.ValueType,
                rule_type = inspectionItem.RuleType,
                threshold = thresholdNode
            });
        }

        public async Task RefreshRenderSchemaAsync(Taskitem taskitem)
        {
            taskitem.RenderSchemaJson = await BuildRenderSchemaJsonAsync(taskitem.Inspectionitemid);
        }

        private static readonly TimeZoneInfo ChinaTimeZone =
                TimeZoneInfo.FindSystemTimeZoneById(
                    OperatingSystem.IsWindows() ? "China Standard Time" : "Asia/Shanghai");

        public DateTime NormalizeChinaTime(DateTime value) =>
            value.Kind switch
            {
                DateTimeKind.Unspecified => value,
                DateTimeKind.Utc => DateTime.SpecifyKind(
                    TimeZoneInfo.ConvertTimeFromUtc(value, ChinaTimeZone),
                    DateTimeKind.Unspecified),
                DateTimeKind.Local => DateTime.SpecifyKind(
                    TimeZoneInfo.ConvertTime(value, ChinaTimeZone),
                    DateTimeKind.Unspecified)
            };

        public DateTime? NormalizeChinaTime(DateTime? value) =>
            value.HasValue ? NormalizeChinaTime(value.Value) : null;

        public DateTime NowInChina() =>
            DateTime.SpecifyKind(
                TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ChinaTimeZone),
                DateTimeKind.Unspecified);


        public bool IsValidEmail(string? email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            try
            {
                var addr = new MailAddress(email);
                return string.Equals(addr.Address, email, StringComparison.OrdinalIgnoreCase);
            }
            catch
            {
                return false;
            }
        }

        public bool TryNormalizeMobile(string? mobile, out string normalizedMobile)
        {
            normalizedMobile = string.Empty;

            if (string.IsNullOrWhiteSpace(mobile))
                return false;

            var cleaned = Regex.Replace(mobile, @"[\s\-\(\)]", "");

            if (cleaned.StartsWith("+86", StringComparison.Ordinal))
            {
                cleaned = cleaned[3..];
            }
            else if (cleaned.StartsWith("86", StringComparison.Ordinal) && cleaned.Length == 13)
            {
                cleaned = cleaned[2..];
            }

            if (!Regex.IsMatch(cleaned, @"^1[3-9]\d{9}$"))
                return false;

            normalizedMobile = cleaned;
            return true;
        }

    }
}

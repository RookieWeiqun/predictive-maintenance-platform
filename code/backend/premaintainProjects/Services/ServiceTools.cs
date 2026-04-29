using Microsoft.EntityFrameworkCore;
using premaintainProjects.Models;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;

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

        public DateTime ToUtc(DateTime value) =>
                value.Kind switch
                {       
                    DateTimeKind.Utc => value,
                    DateTimeKind.Local => value.ToUniversalTime(),  
                    DateTimeKind.Unspecified => DateTime.SpecifyKind(value, DateTimeKind.Utc)
                };

        public DateTime? ToUtc(DateTime? value) =>
            value.HasValue ? ToUtc(value.Value) : null;


        public DateTime ToChinaTime(DateTime value)
        {
            var utc = value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };

            return TimeZoneInfo.ConvertTimeFromUtc(
                utc,
                TimeZoneInfo.FindSystemTimeZoneById("China Standard Time"));
        }

        public DateTime? ToChinaTime(DateTime? value) =>
            value.HasValue ? ToChinaTime(value.Value) : null;
    }


}

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Build.Evaluation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using premaintainProjects.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using static premaintainProjects.Models.otherModels;
using premaintainProjects.Dtos;

namespace premaintainProjects.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AttachmentsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<AttachmentsController> _logger;

        public AttachmentsController(
            PredictiveMaintenancePlatformContext context,
            IWebHostEnvironment env,
            ILogger<AttachmentsController> logger)
        {
            _context = context;
            _env = env;
            _logger = logger;
        }

        // GET: api/Attachments
        [HttpGet]
        public async Task<IActionResult> GetAttachments()
        {
            var attachments = await _context.Attachments.ToListAsync();
            _logger.LogInformation("获取所有附件成功，数量：{Count}", attachments.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = attachments, msg = "" });
        }

        // GET: api/Attachments/5
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetAttachment(Guid id)
        {
            var attachment = await _context.Attachments.FindAsync(id);

            if (attachment == null)
            {
                _logger.LogWarning("未找到附件，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _logger.LogInformation("获取附件成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = attachment, msg = "" });
        }

        // GET: api/Attachments/ByTaskitem/{taskitemid}
        [HttpGet("ByTaskitem/{taskitemid:guid}")]
        public async Task<IActionResult> GetAttachmentsByTaskitem(Guid taskitemid)
        {
            var attachments = await _context.Attachments
                .Where(a => a.Taskitemid == taskitemid)
                .ToListAsync();

            _logger.LogInformation("按任务项ID获取附件成功，Taskitemid：{Taskitemid}，数量：{Count}", taskitemid, attachments.Count);

            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = attachments,
                msg = ""
            });
        }

        // GET: api/Attachments/ByTaskid/{taskid}
        [HttpGet("ByTaskid/{taskid:int}")]
        public async Task<IActionResult> GetAttachmentsByTaskid(int taskid)
        {
            var attachments = await _context.Attachments
                .Where(a => a.Taskid == taskid)
                .ToListAsync();

            _logger.LogInformation("按任务ID获取附件成功，Taskid：{taskid}，数量：{Count}", taskid, attachments.Count);

            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = attachments,
                msg = ""
            });
        }

        // PUT: api/Attachments/5
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> PutAttachment(Guid id, Attachment attachment)
        {
            if (id != attachment.Attaid)
            {
                _logger.LogWarning("更新附件失败，参数不匹配，RouteId：{RouteId}，EntityId：{EntityId}", id, attachment.Attaid);
                return new JsonResult(new { code = ResponseCode.参数无效, data = (object)null, msg = "参数无效" });
            }

            _context.Entry(attachment).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AttachmentExists(id))
                {
                    _logger.LogWarning("更新附件失败，记录不存在，ID：{Id}", id);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }

                _logger.LogError("更新附件时发生并发异常，ID：{Id}", id);
                throw;
            }

            _logger.LogInformation("更新附件成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        // POST: api/Attachments
        [HttpPost]
        public async Task<IActionResult> PostAttachment(Attachment attachment)
        {
            _context.Attachments.Add(attachment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增附件成功，ID：{Id}", attachment.Attaid);
            return new JsonResult(new { code = ResponseCode.成功, data = attachment.Attaid, msg = "" });
        }

        // DELETE: api/Attachments/5
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteAttachment(Guid id)
        {
            var attachment = await _context.Attachments.FindAsync(id);
            if (attachment == null)
            {
                _logger.LogWarning("删除附件失败，记录不存在，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }

            _context.Attachments.Remove(attachment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("删除附件成功，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
        }

        private bool AttachmentExists(Guid id)
        {
            return _context.Attachments.Any(e => e.Attaid == id);
        }

        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadFile([FromForm] UploadAttachmentDto dto)
        {
            if (dto.Itemid == Guid.Empty)
            {
                return new JsonResult(new { code = ResponseCode.参数无效, data = (object)null, msg = "itemid不能为空" });
            }

            if (dto.Files == null || dto.Files.Count == 0)
            {
                return new JsonResult(new { code = ResponseCode.参数无效, data = (object)null, msg = "文件不能为空" });
            }

            if (dto.Filenames == null || dto.Filenames.Count != dto.Files.Count)
            {
                return new JsonResult(new { code = ResponseCode.参数无效, data = (object)null, msg = "filenames必须与files一一对应" });
            }

            const long maxFileSize = 20 * 1024 * 1024;
            var attachDir = Path.Combine(_env.ContentRootPath, "Attach");
            if (!Directory.Exists(attachDir))
            {
                Directory.CreateDirectory(attachDir);
            }

            var result = new List<object>();

            for (int i = 0; i < dto.Files.Count; i++)
            {
                var file = dto.Files[i];
                var inputFileName = dto.Filenames[i];

                if (file == null || file.Length == 0)
                    continue;

                var originalFileName = Path.GetFileName(inputFileName);
                var extension = Path.GetExtension(originalFileName);

                if (string.IsNullOrWhiteSpace(extension))
                {
                    extension = Path.GetExtension(file.FileName);
                }

                if (string.IsNullOrWhiteSpace(extension))
                {
                    extension = ".bin";
                }

                var attaid = Guid.NewGuid();
                var saveFileName = $"{attaid}{extension}";
                var fullPath = Path.Combine(attachDir, saveFileName);

                await using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var relativePath = Path.Combine("Attach", saveFileName).Replace("\\", "/");

                var attachment = new Attachment
                {
                    Attaid = attaid,
                    Taskitemid = dto.Itemid,
                    Filepath = relativePath,
                    Taskid = dto.Taskid,
                    Filename = originalFileName
                };

                _context.Attachments.Add(attachment);

                result.Add(new
                {
                    attaid = attachment.Attaid,
                    filepath = attachment.Filepath,
                    filename = attachment.Filename
                });
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("批量上传附件成功，Taskitemid：{Taskitemid}，数量：{Count}", dto.Itemid, result.Count);

            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = result,
                msg = "上传成功"
            });
        }

    }
}
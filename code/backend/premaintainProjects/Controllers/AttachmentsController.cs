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

            if (dto.file == null || dto.file.Length == 0)
            {
                return new JsonResult(new { code = ResponseCode.参数无效, data = (object)null, msg = "文件不能为空" });
            }

            const long maxFileSize = 20 * 1024 * 1024;
            if (dto.file.Length > maxFileSize)
            {
                return new JsonResult(new { code = ResponseCode.参数无效, data = (object)null, msg = "文件大小不能超过20MB" });
            }

            var attachDir = Path.Combine(_env.ContentRootPath, "Attach");
            if (!Directory.Exists(attachDir))
            {
                Directory.CreateDirectory(attachDir);
            }

            var extension = Path.GetExtension(dto.file.FileName);
            if (string.IsNullOrWhiteSpace(extension))
            {
                extension = ".bin";
            }

            var fileName = $"{dto.Itemid}{extension}";
            var fullPath = Path.Combine(attachDir, fileName);

            await using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await dto.file.CopyToAsync(stream);
            }

            var relativePath = Path.Combine("Attach", fileName).Replace("\\", "/");

            var attachment = new Attachment
            {
                Attaid = Guid.NewGuid(),
                Taskitemid = dto.Itemid,
                Filepath = relativePath
            };

            _context.Attachments.Add(attachment);
            await _context.SaveChangesAsync();

            _logger.LogInformation("上传附件成功，Attaid：{Attaid}，Taskitemid：{Taskitemid}", attachment.Attaid, dto.Itemid);

            return new JsonResult(new
            {
                code = ResponseCode.成功,
                data = new
                {
                    attaid = attachment.Attaid,
                    filepath = attachment.Filepath
                },
                msg = "上传成功"
            });
        }

    }
}
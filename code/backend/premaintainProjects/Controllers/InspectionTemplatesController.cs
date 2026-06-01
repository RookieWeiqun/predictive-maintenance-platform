using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using premaintainProjects.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using static premaintainProjects.Models.otherModels;
using premaintainProjects.Dtos;

namespace premaintainProjects.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InspectionTemplatesController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;
        private readonly ILogger<InspectionTemplatesController> _logger;

        public InspectionTemplatesController(PredictiveMaintenancePlatformContext context, ILogger<InspectionTemplatesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // GET: api/InspectionTemplates
        [HttpGet]
        public async Task<IActionResult> GetInspectionTemplates()
        {
            var templates = await _context.InspectionTemplates.ToListAsync();
            _logger.LogInformation("获取所有巡检模板，数量：{Count}", templates.Count);
            return new JsonResult(new { code = ResponseCode.成功, data = templates, msg = "" });
        }

        // GET: api/InspectionTemplates/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetInspectionTemplate(int id)
        {
            var template = await _context.InspectionTemplates.FindAsync(id);
            if (template == null)
            {
                _logger.LogWarning("未找到巡检模板，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
            }
            _logger.LogInformation("获取巡检模板，ID：{Id}", id);
            return new JsonResult(new { code = ResponseCode.成功, data = template, msg = "" });
        }
        // GET: api/InspectionTemplates/Search?inspectiontype=1&productcategory=xxx&mlfb=yyy
        [HttpGet("Search")]
        public async Task<IActionResult> SearchTemplates(
            [FromQuery] int? inspectiontype,
            [FromQuery] string? productcategory,
            [FromQuery] string? mlfb,
            [FromQuery] string? series,
            [FromQuery] string? size)
        {
            var query = _context.InspectionTemplates.AsQueryable();


            if (!string.IsNullOrEmpty(productcategory))
                query = query.Where(t => t.Productcategory == productcategory);

            if (inspectiontype.HasValue)
                query = query.Where(t => t.Inspectiontype == inspectiontype.Value);

            if (!string.IsNullOrEmpty(mlfb))
                query = query.Where(t => t.Mlfb == mlfb);

            if (!string.IsNullOrEmpty(series))
                query = query.Where(t => t.Series == series);            

            if (!string.IsNullOrEmpty(size))
                query = query.Where(t => t.Size == size);

            var templates = await query.ToListAsync();

            _logger.LogInformation(
                "多条件检索巡检模板，Inspectiontype：{Inspectiontype}，Productcategory：{Productcategory}，MLFB：{Mlfb}，数量：{Count}",
                inspectiontype, productcategory, mlfb, templates.Count);

            return new JsonResult(new { code = ResponseCode.成功, data = templates, msg = "" });
        }

        // PUT: api/InspectionTemplates
        [HttpPut]
        public async Task<IActionResult> PutInspectionTemplate(InspectionTemplate inspectionTemplate)
        {
            _context.Entry(inspectionTemplate).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!InspectionTemplateExists(inspectionTemplate.Templateid))
                {
                    _logger.LogWarning("更新失败，巡检模板不存在，ID：{Id}", inspectionTemplate.Templateid);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }
                else
                {
                    _logger.LogError("更新巡检模板时发生并发异常，ID：{Id}", inspectionTemplate.Templateid);
                    throw;
                }
            }

            _logger.LogInformation("更新巡检模板成功，ID：{Id}", inspectionTemplate.Templateid);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionTemplate.Templateid, msg = "" });
        }

        // POST: api/InspectionTemplates
        [HttpPost]
        public async Task<IActionResult> PostInspectionTemplate(InspectionTemplate inspectionTemplate)
        {
            inspectionTemplate.Templateid = 0; // 强制让数据库分配主键
            _context.InspectionTemplates.Add(inspectionTemplate);
            await _context.SaveChangesAsync();

            _logger.LogInformation("新增巡检模板成功，ID：{Id}", inspectionTemplate.Templateid);
            return new JsonResult(new { code = ResponseCode.成功, data = inspectionTemplate.Templateid, msg = "" });
        }


        // DELETE: api/InspectionTemplates/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInspectionTemplate(int id)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var template = await _context.InspectionTemplates.FindAsync(id);
                if (template == null)
                {
                    _logger.LogWarning("删除失败，巡检模板不存在，ID：{Id}", id);
                    return new JsonResult(new { code = ResponseCode.记录不存在, data = (object)null, msg = "记录不存在" });
                }

                var inspectionItems = await _context.InspectionItems
                    .Where(x => x.Templateid == id)
                    .ToListAsync();

                if (inspectionItems.Count > 0)
                {
                    _context.InspectionItems.RemoveRange(inspectionItems);
                }

                var categories = await _context.InspectionCategories
                    .Where(x => x.Templateid == id)
                    .ToListAsync();

                if (categories.Count > 0)
                {
                    _context.InspectionCategories.RemoveRange(categories);
                }

                _context.InspectionTemplates.Remove(template);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("删除巡检模板及分类/检查项成功，ID：{Id}", id);
                return new JsonResult(new { code = ResponseCode.成功, data = id, msg = "" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "删除巡检模板失败，ID：{Id}", id);
                return new JsonResult(new
                {
                    code = ResponseCode.操作失败,
                    data = (object)null,
                    msg = ex.InnerException?.Message ?? ex.Message
                });
            }
        }


        private bool InspectionTemplateExists(int id)
        {
            return _context.InspectionTemplates.Any(e => e.Templateid == id);
        }

        [HttpPost("import")]
        public async Task<ActionResult<int>> ImportTemplate([FromBody] ImportInspectionTemplateDto dto)
        {
            try
            {
                // 1. 校验
                ValidateAllCategories(dto.Categories);
                if (!ModelState.IsValid)
                {
                    var errors = ModelState
                        .Where(x => x.Value?.Errors.Count > 0)
                        .SelectMany(x => x.Value!.Errors.Select(e => $"{x.Key}: {e.ErrorMessage}"))
                        .ToList();

                    return new JsonResult(new
                    {
                        code = ResponseCode.参数无效,
                        data = (object?)null,
                        msg = string.Join("；", errors)
                    });
                }


                // 2. 事务
                using var transaction = await _context.Database.BeginTransactionAsync();

                // 3. 新增模板
                var template = new InspectionTemplate
                {
                    Name = dto.Name,
                    Productcategory = dto.ProductCategory,
                    Description = dto.Description,
                    Inspectiontype = dto.InspectionType,
                    Mlfb = dto.Mlfb,
                    Createdate = DateOnly.FromDateTime(DateTime.Now)
                };

                _context.InspectionTemplates.Add(template);
                await _context.SaveChangesAsync();
                int templateId = template.Templateid;

                // 4. 递归保存分类（禁用自动追踪，避免EF保存异常）
                await SaveCategoriesRecursive(dto.Categories, templateId, 0);

                // 5. 提交
                await transaction.CommitAsync();
                return new JsonResult(new
                {
                    code = ResponseCode.成功,
                    data = templateId,
                    msg = "导入成功"
                });

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "导入巡检模板失败");
                return new JsonResult(new
                {
                    code = ResponseCode.操作失败,
                    data = (object?)null,
                    msg = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        private void ValidateAllCategories(List<InspectionCategoryImportDto> categories)
        {
            foreach (var cat in categories)
            {
                if (cat.Items.Count == 0)
                    ModelState.AddModelError("Items", $"分类【{cat.Name}】必须至少有一个检查项");

                if (cat.Children.Any())
                    ValidateAllCategories(cat.Children);
            }
        }

        private async Task SaveCategoriesRecursive(List<InspectionCategoryImportDto> categoryDtos, int templateId, int parentId)
        {
            foreach (var catDto in categoryDtos)
            {
                // 分类
                var category = new InspectionCategory
                {
                    Templateid = templateId,
                    ParentId = parentId,
                    Name = catDto.Name,
                    SortOrder = catDto.SortOrder
                };

                _context.InspectionCategories.Add(category);
                await _context.SaveChangesAsync();
                int categoryId = category.Categoryid;

                // 检查项
                var items = catDto.Items.Select(x => new InspectionItem
                {
                    Templateid = templateId,
                    Categoryid = categoryId,
                    Name = x.Name,
                    ValueType = x.ValueType,
                    RuleType = x.RuleType,
                    Threshold = x.Threshold == null
                        ? null
                        : JsonSerializer.Serialize(x.Threshold), // 彻底修复JSONB
                    SortOrder = x.SortOrder,
                    Priority = x.Priority,
                     Operationguide = x.Operationguide,
                      Displaycondition = x.Displaycondition,
                       Hiddenhazardcontent = x.Hiddenhazardcontent,
                        Maintenanceinstructions = x.Maintenanceinstructions,
                         Recommendationcontent = x.Recommendationcontent,
                          Recommendedrules = x.Recommendedrules
                }).ToList();

                _context.InspectionItems.AddRange(items);
                await _context.SaveChangesAsync();

                // 子分类
                if (catDto.Children.Any())
                {
                    await SaveCategoriesRecursive(catDto.Children, templateId, categoryId);
                }
            }
        }
    }
}
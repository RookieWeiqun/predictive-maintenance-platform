using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using premaintainProjects.Models;

namespace premaintainProjects.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TemplatemappingsController : ControllerBase
    {
        private readonly PredictiveMaintenancePlatformContext _context;

        public TemplatemappingsController(PredictiveMaintenancePlatformContext context)
        {
            _context = context;
        }

        // GET: api/Templatemappings
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Templatemapping>>> GetTemplatemappings()
        {
            return await _context.Templatemappings.ToListAsync();
        }

        // GET: api/Templatemappings/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Templatemapping>> GetTemplatemapping(int id)
        {
            var templatemapping = await _context.Templatemappings.FindAsync(id);

            if (templatemapping == null)
            {
                return NotFound();
            }

            return templatemapping;
        }

        // GET: api/Templatemappings/SearchByMlfb?keyword=6ES7
        [HttpGet("SearchByMlfb")]
        public async Task<ActionResult<IEnumerable<Templatemapping>>> SearchByMlfb([FromQuery] string keyword)
        {
            if (string.IsNullOrWhiteSpace(keyword))
            {
                return BadRequest("keyword不能为空");
            }

            var result = await _context.Templatemappings
                .AsNoTracking()
                .Where(x => x.Mlfb != null && x.Mlfb.Contains(keyword))
                .ToListAsync();

            return result;
        }


        // PUT: api/Templatemappings/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTemplatemapping(int id, Templatemapping templatemapping)
        {
            if (id != templatemapping.Tmid)
            {
                return BadRequest();
            }

            _context.Entry(templatemapping).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!TemplatemappingExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Templatemappings
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Templatemapping>> PostTemplatemapping(Templatemapping templatemapping)
        {
            _context.Templatemappings.Add(templatemapping);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetTemplatemapping", new { id = templatemapping.Tmid }, templatemapping);
        }

        // DELETE: api/Templatemappings/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTemplatemapping(int id)
        {
            var templatemapping = await _context.Templatemappings.FindAsync(id);
            if (templatemapping == null)
            {
                return NotFound();
            }

            _context.Templatemappings.Remove(templatemapping);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool TemplatemappingExists(int id)
        {
            return _context.Templatemappings.Any(e => e.Tmid == id);
        }
    }
}

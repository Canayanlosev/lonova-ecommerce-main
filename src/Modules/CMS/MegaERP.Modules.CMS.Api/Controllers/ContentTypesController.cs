using MegaERP.Modules.CMS.Core.Entities;
using MegaERP.Modules.CMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.CMS.Api.Controllers;

[ApiController]
[Route("api/cms/content-types")]
public class ContentTypesController : ControllerBase
{
    private readonly CMSDbContext _context;

    public ContentTypesController(CMSDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DynamicContentType>>> GetContentTypes()
    {
        return await _context.ContentTypes.ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<DynamicContentType>> CreateContentType(DynamicContentType contentType)
    {
        _context.ContentTypes.Add(contentType);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetContentTypes), new { id = contentType.Id }, contentType);
    }
}

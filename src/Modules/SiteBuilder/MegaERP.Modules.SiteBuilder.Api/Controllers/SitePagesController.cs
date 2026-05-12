using MegaERP.Modules.SiteBuilder.Core.DTOs;
using MegaERP.Modules.SiteBuilder.Core.Entities;
using MegaERP.Modules.SiteBuilder.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.SiteBuilder.Api.Controllers;

[ApiController]
[Route("api/site-builder")]
[Authorize(Roles = "Admin,Manager")]
public class SitePagesController : ControllerBase
{
    private readonly SiteBuilderDbContext _context;

    public SitePagesController(SiteBuilderDbContext context) => _context = context;

    /// <summary>Lists all site pages for the authenticated tenant.</summary>
    [HttpGet("pages")]
    public async Task<ActionResult<IEnumerable<SitePageDto>>> GetPages()
    {
        var pages = await _context.Pages
            .Include(p => p.Blocks.OrderBy(b => b.Order))
            .ToListAsync();
        return Ok(pages.Select(ToDto));
    }

    /// <summary>Returns a site page by ID with its blocks.</summary>
    [HttpGet("pages/{id:guid}")]
    public async Task<ActionResult<SitePageDto>> GetPage(Guid id)
    {
        var page = await _context.Pages
            .Include(p => p.Blocks.OrderBy(b => b.Order))
            .FirstOrDefaultAsync(p => p.Id == id);

        if (page is null) throw new KeyNotFoundException($"Sayfa bulunamadı: {id}");
        return Ok(ToDto(page));
    }

    /// <summary>Creates a new site page.</summary>
    [HttpPost("pages")]
    public async Task<ActionResult<SitePageDto>> CreatePage(CreateSitePageRequest request)
    {
        var page = new SitePage
        {
            StoreId = request.StoreId,
            Slug = request.Slug,
            Title = request.Title
        };
        _context.Pages.Add(page);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetPage), new { id = page.Id }, ToDto(page));
    }

    /// <summary>Updates a site page (slug, title, publish status).</summary>
    [HttpPut("pages/{id:guid}")]
    public async Task<IActionResult> UpdatePage(Guid id, UpdateSitePageRequest request)
    {
        var page = await _context.Pages.FirstOrDefaultAsync(p => p.Id == id);
        if (page is null) throw new KeyNotFoundException($"Sayfa bulunamadı: {id}");
        page.Slug = request.Slug;
        page.Title = request.Title;
        page.IsPublished = request.IsPublished;
        page.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Deletes a site page and all its blocks.</summary>
    [HttpDelete("pages/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeletePage(Guid id)
    {
        var page = await _context.Pages.FirstOrDefaultAsync(p => p.Id == id);
        if (page is null) throw new KeyNotFoundException($"Sayfa bulunamadı: {id}");
        _context.Pages.Remove(page);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Adds a block to a page.</summary>
    [HttpPost("pages/{pageId:guid}/blocks")]
    public async Task<ActionResult<PageBlockDto>> AddBlock(Guid pageId, CreatePageBlockRequest request)
    {
        var page = await _context.Pages.FirstOrDefaultAsync(p => p.Id == pageId);
        if (page is null) throw new KeyNotFoundException($"Sayfa bulunamadı: {pageId}");

        if (!Enum.TryParse<BlockType>(request.BlockType, true, out var blockType))
            return BadRequest($"Geçersiz blok tipi: {request.BlockType}");

        var block = new PageBlock
        {
            PageId = pageId,
            BlockType = blockType,
            Order = request.Order,
            ContentJson = request.ContentJson
        };
        _context.Blocks.Add(block);
        await _context.SaveChangesAsync();
        return Ok(ToBlockDto(block));
    }

    /// <summary>Updates a page block's order and content.</summary>
    [HttpPut("pages/{pageId:guid}/blocks/{blockId:guid}")]
    public async Task<IActionResult> UpdateBlock(Guid pageId, Guid blockId, UpdatePageBlockRequest request)
    {
        var block = await _context.Blocks.FirstOrDefaultAsync(b => b.Id == blockId && b.PageId == pageId);
        if (block is null) throw new KeyNotFoundException($"Blok bulunamadı: {blockId}");
        block.Order = request.Order;
        block.ContentJson = request.ContentJson;
        block.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Deletes a block from a page.</summary>
    [HttpDelete("pages/{pageId:guid}/blocks/{blockId:guid}")]
    public async Task<IActionResult> DeleteBlock(Guid pageId, Guid blockId)
    {
        var block = await _context.Blocks.FirstOrDefaultAsync(b => b.Id == blockId && b.PageId == pageId);
        if (block is null) throw new KeyNotFoundException($"Blok bulunamadı: {blockId}");
        _context.Blocks.Remove(block);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Renders a published page as JSON by store slug and page slug. No authentication required.</summary>
    [HttpGet("render/{storeSlug}/{pageSlug}")]
    [AllowAnonymous]
    public async Task<ActionResult> Render(string storeSlug, string pageSlug)
    {
        var page = await _context.Pages
            .Include(p => p.Blocks.OrderBy(b => b.Order))
            .FirstOrDefaultAsync(p => p.Slug == pageSlug && p.IsPublished);

        if (page is null)
            return NotFound(new { message = "Sayfa bulunamadı veya yayınlanmamış." });

        return Ok(new
        {
            page.Id,
            page.Title,
            page.Slug,
            StoreId = page.StoreId,
            Blocks = page.Blocks.Select(b => new
            {
                b.Id,
                Type = b.BlockType.ToString(),
                b.Order,
                b.ContentJson
            })
        });
    }

    private static SitePageDto ToDto(SitePage p) => new(
        p.Id, p.StoreId, p.Slug, p.Title, p.IsPublished,
        p.Blocks.OrderBy(b => b.Order).Select(ToBlockDto).ToList()
    );

    private static PageBlockDto ToBlockDto(PageBlock b) =>
        new(b.Id, b.BlockType.ToString(), b.Order, b.ContentJson);
}

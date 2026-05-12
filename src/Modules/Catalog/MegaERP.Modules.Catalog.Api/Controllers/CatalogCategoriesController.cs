using MegaERP.Modules.Catalog.Core.DTOs;
using MegaERP.Modules.Catalog.Core.Entities;
using MegaERP.Modules.Catalog.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Catalog.Api.Controllers;

[ApiController]
[Route("api/catalog/categories")]
public class CatalogCategoriesController : ControllerBase
{
    private readonly CatalogDbContext _context;

    public CatalogCategoriesController(CatalogDbContext context)
    {
        _context = context;
    }

    /// <summary>Returns the full category tree (all root categories with nested children).</summary>
    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<CatalogCategoryDto>>> GetTree()
    {
        var all = await _context.Categories
            .Where(c => c.IsActive)
            .OrderBy(c => c.Level).ThenBy(c => c.Name)
            .ToListAsync();

        var tree = BuildTree(all, null);
        return Ok(tree);
    }

    /// <summary>Returns the sub-tree rooted at the category with the given slug.</summary>
    [HttpGet("{slug}")]
    [Authorize]
    public async Task<ActionResult<CatalogCategoryDto>> GetBySlug(string slug)
    {
        var all = await _context.Categories
            .Where(c => c.IsActive)
            .OrderBy(c => c.Level).ThenBy(c => c.Name)
            .ToListAsync();

        var root = all.FirstOrDefault(c => c.Slug == slug);
        if (root is null)
            throw new KeyNotFoundException($"Kategori bulunamadı: {slug}");

        var subtree = BuildSubTree(all, root.Id);
        return Ok(subtree);
    }

    /// <summary>Creates a new catalog category (Admin/Manager only).</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<CatalogCategoryDto>> Create(CreateCatalogCategoryRequest request)
    {
        int level = 0;
        if (request.ParentId.HasValue)
        {
            var parent = await _context.Categories.FirstOrDefaultAsync(c => c.Id == request.ParentId.Value);
            if (parent is null)
                throw new KeyNotFoundException($"Üst kategori bulunamadı: {request.ParentId}");
            level = parent.Level + 1;
        }

        var category = new CatalogCategory
        {
            Name = request.Name,
            Slug = request.Slug,
            ParentId = request.ParentId,
            Level = level,
            IconUrl = request.IconUrl,
            AttributeSchemaJson = request.AttributeSchemaJson,
            IsActive = true
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetBySlug), new { slug = category.Slug },
            ToDto(category, []));
    }

    /// <summary>Updates an existing catalog category (Admin/Manager only).</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(Guid id, UpdateCatalogCategoryRequest request)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id);
        if (category is null)
            throw new KeyNotFoundException($"Kategori bulunamadı: {id}");

        category.Name = request.Name;
        category.Slug = request.Slug;
        category.ParentId = request.ParentId;
        category.IconUrl = request.IconUrl;
        category.AttributeSchemaJson = request.AttributeSchemaJson;
        category.IsActive = request.IsActive;
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Deletes a catalog category (Admin only). Fails if it has children.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id);
        if (category is null)
            throw new KeyNotFoundException($"Kategori bulunamadı: {id}");

        var hasChildren = await _context.Categories.AnyAsync(c => c.ParentId == id);
        if (hasChildren)
            return BadRequest("Alt kategorisi olan bir kategori silinemez.");

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static List<CatalogCategoryDto> BuildTree(List<CatalogCategory> all, Guid? parentId)
    {
        return all
            .Where(c => c.ParentId == parentId)
            .Select(c => ToDto(c, BuildTree(all, c.Id)))
            .ToList();
    }

    private static CatalogCategoryDto BuildSubTree(List<CatalogCategory> all, Guid rootId)
    {
        var root = all.First(c => c.Id == rootId);
        return ToDto(root, BuildTree(all, rootId));
    }

    private static CatalogCategoryDto ToDto(CatalogCategory c, List<CatalogCategoryDto> children) =>
        new(c.Id, c.Name, c.Slug, c.ParentId, c.Level, c.IconUrl, c.AttributeSchemaJson, c.IsActive, children);
}

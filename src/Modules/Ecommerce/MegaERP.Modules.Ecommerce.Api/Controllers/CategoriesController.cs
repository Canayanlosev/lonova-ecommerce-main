using MegaERP.Modules.Ecommerce.Core.DTOs;
using MegaERP.Modules.Ecommerce.Core.Entities;
using MegaERP.Modules.Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Ecommerce.Api.Controllers;

[ApiController]
[Route("api/ecommerce/categories")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly EcommerceDbContext _context;

    public CategoriesController(EcommerceDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetCategories()
    {
        var categories = await _context.Categories
            .Select(c => new CategoryDto(c.Id, c.Name, c.Description, c.ParentCategoryId))
            .ToListAsync();

        return Ok(categories);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CategoryDto>> GetCategoryById(Guid id)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id);

        if (category is null)
            throw new KeyNotFoundException($"Kategori bulunamadı: {id}");

        return Ok(new CategoryDto(category.Id, category.Name, category.Description, category.ParentCategoryId));
    }

    [HttpPost]
    public async Task<ActionResult<CategoryDto>> CreateCategory(CreateCategoryRequest request)
    {
        var category = new Category
        {
            Name = request.Name,
            Description = request.Description,
            ParentCategoryId = request.ParentCategoryId
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCategoryById), new { id = category.Id },
            new CategoryDto(category.Id, category.Name, category.Description, category.ParentCategoryId));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCategory(Guid id, CreateCategoryRequest request)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id);

        if (category is null)
            throw new KeyNotFoundException($"Kategori bulunamadı: {id}");

        category.Name = request.Name;
        category.Description = request.Description;
        category.ParentCategoryId = request.ParentCategoryId;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id);

        if (category is null)
            throw new KeyNotFoundException($"Kategori bulunamadı: {id}");

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

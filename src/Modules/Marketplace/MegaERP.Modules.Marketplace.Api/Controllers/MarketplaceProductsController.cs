using MegaERP.Modules.Catalog.Infrastructure.Persistence;
using MegaERP.Modules.Ecommerce.Infrastructure.Persistence;
using MegaERP.Modules.Marketplace.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Marketplace.Api.Controllers;

[ApiController]
[Route("api/marketplace")]
[AllowAnonymous]
public class MarketplaceProductsController : ControllerBase
{
    private readonly EcommerceDbContext _ecommerceContext;
    private readonly CatalogDbContext _catalogContext;

    public MarketplaceProductsController(EcommerceDbContext ecommerceContext, CatalogDbContext catalogContext)
    {
        _ecommerceContext = ecommerceContext;
        _catalogContext = catalogContext;
    }

    /// <summary>Lists marketplace products with optional filtering and pagination. No authentication required.</summary>
    [HttpGet("products")]
    public async Task<ActionResult<MarketplaceProductListResponse>> GetProducts(
        [FromQuery] Guid? categoryId = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] string? search = null,
        [FromQuery] string? sort = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page = Math.Max(1, page);

        var query = _ecommerceContext.Products
            .Include(p => p.Variants)
            .Include(p => p.Category)
            .AsQueryable();

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId.Value);

        if (minPrice.HasValue)
            query = query.Where(p => p.BasePrice >= minPrice.Value);

        if (maxPrice.HasValue)
            query = query.Where(p => p.BasePrice <= maxPrice.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => EF.Functions.ILike(p.Name, $"%{search}%") ||
                                     (p.Description != null && EF.Functions.ILike(p.Description, $"%{search}%")));

        query = sort switch
        {
            "price_asc" => query.OrderBy(p => p.BasePrice),
            "price_desc" => query.OrderByDescending(p => p.BasePrice),
            "name" => query.OrderBy(p => p.Name),
            _ => query.OrderByDescending(p => p.CreatedAt)
        };

        var totalCount = await query.CountAsync();
        var products = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = products.Select(p => new MarketplaceProductDto(
            p.Id,
            p.Name,
            p.Description,
            p.Sku,
            p.BasePrice,
            p.CategoryId,
            p.Category?.Name,
            p.Variants.Select(v => new MarketplaceVariantDto(v.Id, v.Name, v.Sku, v.PriceOverride > 0 ? v.PriceOverride : p.BasePrice, v.StockQuantity)).ToList()
        )).ToList();

        return Ok(new MarketplaceProductListResponse(items, totalCount, page, pageSize));
    }

    /// <summary>Returns details for a single product by ID. No authentication required.</summary>
    [HttpGet("products/{id:guid}")]
    public async Task<ActionResult<MarketplaceProductDto>> GetProduct(Guid id)
    {
        var p = await _ecommerceContext.Products
            .Include(p => p.Variants)
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (p is null)
            throw new KeyNotFoundException($"Ürün bulunamadı: {id}");

        return Ok(new MarketplaceProductDto(
            p.Id, p.Name, p.Description, p.Sku, p.BasePrice, p.CategoryId,
            p.Category?.Name,
            p.Variants.Select(v => new MarketplaceVariantDto(v.Id, v.Name, v.Sku, v.PriceOverride > 0 ? v.PriceOverride : p.BasePrice, v.StockQuantity)).ToList()
        ));
    }

    /// <summary>Returns the public catalog category tree. No authentication required.</summary>
    [HttpGet("categories")]
    public async Task<ActionResult> GetCategories()
    {
        var all = await _catalogContext.Categories
            .Where(c => c.IsActive)
            .OrderBy(c => c.Level).ThenBy(c => c.Name)
            .ToListAsync();

        var tree = BuildTree(all, null);
        return Ok(tree);
    }

    private static List<object> BuildTree(
        List<MegaERP.Modules.Catalog.Core.Entities.CatalogCategory> all,
        Guid? parentId)
    {
        return all
            .Where(c => c.ParentId == parentId)
            .Select(c => (object)new
            {
                c.Id,
                c.Name,
                c.Slug,
                c.Level,
                c.IconUrl,
                Children = BuildTree(all, c.Id)
            })
            .ToList();
    }
}

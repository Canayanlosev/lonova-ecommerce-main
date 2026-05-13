using MegaERP.Modules.Catalog.Infrastructure.Persistence;
using MegaERP.Modules.Ecommerce.Infrastructure.Persistence;
using MegaERP.Modules.Marketplace.Core.DTOs;
using MegaERP.Modules.Marketplace.Infrastructure.Persistence;
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
    private readonly MarketplaceDbContext _mkt;

    public MarketplaceProductsController(EcommerceDbContext ecommerceContext, CatalogDbContext catalogContext, MarketplaceDbContext mkt)
    {
        _ecommerceContext = ecommerceContext;
        _catalogContext = catalogContext;
        _mkt = mkt;
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

        var productIds = products.Select(p => p.Id).ToList();
        var reviewStats = await _mkt.ProductReviews
            .Where(r => productIds.Contains(r.ProductId))
            .GroupBy(r => r.ProductId)
            .Select(g => new { ProductId = g.Key, Avg = g.Average(r => (double)r.Rating), Count = g.Count() })
            .ToListAsync();

        var items = products.Select(p =>
        {
            var stats = reviewStats.FirstOrDefault(s => s.ProductId == p.Id);
            return new MarketplaceProductDto(
                p.Id, p.Name, p.Description, p.Sku, p.Slug, p.ImageUrl,
                p.BasePrice, p.CategoryId, p.Category?.Name,
                p.Variants.Select(v => new MarketplaceVariantDto(v.Id, v.Name, v.VariantType, v.ColorHex, v.Sku, v.PriceOverride > 0 ? v.PriceOverride : p.BasePrice, v.StockQuantity)).ToList(),
                stats is not null ? (decimal)Math.Round(stats.Avg, 1) : 0,
                stats?.Count ?? 0
            );
        }).ToList();

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

        var reviews = await _mkt.ProductReviews.Where(r => r.ProductId == id).ToListAsync();
        var avgRating = reviews.Count > 0 ? (decimal)Math.Round(reviews.Average(r => (double)r.Rating), 1) : 0;

        return Ok(new MarketplaceProductDto(
            p.Id, p.Name, p.Description, p.Sku, p.Slug, p.ImageUrl,
            p.BasePrice, p.CategoryId, p.Category?.Name,
            p.Variants.Select(v => new MarketplaceVariantDto(v.Id, v.Name, v.VariantType, v.ColorHex, v.Sku, v.PriceOverride > 0 ? v.PriceOverride : p.BasePrice, v.StockQuantity)).ToList(),
            avgRating, reviews.Count
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

using MegaERP.Modules.Ecommerce.Core.DTOs;
using MegaERP.Modules.Ecommerce.Core.Entities;
using MegaERP.Modules.Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Ecommerce.Api.Controllers;

[ApiController]
[Route("api/ecommerce/products")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly EcommerceDbContext _context;

    public ProductsController(EcommerceDbContext context)
    {
        _context = context;
    }

    private static ProductVariantDto MapVariant(ProductVariant v) =>
        new(v.Id, v.Name, v.VariantType, v.ColorHex, v.Sku, v.PriceOverride, v.StockQuantity);

    private static ProductDto MapProduct(Product p) =>
        new(p.Id, p.Name, p.Description, p.BasePrice, p.Sku, p.Slug, p.ImageUrl, p.CategoryId,
            p.Variants.Select(MapVariant).ToList());

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts()
    {
        var products = await _context.Products
            .Include(p => p.Variants)
            .ToListAsync();

        return Ok(products.Select(MapProduct));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductDto>> GetProductById(Guid id)
    {
        var product = await _context.Products
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product is null)
            throw new KeyNotFoundException($"Ürün bulunamadı: {id}");

        return Ok(MapProduct(product));
    }

    [HttpPost]
    public async Task<ActionResult<ProductDto>> CreateProduct(CreateProductRequest request)
    {
        var product = new Product
        {
            Name = request.Name,
            Description = request.Description,
            BasePrice = request.BasePrice,
            Sku = request.Sku,
            Slug = request.Slug,
            ImageUrl = request.ImageUrl,
            CategoryId = request.CategoryId
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProductById), new { id = product.Id },
            new ProductDto(product.Id, product.Name, product.Description, product.BasePrice,
                product.Sku, product.Slug, product.ImageUrl, product.CategoryId, []));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateProduct(Guid id, CreateProductRequest request)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id);

        if (product is null)
            throw new KeyNotFoundException($"Ürün bulunamadı: {id}");

        product.Name = request.Name;
        product.Description = request.Description;
        product.BasePrice = request.BasePrice;
        product.Sku = request.Sku;
        product.Slug = request.Slug;
        product.ImageUrl = request.ImageUrl;
        product.CategoryId = request.CategoryId;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id);

        if (product is null)
            throw new KeyNotFoundException($"Ürün bulunamadı: {id}");

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // ── Variant endpoints ──────────────────────────────────────────────────────

    /// <summary>Lists all variants for a product.</summary>
    [HttpGet("{id:guid}/variants")]
    public async Task<ActionResult<List<ProductVariantDto>>> GetVariants(Guid id)
    {
        var variants = await _context.ProductVariants
            .Where(v => v.ProductId == id)
            .OrderBy(v => v.VariantType)
            .ThenBy(v => v.Name)
            .ToListAsync();

        return Ok(variants.Select(MapVariant));
    }

    /// <summary>Adds a variant to a product.</summary>
    [HttpPost("{id:guid}/variants")]
    public async Task<ActionResult<ProductVariantDto>> AddVariant(Guid id, CreateVariantRequest request)
    {
        var product = await _context.Products.FindAsync(id);
        if (product is null) return NotFound("Ürün bulunamadı.");

        var variant = new ProductVariant
        {
            ProductId = id,
            Name = request.Name,
            VariantType = request.VariantType,
            ColorHex = request.ColorHex,
            Sku = request.Sku,
            PriceOverride = request.PriceOverride,
            StockQuantity = request.StockQuantity
        };

        _context.ProductVariants.Add(variant);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetVariants), new { id }, MapVariant(variant));
    }

    /// <summary>Updates a variant.</summary>
    [HttpPut("{id:guid}/variants/{variantId:guid}")]
    public async Task<IActionResult> UpdateVariant(Guid id, Guid variantId, UpdateVariantRequest request)
    {
        var variant = await _context.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == id);

        if (variant is null) return NotFound("Varyant bulunamadı.");

        variant.Name = request.Name;
        variant.VariantType = request.VariantType;
        variant.ColorHex = request.ColorHex;
        variant.Sku = request.Sku;
        variant.PriceOverride = request.PriceOverride;
        variant.StockQuantity = request.StockQuantity;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Deletes a variant.</summary>
    [HttpDelete("{id:guid}/variants/{variantId:guid}")]
    public async Task<IActionResult> DeleteVariant(Guid id, Guid variantId)
    {
        var variant = await _context.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == id);

        if (variant is null) return NotFound("Varyant bulunamadı.");

        _context.ProductVariants.Remove(variant);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

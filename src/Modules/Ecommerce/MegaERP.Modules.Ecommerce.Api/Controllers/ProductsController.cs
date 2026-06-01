using MegaERP.Modules.Ecommerce.Core.DTOs;
using MegaERP.Modules.Ecommerce.Core.Entities;
using MegaERP.Modules.Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;

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

        _context.Update(product);
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

    [HttpPost("{id:guid}/image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(Guid id, IFormFile file)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id);
        if (product is null)
            return NotFound($"Ürün bulunamadı: {id}");

        if (file == null || file.Length == 0)
            return BadRequest("Dosya gönderilmedi.");

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest("Dosya boyutu en fazla 5MB olabilir.");

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
            return BadRequest("Geçersiz dosya tipi. Yalnızca JPG, PNG ve WEBP formatları desteklenir.");

        // Ensure wwwroot/images exists
        var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var imagesPath = Path.Combine(wwwrootPath, "images");
        if (!Directory.Exists(imagesPath))
        {
            Directory.CreateDirectory(imagesPath);
        }

        // Delete old file if it exists and is local
        if (!string.IsNullOrEmpty(product.ImageUrl) && product.ImageUrl.StartsWith("/images/"))
        {
            var oldFileName = Path.GetFileName(product.ImageUrl);
            var oldFilePath = Path.Combine(imagesPath, oldFileName);
            if (System.IO.File.Exists(oldFilePath))
            {
                try { System.IO.File.Delete(oldFilePath); } catch {}
            }
        }

        // Save new file
        var newFileName = $"{Guid.NewGuid()}{extension}";
        var newFilePath = Path.Combine(imagesPath, newFileName);

        using (var stream = new FileStream(newFilePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        product.ImageUrl = $"/images/{newFileName}";
        await _context.SaveChangesAsync();

        return Ok(new { imageUrl = product.ImageUrl });
    }

    /// <summary>Toggles marketplace visibility for a product.</summary>
    [HttpPut("{id:guid}/visibility")]
    public async Task<IActionResult> ToggleVisibility(Guid id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product is null) return NotFound("Ürün bulunamadı.");
        product.IsPublishedToMarketplace = !product.IsPublishedToMarketplace;
        product.UpdatedAt = DateTime.UtcNow;
        _context.Update(product);
        await _context.SaveChangesAsync();
        return Ok(new { product.Id, product.IsPublishedToMarketplace });
    }

    /// <summary>Clones (duplicates) a product including its variants. Returns the new product.</summary>
    [HttpPost("{id:guid}/clone")]
    public async Task<ActionResult<ProductDto>> CloneProduct(Guid id)
    {
        var source = await _context.Products
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (source is null) return NotFound("Ürün bulunamadı.");

        // Generate unique SKU by appending -COPY suffix
        var baseSku = source.Sku.Length > 20 ? source.Sku[..20] : source.Sku;
        var newSku = $"{baseSku}-COPY";
        // Ensure uniqueness
        var skuExists = await _context.Products.AnyAsync(p => p.Sku == newSku);
        if (skuExists) newSku = $"{baseSku}-{Guid.NewGuid().ToString()[..4].ToUpper()}";

        var clone = new Product
        {
            Name = $"{source.Name} (Kopya)",
            Description = source.Description,
            BasePrice = source.BasePrice,
            Sku = newSku,
            Slug = null, // slug must be unique; don't copy
            ImageUrl = source.ImageUrl,
            CategoryId = source.CategoryId,
            IsPublishedToMarketplace = false, // start as draft
        };

        var variantClones = source.Variants.Select(v => new ProductVariant
        {
            ProductId = clone.Id,
            Name = v.Name,
            VariantType = v.VariantType,
            ColorHex = v.ColorHex,
            Sku = $"{v.Sku}-COPY",
            PriceOverride = v.PriceOverride,
            StockQuantity = 0, // new product starts with 0 stock
        }).ToList();

        clone.Variants = variantClones;

        _context.Products.Add(clone);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProductById), new { id = clone.Id }, MapProduct(clone));
    }

    /// <summary>Bulk price update: applies a percentage or fixed adjustment to selected products.</summary>
    [HttpPost("bulk-price")]
    public async Task<IActionResult> BulkPriceUpdate([FromBody] BulkPriceRequest request)
    {
        if (request.ProductIds == null || request.ProductIds.Count == 0)
            return BadRequest("Ürün listesi boş.");

        var products = await _context.Products
            .Where(p => request.ProductIds.Contains(p.Id))
            .ToListAsync();

        foreach (var p in products)
        {
            p.BasePrice = request.AdjustmentType == "Percent"
                ? Math.Round(p.BasePrice * (1 + request.Value / 100m), 2)
                : Math.Round(p.BasePrice + request.Value, 2);

            if (p.BasePrice < 0) p.BasePrice = 0;
            p.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { updated = products.Count });
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

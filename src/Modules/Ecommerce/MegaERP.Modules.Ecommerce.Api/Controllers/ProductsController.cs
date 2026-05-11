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

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts()
    {
        var products = await _context.Products
            .Include(p => p.Variants)
            .Select(p => new ProductDto(
                p.Id,
                p.Name,
                p.Description,
                p.BasePrice,
                p.Sku,
                p.CategoryId,
                p.Variants.Select(v => new ProductVariantDto(v.Id, v.Name, v.Sku, v.PriceOverride, v.StockQuantity)).ToList()
            ))
            .ToListAsync();

        return Ok(products);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductDto>> GetProductById(Guid id)
    {
        var product = await _context.Products
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (product is null)
            throw new KeyNotFoundException($"Ürün bulunamadı: {id}");

        return Ok(new ProductDto(
            product.Id,
            product.Name,
            product.Description,
            product.BasePrice,
            product.Sku,
            product.CategoryId,
            product.Variants.Select(v => new ProductVariantDto(v.Id, v.Name, v.Sku, v.PriceOverride, v.StockQuantity)).ToList()
        ));
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
            CategoryId = request.CategoryId
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProductById), new { id = product.Id }, new ProductDto(
            product.Id, product.Name, product.Description, product.BasePrice, product.Sku, product.CategoryId, []));
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
}

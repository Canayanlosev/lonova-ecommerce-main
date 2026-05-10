using MegaERP.Modules.Ecommerce.Core.DTOs;
using MegaERP.Modules.Ecommerce.Core.Entities;
using MegaERP.Modules.Ecommerce.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Ecommerce.Api.Controllers;

[ApiController]
[Route("api/ecommerce/products")]
[Authorize] // Requires authentication for all product actions
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

        return CreatedAtAction(nameof(GetProducts), new { id = product.Id }, product);
    }
}

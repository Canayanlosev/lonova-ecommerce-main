using System.Security.Claims;
using MegaERP.Modules.Ecommerce.Infrastructure.Persistence;
using MegaERP.Modules.Marketplace.Core.DTOs;
using MegaERP.Modules.Marketplace.Core.Entities;
using MegaERP.Modules.Marketplace.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Marketplace.Api.Controllers;

/// <summary>Buyer shopping cart — add, update, remove items and checkout.</summary>
[ApiController]
[Route("api/marketplace/cart")]
[Authorize]
public class BuyerCartController : ControllerBase
{
    private readonly MarketplaceDbContext _mkt;
    private readonly EcommerceDbContext _ecom;

    public BuyerCartController(MarketplaceDbContext mkt, EcommerceDbContext ecom)
    {
        _mkt = mkt;
        _ecom = ecom;
    }

    private Guid BuyerId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException());

    /// <summary>Returns the current buyer's cart.</summary>
    [HttpGet]
    public async Task<ActionResult<CartDto>> GetCart()
    {
        var items = await _mkt.CartItems
            .Where(c => c.BuyerUserId == BuyerId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return Ok(ToCartDto(items));
    }

    /// <summary>Adds a product (and optionally a variant) to the cart. If already in cart, increments quantity.</summary>
    [HttpPost("items")]
    public async Task<ActionResult<CartDto>> AddItem(AddToCartRequest request)
    {
        if (request.Quantity < 1)
            return BadRequest("Miktar en az 1 olmalıdır.");

        var product = await _ecom.Products
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p => p.Id == request.ProductId);

        if (product is null)
            return NotFound("Ürün bulunamadı.");

        decimal price = product.BasePrice;
        string? variantName = null;

        if (request.VariantId.HasValue)
        {
            var variant = product.Variants.FirstOrDefault(v => v.Id == request.VariantId.Value);
            if (variant is null) return NotFound("Varyant bulunamadı.");
            if (variant.PriceOverride > 0) price = variant.PriceOverride;
            variantName = variant.Name;
        }

        var existing = await _mkt.CartItems.FirstOrDefaultAsync(c =>
            c.BuyerUserId == BuyerId &&
            c.ProductId == request.ProductId &&
            c.VariantId == request.VariantId);

        if (existing is not null)
        {
            existing.Quantity += request.Quantity;
        }
        else
        {
            _mkt.CartItems.Add(new BuyerCartItem
            {
                BuyerUserId = BuyerId,
                ProductId = request.ProductId,
                VariantId = request.VariantId,
                ProductName = product.Name,
                VariantName = variantName,
                ImageUrl = product.ImageUrl,
                UnitPrice = price,
                Quantity = request.Quantity
            });
        }

        await _mkt.SaveChangesAsync();

        var items = await _mkt.CartItems.Where(c => c.BuyerUserId == BuyerId).OrderBy(c => c.CreatedAt).ToListAsync();
        return Ok(ToCartDto(items));
    }

    /// <summary>Updates the quantity of a cart item. Set quantity to 0 to remove.</summary>
    [HttpPatch("items/{itemId:guid}")]
    public async Task<ActionResult<CartDto>> UpdateItem(Guid itemId, [FromBody] int quantity)
    {
        var item = await _mkt.CartItems.FirstOrDefaultAsync(c => c.Id == itemId && c.BuyerUserId == BuyerId);
        if (item is null) return NotFound();

        if (quantity <= 0)
            _mkt.CartItems.Remove(item);
        else
            item.Quantity = quantity;

        await _mkt.SaveChangesAsync();

        var items = await _mkt.CartItems.Where(c => c.BuyerUserId == BuyerId).OrderBy(c => c.CreatedAt).ToListAsync();
        return Ok(ToCartDto(items));
    }

    /// <summary>Removes a specific item from the cart.</summary>
    [HttpDelete("items/{itemId:guid}")]
    public async Task<ActionResult<CartDto>> RemoveItem(Guid itemId)
    {
        var item = await _mkt.CartItems.FirstOrDefaultAsync(c => c.Id == itemId && c.BuyerUserId == BuyerId);
        if (item is null) return NotFound();

        _mkt.CartItems.Remove(item);
        await _mkt.SaveChangesAsync();

        var items = await _mkt.CartItems.Where(c => c.BuyerUserId == BuyerId).OrderBy(c => c.CreatedAt).ToListAsync();
        return Ok(ToCartDto(items));
    }

    /// <summary>Clears the entire cart.</summary>
    [HttpDelete]
    public async Task<IActionResult> ClearCart()
    {
        var items = await _mkt.CartItems.Where(c => c.BuyerUserId == BuyerId).ToListAsync();
        _mkt.CartItems.RemoveRange(items);
        await _mkt.SaveChangesAsync();
        return NoContent();
    }

    private static CartDto ToCartDto(List<BuyerCartItem> items)
    {
        var dtos = items.Select(c => new CartItemDto(
            c.Id, c.ProductId, c.VariantId, c.ProductName, c.VariantName,
            c.ImageUrl, c.UnitPrice, c.Quantity, c.UnitPrice * c.Quantity
        )).ToList();
        return new CartDto(dtos, dtos.Sum(d => d.LineTotal), dtos.Sum(d => d.Quantity));
    }
}

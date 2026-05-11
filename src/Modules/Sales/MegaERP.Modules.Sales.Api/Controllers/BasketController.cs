using MegaERP.Modules.Sales.Core.DTOs;
using MegaERP.Modules.Sales.Core.Entities;
using MegaERP.Modules.Sales.Core.Features.Orders.Commands;
using MegaERP.Modules.Sales.Infrastructure.Persistence;
using MegaERP.Shared.Events;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Sales.Api.Controllers;

[ApiController]
[Route("api/sales/basket")]
[Authorize]
public class BasketController : ControllerBase
{
    private readonly SalesDbContext _context;
    private readonly IMediator _mediator;

    public BasketController(SalesDbContext context, IMediator mediator)
    {
        _context = context;
        _mediator = mediator;
    }

    private string GetUserId() =>
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("Kullanıcı kimliği bulunamadı.");

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BasketItemDto>>> GetBasket()
    {
        var userId = GetUserId();
        var items = await _context.BasketItems
            .Where(b => b.UserId == userId)
            .Select(b => new BasketItemDto(
                b.Id,
                b.ProductId,
                b.ProductVariantId,
                b.ProductName,
                b.UnitPrice,
                b.Quantity,
                b.UnitPrice * b.Quantity))
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("items")]
    public async Task<IActionResult> AddItem(AddToBasketRequest request)
    {
        if (request.Quantity <= 0)
            throw new ArgumentException("Miktar sıfırdan büyük olmalıdır.");

        var userId = GetUserId();

        var existing = await _context.BasketItems
            .FirstOrDefaultAsync(b => b.UserId == userId && b.ProductId == request.ProductId
                && b.ProductVariantId == request.ProductVariantId);

        if (existing is not null)
        {
            existing.Quantity += request.Quantity;
        }
        else
        {
            _context.BasketItems.Add(new BasketItem
            {
                UserId = userId,
                ProductId = request.ProductId,
                ProductVariantId = request.ProductVariantId,
                ProductName = request.ProductName,
                UnitPrice = request.UnitPrice,
                Quantity = request.Quantity
            });
        }

        await _context.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("items/{productId:guid}")]
    public async Task<IActionResult> UpdateItem(Guid productId, UpdateBasketItemRequest request)
    {
        if (request.Quantity <= 0)
            throw new ArgumentException("Miktar sıfırdan büyük olmalıdır.");

        var userId = GetUserId();
        var item = await _context.BasketItems
            .FirstOrDefaultAsync(b => b.UserId == userId && b.ProductId == productId);

        if (item is null)
            throw new KeyNotFoundException("Sepette bu ürün bulunamadı.");

        item.Quantity = request.Quantity;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("items/{productId:guid}")]
    public async Task<IActionResult> RemoveItem(Guid productId)
    {
        var userId = GetUserId();
        var item = await _context.BasketItems
            .FirstOrDefaultAsync(b => b.UserId == userId && b.ProductId == productId);

        if (item is null)
            throw new KeyNotFoundException("Sepette bu ürün bulunamadı.");

        _context.BasketItems.Remove(item);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> ClearBasket()
    {
        var userId = GetUserId();
        var items = await _context.BasketItems
            .Where(b => b.UserId == userId)
            .ToListAsync();

        _context.BasketItems.RemoveRange(items);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("checkout")]
    public async Task<ActionResult<Guid>> Checkout()
    {
        var userId = GetUserId();
        var items = await _context.BasketItems
            .Where(b => b.UserId == userId)
            .ToListAsync();

        if (items.Count == 0)
            throw new InvalidOperationException("Sepet boş, ödeme yapılamaz.");

        var orderItems = items.Select(b => new OrderItemData(
            b.ProductId,
            b.Quantity,
            b.UnitPrice,
            b.ProductName)).ToList();

        var orderId = await _mediator.Send(new PlaceOrderCommand(userId, orderItems));

        _context.BasketItems.RemoveRange(items);
        await _context.SaveChangesAsync();

        return Ok(orderId);
    }
}

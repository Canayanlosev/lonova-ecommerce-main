using MegaERP.Modules.Sales.Core.DTOs;
using MegaERP.Modules.Sales.Core.Features.Orders.Commands;
using MegaERP.Modules.Sales.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Sales.Api.Controllers;

[ApiController]
[Route("api/sales/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly SalesDbContext _context;

    public OrdersController(IMediator mediator, SalesDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    private string GetUserId() =>
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
        ?? throw new UnauthorizedAccessException("Kullanıcı kimliği bulunamadı.");

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetMyOrders()
    {
        var userId = GetUserId();
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.OrderDate)
            .Select(o => new OrderDto(
                o.Id,
                o.OrderDate,
                o.Status,
                o.TotalAmount,
                o.Items.Select(i => new OrderItemDto(
                    i.Id, i.ProductId, i.ProductName, i.Quantity, i.UnitPrice, i.Quantity * i.UnitPrice
                )).ToList()))
            .ToListAsync();

        return Ok(orders);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDto>> GetOrderById(Guid id)
    {
        var userId = GetUserId();
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null)
            throw new KeyNotFoundException($"Sipariş bulunamadı: {id}");

        if (order.UserId != userId)
            throw new UnauthorizedAccessException("Bu siparişe erişim yetkiniz yok.");

        return Ok(new OrderDto(
            order.Id,
            order.OrderDate,
            order.Status,
            order.TotalAmount,
            order.Items.Select(i => new OrderItemDto(
                i.Id, i.ProductId, i.ProductName, i.Quantity, i.UnitPrice, i.Quantity * i.UnitPrice
            )).ToList()));
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelOrder(Guid id)
    {
        var userId = GetUserId();
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id);

        if (order is null)
            throw new KeyNotFoundException($"Sipariş bulunamadı: {id}");

        if (order.UserId != userId)
            throw new UnauthorizedAccessException("Bu siparişe erişim yetkiniz yok.");

        if (order.Status != "Pending" && order.Status != "Placed")
            throw new InvalidOperationException($"Yalnızca beklemedeki siparişler iptal edilebilir. Mevcut durum: {order.Status}");

        order.Status = "Cancelled";
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> PlaceOrder(PlaceOrderCommand command)
    {
        var orderId = await _mediator.Send(command);
        return Ok(orderId);
    }
}

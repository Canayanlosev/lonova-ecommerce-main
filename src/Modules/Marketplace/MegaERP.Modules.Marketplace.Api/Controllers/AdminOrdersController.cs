using MegaERP.Modules.Marketplace.Core.DTOs;
using MegaERP.Modules.Marketplace.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Marketplace.Api.Controllers;

/// <summary>Admin order management — firm panel access to all orders + shipping updates.</summary>
[ApiController]
[Route("api/marketplace/admin/orders")]
[Authorize]
public class AdminOrdersController : ControllerBase
{
    private readonly MarketplaceDbContext _context;

    public AdminOrdersController(MarketplaceDbContext context) => _context = context;

    /// <summary>Returns all orders, newest first. Supports filtering by status and pagination.</summary>
    [HttpGet]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 100);
        page = Math.Max(1, page);

        var query = _context.Orders.Include(o => o.Items).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(o => o.Status == status);

        var total = await query.CountAsync();
        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = orders.Select(o => new AdminOrderDto(
            o.Id, o.BuyerUserId, o.TotalAmount, o.Status, o.PaymentStatus, o.PaymentMethod,
            o.RecipientName, o.Phone, o.City, o.District, o.AddressLine,
            o.CreatedAt, o.Items.Count,
            o.TrackingNumber, o.CarrierName, o.CancelReason, o.RefundStatus
        )).ToList();

        return Ok(new { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
    }

    /// <summary>Returns a single order by ID with full details.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        var o = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (o is null) return NotFound();

        return Ok(CheckoutController.ToOrderDto(o));
    }

    /// <summary>Marks an order as Shipped with a tracking number. Status must be Processing or Confirmed.</summary>
    [HttpPut("{id:guid}/ship")]
    public async Task<IActionResult> ShipOrder(Guid id, [FromBody] ShipOrderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TrackingNumber))
            return BadRequest("Takip numarası boş olamaz.");

        if (string.IsNullOrWhiteSpace(request.CarrierName))
            return BadRequest("Kargo firması boş olamaz.");

        var o = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (o is null) return NotFound();

        if (o.Status == "Cancelled")
            return BadRequest("İptal edilen siparişler kargoya verilemez.");

        if (o.Status == "Shipped" || o.Status == "Delivered")
            return BadRequest("Sipariş zaten kargoya verilmiş.");

        o.Status = "Shipped";
        o.TrackingNumber = request.TrackingNumber.Trim();
        o.CarrierName = request.CarrierName.Trim();

        // If payment was pending (cash on delivery), keep PaymentStatus as is
        // For paid orders, status stays Paid
        await _context.SaveChangesAsync();

        return Ok(CheckoutController.ToOrderDto(o));
    }

    /// <summary>Marks a Shipped order as Delivered.</summary>
    [HttpPut("{id:guid}/deliver")]
    public async Task<IActionResult> DeliverOrder(Guid id)
    {
        var o = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (o is null) return NotFound();

        if (o.Status != "Shipped")
            return BadRequest("Yalnızca kargodaki siparişler teslim olarak işaretlenebilir.");

        o.Status = "Delivered";

        // Cash on delivery: mark as Paid on delivery
        if (o.PaymentMethod == "CashOnDelivery")
            o.PaymentStatus = "Paid";

        await _context.SaveChangesAsync();
        return Ok(CheckoutController.ToOrderDto(o));
    }

    /// <summary>Processes a pending refund request — marks RefundStatus as Refunded.</summary>
    [HttpPut("{id:guid}/refund")]
    public async Task<IActionResult> ProcessRefund(Guid id)
    {
        var o = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (o is null) return NotFound();

        if (o.RefundStatus != "Requested")
            return BadRequest("İade talebi bulunamadı veya zaten işlenmiş.");

        o.RefundStatus = "Refunded";
        o.PaymentStatus = "Refunded";

        await _context.SaveChangesAsync();
        return Ok(CheckoutController.ToOrderDto(o));
    }
}

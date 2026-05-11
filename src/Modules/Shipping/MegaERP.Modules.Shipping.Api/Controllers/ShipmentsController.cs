using MegaERP.Modules.Shipping.Core.DTOs;
using MegaERP.Modules.Shipping.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Shipping.Api.Controllers;

[ApiController]
[Route("api/shipping/shipments")]
[Authorize]
public class ShipmentsController : ControllerBase
{
    private readonly ShippingDbContext _context;

    public ShipmentsController(ShippingDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ShipmentDto>>> GetAll()
    {
        var shipments = await _context.Shipments
            .Include(s => s.ShippingMethod)
            .Select(s => new ShipmentDto(
                s.Id, s.OrderId, s.TrackingNumber, s.ShippedDate,
                s.EstimatedDeliveryDate, s.Status, s.ShippingMethodId,
                s.ShippingMethod != null ? s.ShippingMethod.Name : null))
            .ToListAsync();
        return Ok(shipments);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ShipmentDto>> GetById(Guid id)
    {
        var s = await _context.Shipments.Include(s => s.ShippingMethod)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (s is null) throw new KeyNotFoundException($"Kargo bulunamadı: {id}");
        return Ok(new ShipmentDto(s.Id, s.OrderId, s.TrackingNumber, s.ShippedDate,
            s.EstimatedDeliveryDate, s.Status, s.ShippingMethodId,
            s.ShippingMethod?.Name));
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateShipmentStatusRequest request)
    {
        var allowed = new[] { "Pending", "Shipped", "InTransit", "Delivered", "Returned" };
        if (!allowed.Contains(request.Status))
            throw new ArgumentException($"Geçersiz durum. İzin verilenler: {string.Join(", ", allowed)}");

        var shipment = await _context.Shipments.FirstOrDefaultAsync(s => s.Id == id);
        if (shipment is null) throw new KeyNotFoundException($"Kargo bulunamadı: {id}");

        shipment.Status = request.Status;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

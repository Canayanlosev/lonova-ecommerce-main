using MegaERP.Modules.WMS.Core.DTOs;
using MegaERP.Modules.WMS.Core.Entities;
using MegaERP.Modules.WMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.WMS.Api.Controllers;

[ApiController]
[Route("api/wms/purchase-orders")]
[Authorize(Roles = "Admin,Manager")]
public class PurchaseOrdersController : ControllerBase
{
    private readonly WMSDbContext _context;

    public PurchaseOrdersController(WMSDbContext context) => _context = context;

    /// <summary>Lists all purchase orders.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PurchaseOrderDto>>> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var items = await _context.PurchaseOrders
            .Include(o => o.Supplier)
            .Include(o => o.Items)
            .OrderByDescending(o => o.OrderDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return Ok(items.Select(ToDto));
    }

    /// <summary>Gets a purchase order by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PurchaseOrderDto>> GetById(Guid id)
    {
        var order = await _context.PurchaseOrders
            .Include(o => o.Supplier)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) throw new KeyNotFoundException($"Satın alma siparişi bulunamadı: {id}");
        return Ok(ToDto(order));
    }

    /// <summary>Creates a new purchase order.</summary>
    [HttpPost]
    public async Task<ActionResult<PurchaseOrderDto>> Create(CreatePurchaseOrderRequest request)
    {
        var order = new PurchaseOrder
        {
            SupplierId = request.SupplierId,
            ExpectedDate = request.ExpectedDate,
            Notes = request.Notes,
            Items = request.Items.Select(i => new PurchaseOrderItem
            {
                ProductId = i.ProductId,
                OrderedQuantity = i.Quantity,
                UnitPrice = i.UnitPrice
            }).ToList()
        };

        _context.PurchaseOrders.Add(order);
        await _context.SaveChangesAsync();

        var created = await _context.PurchaseOrders
            .Include(o => o.Supplier).Include(o => o.Items)
            .FirstAsync(o => o.Id == order.Id);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, ToDto(created));
    }

    /// <summary>Updates purchase order status.</summary>
    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] string status)
    {
        var order = await _context.PurchaseOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) throw new KeyNotFoundException($"Satın alma siparişi bulunamadı: {id}");

        if (!Enum.TryParse<PurchaseOrderStatus>(status, true, out var newStatus))
            return BadRequest($"Geçersiz durum: {status}");

        order.Status = newStatus;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Marks a purchase order as received and automatically creates stock movements (In).</summary>
    [HttpPut("{id:guid}/receive")]
    public async Task<IActionResult> Receive(Guid id, ReceivePurchaseOrderRequest request)
    {
        var order = await _context.PurchaseOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) throw new KeyNotFoundException($"Satın alma siparişi bulunamadı: {id}");

        foreach (var item in order.Items)
        {
            item.ReceivedQuantity = item.OrderedQuantity;

            var movement = new StockMovement
            {
                MovementType = StockMovementType.In,
                ProductId = item.ProductId,
                ToBinId = request.ToBinId,
                Quantity = item.OrderedQuantity,
                Note = $"PO teslim alındı: {order.Id}"
            };
            _context.StockMovements.Add(movement);

            if (request.ToBinId.HasValue)
            {
                var stock = await _context.StockLocations
                    .FirstOrDefaultAsync(s => s.BinId == request.ToBinId.Value && s.ProductId == item.ProductId);

                if (stock is null)
                    _context.StockLocations.Add(new StockLocation { BinId = request.ToBinId.Value, ProductId = item.ProductId, Quantity = item.OrderedQuantity });
                else
                    stock.Quantity += item.OrderedQuantity;
            }
        }

        order.Status = PurchaseOrderStatus.Received;
        order.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Sipariş teslim alındı, stok güncellendi." });
    }

    private static PurchaseOrderDto ToDto(PurchaseOrder o) => new(
        o.Id, o.SupplierId, o.Supplier?.Name, o.Status.ToString(), o.OrderDate, o.ExpectedDate, o.Notes,
        o.Items.Select(i => new PurchaseOrderItemDto(i.ProductId, i.OrderedQuantity, i.ReceivedQuantity, i.UnitPrice)).ToList()
    );
}

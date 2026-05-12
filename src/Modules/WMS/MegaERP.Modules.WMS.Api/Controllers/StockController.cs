using MegaERP.Modules.WMS.Core.DTOs;
using MegaERP.Modules.WMS.Core.Entities;
using MegaERP.Modules.WMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.WMS.Api.Controllers;

[ApiController]
[Route("api/wms")]
[Authorize(Roles = "Admin,Manager")]
public class StockController : ControllerBase
{
    private readonly WMSDbContext _context;

    public StockController(WMSDbContext context) => _context = context;

    /// <summary>Returns stock levels across all bins.</summary>
    [HttpGet("stock")]
    public async Task<ActionResult<IEnumerable<StockLocationDto>>> GetStock(
        [FromQuery] Guid? productId = null,
        [FromQuery] bool lowStockOnly = false)
    {
        var query = _context.StockLocations.AsQueryable();

        if (productId.HasValue)
            query = query.Where(s => s.ProductId == productId.Value);

        if (lowStockOnly)
            query = query.Where(s => s.Quantity <= s.MinStockLevel);

        var items = await query
            .Select(s => new StockLocationDto(s.ProductId, s.BinId, s.Quantity, s.MinStockLevel, s.Quantity <= s.MinStockLevel))
            .ToListAsync();

        return Ok(items);
    }

    /// <summary>Records a stock movement (In/Out/Transfer/Loss).</summary>
    [HttpPost("stock-movements")]
    public async Task<IActionResult> RecordMovement(StockMovementRequest request)
    {
        if (!Enum.TryParse<StockMovementType>(request.MovementType, true, out var movementType))
            return BadRequest($"Geçersiz hareket tipi: {request.MovementType}");

        var movement = new StockMovement
        {
            MovementType = movementType,
            ProductId = request.ProductId,
            FromBinId = request.FromBinId,
            ToBinId = request.ToBinId,
            Quantity = request.Quantity,
            Note = request.Note
        };
        _context.StockMovements.Add(movement);

        // Update stock locations
        if (movementType == StockMovementType.In && request.ToBinId.HasValue)
        {
            await UpsertStock(request.ToBinId.Value, request.ProductId, request.Quantity);
        }
        else if (movementType == StockMovementType.Out && request.FromBinId.HasValue)
        {
            await UpsertStock(request.FromBinId.Value, request.ProductId, -request.Quantity);
        }
        else if (movementType == StockMovementType.Transfer && request.FromBinId.HasValue && request.ToBinId.HasValue)
        {
            await UpsertStock(request.FromBinId.Value, request.ProductId, -request.Quantity);
            await UpsertStock(request.ToBinId.Value, request.ProductId, request.Quantity);
        }
        else if (movementType == StockMovementType.Loss && request.FromBinId.HasValue)
        {
            await UpsertStock(request.FromBinId.Value, request.ProductId, -request.Quantity);
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Stok hareketi kaydedildi." });
    }

    /// <summary>Returns the last 50 stock movements.</summary>
    [HttpGet("stock-movements")]
    public async Task<ActionResult> GetMovements([FromQuery] Guid? productId = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _context.StockMovements.AsQueryable();
        if (productId.HasValue)
            query = query.Where(m => m.ProductId == productId.Value);

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(m => m.MovedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { total, items });
    }

    private async Task UpsertStock(Guid binId, Guid productId, int delta)
    {
        var stock = await _context.StockLocations
            .FirstOrDefaultAsync(s => s.BinId == binId && s.ProductId == productId);

        if (stock is null)
        {
            stock = new StockLocation { BinId = binId, ProductId = productId, Quantity = Math.Max(0, delta) };
            _context.StockLocations.Add(stock);
        }
        else
        {
            stock.Quantity = Math.Max(0, stock.Quantity + delta);
        }
    }
}

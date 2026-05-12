using MegaERP.Modules.WMS.Core.DTOs;
using MegaERP.Modules.WMS.Core.Entities;
using MegaERP.Modules.WMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.WMS.Api.Controllers;

[ApiController]
[Route("api/wms/warehouses")]
[Authorize(Roles = "Admin,Manager")]
public class WarehousesController : ControllerBase
{
    private readonly WMSDbContext _context;

    public WarehousesController(WMSDbContext context) => _context = context;

    /// <summary>Lists all warehouses.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WarehouseDto>>> GetAll()
    {
        var items = await _context.Warehouses
            .Select(w => new WarehouseDto(w.Id, w.Name, w.Address, w.IsActive))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>Returns a warehouse by ID with its zone tree.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult> GetById(Guid id)
    {
        var w = await _context.Warehouses
            .Include(w => w.Zones)
                .ThenInclude(z => z.Aisles)
                    .ThenInclude(a => a.Racks)
                        .ThenInclude(r => r.Bins)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (w is null) throw new KeyNotFoundException($"Depo bulunamadı: {id}");

        return Ok(new { w.Id, w.Name, w.Address, w.IsActive, Zones = w.Zones });
    }

    /// <summary>Creates a new warehouse.</summary>
    [HttpPost]
    public async Task<ActionResult<WarehouseDto>> Create(CreateWarehouseRequest request)
    {
        var warehouse = new Warehouse { Name = request.Name, Address = request.Address };
        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = warehouse.Id },
            new WarehouseDto(warehouse.Id, warehouse.Name, warehouse.Address, warehouse.IsActive));
    }

    /// <summary>Updates a warehouse.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, CreateWarehouseRequest request)
    {
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == id);
        if (warehouse is null) throw new KeyNotFoundException($"Depo bulunamadı: {id}");
        warehouse.Name = request.Name;
        warehouse.Address = request.Address;
        warehouse.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Deletes a warehouse (Admin only).</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == id);
        if (warehouse is null) throw new KeyNotFoundException($"Depo bulunamadı: {id}");
        _context.Warehouses.Remove(warehouse);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

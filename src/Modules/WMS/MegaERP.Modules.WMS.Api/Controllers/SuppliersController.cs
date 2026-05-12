using MegaERP.Modules.WMS.Core.DTOs;
using MegaERP.Modules.WMS.Core.Entities;
using MegaERP.Modules.WMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.WMS.Api.Controllers;

[ApiController]
[Route("api/wms/suppliers")]
[Authorize(Roles = "Admin,Manager")]
public class SuppliersController : ControllerBase
{
    private readonly WMSDbContext _context;

    public SuppliersController(WMSDbContext context) => _context = context;

    /// <summary>Lists all suppliers.</summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SupplierDto>>> GetAll()
    {
        var items = await _context.Suppliers
            .Select(s => new SupplierDto(s.Id, s.Name, s.ContactEmail, s.ContactPhone, s.Address, s.IsActive))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>Creates a new supplier.</summary>
    [HttpPost]
    public async Task<ActionResult<SupplierDto>> Create(CreateSupplierRequest request)
    {
        var supplier = new Supplier
        {
            Name = request.Name,
            ContactEmail = request.ContactEmail,
            ContactPhone = request.ContactPhone,
            Address = request.Address
        };
        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync();
        return Ok(new SupplierDto(supplier.Id, supplier.Name, supplier.ContactEmail, supplier.ContactPhone, supplier.Address, supplier.IsActive));
    }

    /// <summary>Updates a supplier.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, CreateSupplierRequest request)
    {
        var supplier = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == id);
        if (supplier is null) throw new KeyNotFoundException($"Tedarikçi bulunamadı: {id}");
        supplier.Name = request.Name;
        supplier.ContactEmail = request.ContactEmail;
        supplier.ContactPhone = request.ContactPhone;
        supplier.Address = request.Address;
        supplier.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Deletes a supplier (Admin only).</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var supplier = await _context.Suppliers.FirstOrDefaultAsync(s => s.Id == id);
        if (supplier is null) throw new KeyNotFoundException($"Tedarikçi bulunamadı: {id}");
        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

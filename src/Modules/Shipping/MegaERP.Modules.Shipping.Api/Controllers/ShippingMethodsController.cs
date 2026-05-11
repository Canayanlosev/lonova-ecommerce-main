using MegaERP.Modules.Shipping.Core.DTOs;
using MegaERP.Modules.Shipping.Core.Entities;
using MegaERP.Modules.Shipping.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Shipping.Api.Controllers;

[ApiController]
[Route("api/shipping/methods")]
[Authorize]
public class ShippingMethodsController : ControllerBase
{
    private readonly ShippingDbContext _context;

    public ShippingMethodsController(ShippingDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ShippingMethodDto>>> GetAll()
    {
        var methods = await _context.ShippingMethods
            .Select(m => new ShippingMethodDto(m.Id, m.Name, m.Carrier, m.BaseCost))
            .ToListAsync();
        return Ok(methods);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ShippingMethodDto>> GetById(Guid id)
    {
        var method = await _context.ShippingMethods.FirstOrDefaultAsync(m => m.Id == id);
        if (method is null) throw new KeyNotFoundException($"Kargo yöntemi bulunamadı: {id}");
        return Ok(new ShippingMethodDto(method.Id, method.Name, method.Carrier, method.BaseCost));
    }

    [HttpPost]
    public async Task<ActionResult<ShippingMethodDto>> Create(CreateShippingMethodRequest request)
    {
        var method = new ShippingMethod
        {
            Name = request.Name,
            Carrier = request.Carrier,
            BaseCost = request.BaseCost
        };
        _context.ShippingMethods.Add(method);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = method.Id },
            new ShippingMethodDto(method.Id, method.Name, method.Carrier, method.BaseCost));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, CreateShippingMethodRequest request)
    {
        var method = await _context.ShippingMethods.FirstOrDefaultAsync(m => m.Id == id);
        if (method is null) throw new KeyNotFoundException($"Kargo yöntemi bulunamadı: {id}");
        method.Name = request.Name;
        method.Carrier = request.Carrier;
        method.BaseCost = request.BaseCost;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var method = await _context.ShippingMethods.FirstOrDefaultAsync(m => m.Id == id);
        if (method is null) throw new KeyNotFoundException($"Kargo yöntemi bulunamadı: {id}");
        _context.ShippingMethods.Remove(method);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

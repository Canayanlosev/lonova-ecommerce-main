using System.Security.Claims;
using MegaERP.Modules.Marketplace.Core.DTOs;
using MegaERP.Modules.Marketplace.Core.Entities;
using MegaERP.Modules.Marketplace.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Marketplace.Api.Controllers;

/// <summary>Buyer address book — authenticated buyers can manage multiple delivery addresses.</summary>
[ApiController]
[Route("api/marketplace/addresses")]
[Authorize]
public class BuyerAddressController : ControllerBase
{
    private readonly MarketplaceDbContext _context;

    public BuyerAddressController(MarketplaceDbContext context) => _context = context;

    private Guid BuyerId => Guid.Parse(
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException());

    private static BuyerAddressDto ToDto(BuyerAddress a) => new(
        a.Id, a.Title, a.RecipientName, a.Phone,
        a.City, a.District, a.AddressLine, a.PostalCode, a.IsDefault
    );

    /// <summary>Returns all saved addresses for the authenticated buyer.</summary>
    [HttpGet]
    public async Task<ActionResult<List<BuyerAddressDto>>> GetAddresses()
    {
        var addresses = await _context.Addresses
            .Where(a => a.BuyerUserId == BuyerId)
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.CreatedAt)
            .ToListAsync();

        return Ok(addresses.Select(ToDto));
    }

    /// <summary>Returns a single address by ID (must belong to authenticated buyer).</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BuyerAddressDto>> GetAddress(Guid id)
    {
        var a = await _context.Addresses
            .FirstOrDefaultAsync(a => a.Id == id && a.BuyerUserId == BuyerId);

        if (a is null) return NotFound();
        return Ok(ToDto(a));
    }

    /// <summary>Creates a new delivery address. If IsDefault is true, demotes all others.</summary>
    [HttpPost]
    public async Task<ActionResult<BuyerAddressDto>> CreateAddress([FromBody] CreateAddressRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest("Adres başlığı boş olamaz.");
        if (string.IsNullOrWhiteSpace(request.RecipientName))
            return BadRequest("Alıcı adı boş olamaz.");
        if (string.IsNullOrWhiteSpace(request.Phone))
            return BadRequest("Telefon numarası boş olamaz.");
        if (string.IsNullOrWhiteSpace(request.City))
            return BadRequest("Şehir boş olamaz.");
        if (string.IsNullOrWhiteSpace(request.AddressLine))
            return BadRequest("Adres satırı boş olamaz.");

        if (request.IsDefault)
        {
            // Demote existing defaults
            var existing = await _context.Addresses
                .Where(a => a.BuyerUserId == BuyerId && a.IsDefault)
                .ToListAsync();
            foreach (var e in existing) e.IsDefault = false;
        }

        var address = new BuyerAddress
        {
            BuyerUserId = BuyerId,
            Title = request.Title.Trim(),
            RecipientName = request.RecipientName.Trim(),
            Phone = request.Phone.Trim(),
            City = request.City.Trim(),
            District = request.District?.Trim() ?? string.Empty,
            AddressLine = request.AddressLine.Trim(),
            PostalCode = request.PostalCode?.Trim() ?? string.Empty,
            IsDefault = request.IsDefault
        };

        // First address is always default
        var hasAny = await _context.Addresses.AnyAsync(a => a.BuyerUserId == BuyerId);
        if (!hasAny) address.IsDefault = true;

        _context.Addresses.Add(address);
        await _context.SaveChangesAsync();

        return Ok(ToDto(address));
    }

    /// <summary>Updates an existing address.</summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BuyerAddressDto>> UpdateAddress(Guid id, [FromBody] CreateAddressRequest request)
    {
        var a = await _context.Addresses
            .FirstOrDefaultAsync(a => a.Id == id && a.BuyerUserId == BuyerId);

        if (a is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Title)) return BadRequest("Adres başlığı boş olamaz.");
        if (string.IsNullOrWhiteSpace(request.RecipientName)) return BadRequest("Alıcı adı boş olamaz.");
        if (string.IsNullOrWhiteSpace(request.Phone)) return BadRequest("Telefon numarası boş olamaz.");
        if (string.IsNullOrWhiteSpace(request.City)) return BadRequest("Şehir boş olamaz.");
        if (string.IsNullOrWhiteSpace(request.AddressLine)) return BadRequest("Adres satırı boş olamaz.");

        if (request.IsDefault && !a.IsDefault)
        {
            var existing = await _context.Addresses
                .Where(x => x.BuyerUserId == BuyerId && x.IsDefault)
                .ToListAsync();
            foreach (var e in existing) e.IsDefault = false;
        }

        a.Title = request.Title.Trim();
        a.RecipientName = request.RecipientName.Trim();
        a.Phone = request.Phone.Trim();
        a.City = request.City.Trim();
        a.District = request.District?.Trim() ?? string.Empty;
        a.AddressLine = request.AddressLine.Trim();
        a.PostalCode = request.PostalCode?.Trim() ?? string.Empty;
        a.IsDefault = request.IsDefault;

        await _context.SaveChangesAsync();
        return Ok(ToDto(a));
    }

    /// <summary>Sets an address as the default delivery address.</summary>
    [HttpPut("{id:guid}/set-default")]
    public async Task<ActionResult<BuyerAddressDto>> SetDefault(Guid id)
    {
        var a = await _context.Addresses
            .FirstOrDefaultAsync(a => a.Id == id && a.BuyerUserId == BuyerId);

        if (a is null) return NotFound();

        // Demote all others
        var others = await _context.Addresses
            .Where(x => x.BuyerUserId == BuyerId && x.IsDefault && x.Id != id)
            .ToListAsync();
        foreach (var o in others) o.IsDefault = false;

        a.IsDefault = true;
        await _context.SaveChangesAsync();
        return Ok(ToDto(a));
    }

    /// <summary>Deletes an address. If it was the default, promotes the newest remaining address.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAddress(Guid id)
    {
        var a = await _context.Addresses
            .FirstOrDefaultAsync(a => a.Id == id && a.BuyerUserId == BuyerId);

        if (a is null) return NotFound();

        var wasDefault = a.IsDefault;
        _context.Addresses.Remove(a);
        await _context.SaveChangesAsync();

        if (wasDefault)
        {
            var next = await _context.Addresses
                .Where(x => x.BuyerUserId == BuyerId)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();

            if (next is not null)
            {
                next.IsDefault = true;
                await _context.SaveChangesAsync();
            }
        }

        return NoContent();
    }
}

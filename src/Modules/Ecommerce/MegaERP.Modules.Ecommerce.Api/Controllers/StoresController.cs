using MegaERP.Modules.Ecommerce.Core.DTOs;
using MegaERP.Modules.Ecommerce.Core.Entities;
using MegaERP.Modules.Ecommerce.Infrastructure.Persistence;
using MegaERP.Shared.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Ecommerce.Api.Controllers;

/// <summary>Manages stores belonging to the current tenant.</summary>
[ApiController]
[Route("api/ecommerce/stores")]
[Authorize(Roles = "Admin,Manager")]
public class StoresController : ControllerBase
{
    private readonly EcommerceDbContext _context;
    private readonly ITenantService _tenantService;

    public StoresController(EcommerceDbContext context, ITenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    /// <summary>Returns all stores for the current tenant.</summary>
    [HttpGet]
    public async Task<ActionResult<List<StoreDto>>> GetAll()
    {
        var stores = await _context.Stores
            .OrderBy(s => s.Name)
            .ToListAsync();

        return Ok(stores.Select(s => new StoreDto(s.Id, s.Name, s.Slug, s.LogoUrl, s.IsActive)));
    }

    /// <summary>Returns a store by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<StoreDto>> GetById(Guid id)
    {
        var s = await _context.Stores.FindAsync(id);
        if (s is null) return NotFound();
        return Ok(new StoreDto(s.Id, s.Name, s.Slug, s.LogoUrl, s.IsActive));
    }

    /// <summary>Creates a new store for the current tenant.</summary>
    [HttpPost]
    public async Task<ActionResult<StoreDto>> Create(CreateStoreRequest request)
    {
        var tenantId = _tenantService.GetTenantId() ?? Guid.Empty;

        if (await _context.Stores.AnyAsync(s => s.Slug == request.Slug))
            return Conflict("Bu slug zaten kullanılıyor.");

        var store = new Store
        {
            Name = request.Name,
            Slug = request.Slug,
            LogoUrl = request.LogoUrl,
            IsActive = request.IsActive,
            TenantId = tenantId
        };

        _context.Stores.Add(store);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = store.Id },
            new StoreDto(store.Id, store.Name, store.Slug, store.LogoUrl, store.IsActive));
    }

    /// <summary>Updates an existing store.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateStoreRequest request)
    {
        var store = await _context.Stores.FindAsync(id);
        if (store is null) return NotFound();

        if (await _context.Stores.AnyAsync(s => s.Slug == request.Slug && s.Id != id))
            return Conflict("Bu slug zaten kullanılıyor.");

        store.Name = request.Name;
        store.Slug = request.Slug;
        store.LogoUrl = request.LogoUrl;
        store.IsActive = request.IsActive;
        store.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Deletes a store.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var store = await _context.Stores.FindAsync(id);
        if (store is null) return NotFound();

        _context.Stores.Remove(store);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

using MegaERP.Modules.IAM.Core.Entities;
using MegaERP.Modules.IAM.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.IAM.Api.Controllers;

[ApiController]
[Route("api/iam/tenants")]
[Authorize(Roles = "Admin")]
public class TenantsController : ControllerBase
{
    private readonly IAMDbContext _context;

    public TenantsController(IAMDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Tenant>>> GetTenants()
    {
        return await _context.Tenants.ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Tenant>> CreateTenant(Tenant tenant)
    {
        _context.Tenants.Add(tenant);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetTenants), new { id = tenant.Id }, tenant);
    }
}

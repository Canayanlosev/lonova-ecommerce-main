using MegaERP.Shared.Core.Interfaces;
using Microsoft.AspNetCore.Http;

namespace MegaERP.Shared.Infrastructure.Services;

public class TenantService : ITenantService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TenantService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? GetTenantId()
    {
        var context = _httpContextAccessor.HttpContext;
        if (context == null) return null;

        var tenantIdClaim = context.User.FindFirst("tenantId")?.Value;
        if (string.IsNullOrEmpty(tenantIdClaim)) return null;

        return Guid.TryParse(tenantIdClaim, out var tenantId) ? tenantId : null;
    }

    public string? GetTenantIdentifier()
    {
        var context = _httpContextAccessor.HttpContext;
        if (context == null) return null;

        // Resolution strategy: Header 'X-Tenant'
        if (context.Request.Headers.TryGetValue("X-Tenant", out var tenantId))
        {
            return tenantId;
        }

        // Alternative: Subdomain (logic to be added)
        return null;
    }
}

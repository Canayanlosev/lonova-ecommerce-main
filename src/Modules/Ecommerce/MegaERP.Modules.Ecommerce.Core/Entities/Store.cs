using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Ecommerce.Core.Entities;

public class Store : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; } = true;
}

using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.IAM.Core.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Identifier { get; set; } = string.Empty; // e.g., subdomain or slug
    public bool IsActive { get; set; } = true;
    public string? ConnectionString { get; set; } // If database-per-tenant is used
    public string Plan { get; set; } = "Free"; // e.g., Free, Pro, Enterprise
}

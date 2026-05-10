using Microsoft.AspNetCore.Identity;

namespace MegaERP.Modules.IAM.Core.Entities;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public Guid? TenantId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ApplicationRole : IdentityRole
{
}

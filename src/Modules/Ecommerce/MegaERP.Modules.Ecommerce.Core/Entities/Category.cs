using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Ecommerce.Core.Entities;

public class Category : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ParentCategoryId { get; set; }
    public virtual Category? ParentCategory { get; set; }
}

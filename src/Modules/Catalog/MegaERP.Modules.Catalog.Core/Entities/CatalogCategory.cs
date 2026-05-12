using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Catalog.Core.Entities;

public class CatalogCategory : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public int Level { get; set; }
    public string? IconUrl { get; set; }
    public string? AttributeSchemaJson { get; set; }
    public bool IsActive { get; set; } = true;

    public virtual CatalogCategory? Parent { get; set; }
    public virtual ICollection<CatalogCategory> Children { get; set; } = [];
}

using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Ecommerce.Core.Entities;

public class Product : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? ImageUrl { get; set; }
    public Guid CategoryId { get; set; }
    public virtual Category? Category { get; set; }
    public virtual ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
}

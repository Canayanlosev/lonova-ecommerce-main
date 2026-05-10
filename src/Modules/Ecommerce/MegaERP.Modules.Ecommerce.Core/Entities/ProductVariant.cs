using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Ecommerce.Core.Entities;

public class ProductVariant : BaseTenantEntity
{
    public Guid ProductId { get; set; }
    public virtual Product? Product { get; set; }
    public string Name { get; set; } = string.Empty; // e.g., "Large, Red"
    public string Sku { get; set; } = string.Empty;
    public decimal PriceOverride { get; set; }
    public int StockQuantity { get; set; }
}

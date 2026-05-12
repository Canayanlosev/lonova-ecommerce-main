using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Ecommerce.Core.Entities;

public class ProductVariant : BaseTenantEntity
{
    public Guid ProductId { get; set; }
    public virtual Product? Product { get; set; }
    public string Name { get; set; } = string.Empty;
    public string VariantType { get; set; } = "Variant"; // Beden, Renk, Depolama, Numara, etc.
    public string? ColorHex { get; set; } // only when VariantType == "Renk"
    public string Sku { get; set; } = string.Empty;
    public decimal PriceOverride { get; set; }
    public int StockQuantity { get; set; }
}

using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Marketplace.Core.Entities;

public class BuyerCartItem : BaseEntity
{
    public Guid BuyerUserId { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? VariantName { get; set; }
    public string? ImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; } = 1;
}

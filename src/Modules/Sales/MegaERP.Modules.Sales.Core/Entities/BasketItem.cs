using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Sales.Core.Entities;

public class BasketItem : BaseTenantEntity
{
    public string UserId { get; set; } = string.Empty;
    public Guid ProductId { get; set; }
    public Guid? ProductVariantId { get; set; }
    public int Quantity { get; set; }
}

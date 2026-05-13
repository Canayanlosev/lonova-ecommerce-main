using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Marketplace.Core.Entities;

public class ProductReview : BaseEntity
{
    public Guid ProductId { get; set; }
    public Guid BuyerUserId { get; set; }
    public string BuyerName { get; set; } = string.Empty;
    public int Rating { get; set; } // 1-5
    public string? Comment { get; set; }
}

using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Marketplace.Core.Entities;

public class BuyerAddress : BaseEntity
{
    public Guid BuyerUserId { get; set; }
    public string Title { get; set; } = string.Empty;          // "Ev", "İş", vs.
    public string RecipientName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;
}

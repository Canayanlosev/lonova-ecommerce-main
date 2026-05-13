using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Marketplace.Core.Entities;

public class BuyerOrder : BaseEntity
{
    public Guid BuyerUserId { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Pending";

    // Shipping address
    public string RecipientName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string PostalCode { get; set; } = string.Empty;

    // Payment
    public string PaymentMethod { get; set; } = "Card"; // Card | BankTransfer | CashOnDelivery
    public string PaymentStatus { get; set; } = "Pending"; // Pending | Paid | Failed | Refunded
    public int InstallmentCount { get; set; } = 1;
    public decimal InstallmentAmount { get; set; }
    public string? CardLastFour { get; set; }
    public string? CardBrand { get; set; } // Visa | Mastercard | Troy | Amex

    public virtual ICollection<BuyerOrderItem> Items { get; set; } = new List<BuyerOrderItem>();
}

public class BuyerOrderItem : BaseEntity
{
    public Guid BuyerOrderId { get; set; }
    public virtual BuyerOrder? Order { get; set; }
    public Guid ProductId { get; set; }
    public Guid? VariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? VariantName { get; set; }
    public string? ImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}

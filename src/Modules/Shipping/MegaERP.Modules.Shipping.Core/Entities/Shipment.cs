using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Shipping.Core.Entities;

public class ShippingMethod : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty; // e.g., "Standard Shipping", "Express"
    public string Carrier { get; set; } = string.Empty; // e.g., "Yurtiçi Kargo", "DHL"
    public decimal BaseCost { get; set; }
}

public class Shipment : BaseTenantEntity
{
    public Guid OrderId { get; set; }
    public string TrackingNumber { get; set; } = string.Empty;
    public DateTime ShippedDate { get; set; } = DateTime.UtcNow;
    public DateTime? EstimatedDeliveryDate { get; set; }
    public Guid ShippingMethodId { get; set; }
    public virtual ShippingMethod? ShippingMethod { get; set; }
    public string Status { get; set; } = "Shipped"; // Shipped, InTransit, Delivered, Returned
}

namespace MegaERP.Modules.Shipping.Core.DTOs;

public record ShippingMethodDto(Guid Id, string Name, string Carrier, decimal BaseCost);
public record CreateShippingMethodRequest(string Name, string Carrier, decimal BaseCost);

public record ShipmentDto(
    Guid Id,
    Guid OrderId,
    string TrackingNumber,
    DateTime ShippedDate,
    DateTime? EstimatedDeliveryDate,
    string Status,
    Guid? ShippingMethodId,
    string? ShippingMethodName);

public record UpdateShipmentStatusRequest(string Status);

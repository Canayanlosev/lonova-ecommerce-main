using MediatR;

namespace MegaERP.Shared.Events;

public record OrderPlacedEvent(
    Guid OrderId, 
    Guid TenantId, 
    string UserId, 
    decimal TotalAmount,
    List<OrderItemData> Items) : INotification;

public record OrderItemData(Guid ProductId, int Quantity, decimal UnitPrice, string ProductName);

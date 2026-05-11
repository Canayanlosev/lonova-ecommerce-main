using MegaERP.Modules.Shipping.Core.Entities;
using MegaERP.Modules.Shipping.Infrastructure.Persistence;
using MegaERP.Shared.Events;
using MediatR;

namespace MegaERP.Modules.Shipping.Infrastructure.Events;

public class CreateShipmentOnOrderPlacedHandler : INotificationHandler<OrderPlacedEvent>
{
    private readonly ShippingDbContext _context;

    public CreateShipmentOnOrderPlacedHandler(ShippingDbContext context)
    {
        _context = context;
    }

    public async Task Handle(OrderPlacedEvent notification, CancellationToken cancellationToken)
    {
        var trackingNumber = $"TRK-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}";

        var shipment = new Shipment
        {
            OrderId = notification.OrderId,
            TrackingNumber = trackingNumber,
            ShippedDate = DateTime.UtcNow,
            EstimatedDeliveryDate = DateTime.UtcNow.AddDays(3),
            Status = "Pending",
            TenantId = notification.TenantId
        };

        _context.Shipments.Add(shipment);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

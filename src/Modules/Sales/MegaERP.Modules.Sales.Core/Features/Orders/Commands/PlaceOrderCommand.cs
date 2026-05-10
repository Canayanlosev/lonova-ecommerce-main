using MegaERP.Modules.Sales.Core.Entities;
using MegaERP.Modules.Sales.Infrastructure.Persistence;
using MegaERP.Shared.Core.Interfaces;
using MegaERP.Shared.Events;
using MediatR;

namespace MegaERP.Modules.Sales.Core.Features.Orders.Commands;

public record PlaceOrderCommand(
    string UserId, 
    List<OrderItemData> Items) : IRequest<Guid>;

public class PlaceOrderCommandHandler : IRequestHandler<PlaceOrderCommand, Guid>
{
    private readonly SalesDbContext _context;
    private readonly IMediator _mediator;
    private readonly ITenantService _tenantService;

    public PlaceOrderCommandHandler(SalesDbContext context, IMediator mediator, ITenantService tenantService)
    {
        _context = context;
        _mediator = mediator;
        _tenantService = tenantService;
    }

    public async Task<Guid> Handle(PlaceOrderCommand request, CancellationToken cancellationToken)
    {
        var order = new Order
        {
            UserId = request.UserId,
            TotalAmount = request.Items.Sum(x => x.Quantity * x.UnitPrice),
            Status = "Placed",
            Items = request.Items.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice
            }).ToList()
        };

        _context.Orders.Add(order);
        await _context.SaveChangesAsync(cancellationToken);

        // Publish event for other modules
        await _mediator.Publish(new OrderPlacedEvent(
            order.Id, 
            _tenantService.GetTenantId()!.Value, 
            request.UserId, 
            order.TotalAmount,
            request.Items), cancellationToken);

        return order.Id;
    }
}

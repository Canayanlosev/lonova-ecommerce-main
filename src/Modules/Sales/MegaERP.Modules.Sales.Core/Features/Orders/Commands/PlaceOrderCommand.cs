using MegaERP.Shared.Events;
using MediatR;

namespace MegaERP.Modules.Sales.Core.Features.Orders.Commands;

public record PlaceOrderCommand(
    string UserId,
    List<OrderItemData> Items) : IRequest<Guid>;

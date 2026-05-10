using MegaERP.Modules.Sales.Core.Features.Orders.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MegaERP.Modules.Sales.Api.Controllers;

[ApiController]
[Route("api/sales/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> PlaceOrder(PlaceOrderCommand command)
    {
        // For production, we would get UserId from claims
        var orderId = await _mediator.Send(command);
        return Ok(orderId);
    }
}

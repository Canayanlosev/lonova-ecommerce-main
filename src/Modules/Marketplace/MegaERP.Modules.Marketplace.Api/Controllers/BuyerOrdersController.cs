using System.Security.Claims;
using MegaERP.Modules.Marketplace.Core.DTOs;
using MegaERP.Modules.Marketplace.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Marketplace.Api.Controllers;

/// <summary>Returns order history for the authenticated buyer.</summary>
[ApiController]
[Route("api/marketplace/orders")]
[Authorize]
public class BuyerOrdersController : ControllerBase
{
    private readonly MarketplaceDbContext _context;

    public BuyerOrdersController(MarketplaceDbContext context) => _context = context;

    private Guid BuyerId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub")
        ?? throw new UnauthorizedAccessException());

    /// <summary>Returns all orders for the authenticated buyer, newest first.</summary>
    [HttpGet]
    public async Task<ActionResult<List<BuyerOrderDto>>> GetOrders()
    {
        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.BuyerUserId == BuyerId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return Ok(orders.Select(CheckoutController.ToOrderDto));
    }

    /// <summary>Returns a single order by ID (must belong to authenticated buyer).</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BuyerOrderDto>> GetOrder(Guid id)
    {
        var o = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id && o.BuyerUserId == BuyerId);

        if (o is null) return NotFound();

        return Ok(CheckoutController.ToOrderDto(o));
    }
}

using MegaERP.Modules.Billing.Core.DTOs;
using MegaERP.Modules.Billing.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Billing.Api.Controllers;

[ApiController]
[Route("api/billing/invoices")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly BillingDbContext _context;

    public InvoicesController(BillingDbContext context)
    {
        _context = context;
    }

    private static InvoiceDto ToDto(Core.Entities.Invoice i) => new(
        i.Id, i.InvoiceNumber, i.OrderId, i.InvoiceDate, i.DueDate,
        i.TotalAmount, i.TotalTax, i.Status,
        i.Items.Select(item => new InvoiceItemDto(
            item.Id, item.Description, item.Quantity, item.UnitPrice,
            item.TaxRate, item.Quantity * item.UnitPrice)).ToList());

    [HttpGet]
    public async Task<ActionResult<IEnumerable<InvoiceDto>>> GetAll()
    {
        var invoices = await _context.Invoices
            .Include(i => i.Items)
            .OrderByDescending(i => i.InvoiceDate)
            .ToListAsync();
        return Ok(invoices.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<InvoiceDto>> GetById(Guid id)
    {
        var invoice = await _context.Invoices.Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) throw new KeyNotFoundException($"Fatura bulunamadı: {id}");
        return Ok(ToDto(invoice));
    }

    [HttpGet("order/{orderId:guid}")]
    public async Task<ActionResult<InvoiceDto>> GetByOrderId(Guid orderId)
    {
        var invoice = await _context.Invoices.Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.OrderId == orderId);
        if (invoice is null) throw new KeyNotFoundException($"Bu siparişe ait fatura bulunamadı: {orderId}");
        return Ok(ToDto(invoice));
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateInvoiceStatusRequest request)
    {
        var allowed = new[] { "Draft", "Issued", "Paid", "Cancelled" };
        if (!allowed.Contains(request.Status))
            throw new ArgumentException($"Geçersiz durum. İzin verilenler: {string.Join(", ", allowed)}");

        var invoice = await _context.Invoices.FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) throw new KeyNotFoundException($"Fatura bulunamadı: {id}");

        invoice.Status = request.Status;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

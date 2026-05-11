using MegaERP.Modules.Billing.Core.Entities;
using MegaERP.Modules.Billing.Infrastructure.Persistence;
using MegaERP.Shared.Events;
using MediatR;

namespace MegaERP.Modules.Billing.Infrastructure.Events;

public class CreateInvoiceOnOrderPlacedHandler : INotificationHandler<OrderPlacedEvent>
{
    private readonly BillingDbContext _context;

    public CreateInvoiceOnOrderPlacedHandler(BillingDbContext context)
    {
        _context = context;
    }

    public async Task Handle(OrderPlacedEvent notification, CancellationToken cancellationToken)
    {
        var invoice = new Invoice
        {
            OrderId = notification.OrderId,
            InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{notification.OrderId.ToString()[..4].ToUpper()}",
            InvoiceDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(7),
            TotalAmount = notification.TotalAmount,
            Status = "Issued",
            Items = notification.Items.Select(i => new InvoiceItem
            {
                Description = i.ProductName,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                TaxRate = 18
            }).ToList()
        };

        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

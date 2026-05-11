using MegaERP.Modules.Accounting.Core.Entities;
using MegaERP.Modules.Accounting.Infrastructure.Persistence;
using MegaERP.Shared.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Accounting.Infrastructure.Events;

public class AccountingEntryOnOrderPlacedHandler : INotificationHandler<OrderPlacedEvent>
{
    private readonly AccountingDbContext _context;

    public AccountingEntryOnOrderPlacedHandler(AccountingDbContext context)
    {
        _context = context;
    }

    public async Task Handle(OrderPlacedEvent notification, CancellationToken cancellationToken)
    {
        var salesAccount = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Code == "600.01", cancellationToken);

        if (salesAccount == null)
        {
            salesAccount = new AccountingAccount
            {
                Code = "600.01",
                Name = "Yurtiçi Satışlar",
                Type = "Revenue"
            };
            _context.Accounts.Add(salesAccount);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var entry = new JournalEntry
        {
            Date = DateTime.UtcNow,
            Description = $"Order #{notification.OrderId} Sales Record",
            Credit = notification.TotalAmount,
            Debit = 0,
            AccountingAccountId = salesAccount.Id
        };

        _context.JournalEntries.Add(entry);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

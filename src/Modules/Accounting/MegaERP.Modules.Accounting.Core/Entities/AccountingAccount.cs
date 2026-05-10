using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Accounting.Core.Entities;

public class AccountingAccount : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty; // e.g., "Müşteri A", "Bank Of America"
    public string Code { get; set; } = string.Empty; // e.g., "120.01.001"
    public string Type { get; set; } = "Current"; // Current (Cari), Bank, Cash, etc.
    public decimal Balance { get; set; }
}

public class JournalEntry : BaseTenantEntity
{
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = string.Empty;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public Guid AccountingAccountId { get; set; }
    public virtual AccountingAccount? AccountingAccount { get; set; }
}

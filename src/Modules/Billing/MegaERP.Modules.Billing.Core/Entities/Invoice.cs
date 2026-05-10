using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.Billing.Core.Entities;

public class Invoice : BaseTenantEntity
{
    public string InvoiceNumber { get; set; } = string.Empty; // e.g., INV-2026-0001
    public Guid OrderId { get; set; }
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; }
    public decimal TotalTax { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Draft"; // Draft, Issued, Paid, Cancelled
    public virtual ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
}

public class InvoiceItem : BaseTenantEntity
{
    public Guid InvoiceId { get; set; }
    public virtual Invoice? Invoice { get; set; }
    public string Description { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TaxRate { get; set; }
}

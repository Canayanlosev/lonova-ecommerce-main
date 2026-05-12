using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.WMS.Core.Entities;

public class Warehouse : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
    public virtual ICollection<Zone> Zones { get; set; } = [];
}

public class Zone : BaseTenantEntity
{
    public Guid WarehouseId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public virtual Warehouse? Warehouse { get; set; }
    public virtual ICollection<Aisle> Aisles { get; set; } = [];
}

public class Aisle : BaseTenantEntity
{
    public Guid ZoneId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public virtual Zone? Zone { get; set; }
    public virtual ICollection<Rack> Racks { get; set; } = [];
}

public class Rack : BaseTenantEntity
{
    public Guid AisleId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public virtual Aisle? Aisle { get; set; }
    public virtual ICollection<Bin> Bins { get; set; } = [];
}

public class Bin : BaseTenantEntity
{
    public Guid RackId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public virtual Rack? Rack { get; set; }
    public virtual ICollection<StockLocation> StockLocations { get; set; } = [];
}

public class StockLocation : BaseEntity
{
    public Guid BinId { get; set; }
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public int MinStockLevel { get; set; }
    public virtual Bin? Bin { get; set; }
}

public enum StockMovementType { In, Out, Transfer, Loss }

public class StockMovement : BaseTenantEntity
{
    public StockMovementType MovementType { get; set; }
    public Guid ProductId { get; set; }
    public Guid? FromBinId { get; set; }
    public Guid? ToBinId { get; set; }
    public int Quantity { get; set; }
    public string? Note { get; set; }
    public DateTime MovedAt { get; set; } = DateTime.UtcNow;
}

public class Supplier : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? Address { get; set; }
    public bool IsActive { get; set; } = true;
    public virtual ICollection<PurchaseOrder> PurchaseOrders { get; set; } = [];
}

public enum PurchaseOrderStatus { Draft, Sent, PartialReceived, Received, Cancelled }

public class PurchaseOrder : BaseTenantEntity
{
    public Guid SupplierId { get; set; }
    public PurchaseOrderStatus Status { get; set; } = PurchaseOrderStatus.Draft;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public DateTime? ExpectedDate { get; set; }
    public string? Notes { get; set; }
    public virtual Supplier? Supplier { get; set; }
    public virtual ICollection<PurchaseOrderItem> Items { get; set; } = [];
}

public class PurchaseOrderItem : BaseEntity
{
    public Guid PurchaseOrderId { get; set; }
    public Guid ProductId { get; set; }
    public int OrderedQuantity { get; set; }
    public int ReceivedQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public virtual PurchaseOrder? PurchaseOrder { get; set; }
}

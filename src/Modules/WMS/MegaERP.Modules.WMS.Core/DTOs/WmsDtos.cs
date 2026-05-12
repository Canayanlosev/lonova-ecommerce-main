namespace MegaERP.Modules.WMS.Core.DTOs;

public record WarehouseDto(Guid Id, string Name, string? Address, bool IsActive);
public record CreateWarehouseRequest(string Name, string? Address);

public record ZoneDto(Guid Id, Guid WarehouseId, string Name, string? Code);
public record CreateZoneRequest(Guid WarehouseId, string Name, string? Code);

public record BinDto(Guid Id, string Name, string? Code, Guid RackId);
public record CreateBinRequest(Guid RackId, string Name, string? Code);

public record StockLocationDto(Guid ProductId, Guid BinId, int Quantity, int MinStockLevel, bool IsLowStock);

public record StockMovementRequest(
    string MovementType,
    Guid ProductId,
    Guid? FromBinId,
    Guid? ToBinId,
    int Quantity,
    string? Note
);

public record SupplierDto(Guid Id, string Name, string? ContactEmail, string? ContactPhone, string? Address, bool IsActive);
public record CreateSupplierRequest(string Name, string? ContactEmail, string? ContactPhone, string? Address);

public record PurchaseOrderDto(
    Guid Id,
    Guid SupplierId,
    string? SupplierName,
    string Status,
    DateTime OrderDate,
    DateTime? ExpectedDate,
    string? Notes,
    List<PurchaseOrderItemDto> Items
);

public record PurchaseOrderItemDto(Guid ProductId, int OrderedQuantity, int ReceivedQuantity, decimal UnitPrice);

public record CreatePurchaseOrderRequest(
    Guid SupplierId,
    DateTime? ExpectedDate,
    string? Notes,
    List<CreatePurchaseOrderItemRequest> Items
);

public record CreatePurchaseOrderItemRequest(Guid ProductId, int Quantity, decimal UnitPrice);

public record ReceivePurchaseOrderRequest(Guid? ToBinId);

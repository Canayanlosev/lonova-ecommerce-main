namespace MegaERP.Modules.Sales.Core.DTOs;

public record BasketItemDto(
    Guid Id,
    Guid ProductId,
    Guid? ProductVariantId,
    string ProductName,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal);

public record AddToBasketRequest(
    Guid ProductId,
    Guid? ProductVariantId,
    string ProductName,
    decimal UnitPrice,
    int Quantity);

public record UpdateBasketItemRequest(int Quantity);

public record OrderDto(
    Guid Id,
    DateTime OrderDate,
    string Status,
    decimal TotalAmount,
    List<OrderItemDto> Items);

public record OrderItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal LineTotal);

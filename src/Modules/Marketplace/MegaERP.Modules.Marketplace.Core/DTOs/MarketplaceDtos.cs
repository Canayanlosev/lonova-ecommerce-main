namespace MegaERP.Modules.Marketplace.Core.DTOs;

public record BuyerRegisterRequest(string FirstName, string LastName, string Email, string Password);
public record BuyerLoginRequest(string Email, string Password);
public record BuyerAuthResponse(string Token, string UserId, string Email, string FirstName, string LastName);

public record AddToCartRequest(Guid ProductId, Guid? VariantId, int Quantity = 1);
public record CartItemDto(Guid Id, Guid ProductId, Guid? VariantId, string ProductName, string? VariantName, string? ImageUrl, decimal UnitPrice, int Quantity, decimal LineTotal);
public record CartDto(List<CartItemDto> Items, decimal Total, int ItemCount);

public record BuyerOrderItemDto(Guid ProductId, Guid? VariantId, string ProductName, string? VariantName, string? ImageUrl, decimal UnitPrice, int Quantity);
public record BuyerOrderDto(Guid Id, decimal TotalAmount, string Status, DateTime CreatedAt, List<BuyerOrderItemDto> Items);

public record MarketplaceProductDto(
    Guid Id,
    string Name,
    string? Description,
    string Sku,
    string? Slug,
    string? ImageUrl,
    decimal BasePrice,
    Guid CategoryId,
    string? CategoryName,
    List<MarketplaceVariantDto> Variants
);

public record MarketplaceVariantDto(
    Guid Id,
    string Name,
    string VariantType,
    string? ColorHex,
    string Sku,
    decimal Price,
    int StockQuantity
);

public record MarketplaceProductListResponse(
    List<MarketplaceProductDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);

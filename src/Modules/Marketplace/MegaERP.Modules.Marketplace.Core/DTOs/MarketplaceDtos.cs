namespace MegaERP.Modules.Marketplace.Core.DTOs;

public record MarketplaceProductDto(
    Guid Id,
    string Name,
    string? Description,
    string Sku,
    decimal BasePrice,
    Guid CategoryId,
    string? CategoryName,
    List<MarketplaceVariantDto> Variants
);

public record MarketplaceVariantDto(
    Guid Id,
    string Name,
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

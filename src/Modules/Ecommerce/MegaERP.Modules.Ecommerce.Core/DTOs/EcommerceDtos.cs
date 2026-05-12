namespace MegaERP.Modules.Ecommerce.Core.DTOs;

public record StoreDto(Guid Id, string Name, string Slug, string? LogoUrl, bool IsActive);
public record CreateStoreRequest(string Name, string Slug, string? LogoUrl, bool IsActive = true);
public record UpdateStoreRequest(string Name, string Slug, string? LogoUrl, bool IsActive);

public record CategoryDto(Guid Id, string Name, string? Description, Guid? ParentCategoryId);

public record CreateCategoryRequest(string Name, string? Description, Guid? ParentCategoryId);

public record ProductDto(
    Guid Id, 
    string Name, 
    string? Description, 
    decimal BasePrice, 
    string Sku, 
    Guid CategoryId,
    List<ProductVariantDto> Variants);

public record ProductVariantDto(Guid Id, string Name, string Sku, decimal PriceOverride, int StockQuantity);

public record CreateProductRequest(
    string Name, 
    string? Description, 
    decimal BasePrice, 
    string Sku, 
    Guid CategoryId);

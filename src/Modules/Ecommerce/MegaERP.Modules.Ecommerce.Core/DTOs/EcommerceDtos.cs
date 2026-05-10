namespace MegaERP.Modules.Ecommerce.Core.DTOs;

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

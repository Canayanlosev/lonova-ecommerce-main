namespace MegaERP.Modules.Catalog.Core.DTOs;

public record CatalogCategoryDto(
    Guid Id,
    string Name,
    string Slug,
    Guid? ParentId,
    int Level,
    string? IconUrl,
    string? AttributeSchemaJson,
    bool IsActive,
    List<CatalogCategoryDto> Children
);

public record CreateCatalogCategoryRequest(
    string Name,
    string Slug,
    Guid? ParentId,
    string? IconUrl,
    string? AttributeSchemaJson
);

public record UpdateCatalogCategoryRequest(
    string Name,
    string Slug,
    Guid? ParentId,
    string? IconUrl,
    string? AttributeSchemaJson,
    bool IsActive
);

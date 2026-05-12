namespace MegaERP.Modules.SiteBuilder.Core.DTOs;

public record SitePageDto(Guid Id, Guid StoreId, string Slug, string Title, bool IsPublished, List<PageBlockDto> Blocks);
public record PageBlockDto(Guid Id, string BlockType, int Order, string ContentJson);

public record CreateSitePageRequest(Guid StoreId, string Slug, string Title);
public record UpdateSitePageRequest(string Slug, string Title, bool IsPublished);

public record CreatePageBlockRequest(string BlockType, int Order, string ContentJson);
public record UpdatePageBlockRequest(int Order, string ContentJson);

using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.SiteBuilder.Core.Entities;

public enum BlockType { Hero, ProductGrid, About, FAQ, Contact, Custom }

public class SitePage : BaseTenantEntity
{
    public Guid StoreId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public bool IsPublished { get; set; }
    public virtual ICollection<PageBlock> Blocks { get; set; } = [];
}

public class PageBlock : BaseEntity
{
    public Guid PageId { get; set; }
    public BlockType BlockType { get; set; }
    public int Order { get; set; }
    public string ContentJson { get; set; } = "{}";
    public virtual SitePage? Page { get; set; }
}

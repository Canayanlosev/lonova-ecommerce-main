using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.CMS.Core.Entities;

public class DynamicContentType : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty; // e.g., "Blog Post"
    public string Slug { get; set; } = string.Empty; // e.g., "blog-posts"
    public string SchemaDefinition { get; set; } = "{}"; // JSON describing the fields
}

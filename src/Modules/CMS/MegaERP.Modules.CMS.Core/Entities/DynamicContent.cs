using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.CMS.Core.Entities;

public class DynamicContent : BaseTenantEntity
{
    public Guid ContentTypeId { get; set; }
    public virtual DynamicContentType? ContentType { get; set; }
    public string Data { get; set; } = "{}"; // The actual content stored as JSON
}

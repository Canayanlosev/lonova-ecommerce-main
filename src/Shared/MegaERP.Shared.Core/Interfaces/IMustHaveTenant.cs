namespace MegaERP.Shared.Core.Interfaces;

public interface IMustHaveTenant
{
    Guid TenantId { get; set; }
}

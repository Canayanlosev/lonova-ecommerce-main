namespace MegaERP.Shared.Core.Interfaces;

public interface ITenantService
{
    Guid? GetTenantId();
    string? GetTenantIdentifier();
}

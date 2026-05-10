using MegaERP.Shared.Core.Interfaces;
using MegaERP.Shared.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;

namespace MegaERP.Shared.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddSharedInfrastructure(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<ITenantService, TenantService>();
        
        return services;
    }
}

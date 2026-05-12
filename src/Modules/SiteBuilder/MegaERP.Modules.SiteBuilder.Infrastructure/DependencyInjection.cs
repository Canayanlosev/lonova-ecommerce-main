using MegaERP.Modules.SiteBuilder.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MegaERP.Modules.SiteBuilder.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddSiteBuilderInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<SiteBuilderDbContext>(options =>
            options.UseNpgsql(connectionString,
                m => m.MigrationsAssembly(typeof(SiteBuilderDbContext).Assembly.FullName)));

        return services;
    }
}

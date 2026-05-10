using MegaERP.Modules.CMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MegaERP.Modules.CMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddCMSInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<CMSDbContext>(options =>
            options.UseNpgsql(connectionString,
                m => m.MigrationsAssembly(typeof(CMSDbContext).Assembly.FullName)));

        return services;
    }
}

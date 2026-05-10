using MegaERP.Modules.Ecommerce.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MegaERP.Modules.Ecommerce.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddEcommerceInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<EcommerceDbContext>(options =>
            options.UseNpgsql(connectionString,
                m => m.MigrationsAssembly(typeof(EcommerceDbContext).Assembly.FullName)));

        return services;
    }
}

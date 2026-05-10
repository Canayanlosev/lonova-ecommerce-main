using MegaERP.Modules.IAM.Core.Entities;
using MegaERP.Modules.IAM.Core.Interfaces;
using MegaERP.Modules.IAM.Infrastructure.Authentication;
using MegaERP.Modules.IAM.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MegaERP.Modules.IAM.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddIAMInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<IAMDbContext>(options =>
            options.UseNpgsql(connectionString,
                m => m.MigrationsAssembly(typeof(IAMDbContext).Assembly.FullName)));

        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<IAMDbContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<IJwtProvider, JwtProvider>();

        return services;
    }
}

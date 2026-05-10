using MegaERP.Modules.IAM.Core.Entities;
using MegaERP.Shared.Core.Interfaces;
using MegaERP.Shared.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.IAM.Infrastructure.Persistence;

public class IAMDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, string>
{
    private readonly ITenantService _tenantService;

    public IAMDbContext(DbContextOptions<IAMDbContext> options, ITenantService tenantService) 
        : base(options)
    {
        _tenantService = tenantService;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.HasDefaultSchema("iam");
        
        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.ToTable("Tenants");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Identifier).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Identifier).IsUnique();
        });

        // Identity table names customization if needed
        modelBuilder.Entity<ApplicationUser>(entity => { entity.ToTable("Users"); });
        modelBuilder.Entity<ApplicationRole>(entity => { entity.ToTable("Roles"); });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Add logic for CreatedAt/UpdatedAt if needed for identity users too,
        // or just rely on the base logic from Shared if we can unify.
        return base.SaveChangesAsync(cancellationToken);
    }
}

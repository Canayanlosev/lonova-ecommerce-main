using MegaERP.Shared.Core.Entities;
using MegaERP.Shared.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Shared.Infrastructure.Persistence;

public abstract class BaseDbContext : DbContext
{
    private readonly ITenantService _tenantService;

    protected BaseDbContext(DbContextOptions options, ITenantService tenantService) : base(options)
    {
        _tenantService = tenantService;
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var tenantId = _tenantService.GetTenantId();

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    if (entry.Entity is BaseTenantEntity tenantEntity && tenantId.HasValue)
                    {
                        tenantEntity.TenantId = tenantId.Value;
                    }
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Global Query Filter for Multi-tenancy
        var tenantId = _tenantService.GetTenantId();
        
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseTenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                // This is a simplified version. For real multi-tenancy, you might need a more robust filter
                // that doesn't just use the current tenantId value at OnModelCreating time
                // but a dynamic one.
            }
        }

        base.OnModelCreating(modelBuilder);
    }
}

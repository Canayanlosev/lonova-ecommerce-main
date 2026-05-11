using System.Reflection;
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

    protected Guid? CurrentTenantId => _tenantService.GetTenantId();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseTenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(BaseDbContext)
                    .GetMethod(nameof(ApplyTenantQueryFilter), BindingFlags.NonPublic | BindingFlags.Instance)!
                    .MakeGenericMethod(entityType.ClrType);
                method.Invoke(this, [modelBuilder]);
            }
        }

        base.OnModelCreating(modelBuilder);
    }

    private void ApplyTenantQueryFilter<T>(ModelBuilder modelBuilder) where T : BaseTenantEntity
    {
        // CurrentTenantId is evaluated at query time (not model build time) because
        // it's a property on the DbContext instance, which is Scoped per request.
        modelBuilder.Entity<T>().HasQueryFilter(e => CurrentTenantId == null || e.TenantId == CurrentTenantId);
    }
}

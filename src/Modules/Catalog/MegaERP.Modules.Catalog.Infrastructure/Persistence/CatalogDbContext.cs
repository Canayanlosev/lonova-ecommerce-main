using MegaERP.Modules.Catalog.Core.Entities;
using MegaERP.Shared.Core.Interfaces;
using MegaERP.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Catalog.Infrastructure.Persistence;

public class CatalogDbContext : BaseDbContext
{
    public CatalogDbContext(DbContextOptions<CatalogDbContext> options, ITenantService tenantService)
        : base(options, tenantService)
    {
    }

    public DbSet<CatalogCategory> Categories => Set<CatalogCategory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("catalog");

        modelBuilder.Entity<CatalogCategory>(entity =>
        {
            entity.ToTable("Categories");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Slug);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(250).IsRequired();
            entity.HasOne(e => e.Parent)
                .WithMany(e => e.Children)
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        base.OnModelCreating(modelBuilder);
    }
}

using MegaERP.Modules.SiteBuilder.Core.Entities;
using MegaERP.Shared.Core.Interfaces;
using MegaERP.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.SiteBuilder.Infrastructure.Persistence;

public class SiteBuilderDbContext : BaseDbContext
{
    public SiteBuilderDbContext(DbContextOptions<SiteBuilderDbContext> options, ITenantService tenantService)
        : base(options, tenantService)
    {
    }

    public DbSet<SitePage> Pages => Set<SitePage>();
    public DbSet<PageBlock> Blocks => Set<PageBlock>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("sitebuilder");

        modelBuilder.Entity<SitePage>(e =>
        {
            e.ToTable("Pages");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.StoreId, x.Slug }).IsUnique();
            e.Property(x => x.Slug).HasMaxLength(300).IsRequired();
            e.Property(x => x.Title).HasMaxLength(500).IsRequired();
        });

        modelBuilder.Entity<PageBlock>(e =>
        {
            e.ToTable("Blocks");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Page).WithMany(p => p.Blocks).HasForeignKey(x => x.PageId).OnDelete(DeleteBehavior.Cascade);
        });

        base.OnModelCreating(modelBuilder);
    }
}

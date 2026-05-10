using MegaERP.Modules.CMS.Core.Entities;
using MegaERP.Shared.Core.Interfaces;
using MegaERP.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.CMS.Infrastructure.Persistence;

public class CMSDbContext : BaseDbContext
{
    public CMSDbContext(DbContextOptions<CMSDbContext> options, ITenantService tenantService) 
        : base(options, tenantService)
    {
    }

    public DbSet<DynamicContentType> ContentTypes => Set<DynamicContentType>();
    public DbSet<DynamicContent> Contents => Set<DynamicContent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("cms");

        modelBuilder.Entity<DynamicContentType>(entity =>
        {
            entity.ToTable("ContentTypes");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.TenantId, e.Slug }).IsUnique();
        });

        modelBuilder.Entity<DynamicContent>(entity =>
        {
            entity.ToTable("Contents");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ContentType)
                .WithMany()
                .HasForeignKey(e => e.ContentTypeId);
            
            // PostgreSQL JSONB support mapping for Data column
            entity.Property(e => e.Data).HasColumnType("jsonb");
        });

        base.OnModelCreating(modelBuilder);
    }
}

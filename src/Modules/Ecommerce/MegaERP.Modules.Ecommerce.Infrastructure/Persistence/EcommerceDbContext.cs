using MegaERP.Modules.Ecommerce.Core.Entities;
using MegaERP.Shared.Core.Interfaces;
using MegaERP.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Ecommerce.Infrastructure.Persistence;

public class EcommerceDbContext : BaseDbContext
{
    public EcommerceDbContext(DbContextOptions<EcommerceDbContext> options, ITenantService tenantService) 
        : base(options, tenantService)
    {
    }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("ecommerce");

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("Categories");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ParentCategory)
                .WithMany()
                .HasForeignKey(e => e.ParentCategoryId);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("Products");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Category)
                .WithMany()
                .HasForeignKey(e => e.CategoryId);
        });

        modelBuilder.Entity<ProductVariant>(entity =>
        {
            entity.ToTable("ProductVariants");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Product)
                .WithMany(p => p.Variants)
                .HasForeignKey(e => e.ProductId);
        });

        base.OnModelCreating(modelBuilder);
    }
}

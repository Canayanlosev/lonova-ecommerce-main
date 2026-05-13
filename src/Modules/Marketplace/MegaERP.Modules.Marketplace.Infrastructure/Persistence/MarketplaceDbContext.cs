using MegaERP.Modules.Marketplace.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Marketplace.Infrastructure.Persistence;

public class MarketplaceDbContext : DbContext
{
    public MarketplaceDbContext(DbContextOptions<MarketplaceDbContext> options) : base(options) { }

    public DbSet<BuyerUser> BuyerUsers => Set<BuyerUser>();
    public DbSet<BuyerCartItem> CartItems => Set<BuyerCartItem>();
    public DbSet<BuyerOrder> Orders => Set<BuyerOrder>();
    public DbSet<BuyerOrderItem> OrderItems => Set<BuyerOrderItem>();
    public DbSet<ProductReview> ProductReviews => Set<ProductReview>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("marketplace");

        modelBuilder.Entity<BuyerUser>(e =>
        {
            e.ToTable("BuyerUsers");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).IsRequired().HasMaxLength(256);
            e.Property(x => x.FirstName).IsRequired().HasMaxLength(100);
            e.Property(x => x.LastName).HasMaxLength(100);
            e.Property(x => x.PasswordHash).IsRequired();
        });

        modelBuilder.Entity<BuyerCartItem>(e =>
        {
            e.ToTable("CartItems");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.BuyerUserId, x.ProductId, x.VariantId }).IsUnique();
        });

        modelBuilder.Entity<BuyerOrder>(e =>
        {
            e.ToTable("Orders");
            e.HasKey(x => x.Id);
            e.HasMany(x => x.Items)
                .WithOne(x => x.Order)
                .HasForeignKey(x => x.BuyerOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BuyerOrderItem>(e =>
        {
            e.ToTable("OrderItems");
            e.HasKey(x => x.Id);
        });

        modelBuilder.Entity<ProductReview>(e =>
        {
            e.ToTable("ProductReviews");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.ProductId, x.BuyerUserId }).IsUnique();
            e.Property(x => x.Comment).HasMaxLength(1000);
            e.Property(x => x.BuyerName).HasMaxLength(200);
        });
    }
}

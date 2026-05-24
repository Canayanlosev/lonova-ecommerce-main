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
    public DbSet<BuyerAddress> Addresses => Set<BuyerAddress>();
    public DbSet<CouponCode> CouponCodes => Set<CouponCode>();

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

        modelBuilder.Entity<BuyerAddress>(e =>
        {
            e.ToTable("BuyerAddresses");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.BuyerUserId);
            e.Property(x => x.Title).IsRequired().HasMaxLength(100);
            e.Property(x => x.RecipientName).IsRequired().HasMaxLength(200);
            e.Property(x => x.Phone).IsRequired().HasMaxLength(20);
            e.Property(x => x.City).IsRequired().HasMaxLength(100);
            e.Property(x => x.District).HasMaxLength(100);
            e.Property(x => x.AddressLine).IsRequired().HasMaxLength(500);
            e.Property(x => x.PostalCode).HasMaxLength(20);
        });

        modelBuilder.Entity<CouponCode>(e =>
        {
            e.ToTable("CouponCodes");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Code).IsRequired().HasMaxLength(50);
            e.Property(x => x.DiscountType).IsRequired().HasMaxLength(20);
            e.Property(x => x.DiscountValue).HasColumnType("decimal(18,2)");
            e.Property(x => x.MinimumOrderAmount).HasColumnType("decimal(18,2)");
        });
    }
}

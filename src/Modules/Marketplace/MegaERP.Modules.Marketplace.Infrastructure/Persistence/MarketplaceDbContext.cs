using MegaERP.Modules.Marketplace.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Marketplace.Infrastructure.Persistence;

public class MarketplaceDbContext : DbContext
{
    public MarketplaceDbContext(DbContextOptions<MarketplaceDbContext> options) : base(options) { }

    public DbSet<BuyerUser> BuyerUsers => Set<BuyerUser>();

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
    }
}

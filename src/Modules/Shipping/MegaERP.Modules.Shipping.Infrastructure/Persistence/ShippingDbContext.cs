using MegaERP.Modules.Shipping.Core.Entities;
using MegaERP.Shared.Core.Interfaces;
using MegaERP.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Shipping.Infrastructure.Persistence;

public class ShippingDbContext : BaseDbContext
{
    public ShippingDbContext(DbContextOptions<ShippingDbContext> options, ITenantService tenantService) 
        : base(options, tenantService)
    {
    }

    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShippingMethod> ShippingMethods => Set<ShippingMethod>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("shipping");

        modelBuilder.Entity<ShippingMethod>(entity =>
        {
            entity.ToTable("ShippingMethods");
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<Shipment>(entity =>
        {
            entity.ToTable("Shipments");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ShippingMethod)
                .WithMany()
                .HasForeignKey(e => e.ShippingMethodId);
        });

        base.OnModelCreating(modelBuilder);
    }
}

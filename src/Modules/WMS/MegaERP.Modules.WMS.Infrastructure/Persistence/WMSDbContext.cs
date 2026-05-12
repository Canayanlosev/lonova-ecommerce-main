using MegaERP.Modules.WMS.Core.Entities;
using MegaERP.Shared.Core.Interfaces;
using MegaERP.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.WMS.Infrastructure.Persistence;

public class WMSDbContext : BaseDbContext
{
    public WMSDbContext(DbContextOptions<WMSDbContext> options, ITenantService tenantService)
        : base(options, tenantService)
    {
    }

    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<Zone> Zones => Set<Zone>();
    public DbSet<Aisle> Aisles => Set<Aisle>();
    public DbSet<Rack> Racks => Set<Rack>();
    public DbSet<Bin> Bins => Set<Bin>();
    public DbSet<StockLocation> StockLocations => Set<StockLocation>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderItem> PurchaseOrderItems => Set<PurchaseOrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("wms");

        modelBuilder.Entity<Warehouse>(e => { e.ToTable("Warehouses"); e.HasKey(x => x.Id); });
        modelBuilder.Entity<Zone>(e => {
            e.ToTable("Zones"); e.HasKey(x => x.Id);
            e.HasOne(x => x.Warehouse).WithMany(w => w.Zones).HasForeignKey(x => x.WarehouseId);
        });
        modelBuilder.Entity<Aisle>(e => {
            e.ToTable("Aisles"); e.HasKey(x => x.Id);
            e.HasOne(x => x.Zone).WithMany(z => z.Aisles).HasForeignKey(x => x.ZoneId);
        });
        modelBuilder.Entity<Rack>(e => {
            e.ToTable("Racks"); e.HasKey(x => x.Id);
            e.HasOne(x => x.Aisle).WithMany(a => a.Racks).HasForeignKey(x => x.AisleId);
        });
        modelBuilder.Entity<Bin>(e => {
            e.ToTable("Bins"); e.HasKey(x => x.Id);
            e.HasOne(x => x.Rack).WithMany(r => r.Bins).HasForeignKey(x => x.RackId);
        });
        modelBuilder.Entity<StockLocation>(e => {
            e.ToTable("StockLocations"); e.HasKey(x => x.Id);
            e.HasOne(x => x.Bin).WithMany(b => b.StockLocations).HasForeignKey(x => x.BinId);
        });
        modelBuilder.Entity<StockMovement>(e => { e.ToTable("StockMovements"); e.HasKey(x => x.Id); });
        modelBuilder.Entity<Supplier>(e => { e.ToTable("Suppliers"); e.HasKey(x => x.Id); });
        modelBuilder.Entity<PurchaseOrder>(e => {
            e.ToTable("PurchaseOrders"); e.HasKey(x => x.Id);
            e.HasOne(x => x.Supplier).WithMany(s => s.PurchaseOrders).HasForeignKey(x => x.SupplierId);
        });
        modelBuilder.Entity<PurchaseOrderItem>(e => {
            e.ToTable("PurchaseOrderItems"); e.HasKey(x => x.Id);
            e.HasOne(x => x.PurchaseOrder).WithMany(o => o.Items).HasForeignKey(x => x.PurchaseOrderId);
        });

        base.OnModelCreating(modelBuilder);
    }
}

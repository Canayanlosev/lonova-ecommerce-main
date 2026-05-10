using MegaERP.Modules.Accounting.Core.Entities;
using MegaERP.Shared.Core.Interfaces;
using MegaERP.Shared.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Accounting.Infrastructure.Persistence;

public class AccountingDbContext : BaseDbContext
{
    public AccountingDbContext(DbContextOptions<AccountingDbContext> options, ITenantService tenantService) 
        : base(options, tenantService)
    {
    }

    public DbSet<AccountingAccount> Accounts => Set<AccountingAccount>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("accounting");

        modelBuilder.Entity<AccountingAccount>(entity =>
        {
            entity.ToTable("Accounts");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.TenantId, e.Code }).IsUnique();
        });

        modelBuilder.Entity<JournalEntry>(entity =>
        {
            entity.ToTable("JournalEntries");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.AccountingAccount)
                .WithMany()
                .HasForeignKey(e => e.AccountingAccountId);
        });

        base.OnModelCreating(modelBuilder);
    }
}

using MegaERP.Modules.Accounting.Core.DTOs;
using MegaERP.Modules.Accounting.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Accounting.Api.Controllers;

[ApiController]
[Route("api/accounting/journal-entries")]
[Authorize(Roles = "Admin,Manager")]
public class JournalEntriesController : ControllerBase
{
    private readonly AccountingDbContext _context;

    public JournalEntriesController(AccountingDbContext context)
    {
        _context = context;
    }

    private static JournalEntryDto ToDto(Core.Entities.JournalEntry e) => new(
        e.Id, e.Date, e.Description, e.Debit, e.Credit,
        e.AccountingAccountId, e.AccountingAccount?.Name, e.AccountingAccount?.Code);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<JournalEntryDto>>> GetAll()
    {
        var entries = await _context.JournalEntries
            .Include(e => e.AccountingAccount)
            .OrderByDescending(e => e.Date)
            .ToListAsync();
        return Ok(entries.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<JournalEntryDto>> GetById(Guid id)
    {
        var entry = await _context.JournalEntries.Include(e => e.AccountingAccount).FirstOrDefaultAsync(e => e.Id == id);
        if (entry is null) throw new KeyNotFoundException($"Yevmiye kaydı bulunamadı: {id}");
        return Ok(ToDto(entry));
    }

    [HttpGet("account/{accountId:guid}")]
    public async Task<ActionResult<IEnumerable<JournalEntryDto>>> GetByAccount(Guid accountId)
    {
        var entries = await _context.JournalEntries
            .Include(e => e.AccountingAccount)
            .Where(e => e.AccountingAccountId == accountId)
            .OrderByDescending(e => e.Date)
            .ToListAsync();
        return Ok(entries.Select(ToDto));
    }

    [HttpPost]
    public async Task<ActionResult<JournalEntryDto>> Create(CreateJournalEntryRequest request)
    {
        if (request.Debit < 0 || request.Credit < 0)
            throw new ArgumentException("Borç ve alacak değerleri negatif olamaz.");

        var entry = new Core.Entities.JournalEntry
        {
            Id = Guid.NewGuid(),
            Date = request.Date,
            Description = request.Description,
            Debit = request.Debit,
            Credit = request.Credit,
            AccountingAccountId = request.AccountingAccountId
        };
        _context.JournalEntries.Add(entry);

        var account = await _context.Accounts.FindAsync(request.AccountingAccountId);
        if (account is not null)
            account.Balance += request.Debit - request.Credit;

        await _context.SaveChangesAsync();
        await _context.Entry(entry).Reference(e => e.AccountingAccount).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = entry.Id }, ToDto(entry));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entry = await _context.JournalEntries.FindAsync(id);
        if (entry is null) throw new KeyNotFoundException($"Yevmiye kaydı bulunamadı: {id}");

        var account = await _context.Accounts.FindAsync(entry.AccountingAccountId);
        if (account is not null)
            account.Balance -= entry.Debit - entry.Credit;

        _context.JournalEntries.Remove(entry);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

using MegaERP.Modules.Accounting.Core.DTOs;
using MegaERP.Modules.Accounting.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.Accounting.Api.Controllers;

[ApiController]
[Route("api/accounting/accounts")]
[Authorize(Roles = "Admin,Manager")]
public class AccountingAccountsController : ControllerBase
{
    private readonly AccountingDbContext _context;

    public AccountingAccountsController(AccountingDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AccountingAccountDto>>> GetAll()
    {
        var accounts = await _context.Accounts
            .OrderBy(a => a.Code)
            .ToListAsync();
        return Ok(accounts.Select(a => new AccountingAccountDto(a.Id, a.Name, a.Code, a.Type, a.Balance)));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AccountingAccountDto>> GetById(Guid id)
    {
        var account = await _context.Accounts.FindAsync(id);
        if (account is null) throw new KeyNotFoundException($"Hesap bulunamadı: {id}");
        return Ok(new AccountingAccountDto(account.Id, account.Name, account.Code, account.Type, account.Balance));
    }

    [HttpPost]
    public async Task<ActionResult<AccountingAccountDto>> Create(CreateAccountRequest request)
    {
        var account = new Core.Entities.AccountingAccount
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Code = request.Code,
            Type = request.Type,
            Balance = 0
        };
        _context.Accounts.Add(account);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = account.Id },
            new AccountingAccountDto(account.Id, account.Name, account.Code, account.Type, account.Balance));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateAccountRequest request)
    {
        var account = await _context.Accounts.FindAsync(id);
        if (account is null) throw new KeyNotFoundException($"Hesap bulunamadı: {id}");
        account.Name = request.Name;
        account.Type = request.Type;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var account = await _context.Accounts.FindAsync(id);
        if (account is null) throw new KeyNotFoundException($"Hesap bulunamadı: {id}");
        var hasEntries = await _context.JournalEntries.AnyAsync(j => j.AccountingAccountId == id);
        if (hasEntries)
            throw new InvalidOperationException("Bu hesaba bağlı yevmiye kayıtları mevcut, silinemez.");
        _context.Accounts.Remove(account);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

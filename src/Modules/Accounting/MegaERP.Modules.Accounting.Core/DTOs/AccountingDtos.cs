namespace MegaERP.Modules.Accounting.Core.DTOs;

public record AccountingAccountDto(Guid Id, string Name, string Code, string Type, decimal Balance);

public record CreateAccountRequest(string Name, string Code, string Type);

public record UpdateAccountRequest(string Name, string Type);

public record JournalEntryDto(
    Guid Id,
    DateTime Date,
    string Description,
    decimal Debit,
    decimal Credit,
    Guid AccountingAccountId,
    string? AccountName,
    string? AccountCode);

public record CreateJournalEntryRequest(
    DateTime Date,
    string Description,
    decimal Debit,
    decimal Credit,
    Guid AccountingAccountId);

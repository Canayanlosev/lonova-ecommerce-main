using FluentValidation;
using MegaERP.Modules.Accounting.Core.DTOs;

namespace MegaERP.Modules.Accounting.Core.Validators;

public class CreateAccountRequestValidator : AbstractValidator<CreateAccountRequest>
{
    private static readonly string[] ValidTypes = ["Varlık", "Yükümlülük", "Özkaynak", "Gelir", "Gider"];

    public CreateAccountRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200).WithMessage("Hesap adı zorunludur (max 200 karakter).");
        RuleFor(x => x.Code).NotEmpty().MaximumLength(20).WithMessage("Hesap kodu zorunludur (max 20 karakter).");
        RuleFor(x => x.Type).NotEmpty().Must(t => ValidTypes.Contains(t))
            .WithMessage($"Geçersiz hesap türü. Geçerli değerler: {string.Join(", ", ValidTypes)}");
    }
}

public class CreateJournalEntryRequestValidator : AbstractValidator<CreateJournalEntryRequest>
{
    public CreateJournalEntryRequestValidator()
    {
        RuleFor(x => x.Date).NotEmpty().WithMessage("Tarih zorunludur.");
        RuleFor(x => x.Description).NotEmpty().MaximumLength(500).WithMessage("Açıklama zorunludur (max 500 karakter).");
        RuleFor(x => x.Debit).GreaterThan(0).WithMessage("Borç tutarı sıfırdan büyük olmalıdır.");
        RuleFor(x => x.AccountingAccountId).NotEqual(Guid.Empty).WithMessage("Hesap seçimi zorunludur.");
    }
}

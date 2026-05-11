using FluentValidation;
using MegaERP.Modules.Ecommerce.Core.DTOs;

namespace MegaERP.Modules.Ecommerce.Core.Validators;

public class CreateProductRequestValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Ürün adı zorunludur.")
            .MaximumLength(200).WithMessage("Ürün adı en fazla 200 karakter olabilir.");

        RuleFor(x => x.BasePrice)
            .GreaterThan(0).WithMessage("Fiyat sıfırdan büyük olmalıdır.");

        RuleFor(x => x.Sku)
            .NotEmpty().WithMessage("SKU zorunludur.")
            .MaximumLength(50).WithMessage("SKU en fazla 50 karakter olabilir.");

        RuleFor(x => x.CategoryId)
            .NotEqual(Guid.Empty).WithMessage("Kategori seçimi zorunludur.");
    }
}

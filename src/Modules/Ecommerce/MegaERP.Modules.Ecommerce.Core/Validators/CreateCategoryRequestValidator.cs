using FluentValidation;
using MegaERP.Modules.Ecommerce.Core.DTOs;

namespace MegaERP.Modules.Ecommerce.Core.Validators;

public class CreateCategoryRequestValidator : AbstractValidator<CreateCategoryRequest>
{
    public CreateCategoryRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Kategori adı zorunludur.")
            .MaximumLength(100).WithMessage("Kategori adı en fazla 100 karakter olabilir.");
    }
}

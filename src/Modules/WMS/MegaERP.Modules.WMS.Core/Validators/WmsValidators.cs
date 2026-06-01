using FluentValidation;
using MegaERP.Modules.WMS.Core.DTOs;

namespace MegaERP.Modules.WMS.Core.Validators;

public class CreateWarehouseRequestValidator : AbstractValidator<CreateWarehouseRequest>
{
    public CreateWarehouseRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200).WithMessage("Depo adı zorunludur (max 200 karakter).");
    }
}

public class CreateSupplierRequestValidator : AbstractValidator<CreateSupplierRequest>
{
    public CreateSupplierRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200).WithMessage("Tedarikçi adı zorunludur (max 200 karakter).");
        RuleFor(x => x.ContactEmail).EmailAddress().When(x => !string.IsNullOrEmpty(x.ContactEmail))
            .WithMessage("Geçerli bir e-posta adresi girin.");
    }
}

public class CreatePurchaseOrderRequestValidator : AbstractValidator<CreatePurchaseOrderRequest>
{
    public CreatePurchaseOrderRequestValidator()
    {
        RuleFor(x => x.SupplierId).NotEqual(Guid.Empty).WithMessage("Tedarikçi seçimi zorunludur.");
        RuleFor(x => x.Items).NotEmpty().WithMessage("En az bir ürün satırı zorunludur.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Miktar sıfırdan büyük olmalıdır.");
            item.RuleFor(i => i.UnitPrice).GreaterThan(0).WithMessage("Birim fiyat sıfırdan büyük olmalıdır.");
        });
    }
}

using FluentValidation;
using MegaERP.Modules.HR.Core.DTOs;

namespace MegaERP.Modules.HR.Core.Validators;

public class CreateEmployeeRequestValidator : AbstractValidator<CreateEmployeeRequest>
{
    public CreateEmployeeRequestValidator()
    {
        RuleFor(x => x.FirstName).NotEmpty().MaximumLength(100).WithMessage("Ad zorunludur (max 100 karakter).");
        RuleFor(x => x.LastName).NotEmpty().MaximumLength(100).WithMessage("Soyad zorunludur (max 100 karakter).");
        RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("Geçerli bir e-posta adresi girin.");
        RuleFor(x => x.Salary).GreaterThanOrEqualTo(0).WithMessage("Maaş negatif olamaz.");
        RuleFor(x => x.HireDate).LessThanOrEqualTo(DateTime.UtcNow.AddDays(1)).WithMessage("İşe giriş tarihi gelecekte olamaz.");
        RuleFor(x => x.DepartmentId).NotEqual(Guid.Empty).WithMessage("Departman seçimi zorunludur.");
    }
}

public class CreateDepartmentRequestValidator : AbstractValidator<CreateDepartmentRequest>
{
    public CreateDepartmentRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100).WithMessage("Departman adı zorunludur (max 100 karakter).");
    }
}

public class CreateLeaveRequestValidator : AbstractValidator<CreateLeaveRequest>
{
    public CreateLeaveRequestValidator()
    {
        RuleFor(x => x.EmployeeId).NotEqual(Guid.Empty).WithMessage("Çalışan seçimi zorunludur.");
        RuleFor(x => x.StartDate).LessThan(x => x.EndDate).WithMessage("Başlangıç tarihi bitiş tarihinden önce olmalıdır.");
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500).WithMessage("İzin nedeni zorunludur (max 500 karakter).");
    }
}

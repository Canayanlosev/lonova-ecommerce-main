using MegaERP.Shared.Core.Entities;

namespace MegaERP.Modules.HR.Core.Entities;

public class Department : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class Employee : BaseTenantEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateTime HireDate { get; set; }
    public decimal Salary { get; set; }
    public Guid DepartmentId { get; set; }
    public virtual Department? Department { get; set; }
}

public class LeaveRequest : BaseTenantEntity
{
    public Guid EmployeeId { get; set; }
    public virtual Employee? Employee { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
}

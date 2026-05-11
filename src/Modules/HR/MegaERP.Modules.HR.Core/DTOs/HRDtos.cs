namespace MegaERP.Modules.HR.Core.DTOs;

public record DepartmentDto(Guid Id, string Name, string? Description);
public record CreateDepartmentRequest(string Name, string? Description);
public record UpdateDepartmentRequest(string Name, string? Description);

public record EmployeeDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    DateTime HireDate,
    decimal Salary,
    Guid DepartmentId,
    string? DepartmentName);

public record CreateEmployeeRequest(
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    DateTime HireDate,
    decimal Salary,
    Guid DepartmentId);

public record UpdateEmployeeRequest(
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    decimal Salary,
    Guid DepartmentId);

public record LeaveRequestDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    DateTime StartDate,
    DateTime EndDate,
    string Reason,
    string Status);

public record CreateLeaveRequest(
    Guid EmployeeId,
    DateTime StartDate,
    DateTime EndDate,
    string Reason);

public record UpdateLeaveStatusRequest(string Status);

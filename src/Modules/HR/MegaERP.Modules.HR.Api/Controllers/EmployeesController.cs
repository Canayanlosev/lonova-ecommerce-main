using MegaERP.Modules.HR.Core.DTOs;
using MegaERP.Modules.HR.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.HR.Api.Controllers;

[ApiController]
[Route("api/hr/employees")]
[Authorize(Roles = "Admin,Manager")]
public class EmployeesController : ControllerBase
{
    private readonly HRDbContext _context;

    public EmployeesController(HRDbContext context)
    {
        _context = context;
    }

    private static EmployeeDto ToDto(Core.Entities.Employee e) => new(
        e.Id, e.FirstName, e.LastName, e.Email, e.Phone,
        e.HireDate, e.Salary, e.DepartmentId, e.Department?.Name);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EmployeeDto>>> GetAll()
    {
        var employees = await _context.Employees
            .Include(e => e.Department)
            .OrderBy(e => e.LastName).ThenBy(e => e.FirstName)
            .ToListAsync();
        return Ok(employees.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EmployeeDto>> GetById(Guid id)
    {
        var employee = await _context.Employees.Include(e => e.Department).FirstOrDefaultAsync(e => e.Id == id);
        if (employee is null) throw new KeyNotFoundException($"Çalışan bulunamadı: {id}");
        return Ok(ToDto(employee));
    }

    [HttpGet("department/{departmentId:guid}")]
    public async Task<ActionResult<IEnumerable<EmployeeDto>>> GetByDepartment(Guid departmentId)
    {
        var employees = await _context.Employees
            .Include(e => e.Department)
            .Where(e => e.DepartmentId == departmentId)
            .OrderBy(e => e.LastName)
            .ToListAsync();
        return Ok(employees.Select(ToDto));
    }

    [HttpPost]
    public async Task<ActionResult<EmployeeDto>> Create(CreateEmployeeRequest request)
    {
        var employee = new Core.Entities.Employee
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            Phone = request.Phone,
            HireDate = request.HireDate,
            Salary = request.Salary,
            DepartmentId = request.DepartmentId
        };
        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();
        await _context.Entry(employee).Reference(e => e.Department).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = employee.Id }, ToDto(employee));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateEmployeeRequest request)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee is null) throw new KeyNotFoundException($"Çalışan bulunamadı: {id}");
        employee.FirstName = request.FirstName;
        employee.LastName = request.LastName;
        employee.Email = request.Email;
        employee.Phone = request.Phone;
        employee.Salary = request.Salary;
        employee.DepartmentId = request.DepartmentId;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var employee = await _context.Employees.FindAsync(id);
        if (employee is null) throw new KeyNotFoundException($"Çalışan bulunamadı: {id}");
        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

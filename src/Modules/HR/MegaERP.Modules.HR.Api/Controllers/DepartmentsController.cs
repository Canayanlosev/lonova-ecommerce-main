using MegaERP.Modules.HR.Core.DTOs;
using MegaERP.Modules.HR.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.HR.Api.Controllers;

[ApiController]
[Route("api/hr/departments")]
[Authorize(Roles = "Admin,Manager")]
public class DepartmentsController : ControllerBase
{
    private readonly HRDbContext _context;

    public DepartmentsController(HRDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DepartmentDto>>> GetAll()
    {
        var departments = await _context.Departments
            .OrderBy(d => d.Name)
            .ToListAsync();
        return Ok(departments.Select(d => new DepartmentDto(d.Id, d.Name, d.Description)));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DepartmentDto>> GetById(Guid id)
    {
        var dept = await _context.Departments.FindAsync(id);
        if (dept is null) throw new KeyNotFoundException($"Departman bulunamadı: {id}");
        return Ok(new DepartmentDto(dept.Id, dept.Name, dept.Description));
    }

    [HttpPost]
    public async Task<ActionResult<DepartmentDto>> Create(CreateDepartmentRequest request)
    {
        var dept = new Core.Entities.Department
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description
        };
        _context.Departments.Add(dept);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = dept.Id }, new DepartmentDto(dept.Id, dept.Name, dept.Description));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateDepartmentRequest request)
    {
        var dept = await _context.Departments.FindAsync(id);
        if (dept is null) throw new KeyNotFoundException($"Departman bulunamadı: {id}");
        dept.Name = request.Name;
        dept.Description = request.Description;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var dept = await _context.Departments.FindAsync(id);
        if (dept is null) throw new KeyNotFoundException($"Departman bulunamadı: {id}");
        _context.Departments.Remove(dept);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

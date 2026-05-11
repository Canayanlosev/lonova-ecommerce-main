using MegaERP.Modules.HR.Core.DTOs;
using MegaERP.Modules.HR.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.HR.Api.Controllers;

[ApiController]
[Route("api/hr/leave-requests")]
[Authorize(Roles = "Admin,Manager,Employee")]
public class LeaveRequestsController : ControllerBase
{
    private readonly HRDbContext _context;

    public LeaveRequestsController(HRDbContext context)
    {
        _context = context;
    }

    private static LeaveRequestDto ToDto(Core.Entities.LeaveRequest r) => new(
        r.Id, r.EmployeeId,
        r.Employee is not null ? $"{r.Employee.FirstName} {r.Employee.LastName}" : string.Empty,
        r.StartDate, r.EndDate, r.Reason, r.Status);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<LeaveRequestDto>>> GetAll()
    {
        var requests = await _context.LeaveRequests
            .Include(r => r.Employee)
            .OrderByDescending(r => r.StartDate)
            .ToListAsync();
        return Ok(requests.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LeaveRequestDto>> GetById(Guid id)
    {
        var request = await _context.LeaveRequests.Include(r => r.Employee).FirstOrDefaultAsync(r => r.Id == id);
        if (request is null) throw new KeyNotFoundException($"İzin talebi bulunamadı: {id}");
        return Ok(ToDto(request));
    }

    [HttpGet("employee/{employeeId:guid}")]
    public async Task<ActionResult<IEnumerable<LeaveRequestDto>>> GetByEmployee(Guid employeeId)
    {
        var requests = await _context.LeaveRequests
            .Include(r => r.Employee)
            .Where(r => r.EmployeeId == employeeId)
            .OrderByDescending(r => r.StartDate)
            .ToListAsync();
        return Ok(requests.Select(ToDto));
    }

    [HttpPost]
    public async Task<ActionResult<LeaveRequestDto>> Create(CreateLeaveRequest request)
    {
        var leave = new Core.Entities.LeaveRequest
        {
            Id = Guid.NewGuid(),
            EmployeeId = request.EmployeeId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Reason = request.Reason,
            Status = "Pending"
        };
        _context.LeaveRequests.Add(leave);
        await _context.SaveChangesAsync();
        await _context.Entry(leave).Reference(r => r.Employee).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = leave.Id }, ToDto(leave));
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateLeaveStatusRequest request)
    {
        var allowed = new[] { "Pending", "Approved", "Rejected" };
        if (!allowed.Contains(request.Status))
            throw new ArgumentException($"Geçersiz durum. İzin verilenler: {string.Join(", ", allowed)}");

        var leave = await _context.LeaveRequests.FindAsync(id);
        if (leave is null) throw new KeyNotFoundException($"İzin talebi bulunamadı: {id}");
        leave.Status = request.Status;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var leave = await _context.LeaveRequests.FindAsync(id);
        if (leave is null) throw new KeyNotFoundException($"İzin talebi bulunamadı: {id}");
        if (leave.Status != "Pending")
            throw new InvalidOperationException("Sadece beklemedeki izin talepleri silinebilir.");
        _context.LeaveRequests.Remove(leave);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

using MegaERP.Modules.IAM.Core.DTOs;
using MegaERP.Modules.IAM.Core.Entities;
using MegaERP.Modules.IAM.Core.Interfaces;
using MegaERP.Modules.IAM.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace MegaERP.Modules.IAM.Api.Controllers;

[ApiController]
[Route("api/iam/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtProvider _jwtProvider;
    private readonly IAMDbContext _db;

    public AuthController(UserManager<ApplicationUser> userManager, IJwtProvider jwtProvider, IAMDbContext db)
    {
        _userManager = userManager;
        _jwtProvider = jwtProvider;
        _db = db;
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized(new { message = "E-posta veya şifre hatalı." });

        if (!user.IsActive)
            return Unauthorized(new { message = "Hesap devre dışı bırakılmış." });

        var roles = await _userManager.GetRolesAsync(user);
        if (roles.Count == 0)
        {
            await _userManager.AddToRoleAsync(user, "Admin");
            roles = await _userManager.GetRolesAsync(user);
        }

        var accessToken = _jwtProvider.Generate(user, roles);
        var refreshToken = _jwtProvider.GenerateRefreshToken(user.Id);

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();

        return Ok(new AuthResponse(accessToken, refreshToken.Token, user.Email!, user.FirstName, user.LastName));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshTokenRequest request)
    {
        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(r => r.Token == request.RefreshToken);

        if (stored is null || !stored.IsActive)
            return Unauthorized(new { message = "Refresh token geçersiz veya süresi dolmuş." });

        var user = await _userManager.FindByIdAsync(stored.UserId);
        if (user is null || !user.IsActive)
            return Unauthorized(new { message = "Kullanıcı bulunamadı veya devre dışı." });

        var roles = await _userManager.GetRolesAsync(user);
        var newAccessToken = _jwtProvider.Generate(user, roles);
        var newRefreshToken = _jwtProvider.GenerateRefreshToken(user.Id);

        // Rotate: revoke old, save new
        stored.IsRevoked = true;
        stored.ReplacedByToken = newRefreshToken.Token;
        _db.RefreshTokens.Add(newRefreshToken);
        _db.Update(stored);
        await _db.SaveChangesAsync();

        return Ok(new AuthResponse(newAccessToken, newRefreshToken.Token, user.Email!, user.FirstName, user.LastName));
    }

    [HttpPost("revoke")]
    [Authorize]
    public async Task<IActionResult> Revoke(RevokeTokenRequest request)
    {
        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(r => r.Token == request.RefreshToken);

        if (stored is null || !stored.IsActive)
            return BadRequest(new { message = "Geçerli bir refresh token bulunamadı." });

        stored.IsRevoked = true;
        _db.Update(stored);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Token iptal edildi." });
    }

    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult> Register(RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            TenantId = request.TenantId
        };

        var result = await _userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
            return BadRequest(result.Errors);

        await _userManager.AddToRoleAsync(user, "Employee");

        return Ok("User registered successfully");
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MegaERP.Modules.Marketplace.Core.DTOs;
using MegaERP.Modules.Marketplace.Core.Entities;
using MegaERP.Modules.Marketplace.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace MegaERP.Modules.Marketplace.Api.Controllers;

/// <summary>Buyer authentication — register and login for marketplace buyers (separate from firm users).</summary>
[ApiController]
[Route("api/marketplace/auth")]
public class BuyerAuthController : ControllerBase
{
    private readonly MarketplaceDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IPasswordHasher<BuyerUser> _hasher;

    public BuyerAuthController(
        MarketplaceDbContext context,
        IConfiguration configuration,
        IPasswordHasher<BuyerUser> hasher)
    {
        _context = context;
        _configuration = configuration;
        _hasher = hasher;
    }

    /// <summary>Registers a new buyer account.</summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<BuyerAuthResponse>> Register(BuyerRegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Ad, email ve şifre zorunludur.");

        if (request.Password.Length < 6)
            return BadRequest("Şifre en az 6 karakter olmalıdır.");

        if (await _context.BuyerUsers.AnyAsync(b => b.Email == request.Email.ToLowerInvariant()))
            return Conflict("Bu email adresi zaten kayıtlı.");

        var buyer = new BuyerUser
        {
            FirstName = request.FirstName,
            LastName = request.LastName ?? string.Empty,
            Email = request.Email.ToLowerInvariant()
        };
        buyer.PasswordHash = _hasher.HashPassword(buyer, request.Password);

        _context.BuyerUsers.Add(buyer);
        await _context.SaveChangesAsync();

        var token = GenerateToken(buyer);
        return Ok(new BuyerAuthResponse(token, buyer.Id.ToString(), buyer.Email, buyer.FirstName, buyer.LastName));
    }

    /// <summary>Authenticates a buyer and returns a JWT token.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<BuyerAuthResponse>> Login(BuyerLoginRequest request)
    {
        var buyer = await _context.BuyerUsers
            .FirstOrDefaultAsync(b => b.Email == request.Email.ToLowerInvariant() && b.IsActive);

        if (buyer is null)
            return Unauthorized("Email veya şifre hatalı.");

        var result = _hasher.VerifyHashedPassword(buyer, buyer.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized("Email veya şifre hatalı.");

        var token = GenerateToken(buyer);
        return Ok(new BuyerAuthResponse(token, buyer.Id.ToString(), buyer.Email, buyer.FirstName, buyer.LastName));
    }

    /// <summary>Returns the authenticated buyer's profile.</summary>
    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<BuyerProfileDto>> GetProfile()
    {
        var buyerIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value;
        if (buyerIdStr is null || !Guid.TryParse(buyerIdStr, out var buyerId))
            return Unauthorized();

        var buyer = await _context.BuyerUsers.FindAsync(buyerId);
        if (buyer is null || !buyer.IsActive) return Unauthorized();

        return Ok(new BuyerProfileDto(buyer.Id.ToString(), buyer.Email, buyer.FirstName, buyer.LastName, buyer.Phone ?? string.Empty));
    }

    /// <summary>Updates the authenticated buyer's profile.</summary>
    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<BuyerProfileDto>> UpdateProfile(UpdateBuyerProfileRequest request)
    {
        var buyerIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value;
        if (buyerIdStr is null || !Guid.TryParse(buyerIdStr, out var buyerId))
            return Unauthorized();

        var buyer = await _context.BuyerUsers.FindAsync(buyerId);
        if (buyer is null || !buyer.IsActive) return Unauthorized();

        if (!string.IsNullOrWhiteSpace(request.FirstName))
            buyer.FirstName = request.FirstName.Trim();
        if (!string.IsNullOrWhiteSpace(request.LastName))
            buyer.LastName = request.LastName.Trim();
        if (request.Phone is not null)
            buyer.Phone = request.Phone.Trim();

        // Email change requires uniqueness check
        if (!string.IsNullOrWhiteSpace(request.Email) &&
            !request.Email.Equals(buyer.Email, StringComparison.OrdinalIgnoreCase))
        {
            if (await _context.BuyerUsers.AnyAsync(b => b.Email == request.Email.ToLowerInvariant() && b.Id != buyerId))
                return Conflict("Bu email adresi başka bir hesapta kullanılıyor.");
            buyer.Email = request.Email.ToLowerInvariant();
        }

        buyer.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new BuyerProfileDto(buyer.Id.ToString(), buyer.Email, buyer.FirstName, buyer.LastName, buyer.Phone ?? string.Empty));
    }

    /// <summary>Changes the authenticated buyer's password.</summary>
    [HttpPut("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(BuyerChangePasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            return BadRequest("Mevcut ve yeni şifre zorunludur.");

        if (request.NewPassword.Length < 6)
            return BadRequest("Yeni şifre en az 6 karakter olmalıdır.");

        var buyerIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                      ?? User.FindFirst("sub")?.Value;
        if (buyerIdStr is null || !Guid.TryParse(buyerIdStr, out var buyerId))
            return Unauthorized();

        var buyer = await _context.BuyerUsers.FindAsync(buyerId);
        if (buyer is null || !buyer.IsActive)
            return Unauthorized();

        var result = _hasher.VerifyHashedPassword(buyer, buyer.PasswordHash, request.CurrentPassword);
        if (result == PasswordVerificationResult.Failed)
            return BadRequest("Mevcut şifre hatalı.");

        buyer.PasswordHash = _hasher.HashPassword(buyer, request.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Şifre başarıyla değiştirildi." });
    }

    private string GenerateToken(BuyerUser buyer)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, buyer.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, buyer.Email),
            new Claim("firstName", buyer.FirstName),
            new Claim("lastName", buyer.LastName),
            new Claim("scope", "buyer")
        };

        var secret = _configuration["Jwt:SecretKey"] ?? "a_very_long_and_secure_secret_key_1234567890";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

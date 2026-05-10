using MegaERP.Modules.IAM.Core.DTOs;
using MegaERP.Modules.IAM.Core.Entities;
using MegaERP.Modules.IAM.Core.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace MegaERP.Modules.IAM.Api.Controllers;

[ApiController]
[Route("api/iam/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtProvider _jwtProvider;

    public AuthController(UserManager<ApplicationUser> _userManager, IJwtProvider jwtProvider)
    {
        this._userManager = _userManager;
        _jwtProvider = jwtProvider;
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user == null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized("Invalid credentials");
        }

        var token = _jwtProvider.Generate(user);

        return Ok(new AuthResponse(token, user.Email!, user.FirstName, user.LastName));
    }

    [HttpPost("register")]
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
        {
            return BadRequest(result.Errors);
        }

        return Ok("User registered successfully");
    }
}

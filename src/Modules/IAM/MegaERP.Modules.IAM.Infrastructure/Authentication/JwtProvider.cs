using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using MegaERP.Modules.IAM.Core.Entities;
using MegaERP.Modules.IAM.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace MegaERP.Modules.IAM.Infrastructure.Authentication;

public class JwtProvider : IJwtProvider
{
    private readonly IConfiguration _configuration;

    public JwtProvider(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string Generate(ApplicationUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? ""),
            new("firstName", user.FirstName),
            new("lastName", user.LastName),
            new("tenantId", user.TenantId?.ToString() ?? "")
        };
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var secretKey = _configuration["Jwt:SecretKey"] ?? "a_very_long_and_secure_secret_key_1234567890";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

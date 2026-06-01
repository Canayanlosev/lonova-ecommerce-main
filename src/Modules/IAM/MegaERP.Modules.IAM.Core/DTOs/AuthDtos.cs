namespace MegaERP.Modules.IAM.Core.DTOs;

public record LoginRequest(string Email, string Password);

public record RegisterRequest(
    string Email, 
    string Password, 
    string FirstName, 
    string LastName, 
    Guid? TenantId);

public record AuthResponse(string Token, string RefreshToken, string Email, string FirstName, string LastName);
public record RefreshTokenRequest(string RefreshToken);
public record RevokeTokenRequest(string RefreshToken);

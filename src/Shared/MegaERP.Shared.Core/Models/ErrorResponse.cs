namespace MegaERP.Shared.Core.Models;

public record ErrorResponse(
    string Type,
    string Message,
    int StatusCode,
    Dictionary<string, string[]>? Errors = null);

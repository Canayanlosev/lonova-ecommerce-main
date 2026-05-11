using System.Text.Json;
using FluentValidation;
using MegaERP.Shared.Core.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace MegaERP.Shared.Infrastructure.Middleware;

public class ExceptionHandlingMiddleware : IMiddleware
{
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger)
    {
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var response = exception switch
        {
            ValidationException ve => new ErrorResponse(
                Type: "ValidationError",
                Message: "Bir veya daha fazla doğrulama hatası oluştu.",
                StatusCode: StatusCodes.Status400BadRequest,
                Errors: ve.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(e => e.ErrorMessage).ToArray())),

            KeyNotFoundException => new ErrorResponse(
                Type: "NotFound",
                Message: exception.Message,
                StatusCode: StatusCodes.Status404NotFound),

            UnauthorizedAccessException => new ErrorResponse(
                Type: "Unauthorized",
                Message: "Bu işlem için yetkiniz bulunmuyor.",
                StatusCode: StatusCodes.Status401Unauthorized),

            ArgumentException or InvalidOperationException => new ErrorResponse(
                Type: "BadRequest",
                Message: exception.Message,
                StatusCode: StatusCodes.Status400BadRequest),

            _ => new ErrorResponse(
                Type: "InternalServerError",
                Message: "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
                StatusCode: StatusCodes.Status500InternalServerError)
        };

        context.Response.StatusCode = response.StatusCode;
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonOptions));
    }
}

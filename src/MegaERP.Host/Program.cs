using MegaERP.Modules.IAM.Infrastructure;
using MegaERP.Modules.CMS.Infrastructure;
using MegaERP.Modules.Ecommerce.Infrastructure;
using MegaERP.Modules.Sales.Infrastructure;
using MegaERP.Modules.Billing.Infrastructure;
using MegaERP.Modules.Accounting.Infrastructure;
using MegaERP.Modules.HR.Infrastructure;
using MegaERP.Modules.Shipping.Infrastructure;
using MegaERP.Shared.Infrastructure;
using MegaERP.Shared.Infrastructure.Middleware;
using MegaERP.Shared.Infrastructure.Behaviors;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Identity;
using System.Text;
using System.Threading.RateLimiting;
using MegaERP.Modules.IAM.Core.Entities;
using MegaERP.Modules.IAM.Infrastructure.Persistence;
using MegaERP.Modules.CMS.Infrastructure.Persistence;
using MegaERP.Modules.Ecommerce.Infrastructure.Persistence;
using MegaERP.Modules.Sales.Infrastructure.Persistence;
using MegaERP.Modules.Billing.Infrastructure.Persistence;
using MegaERP.Modules.Accounting.Infrastructure.Persistence;
using MegaERP.Modules.HR.Infrastructure.Persistence;
using MegaERP.Modules.Shipping.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "https://localhost:3000"];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// Rate Limiting — 60 requests/minute per IP for auth endpoints, 200/min for others
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("auth", o =>
    {
        o.Window = TimeSpan.FromMinutes(1);
        o.PermitLimit = 20;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("api", o =>
    {
        o.Window = TimeSpan.FromMinutes(1);
        o.PermitLimit = 200;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 5;
    });
    options.RejectionStatusCode = 429;
});

// Add services to the container.
builder.Services.AddSharedInfrastructure();
builder.Services.AddIAMInfrastructure(builder.Configuration);
builder.Services.AddCMSInfrastructure(builder.Configuration);
builder.Services.AddEcommerceInfrastructure(builder.Configuration);
builder.Services.AddSalesInfrastructure(builder.Configuration);
builder.Services.AddBillingInfrastructure(builder.Configuration);
builder.Services.AddAccountingInfrastructure(builder.Configuration);
builder.Services.AddHRInfrastructure(builder.Configuration);
builder.Services.AddShippingInfrastructure(builder.Configuration);
builder.Services.AddControllers();

// MediatR Registration for all modules
builder.Services.AddMediatR(cfg => {
    cfg.RegisterServicesFromAssemblies(
        typeof(Program).Assembly,
        typeof(MegaERP.Modules.IAM.Infrastructure.DependencyInjection).Assembly,
        typeof(MegaERP.Modules.CMS.Infrastructure.DependencyInjection).Assembly,
        typeof(MegaERP.Modules.Ecommerce.Infrastructure.DependencyInjection).Assembly,
        typeof(MegaERP.Modules.Sales.Infrastructure.DependencyInjection).Assembly,
        typeof(MegaERP.Modules.Billing.Infrastructure.DependencyInjection).Assembly,
        typeof(MegaERP.Modules.Accounting.Infrastructure.DependencyInjection).Assembly,
        typeof(MegaERP.Modules.Shipping.Infrastructure.DependencyInjection).Assembly
    );
    cfg.AddOpenBehavior(typeof(ValidationBehavior<,>));
});

// FluentValidation — tüm modüllerdeki validator'ları tara
builder.Services.AddValidatorsFromAssemblies([
    typeof(MegaERP.Modules.IAM.Core.Validators.LoginRequestValidator).Assembly,
    typeof(MegaERP.Modules.Ecommerce.Core.Validators.CreateProductRequestValidator).Assembly,
    typeof(MegaERP.Modules.Sales.Core.Features.Orders.Commands.PlaceOrderCommand).Assembly,
]);

// JWT Authentication
var secretKey = builder.Configuration["Jwt:SecretKey"] ?? "a_very_long_and_secure_secret_key_1234567890";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
        };
    });

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseHttpsRedirection();

// Security headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});

app.UseCors();
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers().RequireRateLimiting("api");

// Initialize Database and Seed User
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var iamContext = services.GetRequiredService<IAMDbContext>();
        iamContext.Database.EnsureCreated();

        // Seed Roles
        var roleManager = services.GetRequiredService<RoleManager<ApplicationRole>>();
        foreach (var role in new[] { "Admin", "Manager", "Employee", "Customer" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new ApplicationRole { Name = role });
        }

        // Seed User
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var userEmail = "canayan@megaerp.com";
        var existingUser = await userManager.FindByEmailAsync(userEmail);
        if (existingUser == null)
        {
            var user = new ApplicationUser
            {
                UserName = userEmail,
                Email = userEmail,
                FirstName = "Can",
                LastName = "Ayan",
                IsActive = true
            };
            var result = await userManager.CreateAsync(user, "67890memo");
            if (result.Succeeded)
                await userManager.AddToRoleAsync(user, "Admin");
        }
        else if (!await userManager.IsInRoleAsync(existingUser, "Admin"))
        {
            await userManager.AddToRoleAsync(existingUser, "Admin");
        }

        // Other contexts
        services.GetRequiredService<CMSDbContext>().Database.EnsureCreated();
        services.GetRequiredService<EcommerceDbContext>().Database.EnsureCreated();
        services.GetRequiredService<SalesDbContext>().Database.EnsureCreated();
        services.GetRequiredService<BillingDbContext>().Database.EnsureCreated();
        services.GetRequiredService<AccountingDbContext>().Database.EnsureCreated();
        services.GetRequiredService<HRDbContext>().Database.EnsureCreated();
        services.GetRequiredService<ShippingDbContext>().Database.EnsureCreated();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database initialization error: {ex.Message}");
    }
}

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}

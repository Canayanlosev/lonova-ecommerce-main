using MegaERP.Modules.IAM.Infrastructure;
using MegaERP.Modules.CMS.Infrastructure;
using MegaERP.Modules.Ecommerce.Infrastructure;
using MegaERP.Modules.Sales.Infrastructure;
using MegaERP.Modules.Billing.Infrastructure;
using MegaERP.Modules.Accounting.Infrastructure;
using MegaERP.Modules.HR.Infrastructure;
using MegaERP.Modules.Shipping.Infrastructure;
using MegaERP.Modules.Catalog.Infrastructure;
using MegaERP.Modules.Marketplace.Infrastructure;
using MegaERP.Modules.WMS.Infrastructure;
using MegaERP.Modules.SiteBuilder.Infrastructure;
using MegaERP.Shared.Infrastructure;
using MegaERP.Shared.Infrastructure.Middleware;
using MegaERP.Shared.Infrastructure.Behaviors;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Identity;
using Microsoft.OpenApi;
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
using MegaERP.Modules.Catalog.Infrastructure.Persistence;
using MegaERP.Modules.WMS.Infrastructure.Persistence;
using MegaERP.Modules.SiteBuilder.Infrastructure.Persistence;
using MegaERP.Modules.Marketplace.Infrastructure.Persistence;
using MegaERP.Modules.Marketplace.Core.Entities;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;

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
builder.Services.AddCatalogInfrastructure(builder.Configuration);
builder.Services.AddMarketplaceInfrastructure(builder.Configuration);
builder.Services.AddScoped<IPasswordHasher<BuyerUser>, PasswordHasher<BuyerUser>>();
builder.Services.AddWMSInfrastructure(builder.Configuration);
builder.Services.AddSiteBuilderInfrastructure(builder.Configuration);
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

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MegaERP API",
        Version = "v1",
        Description = "Lonova / MegaERP — IAM, E-Commerce, Sales, Billing, HR, Accounting, Shipping modülleri"
    });

    // JWT Bearer auth butonu
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Login'den aldığın JWT token'ı buraya yapıştır. Örnek: eyJhbGci..."
    });
    options.OperationFilter<BearerAuthOperationFilter>();
    options.CustomSchemaIds(type => type.FullName?.Replace("+", "."));

    // XML doc comments
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = System.IO.Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (System.IO.File.Exists(xmlPath))
        options.IncludeXmlComments(xmlPath);
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "MegaERP API v1");
    options.RoutePrefix = "swagger";
    options.DocumentTitle = "MegaERP API";
    options.DisplayRequestDuration();
    options.EnableDeepLinking();
    options.DefaultModelsExpandDepth(-1); // schema bölümünü gizle
});

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
            else
                Console.WriteLine($"Seed user error: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
        else if (!await userManager.IsInRoleAsync(existingUser, "Admin"))
        {
            await userManager.AddToRoleAsync(existingUser, "Admin");
        }

        // Other contexts — use CreateTables() to bypass EnsureCreated's HasTables() check
        // which skips creation when ANY tables exist in the DB (Npgsql behavior).
        // Each call is isolated so a duplicate-table error on one context doesn't block the rest.
        static void EnsureSchema(Microsoft.EntityFrameworkCore.DbContext ctx)
        {
            try
            {
                var creator = (RelationalDatabaseCreator)ctx.Database.GetService<IDatabaseCreator>();
                creator.CreateTables();
            }
            catch (Exception ex) when (ex.Message.Contains("already exists"))
            {
                // Tables already exist — safe to ignore on subsequent startups
            }
        }

        EnsureSchema(services.GetRequiredService<CMSDbContext>());
        EnsureSchema(services.GetRequiredService<EcommerceDbContext>());
        EnsureSchema(services.GetRequiredService<SalesDbContext>());
        EnsureSchema(services.GetRequiredService<BillingDbContext>());
        EnsureSchema(services.GetRequiredService<AccountingDbContext>());
        EnsureSchema(services.GetRequiredService<HRDbContext>());
        EnsureSchema(services.GetRequiredService<ShippingDbContext>());
        EnsureSchema(services.GetRequiredService<CatalogDbContext>());
        EnsureSchema(services.GetRequiredService<WMSDbContext>());
        EnsureSchema(services.GetRequiredService<SiteBuilderDbContext>());
        EnsureSchema(services.GetRequiredService<MarketplaceDbContext>());
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database initialization error: {ex.Message}");
    }
}

app.Run();

// Swagger UI'da kilit ikonunu tüm endpoint'lerde göster
public class BearerAuthOperationFilter : Swashbuckle.AspNetCore.SwaggerGen.IOperationFilter
{
    public void Apply(Microsoft.OpenApi.OpenApiOperation operation, Swashbuckle.AspNetCore.SwaggerGen.OperationFilterContext context)
    {
        operation.Security ??= [];
        operation.Security.Add(new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecuritySchemeReference("Bearer"),
                new List<string>()
            }
        });
    }
}

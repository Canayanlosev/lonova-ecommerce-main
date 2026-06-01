# CanayanWeb — Kapsamlı Geliştirme Rehberi

> **Kapsam:** Auth & Güvenlik · API Katmanı · EF Core · Muhasebe · E-Ticaret · WMS · İK · CRM · Frontend Performansı  
> **Stack:** .NET 10 · Next.js 16 · PostgreSQL 16 · React 19 · Zustand 5

---

## İçindekiler

1. [Mimari & Altyapı](#1-mimari--altyapı)
   - 1.1 Result\<T\> Pattern
   - 1.2 Global Exception Middleware
   - 1.3 EF Core Optimizasyonları
2. [Auth & Güvenlik](#2-auth--güvenlik)
   - 2.1 JWT Refresh Token
   - 2.2 Policy-Based RBAC
   - 2.3 Frontend Token Güvenliği
3. [API Katmanı](#3-api-katmanı)
   - 3.1 FluentValidation
   - 3.2 Pagination & Filtering
   - 3.3 Rate Limiting & Caching
4. [Muhasebe Modülü](#4-muhasebe-modülü)
5. [E-Ticaret Modülü](#5-e-ticaret-modülü)
6. [WMS Modülü](#6-wms-modülü)
7. [İK Modülü](#7-ik-modülü)
8. [CRM Modülü](#8-crm-modülü)
9. [Frontend Performansı](#9-frontend-performansı)
10. [Öncelik Özeti](#10-öncelik-özeti)

---

## 1. Mimari & Altyapı

### 1.1 Result\<T\> Pattern

**Sorun:** Her controller farklı şekilde hata dönüyor. Bazıları `throw`, bazıları `null`, bazıları `false`. Standart yok.

**Çözüm:** Tüm servis katmanlarında `Result<T>` kullan.

**`Shared/Core/Result.cs`**
```csharp
public class Result<T>
{
    public bool IsSuccess { get; private set; }
    public T? Value { get; private set; }
    public string? Error { get; private set; }
    public string? ErrorCode { get; private set; }

    private Result() { }

    public static Result<T> Success(T value) =>
        new() { IsSuccess = true, Value = value };

    public static Result<T> Failure(string error, string? errorCode = null) =>
        new() { IsSuccess = false, Error = error, ErrorCode = errorCode };

    // Implicit dönüşüm — servis katmanında return value; yazabilmek için
    public static implicit operator Result<T>(T value) => Success(value);
}

// Değersiz sonuçlar için
public class Result
{
    public bool IsSuccess { get; private set; }
    public string? Error { get; private set; }
    public string? ErrorCode { get; private set; }

    public static Result Success() => new() { IsSuccess = true };
    public static Result Failure(string error, string? errorCode = null) =>
        new() { IsSuccess = false, Error = error, ErrorCode = errorCode };
}
```

**Kullanım — Servis katmanı:**
```csharp
// Modules/Ecommerce/Ecommerce.Core/Services/IProductService.cs
public interface IProductService
{
    Task<Result<ProductDto>> GetByIdAsync(Guid id);
    Task<Result<ProductDto>> CreateAsync(CreateProductRequest request);
    Task<Result> DeleteAsync(Guid id);
}

// Servis implementasyonu
public async Task<Result<ProductDto>> GetByIdAsync(Guid id)
{
    var product = await _db.Products
        .AsNoTracking()
        .FirstOrDefaultAsync(p => p.Id == id);

    if (product is null)
        return Result<ProductDto>.Failure("Ürün bulunamadı.", "PRODUCT_NOT_FOUND");

    return _mapper.Map<ProductDto>(product);
}
```

**Kullanım — Controller katmanı:**
```csharp
// Modules/Ecommerce/Ecommerce.Api/Controllers/ProductsController.cs
[HttpGet("{id}")]
public async Task<IActionResult> GetById(Guid id)
{
    var result = await _productService.GetByIdAsync(id);

    return result.IsSuccess
        ? Ok(result.Value)
        : result.ErrorCode switch
        {
            "PRODUCT_NOT_FOUND" => NotFound(new { error = result.Error }),
            _ => BadRequest(new { error = result.Error })
        };
}
```

---

### 1.2 Global Exception Middleware

**Sorun:** İşlenmeyen exception'lar 500 döndürüyor, log yok, client ne olduğunu bilmiyor.

**`Shared/Infrastructure/Middleware/GlobalExceptionMiddleware.cs`**
```csharp
public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "İşlenmeyen exception: {Path}", context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        var (statusCode, title) = ex switch
        {
            UnauthorizedAccessException => (401, "Yetkisiz erişim"),
            KeyNotFoundException        => (404, "Kayıt bulunamadı"),
            ArgumentException           => (400, "Geçersiz istek"),
            InvalidOperationException   => (422, "İşlem gerçekleştirilemedi"),
            _                           => (500, "Sunucu hatası")
        };

        // RFC 9457 ProblemDetails formatı
        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = ex.Message,
            Instance = context.Request.Path
        };

        // Geliştirme ortamında stack trace ekle
        if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            problem.Extensions["stackTrace"] = ex.StackTrace;

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(problem);
    }
}
```

**`MegaERP.Host/Program.cs`'e ekle:**
```csharp
// Mevcut pipeline'a ekle — UseRouting'den önce
app.UseMiddleware<GlobalExceptionMiddleware>();
```

---

### 1.3 EF Core Optimizasyonları

**Sorun:** `EnsureCreated()` migration geçmişi yazmıyor. Büyük listelerde tracking açık kalıyor. N+1 sorgu riski var.

#### a) Migration'a geç

```csharp
// MegaERP.Host/Program.cs — EnsureCreated yerine
using (var scope = app.Services.CreateScope())
{
    var contexts = scope.ServiceProvider.GetServices<DbContext>();
    foreach (var ctx in contexts)
        await ctx.Database.MigrateAsync();
}
```

Her modülde migration oluştur:
```bash
dotnet ef migrations add InitialCreate \
  --project Modules/Accounting/Accounting.Infrastructure \
  --startup-project MegaERP.Host \
  --context AccountingDbContext
```

#### b) AsNoTracking — salt okunur sorgularda

```csharp
// Her GET sorgusuna ekle
var products = await _db.Products
    .AsNoTracking()                          // Tracking kapalı → ~%20 daha hızlı
    .Include(p => p.Variants)
    .Where(p => p.StoreId == storeId && p.IsActive)
    .ToListAsync();
```

#### c) Select projeksiyon — tüm entity çekme

```csharp
// YANLIŞ — tüm kolonu çekiyor
var products = await _db.Products.ToListAsync();
var dtos = products.Select(p => new ProductDto { ... }).ToList();

// DOĞRU — sadece gerekli alanlar
var dtos = await _db.Products
    .AsNoTracking()
    .Where(p => p.StoreId == storeId)
    .Select(p => new ProductDto
    {
        Id = p.Id,
        Name = p.Name,
        Price = p.Price,
        StockCount = p.StockCount
    })
    .ToListAsync();
```

#### d) Compiled queries — sık çalışan sorgular

```csharp
// Shared/Infrastructure/CompiledQueries.cs
public static class ProductQueries
{
    public static readonly Func<MegaErpDbContext, Guid, Task<ProductDto?>> GetProductById =
        EF.CompileAsyncQuery((MegaErpDbContext db, Guid id) =>
            db.Products
              .AsNoTracking()
              .Where(p => p.Id == id)
              .Select(p => new ProductDto { Id = p.Id, Name = p.Name, Price = p.Price })
              .FirstOrDefault());
}

// Kullanım
var product = await ProductQueries.GetProductById(_db, id);
```

#### e) Bulk işlemler — EF Core 7+ ExecuteUpdate/ExecuteDelete

```csharp
// Stok toplu güncelleme — satır satır SaveChanges yerine
await _db.StockItems
    .Where(s => s.WarehouseId == warehouseId && s.Quantity < s.MinThreshold)
    .ExecuteUpdateAsync(s => s
        .SetProperty(x => x.IsLowStock, true)
        .SetProperty(x => x.UpdatedAt, DateTime.UtcNow));
```

---

## 2. Auth & Güvenlik

### 2.1 JWT Refresh Token

**Sorun:** Token süresi dolunca kullanıcı logout oluyor. Refresh mekanizması yok.

**`Modules/IAM/IAM.Core/Entities/RefreshToken.cs`**
```csharp
public class RefreshToken
{
    public Guid Id { get; set; }
    public string Token { get; set; } = default!;
    public string UserId { get; set; } = default!;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsRevoked { get; set; }
    public string? RevokedReason { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsActive => !IsRevoked && !IsExpired;
}
```

**`Modules/IAM/IAM.Core/Services/TokenService.cs`**
```csharp
public class TokenService
{
    private readonly IConfiguration _config;
    private readonly IamDbContext _db;

    public string GenerateAccessToken(ApplicationUser user, IList<string> roles)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email!),
            new("firstName", user.FirstName),
            new("lastName", user.LastName),
        };

        claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15), // Kısa ömür — 15dk
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<RefreshToken> GenerateRefreshTokenAsync(string userId)
    {
        var token = new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        _db.RefreshTokens.Add(token);
        await _db.SaveChangesAsync();
        return token;
    }

    public async Task<(string accessToken, string refreshToken)?> RefreshAsync(string refreshToken)
    {
        var existing = await _db.RefreshTokens
            .FirstOrDefaultAsync(r => r.Token == refreshToken);

        if (existing is null || !existing.IsActive) return null;

        // Eski token'ı iptal et (token rotation)
        existing.IsRevoked = true;
        existing.RevokedReason = "Rotated";

        var user = await _userManager.FindByIdAsync(existing.UserId);
        if (user is null) return null;

        var roles = await _userManager.GetRolesAsync(user);
        var newAccess = GenerateAccessToken(user, roles);
        var newRefresh = await GenerateRefreshTokenAsync(user.Id);

        await _db.SaveChangesAsync();
        return (newAccess, newRefresh.Token);
    }
}
```

**`Modules/IAM/IAM.Api/Controllers/AuthController.cs`'e ekle:**
```csharp
[HttpPost("refresh")]
public async Task<IActionResult> Refresh([FromBody] RefreshRequest req)
{
    var result = await _tokenService.RefreshAsync(req.RefreshToken);
    if (result is null)
        return Unauthorized(new { error = "Geçersiz veya süresi dolmuş refresh token." });

    return Ok(new
    {
        accessToken = result.Value.accessToken,
        refreshToken = result.Value.refreshToken
    });
}

[HttpPost("revoke")]
[Authorize]
public async Task<IActionResult> Revoke([FromBody] RevokeRequest req)
{
    await _tokenService.RevokeAsync(req.RefreshToken, "Kullanıcı çıkışı");
    return NoContent();
}
```

---

### 2.2 Policy-Based RBAC

**Sorun:** Roller var ama policy bazlı ince taneli yetkilendirme yok.

**`Shared/Infrastructure/Authorization/Policies.cs`**
```csharp
public static class Policies
{
    public const string CanManageProducts    = "CanManageProducts";
    public const string CanViewFinancials    = "CanViewFinancials";
    public const string CanManageEmployees   = "CanManageEmployees";
    public const string CanManageWms         = "CanManageWms";
    public const string CanViewReports       = "CanViewReports";
    public const string AdminOnly            = "AdminOnly";
}
```

**`MegaERP.Host/Program.cs`**
```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(Policies.AdminOnly, p =>
        p.RequireRole("Admin"));

    options.AddPolicy(Policies.CanManageProducts, p =>
        p.RequireRole("Admin", "Manager"));

    options.AddPolicy(Policies.CanViewFinancials, p =>
        p.RequireRole("Admin", "Manager"));

    options.AddPolicy(Policies.CanManageEmployees, p =>
        p.RequireRole("Admin", "Manager"));

    options.AddPolicy(Policies.CanManageWms, p =>
        p.RequireRole("Admin", "Manager", "Employee"));

    options.AddPolicy(Policies.CanViewReports, p =>
        p.RequireRole("Admin", "Manager"));
});
```

**Controller'larda kullanım:**
```csharp
// Ürün silme — sadece Admin/Manager
[HttpDelete("{id}")]
[Authorize(Policy = Policies.CanManageProducts)]
public async Task<IActionResult> Delete(Guid id) { ... }

// Muhasebe — sadece Admin/Manager
[ApiController]
[Route("api/accounting")]
[Authorize(Policy = Policies.CanViewFinancials)]
public class AccountingController : ControllerBase { ... }

// Stok görüntüleme — Admin/Manager/Employee
[HttpGet]
[Authorize(Policy = Policies.CanManageWms)]
public async Task<IActionResult> GetStock() { ... }
```

---

### 2.3 Frontend Token Güvenliği

**Sorun:** JWT token localStorage'da tutuluyor → XSS ile çalınabilir. Expire check yok.

#### a) Token decode + expire kontrolü — proxy.ts

```typescript
// src/mega-erp-web/src/proxy.ts
import { NextRequest, NextResponse } from 'next/server'

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
    ?? request.headers.get('x-auth-token')

  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
  const isAuth = request.nextUrl.pathname.startsWith('/auth')

  if (isDashboard) {
    if (!token || isTokenExpired(token)) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }

  if (isAuth && token && !isTokenExpired(token)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*']
}
```

#### b) Axios interceptor — otomatik token yenileme

```typescript
// src/lib/api.ts
import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/iam/auth/refresh`,
          { refreshToken }
        )

        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
        failedQueue.forEach(p => p.resolve(data.accessToken))
        failedQueue = []

        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch (refreshError) {
        failedQueue.forEach(p => p.reject(refreshError))
        failedQueue = []
        useAuthStore.getState().logout()
        window.location.href = '/auth/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
```

#### c) Auth store güncelleme

```typescript
// src/store/auth.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: { email: string; firstName: string; lastName: string } | null
  setTokens: (token: string, refreshToken: string) => void
  setUser: (user: AuthState['user']) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: null,
      refreshToken: null,
      user: null,
      setTokens: (token, refreshToken) => set({ token, refreshToken }),
      setUser: user => set({ user }),
      logout: () => set({ token: null, refreshToken: null, user: null }),
    }),
    {
      name: 'auth',
      // Sadece refreshToken kalıcı, accessToken memory'de
      partialize: state => ({ refreshToken: state.refreshToken, user: state.user }),
    }
  )
)
```

---

## 3. API Katmanı

### 3.1 FluentValidation

**Sorun:** DTO doğrulama yok. Geçersiz veri doğrudan DB'ye gidiyor.

**Kurulum:**
```bash
dotnet add package FluentValidation.AspNetCore
```

**`Modules/Ecommerce/Ecommerce.Core/Validators/CreateProductValidator.cs`**
```csharp
public class CreateProductRequest
{
    public string Name { get; set; } = default!;
    public decimal Price { get; set; }
    public int StockCount { get; set; }
    public Guid StoreId { get; set; }
    public string? Description { get; set; }
    public List<string> Images { get; set; } = [];
}

public class CreateProductValidator : AbstractValidator<CreateProductRequest>
{
    public CreateProductValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Ürün adı zorunludur.")
            .MaximumLength(200).WithMessage("Ürün adı 200 karakteri aşamaz.");

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Fiyat 0'dan büyük olmalıdır.")
            .LessThanOrEqualTo(999999).WithMessage("Fiyat çok yüksek.");

        RuleFor(x => x.StockCount)
            .GreaterThanOrEqualTo(0).WithMessage("Stok negatif olamaz.");

        RuleFor(x => x.StoreId)
            .NotEmpty().WithMessage("Mağaza seçilmelidir.");

        RuleFor(x => x.Images)
            .Must(imgs => imgs.Count <= 10).WithMessage("En fazla 10 görsel eklenebilir.");
    }
}
```

**`MegaERP.Host/Program.cs`'e ekle:**
```csharp
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblies(AppDomain.CurrentDomain.GetAssemblies());
```

Bu kadar. FluentValidation otomatik çalışır, hatalı istek 400 döner:
```json
{
  "errors": {
    "Name": ["Ürün adı zorunludur."],
    "Price": ["Fiyat 0'dan büyük olmalıdır."]
  }
}
```

---

### 3.2 Pagination & Filtering

**Sorun:** Tüm liste endpoint'leri tüm veriyi dönüyor. Büyüdükçe timeout riski var.

**`Shared/Core/Pagination/PagedRequest.cs`**
```csharp
public class PagedRequest
{
    private int _page = 1;
    private int _pageSize = 20;

    public int Page
    {
        get => _page;
        set => _page = value < 1 ? 1 : value;
    }

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > 100 ? 100 : value < 1 ? 1 : value;
    }

    public string? Search { get; set; }
    public string? SortBy { get; set; }
    public bool SortDesc { get; set; }
}

public class PagedResponse<T>
{
    public List<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNext => Page < TotalPages;
    public bool HasPrev => Page > 1;
}
```

**Extension method:**
```csharp
// Shared/Core/Pagination/PaginationExtensions.cs
public static class PaginationExtensions
{
    public static async Task<PagedResponse<T>> ToPagedAsync<T>(
        this IQueryable<T> query,
        PagedRequest request)
    {
        var totalCount = await query.CountAsync();

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();

        return new PagedResponse<T>
        {
            Items = items,
            TotalCount = totalCount,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
```

**Controller kullanımı:**
```csharp
[HttpGet]
public async Task<IActionResult> GetProducts([FromQuery] ProductListRequest req)
{
    var query = _db.Products
        .AsNoTracking()
        .Where(p => p.StoreId == req.StoreId);

    if (!string.IsNullOrEmpty(req.Search))
        query = query.Where(p => p.Name.Contains(req.Search));

    if (req.MinPrice.HasValue)
        query = query.Where(p => p.Price >= req.MinPrice.Value);

    if (req.MaxPrice.HasValue)
        query = query.Where(p => p.Price <= req.MaxPrice.Value);

    query = req.SortBy switch
    {
        "price_asc"  => query.OrderBy(p => p.Price),
        "price_desc" => query.OrderByDescending(p => p.Price),
        "name"       => query.OrderBy(p => p.Name),
        _            => query.OrderByDescending(p => p.CreatedAt)
    };

    var result = await query
        .Select(p => new ProductListDto { Id = p.Id, Name = p.Name, Price = p.Price })
        .ToPagedAsync(req);

    return Ok(result);
}
```

---

### 3.3 Rate Limiting & Caching

**Kurulum (.NET 10 dahili — paket gereksiz):**

**`MegaERP.Host/Program.cs`**
```csharp
// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    // Global limit
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            ctx.User?.Identity?.Name ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1)
            }));

    // Auth endpoint'leri için daha sıkı limit
    options.AddFixedWindowLimiter("auth", o =>
    {
        o.PermitLimit = 5;
        o.Window = TimeSpan.FromMinutes(15);
    });

    options.OnRejected = async (ctx, _) =>
    {
        ctx.HttpContext.Response.StatusCode = 429;
        await ctx.HttpContext.Response.WriteAsJsonAsync(new
        {
            error = "Çok fazla istek gönderdiniz. Lütfen bekleyin.",
            retryAfter = 60
        });
    };
});

// Memory cache
builder.Services.AddMemoryCache();

// ...

app.UseRateLimiter();
```

**Auth controller'a limit uygula:**
```csharp
[HttpPost("login")]
[EnableRateLimiting("auth")]
public async Task<IActionResult> Login([FromBody] LoginRequest req) { ... }
```

**Caching — ürün listesi:**
```csharp
public class CachedProductService : IProductService
{
    private readonly IProductService _inner;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan _ttl = TimeSpan.FromMinutes(5);

    public async Task<PagedResponse<ProductListDto>> GetListAsync(ProductListRequest req)
    {
        var cacheKey = $"products:{req.StoreId}:{req.Page}:{req.PageSize}:{req.Search}";

        if (_cache.TryGetValue(cacheKey, out PagedResponse<ProductListDto>? cached))
            return cached!;

        var result = await _inner.GetListAsync(req);
        _cache.Set(cacheKey, result, _ttl);
        return result;
    }
}
```

---

## 4. Muhasebe Modülü

### Çift Taraflı Muhasebe (Double-Entry)

**Sorun:** Mevcut yapı tek taraflı. Gerçek muhasebe çift taraflı olmalı (her borç bir alacağa eşit).

**`Modules/Accounting/Accounting.Core/Entities/JournalEntry.cs`**
```csharp
public class JournalEntry
{
    public Guid Id { get; set; }
    public string EntryNumber { get; set; } = default!; // YVY-2026-00001
    public DateTime Date { get; set; }
    public string Description { get; set; } = default!;
    public JournalEntryType Type { get; set; }
    public JournalEntryStatus Status { get; set; } = JournalEntryStatus.Draft;
    public Guid? SourceId { get; set; }        // Bağlı sipariş/fatura ID
    public string? SourceType { get; set; }    // "Order", "Invoice" vb.
    public ICollection<JournalLine> Lines { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Muhasebe dengesi kontrolü
    public bool IsBalanced =>
        Lines.Sum(l => l.Debit) == Lines.Sum(l => l.Credit);
}

public class JournalLine
{
    public Guid Id { get; set; }
    public Guid JournalEntryId { get; set; }
    public Guid AccountId { get; set; }
    public Account Account { get; set; } = default!;
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public string? Description { get; set; }

    // Borç-Alacak validasyon
    public bool IsValid => Debit >= 0 && Credit >= 0 && (Debit == 0 || Credit == 0);
}

public enum JournalEntryType { Manual, SaleAutomatic, PurchaseAutomatic, Salary }
public enum JournalEntryStatus { Draft, Posted, Cancelled }
```

**Otomatik satış kaydı:**
```csharp
// Modules/Accounting/Accounting.Core/Services/AccountingAutomationService.cs
public class AccountingAutomationService
{
    private readonly AccountingDbContext _db;

    // Sipariş tamamlandığında otomatik yevmiye kaydı
    public async Task CreateSaleEntryAsync(Order order)
    {
        // Hesapları bul
        var receivableAccount = await _db.Accounts
            .FirstAsync(a => a.Code == "120" && a.TenantId == order.TenantId); // Alacaklar
        var salesAccount = await _db.Accounts
            .FirstAsync(a => a.Code == "600" && a.TenantId == order.TenantId); // Satışlar
        var vatAccount = await _db.Accounts
            .FirstAsync(a => a.Code == "391" && a.TenantId == order.TenantId); // KDV

        var vatAmount = order.TotalAmount * 0.18m; // %18 KDV
        var netAmount = order.TotalAmount - vatAmount;

        var entry = new JournalEntry
        {
            EntryNumber = await GenerateEntryNumberAsync(),
            Date = order.CompletedAt ?? DateTime.UtcNow,
            Description = $"Satış - Sipariş #{order.OrderNumber}",
            Type = JournalEntryType.SaleAutomatic,
            SourceId = order.Id,
            SourceType = "Order",
            Lines =
            [
                // Borç: Alacaklar (toplam tutar)
                new JournalLine
                {
                    AccountId = receivableAccount.Id,
                    Debit = order.TotalAmount,
                    Credit = 0,
                    Description = $"Sipariş #{order.OrderNumber}"
                },
                // Alacak: Satış geliri (KDV hariç)
                new JournalLine
                {
                    AccountId = salesAccount.Id,
                    Debit = 0,
                    Credit = netAmount,
                    Description = "Satış geliri"
                },
                // Alacak: KDV
                new JournalLine
                {
                    AccountId = vatAccount.Id,
                    Debit = 0,
                    Credit = vatAmount,
                    Description = "Hesaplanan KDV %18"
                }
            ]
        };

        if (!entry.IsBalanced)
            throw new InvalidOperationException("Yevmiye kaydı dengesiz!");

        _db.JournalEntries.Add(entry);
        await _db.SaveChangesAsync();
    }
}
```

**Mizan (Trial Balance) raporu:**
```csharp
public async Task<List<TrialBalanceRow>> GetTrialBalanceAsync(
    Guid tenantId, DateTime startDate, DateTime endDate)
{
    return await _db.Accounts
        .AsNoTracking()
        .Where(a => a.TenantId == tenantId && a.IsActive)
        .Select(a => new TrialBalanceRow
        {
            AccountCode = a.Code,
            AccountName = a.Name,
            TotalDebit = a.JournalLines
                .Where(l => l.JournalEntry.Date >= startDate
                         && l.JournalEntry.Date <= endDate
                         && l.JournalEntry.Status == JournalEntryStatus.Posted)
                .Sum(l => l.Debit),
            TotalCredit = a.JournalLines
                .Where(l => l.JournalEntry.Date >= startDate
                         && l.JournalEntry.Date <= endDate
                         && l.JournalEntry.Status == JournalEntryStatus.Posted)
                .Sum(l => l.Credit)
        })
        .Where(r => r.TotalDebit != 0 || r.TotalCredit != 0)
        .OrderBy(r => r.AccountCode)
        .ToListAsync();
}
```

---

## 5. E-Ticaret Modülü

### Sipariş State Machine

**Sorun:** Sipariş durumları düzensiz güncelleniyor. Geçersiz geçişler engellenmiyor.

**`Modules/Ecommerce/Ecommerce.Core/Domain/OrderStateMachine.cs`**
```csharp
public enum OrderStatus
{
    Pending,        // Ödeme bekleniyor
    Confirmed,      // Ödeme alındı
    Processing,     // Hazırlanıyor
    Shipped,        // Kargoya verildi
    Delivered,      // Teslim edildi
    Cancelled,      // İptal edildi
    Refunded        // İade edildi
}

public class OrderStateMachine
{
    // Geçerli geçiş tablosu
    private static readonly Dictionary<OrderStatus, OrderStatus[]> _transitions = new()
    {
        [OrderStatus.Pending]     = [OrderStatus.Confirmed, OrderStatus.Cancelled],
        [OrderStatus.Confirmed]   = [OrderStatus.Processing, OrderStatus.Cancelled],
        [OrderStatus.Processing]  = [OrderStatus.Shipped, OrderStatus.Cancelled],
        [OrderStatus.Shipped]     = [OrderStatus.Delivered, OrderStatus.Refunded],
        [OrderStatus.Delivered]   = [OrderStatus.Refunded],
        [OrderStatus.Cancelled]   = [],
        [OrderStatus.Refunded]    = [],
    };

    public static Result Transition(Order order, OrderStatus targetStatus)
    {
        if (!_transitions.TryGetValue(order.Status, out var allowed))
            return Result.Failure("Geçersiz sipariş durumu.");

        if (!allowed.Contains(targetStatus))
            return Result.Failure(
                $"Sipariş '{order.Status}' durumundan '{targetStatus}' durumuna geçemez.",
                "INVALID_TRANSITION");

        order.Status = targetStatus;
        order.UpdatedAt = DateTime.UtcNow;

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = targetStatus,
            ChangedAt = DateTime.UtcNow
        });

        return Result.Success();
    }
}
```

**Stok rezervasyon:**
```csharp
// Sipariş oluşturulduğunda stoku rezerve et
public async Task<Result<Order>> CreateOrderAsync(CreateOrderRequest req)
{
    // Transaction başlat
    await using var transaction = await _db.Database.BeginTransactionAsync();
    try
    {
        foreach (var item in req.Items)
        {
            var stock = await _db.StockItems
                .FirstOrDefaultAsync(s => s.ProductVariantId == item.VariantId);

            if (stock is null || stock.AvailableQuantity < item.Quantity)
                return Result<Order>.Failure(
                    $"Yeterli stok yok: {item.ProductName}",
                    "INSUFFICIENT_STOCK");

            // Rezerve et (available azalt, reserved artır)
            stock.ReservedQuantity += item.Quantity;
        }

        var order = new Order { /* ... */ };
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return order;
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}

// Kargo verildiğinde rezervasyonu gerçek düşüşe çevir
public async Task ConfirmStockDeductionAsync(Guid orderId)
{
    var order = await _db.Orders
        .Include(o => o.Items)
        .FirstAsync(o => o.Id == orderId);

    foreach (var item in order.Items)
    {
        var stock = await _db.StockItems
            .FirstAsync(s => s.ProductVariantId == item.VariantId);

        stock.ReservedQuantity -= item.Quantity;
        stock.Quantity -= item.Quantity;
    }

    await _db.SaveChangesAsync();
}
```

---

## 6. WMS Modülü

### FIFO/LIFO Stok Takibi & Lot Yönetimi

**`Modules/WMS/WMS.Core/Entities/StockBatch.cs`**
```csharp
public class StockBatch
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid WarehouseId { get; set; }
    public string? LotNumber { get; set; }
    public string? SerialNumber { get; set; }
    public int Quantity { get; set; }
    public int RemainingQuantity { get; set; }
    public decimal UnitCost { get; set; }           // Alış maliyeti (FIFO hesabı için)
    public DateTime ReceivedAt { get; set; }
    public DateTime? ExpiryDate { get; set; }       // Son kullanma tarihi
    public BatchStatus Status { get; set; } = BatchStatus.Available;
}

public enum BatchStatus { Available, Partial, Exhausted, Quarantine, Expired }
```

**FIFO çıkış servisi:**
```csharp
public class StockIssueService
{
    private readonly WmsDbContext _db;

    public async Task<Result<List<StockMovement>>> IssueStockFifoAsync(
        Guid productId, Guid warehouseId, int quantity, string reason)
    {
        // En eski batch'ten başla (FIFO)
        var batches = await _db.StockBatches
            .Where(b => b.ProductId == productId
                     && b.WarehouseId == warehouseId
                     && b.Status != BatchStatus.Exhausted
                     && b.Status != BatchStatus.Quarantine)
            .OrderBy(b => b.ReceivedAt)  // FIFO: en eski önce
            .ToListAsync();

        var totalAvailable = batches.Sum(b => b.RemainingQuantity);
        if (totalAvailable < quantity)
            return Result<List<StockMovement>>.Failure(
                $"Yetersiz stok. Mevcut: {totalAvailable}, İstenen: {quantity}",
                "INSUFFICIENT_STOCK");

        var movements = new List<StockMovement>();
        var remaining = quantity;

        foreach (var batch in batches)
        {
            if (remaining == 0) break;

            var toTake = Math.Min(batch.RemainingQuantity, remaining);
            batch.RemainingQuantity -= toTake;
            batch.Status = batch.RemainingQuantity == 0
                ? BatchStatus.Exhausted : BatchStatus.Partial;

            movements.Add(new StockMovement
            {
                BatchId = batch.Id,
                ProductId = productId,
                WarehouseId = warehouseId,
                Type = MovementType.Issue,
                Quantity = -toTake,
                UnitCost = batch.UnitCost,
                Reason = reason,
                MovedAt = DateTime.UtcNow
            });

            remaining -= toTake;
        }

        _db.StockMovements.AddRange(movements);
        await _db.SaveChangesAsync();

        return movements;
    }

    // Son kullanma tarihi yaklaşan partiler için uyarı
    public async Task<List<StockBatch>> GetExpiringBatchesAsync(
        Guid warehouseId, int daysAhead = 30)
    {
        var threshold = DateTime.UtcNow.AddDays(daysAhead);
        return await _db.StockBatches
            .AsNoTracking()
            .Include(b => b.Product)
            .Where(b => b.WarehouseId == warehouseId
                     && b.ExpiryDate.HasValue
                     && b.ExpiryDate <= threshold
                     && b.Status == BatchStatus.Available)
            .OrderBy(b => b.ExpiryDate)
            .ToListAsync();
    }
}
```

**Düşük stok uyarısı — background service:**
```csharp
// Modules/WMS/WMS.Infrastructure/BackgroundServices/LowStockMonitorService.cs
public class LowStockMonitorService : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<WmsDbContext>();
            var notifier = scope.ServiceProvider.GetRequiredService<INotificationService>();

            var lowStockItems = await db.StockItems
                .AsNoTracking()
                .Include(s => s.Product)
                .Where(s => s.Quantity <= s.MinThreshold && s.MinThreshold > 0)
                .ToListAsync(stoppingToken);

            foreach (var item in lowStockItems)
                await notifier.SendLowStockAlertAsync(item);

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }
}
```

---

## 7. İK Modülü

### Bordro Hesaplama Motoru

**`Modules/HR/HR.Core/Services/PayrollService.cs`**
```csharp
public class PayrollService
{
    // Türkiye 2026 vergi dilimleri
    private static readonly (decimal UpTo, decimal Rate)[] _taxBrackets =
    [
        (110_000m, 0.15m),
        (230_000m, 0.20m),
        (580_000m, 0.27m),
        (3_000_000m, 0.35m),
        (decimal.MaxValue, 0.40m)
    ];

    private const decimal SgkEmployeeRate    = 0.14m;  // %14 çalışan payı
    private const decimal SgkEmployerRate    = 0.20m;  // %20 işveren payı
    private const decimal UnemploymentEmployee = 0.01m;
    private const decimal UnemploymentEmployer = 0.02m;

    public PayrollCalculation Calculate(Employee employee, decimal grossSalary, int month, int year)
    {
        // SGK matrahı (tavan: 2026 değeri)
        var sgkCeiling = 45_000m; // Her yıl güncellenmeli
        var sgkBase = Math.Min(grossSalary, sgkCeiling);

        // Çalışan kesintileri
        var sgkEmployee        = sgkBase * SgkEmployeeRate;
        var unemploymentEmp    = sgkBase * UnemploymentEmployee;

        // İşveren maliyeti
        var sgkEmployer        = sgkBase * SgkEmployerRate;
        var unemploymentEmpr   = sgkBase * UnemploymentEmployer;

        // Gelir vergisi matrahı (brüt - SGK - işsizlik)
        var taxBase = grossSalary - sgkEmployee - unemploymentEmp;
        var incomeTax = CalculateProgressiveTax(taxBase);

        // Damga vergisi (%0.759)
        var stampTax = grossSalary * 0.00759m;

        var netSalary = grossSalary - sgkEmployee - unemploymentEmp - incomeTax - stampTax;

        return new PayrollCalculation
        {
            EmployeeId = employee.Id,
            Month = month,
            Year = year,
            GrossSalary = grossSalary,
            SgkEmployee = sgkEmployee,
            UnemploymentInsuranceEmployee = unemploymentEmp,
            IncomeTax = incomeTax,
            StampTax = stampTax,
            NetSalary = netSalary,
            SgkEmployer = sgkEmployer,
            UnemploymentInsuranceEmployer = unemploymentEmpr,
            TotalEmployerCost = grossSalary + sgkEmployer + unemploymentEmpr
        };
    }

    private static decimal CalculateProgressiveTax(decimal income)
    {
        decimal tax = 0;
        decimal remaining = income;
        decimal previousLimit = 0;

        foreach (var (upTo, rate) in _taxBrackets)
        {
            if (remaining <= 0) break;
            var bracket = Math.Min(remaining, upTo - previousLimit);
            tax += bracket * rate;
            remaining -= bracket;
            previousLimit = upTo;
        }

        return Math.Round(tax, 2);
    }
}
```

**İzin yönetimi — bakiye takibi:**
```csharp
public class LeaveService
{
    public async Task<Result<LeaveRequest>> RequestLeaveAsync(CreateLeaveRequest req)
    {
        var employee = await _db.Employees.FindAsync(req.EmployeeId);
        if (employee is null)
            return Result<LeaveRequest>.Failure("Çalışan bulunamadı.");

        var balance = await _db.LeaveBalances
            .FirstOrDefaultAsync(b => b.EmployeeId == req.EmployeeId
                                   && b.Year == req.StartDate.Year
                                   && b.LeaveType == req.LeaveType);

        if (balance is null || balance.RemainingDays < req.WorkingDays)
            return Result<LeaveRequest>.Failure(
                $"Yetersiz izin bakiyesi. Kalan: {balance?.RemainingDays ?? 0} gün",
                "INSUFFICIENT_LEAVE_BALANCE");

        // Çakışan izin kontrolü
        var hasConflict = await _db.LeaveRequests
            .AnyAsync(l => l.EmployeeId == req.EmployeeId
                        && l.Status == LeaveStatus.Approved
                        && l.StartDate <= req.EndDate
                        && l.EndDate >= req.StartDate);

        if (hasConflict)
            return Result<LeaveRequest>.Failure(
                "Bu tarih aralığında onaylanmış izin bulunuyor.",
                "LEAVE_CONFLICT");

        var leave = new LeaveRequest
        {
            EmployeeId = req.EmployeeId,
            LeaveType = req.LeaveType,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            WorkingDays = req.WorkingDays,
            Reason = req.Reason,
            Status = LeaveStatus.Pending
        };

        _db.LeaveRequests.Add(leave);
        await _db.SaveChangesAsync();
        return leave;
    }
}
```

---

## 8. CRM Modülü

### Müşteri Skorlama & Segmentasyon

**`Modules/CRM/CRM.Core/Services/CustomerScoringService.cs`**
```csharp
public class CustomerScoringService
{
    // RFM (Recency, Frequency, Monetary) modeli
    public async Task<CustomerScore> CalculateRfmScoreAsync(Guid customerId)
    {
        var orders = await _db.Orders
            .AsNoTracking()
            .Where(o => o.CustomerId == customerId && o.Status == OrderStatus.Delivered)
            .OrderByDescending(o => o.CompletedAt)
            .ToListAsync();

        if (!orders.Any())
            return new CustomerScore { CustomerId = customerId, Segment = CustomerSegment.New };

        var lastOrder = orders.First();
        var daysSinceLast = (DateTime.UtcNow - lastOrder.CompletedAt!.Value).TotalDays;
        var orderCount = orders.Count;
        var totalRevenue = orders.Sum(o => o.TotalAmount);
        var avgOrderValue = totalRevenue / orderCount;

        // R skoru: ne kadar yakın (1-5)
        var recencyScore = daysSinceLast switch
        {
            <= 30  => 5,
            <= 60  => 4,
            <= 90  => 3,
            <= 180 => 2,
            _      => 1
        };

        // F skoru: ne kadar sık (1-5)
        var frequencyScore = orderCount switch
        {
            >= 20 => 5,
            >= 10 => 4,
            >= 5  => 3,
            >= 2  => 2,
            _     => 1
        };

        // M skoru: ne kadar harcadı (1-5)
        var monetaryScore = totalRevenue switch
        {
            >= 50_000 => 5,
            >= 20_000 => 4,
            >= 5_000  => 3,
            >= 1_000  => 2,
            _         => 1
        };

        var totalScore = recencyScore + frequencyScore + monetaryScore;

        var segment = totalScore switch
        {
            >= 13 => CustomerSegment.Champion,
            >= 10 => CustomerSegment.Loyal,
            >= 7  => CustomerSegment.Potential,
            >= 5  => CustomerSegment.AtRisk,
            _     => CustomerSegment.Lost
        };

        return new CustomerScore
        {
            CustomerId = customerId,
            RecencyScore = recencyScore,
            FrequencyScore = frequencyScore,
            MonetaryScore = monetaryScore,
            TotalScore = totalScore,
            Segment = segment,
            TotalRevenue = totalRevenue,
            OrderCount = orderCount,
            AvgOrderValue = avgOrderValue,
            DaysSinceLastOrder = (int)daysSinceLast,
            CalculatedAt = DateTime.UtcNow
        };
    }
}

public enum CustomerSegment { New, Potential, Loyal, Champion, AtRisk, Lost }
```

**Pipeline (Kanban) — fırsat takibi:**
```csharp
public class PipelineService
{
    public async Task<Result<Deal>> MoveDealAsync(Guid dealId, PipelineStage targetStage)
    {
        var deal = await _db.Deals
            .Include(d => d.Activities)
            .FirstOrDefaultAsync(d => d.Id == dealId);

        if (deal is null)
            return Result<Deal>.Failure("Fırsat bulunamadı.");

        // Kazanıldı/Kaybedildi nihai durumlar
        if (deal.Stage == PipelineStage.Won || deal.Stage == PipelineStage.Lost)
            return Result<Deal>.Failure(
                "Tamamlanmış fırsat taşınamaz.",
                "DEAL_FINALIZED");

        deal.Stage = targetStage;
        deal.UpdatedAt = DateTime.UtcNow;

        deal.Activities.Add(new DealActivity
        {
            Type = ActivityType.StageChange,
            Note = $"Aşama değişti: {targetStage}",
            CreatedAt = DateTime.UtcNow
        });

        if (targetStage == PipelineStage.Won)
        {
            deal.WonAt = DateTime.UtcNow;
            // Otomatik sipariş oluşturma tetikle
            await _eventBus.PublishAsync(new DealWonEvent { DealId = deal.Id });
        }

        await _db.SaveChangesAsync();
        return deal;
    }

    // Dönüşüm oranları raporu
    public async Task<ConversionReport> GetConversionRatesAsync(
        Guid tenantId, DateTime from, DateTime to)
    {
        var deals = await _db.Deals
            .AsNoTracking()
            .Where(d => d.TenantId == tenantId
                     && d.CreatedAt >= from
                     && d.CreatedAt <= to)
            .ToListAsync();

        return new ConversionReport
        {
            TotalDeals = deals.Count,
            WonDeals = deals.Count(d => d.Stage == PipelineStage.Won),
            LostDeals = deals.Count(d => d.Stage == PipelineStage.Lost),
            TotalValue = deals.Sum(d => d.Value),
            WonValue = deals.Where(d => d.Stage == PipelineStage.Won).Sum(d => d.Value),
            WinRate = deals.Count > 0
                ? (decimal)deals.Count(d => d.Stage == PipelineStage.Won) / deals.Count * 100
                : 0,
            AvgDealCycleDays = deals
                .Where(d => d.WonAt.HasValue)
                .Select(d => (d.WonAt!.Value - d.CreatedAt).TotalDays)
                .DefaultIfEmpty(0)
                .Average()
        };
    }
}
```

---

## 9. Frontend Performansı

### React Query Entegrasyonu

**Sorun:** Zustand tüm API cache'ini tutuyor. Stale data, revalidation yok, loading state manuel yönetiliyor.

**Kurulum:**
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

**`src/app/providers.tsx`**
```tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,    // 5 dk stale
        gcTime: 1000 * 60 * 10,      // 10 dk cache'de tut
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}
```

**`src/lib/services/products.service.ts` — query key factory:**
```typescript
export const productKeys = {
  all: ['products'] as const,
  list: (storeId: string, filters: ProductFilters) =>
    [...productKeys.all, 'list', storeId, filters] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
}

export function useProducts(storeId: string, filters: ProductFilters) {
  return useQuery({
    queryKey: productKeys.list(storeId, filters),
    queryFn: () => api.get<PagedResponse<ProductDto>>(
      `/api/ecommerce/products?storeId=${storeId}&page=${filters.page}`
    ).then(r => r.data),
    enabled: !!storeId,
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => api.get<ProductDto>(`/api/ecommerce/products/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (req: CreateProductRequest) =>
      api.post<ProductDto>('/api/ecommerce/products', req).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all })
    },
  })
}
```

**Component kullanımı:**
```tsx
// Önceki hal — manuel loading, error, useEffect
export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts().then(setProducts).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  return <ProductList products={products} />
}

// Yeni hal — React Query
export default function ProductsPage() {
  const { storeId } = useAuthStore()
  const { data, isLoading, isError } = useProducts(storeId, { page: 1 })

  if (isLoading) return <Spinner />
  if (isError) return <ErrorState />
  return <ProductList products={data.items} total={data.totalCount} />
}
```

---

### Lazy Loading & Suspense Boundaries

```tsx
// src/app/dashboard/layout.tsx
import { Suspense, lazy } from 'react'

// Dashboard modüllerini lazy load
const AccountingModule  = lazy(() => import('./accounting/page'))
const WmsModule         = lazy(() => import('./wms/page'))
const HrModule          = lazy(() => import('./hr/page'))

function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-32 bg-border/20 rounded-2xl animate-pulse" />
      ))}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Suspense fallback={<DashboardSkeleton />}>
          {children}
        </Suspense>
      </main>
    </div>
  )
}
```

**Next.js dynamic import — ağır bileşenler:**
```tsx
// Recharts grafikleri — sadece client, büyük bundle
import dynamic from 'next/dynamic'

const RevenueChart = dynamic(
  () => import('@/components/dashboard/RevenueChart'),
  {
    loading: () => <div className="h-64 bg-border/20 rounded-2xl animate-pulse" />,
    ssr: false  // Recharts SSR'da çalışmaz
  }
)

const RadarChart = dynamic(
  () => import('@/components/dashboard/PerformanceRadar'),
  { ssr: false }
)
```

**Zustand'dan API state temizleme:**
```typescript
// ÖNCE: API verisi Zustand'da
const useProductStore = create(set => ({
  products: [],
  loading: false,
  fetchProducts: async () => {
    set({ loading: true })
    const products = await api.get('/products')
    set({ products, loading: false })
  }
}))

// SONRA: Zustand sadece UI state için
const useProductStore = create(set => ({
  selectedProductId: null,
  isDetailOpen: false,
  setSelected: (id) => set({ selectedProductId: id }),
  toggleDetail: () => set(s => ({ isDetailOpen: !s.isDetailOpen })),
}))
// API verisi → React Query
```

---

## 10. Öncelik Özeti

### P1 — Bu hafta (1-3 gün, yüksek etki)

| Görev | Dosya | Etki |
|---|---|---|
| Global Exception Middleware | `Shared/Infrastructure/Middleware/` | Tüm hataları yakalar |
| Result\<T\> pattern | `Shared/Core/Result.cs` | Tutarlı hata dönüşü |
| AsNoTracking tüm GET'lere | Tüm Infrastructure projeleri | %15-20 sorgu hızı |
| proxy.ts token expire fix | `src/proxy.ts` | Güvenlik açığı kapatır |

### P2 — 2-4 hafta (orta çaba, yüksek değer)

| Görev | Modül | Etki |
|---|---|---|
| FluentValidation entegrasyon | Tüm API modülleri | Veri kalitesi |
| JWT refresh token | IAM modülü | Kullanıcı deneyimi |
| Pagination tüm liste endpoint'leri | Tüm modüller | Ölçeklenebilirlik |
| RBAC policy tanımları | IAM + tüm controllerlar | Güvenlik |
| React Query entegrasyon | Frontend servisleri | Cache + perf |

### P3 — 1-2 ay (iş değeri, derinleştirme)

| Görev | Modül | Etki |
|---|---|---|
| Çift taraflı muhasebe | Accounting | Gerçek muhasebe |
| Sipariş state machine | E-Ticaret | Süreç güvenilirliği |
| FIFO/Lot takibi | WMS | Envanter doğruluğu |
| Bordro motoru | İK | Maaş otomasyonu |
| RFM müşteri skorlama | CRM | Pazarlama verimliliği |
| Migration'a geçiş | Tüm DB | Production güvenliği |

---

*Son güncelleme: Haziran 2026*  
*CanayanWeb Geliştirme Rehberi v1.0*
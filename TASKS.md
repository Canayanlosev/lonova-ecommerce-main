# MegaERP Backend Geliştirme Görevleri

Otonom agent her oturumda bu dosyayı okur, ilk `[ ]` olan görevi uygular, `[x]` olarak işaretler, commit edip push'lar.

**Kural:** Bir görev tamamlanmadan bir sonrakine geçme.

---

## Görev Listesi

- [x] TASK-01: TenantService Fix
- [x] TASK-02: Global Exception Handling Middleware
- [x] TASK-03: FluentValidation Pipeline
- [x] TASK-04: Ecommerce Tam CRUD
- [x] TASK-05: Basket (Sepet) API
- [x] TASK-06: Orders API Genişletme
- [x] TASK-07: Shipping Modülü API
- [x] TASK-08: Billing Modülü API
- [x] TASK-09: HR Modülü API
- [x] TASK-10: Accounting Modülü API
- [x] TASK-11: RBAC - Rol Tabanlı Yetkilendirme
- [x] TASK-12: CORS + Rate Limiting + Güvenlik
- [x] TASK-13: Catalog Module — N-seviye Kategori Ağacı
- [x] TASK-14: Marketplace Module — Public Ürün Listesi ve Arama API
- [x] TASK-15: Alıcı Auth — Marketplace Kullanıcı Kaydı ve JWT
- [x] TASK-16: Store (Mağaza) Modeli — Bir Tenant Çoklu Mağaza
- [x] TASK-17: WMS — Çoklu Depo ve Raf-Konum Hiyerarşisi
- [x] TASK-18: WMS — Tedarikçi Yönetimi ve Satın Alma Siparişi (PO)
- [x] TASK-19: SiteBuilder — Sayfa ve Blok Modeli
- [x] TASK-20: Swagger XML Dokümantasyonu — Tüm Controller'lar

---

## TASK-01: TenantService Fix

**Hedef:** `TenantService.GetTenantId()` şu an her zaman `null` döndürüyor. JWT claim'lerinden TenantId'yi oku. `BaseDbContext`'teki global query filter'ı dinamik hale getir.

**Dosyalar:**
- `src/Shared/MegaERP.Shared.Infrastructure/Services/TenantService.cs`
- `src/Shared/MegaERP.Shared.Infrastructure/Persistence/BaseDbContext.cs`
- `src/MegaERP.Host/Program.cs`

**Adımlar:**
1. `TenantService`'e `IHttpContextAccessor` inject et (constructor injection)
2. `GetTenantId()` metodunu güncelle: `_httpContextAccessor.HttpContext?.User.FindFirst("tenantId")?.Value` → `Guid.TryParse` ile döndür
3. `GetTenantIdentifier()` zaten `X-Tenant` header'ını okuyor, koru
4. `BaseDbContext.OnModelCreating`'deki global query filter'ı düzelt:
   - Şu an `_tenantId` sabit değer alıyor, runtime'da değişmiyor
   - `HasQueryFilter(e => e.TenantId == _tenantService.GetTenantId())` şeklinde lambda kullan
5. `Program.cs`'e `builder.Services.AddHttpContextAccessor();` ekle

**Tamamlanma Kriteri:**
- `TenantService.GetTenantId()` artık null değil, JWT'deki tenantId claim'ini döndürüyor
- DbContext'teki global filter runtime'da doğru TenantId'yi kullanıyor

---

## TASK-02: Global Exception Handling Middleware

**Hedef:** Hiç global exception handler yok. Tüm unhandled exception'lar tutarlı JSON formatında dönmeli.

**Dosyalar:**
- YENİ: `src/Shared/MegaERP.Shared.Core/Models/ErrorResponse.cs`
- YENİ: `src/Shared/MegaERP.Shared.Infrastructure/Middleware/ExceptionHandlingMiddleware.cs`
- `src/MegaERP.Host/Program.cs`

**Adımlar:**
1. `ErrorResponse` record oluştur:
   ```csharp
   public record ErrorResponse(string Type, string Message, int StatusCode, Dictionary<string, string[]>? Errors = null);
   ```
2. `ExceptionHandlingMiddleware` oluştur (`IMiddleware` implement et):
   - `KeyNotFoundException` → 404
   - `UnauthorizedAccessException` → 401
   - `ArgumentException` / `InvalidOperationException` → 400
   - Diğer tüm exception'lar → 500 (mesajı gizle, sadece "Internal server error" yaz)
   - Her durumda `Content-Type: application/json` header ekle
   - `JsonSerializer.Serialize(errorResponse)` ile yaz
3. `Program.cs`'e `app.UseMiddleware<ExceptionHandlingMiddleware>()` ekle (en üste, `UseHttpsRedirection`'dan önce)
4. Middleware'i DI'ya kaydet: `builder.Services.AddTransient<ExceptionHandlingMiddleware>()`

**Tamamlanma Kriteri:**
- Exception fırlatıldığında `{ "type": "...", "message": "...", "statusCode": ... }` JSON yanıtı dönüyor
- 500 hatalarında stack trace expose edilmiyor

---

## TASK-03: FluentValidation Pipeline

**Hedef:** Controller'lar input validate etmiyor. FluentValidation + MediatR pipeline davranışı ekle.

**Dosyalar:**
- `src/MegaERP.Host/MegaERP.Host.csproj` (NuGet paketi ekle)
- YENİ: `src/Shared/MegaERP.Shared.Infrastructure/Behaviors/ValidationBehavior.cs`
- YENİ: `src/Modules/IAM/MegaERP.Modules.IAM.Core/Features/Auth/Validators/LoginRequestValidator.cs`
- YENİ: `src/Modules/IAM/MegaERP.Modules.IAM.Core/Features/Auth/Validators/RegisterRequestValidator.cs`
- YENİ: `src/Modules/Ecommerce/MegaERP.Modules.Ecommerce.Core/Features/Validators/CreateProductRequestValidator.cs`
- YENİ: `src/Modules/Ecommerce/MegaERP.Modules.Ecommerce.Core/Features/Validators/CreateCategoryRequestValidator.cs`

**Adımlar:**
1. NuGet ekle: `dotnet add src/MegaERP.Host/MegaERP.Host.csproj package FluentValidation.DependencyInjectionExtensions`
2. `ValidationBehavior<TRequest, TResponse>` oluştur (`IPipelineBehavior<TRequest, TResponse>`):
   - Tüm validator'ları çalıştır
   - Hata varsa `ValidationException` fırlat (errors dictionary ile)
3. Validator'lar yaz:
   - `LoginRequest`: Email geçerli format, Password min 6 karakter
   - `RegisterRequest`: Email, FirstName, LastName required; Password min 8 karakter
   - `CreateProductRequest`: Name required, BasePrice > 0, Sku required (max 50 char)
   - `CreateCategoryRequest`: Name required (max 100 char)
4. `Program.cs`'e kaydet:
   ```csharp
   builder.Services.AddValidatorsFromAssemblies([...tüm assembly'ler...]);
   // MediatR pipeline'a ekle
   ```

**Tamamlanma Kriteri:**
- Eksik/hatalı field'da 400 + `{ "errors": { "fieldName": ["hata mesajı"] } }` dönüyor

---

## TASK-04: Ecommerce Tam CRUD

**Hedef:** Şu an sadece GET list ve POST var. GET by ID, PUT (güncelle), DELETE ekle.

**Dosyalar:**
- `src/Modules/Ecommerce/MegaERP.Modules.Ecommerce.Api/Controllers/ProductsController.cs`
- `src/Modules/Ecommerce/MegaERP.Modules.Ecommerce.Api/Controllers/CategoriesController.cs`
- YENİ: `src/Modules/Ecommerce/MegaERP.Modules.Ecommerce.Core/Features/Products/Queries/GetProductByIdQuery.cs`
- YENİ: `src/Modules/Ecommerce/MegaERP.Modules.Ecommerce.Core/Features/Products/Commands/UpdateProductCommand.cs`
- YENİ: `src/Modules/Ecommerce/MegaERP.Modules.Ecommerce.Core/Features/Products/Commands/DeleteProductCommand.cs`
- (Benzer dosyalar Categories için)

**Adımlar:**
1. Products controller'a ekle:
   - `GET /api/ecommerce/products/{id}` → `GetProductByIdQuery` (bulunamazsa `KeyNotFoundException`)
   - `PUT /api/ecommerce/products/{id}` → `UpdateProductCommand` (Name, Description, BasePrice, CategoryId güncelle)
   - `DELETE /api/ecommerce/products/{id}` → `DeleteProductCommand` (soft delete veya gerçek delete)
2. Categories controller'a ekle:
   - `GET /api/ecommerce/categories/{id}` → `GetCategoryByIdQuery`
   - `PUT /api/ecommerce/categories/{id}` → `UpdateCategoryCommand`
   - `DELETE /api/ecommerce/categories/{id}` → `DeleteCategoryCommand`
3. Her handler mevcut `EcommerceDbContext` üzerinden çalışsın
4. Mevcut `ProductDto` ve `CategoryDto` kullan

**Tamamlanma Kriteri:**
- Ürün ID ile getirilebiliyor, güncellenebiliyor, silinebiliyor
- Olmayan kayıt için 404 dönüyor

---

## TASK-05: Basket (Sepet) API

**Hedef:** `BasketItem` entity var ama hiç endpoint yok. Tam sepet API'si oluştur.

**Dosyalar:**
- YENİ: `src/Modules/Sales/MegaERP.Modules.Sales.Api/Controllers/BasketController.cs`
- YENİ: `src/Modules/Sales/MegaERP.Modules.Sales.Core/Features/Basket/` (Commands + Queries)
- YENİ: `src/Modules/Sales/MegaERP.Modules.Sales.Core/DTOs/BasketItemDto.cs`

**Adımlar:**
1. `BasketItemDto` oluştur: `{ ProductId, ProductVariantId?, Quantity, ProductName?, UnitPrice? }`
2. Endpoints:
   - `GET /api/sales/basket` → Giriş yapan kullanıcının sepet item'larını listele
   - `POST /api/sales/basket/items` → Sepete ekle (`{ productId, productVariantId?, quantity }`)
   - `PUT /api/sales/basket/items/{productId}` → Quantity güncelle
   - `DELETE /api/sales/basket/items/{productId}` → Item'ı sil
   - `DELETE /api/sales/basket` → Sepeti tamamen temizle
   - `POST /api/sales/basket/checkout` → `PlaceOrderCommand` gönder + sepeti temizle
3. UserId'yi JWT claim'lerinden al: `User.FindFirst(ClaimTypes.NameIdentifier)?.Value`
4. Tüm endpoint'ler `[Authorize]` ile korumalı olsun

**Tamamlanma Kriteri:**
- Sepete ürün eklenebiliyor, listenebiliyor, silinebiliyor
- Checkout işlemi Order oluşturuyor ve sepeti temizliyor

---

## TASK-06: Orders API Genişletme

**Hedef:** Şu an sadece `POST /api/sales/orders` var. Listeleme, görüntüleme ve iptal ekle.

**Dosyalar:**
- `src/Modules/Sales/MegaERP.Modules.Sales.Api/Controllers/OrdersController.cs`
- YENİ: `src/Modules/Sales/MegaERP.Modules.Sales.Core/Features/Orders/Queries/GetUserOrdersQuery.cs`
- YENİ: `src/Modules/Sales/MegaERP.Modules.Sales.Core/Features/Orders/Queries/GetOrderByIdQuery.cs`
- YENİ: `src/Modules/Sales/MegaERP.Modules.Sales.Core/Features/Orders/Commands/CancelOrderCommand.cs`

**Adımlar:**
1. `GET /api/sales/orders` → Giriş yapan kullanıcının siparişleri (JWT'den UserId)
2. `GET /api/sales/orders/{id}` → Sipariş detayı + OrderItems listesi (sadece kendi siparişi)
3. `POST /api/sales/orders/{id}/cancel` → Sipariş iptali:
   - Sadece `Status == "Pending"` olan siparişler iptal edilebilir
   - `Status = "Cancelled"` olarak güncelle
   - Başka birinin siparişine erişmeye çalışırsa `UnauthorizedAccessException`
4. `OrderDto` oluştur veya genişlet: `{ Id, OrderDate, Status, TotalAmount, Items[] }`

**Tamamlanma Kriteri:**
- Kullanıcı kendi siparişlerini listeleyip görebiliyor
- Sadece Pending siparişler iptal edilebiliyor
- Başkasının siparişine erişim 401/403 döndürüyor

---

## TASK-07: Shipping Modülü API

**Hedef:** Shipping'de sadece entity'ler var, hiç API yok. Tam API + otomatik shipment oluşturma ekle.

**Dosyalar:**
- `src/Modules/Shipping/MegaERP.Modules.Shipping.Api/Class1.cs` → sil
- YENİ: `src/Modules/Shipping/MegaERP.Modules.Shipping.Api/Controllers/ShipmentsController.cs`
- YENİ: `src/Modules/Shipping/MegaERP.Modules.Shipping.Api/Controllers/ShippingMethodsController.cs`
- YENİ: `src/Modules/Shipping/MegaERP.Modules.Shipping.Core/Features/` (Commands + Queries)
- YENİ: `src/Modules/Shipping/MegaERP.Modules.Shipping.Core/Events/CreateShipmentOnOrderPlacedHandler.cs`
- `src/Modules/Shipping/MegaERP.Modules.Shipping.Infrastructure/DependencyInjection.cs`

**Adımlar:**
1. ShippingMethods CRUD:
   - `GET /api/shipping/methods` → Liste
   - `POST /api/shipping/methods` → Oluştur (Name, Carrier, BaseCost)
   - `PUT /api/shipping/methods/{id}` → Güncelle
   - `DELETE /api/shipping/methods/{id}` → Sil
2. Shipments API:
   - `GET /api/shipping/shipments` → Liste (TenantId filtreli)
   - `GET /api/shipping/shipments/{id}` → Detay
   - `PUT /api/shipping/shipments/{id}/status` → Status güncelle (`InTransit`, `Delivered`, `Returned`)
3. `OrderPlacedEvent` handler oluştur:
   - `OrderId` alıp yeni `Shipment` oluştur
   - `TrackingNumber = $"TRK-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..8].ToUpper()}"`
   - `Status = "Pending"`, `EstimatedDeliveryDate = DateTime.UtcNow.AddDays(3)`
4. `DependencyInjection.cs`'e handler'ı kaydet

**Tamamlanma Kriteri:**
- Sipariş verilince otomatik shipment oluşuyor
- Shipment durumu güncellenebiliyor

---

## TASK-08: Billing Modülü API

**Hedef:** Billing'de event handler var (fatura otomatik oluşuyor) ama hiç API endpoint yok.

**Dosyalar:**
- `src/Modules/Billing/MegaERP.Modules.Billing.Api/Class1.cs` → sil
- YENİ: `src/Modules/Billing/MegaERP.Modules.Billing.Api/Controllers/InvoicesController.cs`
- YENİ: `src/Modules/Billing/MegaERP.Modules.Billing.Core/Features/Invoices/Queries/`
- YENİ: `src/Modules/Billing/MegaERP.Modules.Billing.Core/Features/Invoices/Commands/UpdateInvoiceStatusCommand.cs`
- YENİ: `src/Modules/Billing/MegaERP.Modules.Billing.Core/DTOs/InvoiceDto.cs`

**Adımlar:**
1. Endpoints:
   - `GET /api/billing/invoices` → Tenant'a ait faturalar listesi
   - `GET /api/billing/invoices/{id}` → Fatura detayı + InvoiceItems
   - `GET /api/billing/invoices/order/{orderId}` → Sipariş bazında fatura
   - `PUT /api/billing/invoices/{id}/status` → Status güncelle (`Paid`, `Cancelled`)
2. `InvoiceDto`: `{ Id, InvoiceNumber, OrderId, InvoiceDate, DueDate, TotalAmount, Status, Items[] }`
3. Tüm endpoint'ler `[Authorize]` ile korumalı

**Tamamlanma Kriteri:**
- Faturalar listelenebiliyor ve detayı görüntülenebiliyor
- Fatura durumu güncellenebiliyor (ödendi/iptal)

---

## TASK-09: HR Modülü API

**Hedef:** HR'da Department, Employee, LeaveRequest entity'leri var ama API yok.

**Dosyalar:**
- `src/Modules/HR/MegaERP.Modules.HR.Api/Class1.cs` → sil
- YENİ: Controllers/DepartmentsController.cs
- YENİ: Controllers/EmployeesController.cs
- YENİ: Controllers/LeaveRequestsController.cs
- YENİ: Core/Features/ (Commands + Queries her entity için)
- YENİ: Core/DTOs/ (DepartmentDto, EmployeeDto, LeaveRequestDto)

**Adımlar:**
1. Departments: `GET list`, `GET by id`, `POST`, `PUT`, `DELETE`
2. Employees:
   - `GET /api/hr/employees` → Liste
   - `GET /api/hr/employees/{id}` → Detay
   - `POST /api/hr/employees` → İşe al (FirstName, LastName, Email, Phone, HireDate, Salary, DepartmentId)
   - `PUT /api/hr/employees/{id}` → Güncelle
   - `DELETE /api/hr/employees/{id}` → İşten çıkar
3. LeaveRequests:
   - `POST /api/hr/leave-requests` → İzin talebi oluştur
   - `GET /api/hr/leave-requests` → Liste (employee bazında veya tümü)
   - `PUT /api/hr/leave-requests/{id}/approve` → Onayla
   - `PUT /api/hr/leave-requests/{id}/reject` → Reddet

**Tamamlanma Kriteri:**
- Tam çalışan yönetimi API'si mevcut
- İzin talepleri onaylanıp reddedilebiliyor

---

## TASK-10: Accounting Modülü API

**Hedef:** Accounting'de event handler var ama hiç endpoint yok. Muhasebe hesapları ve yevmiye API'si ekle.

**Dosyalar:**
- `src/Modules/Accounting/MegaERP.Modules.Accounting.Api/Class1.cs` → sil
- YENİ: Controllers/AccountingAccountsController.cs
- YENİ: Controllers/JournalEntriesController.cs
- YENİ: Core/Features/ (Commands + Queries)
- YENİ: Core/DTOs/

**Adımlar:**
1. AccountingAccounts (Hesaplar):
   - `GET /api/accounting/accounts` → Liste
   - `GET /api/accounting/accounts/{id}` → Detay + güncel Balance
   - `POST /api/accounting/accounts` → Hesap aç (Name, Code, Type)
   - `PUT /api/accounting/accounts/{id}` → Güncelle
2. JournalEntries (Yevmiye):
   - `GET /api/accounting/journal-entries` → Liste (opsiyonel: `?from=&to=` tarih filtresi)
   - `GET /api/accounting/journal-entries/{id}` → Detay
   - `POST /api/accounting/journal-entries` → Manuel kayıt (Date, Description, Debit, Credit, AccountId)

**Tamamlanma Kriteri:**
- Muhasebe hesapları yönetilebiliyor
- Yevmiye kayıtları listelenip oluşturulabiliyor

---

## TASK-11: RBAC - Rol Tabanlı Yetkilendirme

**Hedef:** Şu an sadece `[Authorize]` var, rol kontrolü yok. Admin/Manager/Employee/Customer rolleri ekle.

**Dosyalar:**
- `src/MegaERP.Host/Program.cs` (rol seed)
- `src/Modules/IAM/MegaERP.Modules.IAM.Infrastructure/Authentication/JwtProvider.cs`
- Tüm controller'lar

**Adımlar:**
1. Startup'ta rolleri seed et (yoksa oluştur): `Admin`, `Manager`, `Employee`, `Customer`
2. Default admin kullanıcıya (`canayan@megaerp.com`) `Admin` rolü ata
3. `JwtProvider`'a rol claim'lerini ekle:
   ```csharp
   var roles = await _userManager.GetRolesAsync(user);
   // claims'e ClaimTypes.Role ekle
   ```
4. Controller'lara rol kısıtlamaları:
   - Ecommerce GET endpoints → anonim (kaldır `[Authorize]`)
   - Ecommerce POST/PUT/DELETE → `[Authorize(Roles = "Admin,Manager")]`
   - Sales/Basket → `[Authorize]` (herhangi biri)
   - HR tümü → `[Authorize(Roles = "Admin,Manager")]`
   - Billing tümü → `[Authorize(Roles = "Admin,Manager")]`
   - Shipping tümü → `[Authorize(Roles = "Admin,Manager")]`
   - Accounting tümü → `[Authorize(Roles = "Admin")]`

**Tamamlanma Kriteri:**
- JWT token'da roller var
- Yetersiz rolle erişimde 403 Forbidden dönüyor
- Ürün listeleme herkese açık

---

## TASK-12: CORS + Rate Limiting + Güvenlik

**Hedef:** CORS yok, rate limiting yok, JWT secret hardcoded. Güvenliği iyileştir.

**Dosyalar:**
- `src/MegaERP.Host/Program.cs`
- `src/MegaERP.Host/appsettings.json`
- `src/Modules/IAM/MegaERP.Modules.IAM.Infrastructure/Authentication/JwtProvider.cs`

**Adımlar:**
1. CORS policy ekle:
   ```csharp
   builder.Services.AddCors(opt => opt.AddPolicy("Frontend", p =>
       p.WithOrigins("http://localhost:3000", "https://lonova.com")
        .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
   app.UseCors("Frontend");
   ```
2. Rate Limiting (ASP.NET Core built-in, .NET 7+ yerleşik):
   - Auth endpoints (`/api/iam/auth/*`): dakikada max 10 istek
   - Diğerleri: dakikada max 100 istek
   - Aşımda 429 Too Many Requests
3. Security Headers middleware ekle:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
4. `appsettings.json`'a gerçek bir JWT config ekle (placeholder key ile, hardcoded fallback'i kaldır)
5. Swagger'ı `app.Environment.IsDevelopment()` koşuluna al

**Tamamlanma Kriteri:**
- CORS hataları yok
- Rate limit aşımında 429
- JWT secret config'den okunuyor, kod içinde hardcoded yok

---

## TASK-13: Catalog Module — N-seviye Kategori Ağacı

**Hedef:** Kıyafet > Kadın > T-Shirt gibi sonsuz derinlikte kategori; her node'da slug, ikon, attribute şablonu.

**Dosyalar:**
- YENİ: `src/Modules/Catalog/MegaERP.Modules.Catalog.Core/` (Core katmanı)
- YENİ: `src/Modules/Catalog/MegaERP.Modules.Catalog.Infrastructure/` (DbContext + repo)
- YENİ: `src/Modules/Catalog/MegaERP.Modules.Catalog.Api/` (Controller)
- GÜNCELLENECEKLer: `MegaERP.Host.csproj`, `Program.cs`

**Adımlar:**
1. `Category` entity: `Id`, `Name`, `Slug`, `ParentId` (nullable), `Level`, `IconUrl`, `AttributeSchemaJson`, `IsActive`
2. `CatalogDbContext` → schema: `catalog`
3. `CatalogRepository` + recursive category tree sorgusu
4. `GET /api/catalog/categories` — tam ağaç (JSON tree)
5. `GET /api/catalog/categories/{slug}/tree` — alt ağaç
6. `POST/PUT/DELETE /api/catalog/categories` — Admin only
7. Host projesine DI kaydı + `EnsureCreated`

**Tamamlanma Kriteri:**
- `dotnet build` hatasız
- `GET /api/catalog/categories` → nested JSON tree dönüyor
- `POST /api/catalog/categories` → Admin JWT ile category oluşturuluyor

---

## TASK-14: Marketplace Module — Public Ürün Listesi ve Arama API

**Hedef:** Kimlik doğrulamasız çalışan public endpoint'ler; fiyat/marka/puan filtresi, sayfalama.

**Dosyalar:**
- YENİ: `src/Modules/Marketplace/MegaERP.Modules.Marketplace.Core/`
- YENİ: `src/Modules/Marketplace/MegaERP.Modules.Marketplace.Infrastructure/`
- YENİ: `src/Modules/Marketplace/MegaERP.Modules.Marketplace.Api/`

**Adımlar:**
1. `MarketplaceProductDto`: ürün + mağaza adı + min fiyat + puan alanları
2. `GET /api/marketplace/products?category=&minPrice=&maxPrice=&brand=&sort=&page=` → `[AllowAnonymous]`
3. `GET /api/marketplace/products/{slug}` — detay + tüm satıcılar
4. `GET /api/marketplace/categories` — public category tree (Catalog modülünden okur)
5. `OutputCache` middleware ile 60s response caching
6. Host'a DI kaydı

**Tamamlanma Kriteri:**
- JWT olmadan `GET /api/marketplace/products` çalışıyor
- Filtre parametreleri (category, minPrice, maxPrice, sort) işleniyor
- Sayfalama (page, pageSize) çalışıyor

---

## TASK-15: Alıcı Auth — Marketplace Kullanıcı Kaydı ve JWT

**Hedef:** Marketplace alıcıları firma kullanıcılarından ayrı; `BuyerUser` entity, kendi JWT scope'u.

**Dosyalar:**
- `src/Modules/IAM/` (BuyerUser entity genişletme)
- `src/Modules/Marketplace/` (auth endpoint'leri)

**Adımlar:**
1. `BuyerUser` entity: ayrı tablo `marketplace."BuyerUsers"` (Id, Email, PasswordHash, FirstName, LastName, IsActive)
2. `POST /api/marketplace/auth/register` — şifre hash, BuyerUser oluştur
3. `POST /api/marketplace/auth/login` — JWT döner, claim'de `scope: buyer`
4. `POST /api/marketplace/auth/refresh` — refresh token
5. Buyer-only endpoint'lere `scope: buyer` claim kontrolü

**Tamamlanma Kriteri:**
- Buyer register → login → JWT alıyor
- JWT claim'de `"scope": "buyer"` var
- Firma kullanıcısı buyer endpoint'lere erişemiyor

---

## TASK-16: Store (Mağaza) Modeli — Bir Tenant Çoklu Mağaza

**Hedef:** Tenant altında birden fazla Store; ürünler Store'a bağlı.

**Dosyalar:**
- `src/Modules/Ecommerce/` (Store entity, Product'a StoreId FK)
- `src/Modules/IAM/` (Store-Tenant ilişkisi)

**Adımlar:**
1. `Store` entity: `Id`, `TenantId`, `Name`, `Slug`, `LogoUrl`, `IsActive`
2. `Product`'a `StoreId` FK ekle
3. `GET/POST/PUT/DELETE /api/ecommerce/stores` (Admin/Manager)
4. Marketplace API ürün listesinde mağaza adı + slug dön
5. EF migration (EnsureCreated yeterli)

**Tamamlanma Kriteri:**
- Store CRUD çalışıyor
- Ürün oluştururken StoreId verilebiliyor
- Marketplace ürünlerinde mağaza bilgisi dönüyor

---

## TASK-17: WMS — Çoklu Depo ve Raf-Konum Hiyerarşisi

**Hedef:** Birden fazla depo, her depoda Zone > Aisle > Rack > Bin hiyerarşisi.

**Dosyalar:**
- YENİ: `src/Modules/WMS/MegaERP.Modules.WMS.Core/`
- YENİ: `src/Modules/WMS/MegaERP.Modules.WMS.Infrastructure/`
- YENİ: `src/Modules/WMS/MegaERP.Modules.WMS.Api/`

**Adımlar:**
1. Entity'ler: `Warehouse`, `Zone`, `Aisle`, `Rack`, `Bin`, `StockLocation` (ProductId, BinId, Quantity)
2. `StockMovement` entity: MovementType (In/Out/Transfer/Loss), ProductId, FromBinId?, ToBinId?, Quantity, Note
3. CRUD endpoint'ler: `/api/wms/warehouses`, `/zones`, `/bins`
4. `GET /api/wms/stock` — ürün bazlı stok durumu
5. `POST /api/wms/stock-movements` — stok hareketi kaydet
6. Minimum stok uyarısı: `MinStockLevel` eşiği geçince `StockAlert` oluştur

**Tamamlanma Kriteri:**
- Warehouse CRUD çalışıyor
- Stok hareketi kaydedilebiliyor
- Stok durumu endpoint'i doğru veri dönüyor

---

## TASK-18: WMS — Tedarikçi Yönetimi ve Satın Alma Siparişi (PO)

**Hedef:** Tedarikçi kaydı ve PO oluşturma/takip akışı.

**Dosyalar:**
- `src/Modules/WMS/` (Supplier, PurchaseOrder entity'leri)

**Adımlar:**
1. `Supplier` entity: Id, TenantId, Name, ContactEmail, ContactPhone, Address
2. `PurchaseOrder` entity + `PurchaseOrderItem` entity
3. PO durumu: `Draft > Sent > PartialReceived > Received > Cancelled`
4. `CRUD /api/wms/suppliers`
5. `CRUD /api/wms/purchase-orders`
6. `PUT /api/wms/purchase-orders/{id}/receive` — teslim al, StockMovement (In) otomatik oluşsun
7. `PUT /api/wms/purchase-orders/{id}/status` — durum güncelle

**Tamamlanma Kriteri:**
- Supplier CRUD çalışıyor
- PO oluşturulup durumu güncellenebiliyor
- PO teslim alındığında stok otomatik artıyor

---

## TASK-19: SiteBuilder — Sayfa ve Blok Modeli

**Hedef:** Firma sitesi için sayfa ve blok kayıtları; JSON tabanlı blok içeriği.

**Dosyalar:**
- YENİ: `src/Modules/SiteBuilder/MegaERP.Modules.SiteBuilder.Core/`
- YENİ: `src/Modules/SiteBuilder/MegaERP.Modules.SiteBuilder.Infrastructure/`
- YENİ: `src/Modules/SiteBuilder/MegaERP.Modules.SiteBuilder.Api/`

**Adımlar:**
1. `SitePage` entity: Id, StoreId, Slug, Title, IsPublished, CreatedAt
2. `PageBlock` entity: Id, PageId, BlockType, Order, ContentJson
3. `BlockType` enum: Hero, ProductGrid, About, FAQ, Contact, Custom
4. `CRUD /api/site-builder/pages`
5. `CRUD /api/site-builder/pages/{pageId}/blocks`
6. `GET /api/site-builder/render/{storeSlug}/{pageSlug}` — public, JSON döner, `[AllowAnonymous]`

**Tamamlanma Kriteri:**
- Sayfa ve blok CRUD çalışıyor
- Public render endpoint JWT gerektirmiyor
- ContentJson bloğun içeriğini taşıyor

---

## TASK-20: Swagger XML Dokümantasyonu — Tüm Controller'lar

**Hedef:** Her public endpoint'te `/// <summary>` yorumu; Swagger UI'da açıklamalar görünsün.

**Dosyalar:**
- Tüm `*Controller.cs` dosyaları
- `MegaERP.Host.csproj`

**Adımlar:**
1. `MegaERP.Host.csproj`'a `<GenerateDocumentationFile>true</GenerateDocumentationFile>` ekle
2. `SwaggerGen`'e `IncludeXmlComments(xmlPath)` ekle
3. Her controller action'a `/// <summary>`, `/// <param>`, `/// <returns>` ekle
4. Build + Swagger UI'da doğrula

**Tamamlanma Kriteri:**
- `dotnet build` XML üretiyor
- Swagger UI'da endpoint açıklamaları görünüyor

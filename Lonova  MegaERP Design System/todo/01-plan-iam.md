# IAM Modülü (Identity & Access Management)

Bu modül Odoo benzeri çok kiracılı yapının kalbidir.

## Yapılacaklar Listesi

- [ ] `MegaERP.Modules.IAM.Core` projesinin oluşturulması
  - [ ] `Tenant` entity'sinin yazılması (TenantId, Name, SubscriptionType)
  - [ ] `ApplicationUser` ve `ApplicationRole` (ASP.NET Core Identity) oluşturulması
- [ ] `MegaERP.Modules.IAM.Infrastructure` projesi oluşturulması
  - [ ] `IAMDbContext` oluşturulması (PostgreSQL)
  - [ ] EF Core mapping'leri
- [ ] `MegaERP.Modules.IAM.Api` projesinin oluşturulması (Controllers/Endpoints)
  - [ ] `/api/iam/tenants` (CRUD)
  - [ ] `/api/iam/auth/login` (JWT Provider)
  - [ ] `/api/iam/auth/register` (Yeni tenant veya kullanıcı)
- [ ] Shared Core projesi içindeki `ITenantService`'in implementasyonu (Mevcut HTTP Request'ten TenantId'yi çıkartmak için - örn: header'dan `X-Tenant-Id` veya sub-domain'den).

# MegaERP — Lonova E-Commerce Platform

Full-stack modular ERP + e-commerce system.
**Backend:** ASP.NET Core 10 · **Frontend:** Next.js 16 · **DB:** PostgreSQL

---

## Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend | ASP.NET Core 10, C# 13, .NET 10 |
| ORM | Entity Framework Core 10 + Npgsql 10 |
| Auth | ASP.NET Identity + JWT Bearer |
| CQRS | MediatR |
| Validation | FluentValidation |
| Frontend | Next.js 16 App Router, React 19, TypeScript |
| State | Zustand 5 |
| Styling | TailwindCSS 4 |
| Charts | Recharts 3 |
| Animations | Framer Motion 12 |
| Database | PostgreSQL 16 |

---

## Proje Yapısı

```
lonova-ecommerce-main/
├── src/
│   ├── MegaERP.Host/              # ASP.NET Core başlangıç noktası
│   ├── Shared/
│   │   ├── MegaERP.Shared.Core/           # Temel arayüzler, entity'ler
│   │   └── MegaERP.Shared.Infrastructure/ # BaseDbContext, repository, middleware
│   ├── Modules/
│   │   ├── IAM/          # Identity & Access Management (auth, tenants, users)
│   │   ├── Ecommerce/    # Ürünler ve kategoriler
│   │   ├── Sales/        # Sepet ve siparişler
│   │   ├── Shipping/     # Kargo yönetimi
│   │   ├── Billing/      # Fatura yönetimi
│   │   ├── HR/           # İnsan kaynakları
│   │   ├── Accounting/   # Muhasebe ve günlük defteri
│   │   └── CMS/          # İçerik yönetimi
│   └── mega-erp-web/     # Next.js 16 frontend
├── TASKS.md              # Backend görev listesi (tümü tamamlandı)
├── FRONTEND_TASKS.md     # Frontend görev listesi (tümü tamamlandı)
└── MegaERP.sln
```

Her modül üç katmandan oluşur: `Core` (entity/DTO/arayüz), `Infrastructure` (DbContext/repository), `Api` (controller).

---

## Kurulum

### Gereksinimler

- .NET 10 SDK (`snap install dotnet-sdk-100 --classic`)
- Node.js 20+
- PostgreSQL 16 (`sudo apt-get install postgresql`)

### 1. Veritabanı

```bash
sudo systemctl start postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### 2. Backend

```bash
# Proje kökünde
export DOTNET_ROOT=/snap/dotnet-sdk-100/current/usr/lib/dotnet
export PATH=$DOTNET_ROOT:$PATH

dotnet run --project src/MegaERP.Host/MegaERP.Host.csproj --urls "http://localhost:5000"
```

İlk çalıştırmada veritabanı ve tablolar otomatik oluşturulur (`EnsureCreated`).

### 3. Frontend

```bash
cd src/mega-erp-web
npm install --legacy-peer-deps
npm run dev
```

Frontend `http://localhost:3000` adresinde çalışır.

---

## API Endpoints

### IAM — `/api/iam`

| Method | Path | Açıklama | Auth |
|--------|------|----------|------|
| POST | `/auth/login` | Giriş yap, JWT döner | — |
| POST | `/auth/register` | Kayıt ol | — |
| GET | `/tenants` | Tenant listesi | Admin |

### E-Commerce — `/api/ecommerce`

| Method | Path | Açıklama | Auth |
|--------|------|----------|------|
| GET | `/products` | Ürün listesi | JWT |
| GET | `/products/{id}` | Ürün detay | JWT |
| POST | `/products` | Ürün ekle | Admin/Manager |
| PUT | `/products/{id}` | Ürün güncelle | Admin/Manager |
| DELETE | `/products/{id}` | Ürün sil | Admin/Manager |
| GET | `/categories` | Kategori listesi | JWT |
| POST | `/categories` | Kategori ekle | Admin/Manager |
| PUT | `/categories/{id}` | Kategori güncelle | Admin/Manager |
| DELETE | `/categories/{id}` | Kategori sil | Admin/Manager |

### Sales — `/api/sales`

| Method | Path | Açıklama | Auth |
|--------|------|----------|------|
| GET | `/basket` | Sepeti getir | JWT |
| POST | `/basket/items` | Ürün ekle | JWT |
| PUT | `/basket/items/{id}` | Miktar güncelle | JWT |
| DELETE | `/basket/items/{id}` | Ürün kaldır | JWT |
| DELETE | `/basket` | Sepeti temizle | JWT |
| POST | `/basket/checkout` | Sipariş oluştur | JWT |
| GET | `/orders` | Sipariş listesi | JWT |
| GET | `/orders/{id}` | Sipariş detay | JWT |
| POST | `/orders/{id}/cancel` | Sipariş iptal | JWT |

### Shipping — `/api/shipping`

| Method | Path | Açıklama | Auth |
|--------|------|----------|------|
| GET | `/shipments` | Kargo listesi | Admin/Manager |
| GET | `/shipments/{id}` | Kargo detay | Admin/Manager |
| PUT | `/shipments/{id}/status` | Durum güncelle | Admin/Manager |
| GET | `/shipping-methods` | Kargo yöntemleri | JWT |
| POST | `/shipping-methods` | Yöntem ekle | Admin |
| PUT | `/shipping-methods/{id}` | Yöntem güncelle | Admin |
| DELETE | `/shipping-methods/{id}` | Yöntem sil | Admin |

### Billing — `/api/billing`

| Method | Path | Açıklama | Auth |
|--------|------|----------|------|
| GET | `/invoices` | Fatura listesi | Admin/Manager |
| GET | `/invoices/{id}` | Fatura detay | Admin/Manager |
| GET | `/invoices/order/{orderId}` | Siparişe ait fatura | Admin/Manager |
| PUT | `/invoices/{id}/status` | Durum güncelle | Admin/Manager |

### HR — `/api/hr`

| Method | Path | Açıklama | Auth |
|--------|------|----------|------|
| GET | `/departments` | Departman listesi | Admin/Manager |
| POST | `/departments` | Departman ekle | Admin/Manager |
| PUT | `/departments/{id}` | Güncelle | Admin/Manager |
| DELETE | `/departments/{id}` | Sil | Admin/Manager |
| GET | `/employees` | Personel listesi | Admin/Manager |
| GET | `/employees/department/{id}` | Departmana göre | Admin/Manager |
| POST | `/employees` | Personel ekle | Admin/Manager |
| PUT | `/employees/{id}` | Güncelle | Admin/Manager |
| DELETE | `/employees/{id}` | Sil | Admin/Manager |
| GET | `/leave-requests` | İzin talepleri | Admin/Manager/Employee |
| POST | `/leave-requests` | İzin talebi oluştur | Admin/Manager/Employee |
| PUT | `/leave-requests/{id}/status` | Onayla/Reddet | Admin/Manager |
| DELETE | `/leave-requests/{id}` | Sil (sadece Pending) | Admin/Manager/Employee |

### Accounting — `/api/accounting`

| Method | Path | Açıklama | Auth |
|--------|------|----------|------|
| GET | `/accounts` | Hesap listesi | Admin/Manager |
| POST | `/accounts` | Hesap ekle | Admin/Manager |
| PUT | `/accounts/{id}` | Güncelle | Admin/Manager |
| DELETE | `/accounts/{id}` | Sil | Admin/Manager |
| GET | `/journal-entries` | Günlük defteri | Admin/Manager |
| GET | `/journal-entries/account/{id}` | Hesaba göre | Admin/Manager |
| POST | `/journal-entries` | Kayıt ekle | Admin/Manager |
| DELETE | `/journal-entries/{id}` | Sil | Admin/Manager |

---

## Frontend Sayfaları

| Sayfa | URL | Açıklama |
|-------|-----|----------|
| Giriş | `/auth/login` | JWT ile oturum açma |
| Kayıt | `/auth/register` | Yeni hesap oluşturma |
| Dashboard | `/dashboard` | Genel istatistikler + son 7 gün grafiği |
| Ürünler | `/dashboard/ecommerce` | Ürün listesi, arama, silme |
| Ürün Ekle | `/dashboard/ecommerce/new` | Yeni ürün formu |
| Ürün Düzenle | `/dashboard/ecommerce/[id]/edit` | Ürün düzenleme formu |
| Sepet | `/dashboard/basket` | Miktar kontrolü + ödeme |
| Siparişler | `/dashboard/orders` | Sipariş listesi + filtre |
| Sipariş Detay | `/dashboard/orders/[id]` | Detay + iptal butonu |
| İK | `/dashboard/hr` | Personel / departman / izin (3 sekme) |
| Kargo | `/dashboard/shipping` | Gönderi listesi + durum güncelle |
| Faturalar | `/dashboard/billing` | Fatura listesi + ödeme işaretle |
| Fatura Detay | `/dashboard/billing/[id]` | Kalemler + toplam hesabı |
| Muhasebe | `/dashboard/accounting` | Hesaplar + günlük defteri |

---

## Güvenlik

- **JWT Bearer** — 8 saatlik token, `ClaimTypes.Role` içerir
- **RBAC** — 4 rol: `Admin`, `Manager`, `Employee`, `Customer`
- **Rate Limiting** — `/api/iam/auth/*` 20 istek/dk, diğer API'ler 200 istek/dk
- **CORS** — `appsettings.json` → `Cors:AllowedOrigins` ile yapılandırılır
- **Security Headers** — `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- **Multi-Tenancy** — JWT'deki `tenantId` claim'i ile otomatik veri filtreleme

---

## Yapılandırma (`appsettings.json`)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=MegaERP;Username=postgres;Password=postgres"
  },
  "Jwt": {
    "Key": "super-secret-key",
    "Issuer": "MegaERP",
    "Audience": "MegaERP"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:3000"]
  }
}
```

---

## Mimari Notlar

- **Modüler Monolit** — Her modül kendi DbContext'ine sahip, ayrı PostgreSQL schema'sında (`iam`, `ecommerce`, `sales`, vb.)
- **CQRS (MediatR)** — Command/Query'ler Handler sınıflarıyla işlenir
- **Repository Pattern** — `BaseRepository<T, TContext>` generic temel sınıf
- **Next.js 16 proxy.ts** — `middleware.ts` yerine `proxy.ts` (Next.js 16.x breaking change), `export function proxy(...)` olarak dışa aktarılır
- **Token Persistence** — Login sırasında hem `localStorage` (Axios interceptor için) hem cookie (server-side proxy.ts için) yazılır

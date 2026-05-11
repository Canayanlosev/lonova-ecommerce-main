# MegaERP Frontend Geliştirme Görevleri

Otonom agent her oturumda bu dosyayı okur, ilk `[ ]` olan görevi uygular, `[x]` olarak işaretler, commit edip push'lar.

**Dizin:** `src/mega-erp-web/`  
**Tasarım Sistemi:** İndigo/mor palet, glass morphism, dark-first, Outfit font, premium-card/premium-button CSS sınıfları.  
**Kural:** Mevcut tasarım dilini koru. Yeni componentlar `premium-card`, `glass-panel`, `cn()`, Lucide icon, Framer Motion ile yazılır.

---

## Görev Listesi

- [ ] FTASK-01: API Service Katmanı & Axios Kurulumu
- [ ] FTASK-02: Zustand Store'lar (Auth + Basket)
- [ ] FTASK-03: Next.js Middleware - Route Koruma
- [ ] FTASK-04: Gerçek Login Akışı (Backend Entegrasyonu)
- [ ] FTASK-05: Toast Bildirimi & Error Boundary
- [ ] FTASK-06: Dashboard - Gerçek Veri & Chart
- [ ] FTASK-07: E-Commerce - Ürün Listesi & Detay Sayfası
- [ ] FTASK-08: E-Commerce - Ürün Ekle/Düzenle Formu
- [ ] FTASK-09: Sepet (Basket) Sayfası & Checkout
- [ ] FTASK-10: Siparişler (Orders) Sayfası
- [ ] FTASK-11: HR Yönetimi Sayfaları
- [ ] FTASK-12: Shipping (Kargo) Sayfaları
- [ ] FTASK-13: Billing (Fatura) Sayfaları
- [ ] FTASK-14: Mobil Navigation & Responsive Fixes
- [ ] FTASK-15: Loading Skeleton'lar & Boş Durum Ekranları

---

## FTASK-01: API Service Katmanı & Axios Kurulumu

**Hedef:** Axios yüklü ama hiç kullanılmıyor. JWT interceptor'lı merkezi API client oluştur.

**Dosyalar:**
- YENİ: `src/lib/api.ts` — Axios instance
- YENİ: `src/lib/services/auth.service.ts`
- YENİ: `src/lib/services/products.service.ts`
- YENİ: `src/lib/services/orders.service.ts`
- YENİ: `src/lib/services/basket.service.ts`
- YENİ: `src/lib/services/hr.service.ts`
- YENİ: `src/lib/services/billing.service.ts`
- YENİ: `src/lib/services/shipping.service.ts`
- YENİ: `src/types/api.types.ts` — Tüm tip tanımları
- YENİ: `src/app/.env.local` (örnek) → sadece `.env.local.example` yaz

**Adımlar:**
1. `src/lib/api.ts` oluştur:
   ```ts
   import axios from 'axios'
   const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000' })
   // Request interceptor: localStorage'dan token al, Authorization header ekle
   // Response interceptor: 401 gelirse localStorage temizle, /auth/login'e yönlendir
   export default api
   ```
2. `src/types/api.types.ts` — Backend DTO'larına uyan tipler:
   - `LoginRequest`, `LoginResponse` (token, user info)
   - `Product`, `Category`, `ProductVariant`
   - `Order`, `OrderItem`
   - `BasketItem`
   - `Invoice`, `InvoiceItem`
   - `Employee`, `Department`, `LeaveRequest`
   - `Shipment`, `ShippingMethod`
3. Her service dosyası: `api.get/post/put/delete` çağrıları — controller endpoint'leriyle eşleşmeli (TASKS.md'deki route'lar baz alınarak)
4. `.env.local.example`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

**Tamamlanma Kriteri:**
- `api` instance JWT header'ı otomatik ekliyor
- Her modül için service fonksiyonları hazır
- Tipler tüm sayfalarda kullanılabilir

---

## FTASK-02: Zustand Store'lar (Auth + Basket)

**Hedef:** Zustand yüklü ama hiç store yok. Auth ve Basket global state'ini oluştur.

**Dosyalar:**
- YENİ: `src/store/auth.store.ts`
- YENİ: `src/store/basket.store.ts`
- YENİ: `src/store/ui.store.ts`

**Adımlar:**
1. `auth.store.ts`:
   ```ts
   interface AuthState {
     token: string | null
     user: { id, email, firstName, lastName, tenantId, roles } | null
     isAuthenticated: boolean
     login: (token, user) => void
     logout: () => void
   }
   ```
   - `persist` middleware ile localStorage'a kaydet (token + user)
   - `login` → localStorage'a token yaz, state güncelle
   - `logout` → localStorage temizle, state sıfırla
2. `basket.store.ts`:
   ```ts
   interface BasketState {
     items: BasketItem[]
     itemCount: number
     setItems: (items) => void
     addItem: (item) => void
     removeItem: (productId) => void
     clear: () => void
   }
   ```
3. `ui.store.ts`:
   ```ts
   interface UIState {
     sidebarOpen: boolean
     toggleSidebar: () => void
     toasts: Toast[]
     addToast: (toast) => void
     removeToast: (id) => void
   }
   ```

**Tamamlanma Kriteri:**
- Auth state persist ile localStorage'a kaydediliyor
- Store'lar diğer görevlerde import edilebilir halde

---

## FTASK-03: Next.js Middleware - Route Koruma

**Hedef:** Tüm `/dashboard/*` rotaları korumalı olmalı. Token yoksa login'e yönlendir.

**Dosyalar:**
- YENİ: `src/middleware.ts` (proje kökü değil, `src/` altında)

**Adımlar:**
1. `middleware.ts` oluştur:
   ```ts
   import { NextResponse } from 'next/server'
   import type { NextRequest } from 'next/server'

   export function middleware(request: NextRequest) {
     const token = request.cookies.get('auth-token')?.value
     const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
     const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')

     if (isDashboard && !token) {
       return NextResponse.redirect(new URL('/auth/login', request.url))
     }
     if (isAuthPage && token) {
       return NextResponse.redirect(new URL('/dashboard', request.url))
     }
     return NextResponse.next()
   }

   export const config = {
     matcher: ['/dashboard/:path*', '/auth/:path*']
   }
   ```
2. Login başarılı olunca token'ı hem `localStorage` hem cookie'ye yaz (middleware cookie okuyabilir, client-side localStorage okuyamaz)
3. Logout'ta cookie'yi de temizle

**Tamamlanma Kriteri:**
- Token olmadan `/dashboard` açılmaya çalışılınca `/auth/login`'e yönleniyor
- Giriş yapılmışken `/auth/login`'e gidilince dashboard'a yönleniyor

---

## FTASK-04: Gerçek Login Akışı (Backend Entegrasyonu)

**Hedef:** Login sayfası şu an 2 sn simülasyon yapıyor. Gerçek `/api/iam/auth/login` çağrısına bağla.

**Dosyalar:**
- `src/app/auth/login/page.tsx` — güncelle
- `src/store/auth.store.ts` — import et
- `src/lib/services/auth.service.ts` — import et

**Adımlar:**
1. Form submit'te `authService.login(email, password)` çağır
2. Başarılı → `authStore.login(token, user)` → token'ı cookie'ye de yaz → `/dashboard`'a yönlendir
3. Hata → mevcut tasarımla uyumlu kırmızı hata mesajı göster (yeni input altına inline)
4. Loading state: mevcut spinner animasyonu koru
5. Form validation: email format kontrolü, password min 6 karakter (client-side, submit öncesi)
6. `Register` linki çalışsın → `/auth/register` sayfasına yönlendirsin
7. YENİ: `src/app/auth/register/page.tsx` oluştur:
   - Aynı tasarım dili (glass panel, premium-card)
   - FirstName, LastName, Email, Password alanları
   - `authService.register(...)` çağrısı

**Tamamlanma Kriteri:**
- Gerçek backend ile login çalışıyor
- Hatalı kimlik bilgisinde hata gösteriliyor
- Başarılı login'de dashboard'a yönleniyor

---

## FTASK-05: Toast Bildirimi & Error Boundary

**Hedef:** Hiç hata yönetimi yok. Global toast sistemi ve React Error Boundary ekle.

**Dosyalar:**
- YENİ: `src/components/ui/Toast.tsx`
- YENİ: `src/components/ui/ToastContainer.tsx`
- YENİ: `src/components/ErrorBoundary.tsx`
- `src/app/layout.tsx` — ToastContainer ekle
- `src/store/ui.store.ts` — toast store (FTASK-02'de oluşturuldu)

**Adımlar:**
1. `Toast.tsx` — mevcut tasarım diliyle:
   - Tipler: `success` (yeşil border), `error` (kırmızı border), `warning` (sarı border), `info` (indigo border)
   - `glass-panel` + Framer Motion `AnimatePresence` ile slide-in/out animasyon
   - 4 saniye sonra auto-dismiss
   - X butonu ile manuel kapatma
   - Lucide icon: CheckCircle/XCircle/AlertTriangle/Info
2. `ToastContainer.tsx` — sağ alt köşe, fixed konumlu, z-50
3. `ErrorBoundary.tsx` — class component, hata yakalanınca premium-card içinde hata mesajı + "Yeniden Dene" butonu
4. Root layout'a `<ToastContainer />` ekle
5. `useToast()` hook: `ui.store.ts`'teki `addToast` wrap'le

**Tamamlanma Kriteri:**
- `useToast().success('Kaydedildi')` çağrısı sağ altta animasyonlu bildirim gösteriyor
- Hata durumlarında kırmızı toast görünüyor

---

## FTASK-06: Dashboard - Gerçek Veri & Chart

**Hedef:** Dashboard sayfası mock data kullanıyor, chart placeholder boş. Gerçek veriye bağla.

**Dosyalar:**
- `src/app/dashboard/page.tsx` — güncelle
- YENİ: `src/components/charts/SalesChart.tsx`
- `src/lib/services/orders.service.ts` — getDashboardStats fonksiyonu

**Adımlar:**
1. NuGet değil npm: `npm install recharts` (Next.js ile uyumlu, lightweight)
2. Backend'den veri çek (useEffect + axios):
   - Son 30 günün siparişleri → toplam satış, sipariş sayısı
   - Aktif kullanıcı sayısı (varsa endpoint yoksa mock koru)
3. `SalesChart.tsx`:
   - Recharts `AreaChart` veya `LineChart`
   - Mevcut indigo (`--primary`) renk paleti
   - Dark mode uyumlu (stroke/fill için CSS variable kullan)
   - Responsive (`ResponsiveContainer width="100%"`)
   - Son 7 günlük sipariş verisi
4. Stat kartları: gerçek veri gelince güncelle, gelene kadar loading skeleton göster (FTASK-15 öncesi için basit pulse animasyonu yeter)
5. Recent transactions: backend'den son 5 sipariş (GET /api/sales/orders)
6. Mevcut fade-in animasyonunu koru

**Tamamlanma Kriteri:**
- Dashboard'da gerçek sipariş sayıları görünüyor
- Chart render oluyor (en azından mock veriyle bile olsa)

---

## FTASK-07: E-Commerce - Ürün Listesi & Detay Sayfası

**Hedef:** E-Commerce nav linki `#` işaret ediyor. Ürün listesi ve detay sayfaları oluştur.

**Dosyalar:**
- YENİ: `src/app/dashboard/ecommerce/page.tsx` — Ürün listesi
- YENİ: `src/app/dashboard/ecommerce/[id]/page.tsx` — Ürün detay
- YENİ: `src/components/products/ProductCard.tsx`
- YENİ: `src/components/products/ProductTable.tsx`
- `src/app/dashboard/layout.tsx` — nav linkini güncelle

**Adımlar:**
1. `ProductTable.tsx` — mevcut tasarımla:
   - `premium-card` içinde tablo
   - Sütunlar: SKU, Ad, Kategori, Fiyat, Stok, İşlemler
   - Düzenle (PencilLine icon) + Sil (Trash2 icon) butonları
   - Arama input'u (Name veya SKU'ya göre client-side filtre)
   - "Yeni Ürün Ekle" butonu (premium-button, indigo)
2. Ürün listesi page'i: `GET /api/ecommerce/products` → tablo
3. Ürün detay page'i (`/dashboard/ecommerce/[id]`):
   - Ürün bilgileri (premium-card)
   - Variant'lar listesi (ayrı card)
   - "Düzenle" butonu → edit sayfasına git (FTASK-08)
4. Loading durumu: tablo satırları için skeleton satırlar
5. Sidebar linkini güncelle: `href="/dashboard/ecommerce"`

**Tamamlanma Kriteri:**
- Ürünler listeleniyor, aranabiliyor
- Ürün detayına tıklanınca detay sayfası açılıyor

---

## FTASK-08: E-Commerce - Ürün Ekle/Düzenle Formu

**Hedef:** Ürün oluşturma ve düzenleme formu. Mevcut tasarım diliyle.

**Dosyalar:**
- YENİ: `src/app/dashboard/ecommerce/new/page.tsx`
- YENİ: `src/app/dashboard/ecommerce/[id]/edit/page.tsx`
- YENİ: `src/components/products/ProductForm.tsx` (paylaşımlı form)

**Adımlar:**
1. `ProductForm.tsx` — tek form, hem create hem edit için:
   - Ad, Açıklama (textarea), Baz Fiyat, SKU alanları
   - Kategori seçimi (GET /api/ecommerce/categories → dropdown)
   - Variant ekle bölümü: dinamik liste (Ekle/Kaldır satırı), her satırda Ad, SKU, Fiyat Farkı, Stok
   - Kaydet ve İptal butonları (premium-button)
   - Tüm input'lar: dark mode uyumlu stil, focus:ring indigo
2. Edit sayfası: `GET /api/ecommerce/products/{id}` → form pre-fill
3. Submit: create → `POST`, edit → `PUT` → başarıda toast + liste sayfasına yönlendir
4. Client-side validation: zorunlu alanlar, fiyat > 0
5. Framer Motion ile form alanları staggered fade-in

**Tamamlanma Kriteri:**
- Yeni ürün oluşturulabiliyor
- Mevcut ürün düzenlenebiliyor
- Başarıda toast bildirimi ve yönlendirme

---

## FTASK-09: Sepet (Basket) Sayfası & Checkout

**Hedef:** Basket API var (TASKS.md TASK-05 sonrası), frontend sayfası yok.

**Dosyalar:**
- YENİ: `src/app/dashboard/basket/page.tsx`
- YENİ: `src/components/basket/BasketItem.tsx`
- `src/app/dashboard/layout.tsx` — sepet icon'u navbar'a ekle (badge ile)
- `src/store/basket.store.ts` — güncelle

**Adımlar:**
1. Navbar'a sepet icon'u ekle:
   - ShoppingCart (Lucide) — indigo renk
   - Ürün sayısı badge (kırmızı, küçük yuvarlak)
   - Tıklanınca `/dashboard/basket`'e git
2. Basket sayfası:
   - Sol: ürün listesi (`BasketItem` componentları)
   - Sağ: sipariş özeti card'ı (toplam tutar, "Ödemeye Geç" butonu)
   - Her item: ürün adı, birim fiyat, quantity +/- butonları, sil butonu
   - Boşsa: sepet icon'u + "Sepetiniz boş" mesajı (FTASK-15'ten önce basit versiyon)
3. Sayfa açılınca `GET /api/sales/basket` → store güncelle
4. Quantity değişince `PUT /api/sales/basket/items/{id}` çağır
5. "Ödemeye Geç" → `POST /api/sales/basket/checkout` → başarıda orderId al, `/dashboard/orders/{id}` sayfasına git

**Tamamlanma Kriteri:**
- Sepet listeleniyor, miktarlar değiştirilebiliyor
- Checkout çalışıyor ve sipariş oluşuyor

---

## FTASK-10: Siparişler (Orders) Sayfası

**Hedef:** Siparişler listesi ve detay sayfası.

**Dosyalar:**
- YENİ: `src/app/dashboard/orders/page.tsx`
- YENİ: `src/app/dashboard/orders/[id]/page.tsx`
- `src/app/dashboard/layout.tsx` — sidebar linkini güncelle

**Adımlar:**
1. Siparişler listesi:
   - `GET /api/sales/orders` → premium-card içinde tablo
   - Sütunlar: Sipariş No, Tarih, Toplam, Durum (renkli badge), İşlemler
   - Durum badge renkleri: Pending=sarı, Paid=yeşil, Shipped=indigo, Cancelled=kırmızı (mevcut --primary palet uyumlu)
   - Filtre: dropdown ile status filtresi
2. Sipariş detay sayfası (`/dashboard/orders/[id]`):
   - Sipariş bilgileri (premium-card)
   - Sipariş kalemleri tablosu
   - "İptal Et" butonu (sadece Pending'de görünür, kırmızı outline)
   - İptal onayı: modal veya confirm dialog

**Tamamlanma Kriteri:**
- Siparişler listeleniyor, filtrelenebiliyor
- Detay sayfasında kalemler görünüyor
- Pending siparişler iptal edilebiliyor

---

## FTASK-11: HR Yönetimi Sayfaları

**Hedef:** Sidebar'da HR Management var ama `#` işaret ediyor.

**Dosyalar:**
- YENİ: `src/app/dashboard/hr/page.tsx` — Çalışanlar listesi
- YENİ: `src/app/dashboard/hr/departments/page.tsx`
- YENİ: `src/app/dashboard/hr/leave-requests/page.tsx`
- YENİ: Tab navigasyonu component (HR içi sekme geçişi)
- `src/app/dashboard/layout.tsx` — sidebar linkini güncelle

**Adımlar:**
1. HR ana sayfası — 3 sekme tab navigation ile:
   - **Çalışanlar** (varsayılan): tablo — Ad Soyad, Email, Departman, Maaş, İşe Giriş Tarihi, İşlemler
   - **Departmanlar**: basit liste — Ad, Açıklama, Çalışan Sayısı
   - **İzin Talepleri**: tablo — Çalışan, Başlangıç/Bitiş, Sebep, Durum (badge), Onayla/Reddet butonları
2. Tab navigation: mevcut tasarımla — aktif tab altı indigo çizgili veya indigo arka plan
3. "Çalışan Ekle" modal veya yeni sayfa
4. İzin onayı/reddi: tek tıkla API çağrısı + toast

**Tamamlanma Kriteri:**
- 3 sekme çalışıyor
- Çalışanlar listeleniyor, eklenebiliyor
- İzin talepleri onaylanıp reddedilebiliyor

---

## FTASK-12: Shipping (Kargo) Sayfaları

**Hedef:** Sidebar'da Shipping & Logistics var ama bağlı değil.

**Dosyalar:**
- YENİ: `src/app/dashboard/shipping/page.tsx` — Kargolar listesi
- YENİ: `src/app/dashboard/shipping/methods/page.tsx` — Kargo yöntemleri
- `src/app/dashboard/layout.tsx` — sidebar linkini güncelle

**Adımlar:**
1. Kargolar listesi:
   - `GET /api/shipping/shipments` → tablo
   - Sütunlar: Takip No, Sipariş ID, Gönderim Tarihi, Tahmini Teslimat, Durum (renkli badge)
   - Durum güncelle: tıklanınca dropdown (InTransit / Delivered / Returned)
2. Kargo Yöntemleri sayfası:
   - `GET /api/shipping/methods` → card grid
   - Her kart: Kargo firması adı, temel ücret, düzenle/sil butonları
   - "Yeni Yöntem" ekle formu (modal veya inline)
3. Shipment detay: tracking timeline (Pending → InTransit → Delivered adımları, aktif adım indigo renkli)

**Tamamlanma Kriteri:**
- Kargolar listeleniyor, durum güncellenebiliyor
- Kargo yöntemleri yönetilebiliyor

---

## FTASK-13: Billing (Fatura) Sayfaları

**Hedef:** Sidebar'da Billing & Accounting var, fatura yönetim sayfası yok.

**Dosyalar:**
- YENİ: `src/app/dashboard/billing/page.tsx` — Faturalar listesi
- YENİ: `src/app/dashboard/billing/[id]/page.tsx` — Fatura detay

**Adımlar:**
1. Faturalar listesi:
   - `GET /api/billing/invoices` → premium-card tablo
   - Sütunlar: Fatura No, Sipariş ID, Tarih, Vade, Tutar, KDV, Durum (badge), Detay butonu
   - Durum badge: Draft=gri, Issued=indigo, Paid=yeşil, Cancelled=kırmızı
   - "Ödendi" işaretle butonu (sadece Issued durumdakiler için)
2. Fatura detay sayfası:
   - Üstte fatura başlığı (No, Tarih, Durum)
   - Fatura kalemleri tablosu (Açıklama, Adet, Birim Fiyat, KDV Oranı, Toplam)
   - Alt toplam / KDV / Genel toplam özeti
   - "Ödendi Olarak İşaretle" butonu

**Tamamlanma Kriteri:**
- Faturalar listeleniyor
- Detay sayfasında kalemler ve toplamlar görünüyor
- Fatura durumu güncellenebiliyor

---

## FTASK-14: Mobil Navigation & Responsive Fixes

**Hedef:** Sidebar mobilde gizleniyor ama hamburger menu yok. Mobil kullanım kırık.

**Dosyalar:**
- `src/app/dashboard/layout.tsx` — güncelle
- `src/store/ui.store.ts` — `sidebarOpen` state
- YENİ: `src/components/ui/MobileNav.tsx`

**Adımlar:**
1. Navbar'a hamburger menu ekle (Menu icon, Lucide) — sadece `lg:hidden`
2. Tıklayınca `ui.store.sidebarOpen` toggle
3. Mobil sidebar: `fixed inset-0 z-50`, arka planda `backdrop-blur-sm` overlay
4. Framer Motion `AnimatePresence` ile slide-in (soldan) animasyon
5. Overlay'e tıklayınca kapat
6. Tüm sayfalarda responsive kontrol:
   - Tablolar: mobilde horizontal scroll (`overflow-x-auto`)
   - Stat kartları: mobilde 2x2 grid (şu an 4x1 olabilir)
   - Dashboard chart: min-height belirle

**Tamamlanma Kriteri:**
- Mobilde hamburger menu çalışıyor
- Sidebar slide animasyonla açılıp kapanıyor
- Tablolar mobilde scroll'lanabiliyor

---

## FTASK-15: Loading Skeleton'lar & Boş Durum Ekranları

**Hedef:** Veri yüklenirken boş ekran, hata durumu ve gerçek boş liste durumu için UI ekle.

**Dosyalar:**
- YENİ: `src/components/ui/Skeleton.tsx`
- YENİ: `src/components/ui/EmptyState.tsx`
- Tüm liste sayfaları — skeleton entegrasyonu

**Adımlar:**
1. `Skeleton.tsx`:
   - `animate-pulse` + mevcut border-color (dark mode uyumlu)
   - `SkeletonRow` (tablo satırı), `SkeletonCard` (stat card) varyantları
2. `EmptyState.tsx`:
   - Lucide icon (PackageOpen, UserX, FileX vb.) — büyük, gri
   - Başlık + açıklama metni
   - Opsiyonel "Ekle" CTA butonu (premium-button)
   - Framer Motion fade-in
3. Her liste sayfasına entegre et:
   - Yükleniyor → Skeleton satırlar
   - Hata → kırmızı hata mesajı + "Tekrar Dene" butonu
   - Boş → EmptyState component
4. Basket boş durumu: büyük ShoppingCart icon + "Alışverişe Başla" butonu

**Tamamlanma Kriteri:**
- Hiçbir sayfa yüklenirken boş/kopuk görünmüyor
- Veri yokken anlamlı boş durum ekranı var
- Hata durumunda kullanıcıya açıklama ve aksiyon sunuluyor

# MegaERP - Frontend Durum Takibi (State)

Bu dosya, projeye daha sonra geri dönüldüğünde frontend tarafında nerede kaldığımızı hatırlamak için oluşturulmuştur.

## 🟢 Neler Yaptık?
- **Frontend İskeleti:** Next.js 15 (App Router), TypeScript ve Tailwind CSS kullanılarak `src/mega-erp-web` altında oluşturuldu.
- **Tasarım Standartları:** `todo/FRONTEND-STANDARDS.md` dosyası oluşturularak renk paleti, tipografi ve bileşen kuralları belirlendi.
- **UI Kütüphanesi:** Lucide React, Zustand ve Framer Motion entegre edildi.
- **Temel Bileşenler:** Premium tasarıma sahip `Button` ve `Card` bileşenleri atomic yapıda oluşturuldu.
- **Auth UI:** Login sayfası (`/auth/login`) modern bir tasarımla tamamlandı.
- **Dashboard:** Sidebar ve Header içeren yönetim paneli iskeleti ve istatistik sayfası (`/dashboard`) hazırlandı.
- **Veri Senkronizasyonu:** Backend ile konuşacak temel `axios` yapısı hazır.
- **Ayağa Kaldırma:** Backend (`localhost:5221`) ve Frontend (`localhost:3000`) başarıyla çalıştırıldı.

## 🟢 Sistem Bilgileri
- **Admin Kullanıcı:** `canayan@megaerp.com`
- **Şifre:** `67890memo`
- **Backend URL:** `http://localhost:5221`
- **Frontend URL:** `http://localhost:3000`

## 🟡 Nerede Kaldık? (Sıradaki İşlem)
1. **Veri Yönetimi:** Zustand store'ları ile kullanıcı oturumu (Auth State) ve Tenant bilgilerinin global yönetimi sağlanacak.
2. **CRUD İşlemleri:** Dashboard içindeki modüller için dinamik veri listeleme ve düzenleme sayfaları oluşturulacak.
3. **Form Validasyonları:** `react-hook-form` ve `zod` entegrasyonu ile formlar güvenli hale getirilecek.
4. **Hata Yönetimi:** API tarafındaki hata kodlarına göre kullanıcı dostu uyarı bildirimleri (`sonner` veya `toast`) eklenecek.

## 🔴 Genel Notlar
- Projenin büyüklüğü göz önüne alındığında, Frontend'in de modüler (Micro-frontend veya modüler component yapısı) olması tavsiye edilir.
- CMS, SaaS Admin Paneli ve E-Ticaret Arayüzleri birbirinden ayrı uygulamalar veya tek bir Monorepo içinde ayrı workspace'ler olarak kurgulanabilir.

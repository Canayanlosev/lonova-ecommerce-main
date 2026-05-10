# MegaERP Frontend Standartları ve Mimari Yapısı

Bu döküman, MegaERP projesinin frontend tarafındaki görsel ve yapısal bütünlüğünü sağlamak için uyulması gereken kuralları içerir.

## 🎨 Tasarım Sistemi (Design System)

Tüm renkler ve görsel öğeler merkezi CSS değişkenleri (`vars.css`) üzerinden yönetilecektir.

### 🌈 Renk Paleti (Premium Dark/Light)
- **Primary:** `#6366f1` (Indigo Vivid) - Aksiyonlar ve vurgular için.
- **Secondary:** `#a855f7` (Purple) - İkincil vurgular için.
- **Background:** 
  - Dark: `#0f172a` (Slate 900)
  - Light: `#f8fafc` (Slate 50)
- **Surface (Cards/Modals):** 
  - Dark: `rgba(30, 41, 59, 0.7)` (Glassmorphism desteği ile)
  - Light: `rgba(255, 255, 255, 0.8)`
- **Border:** `rgba(255, 255, 255, 0.1)` (Dark), `rgba(0, 0, 0, 0.1)` (Light)

### 🔠 Tipografi
- **Font:** `Inter` veya `Outfit` (Google Fonts).
- **H1-H6:** Yüksek kontrastlı, bold ve modern.
- **Body:** Okunabilirliği yüksek, slate-400 (dark) veya slate-600 (light).

## 🧱 Bileşen Standartları (Components)

### 💳 Kartlar (Cards)
- **Border Radius:** `16px` (XL).
- **Background:** Glassmorphism (`backdrop-filter: blur(12px)`).
- **Shadow:** Subtle glow (Primary color tabanlı hafif bir dış ışıma).
- **Hover:** Hafif yükselme (`transform: translateY(-4px)`) ve border parlaklığı.

### 🖱️ Butonlar
- **Radius:** `12px`.
- **Transitions:** `0.3s ease-in-out`.
- **Effects:** Hover durumunda gradient kayması veya glow efekti.

## 🏗️ Mimari Yapı (Next.js 15 + App Router)

```text
src/Web/
├── app/                  # Sayfalar ve Routing (App Router)
├── components/           # UI Bileşenleri
│   ├── ui/               # Atomik bileşenler (Button, Input, Card)
│   ├── shared/           # Ortak kullanılan büyük bileşenler (Sidebar, Navbar)
│   └── modules/          # Modül bazlı bileşenler (Ecommerce, Accounting vb.)
├── core/                 # İş mantığı
│   ├── hooks/            # Custom React Hooks
│   ├── services/         # API servisleri (Axios/Fetch wrapper)
│   ├── store/            # State Management (Zustand)
│   └── utils/            # Helper fonksiyonlar
├── styles/               # Global CSS ve Design Tokens
└── types/                # TypeScript tanımlamaları
```

## 📏 Kodlama Kuralları
1. **DRY (Don't Repeat Yourself):** Aynı görsel öğe 2'den fazla yerde kullanılıyorsa `components/ui` altına taşınmalıdır.
2. **Atomic Design:** Bileşenler en küçük parçadan (atom) büyük parçalara doğru inşa edilmelidir.
3. **Responsive First:** Tasarım her zaman mobil öncelikli olmalı, Tailwind'in `md:`, `lg:` breakpointleri tutarlı kullanılmalıdır.
4. **Icons:** `Lucide React` kütüphanesi standart olarak kullanılacaktır.

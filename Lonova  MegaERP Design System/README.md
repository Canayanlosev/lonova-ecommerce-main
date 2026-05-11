# Lonova / MegaERP Design System

> **A premium, modular design system for a multi‑tenant ERP + E‑commerce platform.**
> Indigo · Purple · Glassmorphism · Dark‑first, Light‑aware · Built on Next.js 15 + Tailwind v4

---

## Brand at a glance

**Lonova** is the commercial brand. **MegaERP** is the underlying engineering/product platform — a modular, multi‑tenant ERP ecosystem combining a back‑office (Accounting, HR, Billing, Shipping, Inventory) with a customer‑facing E‑commerce storefront. Tenants are first‑class: every domain entity is tenant‑scoped, every UI surface is brandable per tenant.

The product positioning is summarized in the marketing copy as *"Modern, modüler ve devasa ölçeklenebilir kurumsal backend gücünü, premium kullanıcı deneyimi ile birleştiren yeni nesil ERP ekosistemi"* — i.e. *enterprise backend power packaged in a premium UI*. The tagline jokes about being *"Odoo'nun Babası"* (Odoo's father) — a confident, slightly cheeky reference point.

### Surfaces represented in this system

| Surface | Audience | Primary mode |
| --- | --- | --- |
| **Marketing site** (`/`) | Prospects, leads | Dark, hero + module grid |
| **Auth** (`/auth/login`) | All users | Light/dark, centered card |
| **Dashboard / Admin panel** (`/dashboard/*`) | Tenant admins, employees | Dark, sidebar + workspace |
| **Storefront** (e‑commerce, projected) | End customers | Light, product‑first |

> The e‑commerce **storefront** is implied by backend modules (Products, Categories, Basket, Orders, Shipping, Invoices) but does not yet have a dedicated route in `src/mega-erp-web/`. This system extrapolates the storefront from the admin's visual language so the brand stays consistent on both sides of the same database.

---

## Sources

All visual + tone decisions are derived from real code, not screenshots.

- **GitHub repo:** `Canayanlosev/lonova-ecommerce-main` (default branch `main`)
  - `src/mega-erp-web/` — Next.js 15 + Tailwind v4 frontend (the visual source of truth)
    - `src/app/globals.css` — Tailwind v4 `@theme` tokens, `.premium-card`, `.premium-button`, `.glass-panel`
    - `tailwind.config.ts` — color/radius/animation extensions
    - `src/app/page.tsx`, `auth/login/page.tsx`, `dashboard/*` — the four canonical screens
    - `src/components/ui/Button.tsx`, `Card.tsx` — atomic component contracts
  - `todo/FRONTEND-STANDARDS.md` — explicit design system charter (palette, type, components, architecture)
  - `todo/00-STATE-BACKEND.md`, `todo/00-STATE-FRONTEND.md` — current product state
  - `TASKS.md` — full module + API roadmap (IAM, Ecommerce, Sales, Shipping, Billing, HR, Accounting)

Imported files are mirrored under `src/mega-erp-web/` in this project for reference.

---

## Index — what's in this folder

```
README.md                  ← you are here
SKILL.md                   ← agent-skill manifest (drop into Claude Code)
colors_and_type.css        ← all design tokens (colors, type, radii, shadows)
fonts/                     ← (Inter via Google Fonts — see Type)
assets/                    ← logos, wordmarks, illustrations, background glows
preview/                   ← 700×N preview cards for the Design System tab
ui_kits/
  admin/                   ← MegaERP back-office (dashboard, login, modules)
    index.html             ← interactive click-thru of the admin app
    README.md
    *.jsx                  ← Sidebar, Header, StatCard, DataTable, FormField, ...
  storefront/              ← Lonova consumer e-commerce surface
    index.html             ← interactive click-thru of the storefront
    README.md
    *.jsx                  ← ProductCard, CategoryRail, BasketDrawer, Checkout, ...
src/mega-erp-web/          ← imported source from the GitHub repo (read-only reference)
```

---

## Content fundamentals

**Language.** Turkish‑first. All product copy, navigation labels, and CTAs ship in Turkish. English is reserved for **module names and code‑adjacent terms** (Dashboard, E‑Commerce, Accounting, HR Management, Inventory, Shipping, IAM & Auth, Billing). This bilingual rhythm — Turkish prose + English nouns — is the brand's signature voice.

**Tone.** Confident, modern, slightly playful. Marketing copy leans on big words ("devasa", "premium", "yeni nesil", "ekosistem") without becoming corporate. Internal copy (dashboard, forms) is short and operational.

**Person.** Formal second person in user-facing copy (*"Hoş Geldiniz"*, *"Giriş yapın"*, *"Hesabınız yok mu?"*). Never "sen". UI labels are imperative or noun‑form, never first‑person.

**Casing.** Headlines use **Sentence case** in Turkish (`Hoş Geldiniz`, `Genel Bakış`, `Son İşlemler`) — Turkish convention, not Title Case. Module names borrowed from English keep their English Title Case (`E-Commerce`, `HR Management`). Buttons are Sentence case (`Giriş Yap`, `Hemen Başlayın`, `Dokümantasyon`).

**Numbers and money.** Turkish locale: `₺124,500` (comma as thousands), `%24` (percent sign **before** the number, Turkish style), dates as `dd.mm.yyyy`.

**Microcopy examples** (lifted from the codebase):

- Hero: *"Modern, modüler ve devasa ölçeklenebilir kurumsal backend gücünü, premium kullanıcı deneyimi ile birleştiren yeni nesil ERP ekosistemi."*
- Login: *"MegaERP ekosistemine giriş yapın"* / *"Hesabınız yok mu? Kayıt Olun"*
- Dashboard: *"MegaERP sistemindeki son durum ve istatistikler."*
- Empty state: *"Grafik yükleniyor..."* (ellipsis, lowercase verb)
- Footer: *© 2026 MegaERP Ecosystem. "Odoo'nun Babası" Mimari Yapı.* — a wink, in quotes

**Emoji.** Used **only in internal docs and TODOs** (🟢🟡🔴 status, 🎨🔠🧱 section headers) — never in product UI. Product UI uses Lucide icons exclusively.

**Punctuation.** No Oxford comma (Turkish). Triple‑dot ellipsis for in‑progress states. Em‑dashes are rare; commas do the work.

---

## Visual foundations

### Color — Premium Dark/Light

The system is **dark‑first** (hero, dashboard, marketing all default to a near‑black `#06080f` canvas) with a fully spec'd **light** mirror. Switching is a `class="dark"` toggle on `<html>`.

| Role | Light | Dark | Notes |
| --- | --- | --- | --- |
| **Primary** | `#6366f1` (Indigo 500) | `#6366f1` | The brand color. Used on the wordmark, primary CTAs, active nav, focus rings. |
| **Secondary** | `#a855f7` (Purple 500) | `#a855f7` | Accents, secondary actions, occasional gradient pair with primary. |
| **Background** | `#f8fafc` (Slate 50) | `#06080f` (near‑black) | The dark canvas is **darker than Slate 900** — closer to pure black with a hint of slate. |
| **Surface** | `#ffffff` | `#0f172a` (Slate 900) | Cards, modals, sidebars. |
| **Surface (glass)** | `rgba(255,255,255,0.8)` | `rgba(30,41,59,0.7)` | Glassmorphism — used on sidebars, headers, panels stacked over the glow. |
| **Border** | `#e2e8f0` (Slate 200) | `#1e293b` (Slate 800) | Hairline. Glass surfaces use `rgba(255,255,255,0.1)`. |
| **Foreground** | `#0f172a` | `#f8fafc` | Body text. |
| **Muted fg** | Slate‑500 | Slate‑400 | Subheads, helper copy. |
| **Success** | `#10b981` (Emerald 500) | same | Positive deltas (`+12%`), paid invoices. |
| **Warning** | `#f97316` (Orange 500) | same | New orders, pending states. |
| **Danger** | `#ef4444` (Red 500) | same | Destructive actions, logout icon. |

**Color vibe.** Cool, electric, slightly mysterious. Indigo + purple atop near‑black with **soft purple/indigo glow** behind the hero (a `1000×600px` blob with `blur(120px)`, 10% opacity). Imagery and surfaces stay neutral — color is reserved for primary actions and the glow.

### Type

- **Family.** `Inter` (primary) with `Outfit` as a permitted alternate. Both via Google Fonts. The repo uses Next's default font loader; we substitute Inter explicitly in this system. **Substitution flagged below.**
- **Scale.** Heavy use of **`font-black` (900)** for headlines — the brand's signature is the gradient‑clipped `font-black tracking-tighter` hero. Body is regular (400) or medium (500).
- **Tracking.** Headlines use `tracking-tighter` (-0.05em) to give the big-and-bold feel. Body is default.
- **Gradient text.** Hero uses `bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent` — a vertical white→slate fade on the headline. Always paired with `font-black`.

### Spacing and rhythm

- Tailwind default scale (4px base). Page padding is `px-6 lg:px-12`, content max width is `max-w-7xl`.
- Sections breathe: `py-20` between marketing sections, `py-12` for footer.
- Stat cards and form fields use `space-y-2`/`space-y-4` for vertical rhythm.

### Radii

- **`rounded-xl` (16px / `1rem`)** — cards, panels. The brand radius.
- **`rounded-2xl` (1.5rem)** — login card, logo lockup, big illustrative blocks.
- **`rounded-xl` (12px on buttons)** — primary CTAs.
- **`rounded-lg` (8px)** — nav items, small chips.
- **`rounded-full`** — avatars, notification dots, pill badges.

### Shadows + glow

- Cards: no resting shadow. **Hover** lifts with `transform: translateY(-4px)` + a primary‑tinted box‑shadow (`0 10px 25px -5px rgba(99,102,241,0.1)`).
- Primary buttons: resting `shadow-2xl shadow-indigo-500/40` on hero CTAs; hover boosts to `0 10px 15px -3px rgba(99,102,241,0.25)`.
- The hero **glow** (`bg-indigo-500/10 blur(120px)`) is the system's most distinctive shadow effect — used behind hero text and login cards.
- Active nav items get a colored glow: `shadow-lg shadow-indigo-500/30`.

### Borders

- 1px hairlines. `border-slate-200` (light) / `border-slate-800` (dark).
- Glass surfaces: `border-white/10`.
- Focus rings on inputs: `ring-2 ring-indigo-500/50`.

### Backgrounds

- Solid near‑black `#06080f` in dark, slate‑50 in light. **No textures, no patterns, no photography in chrome.**
- One signature motif: a single huge **blurred color blob** positioned absolutely behind hero/login content. Indigo at 10% opacity. This is *the* brand signature.
- Glass panels (sidebar, header) sit on `rgba(255,255,255,0.5)` / `rgba(15,23,42,0.5)` with `backdrop-filter: blur(12px)` so the blob bleeds through.

### Cards

`.premium-card` is the canonical pattern:

- `background: var(--color-surface)` (white / slate‑900)
- `border: 1px solid var(--color-border)`
- `border-radius: 16px`
- `backdrop-filter: blur(12px)`
- `padding: 1.5rem`
- `transition: all 0.3s ease-in-out`
- **Hover:** border brightens to 30%‑primary, lifts 4px, glow shadow appears
- Stat cards add `hover:scale-[1.02]` for an extra micro‑zoom

### Buttons

`.premium-button` foundation + variant overlay:

- `border-radius: 0.75rem` (12px)
- `padding: 0.625rem 1.5rem`
- `font-weight: 500–600`
- `transition: all 0.3s ease-in-out`
- **Primary:** indigo‑600 bg, white fg, hover darkens 20%
- **Secondary:** purple‑600 bg
- **Outline:** 2px indigo border, indigo fg, light hover bg
- **Ghost:** slate fg, hover gets slate‑100/800 bg
- **Active state:** `transform: scale(0.95)` — a satisfying press

### Forms

- Inputs: `rounded-xl`, 1px border (slate‑200/800), `bg-white` / `bg-slate-900/50`, **leading icon** at `left-3 top-3` (5×5 slate‑400). Focus is `ring-2 ring-indigo-500/50` with `outline-none`.
- Labels: `text-sm font-medium ml-1` above the field.
- Helper links: `text-xs text-indigo-500 hover:underline`, placed on the right of the label row (e.g. "Şifremi Unuttum").

### Motion

- Global transition: `0.3s ease-in-out` on most interactive elements.
- Tailwind keyframes defined: `fade-in` (0.5s ease-out), `slide-up` (translateY(20px)+opacity).
- Loading spinner: Lucide `Loader2` with `animate-spin`.
- Active press: `scale(0.95)`. Hover lift on cards: `translateY(-4px)`.
- **No bouncy easings.** No `cubic-bezier(...)` overshoot. Motion is calm, single‑curve.

### Hover + press

- **Hover (button):** background darkens 20% and a primary‑tinted shadow appears.
- **Hover (card):** lifts 4px, border picks up primary at 30%, soft glow underneath.
- **Hover (nav item):** background fills with slate‑100/800, icon color shifts to primary.
- **Hover (icon‑on‑card):** the `w-12 h-12 rounded-xl bg-indigo-500/10` chip flips to solid `bg-indigo-500` with white icon — a small but signature interaction.
- **Press:** `scale(0.95)`.

### Transparency + blur

Used purposefully, not decoratively:
- **Chrome surfaces** (sidebar, header): translucent + `backdrop-blur-xl` so the page glow shows through.
- **Glass panels** (modals, occasional callouts): 10% white over `backdrop-filter: blur(20px)`.
- **Glow blobs:** large radial color washes at 10% opacity, `blur(100-120px)`.

### Layout rules

- **Sidebar:** `w-64` (256px), full height, fixed, glass background. Hidden below `lg`.
- **Header:** `h-16` (64px), glass, sticky behavior implied. Splits left (title) / right (notif + user chip).
- **Content area:** `p-8 overflow-auto`, no max‑width inside dashboard.
- **Marketing:** `max-w-7xl mx-auto px-6 py-20`.
- **Stat grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`.
- **Module grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8`.

### Imagery treatment

The codebase ships **no product photography or illustration** yet. The visual identity rests on **type + color + glow**. If/when imagery is added, follow these rules:
- Cool color cast (indigo/purple tint, never warm orange/red).
- Subtle grain acceptable; heavy texture is not.
- Product photos for the storefront should be on white/neutral seamless, with the same rounded‑xl crop as cards.

---

## Iconography

**Library: [Lucide React](https://lucide.dev)** — explicitly mandated in `todo/FRONTEND-STANDARDS.md`. Used everywhere in product UI.

**Style.** Lucide's default stroke style: 2px outlines, rounded caps/joins, no fills, square corners on rectangles. Crisp and uniform.

**Sizing.**
- Inline with text: `w-4 h-4` (16px).
- Form field icons: `w-5 h-5` (20px).
- Nav items: `size={20}` passed via React.cloneElement.
- Card header icons: `w-6 h-6` (24px) inside a `w-12 h-12 rounded-xl` chip.
- Hero / brand mark: `w-8 h-8` (32px) inside a `w-16 h-16 rounded-2xl` chip.

**Color rules.**
- Icons inherit text color by default.
- On primary buttons → white.
- In nav (inactive) → `text-slate-400`, hover → `text-indigo-500`.
- Destructive (logout, delete) → `text-red-500`.
- Status icons: emerald (success), orange (warning), red (danger), indigo (info).

**Icon containers.** A recurring brand pattern is icon‑in‑chip:

```jsx
<div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500
                flex items-center justify-center
                group-hover:bg-indigo-500 group-hover:text-white
                transition-all duration-300">
  <Icon className="w-6 h-6" />
</div>
```

The hover flip from tinted‑bg/colored‑fg to solid‑bg/white‑fg is the brand's interaction signature.

**Emoji.** **Not used in product UI.** Internal docs may use status emoji (🟢🟡🔴). The product surface is icon‑only.

**Unicode symbols.** None. `→ ← ↑ ↓ ✓ ✗` are all drawn with Lucide (`ArrowRight`, `Check`, `X`, etc.).

**Logos.** No raster logo files exist in the repo. The "logo" is a typographic wordmark — `font-black tracking-tighter` "MegaERP" with the version number in indigo, or the standalone wordmark in `text-indigo-500`. We provide an SVG wordmark in `assets/` matching this treatment.

---

## Font substitution flag

⚠️ **No font files are shipped in the source repo.** `FRONTEND-STANDARDS.md` specifies *Inter or Outfit (Google Fonts)*. This system loads **Inter** from Google Fonts via `@import` in `colors_and_type.css`. **If you have an official Inter or Outfit `.woff2` file you'd like to vendor, drop it into `fonts/` and replace the `@import` line.** Until then, Google Fonts CDN is the source.

---

## Quick start

```html
<link rel="stylesheet" href="colors_and_type.css">
<!-- Now use design tokens: -->
<div style="background: var(--color-surface); color: var(--color-fg);
            border-radius: var(--radius-xl); padding: var(--space-6);">
  <h1 style="font: var(--type-display)">Hoş Geldiniz</h1>
</div>
```

See `preview/` for working examples of every token in context, and `ui_kits/` for full screen recreations.

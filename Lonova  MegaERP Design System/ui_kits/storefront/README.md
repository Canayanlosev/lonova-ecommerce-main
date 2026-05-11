# Lonova Storefront · UI Kit

The consumer-facing storefront. Light surface, bold black-and-indigo typography, plenty of negative space. Tenants spin up their own storefront over this template.

## Surfaces
- **Home** — hero, category strip, featured products, value props, footer
- **Product Detail** — gallery, variant picker, add-to-cart, reviews summary
- **Cart Drawer** — line items, promo input, subtotal
- **Checkout** — single-page address + payment

## Components (JSX)
| File | Role |
| --- | --- |
| `Tokens.jsx`     | shared atoms — `Pill`, `Button`, `IconBtn`, helpers |
| `Icons.jsx`      | lucide-style inline icon set (shared from admin shape) |
| `Header.jsx`     | sticky top nav + mini-cart trigger |
| `Hero.jsx`       | full-bleed editorial hero |
| `Products.jsx`   | `ProductCard`, `ProductGrid`, `CategoryStrip` |
| `PDP.jsx`        | product detail page |
| `Cart.jsx`       | side drawer |
| `Checkout.jsx`   | single-page checkout |
| `Footer.jsx`     | mega-footer |
| `App.jsx`        | click-through host (Home ↔ PDP ↔ Cart ↔ Checkout) |

## Fidelity contract
Image slots use deterministic gradients keyed off the product id — no external image dependency. Replace with real CDN urls in production.

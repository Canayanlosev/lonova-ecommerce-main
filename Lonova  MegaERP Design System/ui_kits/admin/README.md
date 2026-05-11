# MegaERP Admin · UI Kit

The back-office. Multi-tenant admin panel for tenant operators and employees. Dark-first with a glass sidebar + header sitting over a soft indigo glow.

## Surfaces

- **Marketing landing** — public hero + module grid (the `/` route in `src/mega-erp-web`)
- **Auth · Login** — single centered card with leading-icon inputs
- **Dashboard · Overview** — 4-up stat grid + recent transactions + chart placeholder
- **E-Commerce · Products** — searchable data table with row actions
- **HR · Employees** — directory list with avatars + leave-request panel

## Components (JSX)

Each is a small, mostly cosmetic recreation lifted from `src/mega-erp-web` and recomposed:

| File | Role |
| --- | --- |
| `Primitives.jsx` | `Card`, `Button`, `Input`, `Badge`, `IconChip` — the atoms |
| `Chrome.jsx` | `Sidebar`, `Header`, `UserChip` — workspace shell |
| `Marketing.jsx` | `Hero`, `ModuleCard`, `ModuleGrid`, `Footer` — landing |
| `Auth.jsx` | `LoginCard` |
| `Dashboard.jsx` | `StatCard`, `RecentTransactions`, `ChartPlaceholder` |
| `Products.jsx` | `ProductTable`, `Toolbar` |
| `HR.jsx` | `EmployeeList`, `LeaveRequestPanel` |
| `App.jsx` | The click-thru host |

## Fidelity contract

These are **visual recreations**, not production components. Buttons don't navigate to real routes, forms don't post, tables are static. The goal is pixel-fidelity so the kit reads as MegaERP, not as a generic admin.

If you need real behavior, copy the JSX into your codebase and wire it to your data layer.

## Source of truth

- `src/mega-erp-web/src/app/auth/login/page.tsx`
- `src/mega-erp-web/src/app/dashboard/layout.tsx`
- `src/mega-erp-web/src/app/dashboard/page.tsx`
- `src/mega-erp-web/src/app/page.tsx`
- `src/mega-erp-web/src/components/ui/{Button,Card}.tsx`
- `todo/FRONTEND-STANDARDS.md`

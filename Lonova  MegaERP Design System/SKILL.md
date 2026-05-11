---
name: lonova-megaerp-design
description: Use this skill to generate well-branded interfaces and assets for the Lonova / MegaERP platform — a multitenant ERP back-office (MegaERP) and consumer e-commerce storefront (Lonova). Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping or production work.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

This is a **dual-product** system. Read `README.md` first for the high-level context, then decide which product you're designing for:

- **MegaERP Admin** (back-office, dark surface, indigo accent) → see `ui_kits/admin/`
- **Lonova Storefront** (consumer e-commerce, light surface, indigo+purple accent) → see `ui_kits/storefront/`

Shared foundations:
- `colors_and_type.css` — semantic CSS variables (colors, type, radii, spacing). Use these tokens; do not invent new ones.
- `preview/` — small card specimens of each token group; great for picking the right value.
- `assets/` — wordmarks. Note: both brands ship with per-tenant logo upload slots — when designing a tenant view, draw a placeholder upload slot, not the default mark.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets and components out and create static HTML files for the user to view. If working on production code (e.g. Next.js inside the original repo), use the README, the JSX components, and the CSS tokens as your source of truth.

If the user invokes this skill without any other guidance, ask:
1. Which product surface? (MegaERP admin / Lonova storefront / something new on the platform)
2. Are you mocking a single screen, a flow, or a full feature?
3. Production code or throwaway prototype?

Then act as an expert designer who outputs HTML artifacts or production code, depending on the need.

**Non-negotiables:**
- Multitenant by default. Logos, primary colors, and brand names are tenant-configurable; design for the *empty* and *customized* states.
- Turkish-first copywriting (the platform's primary market). Mixed Turkish/English technical labels are normal.
- Dark-first for admin; light-first for storefront. Do not blend the two surfaces.

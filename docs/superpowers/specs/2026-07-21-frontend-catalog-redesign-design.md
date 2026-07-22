# Frontend UI/UX Redesign — Pizza Catalog

Date: 2026-07-21
Scope: `frontend/` only. No backend, API, model, or data changes.

## Goal

PGH-Pizza lets people catalog Pittsburgh pizza places. The current frontend is
functional but reads as a generic admin dashboard: system font (Arial), a
9-column spreadsheet as the primary browsing surface, and a table-to-stacked-rows
mobile hack. There is no restaurant photo data anywhere in the model, so the
redesign has to create personality through type, color, and custom graphic
motifs rather than photography.

## Visual identity

- **Type pairing**: `Fraunces` (display serif, warm/artisanal, used for
  headings and display numbers) + `Inter` (humanist sans, used for body/UI
  text), loaded via a Google Fonts `<link>` in `frontend/src/index.html`.
  Replaces the current Arial/Helvetica system stack everywhere.
- **Palette**: extend, don't replace, the existing CSS custom properties in
  `frontend/src/styles.css`. Keep tomato red / gold / cream. Deepen maroon
  slightly for contrast. Add one new token, a muted basil green
  (`--accent-basil`), used sparingly for tags, success states, and to break up
  red-dominant screens.
- **Motifs**:
  - A small inline SVG pizza-slice mark used next to the navbar brand and as a
    loading indicator.
  - A circular "score stamp" badge component for ratings: the number inside a
    color-coded ring (gold ring ≥ 8, red ring 6–7.9, muted ring < 6). Used
    anywhere an `overallRating` is displayed.

## New shared components

Added under `frontend/src/app/shared/`:

1. **`score-badge`** — presentational component. Input: numeric score (and
   optionally a size variant). Renders the circular stamp with tier-based
   color. Used on rating cards and rating detail/edit contexts.
2. **`rating-card`** — presentational component. Input: a `Rating`. Renders
   restaurant name, location, score badge, affordability indicator, sauce /
   toppings / crust as tag chips, comments excerpt, contributor byline, and a
   slot/inputs for edit/remove actions (owner-only, mirrors current
   `canManage` logic which stays in the page component).
3. **Tag chip style** — a shared CSS class (`.tag-chip`), not a component,
   for sauce/crust/topping labels wherever they appear.

These are presentational only — no HTTP calls, no state beyond `@Input`s —
consistent with how the app currently keeps data-fetching in page components
and services.

## Page-by-page treatment

- **Home** (`src/home/`): hero and feature-strip restyled with the new type
  scale and motifs. Copy unchanged.
- **Ratings** (`pages/ratings/`): the `<table>` is replaced with a responsive
  CSS grid of `rating-card`s. Filter panel kept and restyled to match. Loading
  / empty / error states redesigned as styled panels instead of table rows.
  This is the main visual and structural change in the redesign and directly
  replaces the existing `@media (max-width: 640px)` table→stacked-rows hack
  in `styles.css`, since cards are naturally responsive.
- **Rating form** (`pages/rating-form/`): shared design-system upgrade only
  (inputs, buttons, panel) — same field structure and validation, restyled.
- **Blog list** (`pages/blog-list/`): existing `post-card` grid restyled to
  match the new type/color system; structure unchanged.
- **Blog detail / Blog form**: shared design-system upgrade.
- **Contributors** (`pages/contributors/`): table replaced with a card grid
  (avatar/initials, display name, rating count, blog post count) for
  consistency with the catalog feel.
- **About** (`src/app/about-me/`): typographic refresh only, content
  unchanged.
- **Apply, Login, Password reset (request/confirm), Profile, Admin
  applications**: shared design-system upgrade via the existing shared CSS
  classes (`.button`, `.field`, `.form-panel`, `.status`, `.table-wrap`,
  etc.) in `styles.css`. No bespoke layout changes — these pages inherit the
  visual lift centrally, keeping risk low since none of their functional
  markup changes.
- **Navbar**: restyled with new type/color, adds the pizza-slice mark next to
  the brand.

## Non-goals / explicit exclusions

- No backend, API contract, DTO, or database changes.
- No new data fields (e.g. no photo uploads) — everything above works with
  the current `Rating`, `BlogPost`, and contributor models as-is.
- No new libraries/UI frameworks — plain Angular templates + component CSS,
  consistent with the current codebase (no Angular Material, no Tailwind).
- Admin/auth/profile pages do not get bespoke layout redesigns, only the
  shared style upgrade described above.

## Testing / verification

- Existing component spec files (`contributors-page.component.spec.ts`,
  `ratings-page.component.spec.ts`, `navbar.spec.ts`, `app.spec.ts`) must
  keep passing — they assert on component logic/DOM structure, so any
  selector-dependent assertions touched by the markup changes need updating
  alongside the templates.
- `ng test` run at the end to confirm no regressions.
- Manual check via `npm start` (dev server) covering: ratings grid with
  filters, empty state, a rating card's owner-only actions, blog list,
  contributors grid, home page, and mobile width (~375px) for the ratings
  grid and navbar.

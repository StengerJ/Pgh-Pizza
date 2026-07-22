# Frontend Catalog Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the PGH-Pizza Angular frontend so the pizza catalog reads as a real catalog (card-based, illustrated, warm) instead of a generic admin-dashboard spreadsheet, without touching the backend, API, or data model.

**Architecture:** Extend the existing CSS-custom-property design system in `frontend/src/styles.css` (new fonts, a basil accent, tag-chip style) rather than replacing it. Add two new small presentational shared components (`ScoreBadge`, `RatingCard`) under `frontend/src/app/shared/`. Replace the Ratings and Contributors pages' `<table>` markup with responsive card grids built from those components. Every other page inherits the new type/color system automatically through the shared global classes (`.button`, `.field`, `.form-panel`, `.status`, `.table-wrap`, `.content-block`) it already uses.

**Tech Stack:** Angular 20 (standalone components, `@if`/`@for` control flow, signals), plain component CSS (no Tailwind/Material), Karma + Jasmine for unit tests, Google Fonts (Fraunces + Inter) via `index.html`.

## Global Constraints

- Frontend only (`frontend/`). No changes to `backend/`, API contracts, DTOs, or the database — per spec `docs/superpowers/specs/2026-07-21-frontend-catalog-redesign-design.md`.
- No new npm dependencies / UI frameworks. Plain Angular templates + component CSS only.
- Follow existing naming conventions: standalone components, class names without a `Component` suffix for `shared/` components (e.g. `Navbar`, not `NavbarComponent`), selector prefix `app-`.
- Every existing spec file that currently passes must keep passing (updated to match new markup where the markup it asserts on intentionally changed).
- Run `npm test -- --watch=false` from `frontend/` to execute the suite (Angular's karma builder auto-selects a headless Chrome run when `--watch=false` is passed; no `karma.conf.js` override exists in this repo).
- Run `npm run build` from `frontend/` to verify the app compiles when a task has no unit-testable logic (pure CSS/markup changes).

---

### Task 1: Design tokens, fonts, and shared base styles

**Files:**
- Modify: `frontend/src/index.html`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Produces: CSS custom properties `--font-display`, `--font-body`, `--accent-basil`, `--soft-basil`, `--palette-basil` on `:root`, a global `.tag-chip` / `.tag-chip.value-chip` class, and a global `box-shadow` on `.content-block`. All later tasks (2–9) rely on these existing.

This task has no unit-testable logic — it's fonts and CSS variables. Verification is a successful build plus the existing test suite staying green (no template selectors change here).

- [ ] **Step 1: Run the existing test suite to record the baseline**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS (all existing specs green). Note the pass count so later tasks can compare.

- [ ] **Step 2: Add Google Fonts to `frontend/src/index.html`**

Replace the `<head>` block:

```html
<head>
  <meta charset="utf-8">
  <title>PGH Pizza | Pittsburgh Pizza Ratings, Reviews, and Blog</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="PGH Pizza, also known as PGH-Pizza, is a Pittsburgh pizza ratings, reviews, and blog community tracking local slices, shops, and contributor posts.">
  <meta name="robots" content="index, follow">
  <meta property="og:site_name" content="PGH Pizza">
  <meta property="og:title" content="PGH Pizza | Pittsburgh Pizza Ratings, Reviews, and Blog">
  <meta property="og:description" content="Track Pittsburgh pizza ratings, reviews, blog posts, and community contributor picks on PGH-Pizza.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://pghpizza.org/">
  <meta property="og:image" content="https://pghpizza.org/PghPizza.png">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
</head>
```

with:

```html
<head>
  <meta charset="utf-8">
  <title>PGH Pizza | Pittsburgh Pizza Ratings, Reviews, and Blog</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="PGH Pizza, also known as PGH-Pizza, is a Pittsburgh pizza ratings, reviews, and blog community tracking local slices, shops, and contributor posts.">
  <meta name="robots" content="index, follow">
  <meta property="og:site_name" content="PGH Pizza">
  <meta property="og:title" content="PGH Pizza | Pittsburgh Pizza Ratings, Reviews, and Blog">
  <meta property="og:description" content="Track Pittsburgh pizza ratings, reviews, blog posts, and community contributor picks on PGH-Pizza.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://pghpizza.org/">
  <meta property="og:image" content="https://pghpizza.org/PghPizza.png">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap"
    rel="stylesheet"
  >
</head>
```

- [ ] **Step 3: Extend the design tokens in `frontend/src/styles.css`**

Replace the `:root` block (lines 1–21):

```css
:root {
  --palette-red: #d93240;
  --palette-maroon: #8c2029;
  --palette-gold: #f29f05;
  --palette-bright-red: #d92525;
  --palette-dark: #400f0f;

  --accent-red: var(--palette-red);
  --accent-maroon: var(--palette-maroon);
  --accent-yellow: var(--palette-gold);
  --accent-bright-red: var(--palette-bright-red);
  --background: #fff8eb;
  --border: rgba(64, 15, 15, 0.16);
  --ink: var(--palette-dark);
  --muted: rgba(64, 15, 15, 0.72);
  --on-accent: #fffdf8;
  --soft-red: rgba(217, 50, 64, 0.1);
  --soft-gold: rgba(242, 159, 5, 0.18);
  --surface: #fffdf8;
  --shadow: 0 18px 40px rgba(64, 15, 15, 0.16);
}
```

with:

```css
:root {
  --palette-red: #d93240;
  --palette-maroon: #6f1620;
  --palette-gold: #f29f05;
  --palette-bright-red: #d92525;
  --palette-dark: #400f0f;
  --palette-basil: #4c7a4a;

  --accent-red: var(--palette-red);
  --accent-maroon: var(--palette-maroon);
  --accent-yellow: var(--palette-gold);
  --accent-bright-red: var(--palette-bright-red);
  --accent-basil: var(--palette-basil);
  --background: #fff8eb;
  --border: rgba(64, 15, 15, 0.16);
  --ink: var(--palette-dark);
  --muted: rgba(64, 15, 15, 0.72);
  --on-accent: #fffdf8;
  --soft-red: rgba(217, 50, 64, 0.1);
  --soft-gold: rgba(242, 159, 5, 0.18);
  --soft-basil: rgba(76, 122, 74, 0.14);
  --surface: #fffdf8;
  --shadow: 0 18px 40px rgba(64, 15, 15, 0.16);
  --font-display: 'Fraunces', Georgia, 'Times New Roman', serif;
  --font-body: 'Inter', Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 4: Switch body/heading typography to the new fonts**

Replace:

```css
body {
  background: var(--background);
  color: var(--ink);
  font-family: Arial, Helvetica, sans-serif;
  margin: 0;
  min-height: 100%;
}
```

with:

```css
body {
  background: var(--background);
  color: var(--ink);
  font-family: var(--font-body);
  margin: 0;
  min-height: 100%;
}

h1,
h2,
h3,
h4 {
  font-family: var(--font-display);
}
```

- [ ] **Step 5: Add the shared `.tag-chip` style and a `box-shadow` on `.content-block`**

Find this block:

```css
.profile-link:hover {
  text-decoration: underline;
}

.content-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
}
```

Replace it with:

```css
.profile-link:hover {
  text-decoration: underline;
}

.tag-chip {
  background: var(--soft-gold);
  border-radius: 999px;
  color: var(--ink);
  display: inline-flex;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 6px 12px;
}

.tag-chip.value-chip {
  background: var(--soft-basil);
  color: var(--palette-dark);
}

.content-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 24px;
}
```

- [ ] **Step 6: Verify the app still builds and the suite is still green**

Run: `cd frontend && npm run build`
Expected: build succeeds with no errors.

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS, same pass count as the Step 1 baseline (pure CSS/token changes shouldn't change any assertion).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/index.html frontend/src/styles.css
git commit -m "Add Fraunces/Inter fonts and extend design tokens for catalog redesign"
```

---

### Task 2: `ScoreBadge` shared component

**Files:**
- Create: `frontend/src/app/shared/score-badge/score-badge.ts`
- Create: `frontend/src/app/shared/score-badge/score-badge.html`
- Create: `frontend/src/app/shared/score-badge/score-badge.css`
- Test: `frontend/src/app/shared/score-badge/score-badge.spec.ts`

**Interfaces:**
- Consumes: nothing (pure presentational component).
- Produces: `ScoreBadge` class, selector `app-score-badge`, inputs `score: number` (required) and `label: string` (default `'Overall'`). Renders a circular badge whose CSS class is `tier-high` (score ≥ 8), `tier-mid` (6 ≤ score < 8), or `tier-low` (score < 6). Task 3 (`RatingCard`) imports and uses this component.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/shared/score-badge/score-badge.spec.ts`:

```typescript
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoreBadge } from './score-badge';

describe('ScoreBadge', () => {
  let fixture: ComponentFixture<ScoreBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoreBadge],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();

    fixture = TestBed.createComponent(ScoreBadge);
  });

  it('should format the score to one decimal place', () => {
    fixture.componentRef.setInput('score', 9);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('9.0');
  });

  it('should render the label', () => {
    fixture.componentRef.setInput('score', 9);
    fixture.componentRef.setInput('label', 'Overall');
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Overall');
  });

  it('should apply the high tier at 8 and above', () => {
    fixture.componentRef.setInput('score', 8);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tier-high')).not.toBeNull();
  });

  it('should apply the mid tier between 6 and 7.99', () => {
    fixture.componentRef.setInput('score', 7.9);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tier-mid')).not.toBeNull();
  });

  it('should apply the low tier below 6', () => {
    fixture.componentRef.setInput('score', 5.9);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tier-low')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAILS to compile — `Cannot find module './score-badge' or its corresponding type declarations.`

- [ ] **Step 3: Create the component**

Create `frontend/src/app/shared/score-badge/score-badge.ts`:

```typescript
import { Component, Input } from '@angular/core';

type ScoreTier = 'high' | 'mid' | 'low';

@Component({
  selector: 'app-score-badge',
  standalone: true,
  templateUrl: './score-badge.html',
  styleUrls: ['./score-badge.css']
})
export class ScoreBadge {
  @Input({ required: true }) score = 0;
  @Input() label = 'Overall';

  get tier(): ScoreTier {
    if (this.score >= 8) {
      return 'high';
    }

    if (this.score >= 6) {
      return 'mid';
    }

    return 'low';
  }

  get display(): string {
    return this.score.toFixed(1);
  }
}
```

Create `frontend/src/app/shared/score-badge/score-badge.html`:

```html
<div
  class="score-badge"
  [class.tier-high]="tier === 'high'"
  [class.tier-mid]="tier === 'mid'"
  [class.tier-low]="tier === 'low'"
>
  <span class="score-badge-number">{{ display }}</span>
  <span class="score-badge-label">{{ label }}</span>
</div>
```

Create `frontend/src/app/shared/score-badge/score-badge.css`:

```css
:host {
  display: inline-flex;
}

.score-badge {
  align-items: center;
  background: var(--surface);
  border-radius: 999px;
  border: 3px solid var(--muted);
  display: grid;
  height: 64px;
  justify-items: center;
  place-content: center;
  width: 64px;
}

.score-badge-number {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1;
}

.score-badge-label {
  font-size: 0.55rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.tier-high {
  border-color: var(--palette-gold);
}

.tier-mid {
  border-color: var(--accent-red);
}

.tier-low {
  border-color: var(--muted);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS (all `ScoreBadge` specs green, plus everything from Task 1's baseline still green).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/shared/score-badge
git commit -m "Add ScoreBadge shared component"
```

---

### Task 3: `RatingCard` shared component

**Files:**
- Create: `frontend/src/app/shared/rating-card/rating-card.ts`
- Create: `frontend/src/app/shared/rating-card/rating-card.html`
- Create: `frontend/src/app/shared/rating-card/rating-card.css`
- Test: `frontend/src/app/shared/rating-card/rating-card.spec.ts`

**Interfaces:**
- Consumes: `ScoreBadge` (Task 2) selector `app-score-badge`, inputs `score`/`label`. `Rating` model from `frontend/src/app/core/models/rating.model.ts` (fields: `id?`, `creatorId?`, `creator?`, `restaurantName`, `location`, `sauce`, `toppings`, `crust`, `overallRating`, `affordabilityRating`, `comments`).
- Produces: `RatingCard` class, selector `app-rating-card`, inputs `rating: Rating` (required), `canManage: boolean` (default `false`), `processing: boolean` (default `false`), output `remove: EventEmitter<Rating>`. Task 4 (Ratings page) consumes this.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/app/shared/rating-card/rating-card.spec.ts`:

```typescript
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Rating } from '../../core/models/rating.model';
import { RatingCard } from './rating-card';

describe('RatingCard', () => {
  let fixture: ComponentFixture<RatingCard>;

  const rating: Rating = {
    id: '1',
    creatorId: 'user-1',
    creator: 'Joshua Stenger',
    restaurantName: 'Fiori Pizza',
    location: 'Brookline',
    sauce: 'Sweet',
    toppings: 'Pepperoni',
    crust: 'Crisp',
    overallRating: 9.1,
    affordabilityRating: 8.5,
    comments: 'Classic Pittsburgh slice'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingCard],
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(RatingCard);
    fixture.componentRef.setInput('rating', rating);
    fixture.detectChanges();
  });

  it('should render the rating details', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('Fiori Pizza');
    expect(nativeElement.textContent).toContain('Brookline');
    expect(nativeElement.textContent).toContain('Sweet');
    expect(nativeElement.textContent).toContain('Pepperoni');
    expect(nativeElement.textContent).toContain('Crisp');
    expect(nativeElement.textContent).toContain('9.1');
    expect(nativeElement.textContent).toContain('Classic Pittsburgh slice');
  });

  it('should not show owner actions by default', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.row-actions')).toBeNull();
  });

  it('should show owner actions and emit remove when canManage is true', () => {
    fixture.componentRef.setInput('canManage', true);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const removeButton = nativeElement.querySelector<HTMLButtonElement>('.button.danger');
    expect(removeButton).not.toBeNull();

    let emitted: Rating | undefined;
    fixture.componentInstance.remove.subscribe((value: Rating) => (emitted = value));
    removeButton!.click();

    expect(emitted).toBe(rating);
  });

  it('should disable the remove button while processing', () => {
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('processing', true);
    fixture.detectChanges();

    const removeButton = fixture.nativeElement.querySelector<HTMLButtonElement>('.button.danger');
    expect(removeButton!.disabled).toBeTrue();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAILS to compile — `Cannot find module './rating-card' or its corresponding type declarations.`

- [ ] **Step 3: Create the component**

Create `frontend/src/app/shared/rating-card/rating-card.ts`:

```typescript
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Rating } from '../../core/models/rating.model';
import { ScoreBadge } from '../score-badge/score-badge';

@Component({
  selector: 'app-rating-card',
  standalone: true,
  imports: [RouterLink, ScoreBadge],
  templateUrl: './rating-card.html',
  styleUrls: ['./rating-card.css']
})
export class RatingCard {
  @Input({ required: true }) rating!: Rating;
  @Input() canManage = false;
  @Input() processing = false;
  @Output() remove = new EventEmitter<Rating>();

  onRemove(): void {
    this.remove.emit(this.rating);
  }
}
```

Create `frontend/src/app/shared/rating-card/rating-card.html`:

```html
<article class="rating-card">
  <header class="rating-card-header">
    <div>
      <h3>{{ rating.restaurantName }}</h3>
      <p class="rating-card-location">{{ rating.location }}</p>
    </div>
    <app-score-badge [score]="rating.overallRating" label="Overall"></app-score-badge>
  </header>

  <ul class="rating-card-tags" aria-label="Pizza details">
    <li class="tag-chip value-chip">Value {{ rating.affordabilityRating }}/10</li>
    <li class="tag-chip">Sauce: {{ rating.sauce }}</li>
    <li class="tag-chip">Crust: {{ rating.crust }}</li>
    <li class="tag-chip">Toppings: {{ rating.toppings }}</li>
  </ul>

  <p class="rating-card-comments">{{ rating.comments }}</p>

  <footer class="rating-card-footer">
    <p class="meta">
      @if (rating.creatorId) {
        <a class="profile-link" [routerLink]="['/profiles', rating.creatorId]">{{ rating.creator }}</a>
      } @else {
        {{ rating.creator }}
      }
    </p>

    @if (canManage) {
      <div class="row-actions">
        <a class="button secondary" [routerLink]="['/ratings', rating.id, 'edit']">Edit</a>
        <button
          class="button danger"
          type="button"
          [disabled]="processing"
          (click)="onRemove()"
        >
          Remove
        </button>
      </div>
    }
  </footer>
</article>
```

Create `frontend/src/app/shared/rating-card/rating-card.css`:

```css
:host {
  display: block;
}

.rating-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  display: grid;
  gap: 14px;
  padding: 20px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.rating-card:hover {
  box-shadow: 0 22px 44px rgba(64, 15, 15, 0.22);
  transform: translateY(-2px);
}

.rating-card-header {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.rating-card-header h3 {
  font-size: 1.3rem;
  margin: 0;
}

.rating-card-location {
  color: var(--muted);
  font-weight: 700;
  margin: 4px 0 0;
}

.rating-card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.rating-card-comments {
  color: var(--muted);
  line-height: 1.6;
  margin: 0;
}

.rating-card-footer {
  align-items: center;
  border-top: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  padding-top: 14px;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.row-actions .button {
  min-height: 36px;
  padding: 6px 10px;
}

@media (max-width: 420px) {
  .rating-card-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .row-actions,
  .row-actions .button {
    width: 100%;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS (all `RatingCard` specs green, everything else still green).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/shared/rating-card
git commit -m "Add RatingCard shared component"
```

---

### Task 4: Ratings page — replace the table with a card grid

**Files:**
- Modify: `frontend/src/app/pages/ratings/ratings-page.component.ts`
- Modify: `frontend/src/app/pages/ratings/ratings-page.component.html`
- Modify: `frontend/src/app/pages/ratings/ratings-page.component.css`
- Test: `frontend/src/app/pages/ratings/ratings-page.component.spec.ts`

**Interfaces:**
- Consumes: `RatingCard` (Task 3), selector `app-rating-card`, inputs `rating`/`canManage`/`processing`, output `remove`.

- [ ] **Step 1: Update the failing/outdated assertion in the spec first**

The current spec asserts on `<th>` table headers, which won't exist once the table is replaced. Open `frontend/src/app/pages/ratings/ratings-page.component.spec.ts` and replace this test:

```typescript
  it('should render the required rating table columns', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/ratings').flush([]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const headers = Array.from(nativeElement.querySelectorAll('th')).map((header) =>
      header.textContent?.trim()
    );

    expect(headers).toEqual([
      'Restaurant Name',
      'Location',
      'Sauce',
      'Toppings',
      'Crust',
      'Overall Rating',
      'Affordability Rating',
      'Contributor',
      'Comments'
    ]);
  });
```

with:

```typescript
  it('should render each rating as a card with its key details', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/ratings').flush([
      {
        id: '1',
        creatorId: 'user-1',
        creator: 'Joshua Stenger',
        restaurantName: 'Fiori Pizza',
        location: 'Brookline',
        sauce: 'Sweet',
        toppings: 'Pepperoni',
        crust: 'Crisp',
        overallRating: 9.1,
        affordabilityRating: 8.5,
        comments: 'Classic Pittsburgh slice'
      }
    ]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const cards = nativeElement.querySelectorAll('app-rating-card');

    expect(cards.length).toBe(1);
    expect(nativeElement.textContent).toContain('Fiori Pizza');
    expect(nativeElement.textContent).toContain('Brookline');
    expect(nativeElement.textContent).toContain('Sweet');
    expect(nativeElement.textContent).toContain('Pepperoni');
    expect(nativeElement.textContent).toContain('Crisp');
    expect(nativeElement.textContent).toContain('9.1');
    expect(nativeElement.textContent).toContain('Classic Pittsburgh slice');
  });
```

Leave the other three tests (`should request ratings...`, `should show the empty state...`, `should filter ratings...`) untouched — they assert on `.status.error`, `#ratingFilterRestaurant`, and general `textContent`, none of which change.

- [ ] **Step 2: Run the suite to verify the new test fails**

Run: `cd frontend && npm test -- --watch=false`
Expected: FAILS — `expect(cards.length).toBe(1)` gets `0` because `app-rating-card` doesn't exist in the template yet.

- [ ] **Step 3: Update the component to import `RatingCard` and drop the now-unused `showActionsColumn`**

In `frontend/src/app/pages/ratings/ratings-page.component.ts`, replace the imports and `@Component` decorator:

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Rating } from '../../core/models/rating.model';
import { AuthService } from '../../core/services/auth.service';
import { RatingsService } from '../../core/services/ratings.service';
```

with:

```typescript
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Rating } from '../../core/models/rating.model';
import { AuthService } from '../../core/services/auth.service';
import { RatingsService } from '../../core/services/ratings.service';
import { RatingCard } from '../../shared/rating-card/rating-card';
```

and:

```typescript
@Component({
  selector: 'app-ratings-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './ratings-page.component.html',
  styleUrls: ['./ratings-page.component.css']
})
```

with:

```typescript
@Component({
  selector: 'app-ratings-page',
  standalone: true,
  imports: [RouterLink, RatingCard],
  templateUrl: './ratings-page.component.html',
  styleUrls: ['./ratings-page.component.css']
})
```

Then delete the now-unused method (each card decides its own actions via `canManage`, so there's no shared "actions column" concept anymore):

```typescript
  showActionsColumn(): boolean {
    return this.auth.isLoggedIn();
  }

```

- [ ] **Step 4: Replace the table markup with a card grid**

In `frontend/src/app/pages/ratings/ratings-page.component.html`, replace this entire block:

```html
  <div class="table-wrap">
    <table aria-label="Pizza ratings table">
      <thead>
        <tr>
          <th>Restaurant Name</th>
          <th>Location</th>
          <th>Sauce</th>
          <th>Toppings</th>
          <th>Crust</th>
          <th>Overall Rating</th>
          <th>Affordability Rating</th>
          <th>Contributor</th>
          <th>Comments</th>
          @if (showActionsColumn()) {
            <th>Actions</th>
          }
        </tr>
      </thead>
      <tbody>
        @if (!loading() && ratings().length === 0) {
          <tr>
            <td [attr.colspan]="showActionsColumn() ? 10 : 9" class="empty">
              No ratings are available yet.
            </td>
          </tr>
        } @else if (!loading() && filteredRatings().length === 0) {
          <tr>
            <td [attr.colspan]="showActionsColumn() ? 10 : 9" class="empty">
              No ratings match those filters.
            </td>
          </tr>
        } @else {
          @for (rating of filteredRatings(); track rating.id ?? rating.restaurantName) {
            <tr>
              <td data-label="Restaurant">{{ rating.restaurantName }}</td>
              <td data-label="Location">{{ rating.location }}</td>
              <td data-label="Sauce">{{ rating.sauce }}</td>
              <td data-label="Toppings">{{ rating.toppings }}</td>
              <td data-label="Crust">{{ rating.crust }}</td>
              <td data-label="Rating">{{ rating.overallRating }}</td>
              <td data-label="Affordability">{{ rating.affordabilityRating }}</td>
              <td data-label="Contributor">
                @if (rating.creatorId) {
                  <a class="profile-link" [routerLink]="['/profiles', rating.creatorId]">{{ rating.creator }}</a>
                } @else {
                  {{ rating.creator }}
                }
              </td>
              <td data-label="Comments">{{ rating.comments }}</td>
              @if (showActionsColumn()) {
                @if (canManage(rating)) {
                  <td data-label="Actions">
                    <div class="row-actions">
                      <a class="button secondary" [routerLink]="['/ratings', rating.id, 'edit']">Edit</a>
                      <button
                        class="button danger"
                        type="button"
                        [disabled]="isProcessing(rating.id)"
                        (click)="removeRating(rating)"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                } @else {
                  <td class="desktop-only"></td>
                }
              }
            </tr>
          }
        }
      </tbody>
    </table>
  </div>
```

with:

```html
  <div class="ratings-grid" aria-label="Pizza ratings">
    @if (!loading() && ratings().length === 0) {
      <p class="status empty">No ratings are available yet.</p>
    } @else if (!loading() && filteredRatings().length === 0) {
      <p class="status empty">No ratings match those filters.</p>
    } @else {
      @for (rating of filteredRatings(); track rating.id ?? rating.restaurantName) {
        <app-rating-card
          [rating]="rating"
          [canManage]="canManage(rating)"
          [processing]="isProcessing(rating.id)"
          (remove)="removeRating($event)"
        ></app-rating-card>
      }
    }
  </div>
```

The `<header>`, `errorMessage()` status paragraph, and the `<section class="filter-panel">` block above it are unchanged.

- [ ] **Step 5: Replace the table-specific CSS with card-grid CSS**

Replace the full contents of `frontend/src/app/pages/ratings/ratings-page.component.css` with:

```css
.filter-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  display: grid;
  gap: 16px;
  padding: 18px;
}

.filter-heading {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.filter-heading h2 {
  font-size: 1.1rem;
  margin: 0;
}

.filter-heading .button {
  min-height: 38px;
  padding: 6px 12px;
}

.filter-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.filter-grid label {
  color: var(--ink);
  display: grid;
  font-size: 0.85rem;
  font-weight: 800;
  gap: 6px;
}

.filter-grid input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--ink);
  min-height: 40px;
  padding: 8px 10px;
  width: 100%;
}

.ratings-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.ratings-grid > .status {
  grid-column: 1 / -1;
}

@media (max-width: 640px) {
  .filter-panel {
    box-shadow: none;
    padding: 14px;
  }

  .filter-heading {
    align-items: stretch;
    display: grid;
  }

  .filter-heading .button {
    width: 100%;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .ratings-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Run the suite to verify everything passes**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS — all `RatingsPage` specs green (including the rewritten card test), all `RatingCard`/`ScoreBadge` specs still green.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/pages/ratings
git commit -m "Replace ratings table with a card grid"
```

---

### Task 5: Contributors page — replace the table with a card grid

**Files:**
- Modify: `frontend/src/app/pages/contributors/contributors-page.component.html`
- Modify: `frontend/src/app/pages/contributors/contributors-page.component.css`

No `.ts` changes — `profileInitials()` and the `contributors`/`loading`/`errorMessage` signals are reused as-is. No spec changes — `contributors-page.component.spec.ts` asserts on `.profile-thumb`, an `a[href="/profiles/contributor-1"]` link, and `textContent` containing the name/counts, all of which the new markup still satisfies (verified in Step 3 below).

- [ ] **Step 1: Run the suite to confirm the current baseline is green**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 2: Replace the table markup with a card grid**

Replace the full contents of `frontend/src/app/pages/contributors/contributors-page.component.html`:

```html
<section class="page contributors-page">
  <header class="page-header">
    <div>
      <h1>Contributors</h1>
      <p>Browse the PGH Pizza contributors sharing ratings, blog posts, and Pittsburgh pizza notes.</p>
    </div>
  </header>

  @if (errorMessage()) {
    <p class="status error">{{ errorMessage() }}</p>
  }

  <div class="contributors-grid" aria-label="Contributors">
    @if (!loading() && contributors().length === 0) {
      <p class="status empty">No contributors are available yet.</p>
    } @else {
      @for (contributor of contributors(); track contributor.id) {
        <a class="contributor-card" [routerLink]="['/profiles', contributor.id]">
          @if (contributor.profilePictureUrl) {
            <img
              class="profile-thumb"
              [src]="contributor.profilePictureUrl"
              [alt]="contributor.displayName + ' profile picture'"
            >
          } @else {
            <span class="profile-thumb fallback" aria-hidden="true">
              {{ profileInitials(contributor.displayName) }}
            </span>
          }
          <span class="contributor-name">{{ contributor.displayName }}</span>
          <span class="contributor-stats">
            <span class="tag-chip">{{ contributor.ratingCount }} ratings</span>
            <span class="tag-chip">{{ contributor.blogPostCount }} posts</span>
          </span>
        </a>
      }
    }
  </div>
</section>
```

- [ ] **Step 3: Replace the table-specific CSS with card-grid CSS**

Replace the full contents of `frontend/src/app/pages/contributors/contributors-page.component.css`:

```css
:host {
  display: block;
}

.contributors-page {
  --page-max-width: 1120px;
}

.contributors-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.contributors-grid > .status {
  grid-column: 1 / -1;
}

.contributor-card {
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  color: var(--ink);
  display: grid;
  gap: 10px;
  justify-items: center;
  padding: 20px;
  text-align: center;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.contributor-card:hover {
  box-shadow: 0 22px 44px rgba(64, 15, 15, 0.22);
  transform: translateY(-2px);
}

.profile-thumb {
  aspect-ratio: 1;
  border: 2px solid var(--soft-gold);
  border-radius: 999px;
  height: 72px;
  object-fit: cover;
  width: 72px;
}

.profile-thumb.fallback {
  align-items: center;
  background: var(--accent-red);
  color: var(--on-accent);
  display: inline-flex;
  font-weight: 800;
  justify-content: center;
}

.contributor-name {
  color: var(--accent-maroon);
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
}

.contributor-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
```

- [ ] **Step 4: Run the suite to verify nothing regressed**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS — `ContributorsPage` spec still green (it asserts on `.profile-thumb`, the `a[href="/profiles/contributor-1"]` link, and textContent containing the name/counts, all still present).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/contributors
git commit -m "Replace contributors table with a card grid"
```

---

### Task 6: Navbar — brand mark and type refresh

**Files:**
- Modify: `frontend/src/app/shared/navbar/navbar.html`
- Modify: `frontend/src/app/shared/navbar/navbar.css`

`navbar.spec.ts` checks `linkText` (trimmed text of every `<a>`) contains `'PGH-Pizza'` and that `.navbar-links a` order matches a fixed list — wrapping the brand text in a `<span>` next to a decorative, `aria-hidden` SVG doesn't change either assertion (verified in Step 3).

- [ ] **Step 1: Run the suite to confirm the current baseline is green**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 2: Add a pizza-slice brand mark**

In `frontend/src/app/shared/navbar/navbar.html`, replace:

```html
  <a class="navbar-brand" routerLink="/">PGH-Pizza</a>
```

with:

```html
  <a class="navbar-brand" routerLink="/">
    <svg class="brand-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path class="brand-mark-slice" d="M12 3 21 19H3Z" />
      <circle class="brand-mark-topping" cx="10.5" cy="13.5" r="1.2" />
      <circle class="brand-mark-topping" cx="14.5" cy="16" r="1.2" />
      <circle class="brand-mark-topping" cx="12.5" cy="10" r="1" />
    </svg>
    <span>PGH-Pizza</span>
  </a>
```

- [ ] **Step 3: Restyle the brand and navbar type**

In `frontend/src/app/shared/navbar/navbar.css`, replace:

```css
.navbar-brand {
  color: var(--accent-red);
  font-size: 1.25rem;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}
```

with:

```css
.navbar-brand {
  align-items: center;
  color: var(--accent-red);
  display: inline-flex;
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  gap: 8px;
  text-decoration: none;
  white-space: nowrap;
}

.brand-mark {
  height: 26px;
  width: 26px;
}

.brand-mark-slice {
  fill: var(--palette-gold);
  stroke: var(--accent-maroon);
  stroke-width: 1;
}

.brand-mark-topping {
  fill: var(--accent-red);
}
```

- [ ] **Step 4: Run the suite to verify nothing regressed**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS — `Navbar` spec still green (`linkText` still contains `'PGH-Pizza'` since the SVG contributes no text, and `.navbar-links a` order is untouched).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/shared/navbar
git commit -m "Add pizza-slice brand mark and refresh navbar type"
```

---

### Task 7: Home page — hero and feature-strip refresh

**Files:**
- Modify: `frontend/src/app/home/home.component.css` (repo path is `frontend/src/home/home.component.css`)

No `.html` or `.ts` changes, no spec file exists for this component. Verification is `npm run build` plus the manual walkthrough in Task 9.

- [ ] **Step 1: Add a background wash, fix the missing `.eyebrow` style, a hero tilt, and card-hover consistency**

`home.component.html` already renders `<p class="eyebrow">`, but no `.eyebrow` rule exists anywhere in `home.component.css` or the global stylesheet (unlike the About page, which does style it) — this task fixes that gap while it's already being touched.

Replace the full contents of `frontend/src/home/home.component.css`:

```css
:host {
  background: radial-gradient(circle at top right, var(--soft-gold), transparent 55%);
  display: block;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 440px);
  gap: 48px;
  align-items: center;
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 64px 0 40px;
}

.hero-copy {
  display: grid;
  gap: 20px;
}

.eyebrow {
  color: var(--accent-maroon);
  font-weight: 800;
  margin: 0;
  text-transform: uppercase;
}

h1 {
  color: var(--ink);
  font-size: clamp(3rem, 8vw, 6rem);
  line-height: 0.95;
  margin: 0;
}

.lede {
  color: var(--muted);
  font-size: 1.15rem;
  line-height: 1.7;
  margin: 0;
  max-width: 640px;
}

.hero-media {
  border: 4px solid var(--palette-gold);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--shadow);
  background: var(--surface);
  transform: rotate(-2deg);
  transition: transform 0.2s ease;
}

.hero-media:hover {
  transform: rotate(0deg);
}

.hero-media img {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.feature-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto 64px;
}

.feature-strip article {
  background: var(--surface);
  border: 1px solid var(--border);
  border-top: 4px solid var(--palette-gold);
  border-radius: 8px;
  padding: 20px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.feature-strip article:hover {
  box-shadow: 0 18px 36px rgba(64, 15, 15, 0.18);
  transform: translateY(-2px);
}

.feature-strip h2 {
  font-size: 1.05rem;
  margin: 0 0 8px;
}

.feature-strip p {
  color: var(--muted);
  margin: 0;
}

@media (max-width: 760px) {
  .hero {
    gap: 28px;
    grid-template-columns: 1fr;
    padding-top: 32px;
  }

  .feature-strip {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .hero,
  .feature-strip {
    width: min(100% - 24px, 1120px);
  }

  h1 {
    font-size: 3rem;
  }

  .lede {
    font-size: 1rem;
  }

  .actions,
  .actions .button {
    width: 100%;
  }
}
```

- [ ] **Step 2: Verify the app builds**

Run: `cd frontend && npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/home/home.component.css
git commit -m "Refresh home page hero and feature strip styling"
```

---

### Task 8: Blog list — post-card refresh

**Files:**
- Modify: `frontend/src/app/pages/blog-list/blog-list-page.component.css`

- [ ] **Step 1: Run the suite to confirm the current baseline is green**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 2: Add shadow and hover lift to `.post-card` for visual consistency with the new rating/contributor cards**

In `frontend/src/app/pages/blog-list/blog-list-page.component.css`, replace:

```css
.post-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: grid;
  gap: 12px;
  padding: 20px;
}
```

with:

```css
.post-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  display: grid;
  gap: 12px;
  padding: 20px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.post-card:hover {
  box-shadow: 0 22px 44px rgba(64, 15, 15, 0.22);
  transform: translateY(-2px);
}
```

- [ ] **Step 3: Run the suite to verify nothing regressed**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS (no `blog-list-page.component.spec.ts` exists, but this confirms the rest of the suite is untouched).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/pages/blog-list
git commit -m "Add card shadow and hover lift to blog post cards"
```

---

### Task 9: Full verification pass

**Files:** none (verification only).

This confirms the pages that received no direct edits — About, Blog detail, Blog form, Rating form, Apply, Login, Password reset (request/confirm), Profile, Admin applications — correctly inherit the Task 1 typography/token changes through the shared global classes they already use (`.button`, `.field`, `.form-panel`, `.status`, `.table-wrap`, `.content-block`), and that the whole app works end-to-end with no regressions.

- [ ] **Step 1: Run the full test suite**

Run: `cd frontend && npm test -- --watch=false`
Expected: PASS — every spec green (`app.spec.ts`, `navbar.spec.ts`, `ratings-page.component.spec.ts`, `contributors-page.component.spec.ts`, `profile.service.spec.ts`, `youtube.spec.ts`, `timed-route-reuse.strategy.spec.ts`, `app.routes.spec.ts`).

- [ ] **Step 2: Run a production build**

Run: `cd frontend && npm run build`
Expected: build succeeds with no errors or warnings about missing files.

- [ ] **Step 3: Start the dev server and manually walk through every page**

Run: `cd frontend && npm start` (proxies `/api` to `http://localhost:8080` — the backend does not need to be running for pages that tolerate a failed fetch, but start it too if available for a full check: `cd backend && ./mvnw spring-boot:run`).

Open `http://localhost:4200` and check, at both desktop width and a mobile width (~375px):

- Home: hero renders with the new Fraunces headline, gold-wash background, tilt-on-hover image, styled eyebrow text, and hover lift on the three feature cards.
- Ratings (`/ratings`): renders as a responsive card grid (not a table); filters still narrow the grid; a card with no matches shows "No ratings match those filters."; on a logged-in contributor/admin account, Edit/Remove show on owned cards only.
- Rating form (`/ratings/new`, and editing an existing rating): inputs/buttons render with the new tokens, validation messages still appear on invalid submit.
- Blog (`/blog`): post cards show the shadow/hover lift; Blog detail (`/blog/:slug`) and Blog form (`/blog/new`) render with the new type/colors.
- Contributors (`/contributors`): renders as a card grid with avatar/initials, name, and rating/post-count chips; clicking a card navigates to that contributor's profile.
- About (`/about-me`): headline and body render in the new fonts/colors.
- Apply (`/apply`), Login (`/login`), Password reset request/confirm: forms render with the new tokens, no layout breakage.
- Profile (`/profiles/:id`): hero, stats, and the ratings table (left as a table by design) all render with the new tokens.
- Admin applications (`/admin/applications`, admin account only): table and action buttons render with the new tokens.
- Navbar: pizza-slice mark shows next to the brand on every page; links and active-state highlighting still work; mobile nav scroll behavior is unchanged.

Note anything visually broken and fix it in the relevant component's CSS before proceeding — there is no separate task for this, since it is the acceptance check for Tasks 1–8.

- [ ] **Step 4: Commit any manual-QA fixes**

Only if Step 3 required changes:

```bash
git add frontend
git commit -m "Fix visual regressions found during manual QA"
```

If Step 3 required no changes, there is nothing to commit for this task.

# Rating Scores UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Treat all five rating values (Overall, Value, Sauce, Crust, Toppings) as 1-10 scores with one decimal. Enter them with a slider paired with a number box, show them the same way everywhere, and filter and sort them as numbers.

**Architecture:**
- A small score module (`core/scores`) owns the rules: range, one-decimal precision, parsing, formatting and error copy.
- A reusable `ScoreInput` form control (`ControlValueAccessor`) renders the slider and number box and keeps them in sync.
- Display sites use one `score` pipe.
- The backend keeps its column types. It only adds a validation pattern so Sauce/Crust/Toppings text must be a score. The real column migration is a separate future step.

**Tech Stack:** Angular 20 (standalone, signals, zoneless, reactive forms), Jasmine/Karma; Spring Boot 3 / Jakarta Validation for the one backend change.

**Spec:** This document's "Decisions" and "Findings" sections. They came from the 2026-10-05 review and the user's answers in that session, checked against live data from https://pghpizza.org/api/ratings.

## Decisions (from the user, 2026-10-05)

1. Enter scores with a **slider + number box**, kept in sync.
2. **One decimal** everywhere, for example 8.5. Existing two-decimal values (8.62) display as 8.6, and editing one saves the rounded value.
3. **Affordability means value:** 10 = great value. Rename it "Value" in the UI. The API field name `affordabilityRating` stays.
4. **Sauce, Crust and Toppings are numbers** on the live site, stored as text. Validate them as scores in the UI and API now, and leave the column types alone. A NUMERIC migration comes later.

## Findings This Fixes

- F1. The form accepts 3+ decimals, the backend rejects them, and the user sees "Check the overallRating field".
- F2. Overall and Value are pre-filled with 8, so a rating can be published without touching them.
- F3. Number boxes step by 0.01 and the scroll wheel changes them by accident.
- F4. There are no scale anchors, and "Affordability" has no stated direction.
- F5. One error message covers both "out of range" and "too precise".
- F6. The same score renders as 8.6, 8.55 or 8.55/10 depending on the page.
- F7. Score filters do substring matching: "9" matches 6.9 and misses 10.
- F8. **Regression from the previous plan's Task 5:** the Sauce/Crust/Toppings copy ("Sweet, chunky…", "Describe the sauce") treats numeric scores as descriptions.

## Global Constraints

- No emojis anywhere.
- Score range 1 to 10 inclusive, at most 1 decimal, slider step 0.1.
- Scores are displayed via `Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })`, so 9 shows as "9.0".
- The API contract is unchanged: `sauce`, `crust` and `toppings` are sent as strings (`"7.5"`), and `overallRating` and `affordabilityRating` as numbers.
- Run frontend tests from `frontend/` with `npm test -- --watch=false --browsers=ChromeHeadless`. Run backend tests from `backend/` with `./mvnw -q test -Dtest=<Class>`. Docker is not running, so avoid Testcontainers-based tests.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Editing a live rating with Overall 8.62:** the form shows 8.6 and saving sends 8.6, never 8.62 (which would fail the new validator silently). (Task 3 test.)
2. **Clearing the number box:** the control becomes `null` with a "Choose a score" error, never 0 or NaN. (Task 2 test.)
3. **Typing in the number box** must not be rewritten mid-entry. Only the slider and `writeValue` write to the number box. (Task 2 test.)
4. **A score of exactly 10 or "10.0"** passes every validator and the backend pattern. "10.5" and "0.9" fail. (Tasks 1 and 6 tests.)
5. **A "Min Overall 9" filter** shows 9.0, 9.2 and 10.0 and hides 6.9. (Task 5 test.)

---

### Task 1: Score rules and pipe

**Files:**
- Create: `frontend/src/app/core/scores/score.ts`
- Create: `frontend/src/app/core/scores/score.pipe.ts`
- Test: `frontend/src/app/core/scores/score.spec.ts`

**Interfaces:**
- Produces: `SCORE_MIN = 1`, `SCORE_MAX = 10`, `SCORE_STEP = 0.1`; `toScore(value: unknown): number | null`; `roundScore(value: number): number`; `formatScore(value: unknown): string`; `scoreValidator: ValidatorFn` with errors `scoreRequired | scoreRange | scoreDecimals`; `scoreErrorMessage(errors: ValidationErrors | null): string`; `ScorePipe` (`score`)

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/core/scores/score.spec.ts
import { FormControl } from '@angular/forms';

import { formatScore, roundScore, scoreErrorMessage, scoreValidator, toScore } from './score';

describe('score rules', () => {
  const errorsFor = (value: unknown) => scoreValidator(new FormControl(value));

  it('should parse numbers and numeric strings, rejecting blanks and text', () => {
    expect(toScore(8.5)).toBe(8.5);
    expect(toScore(' 7.2 ')).toBe(7.2);
    expect(toScore('9')).toBe(9);
    expect(toScore('')).toBeNull();
    expect(toScore(null)).toBeNull();
    expect(toScore('Sweet')).toBeNull();
  });

  it('should format every score with exactly one decimal', () => {
    expect(formatScore(9)).toBe('9.0');
    expect(formatScore('5.0')).toBe('5.0');
    expect(formatScore(8.62)).toBe('8.6');
    expect(formatScore(10)).toBe('10.0');
    expect(formatScore(null)).toBe('–');
  });

  it('should round to one decimal', () => {
    expect(roundScore(8.62)).toBe(8.6);
    expect(roundScore(6.85)).toBe(6.9);
  });

  it('should accept 1 to 10 with at most one decimal', () => {
    for (const ok of [1, 10, '10.0', 8.5, '7']) {
      expect(errorsFor(ok)).withContext(String(ok)).toBeNull();
    }
  });

  it('should explain each kind of invalid score', () => {
    expect(scoreErrorMessage(errorsFor(null))).toBe('Choose a score from 1 to 10.');
    expect(scoreErrorMessage(errorsFor(0.9))).toBe('Scores go from 1 to 10.');
    expect(scoreErrorMessage(errorsFor(10.5))).toBe('Scores go from 1 to 10.');
    expect(scoreErrorMessage(errorsFor(8.55))).toBe('Use at most one decimal, like 8.5.');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails.** Run: `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/core/scores/score.spec.ts`. Expected: FAIL, "Cannot find module './score'".

- [ ] **Step 3: Implement**

```ts
// frontend/src/app/core/scores/score.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const SCORE_MIN = 1;
export const SCORE_MAX = 10;
export const SCORE_STEP = 0.1;

const scoreFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

export function toScore(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatScore(value: unknown): string {
  const score = toScore(value);
  return score === null ? '–' : scoreFormat.format(score);
}

export const scoreValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const score = toScore(control.value);

  if (score === null) {
    return { scoreRequired: true };
  }

  if (score < SCORE_MIN || score > SCORE_MAX) {
    return { scoreRange: true };
  }

  if (Math.abs(score * 10 - Math.round(score * 10)) > 1e-9) {
    return { scoreDecimals: true };
  }

  return null;
};

export function scoreErrorMessage(errors: ValidationErrors | null): string {
  if (errors?.['scoreRequired']) {
    return 'Choose a score from 1 to 10.';
  }

  if (errors?.['scoreRange']) {
    return 'Scores go from 1 to 10.';
  }

  if (errors?.['scoreDecimals']) {
    return 'Use at most one decimal, like 8.5.';
  }

  return '';
}
```

```ts
// frontend/src/app/core/scores/score.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

import { formatScore } from './score';

@Pipe({ name: 'score', standalone: true })
export class ScorePipe implements PipeTransform {
  transform(value: unknown): string {
    return formatScore(value);
  }
}
```

- [ ] **Step 4: Run it and confirm it passes.** Expected: PASS, 5 specs.
- [ ] **Step 5: Commit.** Message: "Add shared score rules, formatting, and pipe".

---

### Task 2: ScoreInput control (slider + number box)

**Files:**
- Create: `frontend/src/app/shared/score-input/score-input.ts`, `score-input.html`, `score-input.css`
- Test: `frontend/src/app/shared/score-input/score-input.spec.ts`

**Interfaces:**
- Consumes: `SCORE_MIN`, `SCORE_MAX`, `SCORE_STEP`, `toScore`, `ScorePipe` (Task 1)
- Produces: `<app-score-input inputId label lowLabel highLabel describedBy [invalid] formControlName>`, a `ControlValueAccessor` whose value is `number | null`. The number box carries `id=inputId`, so `<label for>` and `focusFirstInvalid` reach it.

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/shared/score-input/score-input.spec.ts
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { ScoreInput } from './score-input';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ScoreInput],
  template: `<app-score-input inputId="overall" label="Overall" lowLabel="Skip it"
    highLabel="Best in Pittsburgh" [formControl]="control"></app-score-input>`
})
class Host {
  control = new FormControl<number | null>(null);
}

describe('ScoreInput', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  const slider = () => el.querySelector<HTMLInputElement>('input[type="range"]')!;
  const box = () => el.querySelector<HTMLInputElement>('input[type="number"]')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    el = fixture.nativeElement;
  });

  it('should start unset with visible anchors', () => {
    expect(el.textContent).toContain('Not set');
    expect(el.textContent).toContain('1 = Skip it');
    expect(el.textContent).toContain('10 = Best in Pittsburgh');
    expect(box().value).toBe('');
  });

  it('should update the control and number box when the slider moves', () => {
    slider().value = '7.5';
    slider().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe(7.5);
    expect(box().value).toBe('7.5');
    expect(el.textContent).toContain('7.5');
  });

  it('should update the control and slider when a number is typed, without rewriting the box', () => {
    box().value = '8.5';
    box().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe(8.5);
    expect(slider().value).toBe('8.5');
    expect(box().value).toBe('8.5');
  });

  it('should set null, not 0, when the number box is cleared', () => {
    fixture.componentInstance.control.setValue(6);
    fixture.detectChanges();
    box().value = '';
    box().dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.control.value).toBeNull();
  });

  it('should show values written by the form', () => {
    fixture.componentInstance.control.setValue(9.2);
    fixture.detectChanges();

    expect(box().value).toBe('9.2');
    expect(slider().value).toBe('9.2');
  });

  it('should drop focus on mouse wheel so scrolling cannot change the score', () => {
    document.body.appendChild(el);
    box().focus();
    box().dispatchEvent(new WheelEvent('wheel', { bubbles: true }));

    expect(document.activeElement).not.toBe(box());
    el.remove();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails** (the module is missing).

- [ ] **Step 3: Implement**

```ts
// frontend/src/app/shared/score-input/score-input.ts
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
  computed,
  forwardRef,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { SCORE_MAX, SCORE_MIN, SCORE_STEP, toScore } from '../../core/scores/score';
import { ScorePipe } from '../../core/scores/score.pipe';

@Component({
  selector: 'app-score-input',
  standalone: true,
  imports: [ScorePipe],
  templateUrl: './score-input.html',
  styleUrls: ['./score-input.css'],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ScoreInput), multi: true }]
})
export class ScoreInput implements ControlValueAccessor, AfterViewInit {
  @Input({ required: true }) inputId!: string;
  @Input({ required: true }) label!: string;
  @Input() lowLabel = 'Poor';
  @Input() highLabel = 'Excellent';
  @Input() describedBy: string | null = null;
  @Input() invalid = false;

  @ViewChild('numberBox') private numberBox?: ElementRef<HTMLInputElement>;

  readonly min = SCORE_MIN;
  readonly max = SCORE_MAX;
  readonly step = SCORE_STEP;
  readonly value = signal<number | null>(null);
  readonly disabled = signal(false);
  readonly sliderValue = computed(() => this.value() ?? (SCORE_MIN + SCORE_MAX) / 2);

  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngAfterViewInit(): void {
    this.writeNumberBox();
  }

  writeValue(value: unknown): void {
    this.value.set(toScore(value));
    this.writeNumberBox();
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  onSlider(event: Event): void {
    this.update(toScore((event.target as HTMLInputElement).value));
    this.writeNumberBox();
  }

  onNumber(event: Event): void {
    // The number box is never re-bound while typing, so partial input like "8." survives.
    this.update(toScore((event.target as HTMLInputElement).value));
  }

  onBlur(): void {
    this.onTouched();
  }

  onWheel(event: WheelEvent): void {
    (event.target as HTMLInputElement).blur();
  }

  private update(value: number | null): void {
    this.value.set(value);
    this.onChange(value);
  }

  private writeNumberBox(): void {
    if (this.numberBox) {
      const value = this.value();
      this.numberBox.nativeElement.value = value === null ? '' : String(value);
    }
  }
}
```

```html
<!-- frontend/src/app/shared/score-input/score-input.html -->
<div class="score-input" [class.unset]="value() === null">
  <div class="score-input-header">
    <label [for]="inputId">{{ label }}</label>
    <span class="score-input-readout" aria-hidden="true">
      {{ value() === null ? 'Not set' : (value() | score) }}
    </span>
  </div>

  <div class="score-input-controls">
    <input
      class="score-input-slider"
      type="range"
      [min]="min"
      [max]="max"
      [step]="step"
      [value]="sliderValue()"
      [disabled]="disabled()"
      [attr.aria-label]="label + ' slider'"
      [attr.aria-valuetext]="value() === null ? 'Not set' : (value() | score) + ' out of 10'"
      (input)="onSlider($event)"
      (blur)="onBlur()"
    >
    <input
      #numberBox
      class="score-input-number"
      type="number"
      inputmode="decimal"
      autocomplete="off"
      [id]="inputId"
      [attr.name]="inputId"
      [min]="min"
      [max]="max"
      [step]="step"
      [disabled]="disabled()"
      [attr.aria-describedby]="describedBy"
      [attr.aria-invalid]="invalid"
      (input)="onNumber($event)"
      (blur)="onBlur()"
      (wheel)="onWheel($event)"
    >
  </div>

  <div class="score-input-anchors" aria-hidden="true">
    <span>1 = {{ lowLabel }}</span>
    <span>10 = {{ highLabel }}</span>
  </div>
</div>
```

```css
/* frontend/src/app/shared/score-input/score-input.css */
:host {
  display: block;
}

.score-input {
  display: grid;
  gap: 8px;
}

.score-input-header {
  align-items: baseline;
  display: flex;
  justify-content: space-between;
}

.score-input-readout {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.unset .score-input-readout {
  color: var(--muted);
  font-family: var(--font-body);
  font-size: 0.9rem;
}

.score-input-controls {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr) 88px;
}

.score-input-slider {
  accent-color: var(--accent-red);
  min-height: 44px;
  width: 100%;
}

.unset .score-input-slider {
  opacity: 0.45;
}

.score-input-number {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  min-height: 44px;
  padding: 8px 10px;
  text-align: center;
  width: 100%;
}

.score-input-number[aria-invalid='true'] {
  border-color: var(--accent-bright-red);
}

.score-input-anchors {
  color: var(--muted);
  display: flex;
  font-size: 0.8rem;
  justify-content: space-between;
}
```

- [ ] **Step 4: Run it and confirm it passes.** Expected: PASS, 6 specs.
- [ ] **Step 5: Commit.** Message: "Add slider and number score input control".

---

### Task 3: Use ScoreInput for all five scores on the rating form

**Files:**
- Modify: `frontend/src/app/pages/rating-form/rating-form-page.component.ts`, `.html`, `.css`
- Modify: `frontend/src/app/core/forms/focus-first-invalid.ts`
- Test: `frontend/src/app/pages/rating-form/rating-form-page.component.spec.ts`

**Interfaces:**
- Consumes: `scoreValidator`, `scoreErrorMessage`, `toScore`, `roundScore` (Task 1); `ScoreInput` (Task 2)

- [ ] **Step 1: Replace the Task-5 copy test and add failing tests.** In `rating-form-page.component.spec.ts`:
  - remove the test `should describe free-text fields without calling them ratings` (it pinned the F8 regression)
  - change the length-limit test so it covers only `restaurantName` and `comments`
  - add `HttpTestingController` and `ActivatedRoute` / `convertToParamMap` imports and these tests:

```ts
it('should leave every score unset until the contributor chooses one', () => {
  const { controls } = TestBed.createComponent(RatingFormPage).componentInstance.form;
  for (const key of ['overallRating', 'affordabilityRating', 'sauce', 'crust', 'toppings'] as const) {
    expect(controls[key].value).withContext(key).toBeNull();
    expect(controls[key].invalid).withContext(key).toBeTrue();
  }
});

it('should send sub-scores as one-decimal strings and main scores as numbers', () => {
  const fixture = TestBed.createComponent(RatingFormPage);
  fixture.detectChanges();
  fixture.componentInstance.form.setValue({
    restaurantName: 'Fiori',
    location: 'Brookline',
    overallRating: 9,
    affordabilityRating: 8.5,
    sauce: 7,
    crust: 9.5,
    toppings: 8,
    comments: 'Classic slice'
  });

  fixture.componentInstance.submit();
  const request = TestBed.inject(HttpTestingController).expectOne('/api/ratings');
  expect(request.request.body).toEqual(jasmine.objectContaining({
    overallRating: 9, affordabilityRating: 8.5, sauce: '7.0', crust: '9.5', toppings: '8.0'
  }));
  request.flush({});
});

it('should show a specific message for an out-of-range score', () => {
  const fixture = TestBed.createComponent(RatingFormPage);
  fixture.detectChanges();
  fixture.componentInstance.form.controls.sauce.setValue(11);
  fixture.componentInstance.form.controls.sauce.markAsTouched();
  fixture.detectChanges();

  expect((fixture.nativeElement as HTMLElement).textContent).toContain('Scores go from 1 to 10.');
});
```

Add a separate `describe('RatingFormPage editing', ...)`. It provides `ActivatedRoute` with `snapshot.paramMap = convertToParamMap({ id: 'r1' })` and seeds `localStorage` with an ADMIN session (`token: 'h.e30.s'`, `role: 'ADMIN'`, `status: 'ACTIVE'`) so `canModify` passes. Then:

```ts
it('should round a stored two-decimal score to one decimal when editing', () => {
  const fixture = TestBed.createComponent(RatingFormPage);
  fixture.detectChanges();
  TestBed.inject(HttpTestingController).expectOne('/api/ratings/r1').flush({
    id: 'r1', creatorId: 'someone', restaurantName: 'Fiori', location: 'Brookline',
    sauce: '7', crust: '9.1', toppings: '5.0', overallRating: 8.62, affordabilityRating: 6.82,
    comments: 'Classic slice'
  });

  const { controls } = fixture.componentInstance.form;
  expect(controls.overallRating.value).toBe(8.6);
  expect(controls.affordabilityRating.value).toBe(6.8);
  expect(controls.sauce.value).toBe(7);
  expect(controls.overallRating.valid).toBeTrue();
});
```

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Update the form model in `rating-form-page.component.ts`.** Import `scoreErrorMessage`, `scoreValidator`, `roundScore` and `toScore` from `'../../core/scores/score'`, and `ScoreInput` from `'../../shared/score-input/score-input'`. Add `ScoreInput` to `imports`. Then:

```ts
type ScoreKey = 'overallRating' | 'affordabilityRating' | 'sauce' | 'crust' | 'toppings';

readonly form = this.fb.group({
  restaurantName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
  location: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(180)]],
  overallRating: this.fb.control<number | null>(null, scoreValidator),
  affordabilityRating: this.fb.control<number | null>(null, scoreValidator),
  sauce: this.fb.control<number | null>(null, scoreValidator),
  crust: this.fb.control<number | null>(null, scoreValidator),
  toppings: this.fb.control<number | null>(null, scoreValidator),
  comments: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(5000)]]
});

showScoreError(key: ScoreKey): boolean {
  const control = this.form.controls[key];
  return control.touched && control.invalid;
}

scoreError(key: ScoreKey): string {
  return scoreErrorMessage(this.form.controls[key].errors);
}
```

(`type ScoreKey` goes at module level, above `@Component`.) In `ngOnInit`'s `patchValue`, add a module-level helper and use it:

```ts
function editableScore(value: unknown): number | null {
  const score = toScore(value);
  return score === null ? null : roundScore(score);
}
```

```ts
this.form.patchValue({
  restaurantName: rating.restaurantName,
  location: rating.location,
  overallRating: editableScore(rating.overallRating),
  affordabilityRating: editableScore(rating.affordabilityRating),
  sauce: editableScore(rating.sauce),
  crust: editableScore(rating.crust),
  toppings: editableScore(rating.toppings),
  comments: rating.comments
});
```

In `submit()`, build the request as:

```ts
const request = {
  restaurantName: value.restaurantName.trim(),
  location: value.location.trim(),
  overallRating: value.overallRating!,
  affordabilityRating: value.affordabilityRating!,
  sauce: value.sauce!.toFixed(1),
  crust: value.crust!.toFixed(1),
  toppings: value.toppings!.toFixed(1),
  comments: value.comments.trim()
};
```

(The `!` is safe because `submit()` returns early while the form is invalid.)

- [ ] **Step 4: Replace the template's score fields.** Replace everything from the Sauce/Toppings `split-grid` through the Overall/Affordability `split-grid` with:

```html
<fieldset class="score-group">
  <legend>Scores</legend>

  <div class="split-grid">
    @for (score of mainScores; track score.key) {
      <div class="field">
        <app-score-input
          [inputId]="score.key"
          [label]="score.label"
          [lowLabel]="score.low"
          [highLabel]="score.high"
          [describedBy]="score.key + 'Error'"
          [invalid]="showScoreError(score.key)"
          [formControlName]="score.key"
        ></app-score-input>
        @if (showScoreError(score.key)) {
          <small [id]="score.key + 'Error'">{{ scoreError(score.key) }}</small>
        }
      </div>
    }
  </div>

  <div class="sub-score-grid">
    @for (score of subScores; track score.key) {
      <div class="field">
        <app-score-input
          [inputId]="score.key"
          [label]="score.label"
          lowLabel="Poor"
          highLabel="Excellent"
          [describedBy]="score.key + 'Error'"
          [invalid]="showScoreError(score.key)"
          [formControlName]="score.key"
        ></app-score-input>
        @if (showScoreError(score.key)) {
          <small [id]="score.key + 'Error'">{{ scoreError(score.key) }}</small>
        }
      </div>
    }
  </div>
</fieldset>
```

Add to the component class:

```ts
readonly mainScores: { key: ScoreKey; label: string; low: string; high: string }[] = [
  { key: 'overallRating', label: 'Overall', low: 'Skip it', high: 'Best in Pittsburgh' },
  { key: 'affordabilityRating', label: 'Value', low: 'Poor value', high: 'Great value' }
];

readonly subScores: { key: ScoreKey; label: string }[] = [
  { key: 'sauce', label: 'Sauce' },
  { key: 'crust', label: 'Crust' },
  { key: 'toppings', label: 'Toppings' }
];
```

Append to `rating-form-page.component.css`:

```css
.score-group {
  border: 1px solid var(--border);
  border-radius: 8px;
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 16px;
}

.score-group legend {
  font-family: var(--font-display);
  font-weight: 700;
  padding: 0 6px;
}

.sub-score-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 720px) {
  .sub-score-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Let `focusFirstInvalid` reach score inputs.** In `focus-first-invalid.ts`, change the selector to:

```ts
'input.ng-invalid, textarea.ng-invalid, select.ng-invalid, app-score-input.ng-invalid input[type="number"]'
```

- [ ] **Step 6: Run the full suite.** Expected: PASS. The existing focus test still expects `restaurantName` first.
- [ ] **Step 7: Commit.** Message: "Enter all five rating scores with slider and number controls".

---

### Task 4: Show scores the same way everywhere

**Files:**
- Modify: `frontend/src/app/shared/rating-card/rating-card.ts`, `.html`; `frontend/src/styles.css` (`.tag-chip`)
- Modify: `frontend/src/app/pages/profile/profile-page.component.ts`, `.html:135-145`
- Modify: `frontend/src/app/pages/admin-applications/admin-applications-page.component.ts`, `.html:184-188`
- Test: `frontend/src/app/shared/rating-card/rating-card.spec.ts`

**Interfaces:**
- Consumes: `ScorePipe` (Task 1)

- [ ] **Step 1: Update the card spec fixture and add failing expectations.** In `rating-card.spec.ts`, change the fixture to `sauce: '7', toppings: '8.25', crust: '9.1', overallRating: 9.1, affordabilityRating: 8.5`. Replace the `'Sweet'`, `'Pepperoni'` and `'Crisp'` expectations with:

```ts
expect(nativeElement.textContent).toContain('Value 8.5/10');
expect(nativeElement.textContent).toContain('Sauce 7.0');
expect(nativeElement.textContent).toContain('Crust 9.1');
expect(nativeElement.textContent).toContain('Toppings 8.3');
```

Ruling: the old fixture used text values ("Sweet"), which live data shows is not how the field is used.

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement.** In `rating-card.ts`, add `ScorePipe` to `imports`. In `rating-card.html`, replace the four chips with:

```html
<li class="tag-chip value-chip">Value {{ rating.affordabilityRating | score }}/10</li>
<li class="tag-chip">Sauce {{ rating.sauce | score }}</li>
<li class="tag-chip">Crust {{ rating.crust | score }}</li>
<li class="tag-chip">Toppings {{ rating.toppings | score }}</li>
```

Then:
- `styles.css`: add `font-variant-numeric: tabular-nums;` to `.tag-chip`.
- `profile-page.component.ts`: add `ScorePipe` to `imports`. In the template, render the five score cells as `{{ rating.overallRating | score }}`, `{{ rating.affordabilityRating | score }}`, `{{ rating.sauce | score }}`, `{{ rating.toppings | score }}` and `{{ rating.crust | score }}`. Rename the `Affordability` header and `data-label` to `Value`.
- `admin-applications-page.component.ts`: add `ScorePipe` to `imports`. In the template, use `Overall {{ rating.overallRating | score }}/10 -` and `Value {{ rating.affordabilityRating | score }}/10 -`.

- [ ] **Step 4: Run the full suite.** Expected: PASS
- [ ] **Step 5: Commit.** Message: "Display every score with one decimal and the Value label".

---

### Task 5: Minimum-score filters and score sorting on /ratings

**Files:**
- Modify: `frontend/src/app/pages/ratings/ratings-page.component.ts`, `.html:19-120`, `.css`
- Test: `frontend/src/app/pages/ratings/ratings-page.component.spec.ts`

**Interfaces:**
- Consumes: `toScore` (Task 1). The URL keys stay `overallRating`, `affordabilityRating`, `sauce`, `crust` and `toppings`, but now mean "at least". New key `sort`.

- [ ] **Step 1: Write failing tests** in the main `describe('RatingsPage')`:

```ts
const scored = (id: string, overallRating: number, affordabilityRating = 5) => ({
  id, restaurantName: `R${id}`, location: 'L', sauce: '5', toppings: '5', crust: '5',
  overallRating, affordabilityRating, comments: 'c'
});

it('should treat the overall filter as a minimum score', () => {
  fixture.detectChanges();
  httpTesting.expectOne('/api/ratings').flush([scored('a', 6.9), scored('b', 9.2), scored('c', 10)]);
  fixture.detectChanges();

  const select = (fixture.nativeElement as HTMLElement)
    .querySelector<HTMLSelectElement>('#ratingFilterOverall')!;
  select.value = '9';
  select.dispatchEvent(new Event('change'));
  fixture.detectChanges();

  const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
  expect(text).toContain('Rb');
  expect(text).toContain('Rc');
  expect(text).not.toContain('Ra');
});

it('should sort by highest overall score when chosen', () => {
  fixture.detectChanges();
  httpTesting.expectOne('/api/ratings').flush([scored('a', 6.9), scored('b', 9.2), scored('c', 10)]);
  fixture.detectChanges();

  const sort = (fixture.nativeElement as HTMLElement)
    .querySelector<HTMLSelectElement>('#ratingSort')!;
  sort.value = 'overall';
  sort.dispatchEvent(new Event('change'));
  fixture.detectChanges();

  const names = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-rating-card h3'))
    .map((heading) => heading.textContent?.trim());
  expect(names).toEqual(['Rc', 'Rb', 'Ra']);
});
```

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Implement in `ratings-page.component.ts`.** Import `toScore`. Add module-level constants:

```ts
const scoreFilterKeys: readonly RatingFilterKey[] = [
  'overallRating', 'affordabilityRating', 'sauce', 'crust', 'toppings'
];

type RatingSort = 'newest' | 'overall' | 'value';
const sorts: readonly RatingSort[] = ['newest', 'overall', 'value'];
```

Then:
- In `filteredRatings`, replace the `.every(...)` predicate with `activeFilters.every(([key, value]) => this.matches(rating, key, value))`.
- Add `readonly sort = signal<RatingSort>(this.sortFromUrl());` and `readonly minimumScores = [9, 8, 7, 6, 5];`.
- Add:

```ts
readonly visibleRatings = computed(() => {
  const ratings = [...this.filteredRatings()];
  const sort = this.sort();

  if (sort === 'overall') {
    ratings.sort((a, b) => b.overallRating - a.overallRating);
  } else if (sort === 'value') {
    ratings.sort((a, b) => b.affordabilityRating - a.affordabilityRating);
  }

  return ratings;
});

setSort(event: Event): void {
  const value = (event.target as HTMLSelectElement).value as RatingSort;
  this.sort.set(sorts.includes(value) ? value : 'newest');
  this.syncUrl();
}

private matches(rating: Rating, key: RatingFilterKey, value: string): boolean {
  if (scoreFilterKeys.includes(key)) {
    const minimum = toScore(value);
    const score = toScore(rating[key as keyof Rating]);
    return minimum === null || (score !== null && score >= minimum);
  }

  return this.filterValue(rating, key).includes(value);
}

private sortFromUrl(): RatingSort {
  const value = this.route.snapshot.queryParamMap.get('sort') as RatingSort | null;
  return value && sorts.includes(value) ? value : 'newest';
}
```

- In `syncUrl`, add `sort` to `queryParams`: `{ ...Object.fromEntries(...), sort: this.sort() === 'newest' ? null : this.sort() }`.
- Change `setFilter`'s cast to `(event.target as HTMLInputElement | HTMLSelectElement).value`.
- Change `clearFilters` so it also does `this.sort.set('newest')`.
- Change `hasActiveFilters` to also return true when `this.sort() !== 'newest'`.
- In the template, the `@for` iterates `visibleRatings()` instead of `filteredRatings()`.

- [ ] **Step 4: Update the template.** Replace the five text `<label>` blocks for Sauce, Toppings, Crust, Overall and Affordability with one loop:

```html
@for (score of scoreFilters; track score.key) {
  <label [for]="score.id">
    {{ score.label }}
    <select [id]="score.id" [attr.name]="score.id" [value]="filters()[score.key]" (change)="setFilter(score.key, $event)">
      <option value="">Any</option>
      @for (minimum of minimumScores; track minimum) {
        <option [value]="minimum" [selected]="filters()[score.key] === '' + minimum">{{ minimum }}+</option>
      }
    </select>
  </label>
}
```

Add to the class:

```ts
readonly scoreFilters: { key: RatingFilterKey; id: string; label: string }[] = [
  { key: 'overallRating', id: 'ratingFilterOverall', label: 'Min Overall' },
  { key: 'affordabilityRating', id: 'ratingFilterAffordability', label: 'Min Value' },
  { key: 'sauce', id: 'ratingFilterSauce', label: 'Min Sauce' },
  { key: 'crust', id: 'ratingFilterCrust', label: 'Min Crust' },
  { key: 'toppings', id: 'ratingFilterToppings', label: 'Min Toppings' }
];
```

In `.filter-heading`, add before the Clear button:

```html
<label class="sort-control" for="ratingSort">
  Sort
  <select id="ratingSort" name="ratingSort" (change)="setSort($event)">
    <option value="newest" [selected]="sort() === 'newest'">Newest</option>
    <option value="overall" [selected]="sort() === 'overall'">Highest Overall</option>
    <option value="value" [selected]="sort() === 'value'">Best Value</option>
  </select>
</label>
```

In `ratings-page.component.css`:
- change `.filter-grid input {` to `.filter-grid input,\n.filter-grid select,\n.sort-control select {`. This rule already sets explicit `background` and `color`, which is what Windows dark mode needs.
- add:

```css
.sort-control {
  align-items: center;
  display: flex;
  font-size: 0.85rem;
  font-weight: 800;
  gap: 8px;
  margin-left: auto;
}
```

- [ ] **Step 5: Run the full suite.** Expected: PASS. The existing URL tests still pass because `location` is a text filter.
- [ ] **Step 6: Commit.** Message: "Filter ratings by minimum score and sort by score".

---

### Task 6: Backend rejects non-score Sauce/Crust/Toppings

**Files:**
- Modify: `backend/src/main/java/com/pghpizza/api/rating/RatingRequest.java`
- Test: `backend/src/test/java/com/pghpizza/api/rating/RatingRequestValidationTests.java`

- [ ] **Step 1: Write the failing test**

```java
package com.pghpizza.api.rating;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class RatingRequestValidationTests {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private RatingRequest withSauce(String sauce) {
        return new RatingRequest("Fiori", "Brookline", sauce, "8.0", "9.1",
                new BigDecimal("9.0"), new BigDecimal("8.5"), "Classic slice");
    }

    @ParameterizedTest
    @ValueSource(strings = { "1", "5.0", "7.2", "9", "10", "10.0" })
    void acceptsScoresFromOneToTenWithOneDecimal(String sauce) {
        assertThat(validator.validate(withSauce(sauce))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = { "Sweet", "0.9", "10.5", "11", "8.55", "-3", "" })
    void rejectsNonScores(String sauce) {
        assertThat(validator.validate(withSauce(sauce)))
                .anyMatch(violation -> violation.getPropertyPath().toString().equals("sauce"));
    }

    @Test
    void appliesTheSameRuleToCrustAndToppings() {
        RatingRequest request = new RatingRequest("Fiori", "Brookline", "7", "Thin", "Lots",
                new BigDecimal("9.0"), new BigDecimal("8.5"), "Classic slice");
        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("crust", "toppings");
    }
}
```

- [ ] **Step 2: Run it and confirm it fails.** Run from `backend/`: `./mvnw -q test -Dtest=RatingRequestValidationTests`. Expected: FAIL on "Sweet", "0.9" and the others. Note: the record's parameter order is `restaurantName, location, sauce, toppings, crust, ...`, so check against `RatingRequest.java` and adjust the constructor calls if they differ.

- [ ] **Step 3: Implement.** In `RatingRequest.java`, add `import jakarta.validation.constraints.Pattern;` if it's missing, then:

```java
public record RatingRequest(
        @NotBlank @Size(max = 160) String restaurantName,
        @NotBlank @Size(max = 180) String location,
        @NotBlank @Size(max = 120) @Pattern(regexp = SCORE_TEXT, message = SCORE_MESSAGE) String sauce,
        @NotBlank @Size(max = 160) @Pattern(regexp = SCORE_TEXT, message = SCORE_MESSAGE) String toppings,
        @NotBlank @Size(max = 120) @Pattern(regexp = SCORE_TEXT, message = SCORE_MESSAGE) String crust,
        // overallRating, affordabilityRating, comments unchanged
) {
    static final String SCORE_TEXT = "^(10(\\.0)?|[1-9](\\.[0-9])?)$";
    static final String SCORE_MESSAGE = "must be a score from 1 to 10 with at most one decimal";
}
```

- [ ] **Step 4: Run it and confirm it passes.** Expected: PASS
- [ ] **Step 5: Commit.** Message: "Validate sauce, crust, and toppings as 1-10 scores in the API".

---

## Out of Scope (next steps)

- A Flyway migration that converts `sauce`, `crust` and `toppings` to `NUMERIC(3,1)`. Live data from 2026-10-05 shows all 13 rows are numeric, so the conversion is safe. Do it once this validation has shipped.
- Tightening the backend `@Digits(fraction = 2)` on `overallRating` and `affordabilityRating` to 1 decimal. That would reject any old client still sending 2 decimals.
- Auditing the 2 live ratings whose Value is exactly 5.0. They may be the V3 migration's placeholder default.

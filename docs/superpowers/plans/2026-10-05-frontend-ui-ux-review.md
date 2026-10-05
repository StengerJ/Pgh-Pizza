# Frontend UI/UX Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps between what the Spring Boot API tells the Angular frontend and what users see. Also fix the accessibility and interaction issues found in a Web Interface Guidelines review.

**Architecture:** All changes are in `frontend/`. The backend already returns `{ "message": "..." }` bodies with meaningful 400/404/409 messages, enforces field length limits, and issues JWTs that expire after 120 minutes. The frontend currently ignores all three. One shared error-message helper, one session-expiry interceptor, and per-page template fixes cover the work. No backend changes are required.

**Tech Stack:** Angular 20 (standalone components, signals, zoneless change detection, reactive forms), Jasmine + Karma (`npm test`), Spring Boot 3 API (reference only).

**Spec:** This document's "Review Findings" section is the spec. It came from reviewing the code on 2026-10-05 against https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md.

## Global Constraints

- No emojis anywhere: code, copy, commits.
- Loading and progress copy ends with the ellipsis character `…`, never `...`.
- Error copy says what went wrong and what to do next.
- Run tests from `frontend/` with `npm test -- --watch=false --browsers=ChromeHeadless`.
- Keep the existing idioms: `inject()`, `signal()`, `@if`/`@for` control flow, `NonNullableFormBuilder`, `standalone: true`, and global classes in `src/styles.css`.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Findings

### A. Frontend vs. backend mismatches (highest impact)

1. **Backend error messages are discarded.** Every page shows a hard-coded message. Users never see these backend messages:
   - "An account already exists for this email" (409, apply)
   - "Blog post slug already exists" (409, blog form)
   - "Reset token is invalid or expired" (409)
   - "Application has already been reviewed" (409)
   - "You cannot change your own role" (409)
   - "The default admin account cannot be demoted" (409)
   - "... not found" (404)

   For example, someone whose blog slug collides is told to "try again later". Retrying cannot work.
2. **JWT expiry is not handled.** Tokens expire after 120 minutes (`PGH_JWT_EXPIRES_MINUTES`), but the session in `localStorage` lives forever. After expiry the navbar still shows the user as logged in, and every write returns 401. Pages report that as a generic failure, so a contributor can lose a long blog post.
3. **List load failures look like empty data.** On `/ratings` and `/blog`, the error branch sets `[]`. During an outage, users see "No ratings are available yet." `/ratings` also has no loading state.
4. **Pending users get no feedback.** The backend lets `PENDING` users log in. They land on `/ratings` with no sign that their application is waiting for review, and the Apply link disappears for them.
5. **Client validation is weaker than the server's.** The frontend has no max lengths, though the backend enforces them:
   - rating: restaurant 160, location 180, sauce 120, toppings 160, crust 120, comments 5000
   - blog: title 180, location 180, body 20000, youtubeUrl 500
   - apply: email 320, name 120, password 128, reason 5000

   There is no client check on the slug pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$`. The auto-slug can come out empty (for example, a title made only of symbols), which the backend rejects with a 400.
6. **Profile pictures are stored in `localStorage`.** The base64 avatar (up to 1.4 MB) is saved in the `localStorage` session through `/auth/me` and login. That is a large share of the roughly 5 MB quota. Nothing reads `currentUser().profilePictureUrl`.
7. **Admin can reject an application without confirmation.** "Reject" is destructive and immediate. The Status column always shows `PENDING`, so it adds nothing.
8. **Blog detail shows the same message for 404 and network failure:** "No blog post is available yet."

### B. Web Interface Guidelines findings

```text
## src/index.html
src/index.html:7 - missing <meta name="theme-color">; no color-scheme declared

## src/styles.css
src/styles.css:111 - .button has no :hover state; no :focus-visible ring anywhere in app
src/styles.css - no prefers-reduced-motion handling (hover transforms in 4 files)
src/styles.css - no touch-action: manipulation
src/styles.css:45 - headings lack text-wrap: balance
src/styles.css:193 - .status messages not announced (need role="status"/"alert")

## src/app/app.html
src/app/app.html:1 - no skip link to main content

## src/home/home.component.html
src/home/home.component.html:17 - hero img missing width/height + fetchpriority="high"
src/home/home.component.css:49 - rotate hover transition not reduced-motion safe

## src/app/pages/ratings/ratings-page.component.html
ratings-page.component.html:17 - filters hidden until load; no loading state
ratings-page.component.html:26 - filter state not in URL (not shareable/deep-linkable)
ratings-page.component.html:29 - filter inputs lack autocomplete="off"
ratings-page.component.html:143 - aria-label on generic <div> is ignored

## src/app/pages/rating-form/rating-form-page.component.html
rating-form-page.component.html:15 - "Loading rating..." -> "Loading rating…"
rating-form-page.component.html:22-90 - inputs lack name/autocomplete; errors not linked (aria-describedby/aria-invalid)
rating-form-page.component.html:42 - "Sauce rating is required" but field is free text -> "Describe the sauce."
rating-form-page.component.ts:80 - invalid submit does not focus first invalid field
rating-form-page.component.html - no unsaved-changes warning

## src/app/pages/blog-form/blog-form-page.component.html
blog-form-page.component.html:39 - placeholder should end with … and show example
blog-form-page.component.html:44 - youtubeUrl should be type="url"-like: spellcheck=false, autocomplete=off
blog-form-page.component.html - errors not linked; no focus-first-error; no unsaved-changes warning

## src/app/pages/blog-detail/blog-detail-page.component.html
blog-detail-page.component.html:42 - iframe missing loading="lazy"; generic title; prefer youtube-nocookie

## src/app/pages/blog-list/blog-list-page.component.ts
blog-list-page.component.ts:74 - excerpt uses "..." -> "…"

## src/app/pages/profile/profile-page.component.html
profile-page.component.html:17 - img missing width/height
profile-page.component.ts:119 - excerpt "..." -> "…"

## src/app/pages/contributors/contributors-page.component.html
contributors-page.component.html:20 - img missing width/height + loading="lazy"

## src/app/pages/admin-applications/admin-applications-page.component.html
admin-applications-page.component.html:56 - Reject has no confirmation
admin-applications-page.component.html:28 - Status column always PENDING

## src/app/pages/apply, login, password-reset-*
"Submitting..." / "Logging in..." / "Updating..." / "Sending..." / "Saving..." -> "…"
password-reset-confirm-page.component.html:23 - token field should have spellcheck="false"

## src/app/shared/rating-card, score-badge, navbar
pass (hover transitions covered by global reduced-motion rule)
```

## Review Focus

1. **A 401 from the login endpoint itself:** a wrong password must show the "Login failed" message. It must not trigger the session-expired redirect loop. (Task 2 test.)
2. **A 401 while the user is on a form page:** they land on `/login?returnUrl=<that page>&reason=expired`, and after logging in they return to that page. (Task 2 test.)
3. **A backend error body that is not JSON:** a proxy HTML page or `null` must fall back to the page's own message, not render `undefined`. (Task 1 test.)
4. **A title made only of symbols with a blank slug,** for example `"!!!"`: the user gets an inline slug error and no request is sent. (Task 5 test.)
5. **A visitor who opens `/ratings?location=Brookline` directly:** the filter is pre-filled and applied on first render. (Task 8 test.)

---

## File Structure

| File | Responsibility |
|---|---|
| Create `src/app/core/http/api-error-message.ts` | Turns an `HttpErrorResponse` into user-facing copy |
| Create `src/app/core/interceptors/session-expiry.interceptor.ts` | Handles a 401 on an authenticated request: logout, then redirect to login |
| Create `src/app/core/forms/focus-first-invalid.ts` | Focuses the first invalid control after a rejected submit |
| Create `src/app/core/guards/unsaved-changes.guard.ts` | `canDeactivate` confirm for dirty forms |
| Modify `src/app/core/services/auth.service.ts` | Drops expired tokens on read; stops persisting avatar data |
| Modify pages under `src/app/pages/*` | Use the helpers; template a11y fixes |
| Modify `src/styles.css`, `src/index.html`, `src/app/app.html`, `src/app/app.ts` | Global focus, motion, skip link, pending banner |

---

### Task 1: Surface backend error messages

**Files:**
- Create: `frontend/src/app/core/http/api-error-message.ts`
- Test: `frontend/src/app/core/http/api-error-message.spec.ts`
- Modify: `apply-page.component.ts:64-67`, `blog-form-page.component.ts:110-113`, `rating-form-page.component.ts:108-111`, `password-reset-confirm-page.component.ts:55-58`, `profile-page.component.ts:102-105`, `admin-applications-page.component.ts` (`failAction` call sites), `ratings-page.component.ts:123-126`, `blog-list-page.component.ts:66-69`, `blog-detail-page.component.ts:78-81`

**Interfaces:**
- Produces: `apiErrorMessage(error: unknown, fallback: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/core/http/api-error-message.spec.ts
import { HttpErrorResponse } from '@angular/common/http';

import { apiErrorMessage } from './api-error-message';

describe('apiErrorMessage', () => {
  const fallback = 'Something went wrong.';
  const httpError = (status: number, error: unknown) =>
    new HttpErrorResponse({ status, error, url: '/api/x' });

  it('should return the backend message for a 409 conflict', () => {
    expect(apiErrorMessage(httpError(409, { message: 'Blog post slug already exists' }), fallback))
      .toBe('Blog post slug already exists.');
  });

  it('should return the backend message for a 404', () => {
    expect(apiErrorMessage(httpError(404, { message: 'Rating not found' }), fallback))
      .toBe('Rating not found.');
  });

  it('should turn a 400 validation message into a field hint', () => {
    expect(apiErrorMessage(httpError(400, { message: 'slug must match "^[a-z0-9]+$"' }), fallback))
      .toBe('Check the slug field and try again.');
  });

  it('should explain network failures', () => {
    expect(apiErrorMessage(httpError(0, null), fallback))
      .toBe('PGH Pizza could not be reached. Check your connection and try again.');
  });

  it('should explain forbidden responses', () => {
    expect(apiErrorMessage(httpError(403, { message: 'Forbidden' }), fallback))
      .toBe('Your account does not have permission to do that.');
  });

  it('should fall back when the body is not JSON', () => {
    expect(apiErrorMessage(httpError(409, '<html>bad gateway</html>'), fallback)).toBe(fallback);
    expect(apiErrorMessage(httpError(409, null), fallback)).toBe(fallback);
  });

  it('should fall back for 500 and non-HTTP errors', () => {
    expect(apiErrorMessage(httpError(500, { message: 'Unexpected server error' }), fallback))
      .toBe(fallback);
    expect(apiErrorMessage(new Error('boom'), fallback)).toBe(fallback);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/core/http/api-error-message.spec.ts`
Expected: FAIL, "Cannot find module './api-error-message'"

- [ ] **Step 3: Implement**

```ts
// frontend/src/app/core/http/api-error-message.ts
import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return 'PGH Pizza could not be reached. Check your connection and try again.';
  }

  if (error.status === 403) {
    return 'Your account does not have permission to do that.';
  }

  const message = backendMessage(error.error);
  if (!message) {
    return fallback;
  }

  if (error.status === 400) {
    const field = message.split(' ')[0];
    return /^[A-Za-z]+$/.test(field) ? `Check the ${field} field and try again.` : fallback;
  }

  if (error.status === 404 || error.status === 409) {
    return message.endsWith('.') ? message : `${message}.`;
  }

  return fallback;
}

function backendMessage(body: unknown): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    return typeof message === 'string' ? message.trim() : '';
  }

  return '';
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: the same command as Step 2. Expected: PASS, 7 specs.

- [ ] **Step 5: Use the helper on every page.** In each listed `error:` callback, change the parameter from `() =>` to `(error: unknown) =>` and wrap the existing copy. Each page keeps its current string as the fallback. Add `import { apiErrorMessage } from '../../core/http/api-error-message';` to each file. Exact replacements:

```ts
// apply-page.component.ts
error: (error: unknown) => {
  this.errorMessage.set(apiErrorMessage(error, 'Application could not be submitted. Please try again later.'));
  this.submitting.set(false);
}

// blog-form-page.component.ts (save)
error: (error: unknown) => {
  this.errorMessage.set(apiErrorMessage(error, 'Blog post could not be saved. Please try again later.'));
  this.submitting.set(false);
}

// rating-form-page.component.ts (save)
error: (error: unknown) => {
  this.errorMessage.set(apiErrorMessage(error, 'Rating could not be saved. Please try again later.'));
  this.submitting.set(false);
}

// password-reset-confirm-page.component.ts
error: (error: unknown) => {
  this.errorMessage.set(apiErrorMessage(error, 'Password could not be updated. Request a new reset link and try again.'));
  this.submitting.set(false);
}

// profile-page.component.ts (saveProfile)
error: (error: unknown) => {
  this.errorMessage.set(apiErrorMessage(error, 'Profile could not be saved. Please try again.'));
  this.saving.set(false);
}

// ratings-page.component.ts (removeRating)
error: (error: unknown) => {
  this.errorMessage.set(apiErrorMessage(error, 'Rating could not be removed. Please try again.'));
  this.setProcessing(ratingId, false);
}

// blog-list-page.component.ts (removePost)
error: (error: unknown) => {
  this.errorMessage.set(apiErrorMessage(error, 'Blog post could not be removed. Please try again.'));
  this.setProcessing(postId, false);
}

// blog-detail-page.component.ts (removePost)
error: (error: unknown) => {
  this.errorMessage.set(apiErrorMessage(error, 'Blog post could not be removed. Please try again.'));
  this.removing.set(false);
}
```

In `admin-applications-page.component.ts`, change `failAction` so it takes the error:

```ts
private failAction(key: string, error: unknown, fallback: string): void {
  this.errorMessage.set(apiErrorMessage(error, fallback));
  this.setProcessing(key, false);
}
```

Then update its five call sites:

```ts
error: (error: unknown) => this.failAction(key, error, 'Rating could not be removed.')
error: (error: unknown) => this.failAction(key, error, 'Blog post could not be removed.')
error: (error: unknown) => this.failAction(key, error, 'Contributor could not be removed.')
error: (error: unknown) => this.failAction(key, error, 'User permission could not be updated.')
error: (error: unknown) => this.failAction(key, error, 'Application status could not be updated.')
```

- [ ] **Step 6: Run the full suite**

Run: `npm test -- --watch=false --browsers=ChromeHeadless`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/core/http frontend/src/app/pages
git commit -m "Show backend error messages instead of generic failures"
```

---

### Task 2: Handle expired sessions

**Files:**
- Create: `frontend/src/app/core/interceptors/session-expiry.interceptor.ts`
- Test: `frontend/src/app/core/interceptors/session-expiry.interceptor.spec.ts`
- Test: `frontend/src/app/core/services/auth.service.spec.ts` (new)
- Modify: `frontend/src/app/core/services/auth.service.ts`
- Modify: `frontend/src/app/app.config.ts:20`
- Modify: `frontend/src/app/pages/login/login-page.component.ts`, `login-page.component.html`

**Interfaces:**
- Consumes: `AuthService.token()`, `AuthService.logout()`
- Produces: `sessionExpiryInterceptor: HttpInterceptorFn`. The login page reads query param `reason=expired`. `AuthService` keeps the same public API.

- [ ] **Step 1: Write the failing AuthService tests**

```ts
// frontend/src/app/core/services/auth.service.spec.ts
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

function tokenWithExp(expSeconds: number): string {
  const payload = btoa(JSON.stringify({ exp: expSeconds })).replace(/=+$/, '');
  return `header.${payload}.signature`;
}

function storeSession(token: string): void {
  localStorage.setItem('pghPizzaSession', JSON.stringify({
    token,
    user: { id: 'u1', email: 'a@b.co', displayName: 'A', role: 'CONTRIBUTOR', status: 'ACTIVE' }
  }));
}

describe('AuthService', () => {
  const create = () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient()]
    });
    return TestBed.inject(AuthService);
  };

  beforeEach(() => localStorage.clear());

  it('should drop a stored session whose token has expired', () => {
    storeSession(tokenWithExp(Math.floor(Date.now() / 1000) - 60));
    expect(create().isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('pghPizzaSession')).toBeNull();
  });

  it('should keep a stored session whose token is still valid', () => {
    storeSession(tokenWithExp(Math.floor(Date.now() / 1000) + 3600));
    expect(create().isLoggedIn()).toBeTrue();
  });

  it('should not persist profile picture data to localStorage', () => {
    const auth = create();
    (auth as unknown as { persistSession: (s: unknown) => void }).persistSession({
      token: tokenWithExp(Math.floor(Date.now() / 1000) + 3600),
      user: { id: 'u1', email: 'a@b.co', displayName: 'A', role: 'CONTRIBUTOR', status: 'ACTIVE',
        profilePictureUrl: 'data:image/png;base64,AAAA' }
    });
    expect(localStorage.getItem('pghPizzaSession')).not.toContain('data:image');
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/core/services/auth.service.spec.ts`
Expected: FAIL on the expired-session test and the profile-picture test.

- [ ] **Step 3: Implement in `auth.service.ts`.** Replace `persistSession` and `readSession`, and add `isExpired`:

```ts
private persistSession(session: AuthSession): void {
  this.sessionSignal.set(session);
  const storedSession: AuthSession = {
    ...session,
    user: { ...session.user, profilePictureUrl: null }
  };
  localStorage.setItem(this.storageKey, JSON.stringify(storedSession));
}

private readSession(): AuthSession | null {
  const rawSession = localStorage.getItem(this.storageKey);

  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as AuthSession;
    if (!session.token || !session.user || this.isExpired(session.token)) {
      localStorage.removeItem(this.storageKey);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(this.storageKey);
    return null;
  }
}

private isExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = (JSON.parse(atob(payload)) as { exp?: unknown }).exp;
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the AuthService tests and confirm they pass.** Expected: PASS, 3 specs.

- [ ] **Step 5: Write the failing interceptor test**

```ts
// frontend/src/app/core/interceptors/session-expiry.interceptor.spec.ts
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { sessionExpiryInterceptor } from './session-expiry.interceptor';

describe('sessionExpiryInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['token', 'logout']);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([sessionExpiryInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    spyOnProperty(router, 'url').and.returnValue('/blog/new');
  });

  afterEach(() => httpTesting.verify());

  it('should log out and redirect with returnUrl on 401 for an authenticated request', () => {
    auth.token.and.returnValue('abc');
    http.post('/api/blog-posts', {}).subscribe({ error: () => undefined });
    httpTesting.expectOne('/api/blog-posts').flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/blog/new', reason: 'expired' }
    });
  });

  it('should ignore 401 from the login endpoint', () => {
    auth.token.and.returnValue(null);
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    httpTesting.expectOne('/api/auth/login').flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should ignore 401 when no token was sent', () => {
    auth.token.and.returnValue(null);
    http.get('/api/ratings').subscribe({ error: () => undefined });
    httpTesting.expectOne('/api/ratings').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run it and confirm it fails** (the module is missing).

- [ ] **Step 7: Implement the interceptor**

```ts
// frontend/src/app/core/interceptors/session-expiry.interceptor.ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const sessionExpiryInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const hadToken = Boolean(auth.token());

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        hadToken &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.includes('/auth/login')
      ) {
        const returnUrl = router.url;
        auth.logout();
        void router.navigate(['/login'], { queryParams: { returnUrl, reason: 'expired' } });
      }

      return throwError(() => error);
    })
  );
};
```

Register it in `app.config.ts`:

```ts
provideHttpClient(withInterceptors([authInterceptor, sessionExpiryInterceptor, errorLoggingInterceptor])),
```

- [ ] **Step 8: Show the reason on the login page.** In `login-page.component.ts`, add:

```ts
readonly sessionExpired = this.route.snapshot.queryParamMap.get('reason') === 'expired';
```

In `login-page.component.html`, insert directly after `</header>`:

```html
@if (sessionExpired) {
  <p class="status" role="status">Your session expired. Log in again to pick up where you left off.</p>
}
```

- [ ] **Step 9: Run the full suite.** Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add frontend/src/app/core frontend/src/app/app.config.ts frontend/src/app/pages/login
git commit -m "Log out and redirect on expired sessions; stop persisting avatar data"
```

---

### Task 3: Distinguish load failures from empty data

**Files:**
- Modify: `ratings-page.component.ts:74-82`, `ratings-page.component.html:13-158`
- Modify: `blog-list-page.component.ts:26-34`
- Modify: `blog-detail-page.component.ts:41-50`, `blog-detail-page.component.html:8-10`
- Test: `frontend/src/app/pages/ratings/ratings-page.component.spec.ts`

**Interfaces:**
- Consumes: `apiErrorMessage` (Task 1)

- [ ] **Step 1: Add failing tests to `ratings-page.component.spec.ts`**

```ts
it('should show a loading message until ratings arrive', () => {
  fixture.detectChanges();
  expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading ratings…');
  httpTesting.expectOne('/api/ratings').flush([]);
});

it('should show an error instead of the empty state when loading fails', () => {
  fixture.detectChanges();
  httpTesting.expectOne('/api/ratings').flush(null, { status: 500, statusText: 'Server Error' });
  fixture.detectChanges();

  const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
  expect(text).toContain('Ratings could not be loaded. Refresh the page to try again.');
  expect(text).not.toContain('No ratings are available yet.');
});
```

- [ ] **Step 2: Run them and confirm they fail.**

- [ ] **Step 3: Implement.** In `ratings-page.component.ts`, add `readonly loadFailed = signal(false);` and change `ngOnInit`'s error handler:

```ts
error: (error: unknown) => {
  this.ratings.set([]);
  this.loadFailed.set(true);
  this.errorMessage.set(apiErrorMessage(error, 'Ratings could not be loaded. Refresh the page to try again.'));
}
```

In `ratings-page.component.html`, replace the `<div class="ratings-grid" ...>` block with:

```html
@if (loading()) {
  <p class="status" role="status">Loading ratings…</p>
}

<div class="ratings-grid" role="list" aria-label="Pizza ratings">
  @if (!loading() && !loadFailed() && ratings().length === 0) {
    <p class="status empty">No ratings are available yet.</p>
  } @else if (!loading() && ratings().length > 0 && filteredRatings().length === 0) {
    <p class="status empty">No ratings match those filters. <button class="link-inline" type="button" (click)="clearFilters()">Clear Filters</button></p>
  } @else {
    @for (rating of filteredRatings(); track rating.id ?? rating.restaurantName) {
      <app-rating-card
        role="listitem"
        [rating]="rating"
        [canManage]="canManage(rating)"
        [processing]="isProcessing(rating.id)"
        (remove)="removeRating($event)"
      ></app-rating-card>
    }
  }
</div>
```

Add this to `src/styles.css` (it is reused later):

```css
.link-inline {
  background: none;
  border: 0;
  color: var(--accent-maroon);
  cursor: pointer;
  font-weight: 800;
  padding: 0;
  text-decoration: underline;
}
```

In `blog-list-page.component.ts`, add `readonly loadFailed = signal(false);` and change the error handler:

```ts
error: (error: unknown) => {
  this.posts.set([]);
  this.loadFailed.set(true);
  this.errorMessage.set(apiErrorMessage(error, 'Blog posts could not be loaded. Refresh the page to try again.'));
}
```

In `blog-list-page.component.html`, change line 21 to `@if (!loading() && !loadFailed() && posts().length === 0) {`, and line 14 to `<p class="status" role="status">Loading posts…</p>`.

In `blog-detail-page.component.ts`, change the load error handler:

```ts
error: (error: unknown) => {
  const notFound = error instanceof HttpErrorResponse && error.status === 404;
  this.errorMessage.set(
    notFound
      ? 'This post does not exist or was removed. Browse the blog for other posts.'
      : apiErrorMessage(error, 'This post could not be loaded. Refresh the page to try again.')
  );
}
```

Add `import { HttpErrorResponse } from '@angular/common/http';`. In the template, change line 9 to `<p class="status error" role="alert">{{ errorMessage() }}</p>`.

- [ ] **Step 4: Run the full suite.** Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "Show load failures and loading states on list and detail pages"
```

---

### Task 4: Pending-contributor banner

**Files:**
- Modify: `frontend/src/app/app.ts`, `frontend/src/app/app.html`, `frontend/src/app/app.css`
- Modify: `frontend/src/app/pages/login/login-page.component.ts:39`
- Test: `frontend/src/app/app.spec.ts`

- [ ] **Step 1: Add a failing test to `app.spec.ts`.** Follow that file's existing TestBed setup, and add:

```ts
it('should tell pending contributors their application is under review', () => {
  localStorage.setItem('pghPizzaSession', JSON.stringify({
    token: 'h.e30.s',
    user: { id: 'u1', email: 'a@b.co', displayName: 'A', role: 'PENDING_CONTRIBUTOR', status: 'PENDING' }
  }));
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  expect((fixture.nativeElement as HTMLElement).textContent)
    .toContain('Your contributor application is waiting for admin review.');
});
```

(`e30` is base64 for `{}`, so the token has no `exp` and is treated as not expired.) If `app.spec.ts` creates the component in `beforeEach`, put this test in its own `describe` block that sets `localStorage` before `TestBed.createComponent`.

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement.** In `app.ts`:

```ts
import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { Navbar } from './shared/navbar/navbar';

// ...decorator unchanged
export class App {
  private readonly auth = inject(AuthService);
  protected readonly title = signal('PGH Pizza');
  protected readonly pendingReview = computed(() => this.auth.currentUser()?.status === 'PENDING');
}
```

Replace `app.html` with (this also adds the skip link from Task 7):

```html
<a class="skip-link" href="#main-content">Skip to Main Content</a>
<app-navbar></app-navbar>
@if (pendingReview()) {
  <p class="pending-banner" role="status">
    Your contributor application is waiting for admin review. You can browse ratings and posts;
    publishing unlocks once you are approved.
  </p>
}
<main class="app-main" id="main-content" tabindex="-1">
  <router-outlet></router-outlet>
</main>
```

Append to `app.css`:

```css
.pending-banner {
  background: var(--soft-gold);
  border-bottom: 1px solid rgba(242, 159, 5, 0.45);
  color: var(--ink);
  margin: 0;
  padding: 12px 16px;
  text-align: center;
}

.app-main:focus {
  outline: none;
}
```

(`main` only takes focus from the skip link, so suppressing its outline there is intended.)

In `login-page.component.ts`, send pending users home instead of to `/ratings`:

```ts
next: (session) => {
  const fallback = session.user.status === 'PENDING' ? '/' : '/ratings';
  const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? fallback;
  this.submitting.set(false);
  void this.router.navigateByUrl(returnUrl);
},
```

- [ ] **Step 4: Run the full suite.** Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app
git commit -m "Tell pending contributors their application is under review"
```

---

### Task 5: Align form validation with the backend and make errors accessible

**Files:**
- Create: `frontend/src/app/core/forms/focus-first-invalid.ts`
- Modify: `rating-form-page.component.ts/.html`, `blog-form-page.component.ts/.html`, `apply-page.component.ts/.html`, `login-page.component.html`, `password-reset-confirm-page.component.html`, `password-reset-request-page.component.html`, `profile-page.component.html`
- Test: `frontend/src/app/pages/blog-form/blog-form-page.component.spec.ts` (new)

**Interfaces:**
- Produces: `focusFirstInvalid(host: HTMLElement): void`

- [ ] **Step 1: Write the failing blog-form test**

```ts
// frontend/src/app/pages/blog-form/blog-form-page.component.spec.ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BlogFormPage } from './blog-form-page.component';

describe('BlogFormPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [BlogFormPage],
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('should not submit when the title cannot produce a slug', () => {
    const fixture = TestBed.createComponent(BlogFormPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.form.setValue({
      title: '!!!!',
      location: 'Brookline',
      slug: '',
      body: 'A body that is long enough to pass.',
      youtubeUrl: ''
    });

    page.submit();
    fixture.detectChanges();

    TestBed.inject(HttpTestingController).expectNone('/api/blog-posts');
    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('Add a slug using lowercase letters, numbers, and hyphens.');
  });

  it('should reject a slug with uppercase letters', () => {
    const fixture = TestBed.createComponent(BlogFormPage);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.slug.setValue('My-Post');
    expect(fixture.componentInstance.form.controls.slug.invalid).toBeTrue();
  });

  it('should enforce the backend title length limit', () => {
    const fixture = TestBed.createComponent(BlogFormPage);
    fixture.componentInstance.form.controls.title.setValue('x'.repeat(181));
    expect(fixture.componentInstance.form.controls.title.invalid).toBeTrue();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Create the focus helper**

```ts
// frontend/src/app/core/forms/focus-first-invalid.ts
export function focusFirstInvalid(host: HTMLElement): void {
  queueMicrotask(() => {
    host.querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid, select.ng-invalid')?.focus();
  });
}
```

- [ ] **Step 4: Update the blog form validators and submit.** In `blog-form-page.component.ts`:

```ts
private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
private static readonly slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

readonly form = this.fb.group({
  title: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(180)]],
  location: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(180)]],
  slug: ['', [Validators.maxLength(180), Validators.pattern(BlogFormPage.slugPattern)]],
  body: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(20000)]],
  youtubeUrl: ['', [Validators.maxLength(500)]]
});
```

Add `ElementRef` to the `@angular/core` import and import `focusFirstInvalid`. In `submit()`, replace the invalid branch with:

```ts
if (this.form.invalid) {
  this.form.markAllAsTouched();
  focusFirstInvalid(this.host);
  return;
}
```

Replace `const slug = value.slug.trim() || this.slugify(value.title);` with:

```ts
const slug = value.slug.trim() || this.slugify(value.title);

if (!slug) {
  this.form.controls.slug.setErrors({ pattern: true });
  this.form.controls.slug.markAsTouched();
  focusFirstInvalid(this.host);
  return;
}
```

- [ ] **Step 5: Update the blog form template.** Each field follows the pattern below: add `name`, `autocomplete`, and `[attr.aria-invalid]`; point `aria-describedby` at the hint; and give the `<small>` an `id`. Full replacement for the slug and YouTube fields:

```html
<div class="field">
  <label for="slug">Slug</label>
  <input
    id="slug"
    name="slug"
    type="text"
    autocomplete="off"
    spellcheck="false"
    placeholder="fiori-pizza-brookline…"
    aria-describedby="slugHint"
    [attr.aria-invalid]="form.controls.slug.touched && form.controls.slug.invalid"
    formControlName="slug"
  >
  @if (form.controls.slug.touched && form.controls.slug.invalid) {
    <small id="slugHint">Add a slug using lowercase letters, numbers, and hyphens.</small>
  } @else {
    <small id="slugHint" class="hint">Leave blank to generate one from the title.</small>
  }
</div>

<div class="field">
  <label for="youtubeUrl">YouTube URL or Video ID</label>
  <input
    id="youtubeUrl"
    name="youtubeUrl"
    type="text"
    inputmode="url"
    autocomplete="off"
    spellcheck="false"
    placeholder="https://youtu.be/dQw4w9WgXcQ…"
    formControlName="youtubeUrl"
  >
</div>
```

For title, location, and body, use the same attributes. `id` / `name` = `title`, `location`, `body`, with `autocomplete="off"`, plus `aria-describedby="<id>Error"` and `<small id="<id>Error">`. Error copy:
- title: `Use 4 to 180 characters.`
- location: `Use 2 to 180 characters.`
- body: `Write at least 20 characters (20,000 max).`

Change the submit label to `{{ submitting() ? 'Saving…' : editing() ? 'Save Post' : 'Publish Post' }}` and the loading line to `Loading post…`.

Add to `src/styles.css`:

```css
.field small.hint {
  color: var(--muted);
}

.field [aria-invalid='true'] {
  border-color: var(--accent-bright-red);
}
```

- [ ] **Step 6: Update the rating form.** In `rating-form-page.component.ts`:

```ts
readonly form = this.fb.group({
  restaurantName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
  location: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(180)]],
  sauce: ['', [Validators.required, Validators.maxLength(120)]],
  toppings: ['', [Validators.required, Validators.maxLength(160)]],
  crust: ['', [Validators.required, Validators.maxLength(120)]],
  overallRating: [8, [Validators.required, Validators.min(1), Validators.max(10)]],
  affordabilityRating: [8, [Validators.required, Validators.min(1), Validators.max(10)]],
  comments: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(5000)]]
});
```

Inject `ElementRef` in the same way as the blog form, and call `focusFirstInvalid(this.host)` in the invalid branch of `submit()`. In the template, give every input and the textarea `name` equal to its `id`, plus `autocomplete="off"`, `aria-describedby="<id>Error"`, and `[attr.aria-invalid]="form.controls.<id>.touched && form.controls.<id>.invalid"`. Give each `<small>` `id="<id>Error"`. Replace the error copy so it matches free-text fields:
- restaurantName: `Use 2 to 160 characters.`
- location: `Use 2 to 180 characters.`
- sauce: `Describe the sauce (120 characters max).`
- toppings: `Describe the toppings (160 characters max).`
- crust: `Describe the crust (120 characters max).`
- comments: `Write at least 5 characters (5,000 max).`

Add placeholders:
- sauce: `Sweet, chunky…`
- toppings: `Pepperoni cups…`
- crust: `Thin and crisp…`

Add `inputmode="decimal"` to both number inputs. Labels in Title Case: "Restaurant Name", "Overall Rating", "Affordability Rating". Loading line: `Loading rating…`. Button: `{{ submitting() ? 'Saving…' : editing() ? 'Save Rating' : 'Publish Rating' }}`.

- [ ] **Step 7: Update the apply form.** In `apply-page.component.ts`:

```ts
email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
confirmPassword: ['', [Validators.required]],
applicationReason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(5000)]]
```

Inject `ElementRef` and call `focusFirstInvalid(this.host)` in the invalid branch. In the template:
- add `name` equal to `id` on every control and `spellcheck="false"` on email
- password error copy: `Use 8 to 128 characters.`
- button: `{{ submitting() ? 'Submitting…' : 'Submit Application' }}`

- [ ] **Step 8: Apply the ellipsis and `name` fixes to the auth pages.**
- `login-page.component.html`: `name="email"`, `spellcheck="false"` on email, `name="password"`; button `{{ submitting() ? 'Logging In…' : 'Log In' }}`; link text `Reset Password`.
- `password-reset-request-page.component.html`: `name="email"`, `spellcheck="false"`; button `{{ submitting() ? 'Sending…' : 'Send Reset Link' }}`.
- `password-reset-confirm-page.component.html`: token input gets `name="token"` and `spellcheck="false"`; button `{{ submitting() ? 'Updating…' : 'Update Password' }}`.
- `profile-page.component.html`: `name="displayName"` with `autocomplete="nickname"`, `name="bio"`; button `{{ saving() ? 'Saving…' : 'Save Profile' }}`; loading line `Loading profile…`.

- [ ] **Step 9: Run the full suite.** Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add frontend/src
git commit -m "Match form validation to API limits and link errors to fields"
```

---

### Task 6: Admin page safety and clarity

**Files:**
- Modify: `admin-applications-page.component.ts:56-58`, `admin-applications-page.component.html:24-44`
- Test: `frontend/src/app/pages/admin-applications/admin-applications-page.component.spec.ts` (new)

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/pages/admin-applications/admin-applications-page.component.spec.ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ContributorApplication } from '../../core/models/application.model';
import { AdminApplicationsPage } from './admin-applications-page.component';

describe('AdminApplicationsPage', () => {
  const application: ContributorApplication = {
    id: 'app-1', email: 'a@b.co', displayName: 'Applicant', applicationReason: 'I love pizza',
    status: 'PENDING', createdAt: '2026-10-01T00:00:00Z'
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminApplicationsPage],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('should not reject an application unless the admin confirms', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const fixture = TestBed.createComponent(AdminApplicationsPage);
    fixture.componentInstance.reject(application);

    TestBed.inject(HttpTestingController).expectNone('/api/admin/applications/app-1/reject');
    expect(window.confirm).toHaveBeenCalledWith('Reject the application from Applicant? This cannot be undone.');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement**

```ts
reject(application: ContributorApplication): void {
  if (!confirm(`Reject the application from ${application.displayName}? This cannot be undone.`)) {
    return;
  }

  this.updateApplication(application.id, 'REJECTED');
}
```

In the template, remove the `<th>Status</th>` header and the `<td data-label="Status">{{ application.status }}</td>` cell, and change `colspan="6"` to `colspan="5"`. Add `<span class="subtle">{{ pendingApplications().length }} pending</span>` inside the "Contributor applications" `.section-heading`, next to the `<h2>`.

- [ ] **Step 4: Run the full suite.** Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/admin-applications
git commit -m "Confirm before rejecting applications; drop redundant status column"
```

---

### Task 7: Global accessibility, motion, and media fixes

**Files:**
- Modify: `frontend/src/index.html`, `frontend/src/styles.css`
- Modify: `home.component.html:17`, `profile-page.component.html:17-21,56-60,119`, `profile-page.component.ts:119`, `contributors-page.component.html:20-24`, `blog-detail-page.component.html:42-47`, `blog-list-page.component.ts:74`, `core/utils/youtube.ts:785-787`, `core/utils/youtube.spec.ts:40`
- Modify: every template that renders `.status`, adding `role`

- [ ] **Step 1: Update the YouTube test first.** In `youtube.spec.ts:40`, change the expected URL to `'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'`. Run `npm test -- --watch=false --browsers=ChromeHeadless --include=src/app/core/utils/youtube.spec.ts`. Expected: FAIL.

- [ ] **Step 2: Implement it.** In `youtube.ts`:

```ts
export function buildYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}
```

Rerun. Expected: PASS.

- [ ] **Step 3: Update `index.html`.** After the viewport meta, add:

```html
<meta name="theme-color" content="#fffdf8">
<meta name="color-scheme" content="light">
```

- [ ] **Step 4: Update `styles.css`.** Add `color-scheme: light;` inside `:root`. Then append:

```css
html {
  touch-action: manipulation;
}

h1,
h2,
h3 {
  text-wrap: balance;
}

:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 3px solid var(--accent-maroon);
  outline-offset: 2px;
}

.button.primary:hover:not(:disabled) {
  background: var(--accent-bright-red);
}

.button.secondary:hover:not(:disabled) {
  background: var(--soft-gold);
}

.button.danger:hover:not(:disabled) {
  background: var(--palette-dark);
}

.skip-link {
  background: var(--accent-maroon);
  border-radius: 8px;
  color: var(--on-accent);
  font-weight: 800;
  left: 16px;
  padding: 10px 16px;
  position: absolute;
  top: -100px;
  z-index: 20;
}

.skip-link:focus-visible {
  top: 12px;
}

:where(h1, h2, [id]) {
  scroll-margin-top: 88px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }

  .hero-media,
  .hero-media:hover {
    transform: none;
  }
}
```

The `.hero-media` rule lives in a component stylesheet. Because Angular scopes component styles, also add this at the end of `home.component.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .hero-media,
  .hero-media:hover {
    transform: none;
  }
}
```

Also add `role` attributes to the `.status` messages. Every `<p class="status error">` gets `role="alert"`. Every `<p class="status success">` and every loading `<p class="status">` gets `role="status"`. Files:
- `ratings-page`, `rating-form-page`, `blog-list-page`, `blog-detail-page`, `blog-form-page`
- `apply-page`, `login-page`, `password-reset-request-page`, `password-reset-confirm-page`
- `profile-page`, `contributors-page`, `admin-applications-page`

- [ ] **Step 5: Fix the images and iframe.**
- `home.component.html:17`: `<img src="/PghPizza.png" alt="A pizza illustration for PGH Pizza" width="440" height="440" fetchpriority="high">`
- `profile-page.component.html`: profile photo `width="112" height="112"`; picture preview `width="88" height="88"`.
- `contributors-page.component.html`: thumbnail `width="72" height="72" loading="lazy"`.
- `blog-detail-page.component.html`: the iframe becomes

```html
<iframe
  [src]="embedUrl()"
  [title]="'Video: ' + currentPost.title"
  loading="lazy"
  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen
></iframe>
```

(`autoplay` is removed from `allow`, because nothing should autoplay.)

- [ ] **Step 6: Fix the ellipses in excerpts.** In `blog-list-page.component.ts:74` and `profile-page.component.ts:119`, replace `` `...` `` with `` `…` `` in the template literal, giving `` `${post.body.slice(0, 180)}…` `` and `` `${post.body.slice(0, 140)}…` ``.

- [ ] **Step 7: Run the full suite and a production build**

Run: `npm test -- --watch=false --browsers=ChromeHeadless && npm run build`
Expected: tests PASS; the build completes with no errors.

- [ ] **Step 8: Check by hand** with `npm start` and a browser:
- Press Tab on any page: the skip link appears first, and Enter moves focus to main.
- Every button and link shows a maroon ring on keyboard focus but not on mouse click.
- With OS reduce-motion on, cards no longer lift and the hero no longer rotates.

- [ ] **Step 9: Commit**

```bash
git add frontend/src
git commit -m "Add focus rings, skip link, reduced motion, live regions, and media fixes"
```

---

### Task 8: Keep rating filters in the URL

**Files:**
- Modify: `ratings-page.component.ts`, `ratings-page.component.html:26-120`
- Test: `ratings-page.component.spec.ts`

**Interfaces:**
- Consumes: the existing `RatingFilterKey`, `RatingFilters`, and `emptyFilters` in that file

- [ ] **Step 1: Write the failing test.** Add a new `describe` block to `ratings-page.component.spec.ts`:

```ts
describe('RatingsPage URL filters', () => {
  it('should apply filters from the query string on first render', async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RatingsPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ location: 'Brookline' }) } }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(RatingsPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/ratings').flush([
      { id: '1', restaurantName: 'Fiori', location: 'Brookline', sauce: 's', toppings: 't', crust: 'c', overallRating: 9, affordabilityRating: 8, comments: 'good' },
      { id: '2', restaurantName: 'Mineo', location: 'Squirrel Hill', sauce: 's', toppings: 't', crust: 'c', overallRating: 9, affordabilityRating: 8, comments: 'good' }
    ]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(fixture.componentInstance.filters().location).toBe('Brookline');
    expect(text).toContain('Fiori');
    expect(text).not.toContain('Mineo');
  });
});
```

Add `ActivatedRoute` and `convertToParamMap` to the `@angular/router` import in the spec.

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement.** In `ratings-page.component.ts`, inject the route and router:

```ts
private readonly route = inject(ActivatedRoute);
private readonly router = inject(Router);
```

Update the import to `import { ActivatedRoute, Router, RouterLink } from '@angular/router';`. Replace the `filters` initializer:

```ts
readonly filters = signal<RatingFilters>(this.filtersFromUrl());
```

Replace `setFilter` and `clearFilters`, and add two private helpers:

```ts
setFilter(key: RatingFilterKey, event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  this.filters.update((filters) => ({ ...filters, [key]: value }));
  this.syncUrl();
}

clearFilters(): void {
  this.filters.set({ ...emptyFilters });
  this.syncUrl();
}

private filtersFromUrl(): RatingFilters {
  const params = this.route.snapshot.queryParamMap;
  const filters = { ...emptyFilters };

  for (const key of Object.keys(emptyFilters) as RatingFilterKey[]) {
    filters[key] = params.get(key) ?? '';
  }

  return filters;
}

private syncUrl(): void {
  const queryParams = Object.fromEntries(
    Object.entries(this.filters()).map(([key, value]) => [key, value.trim() || null])
  );
  void this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
}
```

In the template, add `autocomplete="off"` and `[attr.name]="'filter-' + <key>"`, or simply a literal `name` such as `name="filterRestaurant"`, to each of the nine filter inputs. Also change the `@if (!loading() && ratings().length > 0)` guard on the filter panel to `@if (ratings().length > 0 || hasActiveFilters())`, so filters arriving from the URL stay visible and clearable.

- [ ] **Step 4: Run the full suite.** Expected: PASS. The other `RatingsPage` tests use the real `ActivatedRoute` from `provideRouter([])`, whose query map is empty.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/pages/ratings
git commit -m "Keep rating filters in the URL so they can be shared and restored"
```

---

### Task 9: Warn before leaving forms with unsaved changes

**Files:**
- Create: `frontend/src/app/core/guards/unsaved-changes.guard.ts`
- Test: `frontend/src/app/core/guards/unsaved-changes.guard.spec.ts`
- Modify: `app.routes.ts:27-66` (four form routes), `rating-form-page.component.ts`, `blog-form-page.component.ts`

**Interfaces:**
- Produces: `interface HasUnsavedChanges { hasUnsavedChanges(): boolean }` and `unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges>`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/app/core/guards/unsaved-changes.guard.spec.ts
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  const run = (dirty: boolean) =>
    unsavedChangesGuard(
      { hasUnsavedChanges: () => dirty } satisfies HasUnsavedChanges,
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot
    );

  it('should allow leaving a clean form without asking', () => {
    spyOn(window, 'confirm');
    expect(run(false)).toBeTrue();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('should ask before leaving a dirty form', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    expect(run(true)).toBeFalse();
    expect(window.confirm).toHaveBeenCalledWith('Discard your unsaved changes?');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement the guard**

```ts
// frontend/src/app/core/guards/unsaved-changes.guard.ts
import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() || confirm('Discard your unsaved changes?');
```

- [ ] **Step 4: Wire it into both form pages.** In `rating-form-page.component.ts` and `blog-form-page.component.ts`:
- add `implements OnInit, HasUnsavedChanges`
- add `HostListener` to the `@angular/core` import
- add a `private saved = false;` field
- set `this.saved = true;` in the save `next:` callback, before navigating
- add:

```ts
hasUnsavedChanges(): boolean {
  return this.form.dirty && !this.saved;
}

@HostListener('window:beforeunload', ['$event'])
warnOnUnload(event: BeforeUnloadEvent): void {
  if (this.hasUnsavedChanges()) {
    event.preventDefault();
  }
}
```

In `app.routes.ts`, import `unsavedChangesGuard` and add `canDeactivate: [unsavedChangesGuard]` to `ratings/new`, `ratings/:id/edit`, `blog/new`, and `blog/:slug/edit`.

- [ ] **Step 5: Run the full suite.** Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app
git commit -m "Warn before leaving rating and blog forms with unsaved changes"
```

---

## Out of Scope (follow-ups worth a separate plan)

- **Serve profile pictures from an image endpoint** (`GET /api/profiles/{id}/picture`) instead of inline base64. Today `/api/profiles/contributors` returns every avatar inline, which grows with each contributor. This is a backend schema and API change.
- **Server-side sorting and pagination for `/api/ratings` and `/api/blog-posts`.** Both currently return everything, newest first. Once ratings pass about 50, add sort-by-score and pagination together.
- **A real 404 page** instead of `'**'` redirecting to home.
- **Replace native `confirm()` with an in-app dialog** that offers undo.

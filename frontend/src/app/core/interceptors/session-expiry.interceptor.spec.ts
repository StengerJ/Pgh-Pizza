import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { catchError, map, of } from 'rxjs';

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
    httpTesting
      .expectOne('/api/blog-posts')
      .flush({ message: 'x' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/blog/new', reason: 'expired' }
    });
  });

  it('should ignore 401 from the login endpoint', () => {
    auth.token.and.returnValue(null);
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    httpTesting
      .expectOne('/api/auth/login')
      .flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

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

describe('sessionExpiryInterceptor during a guarded navigation', () => {
  @Component({ template: '' })
  class Blank {}

  const meGuard = () =>
    inject(HttpClient).get('/api/auth/me').pipe(
      map(() => true),
      catchError(() => of(false))
    );

  it('should return the user to the page they were navigating to, not the page they left', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['token', 'logout']);
    auth.token.and.returnValue('stale-token');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'ratings', component: Blank },
          { path: 'ratings/new', component: Blank, canActivate: [meGuard] },
          { path: 'login', component: Blank }
        ]),
        provideHttpClient(withInterceptors([sessionExpiryInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth }
      ]
    });
    const router = TestBed.inject(Router);
    const httpTesting = TestBed.inject(HttpTestingController);
    await router.navigateByUrl('/ratings');

    const navigation = router.navigateByUrl('/ratings/new');
    await new Promise((resolve) => setTimeout(resolve));
    httpTesting.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await navigation;
    await new Promise((resolve) => setTimeout(resolve));

    expect(router.url).toBe('/login?returnUrl=%2Fratings%2Fnew&reason=expired');
  });
});

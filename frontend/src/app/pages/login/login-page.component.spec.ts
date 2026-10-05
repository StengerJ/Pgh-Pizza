import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { LoginPage } from './login-page.component';

describe('LoginPage', () => {
  let queryParamMap$: BehaviorSubject<ParamMap>;

  const setup = async (queryParams: Record<string, string>) => {
    localStorage.clear();
    queryParamMap$ = new BehaviorSubject(convertToParamMap(queryParams));
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(queryParams) },
            queryParamMap: queryParamMap$
          }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  };

  const loginAs = async (status: string) => {
    await setup({});
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    const page = TestBed.createComponent(LoginPage).componentInstance;
    page.form.setValue({ email: 'a@b.co', password: 'password123' });
    page.submit();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush({
      token: 'h.e30.s',
      user: { id: 'u1', email: 'a@b.co', displayName: 'A', role: 'PENDING_CONTRIBUTOR', status }
    });
    return navigate;
  };

  it('should send pending contributors home after login', async () => {
    expect(await loginAs('PENDING')).toHaveBeenCalledWith('/');
  });

  it('should send active contributors to ratings after login', async () => {
    expect(await loginAs('ACTIVE')).toHaveBeenCalledWith('/ratings');
  });

  it('should explain that the session expired when redirected for that reason', async () => {
    expect(await setup({ reason: 'expired', returnUrl: '/blog/new' }))
      .toContain('Your session expired. Log in again to pick up where you left off.');
  });

  it('should show the expiry message when redirected while already on the login page', async () => {
    await setup({});
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    queryParamMap$.next(convertToParamMap({ reason: 'expired' }));
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Your session expired');
  });

  it('should not show the expiry message on a normal visit', async () => {
    expect(await setup({})).not.toContain('Your session expired');
  });
});

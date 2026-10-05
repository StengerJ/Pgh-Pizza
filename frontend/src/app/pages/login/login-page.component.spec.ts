import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { LoginPage } from './login-page.component';

describe('LoginPage', () => {
  const setup = async (queryParams: Record<string, string>) => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  };

  it('should explain that the session expired when redirected for that reason', async () => {
    expect(await setup({ reason: 'expired', returnUrl: '/blog/new' }))
      .toContain('Your session expired. Log in again to pick up where you left off.');
  });

  it('should not show the expiry message on a normal visit', async () => {
    expect(await setup({})).not.toContain('Your session expired');
  });
});

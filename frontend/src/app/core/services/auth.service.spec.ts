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

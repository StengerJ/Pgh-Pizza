import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  let loggedIn = true;

  beforeEach(() => {
    loggedIn = true;
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: { isLoggedIn: () => loggedIn } }
      ]
    });
  });

  const run = (dirty: boolean) =>
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(
        { hasUnsavedChanges: () => dirty } satisfies HasUnsavedChanges,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot
      )
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

  it('should explain the expired session when asking after a forced logout', () => {
    loggedIn = false;
    spyOn(window, 'confirm').and.returnValue(false);
    expect(run(true)).toBeFalse();
    expect(window.confirm).toHaveBeenCalledWith(
      'Your session expired, so these changes cannot be saved yet. Leave and lose them? Choose Cancel to stay and copy your work first.'
    );
  });
});

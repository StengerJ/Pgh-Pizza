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

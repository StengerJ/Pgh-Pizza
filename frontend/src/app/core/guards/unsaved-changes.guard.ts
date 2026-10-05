import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

import { AuthService } from '../services/auth.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  // These forms sit behind contributor routes, so being logged out here means the session expired.
  const message = inject(AuthService).isLoggedIn()
    ? 'Discard your unsaved changes?'
    : 'Your session expired, so these changes cannot be saved yet. Leave and lose them? Choose Cancel to stay and copy your work first.';
  return confirm(message);
};

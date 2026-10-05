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
        // Public reads work without a session, so drop the stale token and retry quietly.
        if (request.method === 'GET' && !request.url.includes('/auth/me')) {
          auth.logout();
          return next(request.clone({ headers: request.headers.delete('Authorization') }));
        }

        // A guard's request fails mid-navigation; return to where the user was headed.
        const navigation = router.currentNavigation();
        const target = navigation?.finalUrl ?? navigation?.extractedUrl;
        const returnUrl = target ? router.serializeUrl(target) : router.url;
        auth.logout();
        void router.navigate(['/login'], { queryParams: { returnUrl, reason: 'expired' } });
      }

      return throwError(() => error);
    })
  );
};

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

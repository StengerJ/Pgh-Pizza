import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { RouteReuseStrategy, provideRouter } from '@angular/router';

import { AppErrorHandler } from './core/errors/app-error.handler';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorLoggingInterceptor } from './core/interceptors/error-logging.interceptor';
import { sessionExpiryInterceptor } from './core/interceptors/session-expiry.interceptor';
import { TimedRouteReuseStrategy } from './core/routing/timed-route-reuse.strategy';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor, sessionExpiryInterceptor, errorLoggingInterceptor])),
    provideRouter(routes),
    { provide: ErrorHandler, useClass: AppErrorHandler },
    { provide: RouteReuseStrategy, useClass: TimedRouteReuseStrategy }
  ]
};

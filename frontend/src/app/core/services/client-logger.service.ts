import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../environments/environment';

interface ClientLogPayload {
  level: 'error';
  message: string;
  stack?: string;
  details?: unknown;
  context?: Record<string, unknown>;
  occurredAt: string;
  pageUrl: string;
  userAgent: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientLoggerService {
  private readonly rawHttp = new HttpClient(inject(HttpBackend));
  private readonly logEndpoint = `${environment.apiBaseUrl}/client-logs`;

  logError(error: unknown, context: Record<string, unknown> = {}): void {
    const payload = this.createPayload(error, context);

    console.error('[PGH Pizza]', payload.message, {
      error,
      context
    });

    this.rawHttp.post<void>(this.logEndpoint, payload).subscribe({
      error: () => {
        // The client logger must never create a second visible error if the API is unavailable.
      }
    });
  }

  private createPayload(error: unknown, context: Record<string, unknown>): ClientLogPayload {
    const normalized = this.normalizeError(error);

    return {
      level: 'error',
      message: normalized.message,
      stack: normalized.stack,
      details: normalized.details,
      context,
      occurredAt: new Date().toISOString(),
      pageUrl: location.href,
      userAgent: navigator.userAgent
    };
  }

  private normalizeError(error: unknown): { message: string; stack?: string; details?: unknown } {
    if (error instanceof HttpErrorResponse) {
      return {
        message: `HTTP ${error.status || 'network'} error for ${error.url ?? 'unknown URL'}`,
        details: {
          status: error.status,
          statusText: error.statusText,
          url: error.url,
          response: this.toSerializableValue(error.error)
        }
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack
      };
    }

    if (typeof error === 'string') {
      return {
        message: error
      };
    }

    return {
      message: 'Unknown client error',
      details: this.toSerializableValue(error)
    };
  }

  private toSerializableValue(value: unknown): unknown {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }
}

import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return 'PGH Pizza could not be reached. Check your connection and try again.';
  }

  if (error.status === 401) {
    return 'Your session expired. Log in again, then retry. Copy any unsaved text first.';
  }

  if (error.status === 403) {
    return 'Your account does not have permission to do that.';
  }

  const message = backendMessage(error.error);
  if (!message) {
    return fallback;
  }

  if (error.status === 400) {
    const field = message.split(' ')[0];
    return /^[A-Za-z]+$/.test(field) ? `Check the ${fieldLabel(field)} and try again.` : fallback;
  }

  if (error.status === 404 || error.status === 409) {
    return message.endsWith('.') ? message : `${message}.`;
  }

  return fallback;
}

const fieldLabels: Record<string, string> = {
  overallRating: 'Overall score',
  affordabilityRating: 'Value score',
  sauce: 'Sauce score',
  crust: 'Crust score',
  toppings: 'Toppings score',
  applicationReason: 'reason field',
  youtubeUrl: 'YouTube URL field',
  youtubeVideoId: 'YouTube URL field',
  profilePictureUrl: 'profile picture'
};

function fieldLabel(field: string): string {
  return fieldLabels[field] ?? `${field.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()} field`;
}

function backendMessage(body: unknown): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    return typeof message === 'string' ? message.trim() : '';
  }

  return '';
}

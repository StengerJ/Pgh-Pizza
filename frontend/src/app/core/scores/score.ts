import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const SCORE_MIN = 1;
export const SCORE_MAX = 10;
export const SCORE_STEP = 0.1;

const scoreFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

export function toScore(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatScore(value: unknown): string {
  const score = toScore(value);
  return score === null ? '–' : scoreFormat.format(score);
}

export const scoreValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const score = toScore(control.value);

  if (score === null) {
    return { scoreRequired: true };
  }

  if (score < SCORE_MIN || score > SCORE_MAX) {
    return { scoreRange: true };
  }

  if (Math.abs(score * 10 - Math.round(score * 10)) > 1e-9) {
    return { scoreDecimals: true };
  }

  return null;
};

export function scoreErrorMessage(errors: ValidationErrors | null): string {
  if (errors?.['scoreRequired']) {
    return 'Choose a score from 1 to 10.';
  }

  if (errors?.['scoreRange']) {
    return 'Scores go from 1 to 10.';
  }

  if (errors?.['scoreDecimals']) {
    return 'Use at most one decimal, like 8.5.';
  }

  return '';
}

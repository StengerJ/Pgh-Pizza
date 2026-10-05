import { FormControl } from '@angular/forms';

import { formatScore, roundScore, scoreErrorMessage, scoreValidator, toScore } from './score';

describe('score rules', () => {
  const errorsFor = (value: unknown) => scoreValidator(new FormControl(value));

  it('should parse numbers and numeric strings, rejecting blanks and text', () => {
    expect(toScore(8.5)).toBe(8.5);
    expect(toScore(' 7.2 ')).toBe(7.2);
    expect(toScore('9')).toBe(9);
    expect(toScore('')).toBeNull();
    expect(toScore(null)).toBeNull();
    expect(toScore('Sweet')).toBeNull();
  });

  it('should format every score with exactly one decimal', () => {
    expect(formatScore(9)).toBe('9.0');
    expect(formatScore('5.0')).toBe('5.0');
    expect(formatScore(8.62)).toBe('8.6');
    expect(formatScore(10)).toBe('10.0');
    expect(formatScore(null)).toBe('–');
  });

  it('should round to one decimal', () => {
    expect(roundScore(8.62)).toBe(8.6);
    expect(roundScore(6.85)).toBe(6.9);
  });

  it('should accept 1 to 10 with at most one decimal', () => {
    for (const ok of [1, 10, '10.0', 8.5, '7']) {
      expect(errorsFor(ok)).withContext(String(ok)).toBeNull();
    }
  });

  it('should explain each kind of invalid score', () => {
    expect(scoreErrorMessage(errorsFor(null))).toBe('Choose a score from 1 to 10.');
    expect(scoreErrorMessage(errorsFor(0.9))).toBe('Scores go from 1 to 10.');
    expect(scoreErrorMessage(errorsFor(10.5))).toBe('Scores go from 1 to 10.');
    expect(scoreErrorMessage(errorsFor(8.55))).toBe('Use at most one decimal, like 8.5.');
  });
});

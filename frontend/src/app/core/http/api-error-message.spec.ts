import { HttpErrorResponse } from '@angular/common/http';

import { apiErrorMessage } from './api-error-message';

describe('apiErrorMessage', () => {
  const fallback = 'Something went wrong.';
  const httpError = (status: number, error: unknown) =>
    new HttpErrorResponse({ status, error, url: '/api/x' });

  it('should return the backend message for a 409 conflict', () => {
    expect(apiErrorMessage(httpError(409, { message: 'Blog post slug already exists' }), fallback))
      .toBe('Blog post slug already exists.');
  });

  it('should return the backend message for a 404', () => {
    expect(apiErrorMessage(httpError(404, { message: 'Rating not found' }), fallback))
      .toBe('Rating not found.');
  });

  it('should turn a 400 validation message into a field hint', () => {
    expect(apiErrorMessage(httpError(400, { message: 'slug must match "^[a-z0-9]+$"' }), fallback))
      .toBe('Check the slug field and try again.');
  });

  it('should name camelCase fields in plain words', () => {
    expect(apiErrorMessage(httpError(400, { message: 'applicationReason size must be between 5 and 5000' }), fallback))
      .toBe('Check the reason field and try again.');
    expect(apiErrorMessage(httpError(400, { message: 'affordabilityRating must be less than or equal to 10.0' }), fallback))
      .toBe('Check the Value score and try again.');
    expect(apiErrorMessage(httpError(400, { message: 'restaurantName must not be blank' }), fallback))
      .toBe('Check the restaurant name field and try again.');
  });

  it('should explain network failures', () => {
    expect(apiErrorMessage(httpError(0, null), fallback))
      .toBe('PGH Pizza could not be reached. Check your connection and try again.');
  });

  it('should tell the user to log in again on 401', () => {
    expect(apiErrorMessage(httpError(401, null), fallback))
      .toBe('Your session expired. Log in again, then retry. Copy any unsaved text first.');
  });

  it('should explain forbidden responses', () => {
    expect(apiErrorMessage(httpError(403, { message: 'Forbidden' }), fallback))
      .toBe('Your account does not have permission to do that.');
  });

  it('should fall back when the body is not JSON', () => {
    expect(apiErrorMessage(httpError(409, '<html>bad gateway</html>'), fallback)).toBe(fallback);
    expect(apiErrorMessage(httpError(409, null), fallback)).toBe(fallback);
  });

  it('should fall back for 500 and non-HTTP errors', () => {
    expect(apiErrorMessage(httpError(500, { message: 'Unexpected server error' }), fallback))
      .toBe(fallback);
    expect(apiErrorMessage(new Error('boom'), fallback)).toBe(fallback);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RatingFormPage } from './rating-form-page.component';

describe('RatingFormPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RatingFormPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it('should enforce the backend length limits', () => {
    const { controls } = TestBed.createComponent(RatingFormPage).componentInstance.form;
    controls.restaurantName.setValue('x'.repeat(161));
    controls.sauce.setValue('x'.repeat(121));
    controls.comments.setValue('x'.repeat(5001));

    expect(controls.restaurantName.invalid).toBeTrue();
    expect(controls.sauce.invalid).toBeTrue();
    expect(controls.comments.invalid).toBeTrue();
  });

  it('should describe free-text fields without calling them ratings', () => {
    const fixture = TestBed.createComponent(RatingFormPage);
    fixture.detectChanges();
    fixture.componentInstance.submit();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Describe the sauce (120 characters max).');
    expect(text).not.toContain('Sauce rating is required.');
  });

  it('should move focus to the first invalid field on a rejected submit', async () => {
    const fixture = TestBed.createComponent(RatingFormPage);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);

    fixture.componentInstance.submit();
    fixture.detectChanges();
    await Promise.resolve();

    expect(document.activeElement?.id).toBe('restaurantName');
    fixture.nativeElement.remove();
  });
});

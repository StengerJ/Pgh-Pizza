import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

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

  it('should report unsaved changes only while the form is dirty', () => {
    const page = TestBed.createComponent(RatingFormPage).componentInstance;
    expect(page.hasUnsavedChanges()).toBeFalse();
    page.form.markAsDirty();
    expect(page.hasUnsavedChanges()).toBeTrue();
  });

  it('should enforce the backend length limits', () => {
    const { controls } = TestBed.createComponent(RatingFormPage).componentInstance.form;
    controls.restaurantName.setValue('x'.repeat(161));
    controls.comments.setValue('x'.repeat(5001));

    expect(controls.restaurantName.invalid).toBeTrue();
    expect(controls.comments.invalid).toBeTrue();
  });

  it('should leave every score unset until the contributor chooses one', () => {
    const { controls } = TestBed.createComponent(RatingFormPage).componentInstance.form;
    for (const key of ['overallRating', 'affordabilityRating', 'sauce', 'crust', 'toppings'] as const) {
      expect(controls[key].value).withContext(key).toBeNull();
      expect(controls[key].invalid).withContext(key).toBeTrue();
    }
  });

  it('should send sub-scores as one-decimal strings and main scores as numbers', () => {
    const fixture = TestBed.createComponent(RatingFormPage);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      restaurantName: 'Fiori',
      location: 'Brookline',
      overallRating: 9,
      affordabilityRating: 8.5,
      sauce: 7,
      crust: 9.5,
      toppings: 8,
      comments: 'Classic slice'
    });

    fixture.componentInstance.submit();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/ratings');
    expect(request.request.body).toEqual(
      jasmine.objectContaining({
        overallRating: 9,
        affordabilityRating: 8.5,
        sauce: '7.0',
        crust: '9.5',
        toppings: '8.0'
      })
    );
    request.flush({});
  });

  it('should only point a field at its error message while the error is shown', () => {
    const fixture = TestBed.createComponent(RatingFormPage);
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('#restaurantName')!;
    expect(input.hasAttribute('aria-describedby')).toBeFalse();

    fixture.componentInstance.form.controls.restaurantName.markAsTouched();
    fixture.detectChanges();
    expect(input.getAttribute('aria-describedby')).toBe('restaurantNameError');
  });

  it('should show a specific message for an out-of-range score', () => {
    const fixture = TestBed.createComponent(RatingFormPage);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.sauce.setValue(11);
    fixture.componentInstance.form.controls.sauce.markAsTouched();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Scores go from 1 to 10.');
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

  it('should focus the first invalid score when the text fields are valid', async () => {
    const fixture = TestBed.createComponent(RatingFormPage);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const { controls } = fixture.componentInstance.form;
    controls.restaurantName.setValue('Fiori');
    controls.location.setValue('Brookline');
    fixture.detectChanges();

    fixture.componentInstance.submit();
    fixture.detectChanges();
    await Promise.resolve();

    expect(document.activeElement?.id).toBe('overallRating');
    fixture.nativeElement.remove();
  });
});

describe('RatingFormPage editing', () => {
  beforeEach(async () => {
    localStorage.setItem(
      'pghPizzaSession',
      JSON.stringify({
        token: 'h.e30.s',
        user: { id: 'admin', email: 'a@b.co', displayName: 'Admin', role: 'ADMIN', status: 'ACTIVE' }
      })
    );
    await TestBed.configureTestingModule({
      imports: [RatingFormPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'r1' }) } }
        }
      ]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('should round a stored two-decimal score to one decimal when editing', () => {
    const fixture = TestBed.createComponent(RatingFormPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/ratings/r1').flush({
      id: 'r1',
      creatorId: 'someone',
      restaurantName: 'Fiori',
      location: 'Brookline',
      sauce: '7',
      crust: '9.1',
      toppings: '5.0',
      overallRating: 8.62,
      affordabilityRating: 6.82,
      comments: 'Classic slice'
    });

    const { controls } = fixture.componentInstance.form;
    expect(controls.overallRating.value).toBe(8.6);
    expect(controls.affordabilityRating.value).toBe(6.8);
    expect(controls.sauce.value).toBe(7);
    expect(controls.overallRating.valid).toBeTrue();
  });
});

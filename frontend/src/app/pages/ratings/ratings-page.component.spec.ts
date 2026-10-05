import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { RatingsPage } from './ratings-page.component';

describe('RatingsPage', () => {
  let fixture: ComponentFixture<RatingsPage>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [RatingsPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RatingsPage);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should request ratings from the planned Spring Boot API', () => {
    fixture.detectChanges();

    const request = httpTesting.expectOne('/api/ratings');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('should render each rating as a card with its key details', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/ratings').flush([
      {
        id: '1',
        creatorId: 'user-1',
        creator: 'Joshua Stenger',
        restaurantName: 'Fiori Pizza',
        location: 'Brookline',
        sauce: '7',
        toppings: '8.2',
        crust: '9.1',
        overallRating: 9.1,
        affordabilityRating: 8.5,
        comments: 'Classic Pittsburgh slice'
      }
    ]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const cards = nativeElement.querySelectorAll('app-rating-card');

    expect(cards.length).toBe(1);
    expect(nativeElement.textContent).toContain('Fiori Pizza');
    expect(nativeElement.textContent).toContain('Brookline');
    expect(nativeElement.textContent).toContain('Sauce 7.0');
    expect(nativeElement.textContent).toContain('Toppings 8.2');
    expect(nativeElement.textContent).toContain('Crust 9.1');
    expect(nativeElement.textContent).toContain('9.1');
    expect(nativeElement.textContent).toContain('Classic Pittsburgh slice');
  });

  it('should filter ratings and provide autofill options for key columns', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/ratings').flush([
      {
        id: '1',
        creatorId: 'user-1',
        creator: 'Joshua Stenger',
        restaurantName: 'Fiori Pizza',
        location: 'Brookline',
        sauce: '7',
        toppings: '8.2',
        crust: '9.1',
        overallRating: 9.1,
        affordabilityRating: 8.5,
        comments: 'Classic Pittsburgh slice'
      },
      {
        id: '2',
        creatorId: 'user-2',
        creator: 'Tema',
        restaurantName: 'Mineo Pizza',
        location: 'Squirrel Hill',
        sauce: '6.5',
        toppings: '5',
        crust: '7.4',
        overallRating: 8.2,
        affordabilityRating: 7,
        comments: 'Great stop'
      }
    ]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const restaurantInput = nativeElement.querySelector<HTMLInputElement>('#ratingFilterRestaurant');
    expect(restaurantInput).not.toBeNull();

    restaurantInput!.value = 'fiori';
    restaurantInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain('Fiori Pizza');
    expect(nativeElement.textContent).not.toContain('Mineo Pizza');

    const restaurantOptions = Array.from(
      nativeElement.querySelectorAll<HTMLOptionElement>('#ratingRestaurantOptions option')
    ).map((option) => option.value);
    const locationOptions = Array.from(
      nativeElement.querySelectorAll<HTMLOptionElement>('#ratingLocationOptions option')
    ).map((option) => option.value);
    const contributorOptions = Array.from(
      nativeElement.querySelectorAll<HTMLOptionElement>('#ratingContributorOptions option')
    ).map((option) => option.value);

    expect(restaurantOptions).toContain('Fiori Pizza');
    expect(locationOptions).toContain('Brookline');
    expect(contributorOptions).toContain('Joshua Stenger');
  });

  it('should show a loading message until ratings arrive', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading ratings…');
    httpTesting.expectOne('/api/ratings').flush([]);
  });

  it('should show an error instead of the empty state when loading fails', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/ratings').flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ratings could not be loaded. Refresh the page to try again.');
    expect(text).not.toContain('No ratings are available yet.');
    expect((fixture.nativeElement as HTMLElement).querySelector('.status.error[role="alert"]'))
      .not.toBeNull();
  });

  it('should write active filters to the URL query string', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture.detectChanges();
    httpTesting.expectOne('/api/ratings').flush([
      { id: '1', restaurantName: 'Fiori', location: 'Brookline', sauce: '5', toppings: '5', crust: '5', overallRating: 9, affordabilityRating: 8, comments: 'good' }
    ]);
    fixture.detectChanges();

    const input = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLInputElement>('#ratingFilterLocation')!;
    input.value = 'Brook';
    input.dispatchEvent(new Event('input'));

    const [, extras] = navigate.calls.mostRecent().args;
    expect(extras?.queryParams?.['location']).toBe('Brook');
    expect(extras?.queryParams?.['sauce']).toBeNull();
    expect(extras?.replaceUrl).toBeTrue();
  });
});

describe('RatingsPage URL filters', () => {
  it('should apply filters from the query string on first render', async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [RatingsPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ location: 'Brookline' }) } }
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(RatingsPage);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/ratings').flush([
      { id: '1', restaurantName: 'Fiori', location: 'Brookline', sauce: '5', toppings: '5', crust: '5', overallRating: 9, affordabilityRating: 8, comments: 'good' },
      { id: '2', restaurantName: 'Mineo', location: 'Squirrel Hill', sauce: '5', toppings: '5', crust: '5', overallRating: 9, affordabilityRating: 8, comments: 'good' }
    ]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(fixture.componentInstance.filters().location).toBe('Brookline');
    expect(text).toContain('Fiori');
    expect(text).not.toContain('Mineo');
  });
});

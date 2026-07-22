import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

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
        sauce: 'Sweet',
        toppings: 'Pepperoni',
        crust: 'Crisp',
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
    expect(nativeElement.textContent).toContain('Sweet');
    expect(nativeElement.textContent).toContain('Pepperoni');
    expect(nativeElement.textContent).toContain('Crisp');
    expect(nativeElement.textContent).toContain('9.1');
    expect(nativeElement.textContent).toContain('Classic Pittsburgh slice');
  });

  it('should show the empty state instead of an error box when ratings fail to load', () => {
    fixture.detectChanges();
    httpTesting.expectOne('/api/ratings').flush(null, {
      status: 500,
      statusText: 'Server Error'
    });
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.status.error')).toBeNull();
    expect(nativeElement.textContent).toContain('No ratings are available yet.');
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
        sauce: 'Sweet',
        toppings: 'Pepperoni',
        crust: 'Crisp',
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
        sauce: 'Tangy',
        toppings: 'Mushroom',
        crust: 'Chewy',
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
});

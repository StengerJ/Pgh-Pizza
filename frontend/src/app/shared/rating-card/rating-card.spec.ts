import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Rating } from '../../core/models/rating.model';
import { RatingCard } from './rating-card';

describe('RatingCard', () => {
  let fixture: ComponentFixture<RatingCard>;

  const rating: Rating = {
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
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingCard],
      providers: [provideZonelessChangeDetection(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(RatingCard);
    fixture.componentRef.setInput('rating', rating);
    fixture.detectChanges();
  });

  it('should render the rating details', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.textContent).toContain('Fiori Pizza');
    expect(nativeElement.textContent).toContain('Brookline');
    expect(nativeElement.textContent).toContain('Sweet');
    expect(nativeElement.textContent).toContain('Pepperoni');
    expect(nativeElement.textContent).toContain('Crisp');
    expect(nativeElement.textContent).toContain('9.1');
    expect(nativeElement.textContent).toContain('Classic Pittsburgh slice');
  });

  it('should not show owner actions by default', () => {
    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.row-actions')).toBeNull();
  });

  it('should show owner actions and emit remove when canManage is true', () => {
    fixture.componentRef.setInput('canManage', true);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const removeButton = nativeElement.querySelector<HTMLButtonElement>('.button.danger');
    expect(removeButton).not.toBeNull();

    let emitted: Rating | undefined;
    fixture.componentInstance.remove.subscribe((value: Rating) => (emitted = value));
    removeButton!.click();

    expect(emitted).toBe(rating);
  });

  it('should disable the remove button while processing', () => {
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('processing', true);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const removeButton = nativeElement.querySelector<HTMLButtonElement>('.button.danger');
    expect(removeButton!.disabled).toBeTrue();
  });
});

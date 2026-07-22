import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoreBadge } from './score-badge';

describe('ScoreBadge', () => {
  let fixture: ComponentFixture<ScoreBadge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoreBadge],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();

    fixture = TestBed.createComponent(ScoreBadge);
  });

  it('should format the score to one decimal place', () => {
    fixture.componentRef.setInput('score', 9);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('9.0');
  });

  it('should render the label', () => {
    fixture.componentRef.setInput('score', 9);
    fixture.componentRef.setInput('label', 'Overall');
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Overall');
  });

  it('should apply the high tier at 8 and above', () => {
    fixture.componentRef.setInput('score', 8);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tier-high')).not.toBeNull();
  });

  it('should apply the mid tier between 6 and 7.99', () => {
    fixture.componentRef.setInput('score', 7.9);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tier-mid')).not.toBeNull();
  });

  it('should apply the low tier below 6', () => {
    fixture.componentRef.setInput('score', 5.9);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tier-low')).not.toBeNull();
  });
});

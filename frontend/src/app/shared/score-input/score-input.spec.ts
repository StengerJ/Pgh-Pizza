import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { ScoreInput } from './score-input';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, ScoreInput],
  template: `<app-score-input inputId="overall" label="Overall" lowLabel="Skip it"
    highLabel="Best in Pittsburgh" [formControl]="control"></app-score-input>`
})
class Host {
  control = new FormControl<number | null>(null);
}

describe('ScoreInput', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  const slider = () => el.querySelector<HTMLInputElement>('input[type="range"]')!;
  const box = () => el.querySelector<HTMLInputElement>('input[type="number"]')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    el = fixture.nativeElement;
  });

  it('should start unset with visible anchors', () => {
    expect(el.textContent).toContain('Not set');
    expect(el.textContent).toContain('1 = Skip it');
    expect(el.textContent).toContain('10 = Best in Pittsburgh');
    expect(box().value).toBe('');
  });

  it('should update the control and number box when the slider moves', () => {
    slider().value = '7.5';
    slider().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe(7.5);
    expect(box().value).toBe('7.5');
    expect(el.textContent).toContain('7.5');
  });

  it('should update the control and slider when a number is typed, without rewriting the box', () => {
    box().value = '8.5';
    box().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe(8.5);
    expect(slider().value).toBe('8.5');
    expect(box().value).toBe('8.5');
  });

  it('should set null, not 0, when the number box is cleared', () => {
    fixture.componentInstance.control.setValue(6);
    fixture.detectChanges();
    box().value = '';
    box().dispatchEvent(new Event('input'));

    expect(fixture.componentInstance.control.value).toBeNull();
  });

  it('should show whole-number slider positions with one decimal in the number box', () => {
    slider().value = '6';
    slider().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(box().value).toBe('6.0');
  });

  it('should show values written by the form', () => {
    fixture.componentInstance.control.setValue(9.2);
    fixture.detectChanges();

    expect(box().value).toBe('9.2');
    expect(slider().value).toBe('9.2');
  });

  it('should describe the scale to screen readers on both controls', () => {
    const scale = el.querySelector('#overallScale');
    expect(scale?.textContent).toContain('10 = Best in Pittsburgh');
    expect(scale?.getAttribute('aria-hidden')).toBeNull();
    expect(box().getAttribute('aria-describedby')).toContain('overallScale');
    expect(slider().getAttribute('aria-describedby')).toContain('overallScale');
    expect(slider().getAttribute('aria-label')).toBe('Overall');
  });

  it('should not mark the score touched while focus moves between its own controls', () => {
    document.body.appendChild(el);
    slider().focus();
    box().focus();
    expect(fixture.componentInstance.control.touched).toBeFalse();

    box().blur();
    expect(fixture.componentInstance.control.touched).toBeTrue();
    el.remove();
  });

  it('should commit the default position when an unset slider is clicked without moving', () => {
    slider().dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fixture.componentInstance.control.value).toBe(5.5);
    expect(box().value).toBe('5.5');
  });

  it('should drop focus on mouse wheel so scrolling cannot change the score', () => {
    document.body.appendChild(el);
    box().focus();
    box().dispatchEvent(new WheelEvent('wheel', { bubbles: true }));

    expect(document.activeElement).not.toBe(box());
    el.remove();
  });
});

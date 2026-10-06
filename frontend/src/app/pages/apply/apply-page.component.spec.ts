import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApplyPage } from './apply-page.component';

describe('ApplyPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplyPage],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('should enforce the backend length limits', () => {
    const { controls } = TestBed.createComponent(ApplyPage).componentInstance.form;
    controls.displayName.setValue('x'.repeat(121));
    controls.password.setValue('x'.repeat(129));
    controls.applicationReason.setValue('x'.repeat(5001));

    expect(controls.displayName.invalid).toBeTrue();
    expect(controls.password.invalid).toBeTrue();
    expect(controls.applicationReason.invalid).toBeTrue();
  });

  it('should show the backend reason when the email is already registered', () => {
    const fixture = TestBed.createComponent(ApplyPage);
    fixture.detectChanges();
    fixture.componentInstance.form.setValue({
      email: 'a@b.co',
      displayName: 'Applicant',
      password: 'password123',
      confirmPassword: 'password123',
      applicationReason: 'I love pizza'
    });

    fixture.componentInstance.submit();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/applications')
      .flush({ message: 'An account already exists for this email' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('An account already exists for this email.');
  });

  it('should move focus to the first invalid field on a rejected submit', async () => {
    const fixture = TestBed.createComponent(ApplyPage);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);

    fixture.componentInstance.submit();
    fixture.detectChanges();
    await Promise.resolve();

    expect(document.activeElement?.id).toBe('email');
    fixture.nativeElement.remove();
  });
});

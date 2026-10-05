import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BlogFormPage } from './blog-form-page.component';

describe('BlogFormPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [BlogFormPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  it('should not submit when the title cannot produce a slug', () => {
    const fixture = TestBed.createComponent(BlogFormPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.form.setValue({
      title: '!!!!',
      location: 'Brookline',
      slug: '',
      body: 'A body that is long enough to pass.',
      youtubeUrl: ''
    });

    page.submit();
    fixture.detectChanges();

    TestBed.inject(HttpTestingController).expectNone('/api/blog-posts');
    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('Add a slug using lowercase letters, numbers, and hyphens.');
  });

  it('should report unsaved changes only while the form is dirty', () => {
    const page = TestBed.createComponent(BlogFormPage).componentInstance;
    expect(page.hasUnsavedChanges()).toBeFalse();
    page.form.markAsDirty();
    expect(page.hasUnsavedChanges()).toBeTrue();
  });

  it('should reject a slug with uppercase letters', () => {
    const fixture = TestBed.createComponent(BlogFormPage);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.slug.setValue('My-Post');
    expect(fixture.componentInstance.form.controls.slug.invalid).toBeTrue();
  });

  it('should enforce the backend title length limit', () => {
    const fixture = TestBed.createComponent(BlogFormPage);
    fixture.componentInstance.form.controls.title.setValue('x'.repeat(181));
    expect(fixture.componentInstance.form.controls.title.invalid).toBeTrue();
  });

  it('should move focus to the first invalid field on a rejected submit', async () => {
    const fixture = TestBed.createComponent(BlogFormPage);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);

    fixture.componentInstance.submit();
    fixture.detectChanges();
    await Promise.resolve();

    expect(document.activeElement?.id).toBe('title');
    fixture.nativeElement.remove();
  });
});

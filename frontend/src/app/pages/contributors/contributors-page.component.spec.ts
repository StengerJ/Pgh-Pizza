import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ContributorsPage } from './contributors-page.component';

describe('ContributorsPage', () => {
  let fixture: ComponentFixture<ContributorsPage>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContributorsPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContributorsPage);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should render contributor profile counts', () => {
    fixture.detectChanges();

    const request = httpTesting.expectOne('/api/profiles/contributors');
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'contributor-1',
        displayName: 'Directory Contributor',
        profilePictureUrl: 'data:image/png;base64,iVBORw0KGgo=',
        ratingCount: 3,
        blogPostCount: 2
      }
    ]);
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const profileLink = nativeElement.querySelector<HTMLAnchorElement>(
      'a[href="/profiles/contributor-1"]'
    );

    expect(nativeElement.textContent).toContain('Directory Contributor');
    expect(nativeElement.textContent).toContain('3');
    expect(nativeElement.textContent).toContain('2');
    expect(profileLink).not.toBeNull();
    expect(nativeElement.querySelector('.profile-thumb')).not.toBeNull();
  });

  it('should show only the error, not the empty state, when contributors fail to load', () => {
    fixture.detectChanges();
    httpTesting
      .expectOne('/api/profiles/contributors')
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Contributors could not be loaded. Refresh the page to try again.');
    expect(text).not.toContain('No contributors are available yet.');
  });
});

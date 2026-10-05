import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ContributorApplication } from '../../core/models/application.model';
import { AdminApplicationsPage } from './admin-applications-page.component';

describe('AdminApplicationsPage', () => {
  const application: ContributorApplication = {
    id: 'app-1',
    email: 'a@b.co',
    displayName: 'Applicant',
    applicationReason: 'I love pizza',
    status: 'PENDING',
    createdAt: '2026-10-01T00:00:00Z'
  };

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AdminApplicationsPage],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('should not reject an application unless the admin confirms', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    const fixture = TestBed.createComponent(AdminApplicationsPage);
    fixture.componentInstance.reject(application);

    TestBed.inject(HttpTestingController).expectNone('/api/admin/applications/app-1/reject');
    expect(window.confirm).toHaveBeenCalledWith(
      'Reject the application from Applicant? This cannot be undone.'
    );
  });

  it('should reject the application once the admin confirms', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const fixture = TestBed.createComponent(AdminApplicationsPage);
    fixture.componentInstance.reject(application);

    TestBed.inject(HttpTestingController)
      .expectOne('/api/admin/applications/app-1/reject')
      .flush({ ...application, status: 'REJECTED' });
  });
});

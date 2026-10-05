import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the app shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should not show the pending banner to visitors', () => {
    localStorage.clear();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.pending-banner')).toBeNull();
  });
});

describe('App pending contributor', () => {
  beforeEach(async () => {
    localStorage.setItem('pghPizzaSession', JSON.stringify({
      token: 'h.e30.s',
      user: { id: 'u1', email: 'a@b.co', displayName: 'A', role: 'PENDING_CONTRIBUTOR', status: 'PENDING' }
    }));
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideRouter([])]
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('should tell pending contributors their application is under review', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('Your contributor application is waiting for admin review.');
  });
});

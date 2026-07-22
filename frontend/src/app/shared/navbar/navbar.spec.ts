import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Navbar } from './navbar';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render public navigation links', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const linkText = Array.from(compiled.querySelectorAll('a')).map((link) =>
      link.textContent?.trim()
    );

    expect(linkText).toContain('Home');
    expect(linkText).toContain('PGH Pizza');
    expect(linkText).toContain('Ratings');
    expect(linkText).toContain('Blog');
    expect(linkText).toContain('Contributors');
    expect(linkText).toContain('Apply');
    expect(linkText).toContain('About');
    expect(linkText).toContain('Login');
  });

  it('should order primary navigation links by site sections first', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const primaryLinks = Array.from(compiled.querySelectorAll('.navbar-links a')).map((link) =>
      link.textContent?.trim()
    );

    expect(primaryLinks.slice(0, 5)).toEqual(['Home', 'About', 'Contributors', 'Ratings', 'Blog']);
  });

  it('should only show apply to logged out visitors', () => {
    expect(component.canApply()).toBeTrue();
  });
});

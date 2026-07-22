import { Routes } from '@angular/router';
import { Home } from '../home/home.component';
import { AboutMe } from './about-me/about-me.component';
import { adminGuard, contributorGuard } from './core/guards/role.guard';
import { AdminApplicationsPage } from './pages/admin-applications/admin-applications-page.component';
import { ApplyPage } from './pages/apply/apply-page.component';
import { BlogDetailPage } from './pages/blog-detail/blog-detail-page.component';
import { BlogFormPage } from './pages/blog-form/blog-form-page.component';
import { BlogListPage } from './pages/blog-list/blog-list-page.component';
import { ContributorsPage } from './pages/contributors/contributors-page.component';
import { LoginPage } from './pages/login/login-page.component';
import { PasswordResetConfirmPage } from './pages/password-reset-confirm/password-reset-confirm-page.component';
import { PasswordResetRequestPage } from './pages/password-reset-request/password-reset-request-page.component';
import { ProfilePage } from './pages/profile/profile-page.component';
import { RatingFormPage } from './pages/rating-form/rating-form-page.component';
import { RatingsPage } from './pages/ratings/ratings-page.component';

export const PAGE_CACHE_TTL_MS = 15 * 60 * 1000;

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'PGH Pizza',
    data: { cacheTtlMs: PAGE_CACHE_TTL_MS }
  },
  {
    path: 'ratings/new',
    component: RatingFormPage,
    canActivate: [contributorGuard],
    title: 'Add Rating | PGH Pizza'
  },
  {
    path: 'ratings/:id/edit',
    component: RatingFormPage,
    canActivate: [contributorGuard],
    title: 'Edit Rating | PGH Pizza'
  },
  {
    path: 'ratings',
    component: RatingsPage,
    title: 'Pizza Ratings | PGH Pizza'
  },
  {
    path: 'apply',
    component: ApplyPage,
    title: 'Apply | PGH Pizza'
  },
  {
    path: 'about-me',
    component: AboutMe,
    title: 'About Me | PGH Pizza',
    data: { cacheTtlMs: PAGE_CACHE_TTL_MS }
  },
  {
    path: 'blog/new',
    component: BlogFormPage,
    canActivate: [contributorGuard],
    title: 'New Blog Post | PGH Pizza'
  },
  {
    path: 'blog/:slug/edit',
    component: BlogFormPage,
    canActivate: [contributorGuard],
    title: 'Edit Blog Post | PGH Pizza'
  },
  {
    path: 'blog/:slug',
    component: BlogDetailPage,
    title: 'Blog Post | PGH Pizza'
  },
  {
    path: 'blog',
    component: BlogListPage,
    title: 'Blog | PGH Pizza'
  },
  {
    path: 'contributors',
    component: ContributorsPage,
    title: 'Contributors | PGH Pizza',
    data: { cacheTtlMs: PAGE_CACHE_TTL_MS }
  },
  {
    path: 'login',
    component: LoginPage,
    title: 'Login | PGH Pizza'
  },
  {
    path: 'password-reset',
    component: PasswordResetRequestPage,
    title: 'Reset Password | PGH Pizza'
  },
  {
    path: 'password-reset/confirm',
    component: PasswordResetConfirmPage,
    title: 'Choose New Password | PGH Pizza'
  },
  {
    path: 'profiles/:id',
    component: ProfilePage,
    title: 'Reviewer Profile | PGH Pizza'
  },
  {
    path: 'admin/applications',
    component: AdminApplicationsPage,
    canActivate: [adminGuard],
    title: 'Applications | PGH Pizza'
  },
  {
    path: '**',
    redirectTo: ''
  }
];

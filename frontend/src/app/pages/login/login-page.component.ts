import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.css']
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  readonly submitting = signal(false);
  // Reactive so the banner also appears when an expired request redirects here from /login itself.
  readonly sessionExpired = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('reason') === 'expired')),
    { initialValue: this.route.snapshot.queryParamMap.get('reason') === 'expired' }
  );
  readonly errorMessage = signal('');

  submit(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (session) => {
        const fallback = session.user.status === 'PENDING' ? '/' : '/ratings';
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? fallback;
        this.submitting.set(false);
        void this.router.navigateByUrl(returnUrl);
      },
      error: () => {
        this.errorMessage.set('Login failed. Check your email and password, then try again.');
        this.submitting.set(false);
      }
    });
  }
}

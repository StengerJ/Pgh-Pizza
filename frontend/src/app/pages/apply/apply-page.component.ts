import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorMessage } from '../../core/http/api-error-message';
import { ApplicationsService } from '../../core/services/applications.service';

@Component({
  selector: 'app-apply-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './apply-page.component.html',
  styleUrls: ['./apply-page.component.css']
})
export class ApplyPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly applicationsService = inject(ApplicationsService);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    applicationReason: ['', [Validators.required, Validators.minLength(5)]]
  });

  readonly submitted = signal(false);
  readonly submitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  passwordsMatch(): boolean {
    const value = this.form.getRawValue();
    return value.password === value.confirmPassword;
  }

  submit(): void {
    this.submitted.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.form.invalid || !this.passwordsMatch()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.submitting.set(true);
    this.applicationsService
      .submitApplication({
        email: value.email.trim(),
        displayName: value.displayName.trim(),
        password: value.password,
        applicationReason: value.applicationReason.trim()
      })
      .subscribe({
        next: () => {
          this.successMessage.set(
            'Application submitted. Your account will remain pending until an admin approves it.'
          );
          this.form.reset();
          this.submitted.set(false);
          this.submitting.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            apiErrorMessage(error, 'Application could not be submitted. Please try again later.')
          );
          this.submitting.set(false);
        }
      });
  }
}

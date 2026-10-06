import { Component, ElementRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { focusFirstInvalid } from '../../core/forms/focus-first-invalid';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import { apiErrorMessage } from '../../core/http/api-error-message';
import { AuthService } from '../../core/services/auth.service';
import { roundScore, scoreErrorMessage, scoreValidator, toScore } from '../../core/scores/score';
import { RatingsService } from '../../core/services/ratings.service';
import { ScoreInput } from '../../shared/score-input/score-input';

type ScoreKey = 'overallRating' | 'affordabilityRating' | 'sauce' | 'crust' | 'toppings';

function editableScore(value: unknown): number | null {
  const score = toScore(value);
  return score === null ? null : roundScore(score);
}

@Component({
  selector: 'app-rating-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ScoreInput],
  templateUrl: './rating-form-page.component.html',
  styleUrls: ['./rating-form-page.component.css']
})
export class RatingFormPage implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly ratingsService = inject(RatingsService);
  private readonly router = inject(Router);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private editingRatingId: string | null = null;
  private saved = false;

  readonly form = this.fb.group({
    restaurantName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(160)]],
    location: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(180)]],
    overallRating: this.fb.control<number | null>(null, scoreValidator),
    affordabilityRating: this.fb.control<number | null>(null, scoreValidator),
    sauce: this.fb.control<number | null>(null, scoreValidator),
    crust: this.fb.control<number | null>(null, scoreValidator),
    toppings: this.fb.control<number | null>(null, scoreValidator),
    comments: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(5000)]]
  });

  readonly submitting = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly editing = signal(false);

  readonly mainScores: { key: ScoreKey; label: string; low: string; high: string }[] = [
    { key: 'overallRating', label: 'Overall', low: 'Skip it', high: 'Best in Pittsburgh' },
    { key: 'affordabilityRating', label: 'Value', low: 'Poor value', high: 'Great value' }
  ];

  readonly subScores: { key: ScoreKey; label: string }[] = [
    { key: 'sauce', label: 'Sauce' },
    { key: 'crust', label: 'Crust' },
    { key: 'toppings', label: 'Toppings' }
  ];

  ngOnInit(): void {
    const ratingId = this.route.snapshot.paramMap.get('id');

    if (!ratingId) {
      return;
    }

    this.editingRatingId = ratingId;
    this.editing.set(true);
    this.loading.set(true);

    this.ratingsService.getRating(ratingId).subscribe({
      next: (rating) => {
        if (!this.canModify(rating.creatorId)) {
          this.loading.set(false);
          void this.router.navigateByUrl('/ratings');
          return;
        }

        this.form.patchValue({
          restaurantName: rating.restaurantName,
          location: rating.location,
          overallRating: editableScore(rating.overallRating),
          affordabilityRating: editableScore(rating.affordabilityRating),
          sauce: editableScore(rating.sauce),
          crust: editableScore(rating.crust),
          toppings: editableScore(rating.toppings),
          comments: rating.comments
        });
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Rating could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  showScoreError(key: ScoreKey): boolean {
    const control = this.form.controls[key];
    return control.touched && control.invalid;
  }

  scoreError(key: ScoreKey): string {
    return scoreErrorMessage(this.form.controls[key].errors);
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved;
  }

  @HostListener('window:beforeunload', ['$event'])
  warnOnUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  submit(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.host);
      return;
    }

    const value = this.form.getRawValue();

    this.submitting.set(true);
    const request = {
      restaurantName: value.restaurantName.trim(),
      location: value.location.trim(),
      overallRating: value.overallRating!,
      affordabilityRating: value.affordabilityRating!,
      sauce: value.sauce!.toFixed(1),
      crust: value.crust!.toFixed(1),
      toppings: value.toppings!.toFixed(1),
      comments: value.comments.trim()
    };

    const saveRequest = this.editingRatingId
      ? this.ratingsService.updateRating(this.editingRatingId, request)
      : this.ratingsService.createRating(request);

    saveRequest.subscribe({
      next: () => {
        this.saved = true;
        this.submitting.set(false);
        void this.router.navigateByUrl('/ratings');
      },
      error: (error: unknown) => {
        this.errorMessage.set(
          apiErrorMessage(error, 'Rating could not be saved. Please try again later.')
        );
        this.submitting.set(false);
      }
    });
  }

  private canModify(creatorId: string | undefined): boolean {
    return this.auth.hasAnyRole(['ADMIN']) || this.auth.currentUser()?.id === creatorId;
  }
}

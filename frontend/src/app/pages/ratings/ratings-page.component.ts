import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Rating } from '../../core/models/rating.model';
import { AuthService } from '../../core/services/auth.service';
import { RatingsService } from '../../core/services/ratings.service';
import { RatingCard } from '../../shared/rating-card/rating-card';

type RatingFilterKey =
  | 'restaurantName'
  | 'location'
  | 'sauce'
  | 'toppings'
  | 'crust'
  | 'overallRating'
  | 'affordabilityRating'
  | 'creator'
  | 'comments';

type RatingFilters = Record<RatingFilterKey, string>;

const emptyFilters: RatingFilters = {
  restaurantName: '',
  location: '',
  sauce: '',
  toppings: '',
  crust: '',
  overallRating: '',
  affordabilityRating: '',
  creator: '',
  comments: ''
};

@Component({
  selector: 'app-ratings-page',
  standalone: true,
  imports: [RouterLink, RatingCard],
  templateUrl: './ratings-page.component.html',
  styleUrls: ['./ratings-page.component.css']
})
export class RatingsPage implements OnInit {
  private readonly ratingsService = inject(RatingsService);
  private readonly auth = inject(AuthService);

  readonly ratings = signal<Rating[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly processingIds = signal<Set<string>>(new Set());
  readonly filters = signal<RatingFilters>({ ...emptyFilters });

  readonly hasActiveFilters = computed(() =>
    Object.values(this.filters()).some((value) => value.trim().length > 0)
  );

  readonly restaurantFilterOptions = computed(() => this.uniqueFilterOptions('restaurantName'));
  readonly locationFilterOptions = computed(() => this.uniqueFilterOptions('location'));
  readonly contributorFilterOptions = computed(() => this.uniqueFilterOptions('creator'));

  readonly filteredRatings = computed(() => {
    const activeFilters = Object.entries(this.filters())
      .map(([key, value]) => [key as RatingFilterKey, value.trim().toLowerCase()] as const)
      .filter(([, value]) => value.length > 0);

    if (activeFilters.length === 0) {
      return this.ratings();
    }

    return this.ratings().filter((rating) =>
      activeFilters.every(([key, value]) => this.filterValue(rating, key).includes(value))
    );
  });

  ngOnInit(): void {
    this.ratingsService
      .listRatings()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (ratings) => this.ratings.set(ratings),
        error: () => this.ratings.set([])
      });
  }

  canCreate(): boolean {
    return this.auth.hasAnyRole(['CONTRIBUTOR', 'ADMIN']);
  }

  canManage(rating: Rating): boolean {
    const user = this.auth.currentUser();
    return Boolean(user && (user.role === 'ADMIN' || user.id === rating.creatorId));
  }

  setFilter(key: RatingFilterKey, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filters.update((filters) => ({ ...filters, [key]: value }));
  }

  clearFilters(): void {
    this.filters.set({ ...emptyFilters });
  }

  isProcessing(id?: string): boolean {
    return id ? this.processingIds().has(id) : false;
  }

  removeRating(rating: Rating): void {
    const ratingId = rating.id;

    if (!ratingId || !confirm(`Remove ${rating.restaurantName}?`)) {
      return;
    }

    this.errorMessage.set('');
    this.setProcessing(ratingId, true);

    this.ratingsService.deleteRating(ratingId).subscribe({
      next: () => {
        this.ratings.update((ratings) =>
          ratings.filter((currentRating) => currentRating.id !== ratingId)
        );
        this.setProcessing(ratingId, false);
      },
      error: () => {
        this.errorMessage.set('Rating could not be removed.');
        this.setProcessing(ratingId, false);
      }
    });
  }

  private setProcessing(id: string, processing: boolean): void {
    const nextIds = new Set(this.processingIds());

    if (processing) {
      nextIds.add(id);
    } else {
      nextIds.delete(id);
    }

    this.processingIds.set(nextIds);
  }

  private filterValue(rating: Rating, key: RatingFilterKey): string {
    const values: Record<RatingFilterKey, string | number | undefined> = {
      restaurantName: rating.restaurantName,
      location: rating.location,
      sauce: rating.sauce,
      toppings: rating.toppings,
      crust: rating.crust,
      overallRating: rating.overallRating,
      affordabilityRating: rating.affordabilityRating,
      creator: rating.creator,
      comments: rating.comments
    };

    return String(values[key] ?? '').toLowerCase();
  }

  private uniqueFilterOptions(key: 'restaurantName' | 'location' | 'creator'): string[] {
    return Array.from(
      new Set(
        this.ratings()
          .map((rating) => String(rating[key] ?? '').trim())
          .filter(Boolean)
      )
    ).sort((first, second) => first.localeCompare(second));
  }
}

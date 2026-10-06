import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { apiErrorMessage } from '../../core/http/api-error-message';
import { Rating } from '../../core/models/rating.model';
import { toScore } from '../../core/scores/score';
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

type RatingSort = 'newest' | 'overall' | 'value';

const sorts: readonly RatingSort[] = ['newest', 'overall', 'value'];

const scoreFilterKeys: readonly RatingFilterKey[] = [
  'overallRating',
  'affordabilityRating',
  'sauce',
  'crust',
  'toppings'
];

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly ratings = signal<Rating[]>([]);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly errorMessage = signal('');
  readonly processingIds = signal<Set<string>>(new Set());
  readonly filters = signal<RatingFilters>(this.filtersFromUrl());
  readonly sort = signal<RatingSort>(this.sortFromUrl());
  readonly minimumScores = [9, 8, 7, 6, 5];

  readonly scoreFilters: { key: RatingFilterKey; id: string; label: string }[] = [
    { key: 'overallRating', id: 'ratingFilterOverall', label: 'Min Overall' },
    { key: 'affordabilityRating', id: 'ratingFilterAffordability', label: 'Min Value' },
    { key: 'sauce', id: 'ratingFilterSauce', label: 'Min Sauce' },
    { key: 'crust', id: 'ratingFilterCrust', label: 'Min Crust' },
    { key: 'toppings', id: 'ratingFilterToppings', label: 'Min Toppings' }
  ];

  readonly hasActiveFilters = computed(
    () =>
      this.sort() !== 'newest' ||
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
      activeFilters.every(([key, value]) => this.matches(rating, key, value))
    );
  });

  readonly visibleRatings = computed(() => {
    const ratings = [...this.filteredRatings()];
    const sort = this.sort();

    if (sort === 'overall') {
      ratings.sort((a, b) => b.overallRating - a.overallRating);
    } else if (sort === 'value') {
      ratings.sort((a, b) => b.affordabilityRating - a.affordabilityRating);
    }

    return ratings;
  });

  ngOnInit(): void {
    this.ratingsService
      .listRatings()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (ratings) => this.ratings.set(ratings),
        error: (error: unknown) => {
          this.ratings.set([]);
          this.loadFailed.set(true);
          this.errorMessage.set(
            apiErrorMessage(error, 'Ratings could not be loaded. Refresh the page to try again.')
          );
        }
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
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.filters.update((filters) => ({ ...filters, [key]: value }));
    this.syncUrl();
  }

  setSort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as RatingSort;
    this.sort.set(sorts.includes(value) ? value : 'newest');
    this.syncUrl();
  }

  clearFilters(): void {
    this.filters.set({ ...emptyFilters });
    this.sort.set('newest');
    this.syncUrl();
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
      error: (error: unknown) => {
        this.errorMessage.set(
          apiErrorMessage(error, 'Rating could not be removed. Please try again.')
        );
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

  private filtersFromUrl(): RatingFilters {
    const params = this.route.snapshot.queryParamMap;
    const filters = { ...emptyFilters };

    for (const key of Object.keys(emptyFilters) as RatingFilterKey[]) {
      filters[key] = params.get(key) ?? '';
    }

    return filters;
  }

  private syncUrl(): void {
    const queryParams = {
      ...Object.fromEntries(
        Object.entries(this.filters()).map(([key, value]) => [key, value.trim() || null])
      ),
      sort: this.sort() === 'newest' ? null : this.sort()
    };
    void this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true });
  }

  private sortFromUrl(): RatingSort {
    const value = this.route.snapshot.queryParamMap.get('sort') as RatingSort | null;
    return value && sorts.includes(value) ? value : 'newest';
  }

  private matches(rating: Rating, key: RatingFilterKey, value: string): boolean {
    if (scoreFilterKeys.includes(key)) {
      const minimum = toScore(value);
      const score = toScore(rating[key as keyof Rating]);
      return minimum === null || (score !== null && score >= minimum);
    }

    return this.filterValue(rating, key).includes(value);
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

import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { apiErrorMessage } from '../../core/http/api-error-message';
import { ContributorProfileSummary } from '../../core/models/profile.model';
import { ProfileService } from '../../core/services/profile.service';

@Component({
  selector: 'app-contributors-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './contributors-page.component.html',
  styleUrls: ['./contributors-page.component.css']
})
export class ContributorsPage implements OnInit {
  private readonly profileService = inject(ProfileService);

  readonly contributors = signal<ContributorProfileSummary[]>([]);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.profileService
      .listContributors()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (contributors) => this.contributors.set(contributors),
        error: (error: unknown) => {
          this.contributors.set([]);
          this.loadFailed.set(true);
          this.errorMessage.set(
            apiErrorMessage(error, 'Contributors could not be loaded. Refresh the page to try again.')
          );
        }
      });
  }

  profileInitials(displayName: string): string {
    return displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'P';
  }
}

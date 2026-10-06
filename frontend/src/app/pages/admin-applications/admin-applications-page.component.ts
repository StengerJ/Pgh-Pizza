import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import {
  AdminContributor,
  AdminContributorBlogPost,
  AdminContributorRating
} from '../../core/models/admin-contributor.model';
import { apiErrorMessage } from '../../core/http/api-error-message';
import { AdminUser } from '../../core/models/admin-user.model';
import { ApplicationStatus, ContributorApplication } from '../../core/models/application.model';
import { UserRole } from '../../core/models/user.model';
import { ScorePipe } from '../../core/scores/score.pipe';
import { AdminService } from '../../core/services/admin.service';
import { ApplicationsService } from '../../core/services/applications.service';
import { AuthService } from '../../core/services/auth.service';
import { BlogService } from '../../core/services/blog.service';
import { RatingsService } from '../../core/services/ratings.service';

@Component({
  selector: 'app-admin-applications-page',
  standalone: true,
  imports: [DatePipe, ScorePipe],
  templateUrl: './admin-applications-page.component.html',
  styleUrls: ['./admin-applications-page.component.css']
})
export class AdminApplicationsPage implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly applicationsService = inject(ApplicationsService);
  private readonly auth = inject(AuthService);
  private readonly blogService = inject(BlogService);
  private readonly ratingsService = inject(RatingsService);

  readonly applications = signal<ContributorApplication[]>([]);
  readonly contributors = signal<AdminContributor[]>([]);
  readonly users = signal<AdminUser[]>([]);
  readonly processingIds = signal<Set<string>>(new Set());
  readonly loadingApplications = signal(true);
  readonly loadingContributors = signal(true);
  readonly loadingUsers = signal(true);
  readonly applicationsFailed = signal(false);
  readonly contributorsFailed = signal(false);
  readonly usersFailed = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly pendingApplications = computed(() =>
    this.applications().filter((application) => application.status === 'PENDING')
  );

  ngOnInit(): void {
    this.loadApplications();
    this.loadContributors();
    this.loadUsers();
  }

  approve(application: ContributorApplication): void {
    this.updateApplication(application.id, 'APPROVED');
  }

  reject(application: ContributorApplication): void {
    if (!confirm(`Reject the application from ${application.displayName}? This cannot be undone.`)) {
      return;
    }

    this.updateApplication(application.id, 'REJECTED');
  }

  removeRating(contributor: AdminContributor, rating: AdminContributorRating): void {
    if (!confirm(`Remove ${rating.restaurantName} from ${contributor.displayName}?`)) {
      return;
    }

    const key = this.actionKey('rating', rating.id);
    this.startAction(key);

    this.ratingsService.deleteRating(rating.id).subscribe({
      next: () => {
        this.contributors.update((contributors) =>
          contributors.map((currentContributor) =>
            currentContributor.id === contributor.id
              ? {
                  ...currentContributor,
                  ratingCount: Math.max(0, currentContributor.ratingCount - 1),
                  ratings: currentContributor.ratings.filter(
                    (currentRating) => currentRating.id !== rating.id
                  )
                }
              : currentContributor
          )
        );
        this.finishAction(key, 'Rating removed.');
      },
      error: (error: unknown) => this.failAction(key, error, 'Rating could not be removed.')
    });
  }

  removeBlogPost(contributor: AdminContributor, post: AdminContributorBlogPost): void {
    if (!confirm(`Remove ${post.title} from ${contributor.displayName}?`)) {
      return;
    }

    const key = this.actionKey('blog', post.id);
    this.startAction(key);

    this.blogService.deletePost(post.id).subscribe({
      next: () => {
        this.contributors.update((contributors) =>
          contributors.map((currentContributor) =>
            currentContributor.id === contributor.id
              ? {
                  ...currentContributor,
                  blogPostCount: Math.max(0, currentContributor.blogPostCount - 1),
                  blogPosts: currentContributor.blogPosts.filter(
                    (currentPost) => currentPost.id !== post.id
                  )
                }
              : currentContributor
          )
        );
        this.finishAction(key, 'Blog post removed.');
      },
      error: (error: unknown) => this.failAction(key, error, 'Blog post could not be removed.')
    });
  }

  disableContributor(contributor: AdminContributor): void {
    if (!confirm(`Remove contributor access for ${contributor.displayName}?`)) {
      return;
    }

    const key = this.actionKey('contributor', contributor.id);
    this.startAction(key);

    this.adminService.disableContributor(contributor.id).subscribe({
      next: () => {
        this.contributors.update((contributors) =>
          contributors.filter((currentContributor) => currentContributor.id !== contributor.id)
        );
        this.users.update((users) => users.filter((user) => user.id !== contributor.id));
        this.finishAction(key, 'Contributor removed.');
      },
      error: (error: unknown) => this.failAction(key, error, 'Contributor could not be removed.')
    });
  }

  setUserRole(user: AdminUser, role: UserRole): void {
    if (user.role === role || this.isCurrentUser(user) || (user.protectedAdmin && role !== 'ADMIN')) {
      return;
    }

    const label = role === 'ADMIN' ? 'admin' : 'contributor';
    if (!confirm(`Make ${user.displayName} a ${label}?`)) {
      return;
    }

    const key = this.actionKey('user-role', user.id);
    this.startAction(key);

    this.adminService.updateUserRole(user.id, role).subscribe({
      next: (updatedUser) => {
        this.users.update((users) =>
          users.map((currentUser) => (currentUser.id === user.id ? updatedUser : currentUser))
        );
        this.loadContributors();
        this.finishAction(key, 'User permission updated.');
      },
      error: (error: unknown) => this.failAction(key, error, 'User permission could not be updated.')
    });
  }

  isProcessing(id: string): boolean {
    return this.processingIds().has(id);
  }

  isCurrentUser(user: AdminUser): boolean {
    return this.auth.currentUser()?.id === user.id;
  }

  roleLabel(role: UserRole): string {
    if (role === 'ADMIN') {
      return 'Admin';
    }

    if (role === 'CONTRIBUTOR') {
      return 'Contributor';
    }

    return 'Pending contributor';
  }

  actionKey(
    type: 'application' | 'rating' | 'blog' | 'contributor' | 'user-role',
    id: string
  ): string {
    return `${type}:${id}`;
  }

  private loadApplications(): void {
    this.loadingApplications.set(true);
    this.applicationsFailed.set(false);
    this.applicationsService
      .listApplications()
      .pipe(finalize(() => this.loadingApplications.set(false)))
      .subscribe({
        next: (applications) => this.applications.set(applications),
        error: () => {
          this.applications.set([]);
          this.applicationsFailed.set(true);
        }
      });
  }

  private loadContributors(): void {
    this.loadingContributors.set(true);
    this.contributorsFailed.set(false);
    this.adminService
      .listContributors()
      .pipe(finalize(() => this.loadingContributors.set(false)))
      .subscribe({
        next: (contributors) => this.contributors.set(contributors),
        error: () => {
          this.contributors.set([]);
          this.contributorsFailed.set(true);
        }
      });
  }

  private loadUsers(): void {
    this.loadingUsers.set(true);
    this.usersFailed.set(false);
    this.adminService
      .listUsers()
      .pipe(finalize(() => this.loadingUsers.set(false)))
      .subscribe({
        next: (users) => this.users.set(users),
        error: () => {
          this.users.set([]);
          this.usersFailed.set(true);
        }
      });
  }

  private updateApplication(id: string, status: ApplicationStatus): void {
    const key = this.actionKey('application', id);
    this.startAction(key);

    const request =
      status === 'APPROVED'
        ? this.applicationsService.approveApplication(id)
        : this.applicationsService.rejectApplication(id);

    request.subscribe({
      next: (updatedApplication) => {
        this.applications.update((applications) =>
          applications.map((application) =>
            application.id === id ? updatedApplication : application
          )
        );
        if (status === 'APPROVED') {
          this.loadContributors();
          this.loadUsers();
        }
        this.finishAction(key, `Application ${status.toLowerCase()}.`);
      },
      error: (error: unknown) => this.failAction(key, error, 'Application status could not be updated.')
    });
  }

  private startAction(key: string): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.setProcessing(key, true);
  }

  private finishAction(key: string, message: string): void {
    this.successMessage.set(message);
    this.setProcessing(key, false);
  }

  private failAction(key: string, error: unknown, fallback: string): void {
    this.errorMessage.set(apiErrorMessage(error, fallback));
    this.setProcessing(key, false);
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
}

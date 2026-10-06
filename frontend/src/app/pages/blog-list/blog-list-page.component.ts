import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { apiErrorMessage } from '../../core/http/api-error-message';
import { BlogPost } from '../../core/models/blog-post.model';
import { AuthService } from '../../core/services/auth.service';
import { BlogService } from '../../core/services/blog.service';

@Component({
  selector: 'app-blog-list-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './blog-list-page.component.html',
  styleUrls: ['./blog-list-page.component.css']
})
export class BlogListPage implements OnInit {
  private readonly blogService = inject(BlogService);
  private readonly auth = inject(AuthService);

  readonly posts = signal<BlogPost[]>([]);
  readonly loading = signal(true);
  readonly loadFailed = signal(false);
  readonly errorMessage = signal('');
  readonly processingIds = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.blogService
      .listPosts()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (posts) => this.posts.set(posts),
        error: (error: unknown) => {
          this.posts.set([]);
          this.loadFailed.set(true);
          this.errorMessage.set(
            apiErrorMessage(error, 'Blog posts could not be loaded. Refresh the page to try again.')
          );
        }
      });
  }

  canCreate(): boolean {
    return this.auth.hasAnyRole(['CONTRIBUTOR', 'ADMIN']);
  }

  canManage(post: BlogPost): boolean {
    const user = this.auth.currentUser();
    return Boolean(user && (user.role === 'ADMIN' || user.id === post.authorId));
  }

  isProcessing(id?: string): boolean {
    return id ? this.processingIds().has(id) : false;
  }

  removePost(post: BlogPost): void {
    const postId = post.id;

    if (!postId || !confirm(`Remove ${post.title}?`)) {
      return;
    }

    this.errorMessage.set('');
    this.setProcessing(postId, true);

    this.blogService.deletePost(postId).subscribe({
      next: () => {
        this.posts.update((posts) =>
          posts.filter((currentPost) => currentPost.id !== postId)
        );
        this.setProcessing(postId, false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(
          apiErrorMessage(error, 'Blog post could not be removed. Please try again.')
        );
        this.setProcessing(postId, false);
      }
    });
  }

  excerpt(post: BlogPost): string {
    return post.body.length > 180 ? `${post.body.slice(0, 180)}…` : post.body;
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

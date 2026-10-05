import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { apiErrorMessage } from '../../core/http/api-error-message';
import { BlogPost } from '../../core/models/blog-post.model';
import { AuthService } from '../../core/services/auth.service';
import { BlogService } from '../../core/services/blog.service';
import { buildYoutubeEmbedUrl, extractYoutubeVideoId } from '../../core/utils/youtube';

@Component({
  selector: 'app-blog-detail-page',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './blog-detail-page.component.html',
  styleUrls: ['./blog-detail-page.component.css']
})
export class BlogDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly blogService = inject(BlogService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  readonly post = signal<BlogPost | null>(null);
  readonly embedUrl = signal<SafeResourceUrl | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly removing = signal(false);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (!slug) {
      this.errorMessage.set('No blog post is available yet.');
      this.loading.set(false);
      return;
    }

    this.blogService
      .getPostBySlug(slug)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (post) => {
          this.post.set(post);
          this.embedUrl.set(this.createEmbedUrl(post));
        },
        error: () => this.errorMessage.set('No blog post is available yet.')
      });
  }

  private createEmbedUrl(post: BlogPost): SafeResourceUrl | null {
    const videoId = post.youtubeVideoId ?? extractYoutubeVideoId(post.youtubeUrl);

    if (!videoId) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(buildYoutubeEmbedUrl(videoId));
  }

  canManage(post: BlogPost): boolean {
    const user = this.auth.currentUser();
    return Boolean(user && (user.role === 'ADMIN' || user.id === post.authorId));
  }

  removePost(post: BlogPost): void {
    if (!post.id || !confirm(`Remove ${post.title}?`)) {
      return;
    }

    this.errorMessage.set('');
    this.removing.set(true);

    this.blogService.deletePost(post.id).subscribe({
      next: () => void this.router.navigateByUrl('/blog'),
      error: (error: unknown) => {
        this.errorMessage.set(
          apiErrorMessage(error, 'Blog post could not be removed. Please try again.')
        );
        this.removing.set(false);
      }
    });
  }
}

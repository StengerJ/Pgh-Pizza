import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../core/http/api-error-message';
import { AuthService } from '../../core/services/auth.service';
import { BlogService } from '../../core/services/blog.service';
import { extractYoutubeVideoId } from '../../core/utils/youtube';

@Component({
  selector: 'app-blog-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './blog-form-page.component.html',
  styleUrls: ['./blog-form-page.component.css']
})
export class BlogFormPage implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly blogService = inject(BlogService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private editingPostId: string | null = null;

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(4)]],
    location: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(180)]],
    slug: [''],
    body: ['', [Validators.required, Validators.minLength(20)]],
    youtubeUrl: ['']
  });

  readonly submitting = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly editing = signal(false);

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (!slug) {
      return;
    }

    this.editing.set(true);
    this.loading.set(true);

    this.blogService.getPostBySlug(slug).subscribe({
      next: (post) => {
        if (!this.canModify(post.authorId)) {
          this.loading.set(false);
          void this.router.navigate(['/blog', post.slug]);
          return;
        }

        this.editingPostId = post.id ?? null;
        this.form.patchValue({
          title: post.title,
          location: post.location,
          slug: post.slug,
          body: post.body,
          youtubeUrl: post.youtubeUrl ?? post.youtubeVideoId ?? ''
        });
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Blog post could not be loaded.');
        this.loading.set(false);
      }
    });
  }

  submit(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const trimmedYoutubeUrl = value.youtubeUrl.trim();
    const videoId = trimmedYoutubeUrl ? extractYoutubeVideoId(trimmedYoutubeUrl) : null;

    if (trimmedYoutubeUrl && !videoId) {
      this.errorMessage.set('Use a valid YouTube link or video ID.');
      return;
    }

    const slug = value.slug.trim() || this.slugify(value.title);

    this.submitting.set(true);
    const request = {
      title: value.title.trim(),
      slug,
      location: value.location.trim(),
      body: value.body.trim(),
      youtubeUrl: trimmedYoutubeUrl || undefined,
      youtubeVideoId: videoId ?? undefined
    };

    const saveRequest = this.editingPostId
      ? this.blogService.updatePost(this.editingPostId, request)
      : this.blogService.createPost(request);

    saveRequest.subscribe({
      next: (post) => {
        this.submitting.set(false);
        void this.router.navigate(['/blog', post.slug]);
      },
      error: (error: unknown) => {
        this.errorMessage.set(
          apiErrorMessage(error, 'Blog post could not be saved. Please try again later.')
        );
        this.submitting.set(false);
      }
    });
  }

  private slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private canModify(authorId: string | undefined): boolean {
    return this.auth.hasAnyRole(['ADMIN']) || this.auth.currentUser()?.id === authorId;
  }
}

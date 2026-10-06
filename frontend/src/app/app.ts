import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { Navbar } from './shared/navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  private readonly auth = inject(AuthService);
  protected readonly title = signal('PGH Pizza');
  protected readonly pendingReview = computed(() => this.auth.currentUser()?.status === 'PENDING');
}

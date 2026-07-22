import { Component, Input } from '@angular/core';

type ScoreTier = 'high' | 'mid' | 'low';

@Component({
  selector: 'app-score-badge',
  standalone: true,
  templateUrl: './score-badge.html',
  styleUrls: ['./score-badge.css']
})
export class ScoreBadge {
  @Input({ required: true }) score = 0;
  @Input() label = 'Overall';

  get tier(): ScoreTier {
    if (this.score >= 8) {
      return 'high';
    }

    if (this.score >= 6) {
      return 'mid';
    }

    return 'low';
  }

  get display(): string {
    return this.score.toFixed(1);
  }
}

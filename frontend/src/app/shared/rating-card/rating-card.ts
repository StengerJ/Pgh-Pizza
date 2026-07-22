import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Rating } from '../../core/models/rating.model';
import { ScoreBadge } from '../score-badge/score-badge';

@Component({
  selector: 'app-rating-card',
  standalone: true,
  imports: [RouterLink, ScoreBadge],
  templateUrl: './rating-card.html',
  styleUrls: ['./rating-card.css']
})
export class RatingCard {
  @Input({ required: true }) rating!: Rating;
  @Input() canManage = false;
  @Input() processing = false;
  @Output() remove = new EventEmitter<Rating>();

  onRemove(): void {
    this.remove.emit(this.rating);
  }
}

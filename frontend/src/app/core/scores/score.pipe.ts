import { Pipe, PipeTransform } from '@angular/core';

import { formatScore } from './score';

@Pipe({ name: 'score', standalone: true })
export class ScorePipe implements PipeTransform {
  transform(value: unknown): string {
    return formatScore(value);
  }
}

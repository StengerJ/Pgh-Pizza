import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
  computed,
  forwardRef,
  signal
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { SCORE_MAX, SCORE_MIN, SCORE_STEP, toScore } from '../../core/scores/score';
import { ScorePipe } from '../../core/scores/score.pipe';

@Component({
  selector: 'app-score-input',
  standalone: true,
  imports: [ScorePipe],
  templateUrl: './score-input.html',
  styleUrls: ['./score-input.css'],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ScoreInput), multi: true }]
})
export class ScoreInput implements ControlValueAccessor, AfterViewInit {
  @Input({ required: true }) inputId!: string;
  @Input({ required: true }) label!: string;
  @Input() lowLabel = 'Poor';
  @Input() highLabel = 'Excellent';
  @Input() describedBy: string | null = null;
  @Input() invalid = false;

  @ViewChild('numberBox') private numberBox?: ElementRef<HTMLInputElement>;

  readonly min = SCORE_MIN;
  readonly max = SCORE_MAX;
  readonly step = SCORE_STEP;
  readonly value = signal<number | null>(null);
  readonly disabled = signal(false);
  readonly sliderValue = computed(() => this.value() ?? (SCORE_MIN + SCORE_MAX) / 2);

  private onChange: (value: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngAfterViewInit(): void {
    this.writeNumberBox();
  }

  writeValue(value: unknown): void {
    this.value.set(toScore(value));
    this.writeNumberBox();
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  onSlider(event: Event): void {
    this.update(toScore((event.target as HTMLInputElement).value));
    this.writeNumberBox();
  }

  onNumber(event: Event): void {
    // The number box is never re-bound while typing, so partial input like "8." survives.
    this.update(toScore((event.target as HTMLInputElement).value));
  }

  onBlur(): void {
    this.onTouched();
  }

  onWheel(event: WheelEvent): void {
    (event.target as HTMLInputElement).blur();
  }

  private update(value: number | null): void {
    this.value.set(value);
    this.onChange(value);
  }

  private writeNumberBox(): void {
    if (this.numberBox) {
      const value = this.value();
      this.numberBox.nativeElement.value = value === null ? '' : String(value);
    }
  }
}

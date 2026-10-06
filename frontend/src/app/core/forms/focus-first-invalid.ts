const invalidControls = [
  'input.ng-invalid',
  'textarea.ng-invalid',
  'select.ng-invalid',
  'app-score-input.ng-invalid input[type="number"]'
].join(', ');

export function focusFirstInvalid(host: HTMLElement): void {
  queueMicrotask(() => {
    host.querySelector<HTMLElement>(invalidControls)?.focus();
  });
}

export function focusFirstInvalid(host: HTMLElement): void {
  queueMicrotask(() => {
    host.querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid, select.ng-invalid')?.focus();
  });
}

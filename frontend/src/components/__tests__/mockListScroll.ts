import { act, waitFor } from '@testing-library/react';

// jsdom has no layout. Deliver the same intersection a browser reports near the list end.
export function mockListScroll() {
  let notify: (() => void) | undefined;
  const original = window.IntersectionObserver;
  beforeEach(() => {
    window.IntersectionObserver = class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        notify = () =>
          this.callback(
            [{ target, isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver
          );
      }
      disconnect() {
        notify = undefined;
      }
    } as unknown as typeof IntersectionObserver;
  });
  afterEach(() => {
    notify = undefined;
    window.IntersectionObserver = original;
  });
  return async function reachEnd() {
    await waitFor(() => expect(notify).toBeDefined());
    const intersect = notify!;
    act(() => {
      intersect();
      intersect();
    });
  };
}



/**
 * Autohide scroll for MacOS when scroll is visible only for 1 sec
 */
export class AutohideScrollPlugin {
  private autohideScrollTimeout = 0;

  scroll({
    element,
    scrollSize,
    contentSize,
    virtualSize,
  }: {
    element: HTMLElement;
    scrollSize: number;
    contentSize: number;
    virtualSize: number;
  }) {
    const hasScroll = contentSize > virtualSize;
    const isHidden = !scrollSize && hasScroll;
    if (isHidden) {
      element.classList.add('autohide');
      this.autohideScrollTimeout = this.show(
        element,
        this.autohideScrollTimeout,
      );
    }
  }

  show(element?: HTMLElement, timeout?: number): number {
    clearTimeout(timeout);
    return Number(
      setTimeout(() => {
        element?.classList.remove('autohide');
      }, 1000),
    );
  }
  clear() {
    clearTimeout(this.autohideScrollTimeout);
  }
}



/**
 * Autohide overlay scrollbars when scroll is visible only for 1 sec.
 */
export class AutohideScrollPlugin {
  private autohideScrollTimeout = 0;
  constructor(private element: HTMLElement) {
  }

  /**
   * When scroll size updates set it up for autohide
   */
  setScrollSize(s: number, hasScroll: boolean) {
    // Preserve overlay positioning even without overflow so the spacer does
    // not consume layout space. Only an overflowing bar gets a hit area.
    if (!s) {
      this.element.setAttribute('autohide', 'true');
    } else {
      this.element.removeAttribute('autohide');
    }
    if (!s && hasScroll) {
      this.element.setAttribute('scrollable', 'true');
    } else {
      this.element.removeAttribute('scrollable');
      this.element.removeAttribute('visible');
      this.clear();
    }
  }

  /**
   * On each scroll check if it's time to show
   */
  checkScroll({
    scrollSize,
    contentSize,
    virtualSize,
  }: {
    scrollSize: number;
    contentSize: number;
    virtualSize: number;
  }) {
    const hasScroll = contentSize > virtualSize;
    const isHidden = !scrollSize && hasScroll;
    if (isHidden) {
      this.element.setAttribute('visible', 'true');
      this.autohideScrollTimeout = this.show(
        this.element,
        this.autohideScrollTimeout,
      );
    }
  }

  private show(element?: HTMLElement, timeout?: number): number {
    clearTimeout(timeout);
    return Number(
      setTimeout(() => {
        element?.removeAttribute('visible');
      }, 1000),
    );
  }
  clear() {
    clearTimeout(this.autohideScrollTimeout);
  }
}

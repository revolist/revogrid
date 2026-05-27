const FALLBACK_MAX_SCROLL_SIZE = 16_000_000;
const SCROLL_SIZE_GUARD = 1_000_000;

let detectedMaxScrollSize: number | undefined;

export type ScrollDimensionInput = {
  contentSize: number;
  clientSize: number;
  virtualSize?: number;
  maxScrollSize?: number;
};

export type ScrollDimension = {
  /**
   * Real logical grid content size
   * e.g. 1_000_000 rows * 46px = 46_000_000px.
   */
  contentSize: number;
  /**
   * Visible viewport size provided by the browser
   * e.g. 600px height of the scrollable container.
   */
  clientSize: number;
  viewportSize: number;
  /**
   * Fake DOM scrollable size that RevoGrid gives the browser scrollbar.
   * Grid maps between physical scrollbar coordinates and logical grid coordinates so rows still represent the full dataset.
   */
  physicalContentSize: number;
  /**
   * How far the grid should be scrollable logically.
   * contentSize - viewportSize, meaning the largest valid logical scroll coordinate.
   */
  logicalScrollSize: number;
  /**
   * How far the browser scrollbar can actually move.
   */
  physicalScrollSize: number;
  isCompressed: boolean;
  toLogicalCoordinate(coordinate: number): number;
  toPhysicalCoordinate(coordinate: number): number;
  getRenderOffset(coordinate: number): number;
};

export function getMaxScrollSize(doc: Document | undefined = typeof document === 'undefined' ? undefined : document): number {
  if (typeof detectedMaxScrollSize === 'number') {
    return detectedMaxScrollSize;
  }
  const body = doc?.body;
  if (body) {
    const ownerDocument = body.ownerDocument;
    const element = ownerDocument.createElement('div');
    element.style.cssText = [
      'height:1px',
      'left:-10000px',
      'overflow:scroll',
      'position:absolute',
      'top:-10000px',
      'visibility:hidden',
      'width:1px',
    ].join(';');

    const content = ownerDocument.createElement('div');
    content.style.height = `${FALLBACK_MAX_SCROLL_SIZE * 4}px`;
    element.appendChild(content);
    body.appendChild(element);

    detectedMaxScrollSize = Math.max(
      0,
      Math.min(element.scrollHeight, FALLBACK_MAX_SCROLL_SIZE * 4) - SCROLL_SIZE_GUARD,
    );
    element.remove();

    if (detectedMaxScrollSize > SCROLL_SIZE_GUARD) {
      return detectedMaxScrollSize;
    }
    detectedMaxScrollSize = FALLBACK_MAX_SCROLL_SIZE;
    return detectedMaxScrollSize;
  }

  return FALLBACK_MAX_SCROLL_SIZE;
}

export function getScrollDimension({
  contentSize,
  clientSize,
  virtualSize = 0,
  maxScrollSize = getMaxScrollSize(),
}: ScrollDimensionInput): ScrollDimension {
  const safeContentSize = Math.max(0, maxScrollSize - SCROLL_SIZE_GUARD);
  const size = Math.max(0, contentSize);
  const client = Math.max(0, clientSize);
  const viewport = Math.max(0, virtualSize || client);
  const logicalScrollSize = Math.max(0, size - viewport);
  const maxPhysicalScrollSize = Math.max(0, safeContentSize - client);
  const physicalScrollSize = Math.min(logicalScrollSize, maxPhysicalScrollSize);
  const physicalContentSize = client + physicalScrollSize;
  const isCompressed = logicalScrollSize > physicalScrollSize && physicalScrollSize > 0;

  const clampLogical = (coordinate: number) =>
    Math.min(Math.max(0, coordinate || 0), logicalScrollSize);
  const clampPhysical = (coordinate: number) =>
    Math.min(Math.max(0, coordinate || 0), physicalScrollSize);
  const toLogicalCoordinate = (coordinate: number) => {
    if (!logicalScrollSize || !physicalScrollSize) {
      return 0;
    }
    if (!isCompressed) {
      return clampLogical(coordinate);
    }
    return clampLogical((clampPhysical(coordinate) / physicalScrollSize) * logicalScrollSize);
  };
  const toPhysicalCoordinate = (coordinate: number) => {
    if (!logicalScrollSize || !physicalScrollSize) {
      return 0;
    }
    if (!isCompressed) {
      return clampPhysical(coordinate);
    }
    return clampPhysical((clampLogical(coordinate) / logicalScrollSize) * physicalScrollSize);
  };

  return {
    contentSize: size,
    clientSize: client,
    viewportSize: viewport,
    physicalContentSize,
    logicalScrollSize,
    physicalScrollSize,
    isCompressed,
    toLogicalCoordinate,
    toPhysicalCoordinate,
    getRenderOffset(coordinate: number) {
      const logical = clampLogical(coordinate);
      return logical - toPhysicalCoordinate(logical);
    },
  };
}

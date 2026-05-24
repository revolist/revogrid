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
  contentSize: number;
  clientSize: number;
  viewportSize: number;
  physicalContentSize: number;
  logicalScrollSize: number;
  physicalScrollSize: number;
  isCompressed: boolean;
  toLogicalCoordinate(coordinate: number): number;
  toPhysicalCoordinate(coordinate: number): number;
  getRenderOffset(coordinate: number): number;
};

export function getMaxScrollSize(doc: Document | undefined = typeof document !== 'undefined' ? document : undefined): number {
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
  }

  detectedMaxScrollSize = FALLBACK_MAX_SCROLL_SIZE;
  return detectedMaxScrollSize;
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

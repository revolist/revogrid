import { RevogrViewportScroll } from '../src/components/scroll/revogr-viewport-scroll';

describe('viewport resize lifecycle', () => {
  const originalObserver = globalThis.ResizeObserver;
  const observers: { observe: jest.Mock; disconnect: jest.Mock }[] = [];
  const ResizeObserverMock = jest.fn(() => {
    const observer = { observe: jest.fn(), disconnect: jest.fn() };
    observers.push(observer);
    return observer;
  });
  beforeEach(() => {
    observers.length = 0;
    ResizeObserverMock.mockClear();
    globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  });
  afterEach(() => { globalThis.ResizeObserver = originalObserver; });

  it('restarts observation after every reconnect and releases each service', () => {
    const viewport = new RevogrViewportScroll();
    Object.defineProperty(viewport, 'horizontalScroll', { value: document.createElement('div') });
    const ResizeService = ResizeObserverMock;

    viewport.connectedCallback();
    expect(ResizeService).not.toHaveBeenCalled();
    viewport.componentDidLoad();
    expect(ResizeService).toHaveBeenCalledTimes(1);
    viewport.componentDidLoad();
    expect(ResizeService).toHaveBeenCalledTimes(1);

    for (let cycle = 0; cycle < 3; cycle++) {
      const previous = observers[cycle];
      viewport.disconnectedCallback();
      expect(previous.disconnect).toHaveBeenCalledTimes(1);
      viewport.connectedCallback();
      expect(ResizeService).toHaveBeenCalledTimes(cycle + 2);
      expect(observers[cycle + 1].observe).toHaveBeenCalledWith(viewport.horizontalScroll);
    }

    viewport.disconnectedCallback();
    viewport.disconnectedCallback();
    for (const service of observers) {
      expect(service.disconnect).toHaveBeenCalledTimes(1);
    }
  });
});

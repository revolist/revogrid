import GridScrollingService from '../src/components/revoGrid/viewport.scrolling.service';
import type { ViewPortScrollEvent } from '../src/types';

describe('viewport scroll synchronization', () => {
  it('waits for each element before starting the next and publishing the viewport', async () => {
    const event: ViewPortScrollEvent = { dimension: 'rgRow', coordinate: 30 };
    const publish = jest.fn();
    const service = new GridScrollingService(publish);
    let finishFirst!: () => void;
    const first = jest.fn(() => new Promise<void>(resolve => { finishFirst = resolve; }));
    const second = jest.fn(() => Promise.resolve());
    service.registerElements({ rgCol: [{ setScroll: first }, { setScroll: second }] });

    const scrolling = service.proxyScroll(event);
    expect(first).toHaveBeenCalledWith(event);
    expect(second).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    finishFirst();
    await scrolling;
    expect(second).toHaveBeenCalledWith(event);
    expect(publish).toHaveBeenCalledWith(event);
  });

  it('transfers pinned deltas and publishes the last adjusted event', async () => {
    const event: ViewPortScrollEvent = { dimension: 'rgCol', coordinate: 10, delta: 5 };
    const adjusted = { ...event, coordinate: 15 };
    const publish = jest.fn();
    const service = new GridScrollingService(publish);
    const origin = jest.fn(() => Promise.resolve(event));
    const header = jest.fn(() => Promise.resolve(event));
    const change = jest.fn(() => Promise.resolve(adjusted));
    service.registerElements({
      headerRow: [{ changeScroll: header }],
      colPinStart: [{ changeScroll: origin }],
      rgCol: [{ changeScroll: change }],
      colScroll: [{}],
    });

    await service.proxyScroll(event, 'colPinStart');
    expect(header).not.toHaveBeenCalled();
    expect(origin).not.toHaveBeenCalled();
    expect(change).toHaveBeenCalledWith(event);
    expect(publish).toHaveBeenCalledWith(adjusted);

    change.mockClear();
    await service.proxyScroll({ ...event, delta: 0 }, 'colPinStart');
    expect(change).not.toHaveBeenCalled();
  });

  it('keeps independent pinned scrolling in its own dimension', async () => {
    const event: ViewPortScrollEvent = { dimension: 'rgCol', coordinate: 10, delta: 5 };
    const publish = jest.fn();
    const service = new GridScrollingService(publish);
    const change = jest.fn(() => Promise.resolve(event));
    service.registerElements({ rgCol: [{ changeScroll: change }] });

    await service.proxyScroll(event, 'colPinEnd', true);
    expect(change).not.toHaveBeenCalled();
    expect(publish).toHaveBeenCalledWith({ ...event, dimension: 'colPinEnd' });
  });
});

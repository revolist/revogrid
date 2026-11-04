import { AutohideScrollPlugin } from '../src/components/scrollable/autohide-scroll.plugin';

describe('overlay scrollbar visibility', () => {
  let element: HTMLElement;
  let plugin: AutohideScrollPlugin;

  beforeEach(() => {
    jest.useFakeTimers();
    element = document.createElement('div');
    plugin = new AutohideScrollPlugin(element);
  });

  afterEach(() => {
    plugin.clear();
    jest.useRealTimers();
  });

  it('enables overlay hit areas only when there is overflow and no native gutter', () => {
    plugin.setScrollSize(0, true);
    expect(element.hasAttribute('autohide')).toBe(true);
    expect(element.hasAttribute('scrollable')).toBe(true);
    plugin.setScrollSize(0, false);
    expect(element.hasAttribute('autohide')).toBe(true);
    expect(element.hasAttribute('scrollable')).toBe(false);
    plugin.setScrollSize(15, true);
    expect(element.hasAttribute('autohide')).toBe(false);
    expect(element.hasAttribute('scrollable')).toBe(false);
  });

  it('keeps timed visibility until one second after the latest scroll', () => {
    plugin.setScrollSize(0, true);
    const scroll = { scrollSize: 0, contentSize: 1000, virtualSize: 200 };
    plugin.checkScroll(scroll);
    jest.advanceTimersByTime(750);
    plugin.checkScroll(scroll);
    jest.advanceTimersByTime(750);
    expect(element.hasAttribute('visible')).toBe(true);
    jest.advanceTimersByTime(250);
    expect(element.hasAttribute('visible')).toBe(false);
    expect(element.hasAttribute('autohide')).toBe(true);
  });

  it.each([0, 15])(
    'clears transient visibility and its timer when overlay mode ends (gutter %i)',
    size => {
      plugin.setScrollSize(0, true);
      plugin.checkScroll({
        scrollSize: 0,
        contentSize: 1000,
        virtualSize: 200,
      });
      expect(element.hasAttribute('visible')).toBe(true);
      plugin.setScrollSize(size, size > 0);
      expect(element.hasAttribute('visible')).toBe(false);
      expect(element.hasAttribute('autohide')).toBe(size === 0);
      expect(element.hasAttribute('scrollable')).toBe(false);
      expect(jest.getTimerCount()).toBe(0);
    },
  );
});

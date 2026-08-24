import { getRangeFillClipboardData } from '../src/components/overlay/clipboard.utils';
import { OverlaySelection } from '../src/components/overlay/revogr-overlay-selection';

describe('OverlaySelection range rendering', () => {
  it('appends the range VNode without treating it as iterable', () => {
    const selection = new OverlaySelection();
    const activeRange = { x: 0, x1: 1, y: 0, y1: 1 };

    Object.assign(selection, {
      readonly: true,
      useClipboard: false,
      canDrag: false,
      range: false,
      selectionStore: {
        get(key: string) {
          return key === 'range' ? activeRange : null;
        },
      },
    });
    jest.spyOn(selection as any, 'renderRange').mockReturnValue({});

    expect(() => selection.render()).not.toThrow();
  });
});

describe('OverlaySelection clipboard range fill detection', () => {
  function normalize(data: string[][]) {
    return getRangeFillClipboardData(data, { rangeFill: true });
  }

  it('treats trailing row delimiters as a single clipboard cell', () => {
    expect(normalize([['Alpha'], ['']])).toEqual([['Alpha']]);
  });

  it('preserves trailing empty cells as real clipboard data', () => {
    expect(normalize([['Alpha', '']])).toBeNull();
  });

  it('keeps real multi-cell clipboard data out of range fill mode', () => {
    expect(normalize([['Alpha'], ['Beta']])).toBeNull();
    expect(normalize([['Alpha', 'Beta']])).toBeNull();
  });

  it('does not normalize when range fill is disabled', () => {
    expect(getRangeFillClipboardData([['Alpha'], ['']], true)).toBeNull();
  });
});

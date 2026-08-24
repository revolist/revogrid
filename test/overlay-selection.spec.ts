import { getRangeFillClipboardData } from '../src/components/overlay/clipboard.utils';
import { OverlaySelection } from '../src/components/overlay/revogr-overlay-selection';
import { SelectionStoreConnector } from '../src/services/selection.store.connector';

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

describe('SelectionStoreConnector select all', () => {
  it('selects populated partitions and clears empty partition ranges', () => {
    const connector = new SelectionStoreConnector();

    connector.registerColumn(0, 'rgCol');
    connector.registerRow(0, 'rowPinStart');
    connector.registerRow(1, 'rgRow');

    const emptyPinnedStore = connector.register({ x: 0, y: 0 });
    emptyPinnedStore.setLastCell({ x: 3, y: 0 });

    const dataStore = connector.register({ x: 0, y: 1 });
    dataStore.setLastCell({ x: 3, y: 80 });

    connector.selectAll();

    expect(emptyPinnedStore.store.get('range')).toBeNull();
    expect(dataStore.store.get('range')).toEqual({
      x: 0,
      y: 0,
      x1: 2,
      y1: 79,
    });
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

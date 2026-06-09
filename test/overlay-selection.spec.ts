import { getRangeFillClipboardData } from '../src/components/overlay/clipboard.utils';

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

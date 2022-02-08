import { RevoGrid } from '../src/interfaces';
import { getFirstItem, getItems, getLastItem, recombineByOffset } from '../src/store/viewPort/viewport.helpers';
import { generateFakeDataObject } from '../src/utilsExternal/generateFakeDataObject';

type ItemsToUpdate = Pick<RevoGrid.ViewportStateItems, 'items' | 'start' | 'end'>;

describe('revo-grid-viewport', () => {
  const virtualSize: number = 600;
  const originItemSize: number = 30;
  const data = generateFakeDataObject({
    rows: 100,
    cols: 10,
  });
  const realSize = data.length * originItemSize;
  let recombined: ItemsToUpdate;
  let range = { start: 0, end: 0 };
  let items: RevoGrid.VirtualPositionItem[] = getItems({
    start: 0,
    startIndex: 0,
    origSize: originItemSize,
    maxSize: virtualSize,
    maxCount: data.length,
  });
  range.end = items.length - 1;

  it('Items are ready for recombination', () => expect(items).toBeDefined());

  // repeat recombination several time same way as user scroll
  for (let i = 0; i < 120; i++) {
    describe(`Recombination ${i}`, () => {
      recombined = recombineByOffset(i % 5, {
        positiveDirection: i < 100,
        start: range.start,
        end: range.end,
        items,
        originItemSize,
        realSize,
        sizes: {},
      });

      it('Recombination exist', () => {
        expect(recombined.items?.length).toBeGreaterThan(0);
      });

      it('Start should be positive', () => {
        let i: number = 0;
        while (i < recombined.items.length) {
          const item = recombined.items[i % recombined.items.length];
          expect(item.start).toBeGreaterThanOrEqual(0);
          i++;
        }
      });

      it('End should be in range', () => {
        let i: number = 0;
        while (i < recombined.items.length) {
          const item = recombined.items[i % recombined.items.length];
          expect(item.end).toBeLessThanOrEqual(realSize);
          i++;
        }
      });

      it('Indexes should be positive', () => {
        let i: number = 0;
        while (i < recombined.items.length) {
          const item = recombined.items[i % recombined.items.length];
          expect(item.itemIndex).toBeGreaterThanOrEqual(0);
          i++;
        }
      });

      it('First item should not be less than last', () => {
        const first = getFirstItem(recombined);
        const last = getLastItem(recombined);
        expect(last.itemIndex).toBeGreaterThan(first.itemIndex);
      });

      it('Range should be in order: 1, 2, 3...', () => {
        let prev: VirtualPositionItem | null = null;
        let i: number = recombined.start;
        let count = 0;
        while (count < recombined.items.length) {
          const item = recombined.items[i % recombined.items.length];
          if (prev) {
            expect(Math.abs(item.itemIndex - prev.itemIndex)).toEqual(1);
          }
          prev = item;
          count++;
          i++;
        }
      });

      items = recombined.items;
      range.start = recombined.start;
      range.end = recombined.end;
    });
  }
  console.log(recombined);
});

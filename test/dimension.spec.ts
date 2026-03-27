import {
  calculateDimensionData,
  getItemByPosition,
  getItemByIndex,
} from '../src/store/dimension/dimension.helpers';

const ITEM_SIZE = 30;

/** Build a position-lookup dimension from a custom-sizes map. */
function makePosDimension(sizes: Record<number, number>) {
  const { indexes, positionIndexes, positionIndexToItem } = calculateDimensionData(ITEM_SIZE, sizes);
  return { indexes, positionIndexes, positionIndexToItem, originItemSize: ITEM_SIZE };
}

/** Build an index-lookup dimension from a custom-sizes map. */
function makeIdxDimension(sizes: Record<number, number>) {
  const { indexes, indexToItem } = calculateDimensionData(ITEM_SIZE, sizes);
  return { indexes, indexToItem, originItemSize: ITEM_SIZE };
}

// ---------------------------------------------------------------------------
// calculateDimensionData
// ---------------------------------------------------------------------------
describe('calculateDimensionData', () => {
  it('originItemSize=30, sizes={} → all maps empty (no custom sizes)', () => {
    const result = calculateDimensionData(ITEM_SIZE, {});
    expect(result.indexes).toEqual([]);
    expect(result.positionIndexes).toEqual([]);
    expect(result.indexToItem).toEqual({});
    expect(result.positionIndexToItem).toEqual({});
  });

  it('originItemSize=30, sizes={2:60} → item[2]: start=60 (2×30), end=120 (60+60)', () => {
    const result = calculateDimensionData(ITEM_SIZE, { 2: 60 });
    expect(result.indexes).toEqual([2]);
    expect(result.indexToItem[2]).toEqual({ itemIndex: 2, start: 60, end: 120 });
  });

  it('originItemSize=30, sizes={1:50,3:40} → item[1]: start=30,end=80; item[3]: start=110,end=150 (1 gap item × 30 between them)', () => {
    const result = calculateDimensionData(ITEM_SIZE, { 1: 50, 3: 40 });
    expect(result.indexes).toEqual([1, 3]);
    expect(result.indexToItem[1]).toEqual({ itemIndex: 1, start: 30, end: 80 });
    expect(result.indexToItem[3]).toEqual({ itemIndex: 3, start: 110, end: 150 });
  });

  it('sizes={1:50,3:40} and sizes={3:40,1:50} produce identical output (input key order does not matter)', () => {
    expect(calculateDimensionData(ITEM_SIZE, { 1: 50, 3: 40 })).toEqual(
      calculateDimensionData(ITEM_SIZE, { 3: 40, 1: 50 }),
    );
  });
});

// ---------------------------------------------------------------------------
// getItemByPosition
// ---------------------------------------------------------------------------
describe('getItemByPosition', () => {
  const emptyDimension = { indexes: [], positionIndexes: [], positionIndexToItem: {}, originItemSize: ITEM_SIZE };

  it('uniform grid (itemSize=30): pos=0→item0{0,30}, pos=30→item1{30,60}, pos=35→item1{30,60}', () => {
    expect(getItemByPosition(emptyDimension, 0)).toEqual({ itemIndex: 0, start: 0, end: 30 });
    expect(getItemByPosition(emptyDimension, 30)).toEqual({ itemIndex: 1, start: 30, end: 60 });
    expect(getItemByPosition(emptyDimension, 35)).toEqual({ itemIndex: 1, start: 30, end: 60 });
  });

  describe('with sizes={2:60} (item2 spans 60px from position 60 to 120)', () => {
    const dimension = makePosDimension({ 2: 60 });

    it('pos=70 and pos=119 both resolve to item2{start:60,end:120} (inside the custom-sized item)', () => {
      expect(getItemByPosition(dimension, 70)).toEqual({ itemIndex: 2, start: 60, end: 120 });
      expect(getItemByPosition(dimension, 119)).toEqual({ itemIndex: 2, start: 60, end: 120 });
    });

    it('pos=130 → item3{start:120,end:150} (uniform sizing resumes after the custom item ends at 120)', () => {
      expect(getItemByPosition(dimension, 130)).toEqual({ itemIndex: 3, start: 120, end: 150 });
    });
  });
});

// ---------------------------------------------------------------------------
// getItemByIndex
// ---------------------------------------------------------------------------
describe('getItemByIndex', () => {
  const emptyDimension = { indexes: [], indexToItem: {}, originItemSize: ITEM_SIZE };

  it('uniform grid (itemSize=30): index=0→{0,30}, index=5→{150,180} (start=5×30)', () => {
    expect(getItemByIndex(emptyDimension, 0)).toEqual({ itemIndex: 0, start: 0, end: 30 });
    expect(getItemByIndex(emptyDimension, 5)).toEqual({ itemIndex: 5, start: 150, end: 180 });
  });

  it('sizes={2:60}: index=2 → {start:60,end:120} (returns stored custom item directly)', () => {
    expect(getItemByIndex(makeIdxDimension({ 2: 60 }), 2)).toEqual({ itemIndex: 2, start: 60, end: 120 });
  });

  it('sizes={1:50}: index=2 → {start:80,end:110} (item1 ends at 80; item2 immediately follows with default size 30)', () => {
    expect(getItemByIndex(makeIdxDimension({ 1: 50 }), 2)).toEqual({ itemIndex: 2, start: 80, end: 110 });
  });
});

import {
  calculateDimensionData,
  getItemByPosition,
  getItemByIndex,
} from '../src/store/dimension/dimension.helpers';

// ---------------------------------------------------------------------------
// calculateDimensionData
// ---------------------------------------------------------------------------
describe('calculateDimensionData', () => {
  it('originItemSize=30, sizes={} → all maps empty (no custom sizes)', () => {
    const result = calculateDimensionData(30, {});
    expect(result.indexes).toEqual([]);
    expect(result.positionIndexes).toEqual([]);
    expect(result.indexToItem).toEqual({});
    expect(result.positionIndexToItem).toEqual({});
  });

  it('originItemSize=30, sizes={2:60} → item[2]: start=60 (2×30), end=120 (60+60)', () => {
    const result = calculateDimensionData(30, { 2: 60 });
    expect(result.indexes).toEqual([2]);
    expect(result.indexToItem[2]).toEqual({ itemIndex: 2, start: 60, end: 120 });
  });

  it('originItemSize=30, sizes={1:50,3:40} → item[1]: start=30,end=80; item[3]: start=110,end=150 (1 gap item × 30 between them)', () => {
    const result = calculateDimensionData(30, { 1: 50, 3: 40 });
    expect(result.indexes).toEqual([1, 3]);
    expect(result.indexToItem[1]).toEqual({ itemIndex: 1, start: 30, end: 80 });
    expect(result.indexToItem[3]).toEqual({ itemIndex: 3, start: 110, end: 150 });
  });

  it('sizes={1:50,3:40} and sizes={3:40,1:50} produce identical output (input key order does not matter)', () => {
    const ordered = calculateDimensionData(30, { 1: 50, 3: 40 });
    const unordered = calculateDimensionData(30, { 3: 40, 1: 50 });
    expect(ordered).toEqual(unordered);
  });
});

// ---------------------------------------------------------------------------
// getItemByPosition
// ---------------------------------------------------------------------------
describe('getItemByPosition', () => {
  const originItemSize = 30;
  const emptyDimension = { indexes: [], positionIndexes: [], positionIndexToItem: {}, originItemSize };

  it('uniform grid (itemSize=30): pos=0→item0{0,30}, pos=30→item1{30,60}, pos=35→item1{30,60}', () => {
    expect(getItemByPosition(emptyDimension, 0)).toEqual({ itemIndex: 0, start: 0, end: 30 });
    expect(getItemByPosition(emptyDimension, 30)).toEqual({ itemIndex: 1, start: 30, end: 60 });
    expect(getItemByPosition(emptyDimension, 35)).toEqual({ itemIndex: 1, start: 30, end: 60 });
  });

  it('sizes={2:60}: pos=70 and pos=119 both resolve to item2{start:60,end:120} (inside the custom-sized item)', () => {
    const { indexes, positionIndexes, positionIndexToItem } = calculateDimensionData(30, { 2: 60 });
    const dimension = { indexes, positionIndexes, positionIndexToItem, originItemSize };
    expect(getItemByPosition(dimension, 70)).toEqual({ itemIndex: 2, start: 60, end: 120 });
    expect(getItemByPosition(dimension, 119)).toEqual({ itemIndex: 2, start: 60, end: 120 });
  });

  it('sizes={2:60}: pos=130 → item3{start:120,end:150} (uniform sizing resumes after the custom item ends at 120)', () => {
    const { indexes, positionIndexes, positionIndexToItem } = calculateDimensionData(30, { 2: 60 });
    const dimension = { indexes, positionIndexes, positionIndexToItem, originItemSize };
    expect(getItemByPosition(dimension, 130)).toEqual({ itemIndex: 3, start: 120, end: 150 });
  });
});

// ---------------------------------------------------------------------------
// getItemByIndex
// ---------------------------------------------------------------------------
describe('getItemByIndex', () => {
  const originItemSize = 30;
  const emptyDimension = { indexes: [], indexToItem: {}, originItemSize };

  it('uniform grid (itemSize=30): index=0→{0,30}, index=5→{150,180} (start=5×30)', () => {
    expect(getItemByIndex(emptyDimension, 0)).toEqual({ itemIndex: 0, start: 0, end: 30 });
    expect(getItemByIndex(emptyDimension, 5)).toEqual({ itemIndex: 5, start: 150, end: 180 });
  });

  it('sizes={2:60}: index=2 → {start:60,end:120} (returns stored custom item directly)', () => {
    const { indexes, indexToItem } = calculateDimensionData(30, { 2: 60 });
    const dimension = { indexes, indexToItem, originItemSize };
    expect(getItemByIndex(dimension, 2)).toEqual({ itemIndex: 2, start: 60, end: 120 });
  });

  it('sizes={1:50}: index=2 → {start:80,end:110} (item1 ends at 80; item2 immediately follows with default size 30)', () => {
    // item 1: size 50 → start=30, end=80
    // item 2 (default size): start=80+(2-1-1)*30=80, end=110
    const { indexes, indexToItem } = calculateDimensionData(30, { 1: 50 });
    const dimension = { indexes, indexToItem, originItemSize };
    expect(getItemByIndex(dimension, 2)).toEqual({ itemIndex: 2, start: 80, end: 110 });
  });
});

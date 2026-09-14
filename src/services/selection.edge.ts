import type { SelectionStore } from '@store';
import type { Cell, RangeArea } from '@type';

export type SelectionEdge = {
  coordinate: keyof Cell;
  direction: -1 | 1;
};

type PositionedStore = {
  position: Cell;
  store: SelectionStore;
  lastCell: Cell;
  range: RangeArea | null;
};

type AxisBounds = {
  firstPosition: number;
  lastPosition: number;
  firstCoordinate: number;
  lastCoordinate: number;
};

function positionedStores(
  stores: Record<number, Record<number, SelectionStore>>,
): PositionedStore[] {
  const result: PositionedStore[] = [];
  for (const y of Object.keys(stores).map(Number)) {
    for (const x of Object.keys(stores[y]).map(Number)) {
      const store = stores[y][x];
      const lastCell = store.store.get('lastCell');
      if (lastCell) {
        result.push({
          position: { x, y },
          store,
          lastCell,
          range: store.store.get('range'),
        });
      }
    }
  }
  return result;
}

function selectedAxisBounds(
  selected: PositionedStore[],
  coordinate: keyof Cell,
  anchorPosition: Cell,
  focus: Cell,
): AxisBounds {
  const positions = selected.map(entry => entry.position[coordinate]);
  const firstPosition = positions.length
    ? Math.min(...positions)
    : anchorPosition[coordinate];
  const lastPosition = positions.length
    ? Math.max(...positions)
    : anchorPosition[coordinate];
  const rangeStart = coordinate;
  const rangeEnd = coordinate === 'x' ? 'x1' : 'y1';
  const firstCoordinates = selected
    .filter(entry => entry.position[coordinate] === firstPosition)
    .map(entry => entry.range![rangeStart]);
  const lastCoordinates = selected
    .filter(entry => entry.position[coordinate] === lastPosition)
    .map(entry => entry.range![rangeEnd]);

  return {
    firstPosition,
    lastPosition,
    firstCoordinate: firstCoordinates.length
      ? Math.min(...firstCoordinates)
      : focus[coordinate],
    lastCoordinate: lastCoordinates.length
      ? Math.max(...lastCoordinates)
      : focus[coordinate],
  };
}

export function setRangeToEdge(
  stores: Record<number, Record<number, SelectionStore>>,
  anchorPosition: Cell,
  focus: Cell,
  edge: SelectionEdge,
): boolean {
  const positioned = positionedStores(stores);
  const populated = positioned.filter(
    entry => entry.lastCell.x > 0 && entry.lastCell.y > 0,
  );
  const selected = populated.filter(entry => entry.range);
  const x = selectedAxisBounds(selected, 'x', anchorPosition, focus);
  const y = selectedAxisBounds(selected, 'y', anchorPosition, focus);
  const bounds = { x, y };
  const otherCoordinate = edge.coordinate === 'x' ? 'y' : 'x';
  const edgePositions = populated
    .filter(
      entry =>
        entry.position[otherCoordinate] === anchorPosition[otherCoordinate],
    )
    .map(entry => entry.position[edge.coordinate]);
  if (!edgePositions.length) {
    return false;
  }

  const axis = bounds[edge.coordinate];
  if (edge.direction < 0) {
    axis.firstPosition = Math.min(...edgePositions);
    axis.firstCoordinate = 0;
    axis.lastPosition = anchorPosition[edge.coordinate];
    axis.lastCoordinate = focus[edge.coordinate];
  } else {
    axis.firstPosition = anchorPosition[edge.coordinate];
    axis.firstCoordinate = focus[edge.coordinate];
    axis.lastPosition = Math.max(...edgePositions);
    const lastStore = populated.find(
      entry =>
        entry.position[edge.coordinate] === axis.lastPosition &&
        entry.position[otherCoordinate] === anchorPosition[otherCoordinate],
    );
    axis.lastCoordinate = lastStore!.lastCell[edge.coordinate] - 1;
  }

  const ranges = new Map<SelectionStore, RangeArea>();
  for (const entry of positioned) {
    const isPopulated = entry.lastCell.x > 0 && entry.lastCell.y > 0;
    const withinX =
      entry.position.x >= x.firstPosition && entry.position.x <= x.lastPosition;
    const withinY =
      entry.position.y >= y.firstPosition && entry.position.y <= y.lastPosition;
    if (!isPopulated || !withinX || !withinY) {
      continue;
    }
    ranges.set(entry.store, {
      x: entry.position.x === x.firstPosition ? x.firstCoordinate : 0,
      x1:
        entry.position.x === x.lastPosition
          ? x.lastCoordinate
          : entry.lastCell.x - 1,
      y: entry.position.y === y.firstPosition ? y.firstCoordinate : 0,
      y1:
        entry.position.y === y.lastPosition
          ? y.lastCoordinate
          : entry.lastCell.y - 1,
    });
  }
  for (const entry of positioned) {
    if (!ranges.has(entry.store)) {
      entry.store.setRangeArea(null);
    }
  }
  for (const [store, range] of ranges) {
    store.setRangeArea(range);
  }
  return true;
}

import type {
  DimensionRows,
  RangeArea,
  RowDefinition,
  ViewSettingSizeProp,
} from '@type';
import type {
  ResolvedRowResizeConfig,
  RowResizeConfig,
} from './row-resize.types';

export const DEFAULT_MIN_ROW_HEIGHT = 20;

const finiteNumber = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function resolveRowResizeConfig(
  config: RowResizeConfig = {},
): ResolvedRowResizeConfig {
  const minHeight = finiteNumber(config.minHeight)
    ? Math.max(1, Math.round(config.minHeight))
    : DEFAULT_MIN_ROW_HEIGHT;
  const maxHeight = finiteNumber(config.maxHeight)
    ? Math.max(minHeight, Math.round(config.maxHeight))
    : undefined;
  return { minHeight, maxHeight, fullRow: config.fullRow === true };
}

export function clampRowResizeHeight(
  height: number,
  config: ResolvedRowResizeConfig,
): number {
  const rounded = Number.isFinite(height)
    ? Math.round(height)
    : config.minHeight;
  return Math.min(
    Math.max(rounded, config.minHeight),
    config.maxHeight ?? Number.POSITIVE_INFINITY,
  );
}

export function getRowResizeIndexes({
  rowType,
  rowIndex,
  rowCount,
  selectedRange,
  selectedRowType,
}: {
  rowType: DimensionRows;
  rowIndex: number;
  rowCount: number;
  selectedRange?: RangeArea | null;
  selectedRowType?: DimensionRows;
}): number[] {
  if (
    !selectedRange ||
    selectedRowType !== rowType ||
    rowIndex < Math.min(selectedRange.y, selectedRange.y1) ||
    rowIndex > Math.max(selectedRange.y, selectedRange.y1)
  ) {
    return rowIndex >= 0 && rowIndex < rowCount ? [rowIndex] : [];
  }

  const start = Math.max(0, Math.min(selectedRange.y, selectedRange.y1));
  const end = Math.min(
    rowCount - 1,
    Math.max(selectedRange.y, selectedRange.y1),
  );
  return Array.from(
    { length: Math.max(0, end - start + 1) },
    (_, i) => start + i,
  );
}

export function createRowResizePatch(
  indexes: number[],
  size: number,
): ViewSettingSizeProp {
  return indexes.reduce<ViewSettingSizeProp>((patch, index) => {
    patch[index] = size;
    return patch;
  }, {});
}

export function mergeRowResizeDefinitions(
  definitions: readonly RowDefinition[],
  rowType: DimensionRows,
  physicalIndexes: readonly number[],
  size: number,
): RowDefinition[] {
  const targetIndexes = new Set(physicalIndexes);
  const existingIndexes = new Set<number>();
  const merged = definitions.map(definition => {
    if (definition.type !== rowType || !targetIndexes.has(definition.index)) {
      return definition;
    }
    existingIndexes.add(definition.index);
    return { ...definition, size };
  });

  for (const index of targetIndexes) {
    if (!existingIndexes.has(index)) {
      merged.push({ type: rowType, index, size });
    }
  }
  return merged;
}

import type {
  ClipboardConfig,
  ColumnData,
  ColumnFilterConfig,
  RowDefinition,
  RowHeaders,
  ThemeDefinition,
} from '../../src';

export type SampleRow = {
  id: number;
  name: string;
  role: string;
  city: string;
};

export type GridSetupOptions = {
  columns: ColumnData;
  source: Record<string, unknown>[];
  filter?: boolean | ColumnFilterConfig;
  rowHeaders?: boolean | (Partial<RowHeaders> & { __cellTestIds?: boolean });
  pinnedTopSource?: Record<string, unknown>[];
  pinnedBottomSource?: Record<string, unknown>[];
  range?: boolean;
  useClipboard?: boolean | ClipboardConfig;
  resize?: boolean;
  readonly?: boolean;
  canMoveColumns?: boolean;
  grouping?: Record<string, unknown>;
  trimmedRows?: Record<number, boolean>;
  rtl?: boolean;
  theme?: string;
  themeDefinitions?: ThemeDefinition[];
  exporting?: boolean;
  rowSize?: number;
  rowDefinitions?: RowDefinition[];
  colSize?: number;
  width?: number;
  height?: number;
};

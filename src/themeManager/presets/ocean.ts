import { defineTheme } from '../../types/theme';
import {
  createPresetTokens,
  type ButtonTokens,
  type FilterPanelTokens,
  type FoundationTokens,
  type GridStateTokens,
  type SelectionTokens,
  type TypographyTokens,
} from './shared';

const oceanFoundation: FoundationTokens = [
  '#2563eb',
  'rgba(37, 99, 235, 0.88)',
  '#f8fafc',
  '#0f172a',
  '#cbd5e1',
  'rgba(15, 23, 42, 0.16)',
  '#334155',
  '#d8e2ee',
];
const oceanGrid: GridStateTokens = [
  '#eef4fb',
  '#0f172a',
  '#d7e2ee',
  null,
  null,
  '#e5edf5',
  null,
  '#dbeafe',
  '#eff6ff',
  '#e7f0fa',
  '#475569',
  '#f1f5f9',
];
const oceanFilterPanel: FilterPanelTokens = [
  '#ffffff',
  '#dbe4ef',
  'rgba(15, 23, 42, 0.18)',
  '#f1f5f9',
  '#e2e8f0',
  '#cbd5e1',
  '#2563eb',
  '#2563eb',
  '#64748b',
  '#334155',
  '#64748b',
  '0 0 0 3px rgba(37, 99, 235, 0.2)',
  '#64748b',
  '#2563eb',
];
const oceanTypography: TypographyTokens = [
  '13px',
  '44px',
  '12px',
  '650',
  'none',
  'left',
  'left',
  '0 14px',
  '0 14px',
];
const oceanSelection: SelectionTokens = [
  '#2563eb',
  'rgba(37, 99, 235, 0.1)',
  '#2563eb',
  '#ffffff',
  'rgba(37, 99, 235, 0.22)',
  '#f97316',
  '#64748b',
  '#3b82f6',
];
const oceanButtons: ButtonTokens = [
  '#ffffff',
  '#2563eb',
  '#059669',
  '#dc2626',
  '#cbd5e1',
  '#334155',
];

/** Bright blue and slate preset for data-heavy daytime interfaces. */
export const oceanTheme = defineTheme({
  name: 'ocean',
  extends: 'material',
  colorScheme: 'light',
  defaultRowSize: 38,
  tokens: createPresetTokens({
    foundation: oceanFoundation,
    grid: oceanGrid,
    filterPanel: oceanFilterPanel,
    typography: oceanTypography,
    selection: oceanSelection,
    buttons: oceanButtons,
  }),
});

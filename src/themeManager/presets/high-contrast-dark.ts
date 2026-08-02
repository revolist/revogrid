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

const highContrastDarkFoundation: FoundationTokens = [
  '#ffd400',
  'rgba(255, 212, 0, 0.94)',
  '#050505',
  '#ffffff',
  '#d1d5db',
  'rgba(0, 0, 0, 0.8)',
  '#ffffff',
  '#bfc7d5',
];
const highContrastDarkGrid: GridStateTokens = [
  '#171717',
  '#ffffff',
  '#e5e7eb',
  '#005f73',
  '#303030',
  '#737b87',
  '#737b87',
  '#182c3f',
  '#202a33',
  '#222222',
  '#ffffff',
  '#303030',
];
const highContrastDarkFilterPanel: FilterPanelTokens = [
  '#0a0a0a',
  '#ffffff',
  'rgba(0, 0, 0, 0.85)',
  '#171717',
  '#d1d5db',
  '#e5e7eb',
  '#ffd400',
  '#00e5ff',
  '#e5e7eb',
  '#ffffff',
  '#d1d5db',
  '0 0 0 3px #ffd400',
  '#e5e7eb',
  '#ffd400',
];
const highContrastDarkTypography: TypographyTokens = [
  '14px',
  '48px',
  '13px',
  '700',
  'none',
  'left',
  'left',
  '0 14px',
  '0 14px',
];
const highContrastDarkSelection: SelectionTokens = [
  '#00e5ff',
  'rgba(0, 229, 255, 0.2)',
  '#ffd400',
  '#000000',
  'rgba(0, 229, 255, 0.32)',
  '#ffd400',
  '#ff7ad9',
  '#ffd400',
];
const highContrastDarkButtons: ButtonTokens = [
  '#000000',
  '#ffd400',
  '#7cfc00',
  '#ff8080',
  '#ffffff',
  '#ffffff',
];

/** High-contrast dark preset with luminous yellow and cyan interaction states. */
export const highContrastDarkTheme = defineTheme({
  name: 'highContrastDark',
  extends: 'darkMaterial',
  colorScheme: 'dark',
  defaultRowSize: 40,
  tokens: createPresetTokens({
    foundation: highContrastDarkFoundation,
    grid: highContrastDarkGrid,
    filterPanel: highContrastDarkFilterPanel,
    typography: highContrastDarkTypography,
    selection: highContrastDarkSelection,
    buttons: highContrastDarkButtons,
  }),
});

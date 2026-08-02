import { defineTheme } from '../../types/theme';
import { createPresetTokens, type PresetTokenGroups } from './shared';

const highContrastFoundation: PresetTokenGroups['foundation'] = [
  '#003eaa',
  'rgba(0, 62, 170, 0.92)',
  '#ffffff',
  '#000000',
  '#374151',
  'rgba(0, 0, 0, 0.35)',
  '#111827',
  '#374151',
];
const highContrastGrid: PresetTokenGroups['grid'] = [
  '#111827',
  '#ffffff',
  '#ffffff',
  '#003eaa',
  '#1f2937',
  '#6b7280',
  null,
  '#d6e9ff',
  '#e8f2ff',
  '#e5e7eb',
  '#000000',
  '#d1d5db',
];
const highContrastFilterPanel: PresetTokenGroups['filterPanel'] = [
  '#ffffff',
  '#111827',
  'rgba(0, 0, 0, 0.4)',
  '#ffffff',
  '#4b5563',
  '#111827',
  '#003eaa',
  '#003eaa',
  '#374151',
  '#000000',
  '#374151',
  '0 0 0 3px #ffbf00',
  '#111827',
  '#003eaa',
];
const highContrastTypography: PresetTokenGroups['typography'] = [
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
const highContrastSelection: PresetTokenGroups['selection'] = [
  '#003eaa',
  'rgba(0, 95, 204, 0.2)',
  '#003eaa',
  '#ffffff',
  'rgba(0, 95, 204, 0.3)',
  '#a61b1b',
  '#5b21b6',
  '#ffbf00',
];
const highContrastButtons: PresetTokenGroups['buttons'] = [
  '#ffffff',
  '#003eaa',
  '#006b3c',
  '#b91c1c',
  '#111827',
  '#111827',
];

/** High-contrast light preset with dark structure and vivid blue focus states. */
export const highContrastTheme = defineTheme({
  name: 'highContrast',
  extends: 'material',
  colorScheme: 'light',
  defaultRowSize: 40,
  tokens: createPresetTokens({
    foundation: highContrastFoundation,
    grid: highContrastGrid,
    filterPanel: highContrastFilterPanel,
    typography: highContrastTypography,
    selection: highContrastSelection,
    buttons: highContrastButtons,
  }),
});

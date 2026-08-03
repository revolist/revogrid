import { defineTheme } from '../../types/theme';
import { createPresetTokens, type PresetTokenGroups } from './shared';

const midnightFoundation: PresetTokenGroups['foundation'] = [
  '#8b5cf6',
  'rgba(139, 92, 246, 0.9)',
  '#0b1020',
  '#f8fafc',
  '#334155',
  'rgba(0, 0, 0, 0.5)',
  '#dbeafe',
  '#25324d',
];
const midnightGrid: PresetTokenGroups['grid'] = [
  '#121a2f',
  '#e2e8f0',
  '#2a3855',
  null,
  null,
  '#202c46',
  null,
  '#172554',
  '#111c35',
  '#10182b',
  '#94a3b8',
  'rgba(100, 116, 139, 0.12)',
];
const midnightFilterPanel: PresetTokenGroups['filterPanel'] = [
  '#111827',
  '#334155',
  'rgba(0, 0, 0, 0.55)',
  '#1e293b',
  '#334155',
  '#475569',
  '#22d3ee',
  '#22d3ee',
  '#94a3b8',
  '#e2e8f0',
  '#94a3b8',
  '0 0 0 3px rgba(34, 211, 238, 0.2)',
  '#94a3b8',
  '#22d3ee',
];
const midnightTypography: PresetTokenGroups['typography'] = [
  '13px',
  '46px',
  '12px',
  '650',
  'none',
  'left',
  'left',
  '0 14px',
  '0 14px',
];
const midnightSelection: PresetTokenGroups['selection'] = [
  '#22d3ee',
  'rgba(34, 211, 238, 0.12)',
  '#22d3ee',
  '#0b1020',
  'rgba(34, 211, 238, 0.24)',
  '#f472b6',
  '#a78bfa',
  '#22d3ee',
];
const midnightButtons: PresetTokenGroups['buttons'] = [
  '#ffffff',
  '#7c3aed',
  '#059669',
  '#e11d48',
  '#475569',
  '#e2e8f0',
];

/** Deep navy preset with cyan selection and violet action accents. */
export const midnightTheme = defineTheme({
  name: 'midnight',
  extends: 'darkMaterial',
  colorScheme: 'dark',
  defaultRowSize: 40,
  tokens: createPresetTokens({
    foundation: midnightFoundation,
    grid: midnightGrid,
    filterPanel: midnightFilterPanel,
    typography: midnightTypography,
    selection: midnightSelection,
    buttons: midnightButtons,
  }),
});

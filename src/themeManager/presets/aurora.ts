import { defineTheme } from '../../types/theme';
import { createPresetTokens, type PresetTokenGroups } from './shared';

const auroraFoundation: PresetTokenGroups['foundation'] = [
  '#34d399',
  'rgba(52, 211, 153, 0.88)',
  '#071714',
  '#ecfdf5',
  '#285047',
  'rgba(0, 0, 0, 0.5)',
  '#d1fae5',
  '#1c3d36',
];
const auroraGrid: PresetTokenGroups['grid'] = [
  '#0c2420',
  '#ecfdf5',
  '#245047',
  null,
  null,
  '#17352f',
  null,
  '#103d34',
  '#0d2e28',
  '#0a201c',
  '#86cbb8',
  'rgba(110, 231, 183, 0.08)',
];
const auroraFilterPanel: PresetTokenGroups['filterPanel'] = [
  '#0b201c',
  '#285047',
  'rgba(0, 0, 0, 0.52)',
  '#12352e',
  '#23483f',
  '#37695d',
  '#34d399',
  '#2dd4bf',
  '#86cbb8',
  '#d1fae5',
  '#86a89f',
  '0 0 0 3px rgba(52, 211, 153, 0.2)',
  '#86a89f',
  '#5eead4',
];
const auroraTypography: PresetTokenGroups['typography'] = [
  '12px',
  '42px',
  '11px',
  '650',
  'uppercase',
  'left',
  'left',
  '0 12px',
  '0 12px',
];
const auroraSelection: PresetTokenGroups['selection'] = [
  '#34d399',
  'rgba(52, 211, 153, 0.12)',
  '#34d399',
  '#071714',
  'rgba(45, 212, 191, 0.22)',
  '#fbbf24',
  '#5eead4',
  '#2dd4bf',
];
const auroraButtons: PresetTokenGroups['buttons'] = [
  '#052e27',
  '#34d399',
  '#10b981',
  '#fb7185',
  '#37695d',
  '#d1fae5',
];

/** Compact graphite and evergreen preset with luminous emerald states. */
export const auroraTheme = defineTheme({
  name: 'aurora',
  extends: 'darkCompact',
  colorScheme: 'dark',
  defaultRowSize: 34,
  tokens: createPresetTokens({
    foundation: auroraFoundation,
    grid: auroraGrid,
    filterPanel: auroraFilterPanel,
    typography: auroraTypography,
    selection: auroraSelection,
    buttons: auroraButtons,
  }),
});

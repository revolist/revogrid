export { oceanTheme } from './ocean';
export { midnightTheme } from './midnight';
export { auroraTheme } from './aurora';
export { highContrastTheme } from './high-contrast';
export { highContrastDarkTheme } from './high-contrast-dark';

import { oceanTheme } from './ocean';
import { midnightTheme } from './midnight';
import { auroraTheme } from './aurora';
import { highContrastTheme } from './high-contrast';
import { highContrastDarkTheme } from './high-contrast-dark';

/** Accessible light and dark high-contrast choices. */
export const highContrastThemeDefinitions = [
  highContrastTheme,
  highContrastDarkTheme,
];

/** Ready-to-register modern presets. Presets remain opt-in and per grid. */
export const modernThemeDefinitions = [
  oceanTheme,
  midnightTheme,
  auroraTheme,
  ...highContrastThemeDefinitions,
];

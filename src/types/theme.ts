import type { GridPlugin } from '../plugins/base.plugin';

export interface ThemePackage {
  defaultRowSize: number;
}

export type ThemeConfig = {
  rowSize: number;
};

export type BuiltInTheme =
  | 'default'
  | 'material'
  | 'compact'
  | 'darkMaterial'
  | 'darkCompact';

export type ThemeColorScheme = 'light' | 'dark';

/**
 * Public theme tokens and their CSS custom-property counterparts.
 * Keep this map as the single source of truth for typed theme definitions.
 */
export const themeTokenCssVariables = {
  primary: '--revo-grid-primary',
  primaryTransparent: '--revo-grid-primary-transparent',
  background: '--revo-grid-background',
  foreground: '--revo-grid-foreground',
  divider: '--revo-grid-divider',
  shadow: '--revo-grid-shadow',
  text: '--revo-grid-text',
  border: '--revo-grid-border',
  headerBg: '--revo-grid-header-bg',
  headerColor: '--revo-grid-header-color',
  headerBorder: '--revo-grid-header-border',
  headerFocusedBg: '--revo-grid-header-focused-bg',
  headerHoverBg: '--revo-grid-header-hover-bg',
  cellBorder: '--revo-grid-cell-border',
  cellVerticalBorder: '--revo-grid-cell-vertical-border',
  focusedBg: '--revo-grid-focused-bg',
  rowHover: '--revo-grid-row-hover',
  rowHeadersBg: '--revo-grid-row-headers-bg',
  rowHeadersColor: '--revo-grid-row-headers-color',
  cellDisabledBg: '--revo-grid-cell-disabled-bg',
  filterPanelBg: '--revo-grid-filter-panel-bg',
  filterPanelBorder: '--revo-grid-filter-panel-border',
  filterPanelShadow: '--revo-grid-filter-panel-shadow',
  filterPanelInputBg: '--revo-grid-filter-panel-input-bg',
  filterPanelDivider: '--revo-grid-filter-panel-divider',
  filterPanelSelectBorder: '--revo-grid-filter-panel-select-border',
  filterPanelSelectBorderHover: '--revo-grid-filter-panel-select-border-hover',
  filterPanelReorderAccent: '--revo-grid-filter-panel-reorder-accent',
  filterPanelReorderColor: '--revo-grid-filter-panel-reorder-color',
  filterPanelText: '--revo-grid-filter-panel-text',
  filterPanelMutedText: '--revo-grid-filter-panel-muted-text',
  filterPanelFocusRing: '--revo-grid-filter-panel-focus-ring',
  filterPanelIcon: '--revo-grid-filter-panel-icon',
  filterPanelIconActive: '--revo-grid-filter-panel-icon-active',
  filterPanelSelectArrow: '--revo-grid-filter-panel-select-arrow',
  filterPanelSelectArrowDisabled:
    '--revo-grid-filter-panel-select-arrow-disabled',
  fontFamily: '--revo-grid-font-family',
  fontSize: '--revo-grid-font-size',
  headerHeight: '--revo-grid-header-height',
  headerFontSize: '--revo-grid-header-font-size',
  headerFontWeight: '--revo-grid-header-font-weight',
  headerTextTransform: '--revo-grid-header-text-transform',
  headerTextAlign: '--revo-grid-header-text-align',
  cellTextAlign: '--revo-grid-cell-text-align',
  headerPadding: '--revo-grid-header-padding',
  cellPadding: '--revo-grid-cell-padding',
  selectionBorder: '--revo-grid-selection-border',
  selectionBg: '--revo-grid-selection-bg',
  autofillHandleBg: '--revo-grid-autofill-handle-bg',
  autofillHandleBorder: '--revo-grid-autofill-handle-border',
  rangeHandleBg: '--revo-grid-range-handle-bg',
  temporaryRangeBorder: '--revo-grid-temporary-range-border',
  temporarySelectionBorder: '--revo-grid-temporary-selection-border',
  headerResizeHover: '--revo-grid-header-resize-hover',
  buttonText: '--revo-grid-button-text',
  buttonBg: '--revo-grid-button-bg',
  buttonSuccessBg: '--revo-grid-button-success-bg',
  buttonDangerBg: '--revo-grid-button-danger-bg',
  buttonOutlineBorder: '--revo-grid-button-outline-border',
  buttonOutlineText: '--revo-grid-button-outline-text',
} as const;

export type ThemeTokenName = keyof typeof themeTokenCssVariables;

export type ThemeTokens = Partial<Record<ThemeTokenName, string>>;

export interface ThemeDefinition {
  name: string;
  /** Built-in or registered custom theme to inherit from. */
  extends?: string;
  colorScheme?: ThemeColorScheme;
  defaultRowSize?: number;
  tokens?: ThemeTokens;
  /**
   * Plugin constructors active while this theme or a descendant is selected.
   * Assign this JavaScript-only value as a property; it cannot be serialized
   * through an HTML attribute or JSON-only bindings.
   */
  plugins?: GridPlugin[];
}

export interface ResolvedTheme extends ThemePackage {
  name: string;
  colorScheme: ThemeColorScheme;
  tokens: ThemeTokens;
  plugins: readonly GridPlugin[];
  custom: boolean;
}

/** Type-safe identity helper for reusable theme definitions. */
export function defineTheme<T extends ThemeDefinition>(theme: T): T {
  return theme;
}

import type { ThemeTokens } from '../../types/theme';

export const modernSystemFont =
  "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export type FoundationTokens = readonly [
  primary: string,
  primaryTransparent: string,
  background: string,
  foreground: string,
  divider: string,
  shadow: string,
  text: string,
  border: string,
];

export type GridStateTokens = readonly [
  headerBg: string,
  headerColor: string,
  headerBorder: string,
  headerFocusedBg: string | null,
  headerHoverBg: string | null,
  cellBorder: string,
  cellVerticalBorder: string | null,
  focusedBg: string,
  rowHover: string,
  rowHeadersBg: string,
  rowHeadersColor: string,
  cellDisabledBg: string,
];

export type FilterPanelTokens = readonly [
  background: string,
  border: string,
  shadow: string,
  inputBackground: string,
  divider: string,
  selectBorder: string,
  selectBorderHover: string,
  reorderAccent: string,
  reorderColor: string,
  text: string,
  mutedText: string,
  focusRing: string,
  icon: string,
  iconActive: string,
];

export type TypographyTokens = readonly [
  fontSize: string,
  headerHeight: string,
  headerFontSize: string,
  headerFontWeight: string,
  headerTextTransform: string,
  headerTextAlign: string,
  cellTextAlign: string,
  headerPadding: string,
  cellPadding: string,
];

export type SelectionTokens = readonly [
  border: string,
  background: string,
  autofillHandleBackground: string,
  autofillHandleBorder: string,
  rangeHandleBackground: string,
  temporaryRangeBorder: string,
  temporarySelectionBorder: string,
  headerResizeHover: string,
];

export type ButtonTokens = readonly [
  text: string,
  background: string,
  successBackground: string,
  dangerBackground: string,
  outlineBorder: string,
  outlineText: string,
];

export interface PresetTokenGroups {
  foundation: FoundationTokens;
  grid: GridStateTokens;
  filterPanel: FilterPanelTokens;
  typography: TypographyTokens;
  selection: SelectionTokens;
  buttons: ButtonTokens;
}

/** Maps compact, typed preset data to the public semantic theme-token contract. */
export function createPresetTokens({
  foundation,
  grid,
  filterPanel,
  typography,
  selection,
  buttons,
}: PresetTokenGroups): ThemeTokens {
  const [
    primary,
    primaryTransparent,
    background,
    foreground,
    divider,
    shadow,
    text,
    border,
  ] = foundation;
  const [
    headerBg,
    headerColor,
    headerBorder,
    headerFocusedBg,
    headerHoverBg,
    cellBorder,
    cellVerticalBorder,
    focusedBg,
    rowHover,
    rowHeadersBg,
    rowHeadersColor,
    cellDisabledBg,
  ] = grid;
  const [
    filterPanelBg,
    filterPanelBorder,
    filterPanelShadow,
    filterPanelInputBg,
    filterPanelDivider,
    filterPanelSelectBorder,
    filterPanelSelectBorderHover,
    filterPanelReorderAccent,
    filterPanelReorderColor,
    filterPanelText,
    filterPanelMutedText,
    filterPanelFocusRing,
    filterPanelIcon,
    filterPanelIconActive,
  ] = filterPanel;
  const [
    fontSize,
    headerHeight,
    headerFontSize,
    headerFontWeight,
    headerTextTransform,
    headerTextAlign,
    cellTextAlign,
    headerPadding,
    cellPadding,
  ] = typography;
  const [
    selectionBorder,
    selectionBg,
    autofillHandleBg,
    autofillHandleBorder,
    rangeHandleBg,
    temporaryRangeBorder,
    temporarySelectionBorder,
    headerResizeHover,
  ] = selection;
  const [
    buttonText,
    buttonBg,
    buttonSuccessBg,
    buttonDangerBg,
    buttonOutlineBorder,
    buttonOutlineText,
  ] = buttons;

  return {
    primary,
    primaryTransparent,
    background,
    foreground,
    divider,
    shadow,
    text,
    border,
    headerBg,
    headerColor,
    headerBorder,
    ...(headerFocusedBg ? { headerFocusedBg } : {}),
    ...(headerHoverBg ? { headerHoverBg } : {}),
    cellBorder,
    ...(cellVerticalBorder ? { cellVerticalBorder } : {}),
    focusedBg,
    rowHover,
    rowHeadersBg,
    rowHeadersColor,
    cellDisabledBg,
    filterPanelBg,
    filterPanelBorder,
    filterPanelShadow,
    filterPanelInputBg,
    filterPanelDivider,
    filterPanelSelectBorder,
    filterPanelSelectBorderHover,
    filterPanelReorderAccent,
    filterPanelReorderColor,
    filterPanelText,
    filterPanelMutedText,
    filterPanelFocusRing,
    filterPanelIcon,
    filterPanelIconActive,
    fontFamily: modernSystemFont,
    fontSize,
    headerHeight,
    headerFontSize,
    headerFontWeight,
    headerTextTransform,
    headerTextAlign,
    cellTextAlign,
    headerPadding,
    cellPadding,
    selectionBorder,
    selectionBg,
    autofillHandleBg,
    autofillHandleBorder,
    rangeHandleBg,
    temporaryRangeBorder,
    temporarySelectionBorder,
    headerResizeHover,
    buttonText,
    buttonBg,
    buttonSuccessBg,
    buttonDangerBg,
    buttonOutlineBorder,
    buttonOutlineText,
  };
}

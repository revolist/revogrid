export interface ThemePackage {
  defaultRowSize: number;
}

export type ThemeConfig = {
  rowSize: number;
};

export type Theme =
  | 'default'
  | 'material'
  | 'compact'
  | 'darkMaterial'
  | 'darkCompact'
  | string;

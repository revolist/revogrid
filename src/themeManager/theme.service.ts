import { Theme, ThemeConfig, ThemePackage } from '../types/theme';
import ThemeCompact from './theme.compact';
import ThemeDefault from './theme.default';
import ThemeMaterial from './theme.material';

export const DEFAULT_THEME = 'default';
export const allowedThemes: Theme[] = [DEFAULT_THEME, 'material', 'compact', 'darkMaterial', 'darkCompact'];
export default class ThemeService {
  private currentTheme: ThemePackage;
  private customRowSize = 0;

  get theme() {
    return this.currentTheme;
  }

  get rowSize(): number {
    return this.customRowSize || this.currentTheme.defaultRowSize;
  }

  set rowSize(size: number) {
    this.customRowSize = size;
  }

  constructor(cfg: ThemeConfig) {
    this.customRowSize = cfg.rowSize;
    this.register('default');
  }

  register(theme: Theme) {
    const parsedTheme = ThemeService.getTheme(theme);
    switch (parsedTheme) {
      case 'material':
      case 'darkMaterial':
        this.currentTheme = new ThemeMaterial();
        break;
      case 'compact':
      case 'darkCompact':
        this.currentTheme = new ThemeCompact();
        break;
      default:
        this.currentTheme = new ThemeDefault();
        break;
    }
  }

  static getTheme(theme: string): Theme {
    if (allowedThemes.indexOf(theme as Theme) > -1) {
      return theme as Theme;
    }
    return DEFAULT_THEME;
  }
}

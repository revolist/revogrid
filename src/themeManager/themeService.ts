import { ThemeSpace } from "../interfaces";
import ThemeCompact from "./theme.compact";
import ThemeDefault from "./theme.default";
import ThemeMaterial from "./theme.material";

export const DEFAULT_THEME = 'default';
export const allowedThemes: string[] = [DEFAULT_THEME, 'material', 'compact'];
export default class ThemeService {
    private currentTheme: ThemeSpace.ThemePackage;
    private customRowSize: number = 0;

    get theme() {
        return this.currentTheme;
    }

    get rowSize(): number {
        return this.customRowSize || this.currentTheme.defaultRowSize;
    }

    set rowSize(size: number) {
        this.customRowSize = size;
    }

    constructor(cfg: ThemeSpace.ThemeConfig) {
        this.customRowSize = cfg.rowSize;
        this.register('default');
    }

    register(theme: ThemeSpace.Theme) {
        const parsedTheme = ThemeService.getTheme(theme);
        switch(parsedTheme) {
            case 'material':
                this.currentTheme = new ThemeMaterial();
                break;
            case 'compact':
                this.currentTheme = new ThemeCompact();
                break;
            default:
                this.currentTheme = new ThemeDefault();
                break;
        }
        
    }

    static getTheme(theme: string): ThemeSpace.Theme {
        if (allowedThemes.indexOf(theme) > -1) {
            return theme as ThemeSpace.Theme;
        }
        return DEFAULT_THEME;
    }
}

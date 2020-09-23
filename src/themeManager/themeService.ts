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
        switch(theme) {
            case 'default':
                this.currentTheme = new ThemeDefault();
                break;
            case 'material':
                this.currentTheme = new ThemeMaterial();
                break;
            case 'compact':
                this.currentTheme = new ThemeCompact();
                break;
        }
        
    }
}

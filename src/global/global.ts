import { setMode } from '@stencil/core';

const DEFAULT_THEME = 'default';
const allowedThemes: string[] = [DEFAULT_THEME, 'material'];

setMode(elm => {
    let theme: string|undefined = (elm as any).theme || elm.getAttribute('theme');
    if (typeof theme === 'string') {
        theme = theme.trim();
    }
    return  allowedThemes.indexOf(theme) > -1 ? theme : DEFAULT_THEME;
});

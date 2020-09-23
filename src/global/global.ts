import { setMode } from '@stencil/core';
import { allowedThemes, DEFAULT_THEME } from '../themeManager/themeService';


setMode(elm => {
    let theme: string|undefined = (elm as any).theme || elm.getAttribute('theme');
    if (typeof theme === 'string') {
        theme = theme.trim();
    }

    const isAllowed = allowedThemes.indexOf(theme) > -1;
    if (!isAllowed) {
        elm.setAttribute('theme', DEFAULT_THEME);
    }
    return  isAllowed ? theme : DEFAULT_THEME;
});

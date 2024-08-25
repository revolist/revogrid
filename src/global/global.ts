import { setMode } from '@stencil/core';
import { getTheme } from '../themeManager/theme.service';

setMode(elm => {
  let theme = (elm as HTMLRevoGridElement).theme || elm.getAttribute('theme');
  if (typeof theme === 'string') {
    theme = theme.trim();
  }

  const parsedTheme = getTheme(theme);
  if (parsedTheme !== theme) {
    elm.setAttribute('theme', parsedTheme);
  }
  return parsedTheme;
});

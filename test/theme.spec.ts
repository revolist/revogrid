import ThemeService, { getTheme } from '../src/themeManager/theme.service';
import {
  auroraTheme,
  highContrastDarkTheme,
  highContrastTheme,
  highContrastThemeDefinitions,
  midnightTheme,
  modernThemeDefinitions,
  oceanTheme,
} from '../src/themeManager/presets';
import { defineTheme, themeTokenCssVariables } from '../src/types/theme';

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map(value => parseInt(value, 16) / 255)
    .map(value =>
      value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4),
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first: string, second: string): number {
  const values = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('ThemeService', () => {
  it('preserves non-empty custom theme names for CSS-only themes', () => {
    expect(getTheme('brand')).toBe('brand');
  });

  it('normalizes blank names to default and trims valid names', () => {
    expect(getTheme('  ')).toBe('default');
    expect(getTheme('  brand  ')).toBe('brand');
  });

  it.each([
    ['default', 'default', 'light', 27],
    ['material', 'material', 'light', 42],
    ['compact', 'compact', 'light', 32],
    ['darkMaterial', 'material', 'dark', 42],
    ['darkCompact', 'compact', 'dark', 32],
  ] as const)(
    'resolves the %s built-in theme',
    (name, base, colorScheme, rowSize) => {
      const service = new ThemeService({ rowSize: 0 });

      expect(service.register(name)).toMatchObject({
        name,
        base,
        colorScheme,
        defaultRowSize: rowSize,
        custom: false,
      });
      expect(service.rowSize).toBe(rowSize);
    },
  );

  it('resolves custom definitions from the last duplicate', () => {
    const service = new ThemeService({ rowSize: 0 });
    service.setDefinitions([
      defineTheme({
        name: 'brand',
        extends: 'material',
        defaultRowSize: 36,
        tokens: { primary: 'red' },
      }),
      defineTheme({
        name: 'brand',
        extends: 'darkCompact',
        colorScheme: 'light',
        defaultRowSize: 30,
        tokens: { primary: 'blue', headerBg: '#eee' },
      }),
    ]);

    expect(service.register('brand')).toEqual({
      name: 'brand',
      base: 'compact',
      colorScheme: 'light',
      defaultRowSize: 30,
      tokens: { primary: 'blue', headerBg: '#eee' },
      custom: true,
    });
    expect(service.rowSize).toBe(30);
  });

  it('inherits custom definitions recursively and merges child overrides', () => {
    const service = new ThemeService({ rowSize: 0 });
    service.setDefinitions([
      defineTheme({
        name: 'child',
        extends: 'middle',
        colorScheme: 'light',
        defaultRowSize: 39,
        tokens: { headerBg: '#fff' },
      }),
      defineTheme({
        name: 'foundation',
        extends: 'darkCompact',
        defaultRowSize: 35,
        tokens: { primary: 'red', background: '#000' },
      }),
      defineTheme({
        name: 'middle',
        extends: 'foundation',
        tokens: { primary: 'blue', text: '#eee' },
      }),
    ]);

    expect(service.register('child')).toEqual({
      name: 'child',
      base: 'compact',
      colorScheme: 'light',
      defaultRowSize: 39,
      tokens: {
        primary: 'blue',
        background: '#000',
        text: '#eee',
        headerBg: '#fff',
      },
      custom: true,
    });
  });

  it('allows a custom definition to extend a registered curated preset', () => {
    const service = new ThemeService({ rowSize: 0 });
    const brandedOcean = defineTheme({
      name: 'brandedOcean',
      extends: oceanTheme.name,
      tokens: { primary: '#db2777', buttonBg: '#db2777' },
    });
    service.setDefinitions([brandedOcean, oceanTheme]);

    expect(service.register(brandedOcean.name)).toMatchObject({
      base: 'material',
      colorScheme: 'light',
      defaultRowSize: 38,
      tokens: {
        ...oceanTheme.tokens,
        primary: '#db2777',
        buttonBg: '#db2777',
      },
    });
  });

  it('falls cyclic inheritance back to default without inheriting cycle tokens', () => {
    const service = new ThemeService({ rowSize: 0 });
    service.setDefinitions([
      defineTheme({
        name: 'selfReference',
        extends: 'selfReference',
        colorScheme: 'dark',
        defaultRowSize: 29,
        tokens: { primary: 'purple' },
      }),
      defineTheme({
        name: 'cycleA',
        extends: 'cycleB',
        tokens: { primary: 'red' },
      }),
      defineTheme({
        name: 'cycleB',
        extends: 'cycleA',
        tokens: { background: 'black' },
      }),
    ]);

    expect(service.register('selfReference')).toMatchObject({
      base: 'default',
      colorScheme: 'dark',
      defaultRowSize: 29,
      tokens: { primary: 'purple' },
    });
    expect(service.register('cycleA')).toMatchObject({
      base: 'default',
      colorScheme: 'light',
      defaultRowSize: 27,
      tokens: { primary: 'red' },
    });
    expect(service.register('cycleB')).toMatchObject({
      tokens: { background: 'black' },
    });
  });

  it('keeps built-ins reserved and falls unknown themes back to default metadata', () => {
    const service = new ThemeService({ rowSize: 0 });
    service.setDefinitions([
      {
        name: 'material',
        extends: 'compact',
        defaultRowSize: 10,
      },
    ]);

    expect(service.register('material')).toMatchObject({
      base: 'material',
      defaultRowSize: 42,
      custom: false,
    });
    expect(service.register('css-only')).toMatchObject({
      name: 'css-only',
      base: 'default',
      colorScheme: 'light',
      defaultRowSize: 27,
      custom: true,
    });
  });

  it('ignores invalid runtime definitions and token values', () => {
    const service = new ThemeService({ rowSize: 0 });
    service.setDefinitions([
      {
        name: 'brand',
        extends: 'missing',
        colorScheme: 'sepia',
        defaultRowSize: -1,
        tokens: {
          primary: '  ',
          headerBg: '#eee',
          unknown: 'red',
        },
      } as never,
    ]);

    expect(service.register('brand')).toEqual({
      name: 'brand',
      base: 'default',
      colorScheme: 'light',
      defaultRowSize: 27,
      tokens: { headerBg: '#eee' },
      custom: true,
    });
  });

  it('rejects inherited Object prototype keys as unknown tokens', () => {
    const service = new ThemeService({ rowSize: 0 });
    service.setDefinitions([
      {
        name: 'safe-theme',
        tokens: { toString: 'not-a-theme-token', primary: '#2563eb' },
      } as never,
    ]);

    expect(service.register('safe-theme').tokens).toEqual({
      primary: '#2563eb',
    });
  });

  it('keeps an explicit row size across theme switches and resets with zero', () => {
    const service = new ThemeService({ rowSize: 48 });

    service.register('compact');
    expect(service.rowSize).toBe(48);
    service.register('material');
    expect(service.rowSize).toBe(48);

    service.rowSize = 0;
    expect(service.rowSize).toBe(42);
  });

  it('maps every supported token to a namespaced CSS custom property', () => {
    expect(Object.keys(themeTokenCssVariables).length).toBeGreaterThan(40);
    expect(
      Object.values(themeTokenCssVariables).every(name =>
        name.startsWith('--revo-grid-'),
      ),
    ).toBe(true);
  });

  it('provides unique, valid, opt-in modern presets', () => {
    expect(modernThemeDefinitions).toEqual([
      oceanTheme,
      midnightTheme,
      auroraTheme,
      highContrastTheme,
      highContrastDarkTheme,
    ]);
    expect(highContrastThemeDefinitions).toEqual([
      highContrastTheme,
      highContrastDarkTheme,
    ]);
    expect(new Set(modernThemeDefinitions.map(theme => theme.name)).size).toBe(
      modernThemeDefinitions.length,
    );

    const tokenNames = new Set(Object.keys(themeTokenCssVariables));
    for (const definition of modernThemeDefinitions) {
      expect(definition.name).toMatch(/^[a-z][a-zA-Z0-9-]*$/);
      expect(definition.defaultRowSize).toBeGreaterThan(0);
      expect(
        Object.keys(definition.tokens || {}).every(name =>
          tokenNames.has(name),
        ),
      ).toBe(true);
    }

    const service = new ThemeService({ rowSize: 0 });
    expect(service.register(oceanTheme.name)).toMatchObject({
      name: 'ocean',
      base: 'default',
      custom: true,
      tokens: {},
    });

    service.setDefinitions(modernThemeDefinitions);
    expect(service.register(oceanTheme.name)).toMatchObject({
      base: 'material',
      colorScheme: 'light',
      defaultRowSize: 38,
      tokens: oceanTheme.tokens,
    });
    expect(service.register(midnightTheme.name)).toMatchObject({
      base: 'material',
      colorScheme: 'dark',
      defaultRowSize: 40,
      tokens: midnightTheme.tokens,
    });
    expect(service.register(auroraTheme.name)).toMatchObject({
      base: 'compact',
      colorScheme: 'dark',
      defaultRowSize: 34,
      tokens: auroraTheme.tokens,
    });
    expect(service.register(highContrastTheme.name)).toMatchObject({
      base: 'material',
      colorScheme: 'light',
      defaultRowSize: 40,
      tokens: highContrastTheme.tokens,
    });
    expect(service.register(highContrastDarkTheme.name)).toMatchObject({
      base: 'material',
      colorScheme: 'dark',
      defaultRowSize: 40,
      tokens: highContrastDarkTheme.tokens,
    });
  });

  it.each([
    [
      'light body',
      highContrastTheme.tokens.text,
      highContrastTheme.tokens.background,
    ],
    [
      'light header',
      highContrastTheme.tokens.headerColor,
      highContrastTheme.tokens.headerBg,
    ],
    [
      'light button',
      highContrastTheme.tokens.buttonText,
      highContrastTheme.tokens.buttonBg,
    ],
    [
      'dark body',
      highContrastDarkTheme.tokens.text,
      highContrastDarkTheme.tokens.background,
    ],
    [
      'dark header',
      highContrastDarkTheme.tokens.headerColor,
      highContrastDarkTheme.tokens.headerBg,
    ],
    [
      'dark button',
      highContrastDarkTheme.tokens.buttonText,
      highContrastDarkTheme.tokens.buttonBg,
    ],
    [
      'light focused header',
      highContrastTheme.tokens.headerColor,
      highContrastTheme.tokens.headerFocusedBg,
    ],
    [
      'light hovered header',
      highContrastTheme.tokens.headerColor,
      highContrastTheme.tokens.headerHoverBg,
    ],
    [
      'dark focused header',
      highContrastDarkTheme.tokens.headerColor,
      highContrastDarkTheme.tokens.headerFocusedBg,
    ],
    [
      'dark hovered header',
      highContrastDarkTheme.tokens.headerColor,
      highContrastDarkTheme.tokens.headerHoverBg,
    ],
  ])(
    'keeps the %s color pair above WCAG AA contrast',
    (_, foreground, background) => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

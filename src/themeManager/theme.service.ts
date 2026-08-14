import {
  themeTokenCssVariables,
  type BuiltInTheme,
  type ResolvedTheme,
  type ThemeColorScheme,
  type ThemeConfig,
  type ThemeDefinition,
  type ThemeTokens,
} from '../types/theme';
import type { GridPlugin } from '../plugins/base.plugin';
import { isGridPlugin } from '../plugins/plugin.utils';

export const DEFAULT_THEME: BuiltInTheme = 'default';

export const allowedThemes: BuiltInTheme[] = [
  DEFAULT_THEME,
  'material',
  'compact',
  'darkMaterial',
  'darkCompact',
];

const builtInThemeNames = new Set<BuiltInTheme>(allowedThemes);

const builtInThemes: Readonly<Record<BuiltInTheme, ResolvedTheme>> =
  Object.freeze({
    default: Object.freeze({
      name: 'default',
      colorScheme: 'light',
      defaultRowSize: 27,
      tokens: Object.freeze({}),
      plugins: Object.freeze([]),
      custom: false,
    }),
    material: Object.freeze({
      name: 'material',
      colorScheme: 'light',
      defaultRowSize: 42,
      tokens: Object.freeze({}),
      plugins: Object.freeze([]),
      custom: false,
    }),
    compact: Object.freeze({
      name: 'compact',
      colorScheme: 'light',
      defaultRowSize: 32,
      tokens: Object.freeze({}),
      plugins: Object.freeze([]),
      custom: false,
    }),
    darkMaterial: Object.freeze({
      name: 'darkMaterial',
      colorScheme: 'dark',
      defaultRowSize: 42,
      tokens: Object.freeze({}),
      plugins: Object.freeze([]),
      custom: false,
    }),
    darkCompact: Object.freeze({
      name: 'darkCompact',
      colorScheme: 'dark',
      defaultRowSize: 32,
      tokens: Object.freeze({}),
      plugins: Object.freeze([]),
      custom: false,
    }),
  });

function isBuiltInTheme(theme: string): theme is BuiltInTheme {
  return builtInThemeNames.has(theme as BuiltInTheme);
}

function isPositiveSize(size: unknown): size is number {
  return typeof size === 'number' && Number.isFinite(size) && size > 0;
}

function getColorScheme(
  scheme: unknown,
  fallback: ThemeColorScheme,
): ThemeColorScheme {
  return scheme === 'light' || scheme === 'dark' ? scheme : fallback;
}

function getCssOnlyThemeColorScheme(theme: string): ThemeColorScheme {
  // Before resolved theme metadata existed, the dark defaults were selected by
  // the case-sensitive CSS selector `[theme*='dark']`.
  return theme.includes('dark') ? 'dark' : 'light';
}

function getThemeTokens(tokens: unknown): ThemeTokens {
  if (!tokens || typeof tokens !== 'object') {
    return {};
  }

  const result: ThemeTokens = {};
  for (const [name, value] of Object.entries(tokens)) {
    if (
      Object.hasOwn(themeTokenCssVariables, name) &&
      typeof value === 'string' &&
      value.trim()
    ) {
      result[name as keyof ThemeTokens] = value;
    }
  }
  return result;
}

function getThemePlugins(plugins: unknown): GridPlugin[] {
  if (!Array.isArray(plugins)) {
    return [];
  }
  return plugins.filter(isGridPlugin);
}

function mergeThemePlugins(
  inherited: readonly GridPlugin[],
  plugins: unknown,
): GridPlugin[] {
  return [...new Set([...inherited, ...getThemePlugins(plugins)])];
}

export default class ThemeService {
  private currentTheme: ResolvedTheme = { ...builtInThemes.default };
  private customThemes = new Map<string, ThemeDefinition>();
  private customRowSize = 0;

  get theme() {
    return this.currentTheme;
  }

  get rowSize() {
    return this.customRowSize || this.currentTheme.defaultRowSize;
  }

  set rowSize(size: number) {
    this.customRowSize = isPositiveSize(size) ? size : 0;
  }

  constructor(cfg: ThemeConfig) {
    this.rowSize = cfg.rowSize;
    this.register('default');
  }

  setDefinitions(definitions: ThemeDefinition[] = []) {
    const customThemes = new Map<string, ThemeDefinition>();
    if (Array.isArray(definitions)) {
      for (const definition of definitions) {
        if (!definition || typeof definition !== 'object') {
          continue;
        }
        if (typeof definition.name !== 'string' || !definition.name.trim()) {
          continue;
        }
        const name = getTheme(definition.name);
        if (isBuiltInTheme(name)) {
          continue;
        }
        customThemes.set(name, { ...definition, name });
      }
    }
    this.customThemes = customThemes;
  }

  register(theme: string): ResolvedTheme {
    const name = getTheme(theme);
    if (isBuiltInTheme(name)) {
      this.currentTheme = { ...builtInThemes[name], tokens: {}, plugins: [] };
      return this.currentTheme;
    }

    const definition = this.customThemes.get(name);
    if (!definition) {
      this.currentTheme = {
        ...builtInThemes.default,
        name,
        colorScheme: getCssOnlyThemeColorScheme(name),
        tokens: {},
        plugins: [],
        custom: true,
      };
      return this.currentTheme;
    }

    this.currentTheme = this.resolveDefinition(name);
    return this.currentTheme;
  }

  private resolveDefinition(name: string): ResolvedTheme {
    const chain: ThemeDefinition[] = [];
    const visited = new Set<string>();
    let parentName: string = name;
    let validChain = true;

    while (!isBuiltInTheme(parentName)) {
      if (visited.has(parentName)) {
        validChain = false;
        break;
      }
      visited.add(parentName);

      const definition = this.customThemes.get(parentName);
      if (!definition) {
        validChain = false;
        break;
      }
      chain.push(definition);
      parentName = getTheme(definition.extends);
    }

    let resolved: ResolvedTheme = {
      ...(validChain && isBuiltInTheme(parentName)
        ? builtInThemes[parentName]
        : builtInThemes.default),
      tokens: {},
      plugins: [],
    };
    if (validChain) {
      chain.reverse();
    }
    const definitions = validChain ? chain : chain.slice(0, 1);

    for (const definition of definitions) {
      resolved = {
        name: definition.name,
        colorScheme: getColorScheme(
          definition.colorScheme,
          resolved.colorScheme,
        ),
        defaultRowSize: isPositiveSize(definition.defaultRowSize)
          ? definition.defaultRowSize
          : resolved.defaultRowSize,
        tokens: {
          ...resolved.tokens,
          ...getThemeTokens(definition.tokens),
        },
        plugins: mergeThemePlugins(resolved.plugins, definition.plugins),
        custom: true,
      };
    }

    return resolved;
  }
}

export function getTheme(theme?: string | null): string {
  const normalizedTheme = typeof theme === 'string' ? theme.trim() : '';
  return normalizedTheme || DEFAULT_THEME;
}

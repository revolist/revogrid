import { describe, expect, it } from 'vitest';

import {
  generateReactComponent,
  propTypeForProperty,
  toPascalCase,
  validateDashOutputTargetOptions,
} from '../src/generator.js';
import { dashOutputTarget } from '../src/index.js';
import type { DashComponentMeta } from '../src/types.js';

function property(
  name: string,
  type: DashComponentMeta['properties'][number]['type'],
  original = type,
  docs = `${name} docs`,
): DashComponentMeta['properties'][number] {
  return {
    name,
    type,
    complexType: { original, resolved: original },
    docs: { text: docs },
    optional: true,
    required: false,
    internal: false,
  };
}

const component: DashComponentMeta = {
  tagName: 'revo-grid',
  componentClassName: 'RevoGrid',
  docs: { text: 'Fast grid.\nWorks with Dash.' },
  internal: false,
  properties: [
    property('source', 'any', 'DataType[]'),
    property('readonly', 'boolean'),
    property('plugins', 'any', 'GridPlugin[]'),
    property('frameSize', 'number'),
    property('theme', 'string'),
  ],
  events: [
    {
      name: 'afteredit',
      docs: { text: 'After edit.' },
      internal: false,
    },
  ],
};

describe('generator', () => {
  it('validates configuration', () => {
    expect(
      validateDashOutputTargetOptions({
        outputDir: '',
        componentNames: { 'revo-grid': 'not-valid!' },
        eventMappings: { afteredit: 'not-valid!' },
        customElements: {
          'revo-grid': {
            importPath: '',
            exportName: 'not-valid!',
            defineCustomElement: 'also-not-valid!',
          },
        },
      }),
    ).toEqual([
      'outputDir must be a non-empty string',
      'componentNames["revo-grid"] must be a valid JavaScript identifier',
      'customElements["revo-grid"].importPath must be a non-empty string',
      'customElements["revo-grid"].exportName must be a valid JavaScript identifier',
      'customElements["revo-grid"].defineCustomElement must be a valid JavaScript identifier',
      'eventMappings["afteredit"] must be a valid JavaScript identifier',
    ]);
  });

  it('maps primitive, array, object, and union types to PropTypes', () => {
    expect(propTypeForProperty(property('enabled', 'boolean'))).toBe(
      'PropTypes.bool',
    );
    expect(propTypeForProperty(property('rows', 'any', 'Row[]'))).toBe(
      'PropTypes.array',
    );
    expect(
      propTypeForProperty(
        property(
          'headers',
          'any',
          'boolean | Record<string, number>',
        ),
      ),
    ).toBe('PropTypes.oneOfType([PropTypes.bool, PropTypes.object])');
    expect(
      propTypeForProperty(
        property(
          'config',
          'any',
          '{ label: string; values: number[] } | false',
        ),
      ),
    ).toBe('PropTypes.oneOfType([PropTypes.bool, PropTypes.object])');
  });

  it('transfers docs, exclusions, imports, properties, and event mappings', () => {
    const generated = generateReactComponent(component, {
      outputDir: 'out',
      components: ['revo-grid'],
      componentNames: { 'revo-grid': 'RevoGrid' },
      customElements: {
        'revo-grid': {
          importPath: '@revolist/revogrid/standalone/revo-grid.js',
          defineCustomElement: 'defineCustomElement',
        },
      },
      excludeProperties: ['plugins'],
      eventMappings: { afteredit: 'afteredit' },
    });

    expect(generated.fileName).toBe('RevoGrid.react.js');
    expect(generated.source).toContain('Fast grid. Works with Dash.');
    expect(generated.source).toContain('/** source docs */');
    expect(generated.source).toContain(
      "import { defineCustomElement as defineRevoGridCustomElement } from \"@revolist/revogrid/standalone/revo-grid.js\";",
    );
    expect(generated.source).toContain(
      'const GRID_PROPERTY_NAMES = Object.freeze(["frameSize","readonly","source","theme"]);',
    );
    expect(generated.source).not.toContain('plugins: PropTypes');
    expect(generated.source).toContain('afteredit: PropTypes.object');
    expect(generated.source).toContain(
      'const element = document.createElement("revo-grid");',
    );
    expect(generated.source).toContain("return React.createElement('div'");
  });

  it('produces deterministic output regardless of metadata order', () => {
    const options = {
      outputDir: 'out',
      excludeProperties: ['plugins'],
      eventMappings: { afteredit: 'afteredit' },
    };
    const first = generateReactComponent(component, options).source;
    const second = generateReactComponent(
      {
        ...component,
        properties: [...component.properties].reverse(),
      },
      options,
    ).source;
    expect(second).toBe(first);
  });

  it('rejects mappings for events absent from compiler metadata', () => {
    expect(() =>
      generateReactComponent(component, {
        outputDir: 'out',
        eventMappings: { missing: 'missing' },
      }),
    ).toThrow('Event "missing" is not emitted by "revo-grid"');
  });

  it('selects requested public components and writes a stable index', async () => {
    const writes = new Map<string, string>();
    const target = dashOutputTarget({
      outputDir: 'generated',
      components: ['revo-grid'],
    });
    await target.generator?.(
      { rootDir: '/workspace' } as never,
      {
        fs: {
          async writeFile(filePath: string, source: string) {
            writes.set(filePath, source);
          },
        },
      } as never,
      {
        components: [
          {
            ...component,
            internal: true,
            tagName: 'internal-grid',
          },
          component,
        ],
      } as never,
    );

    expect([...writes.keys()].sort()).toEqual([
      '/workspace/generated/RevoGrid.react.js',
      '/workspace/generated/index.js',
    ]);
    expect(writes.get('/workspace/generated/index.js')).toBe(
      "export { default as RevoGrid } from './RevoGrid.react.js';\n",
    );
  });

  it('normalizes tag names to React component names', () => {
    expect(toPascalCase('revo-grid')).toBe('RevoGrid');
    expect(toPascalCase('3d-grid')).toBe('Component3dGrid');
  });
});

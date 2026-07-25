# Internal Stencil Dash output target

This root-level module generates the React bridge consumed by Plotly's official
`dash-generate-components` command for `packages/dash`.

It is private RevoGrid build tooling. It is not independently versioned,
published to npm, or released from a separate repository.

```ts
import { dashOutputTarget } from './stencil-dash-output-target/src/index';

dashOutputTarget({
  outputDir: './packages/dash/src/lib/components',
  components: ['revo-grid'],
  componentNames: {
    'revo-grid': 'RevoGrid',
  },
  customElements: {
    'revo-grid': {
      importPath: '@revolist/revogrid/standalone/revo-grid.js',
      defineCustomElement: 'defineCustomElement',
    },
  },
  excludeProperties: ['plugins', 'editors'],
  eventMappings: {
    afteredit: 'afteredit',
  },
});
```

The generated bridge assigns Stencil properties directly to the custom element,
mounts it only after initial properties and lifecycle listeners are attached,
emits JSON-safe event envelopes through Dash `setProps`, and documents its
PropTypes for Dash's Python generator.

Options:

- `outputDir`: required destination for generated `.react.js` files.
- `components`: optional public Stencil tag-name allowlist.
- `componentNames`: optional tag-to-React-name overrides.
- `customElements`: optional imports that either self-register, export a
  custom-element class, or export an idempotent `defineCustomElement` function.
- `excludeProperties`: property names that cannot cross the Dash boundary.
- `eventMappings`: custom-event names mapped to dedicated Dash properties.

The output target does not decide which component properties are safe at a Python
boundary. Consumers must exclude function-, class-, Promise-, DOM-, and
framework-specific properties from their output-target configuration.

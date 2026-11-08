import { rm, writeFile } from 'node:fs/promises';

// Stencil v4 emits CommonJS as .js files inside this ESM package.
// Remove this scope fix when migrating to v5's native opt-in .cjs output.
await Promise.all([
  writeFile(
    new URL('../dist/cjs/package.json', import.meta.url),
    '{"type":"commonjs"}\n',
  ),
  // Stencil's loader manifest otherwise overrides the public package's ESM scope.
  rm(new URL('../loader/package.json', import.meta.url), { force: true }),
]);

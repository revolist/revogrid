import { readFile, rm, writeFile } from 'node:fs/promises';

// Stencil v4 emits CommonJS as .js files inside this ESM package.
// Remove this scope fix when migrating to v5's native opt-in .cjs output.
const hydrateManifestUrl = new URL('../hydrate/package.json', import.meta.url);
const hydrateManifest = JSON.parse(await readFile(hydrateManifestUrl, 'utf8'));

await Promise.all([
  writeFile(
    hydrateManifestUrl,
    JSON.stringify({ ...hydrateManifest, type: 'commonjs' }, null, 2) + '\n',
  ),
  writeFile(
    new URL('../dist/cjs/package.json', import.meta.url),
    '{"type":"commonjs"}\n',
  ),
  // Stencil's loader manifest otherwise overrides the public package's ESM scope.
  rm(new URL('../loader/package.json', import.meta.url), { force: true }),
]);

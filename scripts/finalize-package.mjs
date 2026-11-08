import { copyFile, rm, writeFile } from 'node:fs/promises';

// Stencil emits CommonJS as .js files, while the public package is ESM.
// Scope its internal chunks as CommonJS and expose unambiguous .cjs entries.
await Promise.all([
  copyFile(
    new URL('../dist/index.cjs.js', import.meta.url),
    new URL('../dist/index.cjs', import.meta.url),
  ),
  copyFile(
    new URL('../loader/index.cjs.js', import.meta.url),
    new URL('../loader/index.cjs', import.meta.url),
  ),
  writeFile(
    new URL('../dist/cjs/package.json', import.meta.url),
    '{"type":"commonjs"}\n',
  ),
  // Stencil's loader manifest otherwise overrides the public package's ESM scope.
  rm(new URL('../loader/package.json', import.meta.url), { force: true }),
]);

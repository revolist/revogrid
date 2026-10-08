import type { OutputTargetCustom } from '@stencil/core/internal';
import { resolve } from 'node:path';

// Stencil 4.43.5–4.45.2 copies these overloads from its hydrate runner unchanged.
const original = `export declare function hydrateDocument(doc: any | string, options?: HydrateDocumentOptions): Promise<HydrateResults>;
export declare function hydrateDocument(doc: any | string, options: HydrateDocumentOptions | undefined, asStream?: boolean): Readable;`;
const corrected = `export declare function hydrateDocument(doc: any | string, options?: HydrateDocumentOptions, asStream?: false): Promise<HydrateResults>;
export declare function hydrateDocument(doc: any | string, options: HydrateDocumentOptions | undefined, asStream: boolean): Readable | Promise<HydrateResults>;`;

export const hydrateTypesOutputTarget = (): OutputTargetCustom => ({
  type: 'custom',
  name: 'hydrate-types',
  // Custom targets run after hydration generation, which queues a declaration copy.
  async generator(config, compilerCtx) {
    const sourcePath = resolve(
      config.sys!.getCompilerExecutingPath!(),
      '../../internal/hydrate/runner.d.ts',
    );
    const declarations = await compilerCtx.fs.readFile(sourcePath);
    if (!declarations.includes(original) && !declarations.includes(corrected)) {
      throw new Error(
        'Stencil hydrateDocument declarations changed; review the return types.',
      );
    }
    // Evict the source's queued copy so it cannot overwrite our corrected output.
    compilerCtx.fs.clearFileCache(sourcePath);
    const writes = [];
    for (const target of config.outputTargets || []) {
      if (target.type !== 'dist-hydrate-script') {
        continue;
      }
      const declarationsPath = resolve(
        config.rootDir || '.',
        target.dir || 'hydrate',
        'index.d.ts',
      );
      // Preserve the Promise fallback on streaming error paths without changing runtime behavior.
      writes.push(
        compilerCtx.fs.writeFile(
          declarationsPath,
          declarations.replace(original, corrected),
        ),
      );
    }
    await Promise.all(writes);
  },
});

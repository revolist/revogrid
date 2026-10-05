import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import * as esm from '../hydrate/index.mjs';

const require = createRequire(import.meta.url);
const cjs = require('../hydrate/index.js');

for (const [format, { hydrateDocument }] of [
  ['CJS', cjs],
  ['ESM', esm],
]) {
  test(`${format}: omitted, false and undefined flags return Promises`, async () => {
    for (const flag of [false, undefined]) {
      const result = hydrateDocument(
        '<html><body></body></html>',
        undefined,
        flag,
      );
      assert.ok(result instanceof Promise);
      assert.equal((await result).diagnostics.length, 0);
    }
    const omitted = hydrateDocument('<html></html>');
    assert.ok(omitted instanceof Promise);
    await omitted;
  });

  test(`${format}: true returns a stream for valid HTML`, () => {
    const result = hydrateDocument(
      '<html><body></body></html>',
      undefined,
      true,
    );
    assert.ok(result instanceof Readable);
    result.destroy();
  });

  test(`${format}: true returns a Promise for invalid input and setup errors`, async () => {
    const brokenDocument = {
      nodeType: 9,
      documentElement: { nodeType: 1 },
      body: { nodeType: 1 },
      get defaultView() {
        throw new Error('Document setup failed');
      },
    };
    for (const input of [null, brokenDocument]) {
      const result = hydrateDocument(input, undefined, true);
      assert.ok(result instanceof Promise);
      assert.ok(
        (await result).diagnostics.some(
          diagnostic => diagnostic.level === 'error',
        ),
      );
    }
  });
}

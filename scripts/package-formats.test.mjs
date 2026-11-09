import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

function selectArchive(packed) {
  const archive = Array.isArray(packed)
    ? packed[0]
    : packed?.['@revolist/revogrid'] ?? packed;
  assert.ok(
    archive?.filename,
    `npm pack returned no filename: ${JSON.stringify(packed)}`,
  );
  return archive;
}

for (const [shape, packed] of Object.entries({
  array: [{ filename: 'revogrid.tgz' }],
  flat: { filename: 'revogrid.tgz' },
  keyed: { '@revolist/revogrid': { filename: 'revogrid.tgz' } },
})) {
  test(`selects the archive from ${shape} npm pack output`, () => {
    assert.equal(selectArchive(packed).filename, 'revogrid.tgz');
  });
}

test('rejects npm pack output without a filename', () => {
  for (const packed of [[], {}, { '@revolist/revogrid': {} }]) {
    assert.throws(() => selectArchive(packed), /npm pack returned no filename/);
  }
});

test('packed Core, loader and hydrate support CommonJS and ESM without browser globals', t => {
  const directory = mkdtempSync(join(tmpdir(), 'revogrid-package-formats-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const packed = JSON.parse(
    execFileSync(
      'npm',
      ['pack', '--ignore-scripts', '--json', '--pack-destination', directory],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, npm_config_cache: join(directory, 'cache') },
      },
    ),
  );
  const archive = selectArchive(packed);
  const packageDirectory = join(directory, 'node_modules/@revolist/revogrid');
  mkdirSync(packageDirectory, { recursive: true });
  execFileSync('tar', [
    '-xzf',
    join(directory, archive.filename),
    '--strip-components=1',
    '-C',
    packageDirectory,
  ]);
  const checks = `
    const assert = require('node:assert/strict');
    const grid = require('@revolist/revogrid');
    const loader = require('@revolist/revogrid/loader');
    const hydrate = require('@revolist/revogrid/hydrate');
    assert.equal(typeof grid.BasePlugin, 'function');
    assert.equal(grid.filterCoreFunctionsIndexedByType.eq('Europe', 'Europe'), true);
    assert.equal(grid.filterCoreFunctionsIndexedByType.eq('Europe', 'Asia'), false);
    assert.equal(typeof loader.defineCustomElements, 'function');
    assert.equal(typeof loader.setNonce, 'function');
    for (const name of ['window', 'document', 'HTMLElement', 'customElements'])
      assert.equal(name in globalThis, false, name);
    hydrate.renderToString('<html><body><revo-grid></revo-grid></body></html>').then(result => {
      assert.equal(result.diagnostics.some(diagnostic => diagnostic.level === 'error'), false);
      assert.match(result.html, /<revo-grid/);
      console.log(JSON.stringify(Object.keys(grid).sort()));
    }).catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
  `;
  writeFileSync(join(directory, 'consumer.cjs'), checks);
  writeFileSync(
    join(directory, 'consumer.mjs'),
    checks
      .replace(
        "const assert = require('node:assert/strict');",
        "import assert from 'node:assert/strict';",
      )
      .replace(
        "const grid = require('@revolist/revogrid');",
        "import * as grid from '@revolist/revogrid';",
      )
      .replace(
        "const loader = require('@revolist/revogrid/loader');",
        "import * as loader from '@revolist/revogrid/loader';",
      )
      .replace(
        "const hydrate = require('@revolist/revogrid/hydrate');",
        "import * as hydrate from '@revolist/revogrid/hydrate';",
      ),
  );
  const run = entry =>
    JSON.parse(
      execFileSync(process.execPath, [entry], {
        cwd: directory,
        encoding: 'utf8',
        timeout: 10_000,
      }),
    );
  assert.deepEqual(run('consumer.cjs'), run('consumer.mjs'));
});

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from '@stencil/playwright';
import { execute, injectFault, mountExploratoryGrid, verifyGrid, type Fault } from './helpers/exploratory/driver';
import { defaultSize, GridModel } from './helpers/exploratory/model';
import { corpus, generateActions, sequenceVersion, type Action } from './helpers/exploratory/sequence';

type Replay = {
  version: number;
  seed: number;
  actions: Action[];
  fault?: Fault;
  viewport?: { width: number; height: number } | null;
};

const replayPath = process.env.REVOGRID_QA_REPLAY;
const replay = replayPath ? JSON.parse(readFileSync(replayPath, 'utf8')) as Replay : undefined;
const seedInput = process.env.REVOGRID_QA_SEEDS;
const seeds = replay ? [replay.seed] : seedInput ? seedInput.split(',').map(Number) : corpus;
const faultInput = replay ? replay.fault : process.env.REVOGRID_QA_FAULT;
const fault = faultInput === 'wrong-record' || faultInput === 'stale-projection' ? faultInput : undefined;
const enabled = process.env.REVOGRID_QA === '1' || Boolean(replay);
if (enabled && (seeds.length > 100 || new Set(seeds).size !== seeds.length ||
  seeds.some(seed => !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff))) {
  throw new Error('Use up to 100 unique unsigned 32-bit seeds');
}
if (replay && (replay.version !== sequenceVersion || replay.actions[0]?.kind !== 'mount' || replay.actions.length > 200)) {
  throw new Error('Unsupported exploratory replay');
}
if (enabled && faultInput && !fault) {
  throw new Error('Unknown exploratory fault');
}

function revision() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
}

test.describe('Core exploratory sequences', () => {
  if (replay?.viewport) test.use({ viewport: replay.viewport });
  test.describe.configure({ mode: 'parallel', retries: 0, timeout: 60_000 });
  for (const seed of enabled ? seeds : []) {
    test(`seed ${seed}`, async ({ page, browserName, browser }, testInfo) => {
      const actions = replay?.actions ?? generateActions(seed);
      let model = new GridModel();
      let step = 0;
      let failure: string | undefined;
      const transitions: Record<string, number> = {};
      try {
        for (const action of actions) {
          await test.step(`${step} ${JSON.stringify(action)}`, async () => {
            if (action.kind === 'mount') {
              model = new GridModel();
              await mountExploratoryGrid(page);
            } else {
              await execute(page, model, action);
              model.apply(action);
              await injectFault(page, model, action, fault);
            }
            await verifyGrid(page, model);
          });
          transitions[action.kind] = (transitions[action.kind] ?? 0) + 1;
          step++;
        }
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        await testInfo.attach('exploratory-replay', {
          contentType: 'application/json',
          body: JSON.stringify({
            version: sequenceVersion,
            seed,
            actions: failure ? actions.slice(0, step + 1) : actions,
            fault,
            transitions,
            failure: failure ? { step, message: failure } : undefined,
            revision: revision(),
            browser: { name: browserName, version: browser.version() },
            viewport: page.viewportSize(),
            gridSize: defaultSize,
            workers: testInfo.config.workers,
          }, null, 2),
        });
      }
    });
  }
});

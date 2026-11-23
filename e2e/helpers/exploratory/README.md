# Core exploratory QA

Run the fixed ten-seed corpus with the same Playwright server as the Core E2E suite.

```sh
CI=1 REVOGRID_QA=1 pnpm exec playwright test e2e/exploratory.spec.ts --workers=4
```

Set `REVOGRID_QA_SEEDS` to a comma-separated list of up to 100 unique unsigned
32-bit seeds for a bounded search. The regular E2E command excludes this opt-in
suite. Once the workflow is on the default branch, use **Run workflow** under
**E2E** with the optional seed list to run the same corpus in GitHub Actions.

Each seed varies record positions, sort direction, values, scroll offsets,
pin side and viewport dimensions across five scenario families.

The JSON report and HTML report include an `exploratory-replay` attachment for
each executed seed. A failure attachment includes the executed prefix and the
failing action. Replay it with the same revision and browser.

```sh
CI=1 REVOGRID_QA_REPLAY=/absolute/path/to/exploratory-replay.json pnpm exec playwright test e2e/exploratory.spec.ts --workers=1
```

For a repeatable failure, try removing the prefix before the last mount, then
remove actions in chunks and keep only reductions that reproduce the same
invariant and record identity. The original attachment preserves the sequence
and worker count for failures sensitive to concurrent browser load.

Set `REVOGRID_QA_FAULT` to `wrong-record` or `stale-projection` to verify the
oracle in an isolated browser context. Those probes intentionally fail and
their replay attachments retain the injected fault.

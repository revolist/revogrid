# Core exploratory QA

Run the fixed ten-seed corpus with the same Playwright server as the Core E2E suite.

```sh
CI=1 REVOGRID_QA=1 pnpm exec playwright test e2e/exploratory.spec.ts --workers=4
```

Set `REVOGRID_QA_SEEDS` to a comma-separated list of up to 100 unique unsigned
32-bit seeds for a bounded search. The regular E2E command excludes this opt-in
suite. Once the workflow is on the default branch, use **Run workflow** under
**Core Exploratory QA** with the optional seed list to run the same corpus in
GitHub Actions. Pull requests touching the runner or its workflow run the fixed
corpus. The weekly Monday 03:17 UTC run uses 32 consecutive seeds derived from
the UTC week. The job summary logs the exact list. Reuse that list for a manual
rerun, or use the original action-list attachment to replay a single failure.

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

## Triage a CI failure

1. Open the job summary and distinguish server startup from a failing seed.
   Download the Playwright report and execution evidence for the failing run.
2. Use the recorded revision and browser. Replay the attachment and compare the
   failing action, invariant, and affected record. If the failure only occurs
   with concurrent workers, repeat the original seed list and worker count.
3. For a confirmed Core defect, record the smallest verified failing sequence,
   attach the original evidence, and write a focused E2E regression covering the
   intended behavior.

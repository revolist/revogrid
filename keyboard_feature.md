# Keyboard service maintainability findings

## Goal

Address the two verified SonarCloud maintainability findings in the core overlay keyboard service without changing keyboard navigation behavior.

## Ownership and scope

- Owner: `src/components/overlay/keyboard.service.ts`.
- Replace the direction-code membership collection with a `Set` and use `.has()`.
- Reduce `keyEdgeChange` branching by updating either axis through computed range keys.
- No public API, provider/store contract, or browser behavior changes.

## Edge cases and verification

- Preserve Ctrl/Cmd-arrow edge movement, including Shift range extension and both row and column axes.
- Preserve prevention of default browser navigation for direction keys.
- Extend the existing `test/keyboard.service.spec.ts` coverage and run its focused unit test, followed by TypeScript/lint validation if available.

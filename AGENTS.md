# RevoGrid Agent Instructions

These rules are for AI coding agents working in the RevoGrid repository.

## Source of truth

Use this order when answering questions or making changes:

1. RevoGrid source in `src/`
2. RevoGrid types in `src/types/interfaces.ts`, `src/types/dimension.ts`, `src/types/selection.ts`, and `src/types/plugin.types.ts`
3. Existing docs and demos in `docs/`
4. Existing tests in `e2e/` and `test/`

Do not invent RevoGrid APIs, events, props, plugin hooks, or Pro features.

## Use RevoGrid MCP first when available

Use the hosted RevoGrid MCP endpoint:

```text
https://mcp.rv-grid.com
```

If the MCP server is available in the client:

1. search RevoGrid MCP before writing code
2. prefer runnable examples over speculative code
3. check feature availability before suggesting Pro-only capabilities
4. use migration notes when changing version-specific code
5. use TypeScript symbols from MCP results to validate naming and payload shape

If MCP and source disagree, trust the local source code in this repository.

## How to reason about RevoGrid

- Treat TypeScript types as instruction-bearing API documentation.
- Prefer existing public examples and wrapper demos before creating new patterns.
- Preserve framework-specific conventions in React, Vue, Angular, and Svelte examples.
- Keep business logic out of render templates when a grid event, plugin, or typed config is the better fit.
- When the request mentions performance, think about virtualization, viewport math, and render churn before adding convenience abstractions.

## Feature and licensing rules

- Distinguish Core vs Pro features before suggesting an implementation.
- Do not present Pro-only features as available in open-source RevoGrid.
- If a requested feature is Pro-only, say so clearly and offer the closest public fallback when possible.

## Testing expectations

When behavior changes affect rendering, editing, selection, filtering, sorting, grouping, pinning, virtualization, export, or keyboard and mouse interaction, use the existing RevoGrid end-to-end suite.

- E2E tests use `@stencil/playwright` with Playwright.
- Prefer tests in `e2e/*.spec.ts`.
- Import `test` from `@stencil/playwright`.
- Import assertions from `@playwright/test`.
- Reuse helpers from `e2e/helpers.ts`.

## Response style for AI agents

- Prefer structured, verifiable answers over long prose.
- Link to the exact docs, types, demos, or source files that support the answer.
- Mention assumptions when version or licensing affects the recommendation.
- Keep changes small and composable unless a larger refactor is clearly required.

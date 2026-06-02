## Testing

[![Unit Tests](https://github.com/revolist/revogrid/actions/workflows/ci-unit.yml/badge.svg?branch=main)](https://github.com/revolist/revogrid/actions/workflows/ci-unit.yml)
[![E2E Tests](https://github.com/revolist/revogrid/actions/workflows/ci-e2e.yml/badge.svg?branch=main)](https://github.com/revolist/revogrid/actions/workflows/ci-e2e.yml)

RevoGrid is thoroughly tested to ensure reliability and stability.

| Suite | Command | Scope |
|---|---|---|
| Unit | `npm run test` | Services, utilities, pure logic |
| E2E (Playwright) | `npm run test:e2e` | Real browser rendering & interaction |

### E2E Tests

End-to-end tests use [@stencil/playwright](https://www.npmjs.com/package/@stencil/playwright) to run `<revo-grid>` in a real Chromium browser. The dev server starts automatically when you run:

```bash
npm run test:e2e
```

Test files live in `e2e/` and share helpers from `e2e/helpers.ts`:

### Local startup troubleshooting

For targeted local work, confirm a new or changed test is discoverable before starting the dev server:

```bash
./node_modules/.bin/playwright test e2e/pinning.spec.ts --grep "test name" --list
```

Then run a non-watch Stencil build to catch compile errors without invoking the Playwright web-server lifecycle:

```bash
./node_modules/.bin/stencil build --dev --serve --no-open
```

If Playwright fails before any tests run with a Stencil dev-server startup error such as `ERR_SOCKET_BAD_PORT` and port `65536`, treat it as an environment/startup issue rather than an e2e assertion failure. Check `node -v` and whether another local server is already using `localhost:3333`, then retry only after changing that environment state.

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

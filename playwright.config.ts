import { expect } from '@playwright/test';
import { matchers, createConfig } from '@stencil/playwright';

// Add custom Stencil matchers to Playwright assertions
expect.extend(matchers);

export default createConfig({
  // Run playwright tests from the 'e2e' directory
  testDir: 'e2e',
  // Run both repo-style e2e files and standard Playwright spec files
  testMatch: ['**/*.e2e.ts', '**/*.spec.ts'],
  // Use localhost explicitly to avoid Chrome's Private Network Access CORS
  // policy blocking requests to 0.0.0.0 (non-secure loopback context).
  use: {
    baseURL: 'http://localhost:3333',
  },
  webServer: {
    command: 'stencil build --dev --watch --serve --no-open',
    url: 'http://localhost:3333/ping',
    reuseExistingServer: !process.env.CI,
  },
});

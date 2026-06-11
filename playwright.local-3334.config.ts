import { expect } from '@playwright/test';
import { matchers, createConfig } from '@stencil/playwright';

expect.extend(matchers);

export default createConfig({
  testDir: 'e2e',
  testMatch: ['**/*.e2e.ts', '**/*.spec.ts'],
  use: {
    baseURL: 'http://localhost:3334',
  },
  reporter: [['list']],
});

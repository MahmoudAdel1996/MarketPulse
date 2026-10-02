import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env['CI'] ? 2 : 0,
  use: { baseURL: 'http://localhost:4200', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'dotnet run --project ../MarketPulse.Api --launch-profile https',
      url: 'https://localhost:7274/api/v1/instruments',
      ignoreHTTPSErrors: true,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    { command: 'npm start', url: 'http://localhost:4200', reuseExistingServer: true, timeout: 180_000 },
  ],
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/e2e.xml' }]],
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  webServer: [
    {
      command: process.env.E2E_BACKEND_COMMAND || 'mvn -f ../backend/pom.xml spring-boot:run',
      url: 'http://127.0.0.1:8080/api/videos',
      env: {
        ENV_PROTUBE_STORE_DIR: process.cwd(),
        ENV_PROTUBE_GOOGLE_CLIENT_ID: 'e2e',
        ENV_PROTUBE_GOOGLE_CLIENT_SECRET: 'e2e',
      },
      timeout: 180000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173',
      env: { VITE_API_DOMAIN: 'http://127.0.0.1:8080', VITE_MEDIA_DOMAIN: 'http://127.0.0.1:8080' },
      reuseExistingServer: !process.env.CI,
    },
  ],
});

import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const apiPort = process.env.E2E_API_PORT || '18080';
const webPort = process.env.E2E_WEB_PORT || '15173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/e2e.xml' }]],
  use: { baseURL: `http://127.0.0.1:${webPort}`, trace: 'retain-on-failure' },
  webServer: [
    {
      command: `${process.env.E2E_MAVEN_COMMAND || 'mvn'} -f ../backend/pom.xml spring-boot:run -Dspring-boot.run.profiles=e2e`,
      url: `http://127.0.0.1:${apiPort}/api/videos`,
      env: {
        ENV_PROTUBE_STORE_DIR: resolve('../backend/src/test/resources/e2e-media'),
        SPRING_CONFIG_ADDITIONAL_LOCATION: pathToFileURL(
          resolve('../backend/src/test/resources/application-e2e.properties')
        ).href,
        E2E_DATA_LOCATION: pathToFileURL(resolve('../backend/src/test/resources/e2e-data.sql')).href,
        ENV_PROTUBE_GOOGLE_CLIENT_ID: 'e2e',
        ENV_PROTUBE_GOOGLE_CLIENT_SECRET: 'e2e',
        ENV_PROTUBE_IMPORT_ENABLED: 'false',
        SERVER_PORT: apiPort,
      },
      timeout: 180000,
      stdout: 'pipe',
      reuseExistingServer: false,
    },
    {
      command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: `http://127.0.0.1:${webPort}`,
      env: { VITE_API_DOMAIN: `http://127.0.0.1:${apiPort}`, VITE_MEDIA_DOMAIN: `http://127.0.0.1:${apiPort}` },
      reuseExistingServer: false,
    },
  ],
});

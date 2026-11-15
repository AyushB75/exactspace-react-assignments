import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    channel: "msedge",
    headless: true,
    viewport: { width: 1100, height: 720 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run start",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run preview -- --port 4173",
      cwd: "../photo-gallery",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
    },
  ],
});

import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    channel: "msedge",
    headless: true,
    viewport: { width: 1100, height: 720 },
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -- --port 4175 --strictPort",
      url: "http://127.0.0.1:4175",
      env: { VITE_PHOTO_SOURCE: "mock" },
    },
    {
      command: "npm run dev -- --port 4176 --strictPort",
      url: "http://127.0.0.1:4176",
      env: { VITE_PHOTO_SOURCE: "picsum" },
    },
  ],
});

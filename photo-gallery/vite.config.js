import { defineConfig } from "vite";
export default defineConfig({
  test: {
    include: ["src/**/*.test.{js,jsx}"],
    environment: "jsdom",
    setupFiles: "./src/test-setup.js",
    restoreMocks: true,
  },
});

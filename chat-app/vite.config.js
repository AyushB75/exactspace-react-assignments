import { defineConfig } from "vite";
export default defineConfig({
  server: {
    port: 5174,
    proxy: { "/socket.io": { target: "http://127.0.0.1:3001", ws: true } },
  },
  test: {
    include: ["client/**/*.test.{js,jsx}", "server/**/*.test.js"],
    environment: "jsdom",
    setupFiles: "./client/test-setup.js",
    restoreMocks: true,
  },
});

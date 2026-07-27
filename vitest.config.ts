import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "tests/e2e", ".next"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/features/**", "src/lib/**", "src/server/**"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
    },
  },
});

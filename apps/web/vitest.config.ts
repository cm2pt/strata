import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**/*.ts", "src/lib/**/*.tsx"],
      exclude: [
        "src/lib/mock-data/**",
        "src/lib/types.ts",
        "src/lib/api/index.ts",
        "src/**/*.test.*",
        "src/__tests__/**",
      ],
      thresholds: {
        lines: 80,
      },
    },
  },
});

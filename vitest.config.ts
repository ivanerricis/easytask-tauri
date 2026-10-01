import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    pool: "vmThreads",
    environment: "jsdom",
    globals: true,
    // The first test of a file pays for the cold module transform (slow on Windows under parallel load)
    testTimeout: 15000,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/components/ui/**", "src/main.tsx"],
      // Regression gate: `npm run test:coverage` (and the CI) fails if coverage drops below these values.
      // Measured at 75.73 statements / 68.29 branches / 74.35 functions / 76.50 lines, set ~2 points below.
      // To raise them: run `npm run test:coverage`, read the "All files" row, and set each value to the
      // measured one minus ~2 (round down) in the same commit that adds the tests. Never lower them
      // to make a failing build pass: add the missing tests instead.
      thresholds: {
        statements: 73,
        branches: 66,
        functions: 72,
        lines: 74,
      },
    },
  },
})

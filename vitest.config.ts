import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

import path from "node:path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // "server-only" is a build-time guard for Next.js bundling; it has no
      // meaning under Vitest, so it is stubbed out.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // Integration tests share one PostgreSQL database, so they must not run
    // concurrently against each other.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    setupFiles: ["tests/setup.ts"],
  },
});

import { defineConfig } from "vitest/config";

// Unit tests for the cart store and the server actions. Store tests run in
// jsdom so localStorage and StorageEvent are real; action test files opt into
// the node environment with a `// @vitest-environment node` header.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts"],
    restoreMocks: true,
    unstubEnvs: true,
  },
});

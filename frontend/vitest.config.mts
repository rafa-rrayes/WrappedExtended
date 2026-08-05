import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest for the pure logic under `src/`.
 *
 * Deliberately dependency-light: the whole suite rests on `vitest` + `jsdom` and nothing
 * else. No Vite React plugin and no testing-library — the two hook suites drive React 19's
 * own `act` + `react-dom/client` through a ~30-line helper, and that helper uses
 * `createElement` rather than JSX so no test file needs a JSX transform at all.
 *
 * `environment` stays `node` — the default — because almost everything under test is
 * framework-free. The files that genuinely need a DOM opt in per-file with a
 * `// @vitest-environment jsdom` docblock, which keeps the common case fast.
 *
 * `.mts` rather than `.ts`: the package is CommonJS (Next owns that choice), and the
 * explicit ESM extension is what stops Vite's config loader warning about the mismatch.
 */
export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the `@/*` path in tsconfig.json.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // `.next/` holds emitted copies of the source that would otherwise be collected twice.
    exclude: ["node_modules/**", ".next/**"],
    clearMocks: true,
  },
});
